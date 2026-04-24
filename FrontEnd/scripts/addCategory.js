// Ce script gere la page de creation, modification et suppression des categories.
import { setHeader, setFooter } from "../scripts/layout.js";
import { getApiBaseUrl, getServerUnavailableMessage } from "./apiConfig.js";
import { enhancePasswordFields } from "./passwordVisibility.js";

const API_BASE_URL = getApiBaseUrl();
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";
const DEFAULT_CATEGORY_STORAGE_KEY = "savenest_default_category";
const mainEl = document.querySelector(".js_main");

setHeader();
setFooter();

// Etat principal de la page catégories : mode courant, sélection et chargement.
const categories = [];
let currentMode = "view";
let editingCategoryId = null;
let selectedCategoryIds = new Set();
let actionMessage = "";
let actionMessageType = "";
let isLoading = true;
let isDeletingSelection = false;
let defaultCategoryId = loadDefaultCategory();

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

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error && error.name === "TypeError") {
      throw new Error(getServerUnavailableMessage());
    }

    throw error;
  }

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

function loadDefaultCategory() {
  try {
    const storedUser = getStoredAuthUser();
    const storedUserDefaultCategory = storedUser
      ? normalizePositiveId(storedUser.default_category_id)
      : "";

    if (storedUserDefaultCategory) {
      return storedUserDefaultCategory;
    }

    return String(localStorage.getItem(DEFAULT_CATEGORY_STORAGE_KEY) || "");
  } catch (error) {
    return "";
  }
}

function persistDefaultCategory() {
  syncStoredAuthUserDefaultCategory(defaultCategoryId);

  if (defaultCategoryId) {
    localStorage.setItem(DEFAULT_CATEGORY_STORAGE_KEY, String(defaultCategoryId));
    return;
  }

  localStorage.removeItem(DEFAULT_CATEGORY_STORAGE_KEY);
}

function normalizePositiveId(value) {
  const parsedId = Number(value);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return "";
  }

  return String(parsedId);
}

function getStoredAuthUser() {
  try {
    const rawUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);

    if (!rawUser) {
      return null;
    }

    const parsedUser = JSON.parse(rawUser);

    if (!parsedUser || typeof parsedUser !== "object") {
      return null;
    }

    return parsedUser;
  } catch (error) {
    return null;
  }
}

function getAuthenticatedUserId() {
  const storedUser = getStoredAuthUser();
  const storedUserId = storedUser ? Number(storedUser.id_user) : NaN;

  if (Number.isInteger(storedUserId) && storedUserId > 0) {
    return storedUserId;
  }

  try {
    const token = getAuthToken();

    if (!token) {
      return null;
    }

    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(window.atob(normalizedPayload));
    const tokenUserId = decodedPayload ? Number(decodedPayload.id_user) : NaN;

    return Number.isInteger(tokenUserId) && tokenUserId > 0 ? tokenUserId : null;
  } catch (error) {
    return null;
  }
}

function syncStoredAuthUserDefaultCategory(categoryId) {
  const storedUser = getStoredAuthUser();

  if (!storedUser) {
    return;
  }

  storedUser.default_category_id = categoryId ? Number(categoryId) : null;
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(storedUser));
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

function clearDeleteSelection() {
  selectedCategoryIds = new Set();
}

function syncDeleteSelection() {
  const availableIds = new Set(
    categories.map((item) => String(item.id_category))
  );

  selectedCategoryIds = new Set(
    [...selectedCategoryIds].filter((id) => availableIds.has(id))
  );
}

function toggleDeleteSelection(categoryId) {
  const normalizedId = String(categoryId);

  if (selectedCategoryIds.has(normalizedId)) {
    selectedCategoryIds.delete(normalizedId);
    return;
  }

  selectedCategoryIds.add(normalizedId);
}

function getSelectedCategories() {
  return categories.filter((item) =>
    selectedCategoryIds.has(String(item.id_category))
  );
}

function getDefaultCategory() {
  return (
    categories.find(
      (item) => String(item.id_category) === String(defaultCategoryId)
    ) || null
  );
}

function syncDefaultCategoryState() {
  if (
    !defaultCategoryId ||
    categories.some((item) => String(item.id_category) === String(defaultCategoryId))
  ) {
    return;
  }

  defaultCategoryId = "";
  persistDefaultCategory();
}

