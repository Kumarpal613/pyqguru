import { useEffect, useState } from "react";

const baseurl = import.meta.env.VITE_API_URL;

function TestPage({ onComplete }) {
  const [allQuestions, setAllQuestions] = useState([]);

  const [currentSection, setCurrentSection] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showSubmitPopup, setShowSubmitPopup] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Stores answers from ALL sections
  const [questionStates, setQuestionStates] = useState({});

  // 15 minutes
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // Fetch Current section
  useEffect(() => {
    async function fetchQuestions() {
      const response = await fetch(`${baseurl}/api/questions`);

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
  }, []);

  //Get question for current section
  const sectionQuestions = allQuestions.filter(
    (question) => question.section === getSectionName(currentSection),
  );

  function getSectionName(section) {
    const sections = [
      "General Intelligence and Reasoning",
      "General Awareness",
      "Quantitative Aptitude",
      "English Language",
    ];

    return sections[section - 1];
  }

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      moveToNextSection();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((time) => time - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
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

  function moveToNextSection() {
    if (currentSection < 4) {
      setCurrentSection(currentSection + 1);
      setTimeLeft(15 * 60);
    } else {
      console.log("Test finished");
    }
  }

  function goToQuestion(index) {
    setCurrentQuestion(index);
  }

  function nextQuestion() {
    if (currentQuestion < sectionQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  }

  function previousQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  async function submitSection() {
    if (currentSection < 4) {
      setCurrentSection(currentSection + 1);
      setCurrentQuestion(0);
      setTimeLeft(15 * 60);
    } else {
      setIsSubmitting(true);
      setSubmitError("");

      try {
        const answers = Object.entries(questionStates).map(
          ([questionNumber, state]) => ({
            question_number: Number(questionNumber),
            selected_option: state.answer || null,
          }),
        );

        const response = await fetch(`${baseurl}/api/test/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });

        if (!response.ok) {
          throw new Error("Unable to submit the test.");
        }

        const submission = await response.json();
        onComplete({ questions: allQuestions, submission });
      } catch (error) {
        setSubmitError(error.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  if (allQuestions.length === 0) {
    return <h2>Loading questions...</h2>;
  }

  const question = sectionQuestions[currentQuestion];

  return (
    <div className="test-container">
      <div className="test-header">
        <h1>SSC CGL PYQ Test</h1>
        <p className="section-label">Section {currentSection}</p>

        <div className="header-controls">
        
          <button onClick={previousQuestion} disabled={currentQuestion === 0}>
            Previous
          </button>

          <button
            className={
              questionStates[question.question_number]?.markedForReview
                ? "review-button active"
                : "review-button"
            }
            onClick={toggleReview}
          >
            {questionStates[question.question_number]?.markedForReview
              ? "Remove Review"
              : "Mark for Review"}
          </button>

          <button
            onClick={nextQuestion}
            disabled={currentQuestion === sectionQuestions.length - 1}
          > 
            Next
          </button>

          <button
            className="submit-section"
            onClick={() => setShowSubmitPopup(true)}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Submitting..."
              : currentSection === 4
                ? "Finish Test"
                : "Submit Section"}
          </button>
          <div className={`timer ${timeLeft <= 120 ? "timer-warning" : ""}`}>
            Time Left: {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className={`test-layout ${showPalette ? "" : "palette-collapsed"}`}>
        <div className="question-area" key={question.question_number}>
          <h2>Question {question.question_number}</h2>
          <p className="question-text">{question.question_text}</p>

          <div className="options">
            {Object.entries(question.options).map(([key, value]) => (
              <button
                key={key}
                className={
                  questionStates[question.question_number]?.answer === key
                    ? "option selected"
                    : "option"
                }
                onClick={() => selectAnswer(key)}
              >
                <span>{key}</span>
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Question palette */}
        {showPalette ? (
          <button
            className="palette-close"
            onClick={() => setShowPalette(false)}
          >
            &gt;
          </button>
        ) : (
          <button className="palette-open" onClick={() => setShowPalette(true)}>
            &lt;
          </button>
        )}
        <div
          className={`question-palette ${showPalette ? "" : "hide-palette"}`}
        >
          <h3>Question Palette</h3>

          <div className="palette-grid">
            {sectionQuestions.map((q, index) => {
              const isAnswered =
                questionStates[q.question_number]?.answer !== null;
              const isMarked =
                questionStates[q.question_number]?.markedForReview === true;
              const isCurrent = index === currentQuestion;
              0;

              return (
                <button
                  key={q.question_number}
                  className={`
  palette-button
  ${isAnswered ? "answer" : ""}
  ${isMarked ? "review" : ""}
  ${isCurrent ? "current" : ""}
`}
                  onClick={() => goToQuestion(index)}
                >
                  {q.question_number}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {showSubmitPopup && (
        <div className="popup-overlay">
          <div className="submit-popup">
            <button
              className="close-popup"
              onClick={() => setShowSubmitPopup(false)}
            >
              ×
            </button>

            <h3>Submit Section?</h3>

            <p>Are you sure you want to submit this section?</p>

            <div className="popup-buttons">
              <button
                className="cancel-button"
                onClick={() => setShowSubmitPopup(false)}
              >
                Cancel
              </button>

              <button
                className="confirm-button"
                onClick={() => {
                  setShowSubmitPopup(false);
                  submitSection();
                }}
              >
                Submit
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
