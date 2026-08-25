import React from "react";
import "../styles/components.css";

function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer>
            &copy; &nbsp; HomeX&nbsp;{year} &nbsp; All rights reserved &nbsp;
        </footer>
    )
}

export default Footer;