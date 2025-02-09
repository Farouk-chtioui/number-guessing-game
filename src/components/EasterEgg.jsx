import { useState, useEffect } from 'react';
import './EasterEgg.css';

function EasterEgg() {
  const [answer, setAnswer] = useState(null);
  const [showHearts, setShowHearts] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

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

  const createFirework = () => {
    const firework = document.createElement('div');
    firework.className = 'firework';
    firework.style.left = Math.random() * 100 + 'vw';
    firework.style.animationDuration = Math.random() * 1 + 0.5 + 's';
    document.body.appendChild(firework);
    setTimeout(() => firework.remove(), 1000);
  };

  const createRosePetal = () => {
    const petal = document.createElement('div');
    petal.className = 'rose-petal';
    petal.innerHTML = '🌸';
    petal.style.left = Math.random() * 100 + 'vw';
    petal.style.animationDuration = Math.random() * 3 + 2 + 's';
    document.body.appendChild(petal);
    setTimeout(() => petal.remove(), 5000);
  };

  const handleAnswer = (res) => {
    if (res === 'yes') {
      setAnswer('I LOVE YOU! ❤️');
      setShowHearts(true);
      setShowFireworks(true);
      // Start fireworks and rose petals
      setInterval(createFirework, 300);
      setInterval(createRosePetal, 400);
    } else {
      setAnswer('Are you sure Baby girl? 😏🔫');
    }
  };

  return (
    <div className={`easter-egg-container ${answer === 'I LOVE YOU! ❤️' ? 'success' : ''}`}>
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
