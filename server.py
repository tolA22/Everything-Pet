#!/usr/bin/env python3
"""Serve Everything Pet, save contacts to JSON, and store reservations in SQLite."""

from datetime import datetime, timezone, date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import json
import os
import re
import sqlite3

ROOT = Path(__file__).resolve().parent
CONTACTS_FILE = ROOT / "contacts.json"
DB_PATH = ROOT / "everything_pet.db"
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
BOARDING_RATE = 60
WALK_RATES = {30: 25, 60: 45}
PICKUP_FEE = 20


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL,
            date TEXT NOT NULL,
            owner_name TEXT NOT NULL,
            owner_email TEXT NOT NULL,
            owner_phone TEXT NOT NULL,
            duration INTEGER NOT NULL,
            duration_unit TEXT NOT NULL,
            pickup INTEGER NOT NULL DEFAULT 0,
            pickup_point TEXT NOT NULL DEFAULT '',
            total REAL NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reservation_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            breed TEXT NOT NULL,
            FOREIGN KEY (reservation_id) REFERENCES reservations(id)
        );
        """
    )
    conn.commit()
    conn.close()


def compute_total(service, duration, pet_count, pickup):
    pickup_fee = PICKUP_FEE if pickup else 0
    if service == "walking":
        rate = WALK_RATES.get(duration)
        if rate is None:
            return None
        return rate * pet_count + pickup_fee
    if service == "boarding":
        return BOARDING_RATE * duration * pet_count + pickup_fee
    return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def route_path(self):
        return urlparse(self.path).path.rstrip("/") or "/"

    def do_GET(self):
        if self.route_path() == "/reservations":
            self.handle_list_reservations()
            return
        super().do_GET()

    def do_POST(self):
        path = self.route_path()
        if path == "/contact":
            self.handle_contact()
            return
        if path == "/reserve":
            self.handle_reserve()
            return
        self.send_error(404)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def handle_contact(self):
        try:
            data = self.read_json_body()
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {"ok": False, "error": "Invalid request."})
            return

        name = str(data.get("fullName", "")).strip()
        email = str(data.get("email", "")).strip()
        why = str(data.get("why", "")).strip()

        errors = {}
        if len(name) < 2:
            errors["fullName"] = "Please enter your full name."
        if not EMAIL_PATTERN.match(email):
            errors["email"] = "Please enter a valid email address."
        if errors:
            self.send_json(400, {"ok": False, "errors": errors})
            return

        contacts = []
        if CONTACTS_FILE.exists() and CONTACTS_FILE.read_text(encoding="utf-8").strip():
            contacts = json.loads(CONTACTS_FILE.read_text(encoding="utf-8"))
        contacts.append(
            {
                "fullName": name,
                "email": email,
                "why": why,
                "submittedAt": datetime.now(timezone.utc).isoformat(),
            }
        )
        CONTACTS_FILE.write_text(json.dumps(contacts, indent=2), encoding="utf-8")
        self.send_json(200, {"ok": True})

    def handle_reserve(self):
        try:
            data = self.read_json_body()
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {"ok": False, "error": "Invalid request."})
            return

        service = str(data.get("service", "")).strip()
        service_date = str(data.get("date", "")).strip()
        owner_name = str(data.get("ownerName", "")).strip()
        owner_email = str(data.get("ownerEmail", "")).strip()
        owner_phone = str(data.get("ownerPhone", "")).strip()
        pickup = bool(data.get("pickup"))
        pickup_point = str(data.get("pickupPoint", "")).strip()
        pets = data.get("pets") or []

        try:
            duration = int(data.get("duration"))
        except (TypeError, ValueError):
            duration = 0

        errors = {}
        if service not in ("boarding", "walking"):
            errors["form"] = "Choose boarding or walking."
        if len(owner_name) < 2:
            errors["ownerName"] = "Please enter the owner's name."
        if not EMAIL_PATTERN.match(owner_email):
            errors["ownerEmail"] = "Please enter a valid email address."
        if len(re.sub(r"\D", "", owner_phone)) < 7:
            errors["ownerPhone"] = "Please enter a contact number."

        try:
            parsed_date = date.fromisoformat(service_date)
            if parsed_date < date.today():
                errors["date"] = "Please choose today or a future date."
        except ValueError:
            errors["date"] = "Please choose a valid date."

        cleaned_pets = []
        if not isinstance(pets, list) or not pets:
            errors["petCount"] = "Add at least one pet."
        else:
            for index, pet in enumerate(pets):
                pet_name = str((pet or {}).get("name", "")).strip()
                pet_breed = str((pet or {}).get("breed", "")).strip()
                if not pet_name:
                    errors[f"pet-{index}-name"] = "Enter this pet's name."
                if not pet_breed:
                    errors[f"pet-{index}-breed"] = "Enter this pet's breed."
                cleaned_pets.append({"name": pet_name, "breed": pet_breed})

        duration_unit = "nights" if service == "boarding" else "minutes"
        if service == "boarding" and duration < 1:
            errors["duration"] = "Enter a valid duration."
        if service == "walking" and duration not in WALK_RATES:
            errors["duration"] = "Choose 30 or 60 minutes."
        if pickup and not pickup_point:
            errors["pickupPoint"] = "Enter a pickup point."
        if not pickup:
            pickup_point = ""

        total = compute_total(service, duration, len(cleaned_pets), pickup)
        if total is None and "duration" not in errors and "form" not in errors:
            errors["form"] = "Could not calculate this reservation."

        if errors:
            self.send_json(400, {"ok": False, "errors": errors})
            return

        conn = get_db()
        cursor = conn.execute(
            """
            INSERT INTO reservations (
                service, date, owner_name, owner_email, owner_phone,
                duration, duration_unit, pickup, pickup_point, total, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                service,
                service_date,
                owner_name,
                owner_email,
                owner_phone,
                duration,
                duration_unit,
                1 if pickup else 0,
                pickup_point,
                total,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        reservation_id = cursor.lastrowid
        for pet in cleaned_pets:
            conn.execute(
                "INSERT INTO pets (reservation_id, name, breed) VALUES (?, ?, ?)",
                (reservation_id, pet["name"], pet["breed"]),
            )
        conn.commit()
        conn.close()
        self.send_json(200, {"ok": True, "id": reservation_id, "total": total})

    def handle_list_reservations(self):
        conn = get_db()
        rows = conn.execute(
            "SELECT * FROM reservations ORDER BY datetime(created_at) DESC, id DESC"
        ).fetchall()
        pets_by_reservation = {}
        for pet in conn.execute("SELECT reservation_id, name, breed FROM pets").fetchall():
            pets_by_reservation.setdefault(pet["reservation_id"], []).append(
                {"name": pet["name"], "breed": pet["breed"]}
            )
        conn.close()
        payload = []
        for row in rows:
            payload.append(
                {
                    "id": row["id"],
                    "service": row["service"],
                    "date": row["date"],
                    "ownerName": row["owner_name"],
                    "ownerEmail": row["owner_email"],
                    "ownerPhone": row["owner_phone"],
                    "duration": row["duration"],
                    "durationUnit": row["duration_unit"],
                    "pickup": bool(row["pickup"]),
                    "pickupPoint": row["pickup_point"],
                    "total": row["total"],
                    "createdAt": row["created_at"],
                    "pets": pets_by_reservation.get(row["id"], []),
                }
            )
        self.send_json(200, payload)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        print("[%s] %s" % (self.log_date_time_string(), format % args))


if __name__ == "__main__":
    init_db()
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Everything Pet is running at http://{host}:{port}")
    print(f"Reservations are saved in {DB_PATH}")
    server.serve_forever()
