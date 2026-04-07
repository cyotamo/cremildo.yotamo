import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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

function setManagerMessage(message, type = "") {
  managerMessage.textContent = message;
  managerMessage.classList.remove("success", "error");
  if (type) {
    managerMessage.classList.add(type);
  }
}

function renderTabelaTrabalhos(registos) {
  if (!Array.isArray(registos) || registos.length === 0) {
    worksList.innerHTML = "";
    setManagerMessage("Nenhum trabalho encontrado.");
    return;
  }

  const linhas = registos
    .map((trabalho) => {
      const nome = trabalho?.nome || "-";
      const dataHora = trabalho?.dataHora || "-";
      const urlTrabalho = trabalho?.trabalhoUrl;
      const linkHtml = urlTrabalho
        ? `<a href="${urlTrabalho}" target="_blank" rel="noopener noreferrer">Abrir trabalho</a>`
        : "Link indisponível";

      return `
        <tr>
          <td>${nome}</td>
          <td>${linkHtml}</td>
          <td>${dataHora}</td>
          <td>
            <input
              type="file"
              class="feedback-file-input"
              data-feedback-file
              aria-label="Selecionar ficheiro corrigido para ${nome}"
            />
          </td>
          <td class="feedback-action">
            <button
              type="button"
              class="btn btn-secondary feedback-send-btn"
              data-feedback-send
            >
              Enviar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  worksList.innerHTML = `
    <table class="works-table">
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

function converterFicheiroParaBase64(ficheiro) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = leitor.result;
      if (typeof resultado !== "string") {
        reject(new Error("Não foi possível converter o ficheiro."));
        return;
      }

      const base64 = resultado.includes(",") ? resultado.split(",")[1] : resultado;
      resolve(base64);
    };
    leitor.onerror = () => reject(leitor.error || new Error("Falha na leitura do ficheiro."));
    leitor.readAsDataURL(ficheiro);
  });
}

async function enviarFeedback(botaoEnviar) {
  if (!gestorAutenticado) {
    setManagerMessage("Sessão inválida. Faça login novamente.", "error");
    redirecionarParaLogin();
    return;
  }

  const linha = botaoEnviar.closest("tr");
  const nome = linha?.querySelector("td")?.textContent?.trim() || "-";
  const inputFicheiro = linha?.querySelector("[data-feedback-file]");
  const ficheiro = inputFicheiro?.files?.[0];

  if (!ficheiro) {
    setManagerMessage("Selecione um ficheiro corrigido antes de enviar.", "error");
    return;
  }

  botaoEnviar.disabled = true;
  setManagerMessage("A enviar feedback...");

  try {
    const base64DoFicheiro = await converterFicheiroParaBase64(ficheiro);
    const payload = {
      acao: "enviarFeedback",
      nome,
      fileName: ficheiro.name,
      mimeType: ficheiro.type || "application/octet-stream",
      fileBase64: base64DoFicheiro
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
      throw new Error(data?.mensagem || "Erro ao enviar feedback.");
    }

    setManagerMessage("Feedback enviado com sucesso.", "success");
    inputFicheiro.value = "";
  } catch (erro) {
    console.error("Erro ao enviar feedback:", erro);
    setManagerMessage("Erro ao enviar feedback.", "error");
  } finally {
    botaoEnviar.disabled = false;
  }
}

async function carregarTrabalhosEnviados() {
  if (!gestorAutenticado) {
    setManagerMessage("Sessão inválida. Faça login novamente.", "error");
    redirecionarParaLogin();
    return;
  }

  worksList.innerHTML = "";
  setManagerMessage("A carregar trabalhos...");

  const url = `${WEB_APP_URL}?acao=listarTrabalhosEnviados`;

  try {
    const response = await fetch(url, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.sucesso) {
      worksList.innerHTML = "";
      setManagerMessage(data?.mensagem || "Erro ao carregar trabalhos.", "error");
      return;
    }

    renderTabelaTrabalhos(data?.dados);
  } catch (erro) {
    console.error("Erro ao carregar trabalhos:", erro);
    worksList.innerHTML = "";
    setManagerMessage("Erro ao carregar trabalhos.", "error");
  }
}

loadWorksBtn.addEventListener("click", () => {
  carregarTrabalhosEnviados();
});

logoutManagerBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    redirecionarParaLogin();
  }
});

worksList.addEventListener("click", (evento) => {
  const botaoEnviar = evento.target.closest("[data-feedback-send]");
  if (!botaoEnviar) {
    return;
  }

  enviarFeedback(botaoEnviar);
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
