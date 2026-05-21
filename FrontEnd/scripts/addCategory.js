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
// On garde ces variables en haut pour comprendre rapidement ce qui peut changer.
let categories = [];
let currentMode = "view";
let editingCategoryId = null;
let selectedCategoryIds = new Set();
let actionMessage = "";
let actionMessageType = "";
let isLoading = true;
let isDeletingSelection = false;
let defaultCategoryId = loadDefaultCategory();
let categoryUndoStack = [];
let favoriteCountByCategoryId = new Map();

function getAuthToken() {
  // Le token JWT est ajoute aux appels API proteges.
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function redirectToLogin() {
  // Si le backend refuse la session, on renvoie vers la page de connexion.
  window.location.assign("../html/connexion.html#login");
}

async function parseJsonSafely(response) {
  // Evite une erreur si le serveur renvoie une reponse vide ou non JSON.
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function fetchWithAuth(path, options = {}) {
  // Petit wrapper autour de fetch :
  // il ajoute le token, gere le serveur indisponible et transforme les erreurs HTTP.
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
    const error = new Error(data.message || "Une erreur est survenue côté serveur.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function loadDefaultCategory() {
  // La categorie par defaut est lue d'abord depuis l'utilisateur stocke,
  // puis depuis localStorage comme solution de secours.
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
  // On garde la categorie par defaut synchronisee dans deux endroits :
  // 1. l'utilisateur stocke,
  // 2. une cle dediee pour lecture rapide.
  syncStoredAuthUserDefaultCategory(defaultCategoryId);

  if (defaultCategoryId) {
    localStorage.setItem(DEFAULT_CATEGORY_STORAGE_KEY, String(defaultCategoryId));
    return;
  }

  localStorage.removeItem(DEFAULT_CATEGORY_STORAGE_KEY);
}

function normalizePositiveId(value) {
  // Retourne toujours une chaine d'ID valide ou une chaine vide.
  const parsedId = Number(value);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return "";
  }

  return String(parsedId);
}

function getStoredAuthUser() {
  // Lit l'utilisateur connecte stocke apres login.
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
  // On essaie d'abord localStorage, puis le token si necessaire.
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
  // Met a jour la copie locale de l'utilisateur quand la categorie par defaut change.
  const storedUser = getStoredAuthUser();

  if (!storedUser) {
    return;
  }

  storedUser.default_category_id = categoryId ? Number(categoryId) : null;
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(storedUser));
}

function normalizeConfidentiality(value) {
  // Convertit plusieurs formats possibles vers "Private" ou "Public".
  const normalizedValue = String(value || "").toLowerCase();

  if (value === 1 || value === "1" || value === true) return "Private";
  if (value === 0 || value === "0" || value === false) return "Public";
  if (normalizedValue === "private") return "Private";
  if (normalizedValue === "public") return "Public";
  return "Public";
}

function toApiConfidentiality(value) {
  // L'API attend 1 pour privee et 0 pour publique.
  return normalizeConfidentiality(value) === "Private" ? 1 : 0;
}

function setInlineMessage(element, message, type = "") {
  // Affiche un message juste sous un formulaire ou une action.
  if (!element) return;

  element.textContent = message;
  element.className = `form-message${type ? ` is-${type}` : ""}`;
}

function clearActionMessage() {
  // Reinitialise le message global de la page.
  actionMessage = "";
  actionMessageType = "";
}

function clearDeleteSelection() {
  // Vide la selection multiple de categories.
  selectedCategoryIds = new Set();
}

function setFavoriteCountsByCategory(favorites) {
  const counts = new Map();

  for (let index = 0; index < categories.length; index += 1) {
    counts.set(String(categories[index].id_category), 0);
  }

  for (let index = 0; index < favorites.length; index += 1) {
    const favorite = favorites[index];
    const categoryId = String(favorite.id_category || "");

    if (!categoryId) {
      continue;
    }

    counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
  }

  favoriteCountByCategoryId = counts;
}

function getCategoryFavoriteCountLabel(categoryId) {
  const favoriteCount = Number(favoriteCountByCategoryId.get(String(categoryId)) || 0);

  if (favoriteCount === 0) {
    return "Aucun Favoris";
  }

  if (favoriteCount === 1) {
    return "1 Favori";
  }

  return `${favoriteCount} Favoris`;
}

async function showCategoryDeleteStrategyModal({
  categoryCount,
  favoriteCount,
  allowMoveToDefault,
  defaultCategoryName = "",
}) {
  return new Promise((resolve) => {
    const modalEl = document.createElement("div");
    modalEl.className = "category-confirm-modal";
    modalEl.innerHTML = `
      <div class="category-confirm-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="categoryDeleteStrategyTitle">
        <button type="button" class="category-confirm-modal__close" data-delete-strategy-cancel aria-label="Fermer">×</button>
        <p class="category-confirm-modal__eyebrow">SaveNest</p>
        <h2 id="categoryDeleteStrategyTitle">Choisir le type de suppression</h2>
        <p class="category-confirm-modal__text">
          ${categoryCount} catégorie${categoryCount > 1 ? "s" : ""} sélectionnée${categoryCount > 1 ? "s" : ""} contient${categoryCount > 1 ? "nent" : ""} ${favoriteCount} favori${favoriteCount > 1 ? "s" : ""}.
        </p>
        <div class="category-delete-strategy-actions">
          <button type="button" class="category-confirm-modal__submit" data-delete-strategy="delete_favorites">
            Supprimer les catégories et leurs favoris
          </button>
          <button
            type="button"
            class="category-confirm-modal__submit"
            data-delete-strategy="move_to_default"
          >
            ${
              allowMoveToDefault
                ? `Reclasser les favoris dans "${defaultCategoryName}"`
                : "Choisir une catégorie par défaut puis reclasser"
            }
          </button>
          <button type="button" class="category-confirm-modal__cancel" data-delete-strategy-cancel>
            Annuler
          </button>
        </div>
      </div>
    `;

    const cancelButtons = Array.from(
      modalEl.querySelectorAll("[data-delete-strategy-cancel]")
    );
    const strategyButtons = Array.from(
      modalEl.querySelectorAll("[data-delete-strategy]")
    );

    function closeModal(value) {
      document.removeEventListener("keydown", handleKeydown);
      modalEl.remove();
      resolve(value);
    }

    function handleKeydown(event) {
      if (event.key === "Escape") {
        closeModal("");
      }
    }

    modalEl.addEventListener("click", (event) => {
      if (event.target === modalEl) {
        closeModal("");
      }
    });

    for (let index = 0; index < cancelButtons.length; index += 1) {
      cancelButtons[index].addEventListener("click", () => closeModal(""));
    }

    for (let index = 0; index < strategyButtons.length; index += 1) {
      strategyButtons[index].addEventListener("click", () => {
        closeModal(strategyButtons[index].dataset.deleteStrategy || "");
      });
    }

    document.addEventListener("keydown", handleKeydown);
    document.body.appendChild(modalEl);
  });
}

async function showDefaultCategorySelectionModal(availableCategories) {
  return new Promise((resolve) => {
    const optionsMarkup = availableCategories
      .map(
        (category) =>
          `<option value="${category.id_category}">${category.category_name}</option>`
      )
      .join("");

    const modalEl = document.createElement("div");
    modalEl.className = "category-confirm-modal";
    modalEl.innerHTML = `
      <div class="category-confirm-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="categoryDefaultSelectionTitle">
        <button type="button" class="category-confirm-modal__close" data-default-selection-cancel aria-label="Fermer">×</button>
        <p class="category-confirm-modal__eyebrow">SaveNest</p>
        <h2 id="categoryDefaultSelectionTitle">Choisir une catégorie par défaut</h2>
        <p class="category-confirm-modal__text">
          Aucune catégorie par défaut n'est définie. Choisissez-en une pour y reclasser les favoris avant la suppression.
        </p>
        <div class="category-form">
          <label for="defaultCategorySelection">Catégorie par défaut</label>
          <select id="defaultCategorySelection">${optionsMarkup}</select>
          <div class="category-delete-strategy-actions">
            <button type="button" class="category-confirm-modal__submit" data-default-selection-submit>
              Utiliser cette catégorie
            </button>
            <button type="button" class="category-confirm-modal__cancel" data-default-selection-cancel>
              Annuler
            </button>
          </div>
        </div>
      </div>
    `;

    const selectEl = modalEl.querySelector("#defaultCategorySelection");
    const submitButton = modalEl.querySelector("[data-default-selection-submit]");
    const cancelButtons = Array.from(
      modalEl.querySelectorAll("[data-default-selection-cancel]")
    );

    function closeModal(value) {
      document.removeEventListener("keydown", handleKeydown);
      modalEl.remove();
      resolve(value);
    }

    function handleKeydown(event) {
      if (event.key === "Escape") {
        closeModal("");
      }
    }

    modalEl.addEventListener("click", (event) => {
      if (event.target === modalEl) {
        closeModal("");
      }
    });

    for (let index = 0; index < cancelButtons.length; index += 1) {
      cancelButtons[index].addEventListener("click", () => closeModal(""));
    }

    submitButton?.addEventListener("click", () => {
      closeModal(String(selectEl?.value || ""));
    });

    document.addEventListener("keydown", handleKeydown);
    document.body.appendChild(modalEl);
    selectEl?.focus();
  });
}

function normalizeCategoryName(value) {
  return String(value || "").trim().toLocaleLowerCase("fr-FR");
}

function hasDuplicateCategoryName(name, excludedCategoryId = "") {
  const normalizedName = normalizeCategoryName(name);

  if (!normalizedName) {
    return false;
  }

  return categories.some(
    (category) =>
      String(category.id_category) !== String(excludedCategoryId || "") &&
      normalizeCategoryName(category.category_name) === normalizedName
  );
}

function pushCategoryUndoAction(action) {
  categoryUndoStack.push(action);
}

function hasUndoableCategoryAction() {
  return categoryUndoStack.length > 0;
}

async function restoreDefaultCategoryPreference(categoryId) {
  const authUserId = getAuthenticatedUserId();

  if (!authUserId || !categoryId) {
    return;
  }

  const data = await fetchWithAuth(`/auth/${authUserId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      default_category_id: Number(categoryId),
    }),
  });

  defaultCategoryId = String(categoryId);
  persistDefaultCategory();

  if (data && data.user) {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
  }
}

async function undoLastCategoryAction() {
  const lastAction = categoryUndoStack[categoryUndoStack.length - 1];

  if (!lastAction) {
    return false;
  }

  if (lastAction.type === "update") {
    const data = await fetchWithAuth(`/categories/${lastAction.before.id_category}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category_name: lastAction.before.category_name,
        confidentiality: toApiConfidentiality(lastAction.before.confidentiality),
        password: lastAction.undoPassword || null,
      }),
    });

    if (data && data.category) {
      categories = categories.map((category) =>
        String(category.id_category) === String(lastAction.before.id_category)
          ? data.category
          : category
      );
    }

    categoryUndoStack.pop();
    actionMessage = `La modification de "${lastAction.before.category_name}" a été annulée.`;
    actionMessageType = "success";
    renderPage();
    return true;
  }

  if (lastAction.type === "delete") {
    const data = await fetchWithAuth("/categories/restore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category_ids: lastAction.categoryIds,
      }),
    });

    if (lastAction.previousDefaultCategoryId) {
      await restoreDefaultCategoryPreference(lastAction.previousDefaultCategoryId);
    }

    categoryUndoStack.pop();
    currentMode = "view";
    editingCategoryId = null;
    clearDeleteSelection();
    await loadCategories(
      data.message ||
        `${lastAction.categoryIds.length} catégorie${
          lastAction.categoryIds.length > 1 ? "s" : ""
        } restaurée${lastAction.categoryIds.length > 1 ? "s" : ""}.`,
      "success"
    );
    return true;
  }

  return false;
}

