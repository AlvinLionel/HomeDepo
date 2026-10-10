import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import "../styles/productDetails.css";

interface StoreListing {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    imageUrl: string;
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
    stores: StoreListing[];
}

function ProductDetails() {
    const { productId } = useParams<{ productId: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

                const response = await fetch(`http://localhost:5000/api/products/${productId}`);

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

                        <div className="product-store-heading">
                            <strong>
                                Available from {product.stores.length}{" "}
                                {product.stores.length === 1 ? "store" : "stores"}
                            </strong>
                        </div>

                        <div className="product-store-list">
                            {product.stores.map((store) => (
                                <article className="product-store" key={store.id}>
                                    <div className="product-store-image">
                                        <img src={store.imageUrl} alt={`${product.name} from ${store.name}`} />
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