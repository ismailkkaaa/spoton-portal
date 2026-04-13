from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request, session

from .utils import country_from_slug, json_error, safe_route


auth_bp = Blueprint("auth", __name__)


def current_timestamp():
    return datetime.now(timezone.utc).isoformat()


@auth_bp.post("/login")
@safe_route
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", "")).strip()
    requested_role = str(data.get("role", "")).strip()

    if not username or not password:
        current_app.logger.warning("Login rejected due to missing credentials")
        return json_error("Username and password are required")

    user = current_app.config["USERS"].get(username)
    if not user or user["password"] != password:
        current_app.logger.warning("Login failed for username=%s", username or "<empty>")
        return json_error("Invalid username or password", 401)
    if requested_role and user["role"] != requested_role:
        current_app.logger.warning(
            "Login failed due to role mismatch username=%s requested_role=%s",
            username,
            requested_role,
        )
        return json_error("Selected role does not match this account", 401)

    session.clear()
    session["user"] = {"username": username, "role": user["role"]}
    session["selected_country"] = None
    session["country_authenticated"] = user["role"] == "Admin"
    session["last_activity"] = current_timestamp()
    current_app.logger.info("Login successful for username=%s role=%s", username, user["role"])
    return jsonify(
        {
            "message": "Login successful",
            "user": session["user"],
            "selected_country": session.get("selected_country"),
            "country_authenticated": session.get("country_authenticated", False),
        }
    )


@auth_bp.post("/country-login")
@safe_route
def country_login():
    user = session.get("user")
    if not user:
        return json_error("Authentication required", 401)
    if user.get("role") != "Staff":
        return json_error("Only staff requires country login", 403)

    data = request.get_json(silent=True) or {}
    country = str(data.get("country", "")).strip()
    if not country:
        country = country_from_slug(data.get("country_slug"))
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if not country or country not in current_app.config["COUNTRY_USERS"]:
        return json_error("Country is invalid")
    if not username or not password:
        return json_error("Username and password are required")

    credentials = current_app.config["COUNTRY_USERS"][country]
    if credentials["username"] != username or credentials["password"] != password:
        current_app.logger.warning("Country login failed for country=%s username=%s", country, username)
        return json_error("Invalid username or password", 401)

    session["selected_country"] = country
    session["country_authenticated"] = True
    session["last_activity"] = current_timestamp()
    current_app.logger.info("Country login successful for username=%s country=%s", username, country)
    return jsonify(
        {
            "message": "Country login successful",
            "user": user,
            "selected_country": country,
            "country_authenticated": True,
        }
    )


@auth_bp.post("/logout")
@safe_route
def logout():
    username = session.get("user", {}).get("username", "<unknown>")
    session.clear()
    current_app.logger.info("Logout successful for username=%s", username)
    return jsonify({"message": "Logout successful"})


@auth_bp.get("/me")
@safe_route
def me():
    user = session.get("user")
    if not user:
        return json_error("Authentication required", 401)
    return jsonify(
        {
            "user": user,
            "selected_country": session.get("selected_country"),
            "country_authenticated": session.get("country_authenticated", False),
        }
    )
