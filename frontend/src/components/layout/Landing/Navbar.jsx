import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/ErrandsLogo.png';
import '../layout.css';

function Lnavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    navigate('/', { state: { scrollTo: sectionId } });
    setMenuOpen(false);
  };

  const handleGetStarted = () => {
    navigate('/auth');
    setMenuOpen(false);
  };

  return (
    <header className="landing-header">
      <div className="landing-logo-container">
        <img src={logo} alt="Errands Express Logo" className="landing-header-logo" />
        <h1 className="landing-logo-text">ERRANDS EXPRESS</h1>
      </div>

      <nav className={`landing-nav ${menuOpen ? 'open' : ''}`}>
        <ul className="landing-nav-links">
          <li><button onClick={() => scrollToSection('home')}>Home</button></li>
          <li><button onClick={() => scrollToSection('about')}>About Us</button></li>
          <li><button onClick={() => scrollToSection('feedbacks')}>Feedbacks</button></li>
          <li><button onClick={() => scrollToSection('contact')}>Contact Us</button></li>
          <li><button className="landing-nav-cta" onClick={handleGetStarted}>Get Started</button></li>
        </ul>
      </nav>

      <div className="landing-menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
        <div className="landing-bar"></div>
        <div className="landing-bar"></div>
        <div className="landing-bar"></div>
      </div>
    </header>
  );
}

export default Lnavbar;