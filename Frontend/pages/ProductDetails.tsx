import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import furnitureImage from "../assets/categories/furniture.webp";
import { addCartItem } from "../src/cartStore";
import { trackProductTrend } from "../src/trends";
import "../styles/productDetails.css";

interface StoreListing {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    imageUrl: string | null;
    price: number;
    stockQuantity: number;
    isAvailable: boolean;
}

interface Product {
    id: number;
    name: string;
    description: string;
    brand: string;
    unit: string;
    imageUrl: string | null;
    stores: StoreListing[];
}

function ProductDetails() {
    const { productId } = useParams<{ productId: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cartMessage, setCartMessage] = useState("");
    const [cartError, setCartError] = useState("");

    const handleAddToCart = (store: StoreListing) => {
        if (!product) return;
        setCartMessage("");
        setCartError("");
        try {
            addCartItem({
                productId: product.id,
                storeId: store.id,
                name: product.name,
                brand: product.brand,
                storeName: store.name,
                price: store.price,
                imageUrl: store.imageUrl || product.imageUrl || furnitureImage,
                stockQuantity: store.stockQuantity,
            });
            setCartMessage(`${product.name} is in your basket.`);
        } catch (addError) {
            setCartError(
                addError instanceof Error
                    ? addError.message
                    : "Unable to save this item to your basket.",
            );
        }
    };

    useEffect(() => {
        if (!productId) {
            setError("We couldn't find that product.");
            setLoading(false);
            return;
        }

        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(`/api/products/${productId}`);

                if (!response.ok) throw new Error("Failed to load product");

                const data = await response.json();
                setProduct(data);
            } catch (error) {
                console.error("Error fetching product:", error);
                setError("We couldn't load this product.");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId]);

    useEffect(() => {
        document.body.classList.add("product-details-page-body");

        return () => { document.body.classList.remove("product-details-page-body"); };
    }, []);

    useEffect(() => {
        if (!product) return;

        trackProductTrend(product.id, "view").catch((trendError: unknown) => {
            console.error("Unable to record product view trend:", trendError);
        });
    }, [product?.id]);

    if (loading) {
        return (
            <div className="product-details-page">
                <Navbar />
                <main className="product-details-main">
                    <p className="product-details-loading" role="status">Finding the details…</p>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="product-details-page">
                <Navbar />
                <main className="product-details-main">
                    <Link className="product-details-back" to="/products">
                        <span aria-hidden="true">←</span> All departments
                    </Link>

                    <section className="product-details-error">
                        <span className="product-details-eyebrow">A little detour</span>
                        <h1>Product not found</h1>
                        <p>{error || "We couldn't find that product."}</p>
                        <Link className="product-details-browse" to="/products">Browse departments <span aria-hidden="true">→</span></Link>
                    </section>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="product-details-page">
            <Navbar />
            <main className="product-details-main">
                <Link className="product-details-back" to="/products">
                    <span aria-hidden="true">←</span> All departments
                </Link>

                <section className="product-details">
                    <header className="product-details-hero">
                        <div className="product-details-hero-image">
                            <img
                                src={product.imageUrl || furnitureImage}
                                alt={product.name}
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = furnitureImage;
                                }}
                            />
                            <span className="product-details-image-note">A good find for your home</span>
                        </div>
                        <div className="product-details-info">
                            <span className="product-details-eyebrow">{product.brand || "Thoughtful home finds"}</span>
                            <h1>{product.name}</h1>
                            <p>{product.description || "A lovely addition to your home, available from local HomeX stores."}</p>
                            <div className="product-details-summary">
                                <span><strong>{product.stores.length}</strong> {product.stores.length === 1 ? "local store" : "local stores"}</span>
                                <span>Compare nearby availability</span>
                            </div>
                            <p className="product-trend-disclosure">
                                This product view may contribute to anonymous HomeX trend counts.{" "}
                                <Link to="/discover">Learn about trends</Link>.
                            </p>
                        </div>
                    </header>

                    <section className="product-offers" aria-labelledby="product-offers-title">
                        <div className="product-store-heading">
                            <div>
                                <span className="product-details-eyebrow">Shop close to home</span>
                                <h2 id="product-offers-title">Find it at a nearby store</h2>
                            </div>
                            <strong>{product.stores.length} {product.stores.length === 1 ? "offer" : "offers"}</strong>
                        </div>
                        {cartMessage && <p className="cart-feedback" role="status">{cartMessage}</p>}
                        {cartError && <p className="cart-feedback cart-feedback-error" role="alert">{cartError}</p>}

                        {product.stores.length > 0 ? (
                            <div className="product-store-list">
                                {product.stores.map((store) => (
                                    <article className="product-store" key={store.id}>
                                        <div className="product-store-image">
                                            <img
                                                src={store.imageUrl || product.imageUrl || furnitureImage}
                                                alt={`${product.name} at ${store.name}`}
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = furnitureImage;
                                                }}
                                            />
                                        </div>
                                        <div className="product-store-info">
                                            <span className="product-store-label">Local store</span>
                                            <h3>{store.name}</h3>
                                            <p>{store.address}</p>
                                            <div className="product-store-purchase">
                                                <strong>KSh {store.price.toLocaleString()}</strong>
                                                <span className={store.isAvailable && store.stockQuantity > 0 ? "stock-available" : "stock-unavailable"}>
                                                    {store.isAvailable && store.stockQuantity > 0 ? `${store.stockQuantity} in stock` : "Out of stock"}
                                                </span>
                                            </div>
                                            <button
                                                className="add-to-cart-button"
                                                type="button"
                                                disabled={!store.isAvailable || store.stockQuantity <= 0}
                                                onClick={() => handleAddToCart(store)}
                                            >
                                                {store.isAvailable && store.stockQuantity > 0
                                                    ? "Add to basket"
                                                    : "Currently unavailable"}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="product-offers-empty">
                                <h3>No store offers just yet.</h3>
                                <p>Try browsing another department or check back as local stores update their catalogs.</p>
                                <Link className="product-details-browse" to="/products">Explore departments <span aria-hidden="true">→</span></Link>
                            </div>
                        )}
                    </section>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default ProductDetails;