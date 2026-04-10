from flask import Blueprint, current_app, jsonify, request, send_from_directory

from .db import get_db, utc_now_iso
from .students import fetch_student_or_404
from .utils import (
    allowed_file,
    file_response_payload,
    json_error,
    require_login,
    require_role,
    safe_route,
    student_upload_path,
    touch_student,
    unique_stored_filename,
)


files_bp = Blueprint("files", __name__)


def fetch_file_or_404(student_id, file_id):
    row = get_db().execute(
        "SELECT * FROM files WHERE id = ? AND student_id = ?",
        (file_id, student_id),
    ).fetchone()
    if not row:
        return None, json_error("File not found", 404)
    return row, None


@files_bp.post("/students/<student_id>/files")
@require_login
@safe_route
def upload_file(student_id):
    student, error = fetch_student_or_404(student_id)
    if error:
        return error

    uploaded = request.files.get("file")
    if not uploaded or not uploaded.filename:
        return json_error("File is required")

    if not allowed_file(uploaded.filename):
        return json_error("Invalid file type")

    folder = student_upload_path(student["student_id"])
    stored_name = unique_stored_filename(uploaded.filename)
    destination = folder / stored_name

    try:
        uploaded.save(destination)
        size_bytes = destination.stat().st_size
    except OSError:
        current_app.logger.exception("File upload failed for student_id=%s", student["student_id"])
        return json_error("File upload failed", 500)

    db = get_db()
    db.execute(
        """
        INSERT INTO files (student_id, original_name, stored_name, size_bytes, upload_date)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            student["student_id"],
            uploaded.filename,
            stored_name,
            size_bytes,
            utc_now_iso(),
        ),
    )
    db.commit()
    touch_student(student["student_id"])

    row = db.execute(
        "SELECT * FROM files WHERE student_id = ? ORDER BY id DESC LIMIT 1",
        (student["student_id"],),
    ).fetchone()
    current_app.logger.info(
        "File uploaded student_id=%s filename=%s size=%s",
        student["student_id"],
        uploaded.filename,
        size_bytes,
    )
    return jsonify(
        {
            "message": "File uploaded successfully",
            "file": file_response_payload(row),
        }
    ), 201


@files_bp.get("/students/<student_id>/files")
@require_login
@safe_route
def get_files(student_id):
    student, error = fetch_student_or_404(student_id)
    if error:
        return error

    rows = get_db().execute(
        "SELECT * FROM files WHERE student_id = ? ORDER BY upload_date DESC, id DESC",
        (student["student_id"],),
    ).fetchall()
    return jsonify({"files": [file_response_payload(row) for row in rows]})


@files_bp.get("/students/<student_id>/files/<int:file_id>/download")
@require_login
@safe_route
def download_file(student_id, file_id):
    student, error = fetch_student_or_404(student_id)
    if error:
        return error

    row, file_error = fetch_file_or_404(student["student_id"], file_id)
    if file_error:
        return file_error

    folder = student_upload_path(student["student_id"])
    file_path = folder / row["stored_name"]
    if not file_path.exists():
        current_app.logger.warning(
            "Download requested for missing file student_id=%s file_id=%s",
            student["student_id"],
            file_id,
        )
        return json_error("File not found", 404)

    current_app.logger.info("File download student_id=%s file_id=%s", student["student_id"], file_id)
    return send_from_directory(
        directory=str(folder),
        path=row["stored_name"],
        as_attachment=True,
        download_name=row["original_name"],
    )


@files_bp.delete("/students/<student_id>/files/<int:file_id>")
@require_role("Admin")
@safe_route
def delete_file(student_id, file_id):
    student, error = fetch_student_or_404(student_id)
    if error:
        return error

    row, file_error = fetch_file_or_404(student["student_id"], file_id)
    if file_error:
        return file_error

    folder = student_upload_path(student["student_id"])
    file_path = folder / row["stored_name"]

    if file_path.exists():
        try:
            file_path.unlink()
        except PermissionError:
            current_app.logger.warning(
                "File is locked and cannot be deleted student_id=%s file_id=%s",
                student["student_id"],
                file_id,
            )
            return json_error("File is currently in use and cannot be deleted", 409)
        except OSError:
            current_app.logger.exception(
                "File deletion failed in storage student_id=%s file_id=%s",
                student["student_id"],
                file_id,
            )
            return json_error("File delete failed", 500)

    db = get_db()
    db.execute(
        "DELETE FROM files WHERE id = ? AND student_id = ?",
        (file_id, student["student_id"]),
    )
    db.commit()
    touch_student(student["student_id"])
    current_app.logger.info("File deleted student_id=%s file_id=%s", student["student_id"], file_id)

    return jsonify({"message": "File deleted successfully"})
