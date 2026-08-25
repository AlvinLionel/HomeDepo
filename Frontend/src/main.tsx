import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "../styles/global.css";
import Auth from "./Auth";
import Home from "./Home";
import Map from "./Map";
import Products from "./Products";
import Discover from "./Discover";
import Cart from "./Cart";
import Welcome from "./Welcome";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/Home" element={<Home/>} />
            <Route path="/map" element={<Map/>} />
            <Route path="/products" element={<Products/>} />
            <Route path="/discover" element={<Discover/>} />
            <Route path="/cart" element={<Cart/>} />
        </Routes>
    </BrowserRouter>
)