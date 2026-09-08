function ExamPapersPage({ exam, onBack, onStart }) {
  return (
    <main className="papers-page">
      <header className="papers-header">
        <button className="papers-back" type="button" onClick={onBack}>Back</button>
        <strong>PYQ GURU</strong>
      </header>
      <section className="papers-content">
        <p className="home-eyebrow">SELECT A PREVIOUS-YEAR PAPER</p>
        <h1>{exam.title} Papers</h1>
        <p className="papers-intro">Choose a paper to begin your practice test.</p>
        <div className="papers-list">
          {exam.tests.map((test, index) => (
            <button
              className="paper-card"
              type="button"
              key={test.id}
              onClick={() => onStart({
                examId: exam.id,
                examTitle: exam.title,
                testId: test.id,
                testTitle: test.title,
                questionCount: test.question_count,
              })}
            >
              <span className="paper-index">Paper {index + 1}</span>
              <span className="paper-copy">
                <strong>{test.title}</strong>
                <small>{test.question_count} questions | +2 / -0.5 marking</small>
              </span>
              <span className="paper-start">Start test</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ExamPapersPage;
