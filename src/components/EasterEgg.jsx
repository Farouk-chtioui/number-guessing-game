import { useState, useEffect } from 'react';

function EasterEgg() {
  const [answer, setAnswer] = useState(null);

  // Dummy emoji animation effect
  useEffect(() => {
    // ...you may add emoji flying animations...
  }, []);

  const handleAnswer = (res) => {
    setAnswer(res === 'yes' ? 'yaaay' : 'no to no');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      color: 'white',
      zIndex: 9999
    }}>
      {/* Floating love emojis can be animated with CSS or JS */}
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        ❤️ 💕 😍 💖
      </div>
      
      <div style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
        Will you be my valontine?
      </div>
      <div>
        <button onClick={() => handleAnswer('yes')} style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}>Yes</button>
        <button onClick={() => handleAnswer('no')} style={{ padding: '0.5rem 1rem' }}>No</button>
      </div>
      
      {answer !== null && (
        <div style={{ fontSize: '2rem', marginTop: '1rem' }}>
          {answer}
        </div>
      )}
    </div>
  );
}

export default EasterEgg;
