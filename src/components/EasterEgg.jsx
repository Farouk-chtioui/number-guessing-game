import { useState, useEffect } from 'react';
import './EasterEgg.css';

function EasterEgg() {
  const [answer, setAnswer] = useState(null);
  const [showHearts, setShowHearts] = useState(false);

  useEffect(() => {
    // Create floating hearts
    const createHeart = () => {
      const heart = document.createElement('div');
      heart.className = 'floating-heart';
      heart.innerHTML = ['❤️', '💖', '💕', '💝', '💗'][Math.floor(Math.random() * 5)];
      heart.style.left = Math.random() * 100 + 'vw';
      heart.style.animationDuration = Math.random() * 3 + 2 + 's';
      document.body.appendChild(heart);
      
      setTimeout(() => heart.remove(), 5000);
    };

    if (showHearts) {
      const interval = setInterval(createHeart, 300);
      return () => clearInterval(interval);
    }
  }, [showHearts]);

  const handleAnswer = (res) => {
    setAnswer(res === 'yes' ? 'I LOVE YOU! ❤️' : 'Are you sure Baby girl? 😏🔫');
    if (res === 'yes') setShowHearts(true);
  };

  return (
    <div className="easter-egg-container">
      <div className="content-wrapper">
        <div className="title-text">
          My Dearest...
        </div>
        
        <div className="question-text">
          Will you be my Valentine?
        </div>
        
        <div className="buttons">
          <button 
            className="yes-btn"
            onClick={() => handleAnswer('yes')}>
            Yes, I will! ❤️
          </button>
          <button 
            className="no-btn"
            onClick={() => handleAnswer('no')}>
            No...
          </button>
        </div>
        
        {answer && (
          <div className="answer-text">
            {answer}
          </div>
        )}
      </div>
    </div>
  );
}

export default EasterEgg;
