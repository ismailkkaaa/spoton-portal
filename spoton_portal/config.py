import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "spoton-internal-secret-key")
    DATABASE = Path(os.environ.get("DATABASE_PATH", BASE_DIR / "instance" / "spoton_portal.sqlite3"))
    UPLOAD_FOLDER = Path(os.environ.get("UPLOAD_FOLDER", BASE_DIR / "uploads"))
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024
    ALLOWED_EXTENSIONS = {
        "pdf",
        "png",
        "jpg",
        "jpeg",
        "docx",
    }
    USERS = {
        "admin": {"password": "admin123", "role": "Admin"},
        "staff": {"password": "staff123", "role": "Staff"},
    }
