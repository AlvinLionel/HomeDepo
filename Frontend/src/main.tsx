import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "../styles/style.css";
import App from "./App";
import Auth from "./Auth";
import Home from "./Home";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/Home" element={<Home/>} />
        </Routes>
    </BrowserRouter>
)