/* ============================================================
   CONFIGURAÇÃO DA API
   ============================================================ */
const API_URL = 'https://dashboard-production-fde4.up.railway.app';

/* ============================================================
   PARTE 1: DADOS, CONFIGURAÇÃO E RENDERIZAÇÃO
   ============================================================ */
const categories = [
    { key: 'hoje', label: 'Tarefas da Semana'},
    { key: 'futura', label: 'Lembretes'},
    { key: 'metas', label: 'Planejamento'},
    { key: 'escola', label: 'Escola'},
    { key: 'secundarias', label: 'Cursos'},
];
const priorityBadges = {
    alta: { cls: 'badge-alta', icon: 'ri-arrow-up-circle-fill', label: 'Maior' },
    media: { cls: 'badge-media', icon: 'ri-arrow-right-circle-fill', label: 'Média' },
    baixa: { cls: 'badge-baixa', icon: 'ri-arrow-down-circle-fill', label: 'Baixa' },
};
var tasks = [];
var activeTab = 'hoje';
var editingId = null;
var deletingId = null;
function $(id) { return document.getElementById(id); }
async function loadTasks() {
    $('loading').style.display = 'flex';
    $('error').style.display = 'none';
    $('main').style.display = 'none';
    try {
        var res = await fetch(API_URL + '/tasks');
        if (!res.ok) throw new Error('Falha ao carregar');
        tasks = await res.json();
        $('loading').style.display = 'none';
        $('main').style.display = 'block';
        renderAll();
    } catch (e) {
        $('loading').style.display = 'none';
        $('error').style.display = 'flex';
        $('errorMsg').textContent = 'Não foi possível conectar ao servidor. O backend está rodando?';
    }
}
function renderAll() {
    renderGreeting();
    renderProgress();
    renderStats();
    renderTabs();
    renderTasks();
}
function renderGreeting() {
    var h = new Date().getHours();
    var g = 'Boa noite, Arthur';
    if (h < 12) g = 'Bom dia, Arthur';
    else if (h < 18) g = 'Boa tarde, Arthur';
    $('greetingText').textContent = g + '!';
}
function renderProgress() {
    var total = tasks.length;
    var done = 0;
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].completed) done++;
    }
    var pct = total ? Math.round((done / total) * 100) : 0;
    $('progressPercent').textContent = pct;
    $('progressFill').style.width = pct + '%';
}
function renderStats() {
    var counts = {};
    for (var i = 0; i < categories.length; i++) {
        counts[categories[i].key] = 0;
    }
    var concluidas = 0;
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].completed) concluidas++;
        else if (counts[tasks[i].category] !== undefined) counts[tasks[i].category]++;
    }
    var html = '';
    for (var i = 0; i < categories.length; i++) {
        var c = categories[i];
        html += '<div class="stat-card ' + (activeTab === c.key ? 'active' : '') + '" onclick="setTab(\'' + c.key + '\')">' +
            '<i class="' + c.icon + '"></i>' +
            '<div class="stat-label">' + c.label + '</div>' +
            '<div class="stat-num">' + counts[c.key] + '</div>' +
            '</div>';
    }
    html += '<div class="stat-card ' + (activeTab === 'concluidas' ? 'active' : '') + '" onclick="setTab(\'concluidas\')">' +
        '<div class="stat-label">Concluídas</div>' +
        '<div class="stat-num">' + concluidas + '</div>' +
        '</div>';
    $('statsGrid').innerHTML = html;
}
function renderTabs() {
    var html = '';
    for (var i = 0; i < categories.length; i++) {
        var c = categories[i];
        html += '<button class="tab ' + (activeTab === c.key ? 'active' : '') + '" onclick="setTab(\'' + c.key + '\')">' + c.label + '</button>';
    }
    html += '<button class="tab ' + (activeTab === 'concluidas' ? 'active' : '') + '" onclick="setTab(\'concluidas\')">Concluídas</button>';
    $('tabs').innerHTML = html;
}
function renderTasks() {
    var filtered = [];
    for (var i = 0; i < tasks.length; i++) {
        var t = tasks[i];
        if (activeTab === 'concluidas') {
            if (t.completed) filtered.push(t);
        } else {
            if (t.category === activeTab && !t.completed) filtered.push(t);
        }
    }
    if (filtered.length === 0) {
        var msg = activeTab === 'concluidas' ? 'Nenhuma tarefa concluída ainda' : 'Nenhuma tarefa nesta categoria';
        var sub = activeTab === 'concluidas' ? 'Conclua uma tarefa para vê-la aqui' : 'Adicione uma nova tarefa acima';
        $('taskList').innerHTML = '<div class="empty"><i class="ri-task-line"></i><p>' + msg + '</p><p class="small">' + sub + '</p></div>';
        return;
    }
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var t = filtered[i];
        var pb = priorityBadges[t.priority] || priorityBadges['media'];
        html += '<div class="task-item ' + (t.completed ? 'done' : '') + '">' +
            '<span class="badge ' + pb.cls + '"><i class="' + pb.icon + '"></i> ' + pb.label + '</span>' +
            '<span class="task-text">' + escapeHtml(t.description) + '</span>' +
            '<div class="task-actions">' +
            '<button class="icon-btn done-btn" onclick="toggleTask(' + t.id + ')" title="' + (t.completed ? 'Reabrir' : 'Concluir') + '">' +
            '<i class="' + (t.completed ? 'ri-refresh-line' : 'ri-check-line') + '"></i>' +
            '</button>' +
            '<button class="icon-btn" onclick="openEdit(' + t.id + ')" title="Editar">' +
            '<i class="ri-pencil-line"></i>' +
            '</button>' +
            '<button class="icon-btn" onclick="deleteTask(' + t.id + ')" title="Excluir">' +
            '<i class="ri-delete-bin-line"></i>' +
            '</button>' +
            '</div>' +
            '</div>';
    }
    $('taskList').innerHTML = html;
}
function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function setTab(tab) {
    activeTab = tab;
    renderStats();
    renderTabs();
    renderTasks();
}

