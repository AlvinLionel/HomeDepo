import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/footer";
import "../styles/auth.css";

function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

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

            if (!response.ok) throw new Error("Reset failed");
            setSuccess("Password reset successful. You can now login.");
            setError("");
            navigate("/Auth");
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
            if (!response.ok) throw new Error(data.message || "Request failed");

            setSuccess("Reset email sent. Check your inbox");
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Request failed");
            setSuccess("");
        }
    }

    return (
        <div id="auth">
            <div id="passResetForm">
                {!token && (
                    <form id="passResetFormElement" onSubmit={handleResetRequest}>
                        <label htmlFor="resetEmail">Input your registered email to receive a reset link</label>
                        <input type="email" name="email" id="resetEmail" required />
                        <button type="submit">Send</button>
                    </form>
                )}
                {token && (
                    <>
                        <h2>Create a new password</h2>
                        <form id="passResetFormElement" onSubmit={handleNewPassword}>
                            <label htmlFor="password">Enter new password</label>
                            <input type="password" name="password" id="newPass" required />
                            <label htmlFor="confirmPass">Confirm new password</label>
                            <input type="password" name="confirmPassword" id="confNewPass" required />
                            <button type="submit">Login</button>
                        </form>
                    </>
                )}
                {error && <p style={{ color: "crimson" }}>{error}</p>}
                {success && <p style={{ color: "green" }}>{success} </p>}
                <Footer />
            </div>
        </div>
    )
}

export default ResetPassword;