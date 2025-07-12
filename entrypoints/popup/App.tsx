import './App.css';
import logo from '../../assets/logo.png';

function App() {
  return (
    <div className="app-container">
      <img src={logo} alt="Cursor Logo" className="app-logo" />
      <h1 className="app-heading">Your Activity Charts</h1>
      <p className="app-desc">View your detailed usage and activity analytics on the Cursor dashboard.</p>
      <a
        href="https://cursor.com/dashboard?tab=usage"
        target="_blank"
        rel="noopener noreferrer"
        className="app-cta"
      >
        Open Cursor Usage Page
      </a>
    </div>
  );
}

export default App;
