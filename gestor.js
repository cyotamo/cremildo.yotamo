// URL centralizada para integração com Google Apps Script / backend.
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzlsR6RPluumYwDdyXbv7aVlGuPPd94bO6efh2CDzoqxXbiWMvphqATgi2Q8pTgZaax/exec";

const loadWorksBtn = document.getElementById("load-works");
const managerMessage = document.getElementById("manager-message");
const worksList = document.getElementById("works-list");

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
  console.log("Carregar trabalhos enviados");
  worksList.innerHTML = "";
  setManagerMessage("A carregar trabalhos...");

  const url = `${WEB_APP_URL}?acao=listarTrabalhosEnviados`;
  console.log("URL:", url);

  try {
    const response = await fetch(url, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta:", data);

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
  console.log("Clique no botão Trabalhos Enviados");
  carregarTrabalhosEnviados();
});
