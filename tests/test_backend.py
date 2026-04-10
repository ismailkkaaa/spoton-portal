import io
import shutil
import unittest
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
        self.assertEqual(self.client.get("/api/auth/me").status_code, 200)
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

    def test_admin_can_update_status_and_staff_cannot(self):
        self.login()
        student_id = self.create_student().get_json()["student"]["student_id"]
        self.client.post("/api/auth/logout")

        self.login("staff", "staff123")
        forbidden = self.client.patch(
            f"/api/students/{student_id}/status",
            json={"status": "Visa Approved"},
        )
        self.assertEqual(forbidden.status_code, 403)

        self.client.post("/api/auth/logout")
        self.login()
        updated = self.client.patch(
            f"/api/students/{student_id}/status",
            json={"status": "Visa Approved"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["student"]["status"], "Visa Approved")

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
        self.login("staff", "staff123")
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


if __name__ == "__main__":
    unittest.main()
