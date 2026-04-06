// URL centralizada para futura integração com Google Apps Script / backend.
const WEB_APP_URL = "drive/folders/16A5Cf7wtWcJNhKOJkR1JgzMo1JoHZzsC";

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

// Carrega nomes do endpoint remoto; usa fallback de exemplo em caso de falha.
async function loadNames() {
  setFeedback("A carregar nomes...");

  // Mantém a opção default sempre presente.
  studentNameSelect.innerHTML = '<option value="">Seleccione o nome</option>';

  try {
    const response = await fetch(WEB_APP_URL, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP: ${response.status}`);
    }

    const payload = await response.json();
    const names = Array.isArray(payload?.names) ? payload.names : [];

    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      studentNameSelect.appendChild(option);
    });

    // Se a API responder vazia, mantém experiência funcional com exemplos.
    if (!names.length) {
      addFallbackNames();
    }

    setFeedback("");
  } catch (error) {
    console.error("Erro ao carregar nomes:", error);
    addFallbackNames();
    setFeedback("Erro ao carregar nomes.", "error");
  }
}

function addFallbackNames() {
  const fallbackNames = ["Ana Silva", "Bruno Santos", "Carla Mendes"];

  fallbackNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `${name} (exemplo)`;
    studentNameSelect.appendChild(option);
  });
}

// Abre secção de envio e carrega nomes uma única vez por sessão.
openSubmitBtn.addEventListener("click", async () => {
  showSection(submitSection);
  if (!namesLoaded) {
    await loadNames();
    namesLoaded = true;
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
