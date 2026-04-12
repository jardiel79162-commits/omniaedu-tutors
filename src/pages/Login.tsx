import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase"; // Importe a instÃ¢ncia de auth
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../index.css";
import ReCAPTCHA from "react-google-recaptcha";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const navigate = useNavigate();

  const handleRecaptchaChange = (value: any) => {
    setRecaptchaValue(value);
  };

  const signIn = async () => {
    try {
      if (!recaptchaValue) {
        alert("Por favor, complete a verificaÃ§Ã£o reCAPTCHA.");
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login bem-sucedido!");
      navigate("/home");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (!recaptchaValue) {
        alert("Por favor, complete a verificaÃ§Ã£o reCAPTCHA.");
        return;
      }
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      alert("Login com Google bem-sucedido!");
      navigate("/home");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleForgotPassword = async () => {
    // Implementar a lÃ³gica de recuperaÃ§Ã£o de senha
    alert("Funcionalidade de recuperaÃ§Ã£o de senha a ser implementada.");
  };

  return (
    <div className="flex h-screen">
      {/* Lado Esquerdo (Imagem) - MantÃ©m a imagem, mas sobre o fundo de Natal */}
      <div className="hidden lg:flex items-center justify-center flex-1 text-black">
        <img
          src="https://images.unsplash.com/photo-1546733241-11d67069b25f?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Imagem de Fundo Natalina"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Lado Direito (FormulÃ¡rio de Login) */}
      <div className="flex items-center justify-center flex-1 relative z-10">
        <div className="w-full max-w-md p-8 space-y-6 bg-red-900/80 rounded-lg shadow-xl border border-green-700">
          <h1 className="text-4xl font-extrabold text-center text-green-400 drop-shadow-lg">
            JTC Parker
          </h1>
          <p className="text-center text-white">
            Acesse sua conta para continuar
          </p>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Digite seu email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-2 text-white bg-red-800/70 border border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white"
            >
              Senha
            </label>
            <input
              type="password"
              id="password"
              placeholder="Digite sua senha"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-2 text-white bg-red-800/70 border border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <div className="text-right mt-2">
              <button
                onClick={handleForgotPassword}
                className="text-sm text-green-300 hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
          </div>

          <div className="flex justify-center my-4">
            <ReCAPTCHA
              sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXtpgB0p"
              onChange={handleRecaptchaChange}
            />
          </div>

          <button
            onClick={signIn}
            className="w-full px-4 py-2 text-white bg-green-700 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          >
            Entrar
          </button>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center px-4 py-2 mt-4 text-white bg-red-700 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
          >
            <img
              src="https://www.svgrepo.com/show/303102/google-icon-logo.svg"
              alt="Google Icon"
              className="w-5 h-5 mr-2 filter invert"
            />
            Entrar com Google
          </button>

          <p className="text-center text-white">
            NÃ£o tem uma conta?{" "}
            <Link to="/register" className="text-green-300 hover:underline">
              Registre-se
            </Link>
          </p>

          <p className="text-center text-white text-xs mt-6">
            &copy; 2024{" "}
            <span className="text-green-400 font-extrabold">
              JTC Parker
            </span>
            . Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;