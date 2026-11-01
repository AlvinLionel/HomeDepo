import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import { getTrendArea, saveTrendArea } from "./trends";
import "../styles/services.css";

type ServiceCategory = "appliance_repair" | "cleaning" | "laundry" | "personal_care" | "automotive" | "other";
type DiscoveryCategory =
  | "home_services" | ServiceCategory | "leisure" | "parks" | "playgrounds" | "sports" | "pools" | "trails" | "markets";
type DiscoveryTab = "services" | "leisure";

interface NearbyPlace {
  id: string;
  source: string;
  name: string;
  category: string;
  description: string;
  area: string;
  address: string;
  phone: string | null;
  website: string | null;
  openingHours?: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

interface CommunityService {
  id: number;
  businessName: string;
  category: ServiceCategory;
  description: string;
  area: string;
  address: string;
  phone: string;
  website: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface ServiceSubmissionForm {
  businessName: string;
  category: ServiceCategory;
  description: string;
  area: string;
  address: string;
  phone: string;
  website: string;
  latitude: number | null;
  longitude: number | null;
}

const serviceCategories: { value: ServiceCategory; label: string }[] = [
  { value: "appliance_repair", label: "Appliance & electronics repair" },
  { value: "cleaning", label: "Home cleaning" },
  { value: "laundry", label: "Laundry & dry cleaning" },
  { value: "personal_care", label: "Salons & barbers" },
  { value: "automotive", label: "Garages & auto care" },
  { value: "other", label: "Other home service" },
];

const serviceFilters: { value: DiscoveryCategory; label: string }[] = [
  { value: "home_services", label: "All home services" },
  { value: "appliance_repair", label: "Repair" },
  { value: "cleaning", label: "Cleaning" },
  { value: "laundry", label: "Laundry" },
  { value: "personal_care", label: "Salons & barbers" },
  { value: "automotive", label: "Garages" },
];

const leisureFilters: { value: DiscoveryCategory; label: string }[] = [
  { value: "leisure", label: "All nearby places" },
  { value: "parks", label: "Parks & trails" },
  { value: "playgrounds", label: "Playgrounds" },
  { value: "sports", label: "Courts & turfs" },
  { value: "pools", label: "Swimming pools" },
  { value: "markets", label: "Markets & groceries" },
];

const emptySubmission: ServiceSubmissionForm = {
  businessName: "",
  category: "appliance_repair",
  description: "",
  area: "",
  address: "",
  phone: "",
  website: "",
  latitude: null,
  longitude: null,
};

const categoryLabels: Record<string, string> = {
  appliance: "Appliance shop",
  electronics: "Electronics shop",
  electronics_repair: "Electronics repair",
  cleaning: "Cleaning",
  laundry: "Laundry",
  dry_cleaning: "Dry cleaning",
  hairdresser: "Hairdresser",
  barber: "Barber",
  beauty: "Beauty",
  car_repair: "Car repair",
  tyres: "Tyre shop",
  park: "Park",
  nature_reserve: "Nature reserve",
  garden: "Garden",
  wood: "Nature area",
  beach: "Beach",
  playground: "Playground",
  sports_centre: "Sports centre",
  pitch: "Sports field",
  swimming_pool: "Swimming pool",
  picnic_site: "Picnic spot",
  camp_site: "Camping",
  attraction: "Local attraction",
  hiking: "Hiking route",
  foot: "Walking route",
  marketplace: "Market",
  supermarket: "Supermarket",
  convenience: "Convenience shop",
  greengrocer: "Greengrocer",
  plumber: "Plumber",
  electrician: "Electrician",
};

function getInitialArea() {
  try {
    return getTrendArea();
  } catch (storageError) {
    console.error("Unable to read the saved neighborhood:", storageError);
    return "";
  }
}

function getSafeWebsiteUrl(website: string | null) {
  if (!website) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function Services() {
  const token = localStorage.getItem("homexToken");
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("services");
  const [category, setCategory] = useState<DiscoveryCategory>("home_services");
  const [area, setArea] = useState(getInitialArea);
  const [radiusKm, setRadiusKm] = useState("5");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [submissions, setSubmissions] = useState<CommunityService[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(Boolean(token));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingServiceLocation, setIsGettingServiceLocation] = useState(false);
  const [submission, setSubmission] = useState(emptySubmission);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionListError, setSubmissionListError] = useState("");

  useEffect(() => {
    document.body.classList.add("services-page-body");
    return () => document.body.classList.remove("services-page-body");
  }, []);

  useEffect(() => {
    let active = true;
    if (!token) {
      setIsLoadingSubmissions(false);
      return () => { active = false; };
    }

    const loadSubmissions = async () => {
      try {
        const response = await fetch("/api/services/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load your service submissions.");
        if (active) {
          setSubmissions(data.services);
          setSubmissionListError("");
        }
      } catch (error) {
        if (active) {
          setSubmissionListError(error instanceof Error ? error.message : "Unable to load your service submissions.");
        }
      } finally {
        if (active) setIsLoadingSubmissions(false);
      }
    };

    void loadSubmissions();
    return () => { active = false; };
  }, [token]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!coordinates && area.trim().length < 2) {
      setSearchError("Use your location or enter an area to discover nearby places.");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    const params = new URLSearchParams({ category, radiusKm });
    if (coordinates) {
      params.set("lat", String(coordinates.latitude));
      params.set("lng", String(coordinates.longitude));
    } else {
      params.set("area", area.trim());
    }

    try {
      const response = await fetch(`/api/places/search?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to search for nearby places.");
      setPlaces(data.places);
      setHasSearched(true);
      if (!coordinates) {
        try {
          saveTrendArea(area.trim());
        } catch (storageError) {
          console.error("Unable to cache the searched neighborhood:", storageError);
        }
      }
    } catch (error) {
      setPlaces([]);
      setHasSearched(true);
      setSearchError(error instanceof Error ? error.message : "Unable to search for nearby places.");
    } finally {
      setIsSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location services.");
      return;
    }
    setIsGettingLocation(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError("");
        setIsGettingLocation(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Location permission was denied. You can still search by area.",
          2: "Your location could not be determined right now.",
          3: "Location request timed out. Please try again.",
        };
        setLocationError(messages[error.code] || "Unable to get your location.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const useServiceLocation = () => {
    if (!navigator.geolocation) {
      setSubmissionError("Your browser does not support location services.");
      return;
    }
    setIsGettingServiceLocation(true);
    setSubmissionError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        try {
          const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });
          const response = await fetch(`/api/location/reverse?${params.toString()}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Unable to look up that service address.");
          setSubmission((current) => ({
            ...current,
            latitude,
            longitude,
            address: data.address || current.address,
            area: data.area || current.area,
          }));
        } catch (error) {
          setSubmissionError(error instanceof Error ? error.message : "Unable to look up that service address.");
        } finally {
          setIsGettingServiceLocation(false);
        }
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Location permission was denied. Enable it or try again.",
          2: "Your location could not be determined right now.",
          3: "Location request timed out. Please try again.",
        };
        setSubmissionError(messages[error.code] || "Unable to get your current location.");
        setIsGettingServiceLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const submitService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    if (submission.latitude === null || submission.longitude === null) {
      setSubmissionError("Add your current location so people can find your service nearby.");
      return;
    }
    setIsSubmitting(true);
    setSubmissionError("");
    setSubmissionMessage("");
    try {
      const response = await fetch("/api/services/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submission),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to submit your service.");
      setSubmissionMessage(data.message);
      setSubmission(emptySubmission);
      try {
        const refreshResponse = await fetch("/api/services/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const refreshed = await refreshResponse.json();
        if (!refreshResponse.ok) throw new Error(refreshed.message || "Unable to refresh your submissions.");
        setSubmissions(refreshed.services);
        setSubmissionListError("");
      } catch (refreshError) {
        setSubmissionListError(
          refreshError instanceof Error
            ? refreshError.message
            : "Your submission was received, but its status could not be refreshed.",
        );
      }
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Unable to submit your service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filters = activeTab === "services" ? serviceFilters : leisureFilters;

  return (
    <div className="services-page">
      <Navbar />
      <main className="services-main">
        <header className="services-hero">
          <span className="services-eyebrow">Good things are closer than you think</span>
          <h1>Find a helping hand.<br /><em>Or a little more outside.</em></h1>
          <p>Discover trusted-to-the-map local businesses and easy places to spend time together. Start with your neighborhood or use your current location.</p>
        </header>

        <section className="services-discovery" aria-labelledby="services-discovery-title">
          <div className="services-tabs" role="tablist" aria-label="Nearby discovery">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "services"}
              onClick={() => {
                setActiveTab("services");
                setCategory("home_services");
                setPlaces([]);
                setHasSearched(false);
              }}
            >
              Help around home
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "leisure"}
              onClick={() => {
                setActiveTab("leisure");
                setCategory("leisure");
                setPlaces([]);
                setHasSearched(false);
              }}
            >
              Places to enjoy
            </button>
          </div>

          <div className="services-search-panel">
            <div className="services-section-heading">
              <span className="services-eyebrow">{activeTab === "services" ? "Everyday help, close to home" : "Make a day of it"}</span>
              <h2 id="services-discovery-title">
                {activeTab === "services" ? "Find a local service" : "Find your next nearby outing"}
              </h2>
              <p>
                {activeTab === "services"
                  ? "Look for appliance repair, cleaners, laundry, hair care, garages and more."
                  : "Explore parks, playgrounds, walking trails, courts, pools, markets and family-friendly places."}
              </p>
            </div>

            <form className="services-search-form" onSubmit={(event) => void handleSearch(event)}>
              <label className="services-area-field">
                <span>Neighborhood or area</span>
                <input
                  value={area}
                  onChange={(event) => {
                    setArea(event.target.value);
                    setCoordinates(null);
                  }}
                  placeholder="For example, Westlands or Kilimani"
                  maxLength={100}
                />
              </label>
              <button
                type="button"
                className="services-location-button"
                onClick={useMyLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? "Finding you…" : coordinates ? "Using your location" : "Use my location"}
              </button>
              <label className="services-category-field">
                <span>Looking for</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as DiscoveryCategory)}
                >
                  {filters.map((filter) => <option value={filter.value} key={filter.value}>{filter.label}</option>)}
                </select>
              </label>
              <label className="services-radius-field">
                <span>Within</span>
                <select value={radiusKm} onChange={(event) => setRadiusKm(event.target.value)}>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="15">15 km</option>
                  <option value="25">25 km</option>
                </select>
              </label>
              <button className="services-search-button" type="submit" disabled={isSearching}>
                {isSearching ? "Looking nearby…" : "Find nearby"}
              </button>
            </form>

            {locationError && <p className="services-error" role="alert">{locationError}</p>}
            {searchError && <p className="services-error" role="alert">{searchError}</p>}
            <p className="services-data-note">
              Nearby places come from OpenStreetMap and community submissions reviewed by HomeX. Map details can be incomplete, and approval does not mean a provider is background-checked. Location is used for this search and is not saved.
            </p>
          </div>

          {isSearching ? (
            <p className="services-status" role="status">Finding places around your area…</p>
          ) : hasSearched && places.length === 0 ? (
            <section className="services-empty">
              <span aria-hidden="true">⌖</span>
              <h2>Nothing mapped nearby yet.</h2>
              <p>Try a wider radius, another category, or suggest a local service below.</p>
            </section>
          ) : places.length > 0 ? (
            <section className="services-results" aria-label="Nearby results">
              <div className="services-results-heading">
                <h2>{places.length} {places.length === 1 ? "place" : "places"} nearby</h2>
                <span>Within {radiusKm} km</span>
              </div>
              <div className="services-result-grid">
                {places.map((place) => {
                  const website = getSafeWebsiteUrl(place.website);
                  const categoryLabel = categoryLabels[place.category] || place.category.replaceAll("_", " ");
                  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
                  return (
                    <article className="services-result-card" key={place.id}>
                      <div className="services-result-topline">
                        <span className="services-category-pill">{categoryLabel}</span>
                        <span className={`services-source ${place.source === "HomeX community" ? "is-community" : ""}`}>
                          {place.source === "HomeX community" ? "Community listed" : "Open map data"}
                        </span>
                      </div>
                      <h3>{place.name}</h3>
                      {place.description && <p className="services-result-description">{place.description}</p>}
                      <p className="services-result-address">
                        <span aria-hidden="true">⌖</span>
                        {place.address || place.area || "Address not available"}
                      </p>
                      <p className="services-distance">{place.distanceKm.toFixed(1)} km from your search area</p>
                      {place.openingHours && <p className="services-hours">Hours: {place.openingHours}</p>}
                      {place.source === "HomeX community" && (
                        <p className="services-review-note">Reviewed for listing details; service credentials are not independently verified.</p>
                      )}
                      <div className="services-result-actions">
                        {place.phone && <a href={`tel:${place.phone}`}>Call</a>}
                        {website && <a href={website} target="_blank" rel="noreferrer">Website</a>}
                        <a href={directions} target="_blank" rel="noreferrer">Directions</a>
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="services-attribution">
                Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
              </p>
            </section>
          ) : (
            <p className="services-start-hint">Search a neighborhood to see nearby recommendations.</p>
          )}
        </section>

        <section className="services-contribute" aria-labelledby="services-contribute-title">
          <div className="services-contribute-heading">
            <span className="services-eyebrow">A good neighbor is good for business</span>
            <h2 id="services-contribute-title">Offer a local home service?</h2>
            <p>Add your service to help people nearby find you. Every submission is reviewed before it appears in search.</p>
          </div>
          {!token ? (
            <div className="services-sign-in">
              <p>Sign in with your regular HomeX account to suggest a service. There’s no separate provider account.</p>
              <Link to="/auth?mode=login" className="services-submit-button">Sign in to add a service</Link>
            </div>
          ) : (
            <div className="services-contribute-layout">
              <form className="services-submission-form" onSubmit={(event) => void submitService(event)}>
                <label>
                  <span>Service or business name</span>
                  <input required minLength={2} maxLength={150} value={submission.businessName} onChange={(event) => setSubmission({ ...submission, businessName: event.target.value })} />
                </label>
                <label>
                  <span>Type of service</span>
                  <select value={submission.category} onChange={(event) => setSubmission({ ...submission, category: event.target.value as ServiceCategory })}>
                    {serviceCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Area you serve</span>
                  <input required minLength={2} maxLength={100} value={submission.area} onChange={(event) => setSubmission({ ...submission, area: event.target.value })} placeholder="Neighborhood or town" />
                </label>
                <label>
                  <span>Public contact phone</span>
                  <input required type="tel" maxLength={30} value={submission.phone} onChange={(event) => setSubmission({ ...submission, phone: event.target.value })} />
                </label>
                <label className="services-form-wide">
                  <span>Service address or location description</span>
                  <input required minLength={2} maxLength={255} value={submission.address} onChange={(event) => setSubmission({ ...submission, address: event.target.value })} placeholder="Shop address or area you travel to" />
                </label>
                <div className="services-location-entry services-form-wide">
                  <button type="button" className="services-location-button" onClick={useServiceLocation} disabled={isGettingServiceLocation}>
                    {isGettingServiceLocation ? "Finding your location…" : submission.latitude === null ? "Add my current location" : "Update map location"}
                  </button>
                  <span>{submission.latitude === null ? "A location pin is required so nearby customers can find you." : "Location pin added. You can edit the public address above."}</span>
                </div>
                <p className="services-location-disclosure services-form-wide">
                  Use a public business or work location, not your private home address. Your approved map pin, address, and phone number will be visible to nearby shoppers.
                </p>
                <label className="services-form-wide">
                  <span>What do you offer?</span>
                  <textarea required minLength={10} maxLength={2000} rows={4} value={submission.description} onChange={(event) => setSubmission({ ...submission, description: event.target.value })} />
                </label>
                <label className="services-form-wide">
                  <span>Website <small>Optional</small></span>
                  <input type="url" maxLength={500} value={submission.website} onChange={(event) => setSubmission({ ...submission, website: event.target.value })} placeholder="https://" />
                </label>
                {submissionError && <p className="services-error services-form-wide" role="alert">{submissionError}</p>}
                {submissionMessage && <p className="services-success services-form-wide" role="status">{submissionMessage}</p>}
                <button className="services-submit-button services-form-wide" type="submit" disabled={isSubmitting || isGettingServiceLocation}>
                  {isSubmitting ? "Sending for review…" : "Submit for review"}
                </button>
              </form>

              <aside className="services-submission-aside">
                <h3>What happens next?</h3>
                <ol>
                  <li>We check that the details are complete and appropriate.</li>
                  <li>Your listing appears in nearby home-service searches after approval.</li>
                  <li>People contact you directly using the public details you provide.</li>
                </ol>
                <p>Only list services you’re authorized to offer. Approval reviews listing details; it is not a professional license or background check.</p>
                <h3>Your suggestions</h3>
                {isLoadingSubmissions ? (
                  <p role="status">Loading your submissions…</p>
                ) : submissionListError ? (
                  <p className="services-error" role="alert">{submissionListError}</p>
                ) : submissions.length === 0 ? (
                  <p>Your submitted services and their review status will appear here.</p>
                ) : (
                  <ul className="services-submission-list">
                    {submissions.map((item) => (
                      <li key={item.id}>
                        <span>{item.businessName}</span>
                        <strong className={`submission-status status-${item.status}`}>{item.status}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Services;
