import { useEffect } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import roomImage from "../assets/categories/home-decor.webp";
import furnitureImage from "../assets/categories/furniture.webp";
import outdoorImage from "../assets/categories/outdoor.webp";
import "../styles/welcome.css";

const waysToFeelAtHome = [
  {
    number: "01",
    eyebrow: "For everyday living",
    title: "Make room for good things.",
    description: "Explore home essentials from neighborhood stores and discover a few thoughtful finds for your space.",
    image: roomImage,
    alt: "Warm home decor arranged in a calm living space",
    link: "/products",
    linkLabel: "Shop home essentials",
  },
  {
    number: "02",
    eyebrow: "For a second story",
    title: "Pass a good find along.",
    description: "Buy and sell pre-loved home pieces nearby, using one everyday HomeX account.",
    image: furnitureImage,
    alt: "Comfortable furniture ready for a new home",
    link: "/marketplace",
    linkLabel: "Browse the neighborhood",
  },
  {
    number: "03",
    eyebrow: "For your next idea",
    title: "See what’s catching on.",
    description: "Find local product trends, browse fresh inspiration, and follow the feeling of home.",
    image: outdoorImage,
    alt: "A welcoming outdoor space at home",
    link: "/discover",
    linkLabel: "Find a little inspiration",
  },
];

function Welcome() {
  useEffect(() => {
    document.body.classList.add("welcome-page-body");
    return () => document.body.classList.remove("welcome-page-body");
  }, []);

  return (
    <div className="welcome-page">
      <Navbar />
      <main>
        <section className="welcome-hero">
          <div className="welcome-hero-copy">
            <span className="welcome-eyebrow">A little more home, every day</span>
            <h1>Find your way <em>home.</em></h1>
            <p>
              Shop the things that make a space yours, find pre-loved pieces
              nearby, and discover the good happening around your neighborhood.
            </p>
            <div className="welcome-actions">
              <Link className="welcome-primary-link" to="/products">
                Explore HomeX <span aria-hidden="true">→</span>
              </Link>
              <Link className="welcome-secondary-link" to="/marketplace">
                Browse pre-loved finds
              </Link>
            </div>
            <div className="welcome-note">
              <span aria-hidden="true">✳</span>
              <span>Good things, shared close to home.</span>
            </div>
          </div>
          <div className="welcome-hero-art">
            <img className="welcome-room-image" src={roomImage} alt="A warm, lived-in home with thoughtful decor" />
            <div className="welcome-art-note">
              <span className="welcome-art-mark" aria-hidden="true">⌂</span>
              <div>
                <strong>Make yourself at home.</strong>
                <span>Shop · Share · Discover</span>
              </div>
            </div>
            <span className="welcome-art-flower" aria-hidden="true">✳</span>
          </div>
        </section>

        <section className="welcome-ways" aria-labelledby="welcome-ways-title">
          <div className="welcome-section-heading">
            <div>
              <span className="welcome-eyebrow">Room for all the ways we live</span>
              <h2 id="welcome-ways-title">A neighborhood marketplace, with a little more heart.</h2>
            </div>
            <p>Start with what you need today. There’s always another corner to explore.</p>
          </div>
          <div className="welcome-way-grid">
            {waysToFeelAtHome.map((way) => (
              <article className="welcome-way-card" key={way.number}>
                <Link to={way.link} className="welcome-way-image">
                  <img src={way.image} alt={way.alt} loading="lazy" />
                  <span>{way.number}</span>
                </Link>
                <div className="welcome-way-copy">
                  <span className="welcome-way-eyebrow">{way.eyebrow}</span>
                  <h3>{way.title}</h3>
                  <p>{way.description}</p>
                  <Link to={way.link}>{way.linkLabel} <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="welcome-community">
          <div>
            <span className="welcome-eyebrow">Come as you are</span>
            <h2>One account. Plenty of ways to make it home.</h2>
            <p>Shop for your space, share a find when you’re ready, or just see what’s around.</p>
          </div>
          <Link className="welcome-primary-link" to="/auth?mode=signup">
            Find your place here <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Welcome;
