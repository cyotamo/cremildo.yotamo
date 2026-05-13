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

const orientandosToggleBtn = document.getElementById("orientandos-toggle");
const orientandosSubmenu = document.getElementById("orientandos-submenu");
const loadWorksBtn = document.getElementById("load-works");
const logoutManagerBtn = document.getElementById("logout-manager");
const managerMessage = document.getElementById("manager-message");
const worksList = document.getElementById("works-list");

let gestorAutenticado = false;
let trabalhosCarregados = false;

function setSubmenuExpanded(isExpanded) {
  orientandosSubmenu.classList.toggle("expanded", isExpanded);
  orientandosToggleBtn.setAttribute("aria-expanded", String(isExpanded));
}

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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    };

    reader.onerror = () => reject(reader.error || new Error("Erro ao ler ficheiro."));
    reader.readAsDataURL(file);
  });
}

function renderTabelaTrabalhos(registos) {
  const trabalhosEnviados = Array.isArray(registos)
    ? registos.filter((registo) => registo?.enviado && registo?.trabalhoUrl)
    : [];

  if (trabalhosEnviados.length === 0) {
    worksList.innerHTML = "";
    setManagerMessage("Nenhum trabalho enviado encontrado.", "error");
    return;
  }

  const linhas = trabalhosEnviados.map((registo, index) => {
      const nome = escaparHtml(registo?.nome || "-");
      const dataEnvio = formatarDataParaTabela(registo?.dataHora);
      const dataEnvioHtml = escaparHtml(dataEnvio);
      const dataIso = registo?.dataHora ? new Date(registo.dataHora).getTime() : 0;
      const urlTrabalho = escaparHtml(registo?.trabalhoUrl || "");
      const inputId = `corrected-file-${index}`;

      return `
        <tr data-order="${dataIso}" data-nome="${nome}" data-data-hora="${escaparHtml(registo?.dataHora || "")}" data-trabalho-url="${urlTrabalho}">
          <td>${nome}</td>
          <td><a href="${urlTrabalho}" target="_blank" rel="noopener noreferrer">Abrir trabalho</a></td>
          <td>${dataEnvioHtml}</td>
          <td>
            <label class="visually-hidden" for="${inputId}">Ficheiro corrigido de ${nome}</label>
            <input id="${inputId}" class="corrected-file-input" type="file" />
          </td>
          <td><button class="btn btn-secondary send-corrected-btn" type="button">Enviar</button></td>
        </tr>
      `;
    }).join("");

  worksList.innerHTML = `
    <table class="works-table manager-works-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Trabalho</th>
          <th>Data/Hora</th>
          <th>Ficheiro corrigido</th>
          <th>Acção</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;

  setManagerMessage("");
}

async function enviarFicheiroCorrigido(botao) {
  const linha = botao.closest("tr");
  const inputFicheiro = linha?.querySelector(".corrected-file-input");
  const ficheiro = inputFicheiro?.files?.[0];

  if (!linha || !inputFicheiro) {
    setManagerMessage("Não foi possível identificar o trabalho selecionado.", "error");
    return;
  }

  if (!ficheiro) {
    setManagerMessage("Seleccione o ficheiro corrigido antes de enviar.", "error");
    inputFicheiro.focus();
    return;
  }

  const nome = linha.dataset.nome || "";
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = "A enviar...";
  setManagerMessage(`A enviar ficheiro corrigido de ${nome}...`);

  try {
    const ficheiroBase64 = await fileToBase64(ficheiro);
    const payload = {
      acao: "enviarFicheiroCorrigido",
      nome,
      dataHora: linha.dataset.dataHora || "",
      trabalhoUrl: linha.dataset.trabalhoUrl || "",
      fileName: ficheiro.name,
      mimeType: ficheiro.type || "application/octet-stream",
      fileBase64: ficheiroBase64
    };

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.sucesso) {
      throw new Error(data?.mensagem || "Erro ao enviar ficheiro corrigido.");
    }

    inputFicheiro.value = "";
    setManagerMessage(data?.mensagem || `Ficheiro corrigido de ${nome} enviado com sucesso.`, "success");
  } catch (erro) {
    console.error("Erro ao enviar ficheiro corrigido:", erro);
    setManagerMessage(erro?.message || "Erro ao enviar ficheiro corrigido.", "error");
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

async function carregarTrabalhosEnviados() {
  trabalhosCarregados = true;
  if (!gestorAutenticado) {
    setManagerMessage("Sessão inválida. Faça login novamente.", "error");
    redirecionarParaLogin();
    return;
  }

  worksList.innerHTML = "";
  setManagerMessage("A carregar trabalhos enviados...");

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

    const nomesValidos = new Set(nomes.map((nome) => normalizeEmail(nome)));
    const registosEnviados = Array.from(mapaTrabalhos.values())
      .filter((trabalho) => {
        const nomeNormalizado = normalizeEmail(trabalho?.nome);
        return !nomesValidos.size || nomesValidos.has(nomeNormalizado);
      })
      .map((trabalho) => ({
        nome: String(trabalho?.nome || "").trim() || "-",
        enviado: true,
        dataHora: trabalho?.dataHora || "",
        trabalhoUrl: trabalho?.trabalhoUrl || ""
      }))
      .sort((a, b) => (new Date(b.dataHora || 0).getTime() || 0) - (new Date(a.dataHora || 0).getTime() || 0));

    renderTabelaTrabalhos(registosEnviados);
  } catch (erro) {
    console.error("Erro ao carregar trabalhos:", erro);
    worksList.innerHTML = "";
    setManagerMessage("Erro ao carregar lista de estudantes/trabalhos.", "error");
  }
}

orientandosToggleBtn.addEventListener("click", () => {
  const isExpanded = orientandosSubmenu.classList.contains("expanded");
  setSubmenuExpanded(!isExpanded);
});

loadWorksBtn.addEventListener("click", () => {
  setSubmenuExpanded(true);
  loadWorksBtn.classList.add("active");
  carregarTrabalhosEnviados();
});

worksList.addEventListener("click", (event) => {
  const botaoEnviar = event.target.closest(".send-corrected-btn");

  if (botaoEnviar) {
    enviarFicheiroCorrigido(botaoEnviar);
  }
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
    return;
  }

  if (!trabalhosCarregados) {
    carregarTrabalhosEnviados();
  }
});
