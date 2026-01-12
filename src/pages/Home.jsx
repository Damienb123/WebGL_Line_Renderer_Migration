// stores the home page component
// provides a welcome message and a button to navigate to the canvas page
import { useNavigate } from 'react-router-dom';
// import styles
import '../App.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="Intro-container">
      <h2>Welcome to Trace</h2>
      <p>
        An interactive WebGL canvas for real-time line rendering. Click below to begin.
      </p>
      <button
        className="entry-btn"
        onClick={() => navigate('/Canvas')}
      >
        Get Started
      </button>
    </div>
  );
}