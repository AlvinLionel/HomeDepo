import { useEffect, useState, type FormEvent } from "react";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import "../styles/support.css";

interface SupportDetails {
  email: string;
  phone: string;
  whatsapp: string;
  hours: string;
  formAvailable: boolean;
}

interface SupportForm {
  name: string;
  email: string;
  category: string;
  orderReference: string;
  message: string;
  website: string;
}

const emptyForm: SupportForm = {
  name: "",
  email: "",
  category: "order",
  orderReference: "",
  message: "",
  website: "",
};

function Support() {
  const [details, setDetails] = useState<SupportDetails | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.classList.add("support-page-body");
    let active = true;

    const loadContactDetails = async () => {
      try {
        const response = await fetch("/api/support/contact");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load support details.");
        if (active) setDetails(data);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load support details.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadContactDetails();
    return () => {
      active = false;
      document.body.classList.remove("support-page-body");
    };
  }, []);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSending(true);

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send your message.");
      setMessage(data.message);
      setForm(emptyForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send your message.");
    } finally {
      setIsSending(false);
    }
  };

  const formAvailable = details?.formAvailable === true;

  return (
    <div className="support-page">
      <Navbar />
      <main className="support-main">
        <header className="support-hero">
          <span className="support-eyebrow">We’re here to help</span>
          <h1>A real person, <em>just around the corner.</em></h1>
          <p>Tell us what’s going on and we’ll point you in the right direction. Choose the closest topic so your message reaches the right person.</p>
        </header>

        <div className="support-layout">
          <section className="support-contact-card">
            <span className="support-eyebrow">Get in touch</span>
            <h2>Let’s find a way forward.</h2>
            <p>For your safety, never send a password, payment code, or full card details in a support message.</p>
            {isLoading ? (
              <p className="support-contact-status" role="status">Loading ways to reach us…</p>
            ) : (
              <div className="support-contact-options">
                {details?.email ? (
                  <a href={`mailto:${details.email}`}>
                    <span aria-hidden="true">@</span>
                    <span><strong>Email us</strong><small>{details.email}</small></span>
                  </a>
                ) : null}
                {details?.phone ? (
                  <a href={`tel:${details.phone}`}>
                    <span aria-hidden="true">☎</span>
                    <span><strong>Call our team</strong><small>{details.phone}</small></span>
                  </a>
                ) : null}
                {details?.whatsapp ? (
                  <a href={`https://wa.me/${details.whatsapp}`} target="_blank" rel="noreferrer">
                    <span aria-hidden="true">↗</span>
                    <span><strong>Message on WhatsApp</strong><small>Opens a WhatsApp conversation</small></span>
                  </a>
                ) : null}
                {details?.hours ? (
                  <div className="support-hours">
                    <strong>When we’re around</strong>
                    <span>{details.hours}</span>
                  </div>
                ) : null}
                {!details?.email && !details?.phone && !details?.whatsapp && !details?.hours && (
                  <p className="support-contact-status">Direct contact details will appear here when configured.</p>
                )}
              </div>
            )}
            <div className="support-response-note">
              <span aria-hidden="true">✳</span>
              <p>
                {formAvailable
                  ? "Your message goes to the HomeX support inbox. We’ll reply to the email address you provide."
                  : "Our support inbox is being set up. Contact options will appear here as soon as they’re available."}
              </p>
            </div>
          </section>

          <section className="support-form-card" aria-labelledby="support-form-title">
            <div className="support-section-heading">
              <span className="support-eyebrow">Send us a note</span>
              <h2 id="support-form-title">How can we help?</h2>
              <p>Share enough detail for us to understand. Please don’t include sensitive account or payment information.</p>
            </div>

            {message && <p className="support-message" role="status">{message}</p>}
            {error && <p className="support-error" role="alert">{error}</p>}
            {!isLoading && !formAvailable && (
              <p className="support-unavailable" role="status">
                The message form is temporarily unavailable while the support inbox is being set up. You can still browse HomeX; please check back soon.
              </p>
            )}

            <form className="support-form" onSubmit={(event) => void submitRequest(event)}>
              <label>
                <span>Your name</span>
                <input
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                <span>Email for our reply</span>
                <input
                  type="email"
                  required
                  maxLength={255}
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label>
                <span>What is this about?</span>
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  <option value="order">Orders and products</option>
                  <option value="peer_marketplace">Pre-loved marketplace</option>
                  <option value="store_account">Local store account</option>
                  <option value="account_security">Account and security</option>
                  <option value="other">Something else</option>
                </select>
              </label>
              <label>
                <span>Order or reference <small>Optional</small></span>
                <input
                  maxLength={100}
                  value={form.orderReference}
                  onChange={(event) => setForm({ ...form, orderReference: event.target.value })}
                />
              </label>
              <label className="support-field-wide">
                <span>Your message</span>
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  placeholder="Tell us what happened and what would help."
                />
              </label>
              <label className="support-honeypot" aria-hidden="true">
                <span>Website</span>
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                />
              </label>
              <p className="support-privacy-note support-field-wide">
                {formAvailable
                  ? "We’ll email your message to the HomeX support team to respond. This form does not create an order or store a support ticket in your account."
                  : "When the support inbox is ready, messages will be emailed to our team. This form does not create an order or store a support ticket in your account."}
              </p>
              <button className="support-submit support-field-wide" type="submit" disabled={!formAvailable || isSending}>
                {isSending ? "Sending your note…" : "Send to HomeX support"}
                {!isSending && <span aria-hidden="true">→</span>}
              </button>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Support;
