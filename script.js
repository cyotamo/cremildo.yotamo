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

// Envio preparado com FormData para suportar ficheiros.
submitForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedName = studentNameSelect.value;
  const selectedFile = fileInput.files[0];

  if (!selectedName || !selectedFile) {
    setFeedback("Por favor, seleccione o nome e anexe o trabalho.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("name", selectedName);
  formData.append("file", selectedFile);

  setFeedback("A enviar trabalho...");

  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP: ${response.status}`);
    }

    setFeedback("Trabalho enviado com sucesso.", "success");
    submitForm.reset();
  } catch (error) {
    console.error("Erro ao enviar trabalho:", error);
    setFeedback("Erro ao enviar trabalho.", "error");
  }
});
