import logging
from http import HTTPStatus

from flask import Flask, jsonify
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

    @app.get("/")
    def index():
        return app.send_static_file("index.html")

    @app.get("/favicon.ico")
    def favicon():
        return ("", 204)

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
