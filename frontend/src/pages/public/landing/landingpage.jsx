import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Lnavbar from '../../../components/layout/Landing/Navbar';
import Lfooter from '../../../components/layout/Landing/Footer';
import './landingpage.css';

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.scrollTo) {
      const element = document.getElementById(location.state.scrollTo);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleLearnMore = () => {
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      <Lnavbar />

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">Your Campus Errands Made Simple</h1>
            <p className="hero-subtitle">
              Connect with trusted errand runners for quick, reliable service within your campus. 
              From document delivery to food pickup, we've got you covered.
            </p>
            <div className="hero-buttons">
              <button className="cta-primary" onClick={handleGetStarted}>Get Started</button>
              <button className="cta-secondary" onClick={handleLearnMore}>Learn More</button>
            </div>
          </div>
          <div className="hero-image">
            <div className="floating-card">
              <h3>Quick & Reliable</h3>
              <p>Campus errands in minutes</p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="benefits-section">
          <h2 className="section-title">Why Choose Errands Express?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Get your errands done in minutes, not hours. Our efficient runners ensure quick delivery every time.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🛡️</div>
              <h3>Reliable & Trusted</h3>
              <p>Count on verified errand runners who deliver with care and accuracy—your tasks are in safe hands.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h3>Affordable Rates</h3>
              <p>Student-friendly pricing that won't break the bank. Quality service at prices that make sense.</p>
    </div>
            <div className="benefit-card">
              <div className="benefit-icon">📱</div>
              <h3>Easy to Use</h3>
              <p>Simple, intuitive platform designed for busy students and faculty. Book errands in just a few taps.</p>
    </div>
    </div>
  </div>
</section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
        <div className="about-content">
            <div className="about-text">
              <h2 className="section-title">About Errands Express</h2>
              <p className="about-description">
                Errands Express was born from the everyday challenges of campus life. We understand how difficult 
                it can be to juggle classes, assignments, and daily tasks. Our platform connects students and faculty 
                with reliable errand runners who can handle everything from document delivery to food pickup.
              </p>
              <p className="about-description">
                Whether you're an instructor needing to deliver important documents or a student craving your 
                favorite meal but can't leave the library, Errands Express ensures convenience and time savings 
                for the entire campus community.
              </p>
              <div className="stats-grid">
                <div className="stat-item">
                  <h3>500+</h3>
                  <p>Happy Users</p>
                </div>
                <div className="stat-item">
                  <h3>1000+</h3>
                  <p>Completed Errands</p>
                </div>
                <div className="stat-item">
                  <h3>24/7</h3>
                  <p>Service Available</p>
                </div>
              </div>
            </div>
            <div className="about-image">
              <div className="image-placeholder">
                <div className="placeholder-icon">🎓</div>
                <p>Campus Community</p>
              </div>
            </div>
          </div>

          <div className="founders-section">
            <h2 className="section-title">Meet Our Founders</h2>
            <p className="founders-intro">
              Errands Express was founded by a group of students who understand firsthand the everyday 
              challenges of campus life and are committed to making it easier for everyone.
            </p>
            <div className="founders-grid">
              <div className="founder-card">
                <div className="founder-avatar">👨‍💼</div>
                <h4>Alex Johnson</h4>
                <p>Co-Founder & CEO</p>
                <p>Computer Science Student passionate about solving real-world problems through technology.</p>
              </div>
              <div className="founder-card">
                <div className="founder-avatar">👩‍💼</div>
                <h4>Sarah Chen</h4>
                <p>Co-Founder & CTO</p>
                <p>Engineering student with expertise in building scalable platforms for community needs.</p>
              </div>
              <div className="founder-card">
                <div className="founder-avatar">👨‍🎓</div>
                <h4>Mike Rodriguez</h4>
                <p>Co-Founder & COO</p>
                <p>Business student focused on creating efficient operations and amazing user experiences.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedbacks Section */}
      <section id="feedbacks" className="feedback-section">
        <div className="container">
          <h2 className="section-title">What Our Campus Says</h2>
          <p className="feedback-subtitle">Here's what our community is saying about Errands Express...</p>
          
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"Errands Express saved my semester! When I was stuck in the library during finals, 
                they brought me food and coffee. Absolute lifesaver!"</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">👩‍🎓</div>
                <div>
                  <h4>Emma Thompson</h4>
                  <p>Psychology Student</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"As a professor, I often need urgent document delivery. The runners are professional, 
                fast, and always reliable. Highly recommend!"</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">👨‍🏫</div>
                <div>
                  <h4>Dr. James Wilson</h4>
                  <p>Mathematics Professor</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"Super affordable and convenient! I use it weekly for groceries and food delivery. 
                The app is so easy to use too."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">👨‍🎓</div>
                <div>
                  <h4>David Park</h4>
                  <p>Engineering Student</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <h2 className="section-title">Get In Touch</h2>
          <p className="contact-subtitle">
            Have questions? Need support? We're always ready to connect and improve your campus experience.
          </p>
          
          <div className="contact-content-single">
            <div className="contact-info">
              <div className="contact-item">
                <div className="contact-icon">📧</div>
                <div>
                  <h4>Email Us</h4>
                  <p>support@errandsexpress.com</p>
                </div>
              </div>
              
              <div className="contact-item">
                <div className="contact-icon">📱</div>
                <div>
                  <h4>Call Us</h4>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>
              
              <div className="contact-item">
                <div className="contact-icon">🏫</div>
                <div>
                  <h4>Campus Office</h4>
                  <p>Student Center, Room 204<br/>Main Campus</p>
                </div>
              </div>
              
              <div className="contact-item">
                <div className="contact-icon">⏰</div>
                <div>
                  <h4>Support Hours</h4>
                  <p>Monday - Friday: 8AM - 10PM<br/>Weekend: 10AM - 8PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Lfooter />
    </div>
  );
}

export default LandingPage;
