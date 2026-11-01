import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import furnitureImage from "../assets/categories/furniture.webp";
import kitchenImage from "../assets/categories/kitchenware.webp";
import decorImage from "../assets/categories/home-decor.webp";
import outdoorImage from "../assets/categories/outdoor.webp";
import "../styles/home.css";

const departments = [
  {
    name: "Furniture",
    slug: "furniture",
    description: "Make room for slow mornings and long conversations.",
    image: furnitureImage,
    tone: "sage",
  },
  {
    name: "Kitchen & dining",
    slug: "kitchenware",
    description: "Little things that make every meal feel like home.",
    image: kitchenImage,
    tone: "clay",
  },
  {
    name: "Home decor",
    slug: "home-decor",
    description: "The finishing touches that feel unmistakably you.",
    image: decorImage,
    tone: "sand",
  },
  {
    name: "Outdoor & garden",
    slug: "outdoor",
    description: "A little more fresh air, right outside your door.",
    image: outdoorImage,
    tone: "olive",
  },
];

function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const storedUsername =
    localStorage.getItem("homexUsername") ??
    localStorage.getItem("homeXUsername") ??
    "";
  const displayName =
    storedUsername.trim() && storedUsername.trim().toLowerCase() !== "there"
      ? storedUsername.trim()
      : "friend";

  useEffect(() => {
    document.body.classList.add("home-page");
    return () => document.body.classList.remove("home-page");
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate("/products");
      return;
    }

    navigate(`/products?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="home">
      <Navbar />

      <main className="market-home">
        <section className="market-hero">
          <div className="market-hero-copy">
            <span className="home-eyebrow">
              A little closer to feeling at home
            </span>
            <h1>
              Good things
              <br />
              <em>belong here.</em>
            </h1>
            <p>
              Thoughtful finds for the home you’re making—plus helpful local
              places, all in one welcoming corner.
            </p>

            <form className="market-search" onSubmit={handleSearch} role="search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.2 4.2" />
              </svg>
              <label className="visually-hidden" htmlFor="market-search">
                Search home products and departments
              </label>
              <input
                id="market-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="What are you looking for?"
              />
              <button type="submit">Search</button>
            </form>

            <div className="market-search-hints">
              <span>Try:</span>
              {["sofa", "lighting", "garden"].map((term) => (
                <button
                  type="button"
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    navigate(`/products?q=${encodeURIComponent(term)}`);
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div className="market-hero-art">
            <img src={furnitureImage} alt="Warm, inviting living room furniture" />
            <div className="hero-note">
              <span className="hero-note-icon" aria-hidden="true">
                ✳
              </span>
              <span>
                <strong>Make yourself at home</strong>
                <small>Find something that feels like you.</small>
              </span>
            </div>
            <span className="hero-art-caption">A softer kind of shopping</span>
          </div>
        </section>

        <section className="home-section department-section">
          <div className="home-section-heading">
            <div>
              <span className="home-eyebrow">Find your kind of lovely</span>
              <h2>Shop by the way you live</h2>
            </div>
            <Link to="/products" className="text-link">
              Explore all departments <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="home-department-grid">
            {departments.map((department, index) => (
              <Link
                className={`home-department-card tone-${department.tone}`}
                key={department.slug}
                to={`/products/${department.slug}`}
              >
                <div className="home-department-image">
                  <img src={department.image} alt="" loading="lazy" />
                  <span className="department-number">0{index + 1}</span>
                </div>
                <div className="home-department-copy">
                  <h3>{department.name}</h3>
                  <p>{department.description}</p>
                  <span className="department-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="nearby-feature">
          <div className="nearby-feature-copy">
            <span className="home-eyebrow">Good things grow locally</span>
            <h2>Meet the places around you.</h2>
            <p>
              Find home stores and useful services nearby. Check available
              details, get directions, and make your next errand a little easier.
            </p>
            <div className="nearby-feature-actions">
              <Link to="/services" className="home-primary-link">
                Explore services &amp; places <span aria-hidden="true">→</span>
              </Link>
              <Link to="/map" className="home-local-link">
                Find nearby stores
              </Link>
              <Link to="/marketplace" className="home-local-link">
                Browse pre-loved finds
              </Link>
            </div>
          </div>
          <div className="nearby-feature-art" aria-hidden="true">
            <div className="nearby-orbit orbit-one" />
            <div className="nearby-orbit orbit-two" />
            <div className="nearby-pin pin-one">⌂</div>
            <div className="nearby-pin pin-two">✿</div>
            <div className="nearby-pin pin-three">⌖</div>
            <div className="nearby-center">
              <span>Home</span>
              <strong>is closer</strong>
            </div>
          </div>
        </section>

        <section className="home-closing">
          <span className="home-closing-mark" aria-hidden="true">
            ✳
          </span>
          <div>
            <span className="home-eyebrow">Welcome in, {displayName}</span>
            <h2>Every home story starts somewhere.</h2>
          </div>
          <Link to="/products" className="home-secondary-link">
            Find your first piece <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
