document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("date").innerHTML = new Date().getFullYear();   // isn't the date suppose to remain constant of the year the project was established.

    // show auth form from the index page
    (function () {
        const loginBtn = document.getElementById("loginBtn");
        const signupBtn = document.getElementById("signupBtn");

        if (!loginBtn || !signupBtn) return;

        loginBtn.addEventListener("click", () => {
            window.location.href = "auth.html?mode=login";
        });
        signupBtn.addEventListener("click", () => {
            window.location.href = "auth.html?mode=signup";
        });
    })();

    // Function to handle the auth options on the auth page
    (function () {
        const loginForm = document.getElementById("loginForm");
        const signupForm = document.getElementById("signupForm");

        if (!loginForm || !signupForm) return;

        const params = new URLSearchParams(window.location.search);
        const mode = params.get("mode");

        if (mode === "signup") {
            signupForm.style.display = "block";
            loginForm.style.display = "none";
        } else {
            loginForm.style.display = "block";
            signupForm.style.display = "none";
        }
        document.getElementById("switchToSignup").addEventListener("click", (e) => {
            e.preventDefault();
            signupForm.style.display = "block";
            loginForm.style.display = "none";
        })
        document.getElementById("switchToLogin").addEventListener("click", (e) => {
            e.preventDefault();
            loginForm.style.display = "block";
            signupForm.style.display = "none";
        });
        document.getElementById("loginFormElement").addEventListener("click", () => {
            e.preventDefault();
            localStorage.setItem("firstname", "user");
            window.location.href = "home.html";
        })
    })();

    const Auth_to_home = () => {
        document.getElementById("loginFormElement").addEventListener("submit", (e) => {
            e.preventDefault();
            window.location.href = "home.html";
        });
        document.getElementById("signupFormElement").addEventListener("submit", (e) => {
            e.preventDefault();
            window.location.href = "home.html";
        });
    }
    Auth_to_home();
})