import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import furnitureImage from "../assets/categories/furniture.webp";
import appliancesImage from "../assets/categories/appliances.webp";
import decorImage from "../assets/categories/home-decor.webp";
import kitchenImage from "../assets/categories/kitchenware.webp";
import outdoorImage from "../assets/categories/outdoor.webp";
import "../styles/marketplace.css";
import { getTrendArea } from "./trends";

type ListingCondition = "like_new" | "good" | "well_loved";
type ListingStatus = "active" | "sold" | "removed";

interface Listing {
  id: number;
  sellerId: number;
  title: string;
  description: string;
  category: string;
  price: number;
  condition: ListingCondition;
  neighborhood: string;
  imageUrl: string | null;
  contactPhone: string | null;
  sellerName?: string;
  status?: ListingStatus;
}

interface ListingForm {
  title: string;
  description: string;
  category: string;
  price: string;
  condition: ListingCondition;
  neighborhood: string;
  imageUrl: string;
  contactPhone: string;
}

const categories = [
  { value: "all", label: "Everything" },
  { value: "furniture", label: "Furniture" },
  { value: "appliances", label: "Appliances" },
  { value: "entertainment", label: "Electronics" },
  { value: "kitchenware", label: "Kitchen" },
  { value: "home-decor", label: "Home decor" },
  { value: "seasonal", label: "Seasonal" },
  { value: "textiles", label: "Textiles" },
  { value: "lighting", label: "Lighting" },
  { value: "outdoor", label: "Outdoor" },
  { value: "pets", label: "Pets" },
  { value: "fitness", label: "Fitness" },
];

const categoryImages: Record<string, string> = {
  furniture: furnitureImage,
  appliances: appliancesImage,
  entertainment: appliancesImage,
  kitchenware: kitchenImage,
  "home-decor": decorImage,
  seasonal: decorImage,
  textiles: decorImage,
  lighting: decorImage,
  outdoor: outdoorImage,
  pets: outdoorImage,
  fitness: outdoorImage,
};

const emptyListing: ListingForm = {
  title: "",
  description: "",
  category: "furniture",
  price: "",
  condition: "good",
  neighborhood: "",
  imageUrl: "",
  contactPhone: "",
};

const formatCondition = (condition: ListingCondition) => {
  if (condition === "like_new") return "Like new";
  if (condition === "well_loved") return "Well loved";
  return "Good";
};

function getSavedNeighborhood() {
  try {
    return getTrendArea();
  } catch (storageError) {
    console.error("Unable to read the saved neighborhood:", storageError);
    return "";
  }
}

