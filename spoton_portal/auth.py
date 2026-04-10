from flask import Blueprint, current_app, jsonify, request, session

from .utils import json_error, safe_route


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
@safe_route
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if not username or not password:
        current_app.logger.warning("Login rejected due to missing credentials")
        return json_error("Username and password are required")

    user = current_app.config["USERS"].get(username)
    if not user or user["password"] != password:
        current_app.logger.warning("Login failed for username=%s", username or "<empty>")
        return json_error("Invalid username or password", 401)

    session.clear()
    session["user"] = {"username": username, "role": user["role"]}
    current_app.logger.info("Login successful for username=%s role=%s", username, user["role"])
    return jsonify({"message": "Login successful", "user": session["user"]})


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
    return jsonify({"user": user})
