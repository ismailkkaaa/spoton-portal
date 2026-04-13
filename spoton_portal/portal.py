from flask import Blueprint, current_app, redirect, render_template, request, session, url_for

from .db import get_db
from .utils import (
    COUNTRY_PREFIXES,
    can_access_country,
    country_from_slug,
    get_current_user,
    is_admin_session,
    slug_for_country,
)


portal_bp = Blueprint("portal", __name__)


def portal_countries():
    return [
        {"name": country, "slug": slug_for_country(country)}
        for country in COUNTRY_PREFIXES
    ]


def build_country_summary(country):
    db = get_db()
    student_total = db.execute(
        "SELECT COUNT(*) AS total FROM students WHERE country = ?",
        (country,),
    ).fetchone()["total"]
    file_row = db.execute(
        """
        SELECT COUNT(files.id) AS total_files, COALESCE(SUM(files.size_bytes), 0) AS total_size
        FROM students
        LEFT JOIN files ON files.student_id = students.student_id
        WHERE students.country = ?
        """,
        (country,),
    ).fetchone()
    students = db.execute(
        """
        SELECT students.*, COUNT(files.id) AS file_count
        FROM students
        LEFT JOIN files ON files.student_id = students.student_id
        WHERE students.country = ?
        GROUP BY students.student_id
        ORDER BY students.last_updated DESC, students.id DESC
        LIMIT 10
        """,
        (country,),
    ).fetchall()
    return {
        "students": student_total,
        "files": file_row["total_files"],
        "storage_bytes": file_row["total_size"],
        "recent_students": students,
    }


def format_storage(total_bytes):
    if total_bytes >= 1024 * 1024 * 1024:
        return f"{total_bytes / (1024 * 1024 * 1024):.2f} GB"
    if total_bytes >= 1024 * 1024:
        return f"{total_bytes / (1024 * 1024):.2f} MB"
    if total_bytes >= 1024:
        return f"{total_bytes / 1024:.2f} KB"
    return f"{total_bytes} B"


def redirect_by_role():
    user = get_current_user()
    if not user:
        return redirect(url_for("portal.portal_login"))
    if user["role"] == "Admin":
        return redirect(url_for("portal.admin_dashboard"))
    if session.get("country_authenticated") and session.get("selected_country"):
        return redirect(
            url_for(
                "portal.country_dashboard",
                country_slug=slug_for_country(session["selected_country"]),
            )
        )
    return redirect(url_for("portal.country_selection"))


@portal_bp.app_template_filter("storage_label")
def storage_label_filter(total_bytes):
    return format_storage(total_bytes or 0)


@portal_bp.get("/portal")
def portal_login():
    user = get_current_user()
    if user:
        return redirect_by_role()
    return render_template("portal_login.html")


@portal_bp.post("/portal")
def portal_login_submit():
    role = str(request.form.get("role", "")).strip()
    username = str(request.form.get("username", "")).strip().lower()
    password = str(request.form.get("password", "")).strip()

    if role not in {"Admin", "Staff"}:
        return render_template(
            "portal_login.html",
            error="Select a valid role.",
            role=role,
            username=username,
        ), 400

    user = current_app.config["USERS"].get(username)
    if not user or user["password"] != password or user["role"] != role:
        return render_template(
            "portal_login.html",
            error="Invalid username, password, or role.",
            role=role,
            username=username,
        ), 401

    session.clear()
    session["user"] = {"username": username, "role": role}
    session["selected_country"] = None
    session["country_authenticated"] = role == "Admin"

    if role == "Admin":
        default_country = next(iter(COUNTRY_PREFIXES))
        session["selected_country"] = default_country
        return redirect(url_for("portal.admin_dashboard", country=default_country))

    return redirect(url_for("portal.country_selection"))


@portal_bp.get("/portal/countries")
def country_selection():
    user = get_current_user()
    if not user:
        return redirect(url_for("portal.portal_login"))
    if user["role"] != "Staff":
        return redirect(url_for("portal.admin_dashboard"))
    return render_template(
        "portal_country_select.html",
        countries=portal_countries(),
        selected_country=session.get("selected_country"),
    )


@portal_bp.get("/portal/admin/dashboard")
def admin_dashboard():
    user = get_current_user()
    if not user:
        return redirect(url_for("portal.portal_login"))
    if user["role"] != "Admin":
        return redirect_by_role()

    country = str(request.args.get("country", "")).strip() or session.get("selected_country")
    if country not in COUNTRY_PREFIXES:
        country = next(iter(COUNTRY_PREFIXES))
    session["selected_country"] = country

    return render_template(
        "portal_dashboard.html",
        user=user,
        current_country=country,
        current_country_slug=slug_for_country(country),
        summary=build_country_summary(country),
        countries=portal_countries(),
        is_admin=True,
    )


@portal_bp.route("/portal/<country_slug>/login", methods=["GET", "POST"])
def country_login(country_slug):
    country = country_from_slug(country_slug)
    user = get_current_user()

    if not country:
        return redirect(url_for("portal.country_selection"))
    if not user:
        return redirect(url_for("portal.portal_login"))
    if user["role"] != "Staff":
        return redirect(url_for("portal.admin_dashboard", country=country))
    if session.get("country_authenticated") and session.get("selected_country") != country:
        return redirect(
            url_for(
                "portal.country_dashboard",
                country_slug=slug_for_country(session.get("selected_country")),
            )
        )
    if session.get("country_authenticated") and session.get("selected_country") == country:
        return redirect(url_for("portal.country_dashboard", country_slug=country_slug))

    session["selected_country"] = country
    session["country_authenticated"] = False

    if request.method == "POST":
        username = str(request.form.get("username", "")).strip().lower()
        password = str(request.form.get("password", "")).strip()
        credentials = current_app.config["COUNTRY_USERS"][country]

        if credentials["username"] == username and credentials["password"] == password:
            session["selected_country"] = country
            session["country_authenticated"] = True
            return redirect(url_for("portal.country_dashboard", country_slug=country_slug))

        return render_template(
            "portal_country_login.html",
            country=country,
            country_slug=country_slug,
            error="Invalid country credentials.",
            username=username,
        ), 401

    return render_template(
        "portal_country_login.html",
        country=country,
        country_slug=country_slug,
    )


@portal_bp.get("/portal/<country_slug>/dashboard")
def country_dashboard(country_slug):
    country = country_from_slug(country_slug)
    user = get_current_user()

    if not country:
        return redirect_by_role()
    if not user:
        return redirect(url_for("portal.portal_login"))
    if not can_access_country(country):
        return redirect_by_role()

    session["selected_country"] = country
    return render_template(
        "portal_dashboard.html",
        user=user,
        current_country=country,
        current_country_slug=country_slug,
        summary=build_country_summary(country),
        countries=portal_countries(),
        is_admin=is_admin_session(),
    )


@portal_bp.post("/portal/logout")
def portal_logout():
    session.clear()
    return redirect(url_for("portal.portal_login"))