function syncDeleteSelection() {
  // Si une categorie vient d'etre supprimee ou rechargee, on nettoie la selection.
  const availableIds = new Set(
    categories.map((item) => String(item.id_category))
  );

  selectedCategoryIds = new Set(
    [...selectedCategoryIds].filter((id) => availableIds.has(id))
  );
}

function toggleDeleteSelection(categoryId) {
  // Ajoute ou retire une categorie de la selection de suppression.
  const normalizedId = String(categoryId);

  if (selectedCategoryIds.has(normalizedId)) {
    selectedCategoryIds.delete(normalizedId);
    return;
  }

  selectedCategoryIds.add(normalizedId);
}

function getSelectedCategories() {
  // Retourne les objets categories correspondant aux IDs selectionnes.
  return categories.filter((item) =>
    selectedCategoryIds.has(String(item.id_category))
  );
}

function getDefaultCategory() {
  // Retrouve la categorie par defaut courante, si elle existe encore.
  return (
    categories.find(
      (item) => String(item.id_category) === String(defaultCategoryId)
    ) || null
  );
}

function syncDefaultCategoryState() {
  // Si la categorie par defaut a ete supprimee, on nettoie la preference.
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
  // Modale generique reutilisee pour les confirmations sensibles.
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
      // Nettoyage obligatoire : on retire l'ecouteur clavier et la modale.
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
  // Centralise les regles de mot de passe pour la creation d'une categorie.
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
  // Ajoute une classe visuelle au bouton correspondant au mode actif.
  return currentMode === mode ? "btn-primary is-active" : "btn-primary";
}

