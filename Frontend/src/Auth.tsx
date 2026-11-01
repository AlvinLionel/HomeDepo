import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/footer";
import "../styles/auth.css";

function Auth() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    useEffect(() => {
        document.body.classList.add("auth-page-body");
        return () => document.body.classList.remove("auth-page-body");
    }, []);

    useEffect(() => {
        const paramMode = searchParams.get("mode");
        if (paramMode === "signup" || paramMode === "login") {
            setMode(paramMode);
        }
    }, [searchParams]);

    const handleLogin: React.FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        const formData = new FormData(event.currentTarget);
        const payload = {
            email: formData.get("email")?.toString() || "",
            password: formData.get("password")?.toString() || "",
        };

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            setSuccess("Login successful");
            localStorage.setItem("homexUsername", data.user.username);
            localStorage.setItem("homexUserId", String(data.user.id));
            localStorage.setItem("homexAccountType", data.user.accountType || "buyer");
            localStorage.setItem("homexIsModerator", String(Boolean(data.user.isModerator)));
            localStorage.setItem("homexToken", data.token);
            navigate("/Home");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        }
    };

    const handleSignup: React.FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        const formData = new FormData(event.currentTarget);
        const password = formData.get("password")?.toString() || "";
        const confirmPassword = formData.get("confirmPassword")?.toString() || "";

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        const payload = {
            username: formData.get("username")?.toString() || "",
            email: formData.get("email")?.toString() || "",
            password,
            accountType: "buyer",
        };

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Signup failed");
            }

            setSuccess("Account created successfully");
            localStorage.setItem("homexUsername", data.user.username);
            localStorage.setItem("homexUserId", String(data.user.id));
            localStorage.setItem("homexAccountType", data.user.accountType || "buyer");
            localStorage.setItem("homexIsModerator", String(Boolean(data.user.isModerator)));
            localStorage.setItem("homexToken", data.token);
            navigate("/Home");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
        }
    };

    return (
        <div className="auth-page">
            <main className="auth-content">
                <Link className="auth-brand" to="/Home" aria-label="HomeX home">
                    <span className="auth-brand-mark" aria-hidden="true">⌂</span>
                    <span>HomeX</span>
                </Link>
                {mode === "login" && (
                    <section className="auth-card" id="loginForm">
                        <div className="auth-card-intro">
                            <span className="auth-eyebrow">A little corner of home</span>
                            <h1>Welcome back.</h1>
                            <p>Come on in. Your next good find is waiting.</p>
                        </div>
                    <form id="loginFormElement" onSubmit={handleLogin}>
                        <label htmlFor="loginEmail">Email</label><br />
                        <input type="email" id="loginEmail" name="email" autoComplete="email" required /><br />
                        <label htmlFor="loginPassword">Password</label><br />
                        <input type="password" id="loginPassword" name="password" autoComplete="current-password" required /><br />
                        <div className="auth-form-options">
                        <button type="submit">Come on in <span aria-hidden="true">→</span></button>
                        <a href="/reset-password" className="forgotPassword"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate("/reset-password");
                            }}
                        >Forgot password?</a>
                        </div>
                    </form>
                    {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
                    {success && <p className="auth-feedback auth-feedback-success" role="status">{success}</p>}
                    <p className="auth-switch">
                        New around here?{" "}
                        <button type="button" onClick={() => navigate("/Auth?mode=signup")}>Make yourself at home</button>
                    </p>
                    </section>
                )}
                {mode === "signup" && (
                    <section className="auth-card auth-card-signup" id="signupForm">
                        <div className="auth-card-intro">
                            <span className="auth-eyebrow">There’s room for you here</span>
                            <h1>Let’s make a home.</h1>
                            <p>Join a community sharing lovely finds and local favorites.</p>
                        </div>
                    <form id="signupFormElement" onSubmit={handleSignup}>
                        <label htmlFor="signupUsername">Username</label><br />
                        <input type="text" id="signupUsername" name="username" autoComplete="username" required /><br />
                        <label htmlFor="signupEmail">Email</label><br />
                        <input type="email" id="signupEmail" name="email" autoComplete="email" required /><br />
                        <label htmlFor="signupPassword">Password</label><br />
                        <input type="password" id="signupPassword" name="password" minLength={8} autoComplete="new-password" required /><br />
                        <label htmlFor="confirmPassword">Confirm Password</label><br />
                        <input type="password" id="confirmPassword" name="confirmPassword" autoComplete="new-password" required /><br />
                        <button type="submit">Create my account <span aria-hidden="true">→</span></button>
                    </form>
                    {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
                    {success && <p className="auth-feedback auth-feedback-success" role="status">{success}</p>}
                    <p className="auth-switch">
                        Already part of HomeX?{" "}
                        <button type="button" onClick={() => navigate("/Auth?mode=login")}>Welcome back</button>
                    </p>
                    </section>
                )}
                <p className="auth-reassurance"><span aria-hidden="true">✳</span> Good things, shared close to home.</p>
            </main>
            <Footer />
        </div>
    );
}

export default Auth;