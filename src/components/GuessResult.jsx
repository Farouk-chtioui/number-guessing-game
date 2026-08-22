function GuessResult({ result }) {
  const match = String(result || '').match(/(\d+)\s*T\s+(\d+)\s*V/i);

  if (!match) {
    return <span className="guess-result-raw">{result}</span>;
  }

  return (
    <span className="result-pills">
      <span className="pill pill-t" title="Correct digit in the correct place">
        {match[1]}T
      </span>
      <span className="pill pill-v" title="Correct digit in the wrong place">
        {match[2]}V
      </span>
    </span>
  );
}

export default GuessResult;
