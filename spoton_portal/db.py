import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app, g


SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    country TEXT NOT NULL,
    course TEXT NOT NULL,
    status TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    UNIQUE(name, phone, email, country, course)
);

CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    upload_date TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_students_country_course
ON students(country, course);

CREATE INDEX IF NOT EXISTS idx_students_email
ON students(email);

CREATE INDEX IF NOT EXISTS idx_students_phone
ON students(phone);

CREATE INDEX IF NOT EXISTS idx_files_student_id
ON files(student_id);
"""


def utc_now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def get_db():
    if "db" not in g:
        db_path = Path(current_app.config["DATABASE"])
        db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        g.db = connection
    return g.db


def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def rollback_db():
    db = g.get("db")
    if db is not None:
        db.rollback()


def initialize_database():
    db = get_db()
    db.executescript(SCHEMA)
    db.commit()


def init_app(app):
    with app.app_context():
        initialize_database()
        Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
