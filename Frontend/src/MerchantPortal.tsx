import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import "../styles/merchant.css";

interface MerchantApplication {
  id: number;
  storeName: string;
  description: string;
  address: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface MerchantStore {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string | null;
}

interface MerchantDashboard {
  application: MerchantApplication | null;
  stores: MerchantStore[];
}

const emptyApplication = {
  storeName: "",
  description: "",
  address: "",
  phone: "",
};

const csvTemplate = [
  "sku,name,department_slug,description,brand,unit,image_url,price,stock_quantity",
  'CHAIR-001,"Wooden dining chair",furniture,"Solid timber chair",Acme,piece,https://example.com/chair.jpg,7500,8',
].join("\n");

function MerchantPortal() {
  const token = localStorage.getItem("homexToken");
  const [dashboard, setDashboard] = useState<MerchantDashboard>({ application: null, stores: [] });
  const [applicationForm, setApplicationForm] = useState(emptyApplication);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [uploadingStoreId, setUploadingStoreId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | undefined>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.classList.add("merchant-page-body");
    return () => document.body.classList.remove("merchant-page-body");
  }, []);

  useEffect(() => {
    let active = true;
    if (!token) return () => { active = false; };

    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/merchant/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load the store workspace.");
        if (active) setDashboard(data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load the store workspace.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadDashboard();
    return () => { active = false; };
  }, [token]);

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    setIsSubmittingApplication(true);
    try {
      const response = await fetch("/api/merchant/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(applicationForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to submit your application.");
      const dashboardResponse = await fetch("/api/merchant/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dashboardData = await dashboardResponse.json();
      if (!dashboardResponse.ok) throw new Error(dashboardData.message || "Application submitted but workspace status could not refresh.");
      setDashboard(dashboardData);
      setMessage(data.message);
      setApplicationForm(emptyApplication);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your application.");
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const importInventory = async (storeId: number) => {
    const file = selectedFiles[storeId];
    if (!token || !file) {
      setError("Choose a CSV file first.");
      return;
    }
    setError("");
    setMessage("");
    setUploadingStoreId(storeId);
    try {
      const csv = await file.text();
      const response = await fetch(`/api/merchant/stores/${storeId}/inventory/import`, {
        method: "POST",
        headers: { "Content-Type": "text/csv", Authorization: `Bearer ${token}` },
        body: csv,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to import this inventory file.");
      setMessage(data.message);
      setSelectedFiles((current) => ({ ...current, [storeId]: undefined }));
      const input = document.getElementById(`inventory-${storeId}`) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import this inventory file.");
    } finally {
      setUploadingStoreId(null);
    }
  };

  const downloadTemplate = () => {
    const fileUrl = URL.createObjectURL(new Blob([csvTemplate], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = "homex-inventory-template.csv";
    link.click();
    URL.revokeObjectURL(fileUrl);
  };

  return (
    <div className="merchant-page">
      <Navbar />
      <main className="merchant-main">
        <header className="merchant-hero">
          <span className="merchant-eyebrow">For the people behind local shops</span>
          <h1>Bring your store<br /><em>to the neighborhood.</em></h1>
          <p>Apply to add your business to HomeX. After our team reviews your details, you can import and update your own product catalog.</p>
        </header>

        {message && <p className="merchant-message" role="status">{message}</p>}
        {error && <p className="merchant-error" role="alert">{error}</p>}

        {!token ? (
          <section className="merchant-panel merchant-sign-in">
            <h2>Start with your HomeX account.</h2>
            <p>Store tools are separate from peer-to-peer reselling, but use the same HomeX sign-in.</p>
            <Link to="/auth?mode=signup" className="merchant-primary-button">Sign in or create an account</Link>
          </section>
        ) : isLoading ? (
          <p className="merchant-panel" role="status">Loading your store workspace…</p>
        ) : dashboard.stores.length > 0 ? (
          <section className="merchant-stores">
            <div className="merchant-section-heading">
              <div>
                <span className="merchant-eyebrow">Your approved stores</span>
                <h2>Manage your catalog</h2>
              </div>
              <button type="button" className="merchant-template-button" onClick={downloadTemplate}>Download CSV template</button>
            </div>
            <p className="merchant-csv-guide">
              Include one product per row. Required headers, in order: <code>sku,name,department_slug,description,brand,unit,image_url,price,stock_quantity</code>.
              Supported departments: furniture, appliances, entertainment, kitchenware, home-decor, seasonal, textiles, lighting, outdoor, pets, fitness.
              Imports contain at most 500 products; matching store SKUs update price and stock, while new SKUs are linked to a matching catalog item or create one.
            </p>
            {dashboard.stores.map((store) => (
              <article className="merchant-panel merchant-store-card" key={store.id}>
                <div>
                  <span className="merchant-eyebrow">{store.address}</span>
                  <h3>{store.name}</h3>
                  <p>{store.description}</p>
                </div>
                <label className="merchant-file-field" htmlFor={`inventory-${store.id}`}>
                  <span>Choose an inventory CSV</span>
                  <input
                    id={`inventory-${store.id}`}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => setSelectedFiles((current) => ({
                      ...current,
                      [store.id]: event.target.files?.[0],
                    }))}
                  />
                </label>
                <button
                  type="button"
                  className="merchant-primary-button"
                  disabled={!selectedFiles[store.id] || uploadingStoreId !== null}
                  onClick={() => void importInventory(store.id)}
                >
                  {uploadingStoreId === store.id ? "Importing…" : "Import inventory"}
                </button>
              </article>
            ))}
          </section>
        ) : dashboard.application?.status === "pending" ? (
          <section className="merchant-panel merchant-application-status">
            <span className="merchant-status-badge">Under review</span>
            <h2>{dashboard.application.storeName}</h2>
            <p>Thanks for applying. Your store workspace and catalog import will be available once a HomeX moderator approves the application.</p>
            <p className="merchant-submission-date">Submitted {new Date(dashboard.application.createdAt).toLocaleDateString()}</p>
          </section>
        ) : (
          <section className="merchant-panel merchant-application-panel">
            <div className="merchant-section-heading">
              <div>
                <span className="merchant-eyebrow">A quick introduction</span>
                <h2>{dashboard.application?.status === "rejected" ? "Update your details and reapply" : "Apply to list your store"}</h2>
              </div>
            </div>
            <p>We review each store before granting catalog access. Include details that help us verify the business and avoid duplicate store records.</p>
            <form className="merchant-application-form" onSubmit={(event) => void submitApplication(event)}>
              <label>
                <span>Store name</span>
                <input required maxLength={150} value={applicationForm.storeName} onChange={(event) => setApplicationForm({ ...applicationForm, storeName: event.target.value })} />
              </label>
              <label>
                <span>Public store address</span>
                <input required maxLength={255} value={applicationForm.address} onChange={(event) => setApplicationForm({ ...applicationForm, address: event.target.value })} />
              </label>
              <label>
                <span>Store phone</span>
                <input required type="tel" maxLength={30} value={applicationForm.phone} onChange={(event) => setApplicationForm({ ...applicationForm, phone: event.target.value })} />
              </label>
              <label className="merchant-field-wide">
                <span>What does your store offer?</span>
                <textarea required maxLength={2000} rows={4} value={applicationForm.description} onChange={(event) => setApplicationForm({ ...applicationForm, description: event.target.value })} />
              </label>
              <button className="merchant-primary-button merchant-field-wide" disabled={isSubmittingApplication}>
                {isSubmittingApplication ? "Sending for review…" : "Submit store application"}
              </button>
            </form>
          </section>
        )}

        <p className="merchant-footnote">
          Selling your own pre-loved items is different: use <Link to="/marketplace?mode=sell">Share a find</Link> with your regular HomeX account. You don’t need a store application or a second account.
        </p>
      </main>
      <Footer />
    </div>
  );
}

export default MerchantPortal;