/* ============================================================
   PARTE 2: AÇÕES (ADICIONAR, CONCLUIR, EDITAR, EXCLUIR)
   ============================================================ */
async function addTask() {
    var desc = $('taskInput').value.trim();
    if (!desc) return;
    var category = $('taskCategory').value;
    var priority = $('taskPriority').value;
    try {
        await fetch(API_URL + '/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: desc, category: category, priority: priority })
        });
        $('taskInput').value = '';
        $('taskPriority').value = 'media';
        await loadTasks();
    } catch (e) {
        console.error('Erro ao adicionar:', e);
    }
}
async function toggleTask(id) {
    var task = null;
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].id === id) { task = tasks[i]; break; }
    }
    if (!task) return;
    try {
        await fetch(API_URL + '/tasks/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: task.completed ? 0 : 1 })
        });
        await loadTasks();
    } catch (e) {
        console.error('Erro ao alternar:', e);
    }
}
function openEdit(id) {
    var task = null;
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].id === id) { task = tasks[i]; break; }
    }
    if (!task) return;
    editingId = id;
    $('editInput').value = task.description;
    $('editModal').classList.add('show');
    setTimeout(function() { $('editInput').focus(); $('editInput').select(); }, 50);
}
function closeEdit(e) {
    if (e && e.target !== $('editModal')) return;
    $('editModal').classList.remove('show');
    editingId = null;
}
async function saveEdit() {
    var desc = $('editInput').value.trim();
    if (!desc || !editingId) return;
    try {
        await fetch(API_URL + '/tasks/' + editingId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: desc })
        });
        $('editModal').classList.remove('show');
        editingId = null;
        await loadTasks();
    } catch (e) {
        console.error('Erro ao editar:', e);
    }
}
function deleteTask(id) {
    var task = null;
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].id === id) { task = tasks[i]; break; }
    }
    if (!task) return;
    deletingId = id;
    $('deleteTaskName').textContent = '"' + task.description + '"';
    $('deleteModal').classList.add('show');
}
function closeDeleteModal(e) {
    if (e && e.target !== $('deleteModal')) return;
    $('deleteModal').classList.remove('show');
    deletingId = null;
}
async function confirmDelete() {
    if (!deletingId) return;
    try {
        await fetch(API_URL + '/tasks/' + deletingId, { method: 'DELETE' });
        $('deleteModal').classList.remove('show');
        deletingId = null;
        await loadTasks();
    } catch (e) {
        console.error('Erro ao excluir:', e);
    }
}

/* ============================================================
   PARTE 3: RELÓGIO, ATALHOS DE TECLADO E INICIALIZAÇÃO
   ============================================================ */
function updateClock() {
    var now = new Date();
    $('clockTime').textContent = now.toLocaleTimeString('pt-BR');
    $('clockDate').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}
setInterval(updateClock, 1000);
updateClock();
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        $('editModal').classList.remove('show');
        $('deleteModal').classList.remove('show');
        editingId = null;
        deletingId = null;
    }
});
loadTasks();
