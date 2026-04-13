import { setHeader, setFooter } from "../scripts/layout.js";

const API_BASE_URL = "http://localhost:3000/api";
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const mainEl = document.querySelector(".js_main");

setHeader();
setFooter();

const categories = [];
let currentMode = "view";
let editingCategoryId = null;
let actionMessage = "";
let actionMessageType = "";
let isLoading = true;

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function redirectToLogin() {
  window.location.assign("../html/connexion.html#login");
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function fetchWithAuth(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    redirectToLogin();
    throw new Error("Connectez-vous pour gérer vos catégories.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafely(response);

  if (response.status === 401) {
    redirectToLogin();
    throw new Error(data.message || "Votre session a expiré.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Une erreur est survenue côté serveur.");
  }

  return data;
}

function normalizeConfidentiality(value) {
  const normalizedValue = String(value || "").toLowerCase();

  if (value === 1 || value === "1" || value === true) return "Private";
  if (value === 0 || value === "0" || value === false) return "Public";
  if (normalizedValue === "private") return "Private";
  if (normalizedValue === "public") return "Public";
  return "Public";
}

function toApiConfidentiality(value) {
  return normalizeConfidentiality(value) === "Private" ? 1 : 0;
}

function setInlineMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = `form-message${type ? ` is-${type}` : ""}`;
}

function clearActionMessage() {
  actionMessage = "";
  actionMessageType = "";
}

function resolveCategorySecurity({
  confidentiality,
  password,
  messageEl,
  privacySelect,
}) {
  const trimmedPassword = String(password || "").trim();

  if (confidentiality === "Private" && !trimmedPassword) {
    setInlineMessage(
      messageEl,
      "Ajoute un mot de passe pour une catégorie privée.",
      "error"
    );
    return null;
  }

  if (confidentiality === "Public" && trimmedPassword) {
    const shouldProtect = window.confirm(
      "Un mot de passe a été saisi. Voulez-vous passer cette catégorie en privée ?"
    );

    if (!shouldProtect) {
      setInlineMessage(
        messageEl,
        "Pour une catégorie publique, laissez le mot de passe vide.",
        "error"
      );
      return null;
    }

    if (privacySelect) {
      privacySelect.value = "Private";
    }

    return {
      confidentiality: "Private",
      password: trimmedPassword,
    };
  }

  return {
    confidentiality,
    password: confidentiality === "Private" ? trimmedPassword : "",
  };
}

function getActionButtonClass(mode) {
  return currentMode === mode ? "btn-primary is-active" : "btn-primary";
}

function renderCards() {
  if (isLoading) {
    return `<p class="form-message">Chargement des catégories...</p>`;
  }

  if (categories.length === 0) {
    return `<p class="form-message">Aucune catégorie pour le moment.</p>`;
  }

  return categories
    .map((item) => {
      const mode = normalizeConfidentiality(item.confidentiality);
      const isPrivate = mode === "Private";
      const isSelected =
        currentMode === "edit" && String(item.id_category) === String(editingCategoryId);
      const interactiveClass = currentMode === "view" ? "" : "is-clickable";

      return `
        <article
          class="category-card ${isPrivate ? "is-private" : "is-public"} ${interactiveClass} ${isSelected ? "is-selected" : ""}"
          data-category-id="${item.id_category}"
        >
          ${isPrivate ? '<span class="lock-emoji" title="Catégorie protégée" aria-label="Catégorie protégée">🔒</span>' : ""}
          <div class="category-top">
            <p class="category-id">#${item.id_category}</p>
            <span class="badge">${isPrivate ? "Privée" : "Publique"}</span>
          </div>
          <h3>${item.category_name}</h3>
          <p class="category-meta">
            ${isPrivate ? "Protégée par mot de passe" : "Visible sans mot de passe"}
          </p>
        </article>
      `;
    })
    .join("");
}

function renderEditPanel() {
  if (currentMode !== "edit" || !editingCategoryId) {
    return "";
  }

  const selectedCategory = categories.find(
    (item) => String(item.id_category) === String(editingCategoryId)
  );

  if (!selectedCategory) {
    return "";
  }

  const confidentiality = normalizeConfidentiality(selectedCategory.confidentiality);

  return `
    <section class="inline-edit panel">
      <h2>Modifier la catégorie #${selectedCategory.id_category}</h2>
      <form id="inlineEditForm" class="category-form">
        <label for="inlineEditName">Nom</label>
        <input id="inlineEditName" type="text" value="${selectedCategory.category_name}" required />

        <label for="inlineEditPrivacy">Confidentialité</label>
        <select id="inlineEditPrivacy">
          <option value="Public" ${confidentiality === "Public" ? "selected" : ""}>Publique</option>
          <option value="Private" ${confidentiality === "Private" ? "selected" : ""}>Privée</option>
        </select>

        <label for="inlineEditPassword">Mot de passe (si privée)</label>
        <input
          id="inlineEditPassword"
          type="password"
          value=""
          placeholder="Ressaisissez le mot de passe si la catégorie reste privée"
          ${confidentiality === "Private" ? "required" : ""}
        />

        <p class="form-message">Pour une catégorie privée déjà créée, ressaisissez le mot de passe avant d'enregistrer.</p>

        <div class="inline-edit-actions">
          <button type="submit" class="btn-primary">Enregistrer</button>
          <button type="button" id="cancelInlineEdit" class="btn-primary">Annuler</button>
        </div>
        <p id="inlineEditMessage" class="form-message" aria-live="polite"></p>
      </form>
    </section>
  `;
}

function renderPage() {
  const totalCount = categories.length;
  const privateCount = categories.filter(
    (item) => normalizeConfidentiality(item.confidentiality) === "Private"
  ).length;
  const publicCount = totalCount - privateCount;
  const helperText =
    currentMode === "edit"
      ? "Mode modification actif: clique sur une catégorie pour l'éditer."
      : currentMode === "delete"
        ? "Mode suppression actif: clique sur une catégorie pour la supprimer."
        : "Choisis une action puis clique sur une catégorie.";

  mainEl.innerHTML = `
    <section class="hero">
      <h1>Mes Catégories</h1>
      <p>Ajoute tes espaces de rangement et garde une vue claire sur ton organisation.</p>
    </section>

    <section class="layout">
      <aside class="panel form-panel">
        <h2>Nouvelle catégorie</h2>
        <form id="categoryForm" class="category-form">
          <label for="categoryName">Nom</label>
          <input id="categoryName" type="text" placeholder="Ex: Productivité" required />

          <label for="categoryPrivacy">Confidentialité</label>
          <select id="categoryPrivacy">
            <option value="Public">Publique</option>
            <option value="Private">Privée</option>
          </select>

          <label for="categoryPassword">Mot de passe (si privée)</label>
          <input id="categoryPassword" type="password" placeholder="Optionnel si publique" />

          <button type="submit" class="btn-primary">Ajouter la catégorie</button>
          <p id="categoryMessage" class="form-message" aria-live="polite"></p>
        </form>
      </aside>

      <section class="panel list-panel">
        <div class="stats">
          <div class="stat">
            <p class="stat-value">${totalCount}</p>
            <p class="stat-label">Total</p>
          </div>
          <div class="stat">
            <p class="stat-value">${publicCount}</p>
            <p class="stat-label">Publiques</p>
          </div>
          <div class="stat">
            <p class="stat-value">${privateCount}</p>
            <p class="stat-label">Privées</p>
          </div>
        </div>

        <div class="cards-grid" id="cardsGrid">
          ${renderCards()}
        </div>

        <div class="category-actions">
          <button id="enterEditMode" class="${getActionButtonClass("edit")}">Modifier</button>
          <button id="enterDeleteMode" class="${getActionButtonClass("delete")}">Supprimer</button>
          <button id="exitActionMode" class="btn-primary">Annuler l'action</button>
        </div>

        <p class="action-helper">${helperText}</p>
        <p class="form-message ${actionMessageType ? `is-${actionMessageType}` : ""}" id="actionMessage" aria-live="polite">${actionMessage}</p>

        ${renderEditPanel()}
      </section>
    </section>
  `;

  setupFormEvents();
}

async function loadCategories(message = "", type = "") {
  isLoading = true;
  renderPage();

  try {
    const data = await fetchWithAuth("/categories");
    categories.length = 0;
    categories.push(...(Array.isArray(data) ? data : []));

    if (
      editingCategoryId &&
      !categories.some((item) => String(item.id_category) === String(editingCategoryId))
    ) {
      editingCategoryId = null;
    }

    if (message) {
      actionMessage = message;
      actionMessageType = type;
    }
  } catch (error) {
    categories.length = 0;
    editingCategoryId = null;
    actionMessage = error.message || "Impossible de charger les catégories.";
    actionMessageType = "error";
  } finally {
    isLoading = false;
    renderPage();
  }
}

function setupFormEvents() {
  const form = document.getElementById("categoryForm");
  const nameInput = document.getElementById("categoryName");
  const privacySelect = document.getElementById("categoryPrivacy");
  const passwordInput = document.getElementById("categoryPassword");
  const messageEl = document.getElementById("categoryMessage");
  const cardsGrid = document.getElementById("cardsGrid");
  const enterEditModeBtn = document.getElementById("enterEditMode");
  const enterDeleteModeBtn = document.getElementById("enterDeleteMode");
  const exitActionModeBtn = document.getElementById("exitActionMode");
  const inlineEditForm = document.getElementById("inlineEditForm");
  const cancelInlineEditBtn = document.getElementById("cancelInlineEdit");

  privacySelect.addEventListener("change", () => {
    if (privacySelect.value === "Private") {
      passwordInput.setAttribute("required", "required");
    } else {
      passwordInput.removeAttribute("required");
      passwordInput.value = "";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const confidentiality = privacySelect.value;
    const password = passwordInput.value.trim();

    if (!name) {
      setInlineMessage(messageEl, "Le nom de catégorie est obligatoire.", "error");
      return;
    }

    const security = resolveCategorySecurity({
      confidentiality,
      password,
      messageEl,
      privacySelect,
    });

    if (!security) return;

    setInlineMessage(messageEl, "");

    try {
      const data = await fetchWithAuth("/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_name: name,
          confidentiality: toApiConfidentiality(security.confidentiality),
          password: security.confidentiality === "Private" ? security.password : null,
        }),
      });

      currentMode = "view";
      editingCategoryId = null;
      await loadCategories(data.message || "Catégorie ajoutée avec succès.", "success");
    } catch (error) {
      setInlineMessage(
        messageEl,
        error.message || "Impossible d'ajouter la catégorie pour le moment.",
        "error"
      );
    }
  });

  enterEditModeBtn.addEventListener("click", () => {
    currentMode = "edit";
    editingCategoryId = null;
    clearActionMessage();
    renderPage();
  });

  enterDeleteModeBtn.addEventListener("click", () => {
    currentMode = "delete";
    editingCategoryId = null;
    clearActionMessage();
    renderPage();
  });

  exitActionModeBtn.addEventListener("click", () => {
    currentMode = "view";
    editingCategoryId = null;
    clearActionMessage();
    renderPage();
  });

  cardsGrid.addEventListener("click", async (event) => {
    if (isLoading) return;

    const cardEl = event.target.closest(".category-card");
    if (!cardEl || currentMode === "view") return;

    const selectedId = cardEl.dataset.categoryId;
    const selectedCategory = categories.find(
      (item) => String(item.id_category) === String(selectedId)
    );

    if (!selectedCategory) return;

    if (currentMode === "edit") {
      editingCategoryId = selectedId;
      clearActionMessage();
      renderPage();
      return;
    }

    if (currentMode === "delete") {
      const isConfirmed = window.confirm(
        `Confirmer la suppression de la catégorie "${selectedCategory.category_name}" ?`
      );

      if (!isConfirmed) return;

      try {
        const data = await fetchWithAuth(`/categories/${selectedId}`, {
          method: "DELETE",
        });

        currentMode = "view";
        editingCategoryId = null;
        await loadCategories(data.message || "Catégorie supprimée avec succès.", "success");
      } catch (error) {
        actionMessage =
          error.message || "Impossible de supprimer la catégorie pour le moment.";
        actionMessageType = "error";
        renderPage();
      }
    }
  });

  if (cancelInlineEditBtn) {
    cancelInlineEditBtn.addEventListener("click", () => {
      editingCategoryId = null;
      clearActionMessage();
      renderPage();
    });
  }

  if (inlineEditForm) {
    const inlineEditPrivacy = document.getElementById("inlineEditPrivacy");
    const inlineEditPassword = document.getElementById("inlineEditPassword");
    const inlineEditName = document.getElementById("inlineEditName");
    const inlineEditMessage = document.getElementById("inlineEditMessage");

    inlineEditPrivacy.addEventListener("change", () => {
      if (inlineEditPrivacy.value === "Private") {
        inlineEditPassword.setAttribute("required", "required");
      } else {
        inlineEditPassword.removeAttribute("required");
        inlineEditPassword.value = "";
      }
    });

    inlineEditForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const selectedCategory = categories.find(
        (item) => String(item.id_category) === String(editingCategoryId)
      );

      if (!selectedCategory) return;

      const name = inlineEditName.value.trim();
      const confidentiality = inlineEditPrivacy.value;
      const password = inlineEditPassword.value.trim();

      if (!name) {
        setInlineMessage(
          inlineEditMessage,
          "Le nom de catégorie est obligatoire.",
          "error"
        );
        return;
      }

      const security = resolveCategorySecurity({
        confidentiality,
        password,
        messageEl: inlineEditMessage,
        privacySelect: inlineEditPrivacy,
      });

      if (!security) return;

      setInlineMessage(inlineEditMessage, "");

      try {
        const data = await fetchWithAuth(`/categories/${editingCategoryId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category_name: name,
            confidentiality: toApiConfidentiality(security.confidentiality),
            password: security.confidentiality === "Private" ? security.password : null,
          }),
        });

        currentMode = "view";
        editingCategoryId = null;
        await loadCategories(data.message || "Catégorie mise à jour avec succès.", "success");
      } catch (error) {
        setInlineMessage(
          inlineEditMessage,
          error.message || "Impossible de mettre à jour la catégorie pour le moment.",
          "error"
        );
      }
    });
  }
}

renderPage();
loadCategories();
