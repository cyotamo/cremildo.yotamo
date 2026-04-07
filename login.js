import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqGzOD86QDSbjBZk0zeCp7xcD7H924dqk",
  authDomain: "yotamonline.firebaseapp.com",
  projectId: "yotamonline",
  storageBucket: "yotamonline.firebasestorage.app",
  messagingSenderId: "530369661303",
  appId: "1:530369661303:web:d22c45104a636415333972"
};

const MANAGER_EMAIL_ATIVO = "cyotamo@yahoo.com.br";
const ALLOWED_MANAGER_EMAILS = new Set([MANAGER_EMAIL_ATIVO]);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Falha ao aplicar persistência de sessão:", error);
});

const loginForm = document.getElementById("login-form");
const managerEmailInput = document.getElementById("manager-email");
const managerPasswordInput = document.getElementById("manager-password");
const loginFeedback = document.getElementById("login-feedback");
const backHomeBtn = document.getElementById("back-home");

function setLoginFeedback(message, type = "") {
  loginFeedback.textContent = message;
  loginFeedback.classList.remove("success", "error");
  if (type) {
    loginFeedback.classList.add(type);
  }
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function emailGestorPermitido(email) {
  return ALLOWED_MANAGER_EMAILS.has(normalizeEmail(email));
}

backHomeBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = normalizeEmail(managerEmailInput.value);
  const password = managerPasswordInput.value;

  if (!email || !password) {
    setLoginFeedback("Informe email e senha.", "error");
    return;
  }

  if (!emailGestorPermitido(email)) {
    setLoginFeedback("Este email não tem permissão de gestor.", "error");
    return;
  }

  setLoginFeedback("A autenticar...");

  try {
    const credencial = await signInWithEmailAndPassword(auth, email, password);
    const emailAutenticado = normalizeEmail(credencial.user?.email);

    if (!emailGestorPermitido(emailAutenticado)) {
      setLoginFeedback("Conta autenticada sem perfil de gestor.", "error");
      return;
    }

    setLoginFeedback("Login válido. Redirecionando...", "success");
    window.location.href = "gestor.html";
  } catch (error) {
    console.error("Erro de login:", error);
    setLoginFeedback("Falha no login. Verifique credenciais no Firebase.", "error");
  }
});

onAuthStateChanged(auth, (user) => {
  const emailAutenticado = normalizeEmail(user?.email);
  if (user && emailGestorPermitido(emailAutenticado)) {
    window.location.replace("gestor.html");
  }
});
