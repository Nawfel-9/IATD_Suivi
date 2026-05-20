/* Configuration Firebase Firestore
   Remplacez ces valeurs par celles de votre projet Firebase.
   Le site utilise l'API REST Firestore sans SDK externe : tout le cahier est
   stocké dans le champ texte "payload" du document ci-dessous.
   Attention : dans un site statique, ces valeurs sont visibles dans le navigateur. */
const FIREBASE_API_KEY = "AIzaSyCew0-KKJ0wymwMNtObDqfDFaUOkFd7frc";
const FIREBASE_PROJECT_ID = "iatd-cahier";
const FIRESTORE_DOCUMENT_PATH = "cahiers/iatd-cahier";

const ADMIN_PASSWORD_HASH = "4f7daaf00c0eaf2c905216c95c47800dff8903d22d282b9a53cf0023127e1a49";
const LOCAL_STORAGE_KEY = "iatd-cahier-donnees";

const yearLabels = {
  troisieme: "3e année",
  quatrieme: "4e année",
  cinquieme: "5e année"
};

const emptyYearData = {
  projets: [],
  devoirs: []
};

const fallbackData = {
  annees: {
    troisieme: {
      projets: [
        {
          id: "prj-architecture-ia",
          module: "Intelligence Artificielle",
          titre: "Système de recommandation académique",
          description: "Concevoir un prototype expliquant le choix du modèle, les données utilisées et les limites éthiques.",
          deadline: "2026-05-22T17:00",
          note: "Inclure une courte discussion sur les biais."
        },
        {
          id: "prj-donnees",
          module: "Ingénierie des Données",
          titre: "Pipeline ETL reproductible",
          description: "Préparer un flux d'extraction, nettoyage et chargement avec journalisation des erreurs.",
          deadline: "2026-05-17T18:00",
          note: "Dépôt Git à joindre dans le rapport."
        },
        {
          id: "prj-recherche",
          module: "Méthodologie de Recherche",
          titre: "Mini mémoire bibliographique",
          description: "Rédiger une synthèse structurée de cinq articles scientifiques récents.",
          deadline: "2026-05-30T12:00",
          note: "Version finale relue."
        }
      ],
      devoirs: [
        {
          id: "dev-proba",
          matiere: "Probabilités",
          titre: "Feuille 4 : variables aléatoires",
          description: "Résoudre les exercices 2, 3, 5 et 7 avec justification détaillée.",
          deadline: "2026-05-21T08:30",
          note: "À déposer avant le cours."
        },
        {
          id: "dev-reseau",
          matiere: "Réseaux",
          titre: "Compte rendu de laboratoire",
          description: "Analyser les captures de paquets et commenter les métriques observées.",
          deadline: "2026-05-25T16:00",
          note: ""
        }
      ]
    },
    quatrieme: cloneData(emptyYearData),
    cinquieme: cloneData(emptyYearData)
  }
};

const state = {
  data: cloneData(fallbackData),
  activeYear: "troisieme",
  activeTab: "projets",
  isAdmin: false,
  lastInsertedId: null
};

const dom = {
  body: document.body,
  adminToggle: document.querySelector("#adminToggle"),
  infoToggle: document.querySelector("#infoToggle"),
  adminStrip: document.querySelector("#adminStrip"),
  adminLogout: document.querySelector("#adminLogout"),
  adminReset: document.querySelector("#adminReset"),
  resetYearButton: document.querySelector("#resetYearButton"),
  resetYearText: document.querySelector("#resetYearText"),
  syncStatus: document.querySelector("#syncStatus"),
  yearButtons: document.querySelectorAll(".year-button"),
  tabButtons: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  projectsList: document.querySelector("#projectsList"),
  assignmentsList: document.querySelector("#assignmentsList"),
  projectsInProgress: document.querySelector("#projectsInProgress"),
  assignmentsInProgress: document.querySelector("#assignmentsInProgress"),
  projectsDone: document.querySelector("#projectsDone"),
  assignmentsDone: document.querySelector("#assignmentsDone"),
  passwordModal: document.querySelector("#passwordModal"),
  passwordForm: document.querySelector("#passwordForm"),
  adminPassword: document.querySelector("#adminPassword"),
  passwordError: document.querySelector("#passwordError"),
  infoModal: document.querySelector("#infoModal"),
  entryModal: document.querySelector("#entryModal"),
  entryForm: document.querySelector("#entryForm"),
  entryKicker: document.querySelector("#entryKicker"),
  entryTitle: document.querySelector("#entryTitle"),
  entryKind: document.querySelector("#entryKind"),
  entryId: document.querySelector("#entryId"),
  primaryLabel: document.querySelector("#primaryLabel"),
  primaryInput: document.querySelector("#primaryInput"),
  titleLabel: document.querySelector("#titleLabel"),
  titleInput: document.querySelector("#titleInput"),
  descriptionLabel: document.querySelector("#descriptionLabel"),
  descriptionInput: document.querySelector("#descriptionInput"),
  deadlineLabel: document.querySelector("#deadlineLabel"),
  deadlineInput: document.querySelector("#deadlineInput"),
  noteInput: document.querySelector("#noteInput"),
  emptyStateTemplate: document.querySelector("#emptyStateTemplate")
};

