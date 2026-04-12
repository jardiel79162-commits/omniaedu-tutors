import { useState } from "react";
import { auth } from "../config/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import "../index.css";
import ReCAPTCHA from "react-google-recaptcha";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const navigate = useNavigate();

  const handleRecaptchaChange = (value: any) => {
    setRecaptchaValue(value);
  };

  const register = async () => {
    try {
      if (password !== confirmPassword) {
        alert("As senhas nÃ£o coincidem!");
        return;
      }
      if (!recaptchaValue) {
        alert("Por favor, complete a verificaÃ§Ã£o reCAPTCHA.");
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: displayName });
      alert("Registro bem-sucedido!");
      navigate("/home");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Lado Esquerdo (Imagem) */}
      <div className="hidden lg:flex items-center justify-center flex-1 text-black">
        <img
          src="https://images.unsplash.com/photo-1546733241-11d67069b25f?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Imagem de Fundo Natalina"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Lado Direito (FormulÃ¡rio de Registro) */}
      <div className="flex items-center justify-center flex-1 relative z-10">
        <div className="w-full max-w-md p-8 space-y-6 bg-red-900/80 rounded-lg shadow-xl border border-green-700">
          <h1 className="text-4xl font-extrabold text-center text-green-400 drop-shadow-lg">
            JTC Parker
          </h1>
          <p className="text-center text-white">
            Crie sua conta gratuitamente!
          </p>

          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-white"
            >
              Nome de UsuÃ¡rio
            </label>
            <input
              type="text"
              id="displayName"
              placeholder="Digite seu nome de usuÃ¡rio"
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 mt-2 text-white bg-red-800/70 border border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

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
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-white"
            >
              Confirmar Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Confirme sua senha"
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 mt-2 text-white bg-red-800/70 border border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="flex justify-center my-4">
            <ReCAPTCHA
              sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXtpgB0p"
              onChange={handleRecaptchaChange}
            />
          </div>

          <button
            onClick={register}
            className="w-full px-4 py-2 text-white bg-green-700 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          >
            Registrar
          </button>

          <p className="text-center text-white">
            JÃ¡ tem uma conta?{" "}
            <Link to="/login" className="text-green-300 hover:underline">
              Entrar
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

export default Register;