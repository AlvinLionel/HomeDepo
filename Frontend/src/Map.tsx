import React, { useState, useEffect, useRef } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import "leaflet/dist/leaflet.css";
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

const storeMapIcon = divIcon({
    className: "map-store-marker-icon",
    html: '<span class="map-store-marker"></span>',
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    popupAnchor: [0, -32],
});

const userMapIcon = divIcon({
    className: "map-user-marker-icon",
    html: '<span class="map-user-marker"><span></span></span>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

function MapViewport({ selectedStore, userLocation }: {
    selectedStore: Store | null;
    userLocation: UserLocation | null;
}) {
    const map = useMap();

    useEffect(() => {
        const target = selectedStore
            ? [selectedStore.latitude, selectedStore.longitude] as [number, number]
            : userLocation
                ? [userLocation.lat, userLocation.lng] as [number, number]
                : null;
        if (target) map.setView(target, Math.max(map.getZoom(), 14), { animate: true });
    }, [map, selectedStore?.id, userLocation?.lat, userLocation?.lng]);

    return null;
}

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

    const handleDirections = (e: React.MouseEvent, store: Store) => {
        e.stopPropagation();
        window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`, "_blank"
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
                    <p className="map-header-note">Select a result or map pin to see where it is. Place names, hours, and contact details depend on OpenStreetMap coverage.</p>
                    <form className="search-wrapper" onSubmit={handleStoreSearch}>
                        <input type="text" className="search-input" placeholder="Search by store name, address, or type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        <button type="submit" className="search-submit" disabled={isSearching}>
                            {isSearching ? "Searching..." : "Search"}
                        </button>
                    </form>
                    <div className="location-controls">
                        <button type="button" className="location-button" onClick={requestUserLocation} disabled={isGettingLocation}>
                            {isGettingLocation
                                ? "Finding your location..."
                                : userLocation
                                    ? "Location ready"
                                    : "Use my location"}
                        </button>

                        {userLocation && (<p className="location-status">Your location is ready for nearby store searches.</p>)}
                        {locationError && (<p className="location-error" role="alert">{locationError}</p>)}
                    </div>
                    {!userLocation && (
                        <div className="manual-location">
                            <label htmlFor="manualLocation">Search near a city, town, or area</label>
                            <input id="manualLocation" type="text" value={manualLocation} onChange={(event) => setManualLocation(event.target.value)} placeholder="For example: Nairobi, Westlands, or Mombasa" />
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
                                <div key={store.id} className={`store-card ${selectedStore?.id === store.id ? "active" : ""}`}>
                                    <div className="store-header">
                                        <div className="store-title-section">
                                            <button
                                                type="button"
                                                className="store-select-button"
                                                aria-pressed={selectedStore?.id === store.id}
                                                onClick={() => setSelectedStore(store)}
                                            >
                                                <h3>{store.name}</h3>
                                                <span className="store-type">{store.type}</span>
                                            </button>
                                        </div>
                                        <div className="store-badges">
                                            {getBadges(store).map((badge) => (
                                                <span key={badge} className={`badge badge-${badge.toLowerCase().replace(" ", "-")}`}>
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

                                        <button className="action-btn directions-btn" onClick={(event) => handleDirections(event, store)} title="Get directions">
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

                                        <button className="view-button" onClick={(event) => handleViewOnMap(event, store)}>
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
                        {(selectedStore || userLocation) ? (
                            <>
                                <div className="selected-store-info">
                                    <div>
                                        <span className="map-selected-eyebrow">
                                            {selectedStore ? "Selected nearby place" : "Your location"}
                                        </span>
                                        <h3>{selectedStore?.name || "You are here"}</h3>
                                        <p>{selectedStore?.address || "Nearby search center"}</p>
                                    </div>
                                    {displayedStores.length > 1 && (
                                        <span className="map-pin-count">{displayedStores.length} map pins</span>
                                    )}
                                </div>
                                <div className="map-canvas">
                                    <MapContainer
                                        center={selectedStore
                                            ? [selectedStore.latitude, selectedStore.longitude]
                                            : [userLocation!.lat, userLocation!.lng]}
                                        zoom={14}
                                        scrollWheelZoom={false}
                                        className="map-leaflet"
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <MapViewport selectedStore={selectedStore} userLocation={userLocation} />
                                        {displayedStores.map((store) => (
                                            <Marker
                                                key={store.id}
                                                position={[store.latitude, store.longitude]}
                                                icon={storeMapIcon}
                                                eventHandlers={{ click: () => setSelectedStore(store) }}
                                            >
                                                <Popup>
                                                    <strong>{store.name}</strong><br />
                                                    <span>{store.address}</span>
                                                </Popup>
                                            </Marker>
                                        ))}
                                        {userLocation && (
                                            <Marker position={[userLocation.lat, userLocation.lng]} icon={userMapIcon} zIndexOffset={1000}>
                                                <Popup>Your current search location</Popup>
                                            </Marker>
                                        )}
                                    </MapContainer>
                                </div>
                            </>
                        ) : hasSearched ? (
                            <div className="map-empty">
                                <span aria-hidden="true">⌖</span>
                                <p>A map pin will appear when a place is selected.</p>
                            </div>
                        ) : (
                            <div className="map-empty">
                                <span aria-hidden="true">⌖</span>
                                <p>Search for a place to see its map and nearby pins.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
}

export default Map;