function Marketplace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"browse" | "sell">(
    searchParams.get("mode") === "sell" ? "sell" : "browse",
  );
  const [queryInput, setQueryInput] = useState("");
  const [locationInput, setLocationInput] = useState(getSavedNeighborhood);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState(getSavedNeighborhood);
  const [category, setCategory] = useState("all");
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [listingForm, setListingForm] = useState<ListingForm>(emptyListing);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSeller, setIsLoadingSeller] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sellerError, setSellerError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [browseMessage, setBrowseMessage] = useState("");
  const [reportingListingId, setReportingListingId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportedListings, setReportedListings] = useState<Set<number>>(() => new Set());
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const token = localStorage.getItem("homexToken");
  const isSignedIn = Boolean(token);
  const currentUserId = Number(localStorage.getItem("homexUserId"));

  useEffect(() => {
    document.body.classList.add("marketplace-page-body");
    return () => document.body.classList.remove("marketplace-page-body");
  }, []);

  useEffect(() => {
    setActiveTab(searchParams.get("mode") === "sell" ? "sell" : "browse");
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadPreferredArea = async () => {
      try {
        const response = await fetch("/api/account/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load your preferred area.");
        if (active && data.preferredArea) {
          setLocationInput(data.preferredArea);
          setLocation(data.preferredArea);
        }
      } catch (settingsError) {
        console.error("Unable to load your preferred marketplace area:", settingsError);
      }
    };
    void loadPreferredArea();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "40" });
    if (query) params.set("q", query);
    if (category !== "all") params.set("category", category);
    if (location) params.set("location", location);

    const loadListings = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(`/api/marketplace/listings?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load finds.");
        setListings(data.listings);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setListings([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load neighborhood finds.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadListings();
    return () => controller.abort();
  }, [category, location, query]);

  useEffect(() => {
    if (!isSignedIn || !token) {
      setMyListings([]);
      return;
    }

    const controller = new AbortController();
    const loadMyListings = async () => {
      try {
        setIsLoadingSeller(true);
        setSellerError("");
        const response = await fetch("/api/marketplace/my-listings", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load your listings.");
        setMyListings(data.listings);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setSellerError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your listings.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingSeller(false);
      }
    };

    void loadMyListings();
    return () => controller.abort();
  }, [isSignedIn, token]);

  const openTab = (tab: "browse" | "sell") => {
    setActiveTab(tab);
    if (tab === "sell") setSearchParams({ mode: "sell" });
    else setSearchParams({});
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(queryInput.trim());
    setLocation(locationInput.trim());
  };

  const handleCreateListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setFormError("Your session has ended. Sign in again to publish a find.");
      return;
    }

    setFormError("");
    setFormMessage("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...listingForm,
          price: Number(listingForm.price),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to publish your find.");

      setFormMessage("Your find is listed. It’s now visible in your neighborhood.");
      setListingForm(emptyListing);
      setQuery("");
      setQueryInput("");
      setLocation("");
      setLocationInput("");
      setCategory("all");

      const [browseResponse, sellerResponse] = await Promise.all([
        fetch("/api/marketplace/listings?limit=40"),
        fetch("/api/marketplace/my-listings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const browseData = await browseResponse.json();
      const sellerData = await sellerResponse.json();
      if (browseResponse.ok) {
        setListings(browseData.listings);
        setBrowseMessage("Your find is listed and ready for its next home.");
      } else {
        setBrowseMessage("Your find is published. Refresh to see it in the neighborhood.");
      }
      if (sellerResponse.ok) {
        setMyListings(sellerData.listings);
      } else {
        setSellerError(sellerData.message || "Your find is live, but your seller list could not refresh.");
      }
      setActiveTab("sell");
      setSearchParams({ mode: "sell" });
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to publish your find.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleListingStatus = async (listing: Listing) => {
    if (!token) return;
    if (listing.status === "removed") return;
    const nextStatus: ListingStatus = listing.status === "sold" ? "active" : "sold";
    try {
      const response = await fetch(`/api/marketplace/listings/${listing.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update listing.");
      setMyListings((current) =>
        current.map((item) =>
          item.id === listing.id ? { ...item, status: nextStatus } : item,
        ),
      );
      if (nextStatus === "sold") {
        setListings((current) => current.filter((item) => item.id !== listing.id));
      }
      setSellerError("");
    } catch (statusError) {
      setSellerError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update listing status.",
      );
    }
  };

  const handleReportListing = async (
    event: FormEvent<HTMLFormElement>,
    listingId: number,
  ) => {
    event.preventDefault();
    if (!token) {
      navigate("/auth");
      return;
    }

    setReportError("");
    setIsSubmittingReport(true);
    try {
      const response = await fetch(`/api/marketplace/listings/${listingId}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to submit your report.");

      setReportedListings((current) => new Set(current).add(listingId));
      setReportingListingId(null);
      setReportDetails("");
    } catch (submitError) {
      setReportError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your report.",
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="marketplace-page">
      <Navbar />
      <main className="marketplace-main">
        <header className="marketplace-hero">
          <div className="marketplace-hero-copy">
            <span className="marketplace-eyebrow">Loved once. Ready for more.</span>
            <h1>
              Good homes
              <br />
              <em>share good things.</em>
            </h1>
            <p>
              Find a second home for the pieces you love, or pass along
              something that’s ready for its next story.
            </p>
          </div>
          <div className="marketplace-hero-stamp" aria-hidden="true">
            <span>Pass it</span>
            <strong>on</strong>
            <span>with love</span>
            <i>✳</i>
          </div>
        </header>

        <div className="marketplace-tabs" role="tablist" aria-label="Neighborhood marketplace">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "browse"}
            className={activeTab === "browse" ? "active" : ""}
            onClick={() => openTab("browse")}
          >
            Browse nearby
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sell"}
            className={activeTab === "sell" ? "active" : ""}
            onClick={() => openTab("sell")}
          >
            Share a find
          </button>
        </div>

        {activeTab === "browse" ? (
          <>
            <section className="neighborhood-search-section">
              <div>
                <span className="marketplace-eyebrow">A second life, nearby</span>
                <h2>Find your next favorite.</h2>
              </div>
              <form className="neighborhood-search" onSubmit={handleSearch}>
                <label>
                  <span>Search finds</span>
                  <input
                    type="search"
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder="A lamp, a little table..."
                  />
                </label>
                <label>
                  <span>Neighborhood</span>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(event) => setLocationInput(event.target.value)}
                    placeholder="e.g. Kilimani"
                  />
                </label>
                <button type="submit">Find a find</button>
              </form>

              <div className="marketplace-category-filters" aria-label="Filter by category">
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={category === item.value ? "active" : ""}
                    aria-pressed={category === item.value}
                    onClick={() => setCategory(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="marketplace-listings-section" aria-live="polite">
              {browseMessage && (
                <p className="marketplace-publish-message" role="status">
                  {browseMessage}
                </p>
              )}
              <div className="marketplace-section-heading">
                <div>
                  <span className="marketplace-eyebrow">
                    {location ? `Around ${location}` : "From our neighborhood"}
                  </span>
                  <h2>Pre-loved, well-loved.</h2>
                </div>
                <span>{isLoading ? "Finding good things..." : `${listings.length} finds`}</span>
              </div>

              {error ? (
                <div className="marketplace-empty marketplace-alert" role="alert">
                  <h3>We couldn’t find the listings.</h3>
                  <p>{error}</p>
                  <p>
                    Check your connection. If you’re running HomeX locally,
                    make sure the neighborhood marketplace database migration
                    has been applied.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="marketplace-loading" role="status">
                  <span className="loading-flower" aria-hidden="true">✳</span>
                  <p>Looking for something lovely…</p>
                </div>
              ) : listings.length > 0 ? (
                <div className="neighborhood-listing-grid">
                  {listings.map((listing) => (
                    <article className="neighborhood-listing-card" key={listing.id}>
                      <div className="neighborhood-listing-image">
                        <img
                          src={listing.imageUrl || categoryImages[listing.category] || furnitureImage}
                          alt={listing.title}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src =
                              categoryImages[listing.category] || furnitureImage;
                          }}
                        />
                        <span className="listing-condition">
                          {formatCondition(listing.condition)}
                        </span>
                      </div>
                      <div className="neighborhood-listing-copy">
                        <span className="listing-category">
                          {categories.find((item) => item.value === listing.category)?.label || "Home"}
                        </span>
                        <h3>{listing.title}</h3>
                        <p>{listing.description}</p>
                        <div className="listing-location">
                          <span aria-hidden="true">⌖</span> {listing.neighborhood}
                        </div>
                        <div className="listing-card-footer">
                          <strong>KSh {listing.price.toLocaleString()}</strong>
                          {listing.contactPhone ? (
                            <a href={`tel:${listing.contactPhone}`}>Ask about it ↗</a>
                          ) : (
                            <span className="listing-no-contact">Shared by {listing.sellerName}</span>
                          )}
                        </div>
                        {listing.sellerId !== currentUserId && (
                          <div className="listing-report">
                            {reportedListings.has(listing.id) ? (
                              <p className="listing-report-success" role="status">
                                Thanks for helping keep this neighborhood safe. Your report is with our team.
                              </p>
                            ) : reportingListingId === listing.id ? (
                              <form onSubmit={(event) => void handleReportListing(event, listing.id)}>
                                <label>
                                  <span>What concerns you about this listing?</span>
                                  <select
                                    value={reportReason}
                                    onChange={(event) => setReportReason(event.target.value)}
                                  >
                                    <option value="scam">Possible scam or fraud</option>
                                    <option value="counterfeit">Counterfeit or fake item</option>
                                    <option value="misleading">Misleading description or photos</option>
                                    <option value="prohibited">Prohibited or unsafe item</option>
                                    <option value="suspicious_contact">Suspicious payment or contact request</option>
                                    <option value="other">Something else</option>
                                  </select>
                                </label>
                                <label>
                                  <span>Anything else we should know? <small>Optional</small></span>
                                  <textarea
                                    maxLength={1000}
                                    rows={3}
                                    value={reportDetails}
                                    onChange={(event) => setReportDetails(event.target.value)}
                                    placeholder="Please don’t include passwords, payment codes, or other sensitive information."
                                  />
                                </label>
                                {reportError && <p className="listing-report-error" role="alert">{reportError}</p>}
                                <div className="listing-report-actions">
                                  <button type="button" onClick={() => {
                                    setReportingListingId(null);
                                    setReportError("");
                                  }}>
                                    Cancel
                                  </button>
                                  <button type="submit" disabled={isSubmittingReport}>
                                    {isSubmittingReport ? "Sending…" : "Send report"}
                                  </button>
                                </div>
                              </form>
                            ) : token ? (
                              <button
                                type="button"
                                className="listing-report-trigger"
                                onClick={() => {
                                  setReportingListingId(listing.id);
                                  setReportError("");
                                }}
                              >
                                Report a concern
                              </button>
                            ) : (
                              <Link className="listing-report-trigger" to="/auth">
                                Sign in to report a concern
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="marketplace-empty">
                  <span className="empty-flower" aria-hidden="true">✳</span>
                  <h3>A lovely find is waiting to be listed.</h3>
                  <p>
                    Nothing matches just yet. Check another neighborhood, or be
                    the first to share something good.
                  </p>
                  <button type="button" onClick={() => openTab("sell")}>
                    Share your first find <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="marketplace-seller-section">
            {!isSignedIn ? (
              <div className="seller-welcome-card">
                <span className="seller-welcome-flower" aria-hidden="true">✳</span>
                <span className="marketplace-eyebrow">Your good things have a next home</span>
                <h2>Make a little room. Make someone’s day.</h2>
                <p>
                  Use your everyday HomeX account to share a well-loved home find
                  and connect directly with people nearby. No separate seller
                  account needed.
                </p>
                <Link className="seller-primary-button" to="/auth?mode=signup">
                  Sign in to share a find
                </Link>
              </div>
            ) : (
              <div className="seller-workspace">
                <div className="seller-workspace-heading">
                  <div>
                    <span className="marketplace-eyebrow">Your neighborhood finds</span>
                    <h2>Share a good find.</h2>
                    <p>A few thoughtful details help the right person find it.</p>
                  </div>
                  <span className="seller-free-badge">Free to list</span>
                </div>

                <form className="seller-listing-form" onSubmit={handleCreateListing}>
                  <label className="seller-field seller-field-wide">
                    <span>What are you passing along?</span>
                    <input
                      name="title"
                      maxLength={120}
                      required
                      value={listingForm.title}
                      onChange={(event) => setListingForm({ ...listingForm, title: event.target.value })}
                      placeholder="e.g. Solid wood coffee table"
                    />
                  </label>
                  <label className="seller-field">
                    <span>Category</span>
                    <select
                      name="category"
                      value={listingForm.category}
                      onChange={(event) => setListingForm({ ...listingForm, category: event.target.value })}
                    >
                      {categories.filter((item) => item.value !== "all").map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="seller-field">
                    <span>Price · KSh</span>
                    <input
                      name="price"
                      type="number"
                      min="1"
                      max="100000000"
                      step="1"
                      required
                      value={listingForm.price}
                      onChange={(event) => setListingForm({ ...listingForm, price: event.target.value })}
                      placeholder="2500"
                    />
                  </label>
                  <label className="seller-field">
                    <span>Condition</span>
                    <select
                      name="condition"
                      value={listingForm.condition}
                      onChange={(event) => setListingForm({ ...listingForm, condition: event.target.value as ListingCondition })}
                    >
                      <option value="like_new">Like new</option>
                      <option value="good">Good</option>
                      <option value="well_loved">Well loved</option>
                    </select>
                  </label>
                  <label className="seller-field">
                    <span>Neighborhood or general area</span>
                    <input
                      name="neighborhood"
                      maxLength={100}
                      required
                      value={listingForm.neighborhood}
                      onChange={(event) => setListingForm({ ...listingForm, neighborhood: event.target.value })}
                      placeholder="e.g. Kilimani"
                    />
                  </label>
                  <label className="seller-field seller-field-wide">
                    <span>Tell its next owner a little more</span>
                    <textarea
                      name="description"
                      rows={4}
                      maxLength={2000}
                      required
                      value={listingForm.description}
                      onChange={(event) => setListingForm({ ...listingForm, description: event.target.value })}
                      placeholder="Share the details that would help someone love it too."
                    />
                  </label>
                  <label className="seller-field">
                    <span>Photo link <small>Optional for now</small></span>
                    <input
                      name="imageUrl"
                      type="url"
                      maxLength={500}
                      value={listingForm.imageUrl}
                      onChange={(event) => setListingForm({ ...listingForm, imageUrl: event.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="seller-field">
                    <span>
                      Phone number <small>Visible only when phone sharing is on</small>
                      {" · "}<Link to="/settings#privacy">Privacy settings</Link>
                    </span>
                    <input
                      name="contactPhone"
                      type="tel"
                      maxLength={30}
                      value={listingForm.contactPhone}
                      onChange={(event) => setListingForm({ ...listingForm, contactPhone: event.target.value })}
                      placeholder="+254 7..."
                    />
                  </label>

                  <div className="seller-form-note">
                    <span aria-hidden="true">♡</span>
                    <p>
                      Your neighborhood is shown publicly. Meet in a safe public
                      place, and never share payment codes or passwords.
                    </p>
                  </div>
                  {formError && <p className="seller-form-error" role="alert">{formError}</p>}
                  {formMessage && <p className="seller-form-success" role="status">{formMessage}</p>}
                  <button className="seller-primary-button seller-submit" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sharing your find..." : "Share this find"}
                    {!isSubmitting && <span aria-hidden="true">→</span>}
                  </button>
                </form>

                {(myListings.length > 0 || sellerError) && (
                <section className="seller-dashboard" aria-labelledby="seller-listings-title">
                  <div className="seller-dashboard-heading">
                    <div>
                      <span className="marketplace-eyebrow">A little home for your listings</span>
                      <h3 id="seller-listings-title">Your finds</h3>
                    </div>
                    <span>{isLoadingSeller ? "Loading..." : `${myListings.length} listed`}</span>
                  </div>
                  {sellerError && <p className="seller-form-error" role="alert">{sellerError}</p>}
                  {myListings.length > 0 ? (
                    <div className="seller-listing-rows">
                      {myListings.map((listing) => (
                        <article className="seller-listing-row" key={listing.id}>
                          <div>
                            <h4>{listing.title}</h4>
                            <p>{listing.neighborhood} · KSh {listing.price.toLocaleString()}</p>
                          </div>
                          <span className={`seller-listing-status status-${listing.status}`}>
                            {listing.status === "sold"
                              ? "Passed on"
                              : listing.status === "removed"
                                ? "Removed by HomeX"
                                : "Available"}
                          </span>
                          {listing.status !== "removed" && (
                            <button
                              type="button"
                              onClick={() => handleListingStatus(listing)}
                              aria-label={`${listing.status === "sold" ? "Reactivate" : "Mark"} ${listing.title}`}
                            >
                              {listing.status === "sold" ? "Relist" : "Mark as sold"}
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
                )}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default Marketplace;
