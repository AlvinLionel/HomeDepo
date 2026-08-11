import React from "react";
import Footer from "../components/footer";

function Home() {
  const username = localStorage.getItem("firstName") || "User";

  return (
    <div className="home">
      <header>
        <h3>Welcome, {username}!</h3>
        <p className="motto">Turn your house into a home</p>
      </header>

      <main>
        <section id="services">
          <div className="service-card">
            <h2>Map</h2>
            <p>Find shops and services near you.</p>
            <a href="/map">Go to Map</a>
          </div>

          <div className="service-card">
            <h2>Discovery Catalog</h2>
            <p>Browse through random products and services.</p>
            <a href="/discover">Discover</a>
          </div>

          <div className="service-card">
            <h2>Products Catalog</h2>
            <p>Explore our full product catalog.</p>
            <a href="/products">View Products</a>
          </div>

          <div className="service-card">
            <h2>Cart</h2>
            <p>View and manage your saved products.</p>
            <a href="/cart">Go to Cart</a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
