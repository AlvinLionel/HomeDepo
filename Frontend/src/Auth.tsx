import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/footer";
import "../styles/auth.css";

function Auth() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    useEffect(() => {
        const paramMode = searchParams.get("mode");
        if (paramMode === "signup" || paramMode === "login") {
            setMode(paramMode);
        }
    }, [searchParams])

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
            localStorage.setItem("homeXUsername", data.user.username);
            navigate("/Home");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
        }
    };

    return (
        <div id="auth">
            {mode === "login" && (
                <div id="loginForm">
                    <h2>Login</h2>
                    <form id="loginFormElement" onSubmit={handleLogin}>
                        <label htmlFor="loginEmail">Email</label><br />
                        <input type="email" id="loginEmail" name="email" required /><br />
                        <label htmlFor="loginPassword">Password</label><br />
                        <input type="password" id="loginPassword" name="password" required /><br />
                        <button type="submit">Login</button>
                        <a href="#" className="forgotPassword"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate("/reset-password");
                            }}
                        >Forgot password</a>
                    </form><br />
                    {error && <p style={{ color: "crimson" }}>{error}</p>}
                    {success && <p style={{ color: "green" }}>{success}</p>}
                    <p>
                        Don’t have an account?{" "}
                        <a href="#" onClick={() => navigate("/Auth?mode=signup")}>Sign Up</a><br />
                    </p>
                </div>)}
            {mode == "signup" && (
                <div id="signupForm">
                    <h2>Sign Up</h2>
                    <form id="signupFormElement" onSubmit={handleSignup}>
                        <label htmlFor="signupUsername">Username</label><br />
                        <input type="text" id="signupUsername" name="username" required /><br />
                        <label htmlFor="signupEmail">Email</label><br />
                        <input type="email" id="signupEmail" name="email" required /><br />
                        <label htmlFor="signupPassword">Password</label><br />
                        <input type="password" id="signupPassword" name="password" required /><br />
                        <label htmlFor="confirmPassword">Confirm Password</label><br />
                        <input type="password" id="confirmPassword" name="confirmPassword" required /><br />
                        <button type="submit">Sign Up</button>
                    </form><br />
                    {error && <p style={{ color: "crimson" }}>{error}</p>}
                    {success && <p style={{ color: "green" }}>{success}</p>}
                    <p>
                        Already have an account?{" "}
                        <a href="#" onClick={() => navigate("/Auth?mode=login")}>Login</a>
                    </p>
                </div>
            )}
            <Footer />
        </div>
    );
}

export default Auth;