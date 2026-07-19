document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("date").innerHTML = new Date().getFullYear();   // isn't the date suppose to remain constant of the year the project was established.
    // show auth form
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
    })();
})