init();

async function init() {
  bindEvents();
  await loadData();
  render();
}

function bindEvents() {
  dom.adminToggle.addEventListener("click", () => {
    if (state.isAdmin) {
      disableAdminMode();
      return;
    }
    openModal(dom.passwordModal);
    dom.adminPassword.focus();
  });

  dom.adminLogout.addEventListener("click", disableAdminMode);
  dom.resetYearButton.addEventListener("click", resetActiveYear);
  dom.infoToggle.addEventListener("click", () => openModal(dom.infoModal));

  dom.passwordForm.addEventListener("submit", handlePasswordSubmit);
  dom.entryForm.addEventListener("submit", handleEntrySubmit);

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = getModalByName(button.dataset.close);
      closeModal(modal);
    });
  });

  [dom.passwordModal, dom.entryModal, dom.infoModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal && modal !== dom.entryModal) {
        closeModal(modal);
      }
    });
  });

  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  dom.yearButtons.forEach((button) => {
    button.addEventListener("click", () => switchYear(button.dataset.year));
  });

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-action='add']");
    if (addButton) {
      openEntryModal(addButton.dataset.kind);
      return;
    }

    const editButton = event.target.closest("[data-action='edit']");
    if (editButton) {
      openEntryModal(editButton.dataset.kind, editButton.dataset.id);
      return;
    }

    const deleteButton = event.target.closest("[data-action='delete']");
    if (deleteButton) {
      deleteEntry(deleteButton.dataset.kind, deleteButton.dataset.id);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal(dom.passwordModal);
      closeModal(dom.entryModal);
      closeModal(dom.infoModal);
    }
  });
}

async function loadData() {
  setSyncStatus("Chargement du cahier...");
  if (isFirestoreConfigured()) {
    try {
      const response = await fetch(getFirestoreDocumentUrl());
      if (!response.ok) {
        throw new Error(`Erreur Firestore ${response.status}`);
      }
      const document = await response.json();
      const payload = document.fields?.payload?.stringValue;
      if (!payload) {
        throw new Error("Document Firestore sans champ payload");
      }
      state.data = normalizeData(JSON.parse(payload));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.data));
      setSyncStatus("Cahier synchronisé avec Firebase Firestore.");
      return;
    } catch (error) {
      const cached = loadLocalData();
      state.data = cached || cloneData(fallbackData);
      setSyncStatus("Synchronisation Firestore indisponible : copie locale affichée.", true);
      return;
    }
  }

  state.data = loadLocalData() || cloneData(fallbackData);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.data));
  setSyncStatus("Mode local : renseignez Firebase dans app.js pour synchroniser entre appareils.");
}

