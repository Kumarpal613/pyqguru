"""One-time importer: JSON -> MongoDB.

Run from the backend directory after setting MONGODB_URI:
    python seed_mongodb.py

This uses upserts for the current exam/test and does not delete other database data.
"""

from pathlib import Path
import json
import os
import re

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).with_name(".env"))

uri = os.getenv("MONGODB_URI")
database_name = os.getenv("MONGODB_DB", "pyqguru")
if not uri:
    raise SystemExit("MONGODB_URI is required. Add it to backend/.env first.")


def make_id(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


with Path(__file__).with_name("questions.json").open(encoding="utf-8") as file:
    raw_data = json.load(file)

if all(isinstance(value, list) for value in raw_data.values()):
    raw_data = {"SSC CGL": raw_data}

database = MongoClient(uri)[database_name]

for exam_title, tests in raw_data.items():
    exam_id = make_id(exam_title)
    database.exams.update_one(
        {"id": exam_id},
        {"$set": {"id": exam_id, "title": exam_title}},
        upsert=True,
    )

    for test_title, questions in tests.items():
        test_id = make_id(test_title)
        database.tests.update_one(
            {"exam_id": exam_id, "id": test_id},
            {
                "$set": {
                    "exam_id": exam_id,
                    "id": test_id,
                    "title": test_title,
                    "question_count": len(questions),
                }
            },
            upsert=True,
        )
        for question in questions:
            database.questions.update_one(
                {
                    "exam_id": exam_id,
                    "test_id": test_id,
                    "question_number": question["question_number"],
                },
                {"$set": {**question, "exam_id": exam_id, "test_id": test_id}},
                upsert=True,
            )

database.questions.create_index([("exam_id", 1), ("test_id", 1), ("question_number", 1)], unique=True)
database.tests.create_index([("exam_id", 1), ("id", 1)], unique=True)
database.exams.create_index("id", unique=True)
print(f"Imported/updated JSON in MongoDB database: {database_name}")
