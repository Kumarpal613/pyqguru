import { useEffect, useRef, useState } from "react";

const baseurl = import.meta.env.VITE_API_URL || "";
const SECTION_TIME_SECONDS = 15 * 60;

const PARTS = [
  {
    id: 1,
    label: "SECTION 1",
    filterName: "General Intelligence and Reasoning",
    displayName: "General Intelligence and Reasoning",
  },
  {
    id: 2,
    label: "SECTION 2",
    filterName: "General Awareness",
    displayName: "General Awareness",
  },
  {
    id: 3,
    label: "SECTION 3",
    filterName: "Quantitative Aptitude",
    displayName: "Quantitative Aptitude",
  },
  {
    id: 4,
    label: "SECTION 4",
    filterName: "English Language",
    filterNames: ["English Language", "English Language and Comprehension"],
    displayName: "English Language and Comprehension",
  },
];

function SectionTimer({ section, onExpire }) {
  const remainingRef = useRef({
    1: SECTION_TIME_SECONDS,
    2: SECTION_TIME_SECONDS,
    3: SECTION_TIME_SECONDS,
    4: SECTION_TIME_SECONDS,
  });
  const [timeLeft, setTimeLeft] = useState(SECTION_TIME_SECONDS);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    setTimeLeft(remainingRef.current[section]);

    const timer = setInterval(() => {
      setTimeLeft(() => {
        const next = Math.max(0, remainingRef.current[section] - 1);
        remainingRef.current[section] = next;

        if (next === 0) {
          clearInterval(timer);
          onExpireRef.current();
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [section]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}`;

  return (
    <div className={`exam-timer ${timeLeft <= 120 ? "timer-warning" : ""}`}>
      Time Left: {formattedTime}
    </div>
  );
}

function TestPage({ selectedTest, onComplete }) {
  const [allQuestions, setAllQuestions] = useState([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showSubmitPopup, setShowSubmitPopup] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submittingRef = useRef(false);

  const [questionStates, setQuestionStates] = useState({});

  useEffect(() => {
    async function fetchQuestions() {
      const response = await fetch(`${baseurl}/api/exams/${selectedTest.examId}/tests/${selectedTest.testId}/questions`);
      const data = await response.json();
      setAllQuestions(data);
      const initialStates = {};

      data.forEach((question) => {
        initialStates[question.question_number] = {
          answer: null,
          markedForReview: false,
        };
      });
      setQuestionStates(initialStates);
    }

    fetchQuestions();
  }, [selectedTest.examId, selectedTest.testId]);

  const currentPart = PARTS[currentSection - 1];
  const sectionQuestions = allQuestions.filter(
    (question) => (currentPart.filterNames || [currentPart.filterName]).includes(question.section),
  );

  function moveToNextSection() {
    const next = Math.min(currentSection + 1, 4);
    setCurrentSection(next);
    setCurrentQuestion(0);
  }

  function selectAnswer(option) {
    const questionNumber = sectionQuestions[currentQuestion].question_number;

    setQuestionStates((previous) => ({
      ...previous,
      [questionNumber]: {
        ...previous[questionNumber],
        answer: previous[questionNumber].answer === option ? null : option,
      },
    }));
  }

  function toggleReview() {
    const questionNumber = sectionQuestions[currentQuestion].question_number;

    setQuestionStates((previous) => ({
      ...previous,
      [questionNumber]: {
        ...previous[questionNumber],
        markedForReview: !previous[questionNumber].markedForReview,
      },
    }));
  }

  function goToQuestion(index) {
    setCurrentQuestion(index);
  }

  function nextQuestion() {
    if (currentQuestion < sectionQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      return;
    }

    setShowSubmitPopup(true);
  }
  function previousQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  function submitSection() {
    if (currentSection < 4) {
      moveToNextSection();
    } else {
      finishTest();
    }
  }

  async function finishTest() {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const answers = Object.entries(questionStates).map(
        ([questionNumber, state]) => ({
          question_number: Number(questionNumber),
          selected_option: state.answer,
        }),
      );

      const response = await fetch(`${baseurl}/api/test/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_id: selectedTest.examId, test_id: selectedTest.testId, answers }),
      });

      if (!response.ok) {
        throw new Error("Unable to submit the test.");
      }

      const submission = await response.json();
      onComplete({ questions: allQuestions, submission, selectedTest });
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }


  const sectionStats = {
    answered: sectionQuestions.filter(
      (question) => questionStates[question.question_number]?.answer !== null,
    ).length,
    reviewed: sectionQuestions.filter(
      (question) =>
        questionStates[question.question_number]?.markedForReview === true,
    ).length,
  };
  sectionStats.notAnswered = sectionQuestions.length - sectionStats.answered;


  if (allQuestions.length === 0) {
    return <h2 className="exam-loading">Loading questions...</h2>;
  }

  const question = sectionQuestions[currentQuestion];
  if (!question) {
    return <h2 className="exam-loading">This question is not available. Please return to the paper list and start the test again.</h2>;
  }
  const currentState = questionStates[question.question_number];

  return (
    <div className="test-container">
      <header className="exam-chrome">
        <div className="single-exam-header">
          <div className="section-label">
            <span>SECTION {currentSection}</span>
            <strong>{currentPart.displayName}</strong>
          </div>
          <div className="question-progress">
            <span>Question</span>
            <strong>{currentQuestion + 1} / {sectionQuestions.length}</strong>
          </div>
          <div className="exam-actions">
            <SectionTimer
              section={currentSection}
              onExpire={() => {
                if (currentSection < 4) moveToNextSection();
                else finishTest();
              }}
            />
            <button
              type="button"
              className={currentState?.markedForReview ? "active-review" : ""}
              onClick={toggleReview}
            >
              {currentState?.markedForReview ? "Unmark Review" : "Mark for Review"}
            </button>
            <button
              type="button"
              className="previous-button"
              onClick={previousQuestion}
              disabled={currentQuestion === 0}
            >
              Previous
            </button>
            <button type="button" className="next-button" onClick={nextQuestion}>
              {currentQuestion === sectionQuestions.length - 1 ? "Review" : "Save & Next"}
            </button>
            <button
              type="button"
              className="header-submit"
              onClick={() => setShowSubmitPopup(true)}
            >
              Submit Test
            </button>
          </div>
        </div>
      </header>

      <div className={`test-layout ${showPalette ? "" : "palette-collapsed"}`}>
        <div className="question-area" key={question.question_number}>
          <div className="question-bar">
            <h2>Question : {currentQuestion + 1}</h2>
            <label className="language-select">
              Select Language:
              <select defaultValue="en" aria-label="Select language">
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div className="question-box">
            <div className="question-watermark" aria-hidden="true">
              {Array.from({ length: 48 }, (_, index) => (
                <span key={index}>41985926482</span>
              ))}
            </div>
            <p className="question-text">{question.question_text}</p>
            <div className="options">
              {Object.entries(question.options).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className={
                    currentState?.answer === key ? "option selected" : "option"
                  }
                  onClick={() => selectAnswer(key)}
                >
                  <span />
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showPalette ? (
          <button
            className="palette-close"
            onClick={() => setShowPalette(false)}
            aria-label="Hide question palette"
          >
            &gt;
          </button>
        ) : (
          <button
            className="palette-open"
            onClick={() => setShowPalette(true)}
            aria-label="Show question palette"
          >
            &lt;
          </button>
        )}

        <aside
          className={`question-palette ${showPalette ? "" : "hide-palette"}`}
        >
          <div className="palette-paper-title">
            <strong>{selectedTest.examTitle} - {selectedTest.testTitle}</strong>
            <span>PYQ GURU</span>
          </div>

          <div className="palette-grid">
            {sectionQuestions.map((item, index) => {
              const isAnswered =
                questionStates[item.question_number]?.answer !== null;
              const isMarked =
                questionStates[item.question_number]?.markedForReview === true;
              const isCurrent = index === currentQuestion;

              return (
                <button
                  key={item.question_number}
                  type="button"
                  className={`palette-button ${isAnswered ? "answer" : ""} ${isMarked ? "review" : ""} ${isCurrent ? "current" : ""}`}
                  onClick={() => goToQuestion(index)}
                >
                  {item.question_number}
                </button>
              );
            })}
          </div>

          <div className="palette-analysis">
            <h3>Analysis</h3>
            <p>
              Answered
              <span className="stat-answered">{sectionStats.answered}</span>
            </p>
            <p>
              Not Answered
              <span className="stat-unanswered">
                {sectionStats.notAnswered}
              </span>
            </p>
            <p>
              Mark for Review
              <span className="stat-review">{sectionStats.reviewed}</span>
            </p>
          </div>
        </aside>
      </div>

      {showSubmitPopup && (
        <div className="popup-overlay">
          <div className="submit-popup">
            <button
              className="close-popup"
              type="button"
              onClick={() => setShowSubmitPopup(false)}
            >
              ×
            </button>
            <h3>{currentSection === 4 ? "Finish Test?" : "Submit Section?"}</h3>
            <p>
              {currentSection === 4
                ? "Are you sure you want to submit the complete test?"
                : "Are you sure you want to submit this section?"}
            </p>
            <div className="popup-buttons">
              <button
                className="cancel-button"
                type="button"
                onClick={() => setShowSubmitPopup(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowSubmitPopup(false);
                  submitSection();
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitError && <p className="submit-error">{submitError}</p>}
    </div>
  );
}

export default TestPage;
