import { useEffect, useState } from "react";

const baseurl = import.meta.env.VITE_API_URL || "";

function StartPage({ onSelectExam }) {
  const [exams, setExams] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchExams() {
      try {
        const response = await fetch(`${baseurl}/api/exams`);
        if (!response.ok) throw new Error("Unable to load exams.");
        setExams(await response.json());
      } catch (requestError) {
        setError(requestError.message);
      }
    }
    fetchExams();
  }, []);

  return (
    <main className="home-page">
      <section className="home-content">
        <p className="home-brand">PYQ GURU</p>
        <p className="home-eyebrow">EXAM PRACTICE MADE FOCUSED</p>
        <h1>What exam are you preparing for?</h1>
        <p className="home-description">
          Choose an exam to open its previous-year papers and practice section by section.
        </p>
        {error && <p className="start-error">{error}</p>}
        {!error && exams.length === 0 && <p className="start-loading">Loading exams...</p>}
        <div className="exam-home-grid">
          {exams.map((exam) => (
            <button className="exam-home-card" type="button" key={exam.id} onClick={() => onSelectExam(exam)}>
              <span className="exam-home-icon" aria-hidden="true">SSC</span>
              <span className="exam-home-copy">
                <strong>{exam.title}</strong>
                <small>{exam.tests.length} papers available</small>
              </span>
              <span className="exam-home-arrow" aria-hidden="true">View papers</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default StartPage;
