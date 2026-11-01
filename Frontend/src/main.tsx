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
import ResetPassword from "../pages/ResetPassword";
import ProductDetails from "../pages/ProductDetails";
import Marketplace from "./Marketplace";
import Moderation from "./Moderation";
import MerchantPortal from "./MerchantPortal";
import Settings from "./Settings";
import Support from "./Support";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/Home" element={<Home/>} />
            <Route path="/map" element={<Map/>} />
            <Route path="/products" element={<Products/>} />
            <Route path="/products/:categorySlug" element={<Products/>} />
            <Route path="/discover" element={<Discover/>} />
            <Route path="/marketplace" element={<Marketplace/>} />
            <Route path="/moderation" element={<Moderation/>} />
            <Route path="/merchant" element={<MerchantPortal/>} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/contact" element={<Support/>} />
            <Route path="/cart" element={<Cart/>} />
            <Route path="/reset-password" element={<ResetPassword/>}/>
            <Route path="/product/:productId" element={<ProductDetails />} />
        </Routes>
    </BrowserRouter>
)