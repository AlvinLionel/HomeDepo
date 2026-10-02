import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import appliancesImage from "../assets/categories/appliances.webp";
import entertainmentImage from "../assets/categories/entertainment.webp";
import fitnessImage from "../assets/categories/fitness.webp";
import furnitureImage from "../assets/categories/furniture.webp";
import decorImage from "../assets/categories/home-decor.webp";
import kitchenwareImage from "../assets/categories/kitchenware.webp";
import lightingImage from "../assets/categories/lighting.webp";
import outdoorImage from "../assets/categories/outdoor.webp";
import petsImage from "../assets/categories/pets.webp";
import seasonalImage from "../assets/categories/seasonal.webp";
import textilesImage from "../assets/categories/textiles.webp";
import "../styles/products.css";

type DepartmentGroup = "indoor" | "kitchen" | "outdoor" | "lifestyle" | "seasonal";

interface Department {
    slug: string;
    name: string;
    description: string;
    image: string;
    group: DepartmentGroup;
    searchTerms: string;
}

const departments: Department[] = [
    {
        slug: "furniture",
        name: "Furniture",
        description: "Comfortable, considered pieces for every room.",
        image: furnitureImage,
        group: "indoor",
        searchTerms: "sofas beds tables chairs storage living room bedroom",
    },
    {
        slug: "appliances",
        name: "Appliances",
        description: "Everyday essentials that make home life easier.",
        image: appliancesImage,
        group: "indoor",
        searchTerms: "fridges refrigerators washers laundry electronics",
    },
    {
        slug: "entertainment",
        name: "Entertainment & media",
        description: "Set up a space to watch, listen, play, and unwind.",
        image: entertainmentImage,
        group: "indoor",
        searchTerms: "television tv audio speakers games gaming",
    },
    {
        slug: "kitchenware",
        name: "Kitchen & dining",
        description: "Useful tools and finishing touches for your kitchen.",
        image: kitchenwareImage,
        group: "kitchen",
        searchTerms: "kitchenware cookware utensils dining table",
    },
    {
        slug: "home-decor",
        name: "Home decor",
        description: "Personal details that make a space feel like yours.",
        image: decorImage,
        group: "indoor",
        searchTerms: "decor art plants ornaments accessories",
    },
    {
        slug: "seasonal",
        name: "Seasonal & festive",
        description: "Decorations and essentials for moments throughout the year.",
        image: seasonalImage,
        group: "seasonal",
        searchTerms: "seasonal festive holiday christmas celebration",
    },
    {
        slug: "textiles",
        name: "Bedding & textiles",
        description: "Soft layers, linens, and everyday home comforts.",
        image: textilesImage,
        group: "indoor",
        searchTerms: "textiles bedding linen blankets pillows curtains",
    },
    {
        slug: "lighting",
        name: "Lighting",
        description: "Find the right light for the way you live.",
        image: lightingImage,
        group: "indoor",
        searchTerms: "lamps lighting ceiling lights",
    },
    {
        slug: "outdoor",
        name: "Outdoor & garden",
        description: "Make more of your garden, patio, and outdoor spaces.",
        image: outdoorImage,
        group: "outdoor",
        searchTerms: "outdoor garden patio plants furniture",
    },
    {
        slug: "pets",
        name: "Pet accessories",
        description: "Comforts and essentials for your favourite companions.",
        image: petsImage,
        group: "lifestyle",
        searchTerms: "pets pet accessories cats dogs animals",
    },
    {
        slug: "fitness",
        name: "Fitness & gym",
        description: "Gear to help make your workouts work for you.",
        image: fitnessImage,
        group: "lifestyle",
        searchTerms: "fitness gym exercise workout weights",
    },
];

const filters: { label: string; value: DepartmentGroup | "all" }[] = [
    { label: "All departments", value: "all" },
    { label: "Furniture & living", value: "indoor" },
    { label: "Kitchen & dining", value: "kitchen" },
    { label: "Outdoor", value: "outdoor" },
    { label: "Lifestyle", value: "lifestyle" },
    { label: "Seasonal", value: "seasonal" },
];

