// ==============================
// Estado global e persistência
// ==============================
const STORAGE_KEY = "rotinaIAState_v1";
const defaultState = {
  theme: "dark",
  users: [],
  currentUserId: null,
  reminderMarks: {}
};

let state = loadState();
let calendarView = "day";
let clockInterval;
let reminderInterval;

// Elementos principais da interface
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");
const toastContainer = document.getElementById("toastContainer");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const tabButtons = document.querySelectorAll(".tab-btn");

const userNameLabel = document.getElementById("userNameLabel");
const todayOverviewText = document.getElementById("todayOverviewText");
const clockTime = document.getElementById("clockTime");
const clockDate = document.getElementById("clockDate");
const todayTasksCount = document.getElementById("todayTasksCount");
const todayEventsCount = document.getElementById("todayEventsCount");
const progressPercent = document.getElementById("progressPercent");
const dailyProgressText = document.getElementById("dailyProgressText");
const dailyProgressBar = document.getElementById("dailyProgressBar");

const eventList = document.getElementById("eventList");
const eventForm = document.getElementById("eventForm");
const eventId = document.getElementById("eventId");
const eventTitle = document.getElementById("eventTitle");
const eventDescription = document.getElementById("eventDescription");
const eventDate = document.getElementById("eventDate");
const eventTime = document.getElementById("eventTime");
const eventPriority = document.getElementById("eventPriority");
const cancelEditEvent = document.getElementById("cancelEditEvent");
const viewButtons = document.querySelectorAll(".view-btn");

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");

const habitForm = document.getElementById("habitForm");
const habitInput = document.getElementById("habitInput");
const habitList = document.getElementById("habitList");

const notificationCenter = document.getElementById("notificationCenter");
const resetDataBtn = document.getElementById("resetDataBtn");

const chatMessages = document.getElementById("chatMessages");
const aiForm = document.getElementById("aiForm");
const aiInput = document.getElementById("aiInput");

// ==============================
// Funções utilitárias
// ==============================
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return {
      ...defaultState,
      ...saved,
      users: Array.isArray(saved?.users) ? saved.users : [],
      reminderMarks: saved?.reminderMarks || {}
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function generateId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCurrentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || null;
}

function todayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function parseEventDateTime(event) {
  return new Date(`${event.date}T${event.time || "00:00"}`);
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function playBeep() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.05;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
  } catch {
    // O som é opcional e pode ser bloqueado pelo navegador.
  }
}

function updateTheme() {
  document.body.setAttribute("data-theme", state.theme);
  themeToggle.textContent = state.theme === "dark" ? "☀️ Modo claro" : "🌙 Modo escuro";
}

// ==============================
// Controle de autenticação
// ==============================
function createStarterData(name) {
  const date = todayString();

  return {
    events: [
      {
        id: generateId(),
        title: "Planejar o dia",
        description: `Sessão rápida para organizar a rotina de ${name}.`,
        date,
        time: "09:00",
        priority: "high"
      }
    ],
    tasks: [
      { id: generateId(), text: "Revisar metas do dia", done: false, createdAt: date },
      { id: generateId(), text: "Separar 30 min para foco", done: false, createdAt: date }
    ],
    habits: [
      { id: generateId(), name: "Beber água", doneDates: [] },
      { id: generateId(), name: "Estudar 20 minutos", doneDates: [] }
    ],
    reminderFeed: ["Seu painel está pronto para começar!"],
    chatHistory: [
      {
        id: generateId(),
        sender: "assistant",
        text: `Olá, ${name}! Posso sugerir horários, montar cronogramas e ajudar na sua produtividade.`
      }
    ]
  };
}

function login(email, password) {
  const user = state.users.find((item) => item.email === email && item.password === password);

  if (!user) {
    showToast("E-mail ou senha inválidos.", "error");
    return;
  }

  state.currentUserId = user.id;
  saveState();
  showToast(`Bem-vindo(a) de volta, ${user.name}!`, "success");
  enterApp();
}

