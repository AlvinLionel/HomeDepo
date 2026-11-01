import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { CART_UPDATED_EVENT, getCartItemCount } from "../src/cartStore";
import "../styles/components.css";

interface NavbarProps {
  cartItemCount?: number;
}

function Navbar({ cartItemCount }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentCartItemCount, setCurrentCartItemCount] = useState(
    cartItemCount ?? getCartItemCount(),
  );
  const navigate = useNavigate();
  const token = localStorage.getItem("homexToken");
  const username = localStorage.getItem("homexUsername") || "";
  const isModerator = localStorage.getItem("homexIsModerator") === "true";

  useEffect(() => {
    if (cartItemCount !== undefined) {
      setCurrentCartItemCount(cartItemCount);
      return;
    }

    const updateCount = () => setCurrentCartItemCount(getCartItemCount());
    window.addEventListener(CART_UPDATED_EVENT, updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, [cartItemCount]);

  const closeMenus = () => {
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("homexToken");

    if (token) {
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok && response.status !== 401) {
          throw new Error(`Logout request failed with status ${response.status}`);
        }
      } catch (error) {
        console.error("Unable to revoke the current session:", error);
      }
    }

    localStorage.removeItem("homexUsername");
    localStorage.removeItem("homexEmail");
    localStorage.removeItem("homeXUsername");
    localStorage.removeItem("homeDepoUsername");
    localStorage.removeItem("homexAccountType");
    localStorage.removeItem("homexUserId");
    localStorage.removeItem("homexIsModerator");
    localStorage.removeItem("homexToken");
    closeMenus();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar-content">
        <NavLink to="/Home" className="navbar-logo" onClick={closeMenus}>
          HomeX
        </NavLink>

        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`navbar-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/Home" onClick={closeMenus}>
            Home
          </NavLink>

          <NavLink to="/products" onClick={closeMenus}>
            Shop
          </NavLink>

          <NavLink to="/discover" onClick={closeMenus}>
            Discover
          </NavLink>

          <NavLink to="/marketplace" onClick={closeMenus}>
            Pre-loved
          </NavLink>

          <NavLink to="/marketplace?mode=sell" onClick={closeMenus}>
            Sell a find
          </NavLink>

          <NavLink to="/merchant" onClick={closeMenus}>
            For stores
          </NavLink>

          <NavLink to="/services" onClick={closeMenus}>
            Services &amp; places
          </NavLink>

          {isModerator && (
            <NavLink to="/moderation" onClick={closeMenus}>
              Review reports
            </NavLink>
          )}

          <NavLink to="/map" onClick={closeMenus}>
            Map
          </NavLink>

          <button
            type="button"
            className="mobile-logout-button"
            onClick={handleLogout}
            hidden={!token}
            tabIndex={token ? 0 : -1}
          >
            Log out
          </button>
        </nav>

        <div className="navbar-actions">
          <NavLink
            to="/cart"
            className="cart-link"
            onClick={closeMenus}
            aria-label={`Cart with ${currentCartItemCount} item${
              currentCartItemCount === 1 ? "" : "s"
            }`}
          >
            <span aria-hidden="true">🛒</span>
            <span>Cart</span>

            {currentCartItemCount > 0 && (
              <span className="cart-count">{currentCartItemCount}</span>
            )}
          </NavLink>

          <div className="profile-menu">
            <button
              type="button"
              className="profile-button"
              onClick={() => setProfileOpen((isOpen) => !isOpen)}
              aria-label={profileOpen ? "Close account menu" : "Open account menu"}
              aria-expanded={profileOpen}
            >
              {username ? username.slice(0, 1).toUpperCase() : <span aria-hidden="true">⌂</span>}
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                {token ? (
                  <>
                    <div className="profile-dropdown-identity">
                      <strong>{username || "HomeX member"}</strong>
                      <span>Good to have you home.</span>
                    </div>
                    <NavLink to="/settings" onClick={closeMenus}>Settings &amp; preferences</NavLink>
                    <NavLink to="/contact" onClick={closeMenus}>Help &amp; contact</NavLink>
                    <NavLink to="/marketplace?mode=sell" onClick={closeMenus}>Your peer listings</NavLink>
                    <NavLink to="/merchant" onClick={closeMenus}>Store workspace</NavLink>
                    {isModerator && <NavLink to="/moderation" onClick={closeMenus}>Community review</NavLink>}
                    <button type="button" className="logout-button" onClick={handleLogout}>Log out</button>
                  </>
                ) : (
                  <>
                    <div className="profile-dropdown-identity">
                      <strong>Make yourself at home</strong>
                      <span>Sign in to save your preferences.</span>
                    </div>
                    <Link to="/auth?mode=login" onClick={closeMenus}>Sign in</Link>
                    <Link to="/auth?mode=signup" onClick={closeMenus}>Create an account</Link>
                    <Link to="/contact" onClick={closeMenus}>Help &amp; contact</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;