function Products() {
    const { categorySlug } = useParams<{ categorySlug: string }>();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<DepartmentGroup | "all">("all");

    useEffect(() => {
        document.body.classList.add("products-page-body");
        return () => document.body.classList.remove("products-page-body");
    }, []);

    const selectedDepartment = departments.find(({ slug }) => slug === categorySlug);
    const visibleDepartments = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

        return departments.filter((department) => {
            const matchesFilter = activeFilter === "all" || department.group === activeFilter;
            const searchableText = `${department.name} ${department.description} ${department.searchTerms}`.toLocaleLowerCase();
            return matchesFilter && (!normalizedQuery || searchableText.includes(normalizedQuery));
        });
    }, [activeFilter, searchQuery]);

    if (categorySlug) {
        return (
            <div className="products-page">
                <Navbar />
                <main className="products-main">
                    <Link className="department-back-link" to="/products">
                        <span aria-hidden="true">←</span> All departments
                    </Link>
                    {selectedDepartment ? (
                        <section className="department-placeholder" aria-labelledby="department-title">
                            <img src={selectedDepartment.image} alt="" />
                            <div className="department-placeholder-copy">
                                <span className="products-eyebrow">Department</span>
                                <h1 id="department-title">{selectedDepartment.name}</h1>
                                <p>
                                    {selectedDepartment.description} The catalogue for this department is
                                    coming soon.
                                </p>
                                <Link className="department-back-button" to="/products">
                                    Browse all departments <span aria-hidden="true">→</span>
                                </Link>
                            </div>
                        </section>
                    ) : (
                        <section className="department-not-found">
                            <span className="products-eyebrow">Department</span>
                            <h1>We can’t find that department</h1>
                            <p>It may have moved, or it may not be available yet.</p>
                            <Link className="department-back-button" to="/products">
                                Browse all departments <span aria-hidden="true">→</span>
                            </Link>
                        </section>
                    )}
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="products-page">
            <Navbar />
            <main className="products-main">
                <header className="products-intro">
                    <span className="products-eyebrow">A little inspiration for every space</span>
                    <h1>Make yourself at home.</h1>
                    <p>Explore thoughtfully chosen departments and find what feels right for your home.</p>
                </header>

                <section className="department-explorer" aria-label="Find a department">
                    <label className="department-search">
                        <svg className="department-search-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="10.8" cy="10.8" r="6.8" />
                            <path d="m16 16 4.2 4.2" />
                        </svg>
                        <span className="visually-hidden">Search departments</span>
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="What are you looking for?"
                        />
                        {searchQuery && (
                            <button
                                className="department-search-clear"
                                type="button"
                                onClick={() => setSearchQuery("")}
                                aria-label="Clear department search"
                            >
                                ×
                            </button>
                        )}
                    </label>

                    <div className="department-filters" aria-label="Quick filters">
                        {filters.map(({ label, value }) => (
                            <button
                                className={`department-filter${activeFilter === value ? " is-active" : ""}`}
                                key={value}
                                type="button"
                                aria-pressed={activeFilter === value}
                                onClick={() => setActiveFilter(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="department-list" aria-labelledby="department-list-title">
                    <div className="department-list-heading">
                        <div>
                            <span className="products-eyebrow">Find your corner of home</span>
                            <h2 id="department-list-title">Browse departments</h2>
                        </div>
                        <p aria-live="polite">
                            {visibleDepartments.length}{" "}
                            {visibleDepartments.length === 1 ? "department" : "departments"}
                        </p>
                    </div>

                    {visibleDepartments.length > 0 ? (
                        <div className="department-grid">
                            {visibleDepartments.map((department) => (
                                <Link
                                    className="department-card"
                                    key={department.slug}
                                    to={`/products/${department.slug}`}
                                >
                                    <div className="department-card-image">
                                        <img src={department.image} alt="" loading="lazy" />
                                    </div>
                                    <div className="department-card-copy">
                                        <h3>{department.name}</h3>
                                        <p>{department.description}</p>
                                        <span className="department-card-link">
                                            Explore department <span aria-hidden="true">→</span>
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="department-empty-state">
                            <h3>No departments found</h3>
                            <p>Try another search or choose a different filter.</p>
                            <button
                                className="department-reset-button"
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setActiveFilter("all");
                                }}
                            >
                                Show all departments
                            </button>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default Products;
