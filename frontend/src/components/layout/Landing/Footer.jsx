import '../layout.css';

function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-content">
        <div className="landing-footer-section">
          <div className="landing-footer-logo">
            <h3>ERRANDS EXPRESS</h3>
            <p>Making campus life easier, one errand at a time.</p>
          </div>
          <div className="landing-social-links">
            <a href="#" aria-label="Facebook">📘</a>
            <a href="#" aria-label="Twitter">🐦</a>
            <a href="#" aria-label="Instagram">📷</a>
            <a href="#" aria-label="LinkedIn">💼</a>
          </div>
        </div>

        <div className="landing-footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About Us</a></li>
            <li><a href="#feedbacks">Testimonials</a></li>
            <li><a href="#contact">Contact</a></li>
            <li><a href="/auth">Sign Up</a></li>
          </ul>
        </div>

        <div className="landing-footer-section">
          <h4>Services</h4>
          <ul>
            <li><a href="#">Food Delivery</a></li>
            <li><a href="#">Document Service</a></li>
            <li><a href="#">Shopping Assistance</a></li>
            <li><a href="#">Campus Tours</a></li>
            <li><a href="#">Emergency Errands</a></li>
          </ul>
        </div>

      </div>

      <div className="landing-footer-bottom">
        <div className="landing-footer-bottom-content">
          <p>&copy; 2025 Errands Express. All rights reserved.</p>
          <div className="landing-footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;