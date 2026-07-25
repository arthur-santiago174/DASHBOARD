const API = "/blocks";

const DIAS = [
    { key: "segunda", label: "Segunda-feira" },
    { key: "terca",   label: "Terça-feira"   },
    { key: "quarta",  label: "Quarta-feira"  },
    { key: "quinta",  label: "Quinta-feira"  },
    { key: "sexta",   label: "Sexta-feira"   },
    { key: "sabado",  label: "Sábado"        },
    { key: "domingo", label: "Domingo"       },
];

const clockElement  = document.getElementById("clock");
const blocksList    = document.getElementById("blocks-list");
const dayTitleEl    = document.getElementById("day-title");
const dayCountEl    = document.getElementById("day-count");
const addBlockBtn   = document.getElementById("add-block-btn");

let selectedDay = "segunda";
let allBlocks   = [];      // { id, day, name, series, reps, completed }
const saveTimers = {};     // debounce por id

// ─────────────────────────────────────────────
// RELÓGIO E DATA
// ─────────────────────────────────────────────
function updateClock() {
    if (!clockElement) return;
    clockElement.textContent = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function setHeaderDate() {
    const hoje = new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });
    const dateEl = document.getElementById("header-date");
    if (dateEl) dateEl.textContent = hoje.charAt(0).toUpperCase() + hoje.slice(1);
}

// ─────────────────────────────────────────────
// CARREGAR BLOCOS
// ─────────────────────────────────────────────
async function loadBlocks() {
    try {
        const response = await fetch(API);
        if (!response.ok) {
            console.error("Falha ao carregar exercícios:", response.status, await response.text());
            return;
        }
        allBlocks = await response.json();

        renderDay(selectedDay);
        updateHeaderStats();
        updateDots();
    } catch (err) {
        console.error("Erro de rede ao carregar exercícios:", err);
    }
}

// ─────────────────────────────────────────────
// RENDERIZAR A PÁGINA DO DIA
// ─────────────────────────────────────────────
function renderDay(day) {
    const dia = DIAS.find(d => d.key === day);
    dayTitleEl.textContent = dia.label;

    const blocksOfDay = allBlocks.filter(b => b.day === day);
    dayCountEl.textContent = `${blocksOfDay.length} exercício${blocksOfDay.length !== 1 ? "s" : ""}`;

    blocksList.innerHTML = "";

    if (blocksOfDay.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Nenhum exercício adicionado ainda para este dia.";
        blocksList.appendChild(empty);
        return;
    }

    blocksOfDay.forEach(block => {
        blocksList.appendChild(buildBlockElement(block));
    });
}

function buildBlockElement(block) {
    const div = document.createElement("div");
    div.className = "exercise-block" + (block.completed ? " completed" : "");
    div.dataset.id = block.id;

    div.innerHTML = `
        <div class="exercise-top">
            <input
                type="text"
                class="exercise-name-input"
                placeholder="Nome do exercício"
                value="${escapeHtml(block.name || "")}"
            >
            <button class="exercise-remove" title="Remover exercício">✕</button>
        </div>
        <div class="exercise-bottom">
            <div class="field-group">
                <label>Séries</label>
                <input type="number" min="1" class="field-series" value="${escapeHtml(block.series ?? "")}">
            </div>
            <div class="field-group">
                <label>Repetições</label>
                <input type="text" class="field-reps" placeholder="ex: 8-12" value="${escapeHtml(block.reps ?? "")}">
            </div>
            <button class="btn-concluida">${block.completed ? "Reabrir" : "Concluir"}</button>
        </div>
    `;

    const nameInput   = div.querySelector(".exercise-name-input");
    const seriesInput = div.querySelector(".field-series");
    const repsInput    = div.querySelector(".field-reps");
    const removeBtn    = div.querySelector(".exercise-remove");
    const concluirBtn  = div.querySelector(".btn-concluida");

    nameInput.addEventListener("input", () => scheduleSave(block.id, { name: nameInput.value }));
    seriesInput.addEventListener("input", () => scheduleSave(block.id, { series: seriesInput.value }));
    repsInput.addEventListener("input", () => scheduleSave(block.id, { reps: repsInput.value }));

    removeBtn.addEventListener("click", () => deleteBlock(block.id));
    concluirBtn.addEventListener("click", () => toggleCompleted(block.id));

    return div;
}