function getAllCategoryIds() {
  return categories.map((item) => String(item.id_category));
}

function areAllCategoriesSelected() {
  return categories.length > 0 && selectedCategoryIds.size === categories.length;
}

function getDeleteSelectionButtonLabel() {
  const selectedCount = selectedCategoryIds.size;

  if (selectedCount > 1) {
    return `Supprimer les sélections (${selectedCount})`;
  }

  return selectedCount === 1
    ? "Supprimer la sélection"
    : "Supprimer la sélection";
}

function renderCategoryActions() {
  const canUndoLastAction = hasUndoableCategoryAction();

  if (currentMode === "edit" && editingCategoryId) {
    return `
      <div class="category-actions">
        <button id="submitInlineEditTop" class="btn-primary">Enregistrer</button>
        <button id="cancelInlineEditTop" class="btn-secondary">Annuler</button>
        <button id="undoLastCategoryAction" class="btn-primary" ${!canUndoLastAction ? "disabled" : ""}>Annuler l'action</button>
      </div>
    `;
  }

  if (currentMode === "delete") {
    const hasCategories = categories.length > 0;
    const selectedCount = selectedCategoryIds.size;

    return `
      <div class="category-actions">
        <button
          id="toggleSelectAllCategories"
          class="btn-secondary"
          ${!hasCategories ? "disabled" : ""}
        >
          ${areAllCategoriesSelected() ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
        <button
          id="deleteSelectedCategories"
          class="btn-primary"
          ${selectedCount === 0 || isDeletingSelection ? "disabled" : ""}
        >
          ${isDeletingSelection ? "Suppression..." : getDeleteSelectionButtonLabel()}
        </button>
        <button id="undoLastCategoryAction" class="btn-primary">Annuler l'action</button>
      </div>
    `;
  }

  return `
    <div class="category-actions">
      <button id="enterEditMode" class="${getActionButtonClass("edit")}">Modifier</button>
      <button id="enterDeleteMode" class="${getActionButtonClass("delete")}">Supprimer</button>
      <button id="undoLastCategoryAction" class="btn-primary" ${!canUndoLastAction ? "disabled" : ""}>Annuler l'action</button>
    </div>
  `;
}

