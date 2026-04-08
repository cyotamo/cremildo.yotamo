import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
    } catch (error) {
      console.error("Erro ao registar Service Worker:", error);
    }
  });
}

// URL centralizada para integração com Google Apps Script / backend.
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzlsR6RPluumYwDdyXbv7aVlGuPPd94bO6efh2CDzoqxXbiWMvphqATgi2Q8pTgZaax/exec";

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

const loadWorksBtn = document.getElementById("load-works");
const logoutManagerBtn = document.getElementById("logout-manager");
const managerMessage = document.getElementById("manager-message");
const worksList = document.getElementById("works-list");

let gestorAutenticado = false;

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function emailGestorPermitido(email) {
  return ALLOWED_MANAGER_EMAILS.has(normalizeEmail(email));
}

function redirecionarParaLogin() {
  window.location.replace("login.html");
}

function redirecionarParaInicio() {
  window.location.replace("index.html");
}

function setManagerMessage(message, type = "") {
  managerMessage.textContent = message;
  managerMessage.classList.remove("success", "error");
  if (type) {
    managerMessage.classList.add(type);
  }
}

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatarDataParaTabela(valorData) {
  if (!valorData) return "-";

  const data = new Date(valorData);
  if (Number.isNaN(data.getTime())) {
    return escaparHtml(valorData);
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(data);
}

function renderTabelaTrabalhos(registos) {
  if (!Array.isArray(registos) || registos.length === 0) {
    worksList.innerHTML = "";
    setManagerMessage("Nenhum nome encontrado na planilha.", "error");
    return;
  }

  const linhas = registos.map((registo) => {
      const nome = escaparHtml(registo?.nome || "-");
      const enviado = Boolean(registo?.enviado);
      const statusLabel = enviado ? "Enviado" : "Não enviado";
      const statusClass = enviado ? "sent" : "pending";
      const dataEnvio = enviado ? formatarDataParaTabela(registo?.dataHora) : "-";
      const dataEnvioHtml = escaparHtml(dataEnvio);
      const dataIso = registo?.dataHora ? new Date(registo.dataHora).getTime() : 0;
      const urlTrabalho = registo?.trabalhoUrl;
      const linkHtml = urlTrabalho
        ? `<a href="${escaparHtml(urlTrabalho)}" target="_blank" rel="noopener noreferrer">Ver</a>`
        : "-";

      return `
        <tr data-order="${dataIso}">
          <td>${nome}</td>
          <td>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </td>
          <td>${dataEnvioHtml}</td>
          <td>${linkHtml}</td>
        </tr>
      `;
    }).join("");

  worksList.innerHTML = `
    <table class="works-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Status</th>
          <th>Data de envio</th>
          <th>Ficheiro</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;

  setManagerMessage("");
}

async function carregarTrabalhosEnviados() {
  if (!gestorAutenticado) {
    setManagerMessage("Sessão inválida. Faça login novamente.", "error");
    redirecionarParaLogin();
    return;
  }

  worksList.innerHTML = "";
  setManagerMessage("A carregar lista de estudantes...");

  try {
    const [nomesResponse, trabalhosResponse] = await Promise.all([
      fetch(`${WEB_APP_URL}?acao=listarNomes`, { method: "GET" }),
      fetch(`${WEB_APP_URL}?acao=listarTrabalhosEnviados`, { method: "GET" })
    ]);

    if (!nomesResponse.ok || !trabalhosResponse.ok) {
      throw new Error(`Falha HTTP: nomes=${nomesResponse.status} trabalhos=${trabalhosResponse.status}`);
    }

    const nomesData = await nomesResponse.json();
    const trabalhosData = await trabalhosResponse.json();

    if (!nomesData?.sucesso) {
      throw new Error(nomesData?.mensagem || "Erro ao carregar nomes.");
    }

    if (!trabalhosData?.sucesso) {
      throw new Error(trabalhosData?.mensagem || "Erro ao carregar trabalhos enviados.");
    }

    const nomes = Array.isArray(nomesData?.nomes) ? nomesData.nomes : [];
    const trabalhos = Array.isArray(trabalhosData?.dados) ? trabalhosData.dados : [];

    const mapaTrabalhos = new Map();
    trabalhos.forEach((trabalho) => {
      const chave = normalizeEmail(trabalho?.nome);
      if (!chave) return;

      const existente = mapaTrabalhos.get(chave);
      const dataAtual = new Date(trabalho?.dataHora || 0).getTime() || 0;
      const dataExistente = new Date(existente?.dataHora || 0).getTime() || 0;

      if (!existente || dataAtual >= dataExistente) {
        mapaTrabalhos.set(chave, trabalho);
      }
    });

    const registosCompletos = nomes.map((nome) => {
      const nomeLimpo = String(nome || "").trim();
      const trabalho = mapaTrabalhos.get(normalizeEmail(nomeLimpo));
      return {
        nome: nomeLimpo || "-",
        enviado: Boolean(trabalho),
        dataHora: trabalho?.dataHora || "",
        trabalhoUrl: trabalho?.trabalhoUrl || ""
      };
    });

    renderTabelaTrabalhos(registosCompletos);
  } catch (erro) {
    console.error("Erro ao carregar trabalhos:", erro);
    worksList.innerHTML = "";
    setManagerMessage("Erro ao carregar lista de estudantes/trabalhos.", "error");
  }
}

loadWorksBtn.addEventListener("click", () => {
  carregarTrabalhosEnviados();
});

logoutManagerBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    redirecionarParaInicio();
  }
});

onAuthStateChanged(auth, (user) => {
  const emailAutenticado = normalizeEmail(user?.email);
  const autorizado = Boolean(user) && emailGestorPermitido(emailAutenticado);

  gestorAutenticado = autorizado;

  if (!autorizado) {
    setManagerMessage("Acesso restrito. Faça login para continuar.", "error");
    redirecionarParaLogin();
  }
});
