import React, { useState } from "react";
import Footer from "../components/footer";

function Auth() {
    const [mode, setMode] = useState<"login" | "signup">("login");

    return (
        <div id="auth">
            {mode === "login" ? (
                <div id="loginForm">
                    <h2>Login</h2>
                    <form id="loginFormElement">
                        <label htmlFor="loginEmail">Email</label><br />
                        <input type="email" id="loginEmail" required /><br />
                        <label htmlFor="loginPassword">Password</label><br />
                        <input type="password" id="loginPassword" required /><br />
                        <button type="submit">Login</button>
                    </form><br />
                    <p>
                        Don’t have an account?{" "}
                        <a href="#" onClick={() => setMode("signup")}>Sign Up</a>
                    </p>
                </div>
            ) : (
                <div id="signupForm">
                    <h2>Sign Up</h2>
                    <form id="signupFormElement">
                        <label htmlFor="signupUsername">Username</label><br />
                        <input type="text" id="signupUsername" required /><br />
                        <label htmlFor="signupEmail">Email</label><br />
                        <input type="email" id="signupEmail" required /><br />
                        <label htmlFor="signupPassword">Password</label><br />
                        <input type="password" id="signupPassword" required /><br />
                        <label htmlFor="confirmPassword">Confirm Password</label><br />
                        <input type="password" id="confirmPassword" required /><br />
                        <button type="submit">Sign Up</button>
                    </form><br />
                    <p>
                        Already have an account?{" "}
                        <a href="#" onClick={() => setMode("login")}>Login</a>
                    </p>
                </div>
            )}
            <Footer/>
        </div>
    );
}

export default Auth;