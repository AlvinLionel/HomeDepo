import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import decorImage from "../assets/categories/home-decor.webp";
import furnitureImage from "../assets/categories/furniture.webp";
import kitchenImage from "../assets/categories/kitchenware.webp";
import { getTrendArea, saveTrendArea } from "./trends";
import "../styles/discover.css";

interface Product {
  id: number;
  name: string;
  description: string;
  brand: string;
  unit: string;
  imageUrl: string;
  startingPrice: number;
  storeCount: number;
}

interface TrendingProduct extends Product {
  shopperCount: number;
  searcherCount: number;
  viewerCount: number;
}

type TrendScope = "local" | "homex";

const featuredDepartments = [
  { slug: "furniture", label: "Furniture", image: furnitureImage },
  { slug: "home-decor", label: "Home decor", image: decorImage },
  { slug: "kitchenware", label: "Kitchen & dining", image: kitchenImage },
];

function Discover() {
  const token = localStorage.getItem("homexToken");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendArea, setTrendArea] = useState(() => {
    try {
      return getTrendArea();
    } catch (storageError) {
      console.error("Unable to read the saved trend area:", storageError);
      return "";
    }
  });
  const [areaInput, setAreaInput] = useState(trendArea);
  const [trendScope, setTrendScope] = useState<TrendScope>("local");
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [isTrendsLoading, setIsTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState("");
  const [areaError, setAreaError] = useState("");

  useEffect(() => {
    let isActive = true;
    document.body.classList.add("discover-page-body");

    const loadFeaturedProducts = async () => {
      try {
        const responses = await Promise.all(
          featuredDepartments.map(({ slug }) =>
            fetch(`/api/products/department/${slug}`),
          ),
        );
        const failedResponse = responses.find((response) => !response.ok);
        if (failedResponse) {
          throw new Error("Featured products could not be loaded.");
        }

        const departmentResults = await Promise.all(
          responses.map(
            (response) =>
              response.json() as Promise<{ products: Product[] }>,
          ),
        );

        if (isActive) {
          setProducts(departmentResults.flatMap(({ products: items }) => items).slice(0, 6));
        }
      } catch {
        if (isActive) {
          setError("We couldn’t load featured finds just now. Please try again later.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadFeaturedProducts();
    return () => {
      isActive = false;
      document.body.classList.remove("discover-page-body");
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let isActive = true;
    const loadPreferredArea = async () => {
      try {
        const response = await fetch("/api/account/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load your preferred area.");
        if (isActive && data.preferredArea) {
          setTrendArea(data.preferredArea);
          setAreaInput(data.preferredArea);
          try {
            saveTrendArea(data.preferredArea);
          } catch (storageError) {
            console.error("Unable to cache the preferred trend area:", storageError);
          }
        }
      } catch (settingsError) {
        console.error("Unable to load your preferred discovery area:", settingsError);
      }
    };
    void loadPreferredArea();
    return () => { isActive = false; };
  }, [token]);

  useEffect(() => {
    let isActive = true;

    if (trendScope === "local" && !trendArea) {
      setTrendingProducts([]);
      setIsTrendsLoading(false);
      setTrendsError("");
      return () => {
        isActive = false;
      };
    }

    const loadTrendingProducts = async () => {
      setIsTrendsLoading(true);
      setTrendsError("");

      try {
        const params = new URLSearchParams();
        if (trendScope === "local") params.set("area", trendArea);
        const response = await fetch(`/api/trends/products?${params}`);
        if (!response.ok) throw new Error("Trending products could not be loaded.");

        const data = (await response.json()) as { products: TrendingProduct[] };
        if (isActive) setTrendingProducts(data.products);
      } catch (trendError) {
        if (isActive) {
          setTrendsError("We couldn’t load recent trends just now. Please try again later.");
          console.error("Unable to load trending products:", trendError);
        }
      } finally {
        if (isActive) setIsTrendsLoading(false);
      }
    };

    void loadTrendingProducts();
    return () => {
      isActive = false;
    };
  }, [trendArea, trendScope]);

  const handleAreaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedArea = areaInput.trim().replace(/\s+/g, " ");
    if (!normalizedArea) {
      setAreaError("Enter a neighborhood or general area to see nearby trends.");
      return;
    }

    try {
      saveTrendArea(normalizedArea);
      setTrendArea(normalizedArea);
      setTrendScope("local");
      setAreaInput(normalizedArea);
      setAreaError("");
    } catch (storageError) {
      console.error("Unable to save the trend area:", storageError);
      setAreaError("We couldn’t save that area in this browser. Check your browser storage settings.");
    }
  };

  return (
    <div className="discover-page">
      <Navbar />

      <main className="discover-main">
        <section className="discover-hero">
          <div className="discover-hero-copy">
            <span className="discover-eyebrow">A home is always becoming</span>
            <h1>
              Find the things
              <br />
              <em>that feel like you.</em>
            </h1>
            <p>
              Start with a room, a feeling, or one small thing you’ve been
              looking for. There’s always a good place to begin.
            </p>
            <Link to="/products" className="discover-button">
              Browse all departments <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="discover-hero-image">
            <img src={decorImage} alt="Warm home decor and thoughtful details" />
            <span className="discover-image-note">A space that feels like yours</span>
          </div>
        </section>

        <section className="discover-collections">
          <div className="discover-section-heading">
            <div>
              <span className="discover-eyebrow">A good place to start</span>
              <h2>Explore a few favorites</h2>
            </div>
            <Link to="/products" className="discover-text-link">
              See every department <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="discover-collection-grid">
            {featuredDepartments.map((department, index) => (
              <Link
                to={`/products/${department.slug}`}
                className="discover-collection"
                key={department.slug}
              >
                <img src={department.image} alt="" loading="lazy" />
                <span className="discover-collection-index">0{index + 1}</span>
                <span className="discover-collection-label">
                  {department.label}
                  <span aria-hidden="true">↗</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="discover-trends" aria-labelledby="discover-trends-title">
          <div className="discover-section-heading">
            <div>
              <span className="discover-eyebrow">Good finds are worth sharing</span>
              <h2 id="discover-trends-title">
                What’s catching on{trendScope === "homex"
                  ? " at HomeX"
                  : trendArea
                    ? ` in ${trendArea}`
                    : " around you"}
              </h2>
            </div>
            <p>Recent product searches and views, paired with items currently in stock.</p>
          </div>

          <div className="discover-trend-controls">
            <div className="discover-trend-tabs" role="group" aria-label="Choose trend area">
              <button
                type="button"
                aria-pressed={trendScope === "local"}
                className={trendScope === "local" ? "is-active" : ""}
                onClick={() => setTrendScope("local")}
              >
                Around my area
              </button>
              <button
                type="button"
                aria-pressed={trendScope === "homex"}
                className={trendScope === "homex" ? "is-active" : ""}
                onClick={() => setTrendScope("homex")}
              >
                Across HomeX
              </button>
            </div>

            {trendScope === "local" && (
              <form className="discover-trend-location" onSubmit={handleAreaSubmit}>
                <label htmlFor="trend-area">Your neighborhood or area</label>
                <div>
                  <input
                    id="trend-area"
                    value={areaInput}
                    maxLength={100}
                    onChange={(event) => setAreaInput(event.target.value)}
                    placeholder="e.g. Kilimani, Nairobi"
                  />
                  <button type="submit">Show local trends</button>
                </div>
              </form>
            )}
          </div>

          {areaError && <p className="discover-trend-message discover-error" role="alert">{areaError}</p>}
          <p className="discover-trend-privacy">
            Searches and product views may contribute to anonymous trend counts, deduplicated by browser and day. Local trends use only the general area you enter—HomeX does not collect precise location for this feature.
          </p>

          {isTrendsLoading ? (
            <p className="discover-status" role="status">Looking for recent product trends…</p>
          ) : trendsError ? (
            <p className="discover-status discover-error" role="alert">{trendsError}</p>
          ) : trendScope === "local" && !trendArea ? (
            <p className="discover-status">
              Add your neighborhood to see products people have recently searched for or viewed nearby.
            </p>
          ) : trendingProducts.length > 0 ? (
            <div className="discover-product-grid">
              {trendingProducts.map((product) => (
                <Link
                  className="discover-product-card"
                  key={product.id}
                  to={`/product/${product.id}`}
                >
                  <div className="discover-product-image">
                    <img
                      src={product.imageUrl || decorImage}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = decorImage;
                      }}
                    />
                  </div>
                  <div className="discover-product-copy">
                    <span>{product.brand}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="discover-product-meta">
                      <strong>KSh {product.startingPrice.toLocaleString()}</strong>
                      <span>
                        {product.storeCount}{" "}
                        {trendScope === "local"
                          ? product.storeCount === 1 ? "local store" : "local stores"
                          : product.storeCount === 1 ? "store carries it" : "stores carry it"}
                      </span>
                    </div>
                    <p className="discover-trend-signal">
                      {product.shopperCount} browsers explored this · {product.searcherCount} searched · {product.viewerCount} viewed
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="discover-status">
              There isn’t enough recent activity to show a reliable trend here yet. Trends appear after at least two browsers explore an in-stock product.
            </p>
          )}
        </section>

        <section className="discover-featured">
          <div className="discover-section-heading">
            <div>
              <span className="discover-eyebrow">Picked for a fresh start</span>
              <h2>Little things, lovely homes</h2>
            </div>
            <p>Browse real listings from the stores in our catalog.</p>
          </div>

          {isLoading ? (
            <p className="discover-status" role="status">
              Finding something lovely…
            </p>
          ) : error ? (
            <p className="discover-status discover-error" role="alert">
              {error}
            </p>
          ) : products.length > 0 ? (
            <div className="discover-product-grid">
              {products.map((product) => (
                <Link
                  className="discover-product-card"
                  key={product.id}
                  to={`/product/${product.id}`}
                >
                  <div className="discover-product-image">
                    <img
                      src={product.imageUrl}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = decorImage;
                      }}
                    />
                  </div>
                  <div className="discover-product-copy">
                    <span>{product.brand}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="discover-product-meta">
                      <strong>KSh {product.startingPrice.toLocaleString()}</strong>
                      <span>
                        {product.storeCount}{" "}
                        {product.storeCount === 1 ? "store" : "stores"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="discover-status">
              No featured products are available right now. Browse departments
              to see what’s in the catalog.
            </p>
          )}
        </section>

        <section className="discover-local">
          <div className="discover-local-mark" aria-hidden="true">
            ⌖
          </div>
          <div>
            <span className="discover-eyebrow">Just around the corner</span>
            <h2>Find helpful places close to home.</h2>
            <p>
              Looking for a store or home service nearby? Search by area and
              explore local listings on the map.
            </p>
          </div>
          <Link to="/map" className="discover-local-link">
            Explore the map <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Discover;