function showCategoryConfirmModal({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
}) {
  return new Promise((resolve) => {
    const modalEl = document.createElement("div");
    modalEl.className = "category-confirm-modal";
    modalEl.innerHTML = `
      <div class="category-confirm-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="categoryConfirmTitle">
        <button type="button" class="category-confirm-modal__close" data-confirm-cancel aria-label="Fermer">×</button>
        <p class="category-confirm-modal__eyebrow">SaveNest</p>
        <h2 id="categoryConfirmTitle"></h2>
        <p class="category-confirm-modal__text"></p>
        <div class="category-confirm-modal__actions">
          <button type="button" class="category-confirm-modal__cancel" data-confirm-cancel></button>
          <button type="button" class="category-confirm-modal__submit" data-confirm-submit></button>
        </div>
      </div>
    `;

    const titleEl = modalEl.querySelector("#categoryConfirmTitle");
    const textEl = modalEl.querySelector(".category-confirm-modal__text");
    const cancelButton = modalEl.querySelector(".category-confirm-modal__cancel");
    const submitButton = modalEl.querySelector(".category-confirm-modal__submit");
    const cancelButtons = Array.from(
      modalEl.querySelectorAll("[data-confirm-cancel]")
    );

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = message;
    if (cancelButton) cancelButton.textContent = cancelLabel;
    if (submitButton) {
      submitButton.textContent = confirmLabel;
      submitButton.classList.toggle("is-danger", danger);
    }

    function closeModal(value) {
      document.removeEventListener("keydown", handleKeydown);
      modalEl.remove();
      resolve(value);
    }

    function handleKeydown(event) {
      if (event.key === "Escape") {
        closeModal(false);
      }
    }

    modalEl.addEventListener("click", (event) => {
      if (event.target === modalEl) {
        closeModal(false);
      }
    });

    for (let index = 0; index < cancelButtons.length; index += 1) {
      cancelButtons[index].addEventListener("click", () => {
        closeModal(false);
      });
    }

    if (submitButton) {
      submitButton.addEventListener("click", () => {
        closeModal(true);
      });
    }

    document.addEventListener("keydown", handleKeydown);
    document.body.appendChild(modalEl);

    if (submitButton) {
      submitButton.focus();
    }
  });
}