function renderCards() {
  // Genere les cartes de categories selon le mode courant.
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
      const modeIndicator =
        currentMode === "edit"
          ? `<p class="category-card-mode-indicator ${isEditSelected ? "is-active" : ""}">${
              isEditSelected
                ? "Catégorie sélectionnée : modifiez-la ci-dessous."
                : "Cliquez sur cette carte pour la modifier."
            }</p>`
          : currentMode === "delete"
            ? `<p class="category-card-mode-indicator ${isDeleteSelected ? "is-active" : ""}">${
                isDeleteSelected
                  ? "Catégorie sélectionnée pour la suppression."
                  : "Cliquez sur cette carte pour la sélectionner."
              }</p>`
            : "";

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
            ${getCategoryFavoriteCountLabel(item.id_category)}
          </p>
          ${modeIndicator}
        </article>
      `;
    })
    .join("");
}

function renderDeleteToolbar() {
  // Barre visible seulement en mode suppression multiple.
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
  // Resume la selection sans afficher une liste trop longue.
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
  // Le libelle du champ mot de passe change selon la transition :
  // privee vers publique, publique vers privee, ou privee qui reste privee.
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
  // Meme logique que la creation, mais adaptee a une categorie deja existante.
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
  // Le panneau de modification n'existe que lorsqu'une categorie est selectionnee.
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
      <p class="inline-edit-intro">
        Cliquez dans les champs ci-dessous, mettez à jour la catégorie, puis enregistrez avec les boutons d'action.
      </p>
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
      ? editingCategoryId
        ? "Mode modification actif : utilisez les champs ci-dessus puis cliquez sur Enregistrer."
        : "Mode modification actif : cliquez sur une catégorie pour afficher son formulaire de modification."
      : currentMode === "delete"
        ? selectedCategoryIds.size > 0
          ? `${selectedCategoryIds.size} catégorie${selectedCategoryIds.size > 1 ? "s" : ""} sélectionnée${selectedCategoryIds.size > 1 ? "s" : ""}. Utilisez les boutons ci-dessous pour tout sélectionner, tout désélectionner ou supprimer la sélection.`
          : "Mode suppression actif : cliquez sur une ou plusieurs catégories pour les sélectionner."
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

        ${renderEditPanel()}

        ${renderCategoryActions()}

        <p class="action-helper">${helperText}</p>
        <p class="form-message ${actionMessageType ? `is-${actionMessageType}` : ""}" id="actionMessage" aria-live="polite">${actionMessage}</p>
      </section>
    </section>
  `;

  enhancePasswordFields(mainEl);
  setupFormEvents();
}

