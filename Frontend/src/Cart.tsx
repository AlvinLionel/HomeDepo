import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import { CART_UPDATED_EVENT, readCart, saveCart, type CartItem } from "./cartStore";
import furnitureImage from "../assets/categories/furniture.webp";
import "../styles/cart.css";

function Cart() {
  const [items, setItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    document.body.classList.add("cart-page-body");
    const refreshCart = () => setItems(readCart());
    window.addEventListener(CART_UPDATED_EVENT, refreshCart);
    window.addEventListener("storage", refreshCart);

    return () => {
      document.body.classList.remove("cart-page-body");
      window.removeEventListener(CART_UPDATED_EVENT, refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, []);

  const updateQuantity = (item: CartItem, nextQuantity: number) => {
    const nextItems = items
      .map((cartItem) =>
        cartItem.key === item.key
          ? {
              ...cartItem,
              quantity: Math.min(nextQuantity, cartItem.stockQuantity),
            }
          : cartItem,
      )
      .filter((cartItem) => cartItem.quantity > 0);

    saveCart(nextItems);
  };

  const removeItem = (item: CartItem) => {
    saveCart(items.filter((cartItem) => cartItem.key !== item.key));
  };

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  return (
    <div className="cart-page">
      <Navbar />
      <main className="cart-main">
        <header className="cart-heading">
          <span className="cart-eyebrow">Saved for your home</span>
          <h1>Your basket.</h1>
          <p>Keep the good things together while you decide what feels right.</p>
        </header>

        {items.length > 0 ? (
          <div className="cart-layout">
            <section className="cart-items" aria-label="Items in your basket">
              {items.map((item) => (
                <article className="cart-item" key={item.key}>
                  <Link className="cart-item-image" to={`/product/${item.productId}`}>
                    <img
                      src={item.imageUrl || furnitureImage}
                      alt={item.name}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = furnitureImage;
                      }}
                    />
                  </Link>
                  <div className="cart-item-details">
                    <span>{item.brand}</span>
                    <h2>
                      <Link to={`/product/${item.productId}`}>{item.name}</Link>
                    </h2>
                    <p>{item.storeName}</p>
                    <span className="cart-item-stock">
                      {item.stockQuantity} available when added
                    </span>
                    <button
                      type="button"
                      className="cart-remove"
                      onClick={() => removeItem(item)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="cart-item-controls">
                    <strong>KSh {item.price.toLocaleString()}</strong>
                    <div
                      className="quantity-control"
                      role="group"
                      aria-label={`Quantity for ${item.name}`}
                    >
                      <button
                        type="button"
                        aria-label={`Remove one ${item.name}`}
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Add one ${item.name}`}
                        disabled={item.quantity >= item.stockQuantity}
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <strong className="cart-line-total">
                      KSh {(item.price * item.quantity).toLocaleString()}
                    </strong>
                  </div>
                </article>
              ))}
            </section>

            <aside className="cart-summary">
              <span className="cart-eyebrow">A little tally</span>
              <h2>Basket summary</h2>
              <div className="cart-summary-line">
                <span>Items ({items.reduce((count, item) => count + item.quantity, 0)})</span>
                <strong>KSh {subtotal.toLocaleString()}</strong>
              </div>
              <p>
                Delivery and final availability are confirmed directly with
                each store.
              </p>
              <button type="button" className="checkout-button" disabled>
                Checkout is coming soon
              </button>
              <Link className="continue-shopping" to="/products">
                Continue browsing <span aria-hidden="true">→</span>
              </Link>
            </aside>
          </div>
        ) : (
          <section className="cart-empty">
            <span aria-hidden="true">✳</span>
            <h2>A little room for something lovely.</h2>
            <p>
              Your basket is empty for now. Browse the catalog and save
              something that feels like home.
            </p>
            <Link to="/products">Browse home finds <span aria-hidden="true">→</span></Link>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default Cart;