async function resolveCategorySecurity({
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
    const shouldProtect = await showCategoryConfirmModal({
      title: "Protéger cette catégorie ?",
      message:
        "Un mot de passe a été saisi. Voulez-vous passer cette catégorie en privée ?",
      confirmLabel: "Passer en privée",
      cancelLabel: "Garder publique",
    });

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
      const isDefaultCategory = String(item.id_category) === String(defaultCategoryId);
      const isEditSelected =
        currentMode === "edit" &&
        String(item.id_category) === String(editingCategoryId);
      const isDeleteSelected =
        currentMode === "delete" &&
        selectedCategoryIds.has(String(item.id_category));
      const isSelected = isEditSelected || isDeleteSelected;
      const interactiveClass = currentMode === "view" ? "" : "is-clickable";

      return `
        <article
          class="category-card ${isPrivate ? "is-private" : "is-public"} ${interactiveClass} ${isSelected ? "is-selected" : ""} ${isDefaultCategory ? "is-default" : ""}"
          data-category-id="${item.id_category}"
        >
          ${
            currentMode === "delete"
              ? `<span class="selection-indicator ${isDeleteSelected ? "is-selected" : ""}" aria-hidden="true">${isDeleteSelected ? "✓" : ""}</span>`
              : ""
          }
          ${isPrivate ? '<span class="lock-emoji" title="Catégorie protégée" aria-label="Catégorie protégée">🔒</span>' : ""}
          <div class="category-top">
            <div class="category-badges">
              ${isDefaultCategory ? '<span class="default-badge">Par défaut</span>' : ""}
              <span class="badge">${isPrivate ? "Privée" : "Publique"}</span>
            </div>
            ${
              currentMode === "view"
                ? `<button
                    type="button"
                    class="default-category-button ${isDefaultCategory ? "is-active" : ""}"
                    data-default-category="${item.id_category}"
                  >
                    ${isDefaultCategory ? "Retirer" : "Par défaut"}
                  </button>`
                : ""
            }
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

function renderDeleteToolbar() {
  if (currentMode !== "delete") {
    return "";
  }

  const selectedCount = selectedCategoryIds.size;
  const selectedLabel =
    selectedCount > 1
      ? `${selectedCount} catégories sélectionnées.`
      : selectedCount === 1
        ? "1 catégorie sélectionnée."
        : "Aucune catégorie sélectionnée.";

  return `
    <div class="bulk-delete-toolbar">
      <p class="bulk-delete-count">${selectedLabel}</p>
      <div class="bulk-delete-actions">
        <button
          type="button"
          id="clearDeleteSelection"
          class="btn-secondary"
          ${selectedCount === 0 || isDeletingSelection ? "disabled" : ""}
        >
          Tout désélectionner
        </button>
        <button
          type="button"
          id="deleteSelectedCategories"
          class="btn-primary"
          ${selectedCount === 0 || isDeletingSelection ? "disabled" : ""}
        >
          ${
            isDeletingSelection
              ? "Suppression..."
              : `Supprimer la sélection${selectedCount > 0 ? ` (${selectedCount})` : ""}`
          }
        </button>
      </div>
    </div>
  `;
}

function buildDeleteConfirmationMessage(selectedItems) {
  const count = selectedItems.length;
  const previewNames = selectedItems
    .slice(0, 3)
    .map((item) => `"${item.category_name}"`);
  const remainingCount = count - previewNames.length;
  const suffix =
    remainingCount > 0
      ? ` et ${remainingCount} autre${remainingCount > 1 ? "s" : ""}`
      : "";

  return `Confirmer la suppression de ${count} catégorie${
    count > 1 ? "s" : ""
  } : ${previewNames.join(", ")}${suffix} ?`;
}

function getEditPasswordConfig(selectedCategory, targetConfidentiality) {
  const currentConfidentiality = normalizeConfidentiality(
    selectedCategory.confidentiality
  );
  const nextConfidentiality = normalizeConfidentiality(targetConfidentiality);
  const isCurrentlyPrivate = currentConfidentiality === "Private";
  const isNextPrivate = nextConfidentiality === "Private";

  if (isCurrentlyPrivate && isNextPrivate) {
    return {
      label: "Mot de passe actuel",
      placeholder: "Saisissez le mot de passe actuel pour confirmer",
      help: "Cette catégorie est privée. Saisissez son mot de passe actuel avant d'enregistrer.",
      required: true,
    };
  }

  if (isCurrentlyPrivate && !isNextPrivate) {
    return {
      label: "Mot de passe actuel",
      placeholder: "Saisissez le mot de passe actuel pour la rendre publique",
      help: "Pour rendre cette catégorie publique, confirmez avec son mot de passe actuel.",
      required: true,
    };
  }

  if (!isCurrentlyPrivate && isNextPrivate) {
    return {
      label: "Mot de passe",
      placeholder: "Choisissez un mot de passe pour protéger la catégorie",
      help: "Ajoutez un mot de passe pour rendre cette catégorie privée.",
      required: true,
    };
  }

  return {
    label: "Mot de passe",
    placeholder: "Laissez vide si la catégorie reste publique",
    help: "Aucun mot de passe n'est nécessaire tant que la catégorie reste publique.",
    required: false,
  };
}

async function resolveEditCategorySecurity({
  selectedCategory,
  confidentiality,
  password,
  messageEl,
  privacySelect,
}) {
  const currentConfidentiality = normalizeConfidentiality(
    selectedCategory.confidentiality
  );
  const nextConfidentiality = normalizeConfidentiality(confidentiality);
  const trimmedPassword = String(password || "").trim();

  if (currentConfidentiality === "Private") {
    if (!trimmedPassword) {
      setInlineMessage(
        messageEl,
        nextConfidentiality === "Public"
          ? "Saisissez le mot de passe actuel de la catégorie pour la rendre publique."
          : "Saisissez le mot de passe actuel de la catégorie pour confirmer la modification.",
        "error"
      );
      return null;
    }

    return {
      confidentiality: nextConfidentiality,
      password: trimmedPassword,
    };
  }

  return await resolveCategorySecurity({
    confidentiality: nextConfidentiality,
    password: trimmedPassword,
    messageEl,
    privacySelect,
  });
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
  const editPasswordConfig = getEditPasswordConfig(
    selectedCategory,
    confidentiality
  );

  return `
    <section class="inline-edit panel">
      <h2>Modifier la catégorie</h2>
      <form id="inlineEditForm" class="category-form">
        <div class="inline-edit-layout">
          <div class="inline-edit-fields">
            <label for="inlineEditName">Nom</label>
            <input id="inlineEditName" type="text" value="${selectedCategory.category_name}" required />

            <label for="inlineEditPrivacy">Confidentialité</label>
            <select id="inlineEditPrivacy">
              <option value="Public" ${confidentiality === "Public" ? "selected" : ""}>Publique</option>
              <option value="Private" ${confidentiality === "Private" ? "selected" : ""}>Privée</option>
            </select>

            <label id="inlineEditPasswordLabel" for="inlineEditPassword">${editPasswordConfig.label}</label>
            <input
              id="inlineEditPassword"
              type="password"
              value=""
              placeholder="${editPasswordConfig.placeholder}"
              ${editPasswordConfig.required ? "required" : ""}
            />

            <p id="inlineEditPasswordHelp" class="form-message">${editPasswordConfig.help}</p>

            <div class="inline-edit-actions">
              <button type="submit" class="btn-primary">Enregistrer</button>
              <button type="button" id="cancelInlineEdit" class="btn-primary">Annuler</button>
            </div>
          </div>
          <p id="inlineEditMessage" class="form-message confirmation-message" aria-live="polite"></p>
        </div>
      </form>
    </section>
  `;
}

function renderPage() {
  // La page se rerend entièrement après chaque action pour garder une logique simple.
  const totalCount = categories.length;
  const privateCount = categories.filter(
    (item) => normalizeConfidentiality(item.confidentiality) === "Private"
  ).length;
  const publicCount = totalCount - privateCount;
  const defaultCategory = getDefaultCategory();
  const helperText =
    currentMode === "edit"
      ? "Mode modification actif: clique sur une catégorie pour l'éditer."
      : currentMode === "delete"
        ? "Mode suppression actif: clique sur plusieurs catégories pour les sélectionner, puis supprime la sélection."
        : "Choisis une action ou définis une catégorie par défaut.";

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

        <p class="default-category-summary">
          ${
            defaultCategory
              ? `Catégorie par défaut : ${defaultCategory.category_name}. Les favoris sans catégorie iront ici.`
              : "Aucune catégorie par défaut pour le moment."
          }
        </p>

        <div class="category-actions">
          <button id="enterEditMode" class="${getActionButtonClass("edit")}">Modifier</button>
          <button id="enterDeleteMode" class="${getActionButtonClass("delete")}">Supprimer</button>
          <button id="exitActionMode" class="btn-primary">Annuler l'action</button>
        </div>

        ${renderDeleteToolbar()}

        <p class="action-helper">${helperText}</p>
        <p class="form-message ${actionMessageType ? `is-${actionMessageType}` : ""}" id="actionMessage" aria-live="polite">${actionMessage}</p>

        ${renderEditPanel()}
      </section>
    </section>
  `;

  enhancePasswordFields(mainEl);
  setupFormEvents();
}

async function loadCategories(message = "", type = "") {
  isLoading = true;
  renderPage();

  try {
    const data = await fetchWithAuth("/categories");
    categories.length = 0;
    categories.push(...(Array.isArray(data) ? data : []));
    syncDeleteSelection();
    syncDefaultCategoryState();

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
    clearDeleteSelection();
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
  const deleteSelectedCategoriesBtn = document.getElementById("deleteSelectedCategories");
  const clearDeleteSelectionBtn = document.getElementById("clearDeleteSelection");
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

    const security = await resolveCategorySecurity({
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
      clearDeleteSelection();
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
    clearDeleteSelection();
    clearActionMessage();
    renderPage();
  });

  enterDeleteModeBtn.addEventListener("click", () => {
    currentMode = "delete";
    editingCategoryId = null;
    clearDeleteSelection();
    clearActionMessage();
    renderPage();
  });

  exitActionModeBtn.addEventListener("click", () => {
    currentMode = "view";
    editingCategoryId = null;
    clearDeleteSelection();
    clearActionMessage();
    renderPage();
  });

  cardsGrid.addEventListener("click", async (event) => {
    if (isLoading || isDeletingSelection) return;

    const defaultCategoryButton = event.target.closest("[data-default-category]");

    if (defaultCategoryButton) {
      const authUserId = getAuthenticatedUserId();
      const selectedId = String(defaultCategoryButton.dataset.defaultCategory || "");
      const selectedCategory = categories.find(
        (item) => String(item.id_category) === selectedId
      );
      const nextDefaultCategoryId =
        String(defaultCategoryId) === selectedId ? "" : selectedId;

      if (!selectedCategory) return;

      if (!authUserId) {
        redirectToLogin();
        return;
      }

      try {
        const data = await fetchWithAuth(`/auth/${authUserId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            default_category_id: nextDefaultCategoryId
              ? Number(nextDefaultCategoryId)
              : null,
          }),
        });

        defaultCategoryId = nextDefaultCategoryId;
        persistDefaultCategory();

        if (data && data.user) {
          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
        }

        actionMessage = defaultCategoryId
          ? `"${selectedCategory.category_name}" est maintenant la catégorie par défaut.`
          : "Catégorie par défaut retirée.";
        actionMessageType = "success";
      } catch (error) {
        actionMessage =
          error.message || "Impossible d'enregistrer la catégorie par défaut.";
        actionMessageType = "error";
      }

      renderPage();
      return;
    }

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
      toggleDeleteSelection(selectedId);
      clearActionMessage();
      renderPage();
    }
  });

  if (clearDeleteSelectionBtn) {
    clearDeleteSelectionBtn.addEventListener("click", () => {
      clearDeleteSelection();
      clearActionMessage();
      renderPage();
    });
  }

  if (deleteSelectedCategoriesBtn) {
    deleteSelectedCategoriesBtn.addEventListener("click", async () => {
      if (isDeletingSelection) return;

      const selectedCategories = getSelectedCategories();

      if (selectedCategories.length === 0) {
        actionMessage = "Sélectionnez au moins une catégorie à supprimer.";
        actionMessageType = "error";
        renderPage();
        return;
      }

      const isConfirmed = await showCategoryConfirmModal({
        title: "Supprimer la sélection ?",
        message: buildDeleteConfirmationMessage(selectedCategories),
        confirmLabel: "Supprimer",
        cancelLabel: "Annuler",
        danger: true,
      });

      if (!isConfirmed) return;

      isDeletingSelection = true;
      clearActionMessage();
      renderPage();

      let deletedCount = 0;
      const failedNames = [];

      for (const category of selectedCategories) {
        try {
          await fetchWithAuth(`/categories/${category.id_category}`, {
            method: "DELETE",
          });
          deletedCount += 1;
        } catch (error) {
          failedNames.push(category.category_name);
        }
      }

      isDeletingSelection = false;
      editingCategoryId = null;
      clearDeleteSelection();

      if (failedNames.length > 0) {
        currentMode = "delete";
        await loadCategories(
          `${
            deletedCount > 0
              ? `${deletedCount} catégorie${deletedCount > 1 ? "s" : ""} supprimée${deletedCount > 1 ? "s" : ""}. `
              : ""
          }Impossible de supprimer : ${failedNames.join(", ")}.`,
          "error"
        );
        return;
      }

      currentMode = "view";
      await loadCategories(
        `${deletedCount} catégorie${deletedCount > 1 ? "s" : ""} supprimée${deletedCount > 1 ? "s" : ""} avec succès.`,
        "success"
      );
    });
  }

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
    const inlineEditPasswordLabel = document.getElementById("inlineEditPasswordLabel");
    const inlineEditPasswordHelp = document.getElementById("inlineEditPasswordHelp");
    const inlineEditName = document.getElementById("inlineEditName");
    const inlineEditMessage = document.getElementById("inlineEditMessage");

    const syncInlineEditPasswordUi = () => {
      const selectedCategory = categories.find(
        (item) => String(item.id_category) === String(editingCategoryId)
      );

      if (!selectedCategory) return;

      const config = getEditPasswordConfig(selectedCategory, inlineEditPrivacy.value);
      const isCurrentlyPrivate =
        normalizeConfidentiality(selectedCategory.confidentiality) === "Private";

      inlineEditPasswordLabel.textContent = config.label;
      inlineEditPassword.placeholder = config.placeholder;
      inlineEditPasswordHelp.textContent = config.help;

      if (config.required) {
        inlineEditPassword.setAttribute("required", "required");
      } else {
        inlineEditPassword.removeAttribute("required");
        if (!isCurrentlyPrivate) {
          inlineEditPassword.value = "";
        }
      }
    };

    syncInlineEditPasswordUi();
    inlineEditPrivacy.addEventListener("change", syncInlineEditPasswordUi);

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

      const security = await resolveEditCategorySecurity({
        selectedCategory,
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
            password: security.password || null,
          }),
        });

        if (data && data.category) {
          categories = categories.map((category) =>
            String(category.id_category) === String(editingCategoryId)
              ? data.category
              : category
          );
          syncDefaultCategoryState();
          syncCategoryOrderState();
        }

        clearDeleteSelection();
        actionMessage = "";
        actionMessageType = "";
        renderPage();
        setInlineMessage(
          document.getElementById("inlineEditMessage"),
          data.message || "Catégorie mise à jour avec succès.",
          "success"
        );
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
