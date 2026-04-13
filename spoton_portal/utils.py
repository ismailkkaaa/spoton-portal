import re
from functools import wraps
from pathlib import Path
from sqlite3 import DatabaseError
from uuid import uuid4

from flask import current_app, jsonify, session
from werkzeug.utils import secure_filename

from .db import get_db, rollback_db, utc_now_iso


COUNTRY_PREFIXES = {
    "Georgia": "GEO",
    "Uzbekistan": "UZB",
    "Tajikistan": "TAJ",
}
COUNTRY_SLUGS = {
    "georgia": "Georgia",
    "uzbekistan": "Uzbekistan",
    "tajikistan": "Tajikistan",
}

COUNTRY_COURSES = {
    "Georgia": {"MBBS", "BSc Nursing", "BBA", "MBA"},
    "Uzbekistan": {"MBBS", "BSc"},
    "Tajikistan": {"MBBS", "BSc"},
}

VALID_STATUSES = {
    "Application Created",
    "In Progress",
    "Pending",
    "Rejected",
}
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_PATTERN = re.compile(r"^[0-9+\-\s()]{6,20}$")


def json_error(message, status_code=400):
    return jsonify({"error": message}), status_code


def require_login(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user = session.get("user")
        if not user:
            return json_error("Authentication required", 401)
        if user.get("role") == "Staff" and not session.get("country_authenticated"):
            return json_error("Country login required", 403)
        return view_func(*args, **kwargs)

    return wrapped


def require_role(*roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(*args, **kwargs):
            user = session.get("user")
            if not user:
                return json_error("Authentication required", 401)
            if user.get("role") not in roles:
                return json_error("You do not have permission to perform this action", 403)
            return view_func(*args, **kwargs)

        return wrapped

    return decorator


def safe_route(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        try:
            return view_func(*args, **kwargs)
        except DatabaseError as error:
            rollback_db()
            current_app.logger.exception("Database error in %s: %s", view_func.__name__, error)
            return json_error("Database operation failed", 500)
        except OSError as error:
            rollback_db()
            current_app.logger.exception("Filesystem error in %s: %s", view_func.__name__, error)
            return json_error("File operation failed", 500)
        except ValueError as error:
            rollback_db()
            current_app.logger.warning("Validation error in %s: %s", view_func.__name__, error)
            return json_error(str(error), 400)
        except Exception as error:
            rollback_db()
            current_app.logger.exception("Unexpected error in %s: %s", view_func.__name__, error)
            return json_error("Internal server error", 500)

    return wrapped


def sanitize_text(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def get_current_user():
    return session.get("user")


def get_user_role():
    return (session.get("user") or {}).get("role")


def is_admin_session():
    return get_user_role() == "Admin"


def is_staff_session():
    return get_user_role() == "Staff"


def country_from_slug(slug):
    return COUNTRY_SLUGS.get(str(slug or "").strip().lower())


def slug_for_country(country):
    for slug, name in COUNTRY_SLUGS.items():
        if name == country:
            return slug
    return ""


def can_access_country(country):
    if country not in COUNTRY_PREFIXES:
        return False
    user = get_current_user()
    if not user:
        return False
    if user.get("role") == "Admin":
        return True
    return session.get("country_authenticated") and session.get("selected_country") == country


def ensure_country_access(country):
    if country not in COUNTRY_PREFIXES:
        return json_error("Country is invalid")
    if not get_current_user():
        return json_error("Authentication required", 401)
    if not can_access_country(country):
        return json_error("You do not have permission to access this country", 403)
    return None


def resolve_country_scope(requested_country=None):
    user = get_current_user()
    if not user:
        return None, json_error("Authentication required", 401)

    if user.get("role") == "Admin":
        if requested_country:
            if requested_country not in COUNTRY_PREFIXES:
                return None, json_error("Country is invalid")
            return requested_country, None
        return None, None

    if not session.get("country_authenticated"):
        return None, json_error("Country login required", 403)

    selected_country = session.get("selected_country")
    if selected_country not in COUNTRY_PREFIXES:
        return None, json_error("Country is invalid")
    if requested_country and requested_country != selected_country:
        return None, json_error("You do not have permission to access this country", 403)
    return selected_country, None


def validate_student_payload(data, require_all=True):
    required_fields = ("name", "phone", "email", "country", "course", "status")
    cleaned = {}

    for field in required_fields:
        raw_value = data.get(field)
        if raw_value is None:
            if require_all:
                return None, f"Missing required field: {field}"
            continue

        value = sanitize_text(raw_value)
        if require_all and not value:
            return None, f"{field.capitalize()} is required"
        if value:
            cleaned[field] = value

    email = cleaned.get("email")
    if email and not EMAIL_PATTERN.match(email):
        return None, "Email must be valid"

    phone = cleaned.get("phone")
    if phone and not PHONE_PATTERN.match(phone):
        return None, "Phone number must be valid"

    country = cleaned.get("country")
    if country and country not in COUNTRY_PREFIXES:
        return None, "Country is invalid"

    course = cleaned.get("course")
    if country and course and course not in COUNTRY_COURSES.get(country, set()):
        return None, "Course is invalid for the selected country"

    status = cleaned.get("status")
    if status and status not in VALID_STATUSES:
        return None, "Status is invalid"

    return cleaned, None


def generate_student_id(country):
    prefix = COUNTRY_PREFIXES[country]
    db = get_db()
    rows = db.execute(
        "SELECT student_id FROM students WHERE country = ? ORDER BY id DESC",
        (country,),
    ).fetchall()

    next_number = 1001
    if rows:
        numbers = []
        for row in rows:
            try:
                numbers.append(int(row["student_id"].split("-")[-1]))
            except (IndexError, ValueError):
                continue
        if numbers:
            next_number = max(numbers) + 1

    while True:
        candidate = f"{prefix}-{next_number}"
        exists = db.execute(
            "SELECT 1 FROM students WHERE student_id = ?",
            (candidate,),
        ).fetchone()
        if not exists:
            return candidate
        next_number += 1


def student_upload_path(student_id):
    base = Path(current_app.config["UPLOAD_FOLDER"])
    folder = base / student_id
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def allowed_file(filename):
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in current_app.config["ALLOWED_EXTENSIONS"]


def unique_stored_filename(filename):
    safe_name = secure_filename(filename)
    if not safe_name:
        raise ValueError("Invalid file name")
    return f"{uuid4().hex}_{safe_name}"


def file_response_payload(row):
    return {
        "id": row["id"],
        "student_id": row["student_id"],
        "file_name": row["original_name"],
        "file_size": row["size_bytes"],
        "upload_date": row["upload_date"],
    }


def student_response_payload(row):
    return {
        "student_id": row["student_id"],
        "name": row["name"],
        "phone": row["phone"],
        "email": row["email"],
        "country": row["country"],
        "course": row["course"],
        "status": row["status"],
        "last_updated": row["last_updated"],
    }


def touch_student(student_id):
    db = get_db()
    db.execute(
        "UPDATE students SET last_updated = ? WHERE student_id = ?",
        (utc_now_iso(), student_id),
    )
    db.commit()


def find_duplicate_student(name, phone, email, exclude_student_id=None):
    db = get_db()
    query = """
        SELECT student_id, name, phone, email
        FROM students
        WHERE (LOWER(email) = LOWER(?) OR phone = ?)
    """
    params = [email, phone]

    if exclude_student_id:
        query += " AND student_id != ?"
        params.append(exclude_student_id)

    return db.execute(query, tuple(params)).fetchone()
