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
                    <p>Loading product...</p>
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
                    <Link to="/products">← Back to products</Link>

                    <section className="product-details-error">
                        <h1>Product not found</h1>
                        <p>{error || "We couldn't find that product."}</p>
                        <Link to="/products">Browse departments</Link>
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
                    ← Back to products
                </Link>

                <section className="product-details">
                    <div className="product-details-info">
                        <span>{product.brand}</span>
                        <h1>{product.name}</h1>
                        <p>{product.description}</p>
                        <p className="product-trend-disclosure">
                            This product view may contribute to anonymous HomeX trend counts.{" "}
                            <Link to="/discover">Learn about trends</Link>.
                        </p>

                        <div className="product-store-heading">
                            <strong>
                                Available from {product.stores.length}{" "}
                                {product.stores.length === 1 ? "store" : "stores"}
                            </strong>
                        </div>
                        {cartMessage && <p className="cart-feedback" role="status">{cartMessage}</p>}
                        {cartError && <p className="cart-feedback cart-feedback-error" role="alert">{cartError}</p>}

                        <div className="product-store-list">
                            {product.stores.map((store) => (
                                <article className="product-store" key={store.id}>
                                    <div className="product-store-image">
                                        <img
                                            src={store.imageUrl || product.imageUrl || furnitureImage}
                                            alt={`${product.name} from ${store.name}`}
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src = furnitureImage;
                                            }}
                                        />
                                    </div>

                                    <div className="product-store-info">
                                        <h2>{store.name}</h2>
                                        <p>{store.address}</p>

                                        <div className="product-store-purchase">
                                            <strong> KSh {store.price.toLocaleString()}</strong>
                                            <span>
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
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default ProductDetails;