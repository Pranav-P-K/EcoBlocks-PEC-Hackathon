import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import earthImage from '../assets/earth.png';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleTryDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/dashboard', { replace: true });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Create stars
    const stars: { x: number; y: number; size: number; speed: number }[] = [];
    const starCount = Math.floor((window.innerWidth * window.innerHeight) / 1500);

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5,
        speed: Math.random() * 0.5 + 0.1
      });
    }

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 25, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Move stars
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="landing-container">
      <canvas ref={canvasRef} className="space-bg" />
      <div className="content-wrapper">
        <div className="header-content">
          <h1 className="main-heading">Build Cleaner Cities Before Pollution Builds Up</h1>
          <p className="subtitle">
            ATHER is a digital twin platform that maps, predicts, and reduces urban CO₂ emissions 
            using AI-driven simulations, health impact analysis, and citizen participation.
          </p>
          <button className="demo-button" onClick={handleTryDemo}>
            Try Demo
          </button>
        </div>
        <div className="earth-container">
          <img src={earthImage} alt="Earth" className="earth-image" />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
