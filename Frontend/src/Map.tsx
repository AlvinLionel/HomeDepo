import React, { useState, useEffect, useRef } from "react";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import "../styles/map.css";

interface Store {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category: string;
    type: string;
    website: string | null;
    phone: string | null;
    openingHours: string | null;
}

interface StoreWithDistance extends Store {
    distanceKm: number | null;
    websiteUrl: string | null;
}
interface UserLocation {
    lat: number;
    lng: number;
}

const getMapEmbedUrl = (latitude: number, longitude: number) => {
    const mapPadding = 0.01;

    const bbox = [
        longitude - mapPadding,
        latitude - mapPadding,
        longitude + mapPadding,
        latitude + mapPadding,
    ].join(",");
    const params = new URLSearchParams({
        bbox,
        layer: "mapnik",
        marker: `${latitude},${longitude}`,
    });

    return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
};

const getWebsiteUrl = (website: string | null) => {
    if (!website) return null;

    const urlWithProtocol = /^https?:\/\//i.test(website) ? website : `https://${website}`;

    try {
        const url = new URL(urlWithProtocol);

        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
};

function Map() {
    const [searchQuery, setSearchQuery] = useState("");
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState("");
    const [manualLocation, setManualLocation] = useState("");

    useEffect(() => {
        document.body.classList.add("home-page");
        return () => document.body.classList.remove("home-page");
    }, []);

    const mapPanelRef = useRef<HTMLElement | null>(null);
    const handleViewOnMap = (event: React.MouseEvent<HTMLButtonElement>, store: Store) => {
        event.stopPropagation();
        setSelectedStore(store);

        mapPanelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const calculateDistanceKm = (from: UserLocation, to: Pick<Store, "latitude" | "longitude">) => {
        const earthRadiusKm = 6371;
        const latitudeDifference = ((to.latitude - from.lat) * Math.PI) / 180;
        const longitudeDifference = ((to.longitude - from.lng) * Math.PI) / 180;

        const a =
            Math.sin(latitudeDifference / 2) ** 2 +
            Math.cos((from.lat * Math.PI) / 180) *
            Math.cos((to.latitude * Math.PI) / 180) *
            Math.sin(longitudeDifference / 2) ** 2;

        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const displayedStores: StoreWithDistance[] = stores
        .map((store) => ({
            ...store,
            distanceKm: userLocation ? calculateDistanceKm(userLocation, store) : null,
            websiteUrl: getWebsiteUrl(store.website),
        }))
        .sort((firstStore, secondStore) => {
            if (firstStore.distanceKm === null || secondStore.distanceKm === null) return 0;

            return firstStore.distanceKm - secondStore.distanceKm;
        });

    const closestStore = displayedStores[0] ?? null;

    const getBadges = (store: StoreWithDistance) => {
        const badges: string[] = [];

        if (store.id === closestStore?.id && userLocation) badges.push("Closest");

        return badges;
    };

    const handleDirections = (e: React.MouseEvent, address: string) => {
        e.stopPropagation();
        window.open(
            `https://www.google.com/maps/search/${encodeURIComponent(address)}`, "_blank"
        );
    };

    const handleStoreSearch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = searchQuery.trim();

        if (query.length < 2) {
            setSearchError("Enter at least two characters to search for stores.");
            return;
        }

        setIsSearching(true);
        setSearchError("");

        const params = new URLSearchParams({ q: query });

        if (userLocation) {
            params.set("lat", String(userLocation.lat));
            params.set("lng", String(userLocation.lng));
        } else {
            const location = manualLocation.trim();

            if (location.length < 2) {
                setSearchError("Use your location or enter a city, town, or area to search nearby stores.");
                return;
            }

            params.set("location", location);
        }

        try {
            const response = await fetch(`/api/stores/search?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Unable to search for stores.");
            }

            setStores(data.stores);
            setSelectedStore(data.stores[0] ?? null);
            setHasSearched(true);
        } catch (error) {
            setStores([]);
            setSelectedStore(null);
            setSearchError(
                error instanceof Error ? error.message : "Unable to search for stores."
            );
            setHasSearched(true);
        } finally {
            setIsSearching(false);
        }
    };

    const requestUserLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Your browser does not support location services.");
            return;
        }

        setIsGettingLocation(true);
        setLocationError("");

        navigator.geolocation.getCurrentPosition((position) => {
            setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });
            setIsGettingLocation(false);
        },
            (error) => {
                const errorMessages: Record<number, string> = {
                    1: "Location permission was denied. You can still search by place name.",
                    2: "Your location could not be determined right now.",
                    3: "Location request timed out. Please try again.",
                };

                setLocationError(errorMessages[error.code] || "Unable to get your location.");
                setIsGettingLocation(false);
            },
            {
                enableHighAccuracy: false,
                timeout: 10_000,
                maximumAge: 300_000,
            }
        );
    };

    return (
        <div className="map-page">
            <Navbar />
            <div className="map-header">
                <div className="map-header-content">
                    <h1>Find Stores & Services</h1>
                    <form className="search-wrapper" onSubmit={handleStoreSearch}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by store name, address, or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="search-submit"
                            disabled={isSearching}
                        >
                            {isSearching ? "Searching..." : "Search"}
                        </button>
                    </form>
                    <div className="location-controls">
                        <button
                            type="button"
                            className="location-button"
                            onClick={requestUserLocation}
                            disabled={isGettingLocation}
                        >
                            {isGettingLocation
                                ? "Finding your location..."
                                : userLocation
                                    ? "Location ready"
                                    : "Use my location"}
                        </button>

                        {userLocation && (
                            <p className="location-status">Your location is ready for nearby store searches.</p>
                        )}
                        {locationError && (
                            <p className="location-error" role="alert">{locationError}</p>
                        )}
                    </div>
                    {!userLocation && (
                        <div className="manual-location">
                            <label htmlFor="manualLocation">
                                Search near a city, town, or area
                            </label>

                            <input
                                id="manualLocation"
                                type="text"
                                value={manualLocation}
                                onChange={(event) => setManualLocation(event.target.value)}
                                placeholder="For example: Nairobi, Westlands, or Mombasa"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="map-container">
                <section className="results-panel">
                    <div className="results-header">
                        <h2>Results ({displayedStores.length})</h2>
                        <span className="filter-chip"> {userLocation ? "Near you" : "Location not set"} </span>
                    </div>

                    <div className="stores-list">
                        {displayedStores.length > 0 ? (
                            displayedStores.map((store) => (
                                <div
                                    key={store.id}
                                    className={`store-card ${selectedStore?.id === store.id ? "active" : ""} `}
                                    onClick={() => setSelectedStore(store)}
                                >
                                    <div className="store-header">
                                        <div className="store-title-section">
                                            <h3>{store.name}</h3>
                                            <span className="store-type">{store.type}</span>
                                        </div>
                                        <div className="store-badges">
                                            {getBadges(store).map((badge) => (
                                                <span
                                                    key={badge}
                                                    className={`badge badge-${badge
                                                        .toLowerCase()
                                                        .replace(" ", "-")}`}
                                                >
                                                    {badge === "Closest" && "📍"}
                                                    {badge === "Top Rated" && "⭐"}
                                                    {badge === "Open Now" && "🟢"}
                                                    {" "}
                                                    {badge}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="store-address">📍 {store.address}</p>

                                    <div className="store-meta">
                                        <div className="rating">
                                            <span className="store-category"> {store.category} · {store.type} </span>
                                        </div>
                                        {store.distanceKm !== null && (
                                            <span className="distance"> {store.distanceKm.toFixed(1)} km away </span>
                                        )}
                                    </div>

                                    <p className="store-hours">🕐 {store.openingHours || "Opening hours unavailable"}</p>

                                    <div className="store-actions">
                                        {store.phone && (
                                            <a
                                                className="action-btn call-btn"
                                                href={`tel:${store.phone}`}
                                                onClick={(event) => event.stopPropagation()}
                                                title={`Call ${store.name}`}
                                                aria-label={`Call ${store.name}`}
                                            >
                                                📞
                                            </a>
                                        )}

                                        <button
                                            className="action-btn directions-btn"
                                            onClick={(event) => handleDirections(event, store.address)}
                                            title="Get directions"
                                        >
                                            🗺️
                                        </button>

                                        {store.websiteUrl && (
                                            <a
                                                className="action-btn website-btn"
                                                href={store.websiteUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(event) => event.stopPropagation()}
                                                title={`Visit ${store.name} website`}
                                                aria-label={`Visit ${store.name} website`}
                                            >
                                                🌐
                                            </a>
                                        )}

                                        <button
                                            className="view-button"
                                            onClick={(event) => handleViewOnMap(event, store)}
                                        >
                                            View on Map
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            hasSearched ? (
                                <div className="no-results">
                                    <p>No stores found matching your search.</p>
                                    <p className="hint">Try another store type, business name, or location.</p>
                                </div>
                            ) : (
                                <div className="no-results">
                                    <p>Search for a nearby store or service to get started.</p>
                                </div>
                            )
                        )}
                    </div>
                </section>

                <section className="map-panel" ref={mapPanelRef}>
                    <div className="map-wrapper">
                        {selectedStore && (
                            <>
                                <div className="selected-store-info">
                                    <h3>{selectedStore.name}</h3>
                                    <p>{selectedStore.address}</p>
                                </div>
                                <iframe
                                    className="map-iframe"
                                    src={getMapEmbedUrl(selectedStore.latitude, selectedStore.longitude)}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                                <p className="map-attribution">
                                    ©{" "} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"> OpenStreetMap contributors</a>
                                </p>
                            </>
                        )}
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
}

export default Map;