async function loadCategories(message = "", type = "") {
  // Recharge les categories depuis l'API puis met l'interface a jour.
  isLoading = true;
  renderPage();

  try {
    const [categoriesData, favoritesData] = await Promise.all([
      fetchWithAuth("/categories"),
      fetchWithAuth("/favs"),
    ]);
    categories.length = 0;
    categories.push(...(Array.isArray(categoriesData) ? categoriesData : []));
    setFavoriteCountsByCategory(Array.isArray(favoritesData) ? favoritesData : []);
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
  // Comme renderPage remplace le HTML, il faut reconnecter les ecouteurs apres chaque rendu.
  const form = document.getElementById("categoryForm");
  const nameInput = document.getElementById("categoryName");
  const privacySelect = document.getElementById("categoryPrivacy");
  const passwordInput = document.getElementById("categoryPassword");
  const messageEl = document.getElementById("categoryMessage");
  const cardsGrid = document.getElementById("cardsGrid");
  const enterEditModeBtn = document.getElementById("enterEditMode");
  const enterDeleteModeBtn = document.getElementById("enterDeleteMode");
  const undoLastCategoryActionBtn = document.getElementById("undoLastCategoryAction");
  const submitInlineEditTopBtn = document.getElementById("submitInlineEditTop");
  const cancelInlineEditTopBtn = document.getElementById("cancelInlineEditTop");
  const toggleSelectAllCategoriesBtn = document.getElementById("toggleSelectAllCategories");
  const deleteSelectedCategoriesBtn = document.getElementById("deleteSelectedCategories");
  const inlineEditForm = document.getElementById("inlineEditForm");

  privacySelect.addEventListener("change", () => {
    // Le champ mot de passe devient obligatoire seulement pour une categorie privee.
    if (privacySelect.value === "Private") {
      passwordInput.setAttribute("required", "required");
    } else {
      passwordInput.removeAttribute("required");
      passwordInput.value = "";
    }
  });

  form.addEventListener("submit", async (event) => {
    // Creation d'une categorie.
    event.preventDefault();

    const name = nameInput.value.trim();
    const confidentiality = privacySelect.value;
    const password = passwordInput.value.trim();

    if (!name) {
      setInlineMessage(messageEl, "Le nom de catégorie est obligatoire.", "error");
      return;
    }

    if (hasDuplicateCategoryName(name)) {
      setInlineMessage(
        messageEl,
        "Une catégorie avec ce nom existe déjà.",
        "error"
      );
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

  if (enterEditModeBtn) {
    enterEditModeBtn.addEventListener("click", () => {
      // Si le mode est déjà actif sans catégorie sélectionnée, un second clic le ferme.
      if (currentMode === "edit" && !editingCategoryId) {
        currentMode = "view";
      } else {
        currentMode = "edit";
      }

      editingCategoryId = null;
      clearDeleteSelection();
      clearActionMessage();
      renderPage();
    });
  }

  if (enterDeleteModeBtn) {
    enterDeleteModeBtn.addEventListener("click", () => {
      // Active le mode ou les cartes deviennent selectionnables.
      currentMode = "delete";
      editingCategoryId = null;
      clearDeleteSelection();
      clearActionMessage();
      renderPage();
    });
  }

  cardsGrid.addEventListener("click", async (event) => {
    // Un seul ecouteur gere les clics sur toutes les cartes et boutons internes.
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

  if (toggleSelectAllCategoriesBtn) {
    toggleSelectAllCategoriesBtn.addEventListener("click", () => {
      if (areAllCategoriesSelected()) {
        clearDeleteSelection();
      } else {
        selectedCategoryIds = new Set(getAllCategoryIds());
      }

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

      let deleteStrategy = "";

      try {
        const allFavorites = await fetchWithAuth("/favs");
        const selectedCategoryIdSet = new Set(
          selectedCategories.map((category) => String(category.id_category))
        );
        const attachedFavorites = Array.isArray(allFavorites)
          ? allFavorites.filter((favorite) =>
              selectedCategoryIdSet.has(String(favorite.id_category))
            )
          : [];
        const defaultCategory = categories.find(
          (category) => String(category.id_category) === String(defaultCategoryId)
        );
        let resolvedDefaultCategory = defaultCategory || null;
        let canMoveToDefault =
          Boolean(resolvedDefaultCategory) &&
          !selectedCategoryIdSet.has(String(defaultCategoryId));

        if (attachedFavorites.length > 0) {
          deleteStrategy = await showCategoryDeleteStrategyModal({
            categoryCount: selectedCategories.length,
            favoriteCount: attachedFavorites.length,
            allowMoveToDefault: canMoveToDefault,
            defaultCategoryName: resolvedDefaultCategory?.category_name || "",
          });

          if (!deleteStrategy) {
            return;
          }

          if (deleteStrategy === "move_to_default" && !canMoveToDefault) {
            const selectableDefaultCategories = categories.filter(
              (category) =>
                !selectedCategoryIdSet.has(String(category.id_category))
            );

            if (selectableDefaultCategories.length === 0) {
              actionMessage =
                "Aucune autre catégorie n'est disponible pour devenir la catégorie par défaut.";
              actionMessageType = "error";
              renderPage();
              return;
            }

            const chosenDefaultCategoryId =
              await showDefaultCategorySelectionModal(selectableDefaultCategories);

            if (!chosenDefaultCategoryId) {
              return;
            }

            const authUserId = getAuthenticatedUserId();

            if (!authUserId) {
              redirectToLogin();
              return;
            }

            const data = await fetchWithAuth(`/auth/${authUserId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                default_category_id: Number(chosenDefaultCategoryId),
              }),
            });

            defaultCategoryId = String(chosenDefaultCategoryId);
            persistDefaultCategory();

            if (data && data.user) {
              localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
            }

            resolvedDefaultCategory =
              categories.find(
                (category) =>
                  String(category.id_category) === String(chosenDefaultCategoryId)
              ) || null;
            canMoveToDefault = Boolean(resolvedDefaultCategory);
          }
        }
      } catch (error) {
        actionMessage =
          error.message ||
          "Impossible de vérifier les favoris liés avant la suppression.";
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
      const deletedCategoryIds = [];
      const deletedCategoryNames = [];
      const failedNames = [];
      const previousDefaultCategoryId = selectedCategories.some(
        (category) => String(category.id_category) === String(defaultCategoryId)
      )
        ? String(defaultCategoryId)
        : "";

      for (const category of selectedCategories) {
        try {
          await fetchWithAuth(`/categories/${category.id_category}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              delete_strategy: deleteStrategy || undefined,
            }),
          });
          deletedCount += 1;
          deletedCategoryIds.push(String(category.id_category));
          deletedCategoryNames.push(category.category_name);
        } catch (error) {
          failedNames.push(category.category_name);
        }
      }

      isDeletingSelection = false;
      editingCategoryId = null;
      clearDeleteSelection();

      if (deletedCategoryIds.length > 0) {
        pushCategoryUndoAction({
          type: "delete",
          categoryIds: deletedCategoryIds,
          categoryNames: deletedCategoryNames,
          previousDefaultCategoryId,
        });
      }

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

  if (cancelInlineEditTopBtn) {
    cancelInlineEditTopBtn.addEventListener("click", () => {
      editingCategoryId = null;
      clearActionMessage();
      renderPage();
    });
  }

  if (submitInlineEditTopBtn && inlineEditForm) {
    submitInlineEditTopBtn.addEventListener("click", () => {
      inlineEditForm.requestSubmit();
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

      if (hasDuplicateCategoryName(name, editingCategoryId)) {
        setInlineMessage(
          inlineEditMessage,
          "Une catégorie avec ce nom existe déjà.",
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
        const previousCategory = { ...selectedCategory };
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
          pushCategoryUndoAction({
            type: "update",
            before: previousCategory,
            after: data.category,
            undoPassword: security.password || "",
          });
        }

        clearDeleteSelection();
        actionMessage = data.message || "Catégorie mise à jour avec succès.";
        actionMessageType = "success";
        renderPage();
      } catch (error) {
        setInlineMessage(
          inlineEditMessage,
          error.message || "Impossible de mettre à jour la catégorie pour le moment.",
          "error"
        );
      }
    });
  }

  if (undoLastCategoryActionBtn) {
    undoLastCategoryActionBtn.addEventListener("click", async () => {
      if (!hasUndoableCategoryAction()) {
        if (currentMode === "delete") {
          currentMode = "view";
          editingCategoryId = null;
          clearDeleteSelection();
          clearActionMessage();
          renderPage();
        }
        return;
      }

      try {
        await undoLastCategoryAction();
      } catch (error) {
        actionMessage =
          error.message || "Impossible d'annuler la dernière action pour le moment.";
        actionMessageType = "error";
        renderPage();
      }
    });
  }
}

renderPage();
loadCategories();
