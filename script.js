// URL centralizada para futura integração com Google Apps Script / backend.
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzlsR6RPluumYwDdyXbv7aVlGuPPd94bO6efh2CDzoqxXbiWMvphqATgi2Q8pTgZaax/exec";

const openSubmitBtn = document.getElementById("open-submit");
const openStatusBtn = document.getElementById("open-status");
const submitSection = document.getElementById("submit-section");
const statusSection = document.getElementById("status-section");
const submitForm = document.getElementById("submit-form");
const studentNameSelect = document.getElementById("student-name");
const fileInput = document.getElementById("work-file");
const submitFeedback = document.getElementById("submit-feedback");

let namesLoaded = false;

// Mostra uma única secção de cada vez, logo abaixo dos botões.
function showSection(sectionToShow) {
  submitSection.classList.add("hidden");
  statusSection.classList.add("hidden");
  sectionToShow.classList.remove("hidden");
}

function setFeedback(message, type = "") {
  submitFeedback.textContent = message;
  submitFeedback.classList.remove("success", "error");
  if (type) submitFeedback.classList.add(type);
}

function resetNameSelect() {
  studentNameSelect.innerHTML = '<option value="">Seleccione o nome</option>';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const resultado = reader.result;
      const base64 = resultado.split(",")[1];
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Carrega nomes reais do backend Google Apps Script.
async function loadNames() {
  setFeedback("A carregar nomes...");
  resetNameSelect();

  try {
    const response = await fetch(`${WEB_APP_URL}?acao=listarNomes`, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP: ${response.status}`);
    }

    const payload = await response.json();
    const isSuccess = payload?.sucesso === true;
    const names = Array.isArray(payload?.nomes) ? payload.nomes : [];

    if (!isSuccess) {
      throw new Error("Resposta sem sucesso.");
    }

    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      studentNameSelect.appendChild(option);
    });

    namesLoaded = true;
    setFeedback("");
  } catch (error) {
    console.error("Erro ao carregar nomes:", error);
    namesLoaded = false;
    resetNameSelect();
    setFeedback("Erro ao carregar nomes.", "error");
  }
}

// Abre secção de envio e carrega nomes uma única vez por sessão.
openSubmitBtn.addEventListener("click", async () => {
  showSection(submitSection);
  if (!namesLoaded) {
    await loadNames();
  }
});

// Abre apenas a secção de status com placeholder solicitado.
openStatusBtn.addEventListener("click", () => {
  showSection(statusSection);
});

async function enviarTrabalho(event) {
  event.preventDefault();
  console.log("Submissão iniciada");

  const nome = studentNameSelect.value;
  const ficheiro = fileInput.files[0];

  console.log("Nome seleccionado:", nome);
  console.log("Ficheiro seleccionado:", ficheiro);

  if (!nome) {
    setFeedback("Seleccione o nome.", "error");
    return;
  }

  if (!ficheiro) {
    setFeedback("Seleccione o ficheiro.", "error");
    return;
  }

  setFeedback("A enviar trabalho...");

  try {
    console.log("A converter ficheiro para base64...");
    const ficheiroBase64 = await fileToBase64(ficheiro);
    const payload = {
      acao: "enviarTrabalho",
      nome,
      fileName: ficheiro.name,
      mimeType: ficheiro.type || "application/octet-stream",
      fileBase64: ficheiroBase64
    };
    console.log("Payload pronto para envio:", payload);

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta do back-end:", data);

    if (!data?.sucesso) {
      throw new Error(data?.mensagem || "Erro ao enviar trabalho.");
    }

    const versao = data?.dados?.versao;
    const mensagemSucesso = versao
      ? `Trabalho enviado com sucesso. Guardado em ${versao}.`
      : (data?.mensagem || "Trabalho enviado com sucesso.");

    setFeedback(mensagemSucesso, "success");
    fileInput.value = "";
  } catch (erro) {
    console.error("Erro ao enviar trabalho:", erro);
    setFeedback(erro?.message || "Erro ao enviar trabalho.", "error");
  }
}

// Liga o formulário existente à função de envio do trabalho.
submitForm.addEventListener("submit", enviarTrabalho);
