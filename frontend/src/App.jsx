import StartPage from "./pages/StartPage";
import ResultsPage from "./pages/ResultsPage";
import TestPage from "./pages/TestPage";
import { useState } from "react";

function App() {
  const [started, setStarted] = useState(false);
  const [results, setResults] = useState(null);

  function startTest() {
    setStarted(true);
  }

  function exitResults() {
    setResults(null);
    setStarted(false);
  }

  if (!started) {
    return <StartPage onStart={startTest} />;
  }

  if (results) {
    return <ResultsPage {...results} onExit={exitResults} />;
  }

  return <TestPage onComplete={setResults} />;
}

export default App;
