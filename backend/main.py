from pathlib import Path
import json
import os
import re
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from pymongo.errors import PyMongoError

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI()
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL") or "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "pyqguru")


class Answer(BaseModel):
    question_number: int
    selected_option: str | None = None


class TestSubmission(BaseModel):
    exam_id: str
    test_id: str
    answers: list[Answer]


def make_id(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


@lru_cache
def get_database():
    """Create one Mongo client for the application process."""
    if not MONGODB_URI:
        return None
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    return client[MONGODB_DB]


def using_mongodb() -> bool:
    return bool(MONGODB_URI)


def mongo_database():
    try:
        database = get_database()
    except PyMongoError as error:
        raise HTTPException(
            status_code=503, detail="MongoDB is unavailable. Check MONGODB_URI."
        ) from error
    if database is None:
        raise HTTPException(status_code=500, detail="MONGODB_URI is not configured.")
    return database


def load_json_catalog() -> dict:
    """Temporary local fallback until MONGODB_URI and data import are configured."""
    questions_path = Path(__file__).with_name("questions.json")
    with questions_path.open(encoding="utf-8") as file:
        raw_data = json.load(file)

    if isinstance(raw_data, list):
        raw_data = {"Sample Test 1": raw_data}
    if all(isinstance(value, list) for value in raw_data.values()):
        raw_data = {"SSC CGL": raw_data}

    exams = []
    for exam_title, tests in raw_data.items():
        if not isinstance(tests, dict):
            continue
        normalized_tests = [
            {
                "id": make_id(test_title),
                "title": test_title,
                "question_count": len(questions),
                "questions": questions,
            }
            for test_title, questions in tests.items()
            if isinstance(questions, list)
        ]
        exams.append({"id": make_id(exam_title), "title": exam_title, "tests": normalized_tests})
    return {"exams": exams}


def get_json_test(exam_id: str, test_id: str) -> dict:
    for exam in load_json_catalog()["exams"]:
        if exam["id"] == exam_id:
            for test in exam["tests"]:
                if test["id"] == test_id:
                    return test
    raise HTTPException(status_code=404, detail="Exam or test not found")


def get_test_metadata(exam_id: str, test_id: str) -> dict:
    if not using_mongodb():
        return get_json_test(exam_id, test_id)

    test = mongo_database().tests.find_one(
        {"exam_id": exam_id, "id": test_id},
        {"_id": 0, "id": 1, "title": 1, "question_count": 1},
    )
    if test is None:
        raise HTTPException(status_code=404, detail="Exam or test not found")
    return test


def get_test_questions(exam_id: str, test_id: str, include_answers: bool = False) -> list[dict]:
    if not using_mongodb():
        return get_json_test(exam_id, test_id)["questions"]

    projection = {"_id": 0, "exam_id": 0, "test_id": 0}
    if not include_answers:
        projection["correct_option"] = 0

    questions = list(
        mongo_database().questions.find(
            {"exam_id": exam_id, "test_id": test_id}, projection
        ).sort("question_number", 1)
    )
    if not questions:
        raise HTTPException(status_code=404, detail="Questions for this test were not found")
    return questions


def public_question(question: dict) -> dict:
    return {key: value for key, value in question.items() if key != "correct_option"}


@api_router.get("/", status_code=status.HTTP_200_OK)
def health():
    return {"status": "healthy", "database": "mongodb" if using_mongodb() else "json-fallback"}


@api_router.get("/exams")
def get_exams():
    """Return exam and paper names/counts only; no question data is loaded here."""
    if not using_mongodb():
        return [
            {
                "id": exam["id"],
                "title": exam["title"],
                "tests": [
                    {
                        "id": test["id"],
                        "title": test["title"],
                        "question_count": test["question_count"],
                    }
                    for test in exam["tests"]
                ],
            }
            for exam in load_json_catalog()["exams"]
        ]

    database = mongo_database()
    exams = list(database.exams.find({}, {"_id": 0, "id": 1, "title": 1}).sort("title", 1))
    test_rows = list(
        database.tests.find(
            {}, {"_id": 0, "exam_id": 1, "id": 1, "title": 1, "question_count": 1}
        ).sort("title", 1)
    )
    tests_by_exam = {}
    for test in test_rows:
        tests_by_exam.setdefault(test.pop("exam_id"), []).append(test)
    return [{**exam, "tests": tests_by_exam.get(exam["id"], [])} for exam in exams]


@api_router.get("/exams/{exam_id}/tests/{test_id}/questions")
def get_questions(exam_id: str, test_id: str):
    get_test_metadata(exam_id, test_id)
    return [
        public_question(question)
        for question in get_test_questions(exam_id, test_id, include_answers=False)
    ]


@api_router.post("/test/submit")
def submit_test(submission: TestSubmission):
    get_test_metadata(submission.exam_id, submission.test_id)
    questions = get_test_questions(
        submission.exam_id, submission.test_id, include_answers=True
    )
    question_lookup = {question["question_number"]: question for question in questions}
    score = 0
    results = []

    for user_answer in submission.answers:
        question = question_lookup.get(user_answer.question_number)
        if question is None:
            continue

        correct = question["correct_option"]
        if user_answer.selected_option is None:
            result = "missed"
        elif user_answer.selected_option == correct:
            score += 2
            result = "correct"
        else:
            score -= 0.5
            result = "wrong"

        results.append(
            {
                "question_number": question["question_number"],
                "section": question.get("section", "Uncategorized"),
                "question": question["question_text"],
                "options": question["options"],
                "selected_option": user_answer.selected_option,
                "correct_option": correct,
                "result": result,
            }
        )

    return {"score": score, "results": results}


app.include_router(api_router)
