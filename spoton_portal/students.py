from flask import Blueprint, current_app, jsonify, request
from sqlite3 import IntegrityError

from .db import get_db, utc_now_iso
from .utils import (
    COUNTRY_PREFIXES,
    find_duplicate_student,
    generate_student_id,
    json_error,
    safe_route,
    require_login,
    require_role,
    student_response_payload,
    validate_student_payload,
)


students_bp = Blueprint("students", __name__)


def fetch_student_or_404(student_id):
    row = get_db().execute(
        "SELECT * FROM students WHERE student_id = ?",
        (student_id,),
    ).fetchone()
    if not row:
        return None, json_error("Student not found", 404)
    return row, None


@students_bp.get("/dashboard/summary")
@require_login
@safe_route
def dashboard_summary():
    db = get_db()
    country = request.args.get("country", "").strip()
    course = request.args.get("course", "").strip()

    if country and country not in COUNTRY_PREFIXES:
        return json_error("Country is invalid")

    filters = []
    params = []
    if country:
        filters.append("country = ?")
        params.append(country)
    if course:
        filters.append("course = ?")
        params.append(course)

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    student_count = db.execute(
        f"SELECT COUNT(*) AS total FROM students {where_clause}",
        tuple(params),
    ).fetchone()["total"]

    file_query = """
        SELECT COUNT(files.id) AS total_files, COALESCE(SUM(files.size_bytes), 0) AS total_size
        FROM students
        LEFT JOIN files ON files.student_id = students.student_id
    """
    if where_clause:
        file_query += f" {where_clause}"

    file_row = db.execute(file_query, tuple(params)).fetchone()

    return jsonify(
        {
            "summary": {
                "students": student_count,
                "files": file_row["total_files"],
                "storage_bytes": file_row["total_size"],
            }
        }
    )


@students_bp.post("/students")
@require_role("Admin")
@safe_route
def add_student():
    data = request.get_json(silent=True) or {}
    payload, error = validate_student_payload(data, require_all=True)
    if error:
        return json_error(error)

    duplicate = find_duplicate_student(
        payload["name"],
        payload["phone"],
        payload["email"],
    )
    if duplicate:
        return json_error("Duplicate student entry is not allowed", 409)

    db = get_db()
    student_id = generate_student_id(payload["country"])
    timestamp = utc_now_iso()

    try:
        db.execute(
            """
            INSERT INTO students (
                student_id, name, phone, email, country, course, status, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                student_id,
                payload["name"],
                payload["phone"],
                payload["email"],
                payload["country"],
                payload["course"],
                payload["status"],
                timestamp,
            ),
        )
        db.commit()
    except IntegrityError:
        return json_error("Duplicate student entry is not allowed", 409)

    row = db.execute(
        "SELECT * FROM students WHERE student_id = ?",
        (student_id,),
    ).fetchone()
    current_app.logger.info("Student created student_id=%s", student_id)
    return jsonify(
        {
            "message": "Student created successfully",
            "student": student_response_payload(row),
        }
    ), 201


@students_bp.get("/students")
@require_login
@safe_route
def get_students():
    country = request.args.get("country", "").strip()
    course = request.args.get("course", "").strip()

    query = "SELECT * FROM students WHERE 1=1"
    params = []

    if country:
        query += " AND country = ?"
        params.append(country)
    if course:
        query += " AND course = ?"
        params.append(course)

    query += " ORDER BY last_updated DESC, id DESC"
    rows = get_db().execute(query, tuple(params)).fetchall()

    return jsonify(
        {"students": [student_response_payload(row) for row in rows]}
    )


@students_bp.get("/students/<student_id>")
@require_login
@safe_route
def get_student(student_id):
    row, error = fetch_student_or_404(student_id)
    if error:
        return error
    return jsonify({"student": student_response_payload(row)})


@students_bp.put("/students/<student_id>")
@require_role("Admin")
@safe_route
def update_student(student_id):
    row, error = fetch_student_or_404(student_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    payload, validation_error = validate_student_payload(data, require_all=False)
    if validation_error:
        return json_error(validation_error)
    if not payload:
        return json_error("No valid fields provided for update")

    duplicate = find_duplicate_student(
        payload.get("name", row["name"]),
        payload.get("phone", row["phone"]),
        payload.get("email", row["email"]),
        exclude_student_id=student_id,
    )
    if duplicate:
        return json_error("Duplicate student entry is not allowed", 409)

    allowed_fields = {"name", "phone", "email", "country", "course", "status"}
    assignments = []
    params = []
    for field in allowed_fields:
        if field in payload:
            assignments.append(f"{field} = ?")
            params.append(payload[field])

    params.extend([utc_now_iso(), student_id])
    query = f"UPDATE students SET {', '.join(assignments)}, last_updated = ? WHERE student_id = ?"

    db = get_db()
    try:
        db.execute(query, tuple(params))
        db.commit()
    except IntegrityError:
        return json_error("Duplicate student entry is not allowed", 409)

    updated = db.execute(
        "SELECT * FROM students WHERE student_id = ?",
        (student_id,),
    ).fetchone()
    current_app.logger.info("Student updated student_id=%s", student_id)
    return jsonify(
        {
            "message": "Student updated successfully",
            "student": student_response_payload(updated),
        }
    )


@students_bp.patch("/students/<student_id>/status")
@require_role("Admin")
@safe_route
def update_student_status(student_id):
    row, error = fetch_student_or_404(student_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    payload, validation_error = validate_student_payload({"status": status}, require_all=False)
    if validation_error:
        return json_error(validation_error)
    if "status" not in payload:
        return json_error("Status is required")

    db = get_db()
    db.execute(
        "UPDATE students SET status = ?, last_updated = ? WHERE student_id = ?",
        (payload["status"], utc_now_iso(), student_id),
    )
    db.commit()

    updated = db.execute(
        "SELECT * FROM students WHERE student_id = ?",
        (student_id,),
    ).fetchone()
    current_app.logger.info("Student status updated student_id=%s status=%s", student_id, payload["status"])
    return jsonify(
        {
            "message": "Student status updated successfully",
            "student": student_response_payload(updated),
        }
    )
