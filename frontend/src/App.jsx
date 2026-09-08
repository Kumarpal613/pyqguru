import { useState } from "react";
import ExamPapersPage from "./pages/ExamPapersPage";
import ResultsPage from "./pages/ResultsPage";
import StartPage from "./pages/StartPage";
import TestPage from "./pages/TestPage";

function App() {
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [results, setResults] = useState(null);

  function exitResults() {
    setResults(null);
    setSelectedTest(null);
    setSelectedExam(null);
  }

  if (results) return <ResultsPage {...results} onExit={exitResults} />;
  if (selectedTest) return <TestPage selectedTest={selectedTest} onComplete={setResults} />;
  if (selectedExam) {
    return (
      <ExamPapersPage
        exam={selectedExam}
        onBack={() => setSelectedExam(null)}
        onStart={setSelectedTest}
      />
    );
  }
  return <StartPage onSelectExam={setSelectedExam} />;
}

export default App;
