import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/components.css";

interface NavbarProps {
  cartItemCount?: number;
}

function Navbar({ cartItemCount = 0 }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const closeMenus = () => {
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("homeDepoUsername");
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
            Products
          </NavLink>

          <NavLink to="/discover" onClick={closeMenus}>
            Discover
          </NavLink>

          <NavLink to="/map" onClick={closeMenus}>
            Map
          </NavLink>

          <button
            type="button"
            className="mobile-logout-button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </nav>

        <div className="navbar-actions">
          <NavLink
            to="/cart"
            className="cart-link"
            onClick={closeMenus}
            aria-label={`Cart with ${cartItemCount} item${
              cartItemCount === 1 ? "" : "s"
            }`}
          >
            <span aria-hidden="true">🛒</span>
            <span>Cart</span>

            {cartItemCount > 0 && (
              <span className="cart-count">{cartItemCount}</span>
            )}
          </NavLink>

          <div className="profile-menu">
            <button
              type="button"
              className="profile-button"
              onClick={() => setProfileOpen((isOpen) => !isOpen)}
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              👤
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <button
                  type="button"
                  className="logout-button"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;