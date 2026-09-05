from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

app = FastAPI()

api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Answer(BaseModel):
    question_number: int
    selected_option: str | None = None


class TestSubmission(BaseModel):
    answers: list[Answer]


@api_router.get("/", status_code=status.HTTP_200_OK)
def health():
    return {"status": "healthy"}


questions_path = Path(__file__).with_name("questions.json")
with questions_path.open(encoding="utf-8") as file:
    questions_set = json.load(file)


@api_router.get("/questions")
def get_questions():
    return [
        {
            key: value
            for key, value in question.items()
            if key != "correct_option"
        }
        for question in questions_set
    ]


# @api_router.get("/questions/section/{section}")
# def get_section_questions(section: int):
#     section_names = [
#         "General Intelligence and Reasoning",
#         "General Awareness",
#         "Quantitative Aptitude",
#         "English Language",
#     ]
#     return section_names[section]


@api_router.post("/test/submit")
def submit_test(submission: TestSubmission):
    score = 0
    results = [] 

    question_lookup = {
        question["question_number"]: question
        for question in questions_set
    }

    for user_answer in submission.answers:

        question = question_lookup.get(
            user_answer.question_number
        )

        if question is None:
            continue

        correct = question["correct_option"]

        if user_answer.selected_option is None:
            result = "missed"
            selected_option = None
        elif user_answer.selected_option == correct:
            score += 2
            result = "correct"
            selected_option = question["options"][
                user_answer.selected_option
            ]
        else:
            score -= 0.5
            result = "wrong"
            selected_option = question["options"].get(
                user_answer.selected_option
            )

        # Add result
        results.append({
            "question_number": question["question_number"],

            "question": question["question_text"],

            "options": question["options"],

            "selected_option": user_answer.selected_option,

            "correct_option": correct,

            "result": result
        })

    return {
        "score": score,
        "results": results
    }


app.include_router(api_router)
