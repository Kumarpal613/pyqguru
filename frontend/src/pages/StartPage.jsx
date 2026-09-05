function StartPage({ onStart }) {
  return (
    <main className="start-page">
      <section className="start-card" aria-labelledby="start-title">
        <div className="start-brand-mark" aria-hidden="true">
          PG
        </div>
        <p className="start-kicker">PYQGURU / PRACTICE ARENA</p>
        <h1 id="start-title">
          SSC CGL
          <br />
          PYQ Test
        </h1>
        <p className="start-intro">
          Sharpen your exam strategy with a focused previous-year question paper
          and a clear performance breakdown at the end.
        </p>

        <div className="start-details" aria-label="Test details">
          <div>
            <strong>100</strong>
            <span>Questions</span>
          </div>
          <div>
            <strong>15 min</strong>
            <span>Time limit</span>
          </div>
          <div>
            <strong>+2 / −0.5</strong>
            <span>Marking</span>
          </div>
        </div>

        <button className="start-button" onClick={onStart}>
          Start Test <span aria-hidden="true">→</span>
        </button>
        <p className="start-note">
          Take your time. Review every answer after submission.
        </p>
      </section>
    </main>
  );
}

export default StartPage;