function register(name, email, password) {
  const exists = state.users.some((item) => item.email === email);

  if (exists) {
    showToast("Este e-mail já está cadastrado.", "warning");
    return;
  }

  const starter = createStarterData(name);
  const newUser = {
    id: generateId(),
    name,
    email,
    password,
    ...starter
  };

  state.users.push(newUser);
  state.currentUserId = newUser.id;
  saveState();
  showToast("Conta criada com sucesso!", "success");
  enterApp();
}

function logout() {
  state.currentUserId = null;
  saveState();
  appSection.classList.add("hidden");
  authSection.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
}

function enterApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  renderAll();
  startClock();
  startReminderEngine();
}

// ==============================
// Renderização da interface
// ==============================
function renderAll() {
  const user = getCurrentUser();
  if (!user) return;

  userNameLabel.textContent = user.name;
  renderSummary();
  renderEvents();
  renderTasks();
  renderHabits();
  renderProgress();
  renderReminderCenter();
  renderChat();
}

function renderSummary() {
  const user = getCurrentUser();
  if (!user) return;

  const today = todayString();
  const todayTasks = user.tasks.filter((task) => task.createdAt === today);
  const doneTasks = todayTasks.filter((task) => task.done).length;
  const eventsToday = user.events.filter((event) => event.date === today);
  const importantCount = eventsToday.filter((event) => event.priority === "high").length;

  todayTasksCount.textContent = `${doneTasks}/${todayTasks.length}`;
  todayEventsCount.textContent = String(eventsToday.length);

  todayOverviewText.textContent =
    eventsToday.length > 0
      ? `Hoje você tem ${eventsToday.length} evento(s), ${importantCount} importante(s) e ${todayTasks.length} tarefa(s) registrada(s).`
      : `Hoje está mais leve: ${todayTasks.length} tarefa(s) registrada(s) e nenhum evento agendado.`;
}

function filterEventsByView(events) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endWeek = new Date(startToday);
  endWeek.setDate(endWeek.getDate() + 7);

  return events
    .filter((event) => {
      const eventDate = parseEventDateTime(event);

      if (calendarView === "day") {
        return event.date === todayString(now);
      }

      if (calendarView === "week") {
        return eventDate >= startToday && eventDate <= endWeek;
      }

      return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
    })
    .sort((a, b) => parseEventDateTime(a) - parseEventDateTime(b));
}

