import { useState } from "react";

function ResultsPage({ submission, onExit }) {
  const [collapsedSections, setCollapsedSections] = useState({});

  const results = submission.results || [];
  const totalScore = submission.score || 0;

  const answered = results.filter(
    (result) => result.selected_option !== null,
  ).length;
  const correct = results.filter(
    (result) => result.result === "correct",
  ).length;
  const wrong = results.filter((result) => result.result === "wrong").length;
  const missed = results.filter((result) => result.result === "missed").length;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;

  // Calculate section stats (grouping by question number ranges or section if available)
  // Assuming 25 questions per section as typical SSC pattern
  const questionsPerSection = 25;
  const sectionStats = {};

  results.forEach((result) => {
    const sectionNum = Math.ceil(result.question_number / questionsPerSection);
    const sectionName = `Section ${sectionNum}`;

    if (!sectionStats[sectionName]) {
      sectionStats[sectionName] = {
        questions: [],
        score: 0,
        correct: 0,
        wrong: 0,
        missed: 0,
      };
    }

    sectionStats[sectionName].questions.push(result);

    if (result.result === "correct") {
      sectionStats[sectionName].score += 2;
      sectionStats[sectionName].correct += 1;
    } else if (result.result === "wrong") {
      sectionStats[sectionName].score -= 0.5;
      sectionStats[sectionName].wrong += 1;
    } else if (result.result === "missed") {
      sectionStats[sectionName].missed += 1;
    }
  });

  const toggleSection = (sectionName) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };
  return (
    <main className="results-page">
      <header className="results-header">
        <div>
          <p className="results-kicker">SSC CGL PYQ TEST</p>
          <h1>Test Results</h1>
          <p>Your complete answer analysis is ready.</p>
        </div>
        <button className="results-exit-button" onClick={onExit}>
          <span aria-hidden="true">←</span> Exit to home
        </button>
      </header>

      <section className="results-summary" aria-label="Test summary">
        <div className="score-card">
          <span>Final Score</span>
          <strong>{totalScore}</strong>
          <small>marks</small>
        </div>
        <div className="result-stat">
          <span>Accuracy</span>
          <strong>{accuracy}%</strong>
        </div>
        <div className="result-stat correct-stat">
          <span>Correct</span>
          <strong>{correct}</strong>
        </div>
        <div className="result-stat wrong-stat">
          <span>Wrong</span>
          <strong>{wrong}</strong>
        </div>
        <div className="result-stat muted-stat">
          <span>Missed</span>
          <strong>{missed}</strong>
        </div>
      </section>

      <section className="results-grid">
        <div className="analysis-panel">
          <div className="panel-heading">
            <div>
              <p className="results-kicker">PERFORMANCE MAP</p>
              <h2>Question analysis</h2>
            </div>
            <span>
              {answered} / {results.length} attempted
            </span>
          </div>

          <div className="answer-map">
            {results.map((result, index) => (
              <div
                className={`answer-map-cell ${result.result}`}
                title={`Question ${result.question_number}: ${result.result}`}
                key={result.question_number}
              >
                {index + 1}
              </div>
            ))}
          </div>

          <div className="map-legend">
            <span>
              <i className="legend-dot correct" /> Correct
            </span>
            <span>
              <i className="legend-dot wrong" /> Wrong
            </span>
            <span>
              <i className="legend-dot missed" /> Missed
            </span>
          </div>
        </div>

        <div className="analysis-panel section-analysis">
          <div className="panel-heading">
            <div>
              <p className="results-kicker">BREAKDOWN</p>
              <h2>Section performance</h2>
            </div>
          </div>
          {Object.entries(sectionStats).map(([section, stats]) => (
            <div className="section-row" key={section}>
              <div className="section-row-title">
                <strong>{section}</strong>
                <span>
                  Score: {stats.score.toFixed(1)} ({stats.correct} correct,{" "}
                  {stats.wrong} wrong, {stats.missed} missed)
                </span>
              </div>
              <div className="section-progress">
                <span
                  style={{
                    width: `${(stats.correct / stats.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="review-panel">
        <div className="panel-heading">
          <div>
            <p className="results-kicker">ANSWER REVIEW</p>
            <h2>Detailed solutions</h2>
          </div>
        </div>
        <div className="review-list">
          {Object.entries(sectionStats).map(([section, stats]) => (
            <div key={section} className="section-review-group">
              <div
                className="section-header"
                onClick={() => toggleSection(section)}
              >
                <div className="section-header-left">
                  <span className="section-chevron">
                    {collapsedSections[section] ? "▶" : "▼"}
                  </span>
                  <h3 className="section-title">{section}</h3>
                </div>
                <div className="section-stats">
                  <span className="stat correct">Correct: {stats.correct}</span>
                  <span className="stat wrong">Wrong: {stats.wrong}</span>
                  <span className="stat missed">Missed: {stats.missed}</span>
                  <span className="stat score">
                    Score: {stats.score.toFixed(1)}
                  </span>
                </div>
              </div>

              {!collapsedSections[section] && (
                <div className="questions-container">
                  {stats.questions.map((result) => (
                    <div
                      className={`question-item ${result.result}`}
                      key={result.question_number}
                    >
                      <div className="q-number-status">
                        <span className="q-num">Q{result.question_number}</span>
                        <span className={`status-badge`}>
                          {result.result === "missed"
                            ? "NOT ANSWERED"
                            : result.result.toUpperCase()}
                        </span>
                      </div>

                      <h4 className="q-text">{result.question}</h4>

                      <div className="options-display">
                        <label>Options</label>
                        <div className="options-vertical">
                          {Object.entries(result.options).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className={`opt-row ${
                                  result.selected_option === key
                                    ? "selected"
                                    : ""
                                } ${result.correct_option === key ? "correct" : ""}`}
                              >
                                <span className="opt-key">{key}.</span>
                                <span className="opt-val">{value}</span>
                              </div>
                            ),
                          )}
                        </div>
                        <div className="answer-summary">
                          <span className="your-opt">
                            Your option:{" "}
                            <strong>{result.selected_option || "—"}</strong>
                          </span>
                          <span className="correct-opt">
                            Correct option:{" "}
                            <strong>{result.correct_option}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="section-bottom">
                <strong>Section Score: {stats.score.toFixed(1)}</strong>
                <span>
                  +{stats.correct * 2} –{" "}
                  {stats.wrong > 0 ? (stats.wrong * 0.5).toFixed(1) : "0"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ResultsPage;
