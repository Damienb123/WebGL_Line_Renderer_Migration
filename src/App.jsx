import { Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home'; // import the Home component
import Canvas from './pages/Canvas'; // import the Canvas component

function App() {
  return (
    // define routes for the application
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/Canvas" element={<Canvas />} />
    </Routes>
  );
}

export default App;
