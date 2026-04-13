import logging
from datetime import datetime, timedelta, timezone
from http import HTTPStatus

from flask import Flask, jsonify, redirect, request, session, url_for
from werkzeug.exceptions import HTTPException

from .config import BASE_DIR, Config
from .db import close_db, init_app


def create_app(test_config=None):
    app = Flask(
        __name__,
        instance_relative_config=True,
        static_folder=str(BASE_DIR),
        static_url_path="",
    )
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    if not app.debug and not app.testing:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s %(message)s",
        )

    init_app(app)

    from .auth import auth_bp
    from .students import students_bp
    from .files import files_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(students_bp, url_prefix="/api")
    app.register_blueprint(files_bp, url_prefix="/api")

    @app.before_request
    def manage_session_timeout():
        user = session.get("user")
        if not user:
            return None

        session.permanent = True
        now = datetime.now(timezone.utc)
        last_activity_raw = session.get("last_activity")
        if last_activity_raw:
            try:
                last_activity = datetime.fromisoformat(last_activity_raw)
            except ValueError:
                session.clear()
                return None
            if now - last_activity > app.permanent_session_lifetime:
                app.logger.info("Session expired due to inactivity for username=%s", user.get("username"))
                session.clear()
                if request.path.startswith("/api/"):
                    return jsonify({"error": "Session expired due to inactivity"}), 401
                return None
        session["last_activity"] = now.isoformat()
        session.modified = True
        return None

    @app.get("/")
    def index():
        return app.send_static_file("index.html")

    @app.get("/portal")
    def portal_redirect():
        return redirect(url_for("index"))

    @app.get("/favicon.ico")
    def favicon():
        return app.send_static_file("favicon.ico")

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(413)
    def payload_too_large(_error):
        return jsonify({"error": "Uploaded file is too large"}), 413

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return jsonify({"error": error.description}), error.code or HTTPStatus.INTERNAL_SERVER_ERROR

    @app.errorhandler(Exception)
    def handle_exception(error):
        app.logger.exception("Unhandled application error: %s", error)
        return jsonify({"error": "Internal server error"}), 500

    app.teardown_appcontext(close_db)
    return app