async function saveData() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.data));

  if (!isFirestoreConfigured()) {
    setSyncStatus("Modifications enregistrées localement.");
    return;
  }

  setSyncStatus("Enregistrement dans Firebase Firestore...");
  try {
    const response = await fetch(getFirestoreDocumentUrl(), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          payload: { stringValue: JSON.stringify(state.data) },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Erreur Firestore ${response.status}`);
    }
    setSyncStatus("Cahier synchronisé avec Firebase Firestore.");
  } catch (error) {
    setSyncStatus("Enregistrement cloud impossible : changements conservés localement.", true);
  }
}

function loadLocalData() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : null;
  } catch (error) {
    return null;
  }
}

function normalizeData(data) {
  if (data?.annees) {
    return {
      annees: Object.keys(yearLabels).reduce((annees, yearKey) => {
        annees[yearKey] = normalizeYearData(data.annees[yearKey]);
        return annees;
      }, {})
    };
  }

  if (Array.isArray(data?.projets) || Array.isArray(data?.devoirs)) {
    return {
      annees: {
        troisieme: normalizeYearData(data),
        quatrieme: cloneData(emptyYearData),
        cinquieme: cloneData(emptyYearData)
      }
    };
  }

  return cloneData(fallbackData);
}

function normalizeYearData(data) {
  return {
    projets: Array.isArray(data?.projets) ? data.projets : [],
    devoirs: Array.isArray(data?.devoirs) ? data.devoirs : []
  };
}

function isFirestoreConfigured() {
  return (
    FIREBASE_API_KEY &&
    FIREBASE_PROJECT_ID &&
    FIRESTORE_DOCUMENT_PATH &&
    !FIREBASE_API_KEY.startsWith("REMPLACER") &&
    !FIREBASE_PROJECT_ID.startsWith("REMPLACER")
  );
}

function getFirestoreDocumentUrl() {
  const encodedPath = FIRESTORE_DOCUMENT_PATH
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/${encodedPath}?key=${encodeURIComponent(FIREBASE_API_KEY)}`;
}

function render() {
  renderYearTabs();
  renderSummary();
  renderList("projets", dom.projectsList);
  renderList("devoirs", dom.assignmentsList);
  updateAdminView();
}

function renderSummary() {
  const yearData = getActiveYearData();
  dom.projectsInProgress.textContent = yearData.projets.filter((item) => !isDoneByDeadline(item)).length;
  dom.assignmentsInProgress.textContent = yearData.devoirs.filter((item) => !isDoneByDeadline(item)).length;
  dom.projectsDone.textContent = yearData.projets.filter(isDoneByDeadline).length;
  dom.assignmentsDone.textContent = yearData.devoirs.filter(isDoneByDeadline).length;
}

function renderList(kind, container) {
  const items = getActiveYearData()[kind];
  container.innerHTML = "";

  if (!items.length) {
    container.append(dom.emptyStateTemplate.content.cloneNode(true));
    return;
  }

  items
    .slice()
    .sort(compareByDeadlinePriority)
    .forEach((item, index) => {
      const card = createCard(kind, item, index);
      container.append(card);
      const delay = state.lastInsertedId === item.id ? 20 : index * 90;
      window.setTimeout(() => card.classList.add("visible"), delay);
      if (state.lastInsertedId === item.id) {
        card.classList.add("inserted");
      }
    });

  state.lastInsertedId = null;
}

function renderYearTabs() {
  dom.yearButtons.forEach((button) => {
    const isActive = button.dataset.year === state.activeYear;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function compareByDeadlinePriority(a, b) {
  const aDone = isDoneByDeadline(a);
  const bDone = isDoneByDeadline(b);
  const aTime = parseDeadline(a.deadline).getTime();
  const bTime = parseDeadline(b.deadline).getTime();

  if (aDone !== bDone) {
    return aDone ? 1 : -1;
  }

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
    return 0;
  }
  if (Number.isNaN(aTime)) {
    return 1;
  }
  if (Number.isNaN(bTime)) {
    return -1;
  }

  return aDone ? bTime - aTime : aTime - bTime;
}

function createCard(kind, item, index) {
  const card = document.createElement("article");
  const displayStatus = getDisplayStatus(kind, item);
  const statusClass = slugStatus(displayStatus);
  const countdown = getCountdown(item.deadline);
  card.className = [
    "work-card",
    `status-${statusClass}`,
    countdown.overdue ? "deadline-overdue" : "",
    countdown.soon ? "deadline-soon" : ""
  ].join(" ");
  card.dataset.id = item.id;

  const isProject = kind === "projets";
  const primary = isProject ? item.module : item.matiere;
  const number = isProject ? `1.${index + 1}` : `2.${index + 1}`;
  const description = item.description
    ? `<p class="card-description">${escapeHtml(item.description)}</p>`
    : "";
  const note = item.note ? `<p class="note">Note : ${escapeHtml(item.note)}</p>` : "";

  card.innerHTML = `
    <div class="card-topline">
      <div>
        <div class="card-number">${number}</div>
        <p class="card-module">${escapeHtml(primary || "")}</p>
        <h3 class="card-title">${escapeHtml(item.titre || "Sans titre")}</h3>
      </div>
      <span class="status-badge status-${statusClass}">${escapeHtml(displayStatus)}</span>
    </div>
    ${description}
    <div class="meta-line">
      <span><strong>${isProject ? "Date limite" : "Date de rendu"} :</strong> ${formatDate(item.deadline)}</span>
      <span class="countdown ${countdown.className}">${countdown.label}</span>
    </div>
    ${note}
    <div class="card-actions">
      <button class="paper-button" type="button" data-action="edit" data-kind="${kind}" data-id="${item.id}">Modifier</button>
      <button class="text-button" type="button" data-action="delete" data-kind="${kind}" data-id="${item.id}">Supprimer</button>
    </div>
  `;

  return card;
}

function switchTab(tab) {
  state.activeTab = tab;
  dom.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  dom.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
}

function switchYear(yearKey) {
  if (!yearLabels[yearKey]) {
    return;
  }
  state.activeYear = yearKey;
  state.lastInsertedId = null;
  render();
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  dom.passwordError.textContent = "";
  const hash = await sha256(dom.adminPassword.value);

  if (hash !== ADMIN_PASSWORD_HASH) {
    dom.passwordError.textContent = "Mot de passe incorrect.";
    return;
  }

  state.isAdmin = true;
  dom.adminPassword.value = "";
  closeModal(dom.passwordModal);
  updateAdminView();
}

function disableAdminMode() {
  state.isAdmin = false;
  updateAdminView();
}

function updateAdminView() {
  dom.body.classList.toggle("admin", state.isAdmin);
  dom.adminStrip.classList.toggle("hidden", !state.isAdmin);
  dom.adminReset.classList.toggle("hidden", !state.isAdmin);
  dom.resetYearText.textContent = `Remise à zéro : ${yearLabels[state.activeYear]}`;
  dom.adminToggle.classList.toggle("unlocked", state.isAdmin);
  dom.adminToggle.setAttribute(
    "aria-label",
    state.isAdmin ? "Quitter le mode administrateur" : "Ouvrir le mode administrateur"
  );
}

function openEntryModal(kind, id = "") {
  const isProject = kind === "projets";
  const yearData = getActiveYearData();
  const item = id ? yearData[kind].find((entry) => entry.id === id) : null;

  dom.entryKind.value = kind;
  dom.entryId.value = id;
  dom.entryKicker.textContent = item ? "Correction d'entrée" : "Nouvelle entrée";
  dom.entryTitle.textContent = item
    ? isProject ? `Modifier un projet - ${yearLabels[state.activeYear]}` : `Modifier un devoir - ${yearLabels[state.activeYear]}`
    : isProject ? `Ajouter un projet - ${yearLabels[state.activeYear]}` : `Ajouter un devoir - ${yearLabels[state.activeYear]}`;

  dom.primaryLabel.textContent = isProject ? "Nom du module" : "Matière";
  dom.primaryInput.placeholder = isProject ? "Nom du module" : "Nom de la matière";
  dom.titleLabel.textContent = isProject ? "Intitulé du projet" : "Titre du devoir";
  dom.titleInput.placeholder = isProject ? "Intitulé du projet" : "Titre du devoir";
  dom.descriptionLabel.textContent = isProject ? "Description du projet" : "Consigne du devoir";
  dom.deadlineLabel.textContent = isProject ? "Date limite" : "Date de rendu";

  dom.primaryInput.value = item ? (isProject ? item.module : item.matiere) || "" : "";
  dom.titleInput.value = item?.titre || "";
  dom.descriptionInput.value = item?.description || "";
  dom.deadlineInput.value = toDateTimeInputValue(item?.deadline || "");
  dom.noteInput.value = item?.note || "";

  openModal(dom.entryModal);
  dom.primaryInput.focus();
}

async function handleEntrySubmit(event) {
  event.preventDefault();

  const kind = dom.entryKind.value;
  const id = dom.entryId.value || makeId(kind);
  const isProject = kind === "projets";
  const yearData = getActiveYearData();
  const payload = {
    id,
    titre: dom.titleInput.value.trim(),
    description: dom.descriptionInput.value.trim(),
    deadline: dom.deadlineInput.value,
    note: dom.noteInput.value.trim()
  };

  if (isProject) {
    payload.module = dom.primaryInput.value.trim();
  } else {
    payload.matiere = dom.primaryInput.value.trim();
  }

  const index = yearData[kind].findIndex((entry) => entry.id === id);
  if (index >= 0) {
    yearData[kind][index] = payload;
  } else {
    yearData[kind].push(payload);
    state.lastInsertedId = id;
  }

  closeModal(dom.entryModal);
  switchTab(kind);
  render();
  await saveData();
}

async function deleteEntry(kind, id) {
  const card = [...document.querySelectorAll(".work-card")].find((element) => element.dataset.id === id);
  if (card) {
    card.classList.add("removing");
    await wait(360);
  }

  const yearData = getActiveYearData();
  yearData[kind] = yearData[kind].filter((entry) => entry.id !== id);
  render();
  await saveData();
}

async function resetActiveYear() {
  const label = yearLabels[state.activeYear];
  const confirmed = window.confirm(`Réinitialiser tous les projets et devoirs de la ${label} ?`);
  if (!confirmed) {
    return;
  }

  state.data.annees[state.activeYear] = cloneData(emptyYearData);
  state.lastInsertedId = null;
  render();
  await saveData();
}

function getActiveYearData() {
  if (!state.data.annees) {
    state.data = normalizeData(state.data);
  }
  if (!state.data.annees[state.activeYear]) {
    state.data.annees[state.activeYear] = cloneData(emptyYearData);
  }
  return state.data.annees[state.activeYear];
}

function openModal(modal) {
  modal.classList.remove("hidden", "closing");
}

function getModalByName(name) {
  if (name === "password") {
    return dom.passwordModal;
  }
  if (name === "info") {
    return dom.infoModal;
  }
  return dom.entryModal;
}

function closeModal(modal) {
  if (modal.classList.contains("hidden")) {
    return;
  }
  modal.classList.add("closing");
  window.setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("closing");
    dom.passwordError.textContent = "";
  }, 280);
}

function setSyncStatus(message, isError = false) {
  dom.syncStatus.textContent = message;
  dom.syncStatus.classList.toggle("error", isError);
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getCountdown(dateValue) {
  const now = new Date();
  const deadline = parseDeadline(dateValue);
  const diffMs = deadline - now;
  const diffDays = Math.ceil(diffMs / 86400000);
  const diffHours = Math.ceil(diffMs / 3600000);

  if (Number.isNaN(deadline.getTime())) {
    return { label: "Date non définie", className: "", soon: false, overdue: false };
  }
  if (diffMs < 0) {
    return {
      label: `Terminé depuis ${formatDuration(Math.abs(diffMs))}`,
      className: "overdue",
      soon: false,
      overdue: true
    };
  }
  if (diffHours <= 24) {
    return {
      label: diffHours <= 1 ? "Moins d'une heure restante" : `${diffHours} h restantes`,
      className: "soon",
      soon: true,
      overdue: false
    };
  }
  if (diffDays <= 3) {
    return {
      label: formatRemainingDuration(diffMs),
      className: "soon",
      soon: true,
      overdue: false
    };
  }
  return { label: formatRemainingDuration(diffMs), className: "", soon: false, overdue: false };
}

function formatDuration(milliseconds) {
  const totalHours = Math.max(1, Math.ceil(milliseconds / 3600000));
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays < 1) {
    return `${totalHours} h`;
  }

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  if (weeks > 0) {
    const weekText = `${weeks} ${weeks > 1 ? "semaines" : "semaine"}`;
    const dayText = days > 0 ? ` et ${days} ${days > 1 ? "jours" : "jour"}` : "";
    return `${weekText}${dayText}`;
  }

  return `${totalDays} ${totalDays > 1 ? "jours" : "jour"}`;
}

function formatRemainingDuration(milliseconds) {
  const duration = formatDuration(milliseconds);
  if (duration.endsWith("semaines")) {
    return `${duration} restantes`;
  }
  if (duration.endsWith("semaine")) {
    return `${duration} restante`;
  }
  return `${duration} restant${duration.startsWith("1 ") && !duration.includes(" et ") ? "" : "s"}`;
}

function formatDate(dateValue) {
  const date = parseDeadline(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Non définie";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getDisplayStatus(kind, item) {
  return isDoneByDeadline(item) ? "Terminé" : "En cours";
}

function isDoneByDeadline(item) {
  return getCountdown(item.deadline).overdue;
}

function parseDeadline(dateValue) {
  if (!dateValue) {
    return new Date(Number.NaN);
  }
  return new Date(dateValue.includes("T") ? dateValue : `${dateValue}T00:00`);
}

function toDateTimeInputValue(dateValue) {
  if (!dateValue) {
    return "";
  }
  return dateValue.includes("T") ? dateValue.slice(0, 16) : `${dateValue}T00:00`;
}

function slugStatus(status) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeId(kind) {
  return `${state.activeYear}-${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
