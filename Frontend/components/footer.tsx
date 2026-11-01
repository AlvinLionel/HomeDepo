import { Link } from "react-router-dom";
import "../styles/footer.css";

function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="site-footer">
          <div className="site-footer-main">
            <div className="site-footer-brand">
              <Link to="/" className="site-footer-logo"><span aria-hidden="true">⌂</span> HomeX</Link>
              <p>A more thoughtful way to shop home, discover nearby, and pass good things along.</p>
              <span className="site-footer-signoff">Good things, shared close to home.</span>
            </div>
            <nav className="site-footer-links" aria-label="Explore HomeX">
              <h2>Explore</h2>
              <Link to="/products">Shop home</Link>
              <Link to="/discover">Discover</Link>
              <Link to="/map">Find nearby stores</Link>
            </nav>
            <nav className="site-footer-links" aria-label="HomeX community">
              <h2>Community</h2>
              <Link to="/marketplace">Pre-loved marketplace</Link>
              <Link to="/marketplace?mode=sell">Share a find</Link>
              <Link to="/merchant">For local stores</Link>
              <Link to="/contact">Help &amp; contact</Link>
            </nav>
            <div className="site-footer-note">
              <h2>Make yourself at home.</h2>
              <p>Shop for your space. Find a second life for good things. Explore at your own pace.</p>
              <Link to="/auth?mode=signup">Join the neighborhood <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="site-footer-bottom">
            <span>© HomeX {year}. All rights reserved.</span>
            <Link to="/">A neighborhood marketplace for home.</Link>
          </div>
        </footer>
    )
}

export default Footer;