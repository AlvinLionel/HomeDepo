import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import { saveTrendArea } from "./trends";
import "../styles/settings.css";

interface AccountSettingsData {
  username: string;
  email: string;
  preferredArea: string;
  showContactPhone: boolean;
}

const emptySettings: AccountSettingsData = {
  username: "",
  email: "",
  preferredArea: "",
  showContactPhone: false,
};

function Settings() {
  const token = localStorage.getItem("homexToken");
  const [settings, setSettings] = useState(emptySettings);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.classList.add("settings-page-body");
    return () => document.body.classList.remove("settings-page-body");
  }, []);

  useEffect(() => {
    let active = true;
    if (!token) return () => { active = false; };

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/account/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load your settings.");
        if (active) {
          setSettings(data);
          localStorage.setItem("homexUsername", data.username);
          try {
            saveTrendArea(data.preferredArea);
          } catch (storageError) {
            console.error("Unable to cache the preferred neighborhood:", storageError);
          }
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your settings.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadSettings();
    return () => { active = false; };
  }, [token]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: settings.username,
          preferredArea: settings.preferredArea,
          showContactPhone: settings.showContactPhone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save your settings.");
      setSettings(data.settings);
      localStorage.setItem("homexUsername", data.settings.username);
      try {
        saveTrendArea(data.settings.preferredArea);
      } catch (storageError) {
        console.error("Unable to cache the preferred neighborhood:", storageError);
      }
      setMessage(data.message);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("Your new passwords don’t match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update your password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(data.message);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Unable to update your password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="settings-page">
      <Navbar />
      <main className="settings-main">
        <header className="settings-hero">
          <span className="settings-eyebrow">Your HomeX, your way</span>
          <h1>A few little <em>preferences.</em></h1>
          <p>Keep your account up to date and choose how HomeX feels around your neighborhood.</p>
        </header>

        {message && <p className="settings-message" role="status">{message}</p>}
        {error && <p className="settings-error" role="alert">{error}</p>}

        {!token ? (
          <section className="settings-card settings-sign-in">
            <h2>Sign in to your HomeX account.</h2>
            <p>Your profile and preferences live with your account, so you can pick up where you left off.</p>
            <Link to="/auth?mode=login" className="settings-primary-button">Sign in</Link>
          </section>
        ) : isLoading ? (
          <p className="settings-card" role="status">Gathering your settings…</p>
        ) : (
          <div className="settings-layout">
            <nav className="settings-nav" aria-label="Settings sections">
              <a href="#profile">Profile</a>
              <a href="#neighborhood">Neighborhood</a>
              <a href="#privacy">Privacy</a>
              <a href="#security">Security</a>
            </nav>

            <form className="settings-sections" onSubmit={(event) => void saveSettings(event)}>
              <section className="settings-card" id="profile">
                <div className="settings-section-heading">
                  <span className="settings-eyebrow">The basics</span>
                  <h2>Your profile</h2>
                  <p>Your display name appears when you share a find with the neighborhood.</p>
                </div>
                <label className="settings-field">
                  <span>Display name</span>
                  <input
                    value={settings.username}
                    maxLength={100}
                    required
                    onChange={(event) => setSettings({ ...settings, username: event.target.value })}
                    autoComplete="nickname"
                  />
                </label>
                <label className="settings-field">
                  <span>Email address</span>
                  <input value={settings.email} readOnly aria-describedby="settings-email-note" />
                  <small id="settings-email-note">Used to sign in. Email changes aren’t available yet.</small>
                </label>
              </section>

              <section className="settings-card" id="neighborhood">
                <div className="settings-section-heading">
                  <span className="settings-eyebrow">Close to home</span>
                  <h2>Your neighborhood</h2>
                  <p>We’ll use this as a starting point for local finds and HomeX trends. You can still search anywhere.</p>
                </div>
                <label className="settings-field">
                  <span>Preferred area</span>
                  <input
                    value={settings.preferredArea}
                    maxLength={100}
                    placeholder="e.g. Kilimani, Nairobi"
                    onChange={(event) => setSettings({ ...settings, preferredArea: event.target.value })}
                    autoComplete="address-level2"
                  />
                  <small>This is a general area, not your precise location.</small>
                </label>
              </section>

              <section className="settings-card" id="privacy">
                <div className="settings-section-heading">
                  <span className="settings-eyebrow">Your comfort comes first</span>
                  <h2>Privacy &amp; sharing</h2>
                  <p>Choose whether a phone number you add to a peer listing can be seen by other shoppers.</p>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.showContactPhone}
                    onChange={(event) => setSettings({ ...settings, showContactPhone: event.target.checked })}
                  />
                  <span className="settings-toggle-copy">
                    <strong>Show my phone number on my peer listings</strong>
                    <small>When off, your number is hidden on all your listings, including existing ones. You can still be contacted through any details you choose to share.</small>
                  </span>
                </label>
              </section>

              <button className="settings-primary-button settings-save-button" type="submit" disabled={isSaving}>
                {isSaving ? "Saving your preferences…" : "Save preferences"}
              </button>
            </form>

            <section className="settings-card settings-security-card" id="security">
              <div className="settings-section-heading">
                <span className="settings-eyebrow">Keep your account yours</span>
                <h2>Password &amp; security</h2>
                <p>Choose a password you don’t use anywhere else. Changing it signs out your other HomeX sessions.</p>
              </div>
              <form className="settings-password-form" onSubmit={(event) => void changePassword(event)}>
                <label className="settings-field">
                  <span>Current password</span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>
                <label className="settings-field">
                  <span>New password</span>
                  <input
                    type="password"
                    minLength={8}
                    maxLength={200}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <small>Use at least 8 characters.</small>
                </label>
                <label className="settings-field">
                  <span>Confirm new password</span>
                  <input
                    type="password"
                    minLength={8}
                    maxLength={200}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>
                <button className="settings-secondary-button" type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? "Updating password…" : "Update password"}
                </button>
              </form>
              <Link className="settings-reset-link" to="/reset-password">Forgot your current password?</Link>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default Settings;
