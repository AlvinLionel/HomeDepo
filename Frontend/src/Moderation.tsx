import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import "../styles/moderation.css";

interface ListingReport {
  id: number;
  listingId: number;
  reason: string;
  details: string;
  createdAt: string;
  title: string;
  description: string;
  neighborhood: string;
  listingStatus: string;
  reporterName: string;
  sellerName: string;
  sellerEmail: string;
}

interface MerchantApplication {
  id: number;
  storeName: string;
  description: string;
  address: string;
  phone: string;
  createdAt: string;
  applicantName: string;
  applicantEmail: string;
}

interface CommunityService {
  id: number;
  businessName: string;
  category: string;
  description: string;
  area: string;
  address: string;
  phone: string;
  website: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  submitterName: string;
  submitterEmail: string;
}

const reportReasons: Record<string, string> = {
  scam: "Possible scam or fraud",
  counterfeit: "Counterfeit or fake item",
  misleading: "Misleading description or photos",
  prohibited: "Prohibited or unsafe item",
  suspicious_contact: "Suspicious payment or contact request",
  other: "Other",
};

const communityServiceCategories: Record<string, string> = {
  appliance_repair: "Appliance & electronics repair",
  cleaning: "Home cleaning",
  laundry: "Laundry & dry cleaning",
  personal_care: "Salons & barbers",
  automotive: "Garages & auto care",
  other: "Other home service",
};

