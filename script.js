// URL centralizada para futura integração com Google Apps Script / backend.
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzlsR6RPluumYwDdyXbv7aVlGuPPd94bO6efh2CDzoqxXbiWMvphqATgi2Q8pTgZaax/exec";
// Apps Script: no doPost, usar JSON.parse(e.postData.contents).
// Publicação exigida: acesso "Anyone" e URL final com /exec.

const openSubmitBtn = document.getElementById("open-submit");
const openStatusBtn = document.getElementById("open-status");
const submitSection = document.getElementById("submit-section");
const statusSection = document.getElementById("status-section");
const submitForm = document.getElementById("submit-form");
const studentNameSelect = document.getElementById("student-name");
const statusStudentNameSelect = document.getElementById("status-student-name");
const searchStatusBtn = document.getElementById("search-status");
const statusResult = document.getElementById("status-result");
const fileInput = document.getElementById("work-file");
const submitFeedback = document.getElementById("submit-feedback");
const openLoginBtn = document.getElementById("open-login");

let namesLoaded = false;

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

function setStatusResult(message, type = "", asHtml = false) {
  statusResult.classList.remove("success", "error");
  if (type) statusResult.classList.add(type);

  if (asHtml) {
    statusResult.innerHTML = message;
    return;
  }

  statusResult.textContent = message;
}

function resetNameSelect(selectElement) {
  selectElement.innerHTML = '<option value="">Seleccione o nome</option>';
}

function preencherSelectComNomes(selectElement, names) {
  resetNameSelect(selectElement);

  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    selectElement.appendChild(option);
  });
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

function formatarDataHora(dataHoraIso) {
  if (!dataHoraIso) {
    return "Data/Hora não disponível";
  }

  const data = new Date(dataHoraIso);
  if (Number.isNaN(data.getTime())) {
    return dataHoraIso;
  }

  return data.toLocaleString("pt-PT");
}

async function loadNames() {
  setFeedback("A carregar nomes...");
  resetNameSelect(studentNameSelect);
  resetNameSelect(statusStudentNameSelect);

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

    preencherSelectComNomes(studentNameSelect, names);
    preencherSelectComNomes(statusStudentNameSelect, names);

    namesLoaded = true;
    setFeedback("");
  } catch (error) {
    console.error("Erro ao carregar nomes:", error);
    namesLoaded = false;
    resetNameSelect(studentNameSelect);
    resetNameSelect(statusStudentNameSelect);
    setFeedback("Erro ao carregar nomes.", "error");
  }
}

openSubmitBtn.addEventListener("click", async () => {
  showSection(submitSection);
  if (!namesLoaded) {
    await loadNames();
  }
});

openStatusBtn.addEventListener("click", async () => {
  showSection(statusSection);
  setStatusResult("");

  if (!namesLoaded) {
    await loadNames();
  }
});

openLoginBtn.addEventListener("click", () => {
  window.location.href = "login.html";
});

async function buscarStatusTrabalho() {
  const nome = statusStudentNameSelect.value;

  if (!nome) {
    setStatusResult("Seleccione o nome.", "error");
    return;
  }

  setStatusResult("A buscar...");

  try {
    const url = `${WEB_APP_URL}?acao=consultarStatus&nome=${encodeURIComponent(nome)}`;

    const response = await fetch(url, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.sucesso) {
      setStatusResult(data?.mensagem || "Nenhum feedback encontrado para o estudante.", "error");
      return;
    }

    const dataHoraFormatada = formatarDataHora(data?.dataHora);
    const linkFeedback = data?.feedbackUrl
      ? `<a href="${data.feedbackUrl}" target="_blank" rel="noopener noreferrer">Abrir feedback</a>`
      : "Link de feedback não disponível";

    const resultadoHtml = `
      <p><strong>Nome:</strong> ${data?.nome || nome}</p>
      <p><strong>Data/Hora:</strong> ${dataHoraFormatada}</p>
      <p><strong>Feedback:</strong> ${linkFeedback}</p>
    `;

    setStatusResult(resultadoHtml, "success", true);
  } catch (erro) {
    console.error("Erro ao consultar status:", erro);
    setStatusResult("Erro ao consultar status.", "error");
  }
}

searchStatusBtn.addEventListener("click", buscarStatusTrabalho);

async function enviarTrabalho(event) {
  event.preventDefault();

  const nome = studentNameSelect.value;
  const ficheiro = fileInput.files[0];

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
    const ficheiroBase64 = await fileToBase64(ficheiro);
    const payload = {
      acao: "enviarTrabalho",
      nome,
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
      throw new Error(data?.mensagem || "Erro ao enviar trabalho.");
    }

    const versao = data?.dados?.versao;
    const mensagemSucesso = versao
      ? `Trabalho enviado com sucesso. Guardado em ${versao}.`
      : data?.mensagem || "Trabalho enviado com sucesso.";

    setFeedback(mensagemSucesso, "success");
    fileInput.value = "";
  } catch (erro) {
    console.error("Erro:", erro);
    setFeedback(erro?.message || "Erro ao enviar trabalho.", "error");
  }
}

submitForm.addEventListener("submit", enviarTrabalho);