function escapeHtml(str) {
    return String(str).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// ─────────────────────────────────────────────
// SALVAR COM DEBOUNCE (nome / séries / repetições)
// ─────────────────────────────────────────────
function scheduleSave(id, changes) {
    Object.assign(findBlock(id), changes);

    clearTimeout(saveTimers[id]);
    saveTimers[id] = setTimeout(() => updateBlock(id, changes), 500);
}

function findBlock(id) {
    return allBlocks.find(b => b.id === id);
}

async function updateBlock(id, changes) {
    await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
    });
    updateHeaderStats();
    updateDots();
}

// ─────────────────────────────────────────────
// CONCLUIR / REABRIR
// ─────────────────────────────────────────────
async function toggleCompleted(id) {
    const block = findBlock(id);
    block.completed = !block.completed;

    const el = blocksList.querySelector(`.exercise-block[data-id="${id}"]`);
    if (el) {
        el.classList.toggle("completed", block.completed);
        el.querySelector(".btn-concluida").textContent = block.completed ? "Reabrir" : "Concluir";
    }

    await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: block.completed }),
    });

    updateHeaderStats();
    updateDots();
}

// ─────────────────────────────────────────────
// ADICIONAR / REMOVER BLOCO
// ─────────────────────────────────────────────
addBlockBtn.addEventListener("click", async () => {
    try {
        const response = await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ day: selectedDay, name: "", series: "", reps: "" }),
        });

        if (!response.ok) {
            const texto = await response.text();
            console.error("Falha ao criar exercício:", response.status, texto);
            alert(`Não consegui adicionar o exercício (erro ${response.status}). Veja o console (F12) para detalhes.`);
            return;
        }

        const created = await response.json();

        allBlocks.push({
            id: created.id ?? created.insertId,
            day: selectedDay,
            name: "",
            series: "",
            reps: "",
            completed: false,
        });

        renderDay(selectedDay);
        updateHeaderStats();
        updateDots();

        const lastInput = blocksList.querySelector(".exercise-block:last-child .exercise-name-input");
        if (lastInput) lastInput.focus();
    } catch (err) {
        console.error("Erro de rede ao adicionar exercício:", err);
        alert("Não consegui falar com o servidor. Ele está rodando? Veja o console (F12) para detalhes.");
    }
});

async function deleteBlock(id) {
    allBlocks = allBlocks.filter(b => b.id !== id);
    renderDay(selectedDay);
    updateHeaderStats();
    updateDots();

    await fetch(`${API}/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────
// ESTATÍSTICAS DO HEADER
// ─────────────────────────────────────────────
function updateHeaderStats() {
    const concluidos = allBlocks.filter(b => b.completed).length;
    const pendentes  = allBlocks.length - concluidos;
    const total      = allBlocks.length;
    const pct        = total > 0 ? Math.round((concluidos / total) * 100) : 0;

    document.getElementById("total-pendentes").textContent  = pendentes;
    document.getElementById("total-concluidos").textContent = concluidos;
    document.getElementById("progress-bar").style.width      = pct + "%";
    document.getElementById("progress-label").textContent =
        `${concluidos} de ${total} exercício${total !== 1 ? "s" : ""} concluído${concluidos !== 1 ? "s" : ""}`;
}

// ─────────────────────────────────────────────
// BOLINHAS NAS ABAS
// ─────────────────────────────────────────────
function updateDots() {
    DIAS.forEach(d => {
        const dot = document.getElementById(`dot-${d.key}`);
        if (!dot) return;

        const blocksOfDay = allBlocks.filter(b => b.day === d.key);
        const hasBlocks = blocksOfDay.length > 0;
        const allDone = hasBlocks && blocksOfDay.every(b => b.completed);

        dot.classList.toggle("filled", hasBlocks);
        dot.classList.toggle("done", allDone);
    });
}

// ─────────────────────────────────────────────
// TROCA DE ABAS
// ─────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        selectedDay = tab.dataset.day;
        renderDay(selectedDay);
    };
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
setHeaderDate();
updateClock();
setInterval(updateClock, 1000);
loadBlocks();