function renderEvents() {
  const user = getCurrentUser();
  if (!user) return;

  const filtered = filterEventsByView(user.events);

  if (filtered.length === 0) {
    eventList.innerHTML = `<div class="empty-state">Nenhum evento encontrado nesta visualização.</div>`;
    return;
  }

  eventList.innerHTML = filtered
    .map(
      (event) => `
        <article class="event-item ${event.priority}">
          <div class="event-top">
            <div>
              <strong>${escapeHtml(event.title)}</strong>
              <div class="event-meta">${escapeHtml(event.description || "Sem descrição")}</div>
              <div class="event-meta">📅 ${event.date} às ${event.time}</div>
            </div>

            <div class="item-actions">
              <span class="badge">${event.priority === "high" ? "Importante" : event.priority === "medium" ? "Médio" : "Baixo"}</span>
              <button class="icon-btn" type="button" data-edit-event="${event.id}">✏️</button>
              <button class="icon-btn" type="button" data-delete-event="${event.id}">🗑️</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderTasks() {
  const user = getCurrentUser();
  if (!user) return;

  if (user.tasks.length === 0) {
    taskList.innerHTML = `<div class="empty-state">Nenhuma tarefa criada ainda.</div>`;
    return;
  }

  taskList.innerHTML = user.tasks
    .slice()
    .reverse()
    .map(
      (task) => `
        <div class="list-item">
          <div>
            <strong class="${task.done ? "done-text" : ""}">${escapeHtml(task.text)}</strong>
            <span class="muted-text">Criada em ${task.createdAt}</span>
          </div>

          <div class="item-actions">
            <button class="icon-btn" type="button" data-toggle-task="${task.id}">${task.done ? "↩️" : "✅"}</button>
            <button class="icon-btn" type="button" data-delete-task="${task.id}">🗑️</button>
          </div>
        </div>
      `
    )
    .join("");
}

function renderHabits() {
  const user = getCurrentUser();
  if (!user) return;

  if (user.habits.length === 0) {
    habitList.innerHTML = `<div class="empty-state">Nenhum hábito cadastrado.</div>`;
    return;
  }

  const today = todayString();

  habitList.innerHTML = user.habits
    .map((habit) => {
      const completedToday = habit.doneDates.includes(today);
      return `
        <div class="list-item">
          <div>
            <strong class="${completedToday ? "done-text" : ""}">${escapeHtml(habit.name)}</strong>
            <span class="muted-text">${completedToday ? "Concluído hoje" : "Pendente hoje"}</span>
          </div>

          <div class="item-actions">
            <button class="icon-btn" type="button" data-toggle-habit="${habit.id}">${completedToday ? "🌟" : "⭕"}</button>
            <button class="icon-btn" type="button" data-delete-habit="${habit.id}">🗑️</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderProgress() {
  const user = getCurrentUser();
  if (!user) return;

  const today = todayString();
  const todayTasks = user.tasks.filter((task) => task.createdAt === today);
  const completedTasks = todayTasks.filter((task) => task.done).length;
  const completedHabits = user.habits.filter((habit) => habit.doneDates.includes(today)).length;

  const total = todayTasks.length + user.habits.length;
  const completed = completedTasks + completedHabits;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressPercent.textContent = `${percent}%`;
  dailyProgressText.textContent = `${completed} de ${total} concluídos`;
  dailyProgressBar.style.width = `${percent}%`;
}

function renderReminderCenter() {
  const user = getCurrentUser();
  if (!user) return;

  const upcoming = user.events
    .filter((event) => parseEventDateTime(event) >= new Date())
    .sort((a, b) => parseEventDateTime(a) - parseEventDateTime(b))
    .slice(0, 4);

  const reminders = [...(user.reminderFeed || []), ...upcoming.map((event) => `Próximo: ${event.title} às ${event.time} em ${event.date}`)]
    .slice(-5)
    .reverse();

  if (reminders.length === 0) {
    notificationCenter.innerHTML = `<div class="empty-state">Nenhum lembrete no momento.</div>`;
    return;
  }

  notificationCenter.innerHTML = reminders
    .map((item) => `<div class="reminder-item"><span>${escapeHtml(item)}</span></div>`)
    .join("");
}

function renderChat() {
  const user = getCurrentUser();
  if (!user) return;

  const history = user.chatHistory || [];
  chatMessages.innerHTML = history
    .map(
      (message) => `
        <div class="chat-message ${message.sender}">
          <strong>${message.sender === "assistant" ? "IA" : "Você"}</strong>
          <div>${escapeHtml(message.text)}</div>
        </div>
      `
    )
    .join("");

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==============================
// Relógio em tempo real
// ==============================
function startClock() {
  clearInterval(clockInterval);

  const updateClock = () => {
    const now = new Date();
    clockTime.textContent = now.toLocaleTimeString("pt-BR");
    clockDate.textContent = formatDisplayDate(now);
  };

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

// ==============================
// Motor de lembretes e avisos
// ==============================
function pushReminder(message, toastType = "info") {
  const user = getCurrentUser();
  if (!user) return;

  user.reminderFeed = user.reminderFeed || [];
  user.reminderFeed.push(message);
  user.reminderFeed = user.reminderFeed.slice(-6);
  saveState();
  renderReminderCenter();
  showToast(message, toastType);
  playBeep();
}

function startReminderEngine() {
  clearInterval(reminderInterval);

  if (window.Notification && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }

  const checkReminders = () => {
    const user = getCurrentUser();
    if (!user) return;

    const now = new Date();

    user.events.forEach((event) => {
      const eventDate = parseEventDateTime(event);
      const diffMinutes = Math.round((eventDate - now) / 60000);
      const tenMinKey = `${event.id}-10`;
      const zeroKey = `${event.id}-0`;

      if (diffMinutes <= 10 && diffMinutes >= 9 && !state.reminderMarks[tenMinKey]) {
        state.reminderMarks[tenMinKey] = true;
        pushReminder(`⏰ Faltam 10 minutos para "${event.title}".`, "warning");
      }

      if (diffMinutes <= 0 && diffMinutes >= -1 && !state.reminderMarks[zeroKey]) {
        state.reminderMarks[zeroKey] = true;
        pushReminder(`🔔 Agora: ${event.title}`, "success");

        if (window.Notification && Notification.permission === "granted") {
          new Notification("Rotina IA", { body: `Agora: ${event.title}` });
        }
      }
    });

    saveState();
  };

  checkReminders();
  reminderInterval = setInterval(checkReminders, 30000);
}

// ==============================
// Eventos da agenda
// ==============================
function resetEventForm() {
  eventId.value = "";
  eventForm.reset();
  eventDate.value = todayString();
}

function saveEvent(eventData) {
  const user = getCurrentUser();
  if (!user) return;

  if (eventData.id) {
    user.events = user.events.map((item) => (item.id === eventData.id ? eventData : item));
    showToast("Evento atualizado com sucesso!", "success");
  } else {
    user.events.push({ ...eventData, id: generateId() });
    showToast("Evento adicionado à agenda.", "success");
  }

  saveState();
  resetEventForm();
  renderAll();
}

function deleteEventById(id) {
  const user = getCurrentUser();
  if (!user) return;

  user.events = user.events.filter((event) => event.id !== id);
  saveState();
  renderAll();
  showToast("Evento removido.", "info");
}

function editEventById(id) {
  const user = getCurrentUser();
  const event = user?.events.find((item) => item.id === id);
  if (!event) return;

  eventId.value = event.id;
  eventTitle.value = event.title;
  eventDescription.value = event.description;
  eventDate.value = event.date;
  eventTime.value = event.time;
  eventPriority.value = event.priority;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==============================
// Tarefas e hábitos
// ==============================
function addTask(text) {
  const user = getCurrentUser();
  if (!user) return;

  user.tasks.push({
    id: generateId(),
    text,
    done: false,
    createdAt: todayString()
  });

  saveState();
  renderAll();
}

function toggleTask(id) {
  const user = getCurrentUser();
  if (!user) return;

  user.tasks = user.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
  saveState();
  renderAll();
}

function deleteTask(id) {
  const user = getCurrentUser();
  if (!user) return;

  user.tasks = user.tasks.filter((task) => task.id !== id);
  saveState();
  renderAll();
}

function addHabit(name) {
  const user = getCurrentUser();
  if (!user) return;

  user.habits.push({ id: generateId(), name, doneDates: [] });
  saveState();
  renderAll();
}

function toggleHabit(id) {
  const user = getCurrentUser();
  if (!user) return;

  const today = todayString();

  user.habits = user.habits.map((habit) => {
    if (habit.id !== id) return habit;

    const alreadyDone = habit.doneDates.includes(today);
    return {
      ...habit,
      doneDates: alreadyDone
        ? habit.doneDates.filter((date) => date !== today)
        : [...habit.doneDates, today]
    };
  });

  saveState();
  renderAll();
}

function deleteHabit(id) {
  const user = getCurrentUser();
  if (!user) return;

  user.habits = user.habits.filter((habit) => habit.id !== id);
  saveState();
  renderAll();
}

// ==============================
// Assistente virtual com IA local
// ==============================
function buildSmartSuggestion(message) {
  const user = getCurrentUser();
  if (!user) return "Faça login para receber sugestões.";

  const lower = message.toLowerCase();
  const today = todayString();
  const todayEvents = user.events.filter((event) => event.date === today);
  const openTasks = user.tasks.filter((task) => !task.done);
  const pendingHabits = user.habits.filter((habit) => !habit.doneDates.includes(today));

  if (lower.includes("resumo")) {
    return `Hoje você tem ${todayEvents.length} evento(s), ${openTasks.length} tarefa(s) pendente(s) e ${pendingHabits.length} hábito(s) para concluir.`;
  }

  if (lower.includes("horário") || lower.includes("horario")) {
    const nextEvent = todayEvents.sort((a, b) => parseEventDateTime(a) - parseEventDateTime(b))[0];
    return nextEvent
      ? `Seu próximo compromisso é "${nextEvent.title}" às ${nextEvent.time}. Sugiro reservar 25 minutos de foco antes dele.`
      : "Seu dia está livre. Um bom horário para foco é entre 09:00 e 11:00 ou entre 14:00 e 16:00.";
  }

  if (lower.includes("cronograma") || lower.includes("rotina") || lower.includes("organizar")) {
    const taskPreview = openTasks.slice(0, 3).map((task) => `• ${task.text}`).join(" ") || "• Revisar prioridades do dia";
    return `Sugestão rápida: 1) comece com a tarefa mais importante, 2) faça pausas curtas a cada 50 minutos, 3) encaixe seus hábitos entre blocos. Próximas ações: ${taskPreview}`;
  }

  if (lower.includes("produtividade") || lower.includes("foco")) {
    return "Dica de produtividade: trabalhe em blocos de 25 a 50 minutos, silencie distrações e conclua primeiro o item mais importante da manhã.";
  }

  return "Posso ajudar com resumo do dia, sugestão de horários, cronograma automático e dicas de produtividade. Experimente perguntar: 'monte um cronograma para hoje'.";
}

function addChatMessage(sender, text) {
  const user = getCurrentUser();
  if (!user) return;

  user.chatHistory = user.chatHistory || [];
  user.chatHistory.push({ id: generateId(), sender, text });
  user.chatHistory = user.chatHistory.slice(-16);
  saveState();
  renderChat();
}

// ==============================
// Eventos da interface
// ==============================
function setupEventListeners() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      const isLogin = button.dataset.authTab === "login";
      loginForm.classList.toggle("hidden", !isLogin);
      registerForm.classList.toggle("hidden", isLogin);
    });
  });

  themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    updateTheme();
  });

  logoutBtn.addEventListener("click", logout);

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    login(email, password);
    loginForm.reset();
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();

    if (name.length < 2 || password.length < 4) {
      showToast("Preencha nome e uma senha com pelo menos 4 caracteres.", "warning");
      return;
    }

    register(name, email, password);
    registerForm.reset();
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      calendarView = button.dataset.view;
      viewButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderEvents();
    });
  });

  eventForm.addEventListener("submit", (event) => {
    event.preventDefault();

    saveEvent({
      id: eventId.value,
      title: eventTitle.value.trim(),
      description: eventDescription.value.trim(),
      date: eventDate.value,
      time: eventTime.value,
      priority: eventPriority.value
    });
  });

  cancelEditEvent.addEventListener("click", resetEventForm);

  eventList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.dataset.editEvent) {
      editEventById(target.dataset.editEvent);
    }

    if (target.dataset.deleteEvent) {
      deleteEventById(target.dataset.deleteEvent);
    }
  });

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    addTask(text);
    taskForm.reset();
  });

  taskList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.dataset.toggleTask) toggleTask(target.dataset.toggleTask);
    if (target.dataset.deleteTask) deleteTask(target.dataset.deleteTask);
  });

  habitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = habitInput.value.trim();
    if (!name) return;
    addHabit(name);
    habitForm.reset();
  });

  habitList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.dataset.toggleHabit) toggleHabit(target.dataset.toggleHabit);
    if (target.dataset.deleteHabit) deleteHabit(target.dataset.deleteHabit);
  });

  aiForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = aiInput.value.trim();
    if (!message) return;

    addChatMessage("user", message);

    const reply = buildSmartSuggestion(message);
    setTimeout(() => addChatMessage("assistant", reply), 250);

    aiForm.reset();
  });

  resetDataBtn.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;

    const confirmed = window.confirm("Deseja apagar tarefas, hábitos, eventos e conversas deste perfil?");
    if (!confirmed) return;

    user.events = [];
    user.tasks = [];
    user.habits = [];
    user.chatHistory = [
      {
        id: generateId(),
        sender: "assistant",
        text: "Dados limpos com sucesso. Posso ajudar você a recomeçar a rotina."
      }
    ];
    user.reminderFeed = ["Seu painel foi reiniciado."];
    state.reminderMarks = {};

    saveState();
    renderAll();
    resetEventForm();
    showToast("Seus dados foram resetados.", "success");
  });
}

// ==============================
// Inicialização da aplicação
// ==============================
updateTheme();
setupEventListeners();
resetEventForm();

if (getCurrentUser()) {
  enterApp();
}
