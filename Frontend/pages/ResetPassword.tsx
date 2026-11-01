import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/footer";
import "../styles/auth.css";

function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        document.body.classList.add("auth-page-body");
        return () => document.body.classList.remove("auth-page-body");
    }, []);

    const handleNewPassword: React.FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const password = formData.get("password")?.toString() || "";
        const confirmPassword = formData.get("confirmPassword")?.toString() || "";

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    newPassword: password
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "We couldn’t reset your password.");
            setSuccess("Password reset successful. You can now login.");
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Reset failed");
            setSuccess("");
        }
    }

    const handleResetRequest: React.FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = formData.get("email")?.toString() || "";

        try {
            const response = await fetch("/api/auth/request-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "We couldn’t send your reset link.");

            setSuccess(data.message || "If there’s an account for that email, a reset link is on its way. Check your inbox.");
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Request failed");
            setSuccess("");
        }
    }

    return (
        <div className="auth-page">
            <main className="auth-content">
                <Link className="auth-brand" to="/Home" aria-label="HomeX home">
                    <span className="auth-brand-mark" aria-hidden="true">⌂</span>
                    <span>HomeX</span>
                </Link>
            <section className="auth-card auth-card-reset" id="passResetForm">
                {!token && (
                    <>
                        <div className="auth-card-intro">
                            <span className="auth-eyebrow">We’ll help you get back in</span>
                            <h1>A fresh start.</h1>
                            <p>Share the email on your account and we’ll send you a password reset link.</p>
                        </div>
                        <form id="passResetFormElement" onSubmit={handleResetRequest}>
                            <label htmlFor="resetEmail">Email address</label>
                            <input type="email" name="email" id="resetEmail" autoComplete="email" required />
                            <button type="submit">Send me a reset link <span aria-hidden="true">→</span></button>
                        </form>
                    </>
                )}
                {token && (
                    <>
                        <div className="auth-card-intro">
                            <span className="auth-eyebrow">A key to your corner of home</span>
                            <h1>Create a new password.</h1>
                            <p>Choose a password with at least 8 characters to keep your account safe.</p>
                        </div>
                        <form id="passResetFormElement" onSubmit={handleNewPassword}>
                            <label htmlFor="newPass">New password</label>
                            <input type="password" name="password" id="newPass" minLength={8} autoComplete="new-password" required />
                            <label htmlFor="confNewPass">Confirm new password</label>
                            <input type="password" name="confirmPassword" id="confNewPass" minLength={8} autoComplete="new-password" required />
                            <button type="submit">Save new password <span aria-hidden="true">→</span></button>
                        </form>
                    </>
                )}
                {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
                {success && <p className="auth-feedback auth-feedback-success" role="status">{success}</p>}
                <p className="auth-switch">
                    Remembered it?{" "}
                    <button type="button" onClick={() => navigate("/Auth")}>Back to sign in</button>
                </p>
            </section>
            <p className="auth-reassurance"><span aria-hidden="true">✳</span> You’re always welcome home.</p>
            </main>
            <Footer />
        </div>
    )
}

export default ResetPassword;