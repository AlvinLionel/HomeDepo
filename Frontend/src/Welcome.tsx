import Footer from "../components/footer";
import { useNavigate } from "react-router-dom";
import "../styles/welcome.css";

function Welcome() {
    const navigate = useNavigate();

    return (
        <div id="intro">
            <div id="welcome">
                <h1>HomeX</h1>
                <p>Welcome to HomeX, Turn your house into a home!</p>
            </div>
            <div id="buttons">
                <button id="loginBtn" onClick={()=> navigate("/Auth?mode=login")}>Login</button>
                <button id="signupBtn" onClick={()=> navigate("/Auth?mode=signup")}>Sign Up</button>
            </div>
            <a href="/Home" id="guest_link">Continue as Guest</a>
            <Footer/>
        </div>
    )
}

export default Welcome;