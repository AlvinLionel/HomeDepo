import React, { useEffect, useState } from "react";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import "../styles/home.css";

function Home() {
  const rawUsername = localStorage.getItem("homexUsername")?.trim();
  const displayName = rawUsername && rawUsername.toLowerCase() !== "there" ? rawUsername : "friend";
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    document.body.classList.add("home-page");

    const timer = window.setTimeout(() => {
      setShowWelcome(false);
    }, 900);

    return () => {
      document.body.classList.remove("home-page");
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="home">
      <Navbar /* cartItemCount={0} */ />   {/* Comment out the item count after implimentation */}
      <div className={`welcome-hero ${showWelcome ? "intro" : "settled"}`}>
        <span className="welcome-label">At a glance</span>
        <h1>{showWelcome ? `Welcome home, ${displayName}` : `Welcome back, ${displayName}`}</h1>
        <p>Keep the essentials close and make your home feel easy to live in.</p>
      </div>

      <main className={`home-content ${showWelcome ? "loading" : "ready"}`}>
        <section className="home-summary">
          <h2>Home essentials, all in one place.</h2>
          <p>Find nearby services, browse what’s new, and keep the things you need within reach.</p>
        </section>

        <section id="services">
          <div className="card">
            <div className="card-icon">🗺️</div>
            <h2>Map</h2>
            <p>Find stores and services near you with real-time availability.</p>
            <a href="/map" className="card-link">Go to Map</a>
          </div>

          <div className="card">
            <div className="card-icon">✨</div>
            <h2>Discover</h2>
            <p>Browse curated finds and trending products tailored to your needs.</p>
            <a href="/discover" className="card-link">Explore</a>
          </div>

          <div className="card">
            <div className="card-icon">📦</div>
            <h2>Products</h2>
            <p>Access our complete catalog of home essentials and tools.</p>
            <a href="/products" className="card-link">Shop Now</a>
          </div>

          <div className="card">
            <div className="card-icon">🛒</div>
            <h2>Cart</h2>
            <p>Review and manage all your saved and active items.</p>
            <a href="/cart" className="card-link">View Cart</a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
