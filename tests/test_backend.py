import io
import shutil
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from spoton_portal import create_app


class SpotOnBackendTests(unittest.TestCase):
    def setUp(self):
        self.base_path = Path(__file__).resolve().parent / ".runtime"
        if self.base_path.exists():
            shutil.rmtree(self.base_path, ignore_errors=True)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.app = create_app(
            {
                "TESTING": True,
                "SECRET_KEY": "test-secret",
                "DATABASE": self.base_path / "test.sqlite3",
                "UPLOAD_FOLDER": self.base_path / "uploads",
            }
        )
        self.client = self.app.test_client()

    def tearDown(self):
        shutil.rmtree(self.base_path, ignore_errors=True)

    def login(self, username="admin", password="admin123"):
        return self.client.post(
            "/api/auth/login",
            json={"username": username, "password": password},
        )

    def login_with_role(self, username, password, role):
        return self.client.post(
            "/api/auth/login",
            json={"username": username, "password": password, "role": role},
        )

    def country_login(self, country="Georgia", username="georgia_staff", password="geo123"):
        return self.client.post(
            "/api/auth/country-login",
            json={"country": country, "username": username, "password": password},
        )

    def create_student(self, **overrides):
        payload = {
            "name": "Aarav Sharma",
            "phone": "+995555100101",
            "email": "aarav@example.com",
            "country": "Georgia",
            "course": "MBBS",
            "status": "Application Created",
        }
        payload.update(overrides)
        return self.client.post("/api/students", json=payload)

    def test_auth_login_logout_flow(self):
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.assertEqual(self.login("admin", "wrong").status_code, 401)
        self.assertEqual(self.login().status_code, 200)
        me_response = self.client.get("/api/auth/me")
        self.assertEqual(me_response.status_code, 200)
        self.assertTrue(me_response.get_json()["country_authenticated"])
        self.assertEqual(self.client.post("/api/auth/logout").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_add_student_validation_and_duplicate_checks(self):
        self.login()
        invalid = self.create_student(email="bad-email")
        self.assertEqual(invalid.status_code, 400)

        created = self.create_student()
        self.assertEqual(created.status_code, 201)
        student_id = created.get_json()["student"]["student_id"]
        self.assertTrue(student_id.startswith("GEO-"))

        duplicate_phone = self.create_student(
            name="Another Student",
            email="another@example.com",
        )
        self.assertEqual(duplicate_phone.status_code, 409)

    def test_students_filtered_by_country_and_course(self):
        self.login()
        self.create_student()
        self.create_student(
            name="Uz Student",
            phone="+998901112222",
            email="uz@example.com",
            country="Uzbekistan",
            course="MBBS",
        )

        filtered = self.client.get("/api/students?country=Georgia&course=MBBS")
        self.assertEqual(filtered.status_code, 200)
        students = filtered.get_json()["students"]
        self.assertEqual(len(students), 1)
        self.assertEqual(students[0]["country"], "Georgia")

    def test_admin_can_update_status_and_staff_requires_country_login(self):
        self.login()
        student_id = self.create_student().get_json()["student"]["student_id"]
        self.client.post("/api/auth/logout")

        self.login_with_role("staff", "staff123", "Staff")
        blocked_without_country = self.client.get("/api/students?country=Georgia")
        self.assertEqual(blocked_without_country.status_code, 403)

        self.country_login("Georgia")
        forbidden = self.client.patch(
            f"/api/students/{student_id}/status",
            json={"status": "Pending"},
        )
        self.assertEqual(forbidden.status_code, 403)

        blocked_country = self.client.get("/api/students?country=Uzbekistan")
        self.assertEqual(blocked_country.status_code, 403)

        self.client.post("/api/auth/logout")
        self.login()
        updated = self.client.patch(
            f"/api/students/{student_id}/status",
            json={"status": "Pending"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["student"]["status"], "Pending")

    def test_file_upload_download_delete_and_staff_restriction(self):
        self.login()
        student_id = self.create_student().get_json()["student"]["student_id"]

        invalid_upload = self.client.post(
            f"/api/students/{student_id}/files",
            data={"file": (io.BytesIO(b"x"), "malware.exe")},
            content_type="multipart/form-data",
        )
        self.assertEqual(invalid_upload.status_code, 400)

        upload = self.client.post(
            f"/api/students/{student_id}/files",
            data={"file": (io.BytesIO(b"hello world"), "passport.pdf")},
            content_type="multipart/form-data",
        )
        self.assertEqual(upload.status_code, 201)
        file_id = upload.get_json()["file"]["id"]

        files = self.client.get(f"/api/students/{student_id}/files")
        self.assertEqual(files.status_code, 200)
        self.assertEqual(len(files.get_json()["files"]), 1)

        download = self.client.get(f"/api/students/{student_id}/files/{file_id}/download")
        self.assertEqual(download.status_code, 200)
        download.close()

        self.client.post("/api/auth/logout")
        self.login_with_role("staff", "staff123", "Staff")
        self.country_login("Georgia")
        forbidden_delete = self.client.delete(f"/api/students/{student_id}/files/{file_id}")
        self.assertEqual(forbidden_delete.status_code, 403)

        self.client.post("/api/auth/logout")
        self.login()
        deleted = self.client.delete(f"/api/students/{student_id}/files/{file_id}")
        self.assertEqual(deleted.status_code, 200)

        missing = self.client.get(f"/api/students/{student_id}/files/{file_id}/download")
        self.assertEqual(missing.status_code, 404)

    def test_dashboard_summary_and_missing_student_cases(self):
        self.login()
        self.create_student()
        summary = self.client.get("/api/dashboard/summary?country=Georgia&course=MBBS")
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.get_json()["summary"]["students"], 1)

        missing_student = self.client.get("/api/students/NOPE-9999")
        self.assertEqual(missing_student.status_code, 404)

        missing_files = self.client.get("/api/students/NOPE-9999/files")
        self.assertEqual(missing_files.status_code, 404)

    def test_root_login_entry_country_login_and_portal_redirect(self):
        self.login()
        self.create_student()
        self.client.post("/api/auth/logout")

        login_page = self.client.get("/")
        self.assertEqual(login_page.status_code, 200)
        self.assertIn(b"Main Login", login_page.data)

        portal_redirect = self.client.get("/portal", follow_redirects=False)
        self.assertEqual(portal_redirect.status_code, 302)
        self.assertEqual(portal_redirect.headers["Location"], "/")

        staff_login = self.login_with_role("staff", "staff123", "Staff")
        self.assertEqual(staff_login.status_code, 200)

        me_before_country = self.client.get("/api/auth/me")
        self.assertEqual(me_before_country.status_code, 200)
        self.assertFalse(me_before_country.get_json()["country_authenticated"])

        country_login = self.country_login("Georgia")
        self.assertEqual(country_login.status_code, 200)
        self.assertEqual(country_login.get_json()["selected_country"], "Georgia")

    def test_search_delete_student_and_session_timeout(self):
        self.login()
        created = self.create_student()
        student_id = created.get_json()["student"]["student_id"]
        self.create_student(
            name="Second Student",
            phone="+998901112222",
            email="second@example.com",
            country="Uzbekistan",
            course="MBBS",
        )

        filtered = self.client.get("/api/students?country=Georgia&q=aarav")
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(len(filtered.get_json()["students"]), 1)
        self.assertEqual(filtered.get_json()["students"][0]["student_id"], student_id)

        deleted = self.client.delete(f"/api/students/{student_id}")
        self.assertEqual(deleted.status_code, 200)

        missing = self.client.get(f"/api/students/{student_id}")
        self.assertEqual(missing.status_code, 404)

        with self.client.session_transaction() as session:
            session["user"] = {"username": "admin", "role": "Admin"}
            session["country_authenticated"] = True
            session["last_activity"] = (datetime.now(timezone.utc) - timedelta(hours=7)).isoformat()

        expired = self.client.get("/api/auth/me")
        self.assertEqual(expired.status_code, 401)
        self.assertIn("Session expired", expired.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
