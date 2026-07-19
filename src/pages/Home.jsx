import { Link } from "react-router-dom";
import "../styles/Home.css";

function Home() {
    return (
        <div className="home">

            <div className="overlay">

                <div className="hero">

                    <h1>Dental Smile</h1>

                    <p>
                        Sistema Integral de Gestión Odontológica
                    </p>

                    <Link to="/login">
                        <button>
                            INGRESAR
                        </button>
                    </Link>

                </div>

            </div>

        </div>
    );
}

export default Home;