function Moderation() {
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [services, setServices] = useState<CommunityService[]>([]);
  const [activeQueue, setActiveQueue] = useState<"reports" | "merchants" | "services">("reports");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewingReportId, setReviewingReportId] = useState<number | null>(null);
  const [reviewingApplicationId, setReviewingApplicationId] = useState<number | null>(null);
  const [reviewingServiceId, setReviewingServiceId] = useState<number | null>(null);
  const token = localStorage.getItem("homexToken");

  useEffect(() => {
    document.body.classList.add("moderation-page-body");
    return () => document.body.classList.remove("moderation-page-body");
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadReports = async () => {
      if (!token) {
        setError("Sign in with an authorized moderator account to review reports.");
        setIsLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [reportsResponse, applicationsResponse, servicesResponse] = await Promise.all([
          fetch("/api/moderation/listing-reports", { headers }),
          fetch("/api/moderation/merchant-applications", { headers }),
          fetch("/api/moderation/services", { headers }),
        ]);
        const [reportsData, applicationsData, servicesData] = await Promise.all([
          reportsResponse.json(),
          applicationsResponse.json(),
          servicesResponse.json(),
        ]);
        if (!reportsResponse.ok) throw new Error(reportsData.message || "Unable to load listing reports.");
        if (!applicationsResponse.ok) throw new Error(applicationsData.message || "Unable to load merchant applications.");
        if (!servicesResponse.ok) throw new Error(servicesData.message || "Unable to load community service submissions.");

        if (isActive) {
          setReports(reportsData.reports);
          setApplications(applicationsData.applications);
          setServices(servicesData.services);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadReports();
    return () => {
      isActive = false;
    };
  }, [token]);

  const reviewApplication = async (
    application: MerchantApplication,
    action: "approve" | "reject",
  ) => {
    setReviewingApplicationId(application.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/moderation/merchant-applications/${application.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to review this application.");
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setMessage(data.message);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review this application.");
    } finally {
      setReviewingApplicationId(null);
    }
  };

  const reviewReport = async (report: ListingReport, action: "dismiss" | "remove_listing") => {
    setReviewingReportId(report.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/moderation/listing-reports/${report.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to review this report.");
      setReports((current) => current.filter((item) =>
        action === "dismiss" ? item.id !== report.id : item.listingId !== report.listingId,
      ));
      setMessage(data.message);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review this report.");
    } finally {
      setReviewingReportId(null);
    }
  };

  const reviewService = async (service: CommunityService, action: "approve" | "reject") => {
    setReviewingServiceId(service.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/moderation/services/${service.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to review this service.");
      setServices((current) => current.filter((item) => item.id !== service.id));
      setMessage(data.message);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review this service.");
    } finally {
      setReviewingServiceId(null);
    }
  };

  return (
    <div className="moderation-page">
      <Navbar />
      <main className="moderation-main">
        <Link className="moderation-back-link" to="/marketplace">← Back to the neighborhood</Link>
        <header className="moderation-heading">
          <span className="moderation-eyebrow">A safer neighborhood starts with care</span>
          <h1>Community review</h1>
          <p>Review peer listings, local store applications, and member-submitted home services before they become part of HomeX.</p>
        </header>

        <div className="moderation-queue-tabs" role="group" aria-label="Moderation queue">
          <button type="button" aria-pressed={activeQueue === "reports"} onClick={() => setActiveQueue("reports")}>
            Listing reports <span>{reports.length}</span>
          </button>
          <button type="button" aria-pressed={activeQueue === "merchants"} onClick={() => setActiveQueue("merchants")}>
            Store applications <span>{applications.length}</span>
          </button>
          <button type="button" aria-pressed={activeQueue === "services"} onClick={() => setActiveQueue("services")}>
            Home services <span>{services.length}</span>
          </button>
        </div>

        {message && <p className="moderation-message" role="status">{message}</p>}
        {error && (
          <div className="moderation-error" role="alert">
            <h2>We can’t open the review queue.</h2>
            <p>{error}</p>
            {!token && <Link to="/auth">Sign in</Link>}
          </div>
        )}
        {isLoading ? (
          <p className="moderation-status" role="status">Loading moderation queues…</p>
        ) : !error && activeQueue === "reports" && reports.length === 0 ? (
          <section className="moderation-empty">
            <span aria-hidden="true">✳</span>
            <h2>All clear for now.</h2>
            <p>New listing reports will appear here for moderator review.</p>
          </section>
        ) : !error && activeQueue === "reports" ? (
          <section className="moderation-report-list" aria-label="Pending listing reports">
            <p className="moderation-count">{reports.length} pending {reports.length === 1 ? "report" : "reports"}</p>
            {reports.map((report) => (
              <article className="moderation-report" key={report.id}>
                <div className="moderation-report-topline">
                  <span className="moderation-reason">{reportReasons[report.reason] || report.reason}</span>
                  <time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time>
                </div>
                <h2>{report.title}</h2>
                <p className="moderation-listing-description">{report.description}</p>
                <dl className="moderation-report-meta">
                  <div><dt>Seller</dt><dd>{report.sellerName} · {report.sellerEmail}</dd></div>
                  <div><dt>Reported by</dt><dd>{report.reporterName}</dd></div>
                  <div><dt>Area</dt><dd>{report.neighborhood}</dd></div>
                  <div><dt>Listing status</dt><dd>{report.listingStatus}</dd></div>
                </dl>
                {report.details && (
                  <div className="moderation-report-details">
                    <h3>Report details</h3>
                    <p>{report.details}</p>
                  </div>
                )}
                <div className="moderation-actions">
                  <button
                    type="button"
                    className="moderation-dismiss"
                    disabled={reviewingReportId !== null}
                    onClick={() => void reviewReport(report, "dismiss")}
                  >
                    {reviewingReportId === report.id ? "Saving…" : "Dismiss report"}
                  </button>
                  <button
                    type="button"
                    className="moderation-remove"
                    disabled={reviewingReportId !== null}
                    onClick={() => void reviewReport(report, "remove_listing")}
                  >
                    Remove listing
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : !error && activeQueue === "merchants" && applications.length === 0 ? (
          <section className="moderation-empty">
            <span aria-hidden="true">✳</span>
            <h2>No store applications waiting.</h2>
            <p>New merchant applications will appear here for review.</p>
          </section>
        ) : !error && activeQueue === "merchants" && applications.length > 0 ? (
          <section className="moderation-report-list" aria-label="Pending store applications">
            <p className="moderation-count">{applications.length} pending {applications.length === 1 ? "application" : "applications"}</p>
            {applications.map((application) => (
              <article className="moderation-report" key={application.id}>
                <div className="moderation-report-topline">
                  <span className="moderation-reason">Store application</span>
                  <time dateTime={application.createdAt}>{new Date(application.createdAt).toLocaleString()}</time>
                </div>
                <h2>{application.storeName}</h2>
                <p className="moderation-listing-description">{application.description}</p>
                <dl className="moderation-report-meta">
                  <div><dt>Applicant</dt><dd>{application.applicantName} · {application.applicantEmail}</dd></div>
                  <div><dt>Phone</dt><dd>{application.phone}</dd></div>
                  <div><dt>Store address</dt><dd>{application.address}</dd></div>
                </dl>
                <div className="moderation-actions">
                  <button
                    type="button"
                    className="moderation-dismiss"
                    disabled={reviewingApplicationId !== null}
                    onClick={() => void reviewApplication(application, "reject")}
                  >
                    {reviewingApplicationId === application.id ? "Saving…" : "Decline"}
                  </button>
                  <button
                    type="button"
                    className="moderation-remove"
                    disabled={reviewingApplicationId !== null}
                    onClick={() => void reviewApplication(application, "approve")}
                  >
                    Approve store
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : !error && activeQueue === "services" && services.length === 0 ? (
          <section className="moderation-empty">
            <span aria-hidden="true">✳</span>
            <h2>No home services waiting.</h2>
            <p>Member-submitted repair, cleaning, laundry, care, and auto services will appear here for review.</p>
          </section>
        ) : !error && activeQueue === "services" ? (
          <section className="moderation-report-list" aria-label="Pending community services">
            <p className="moderation-count">{services.length} pending {services.length === 1 ? "service" : "services"}</p>
            {services.map((service) => (
              <article className="moderation-report" key={service.id}>
                <div className="moderation-report-topline">
                  <span className="moderation-reason">{communityServiceCategories[service.category] || service.category}</span>
                  <time dateTime={service.createdAt}>{new Date(service.createdAt).toLocaleString()}</time>
                </div>
                <h2>{service.businessName}</h2>
                <p className="moderation-listing-description">{service.description}</p>
                <dl className="moderation-report-meta">
                  <div><dt>Submitted by</dt><dd>{service.submitterName} · {service.submitterEmail}</dd></div>
                  <div><dt>Contact phone</dt><dd>{service.phone}</dd></div>
                  <div><dt>Service area</dt><dd>{service.area}</dd></div>
                  <div><dt>Address</dt><dd>{service.address}</dd></div>
                  {service.website && <div><dt>Website</dt><dd>{service.website}</dd></div>}
                </dl>
                <p className="moderation-listing-description">
                  Review the listing for completeness and appropriateness. Approval does not verify licenses, qualifications, or background.
                </p>
                <div className="moderation-actions">
                  <button
                    type="button"
                    className="moderation-dismiss"
                    disabled={reviewingServiceId !== null}
                    onClick={() => void reviewService(service, "reject")}
                  >
                    {reviewingServiceId === service.id ? "Saving…" : "Decline"}
                  </button>
                  <button
                    type="button"
                    className="moderation-remove"
                    disabled={reviewingServiceId !== null}
                    onClick={() => void reviewService(service, "approve")}
                  >
                    Approve service
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

export default Moderation;
