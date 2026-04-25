// Ce script gere la page d'ajout, de modification et de suppression des favoris.
import { setHeader, setFooter } from "../scripts/layout.js";
import { getApiBaseUrl, getServerUnavailableMessage } from "./apiConfig.js";
import { enhancePasswordFields } from "./passwordVisibility.js";

const API_BASE_URL = getApiBaseUrl();
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";
// Ancienne cle nettoyee a la sortie de page.
// Les categories privees deverrouillees restent maintenant en memoire uniquement.
const UNLOCKED_CATEGORIES_STORAGE_KEY = "savenest_unlocked_categories";
const CATEGORY_ORDER_STORAGE_KEY = "savenest_category_order";
const FAVORITE_ORDER_STORAGE_KEY = "savenest_favorite_order";
const DEFAULT_CATEGORY_STORAGE_KEY = "savenest_default_category";

setHeader();
setFooter();

// Etat central de la page favoris :
// - categories et favorites viennent de l'API,
// - les selections servent aux formulaires,
// - les ordres locaux servent au drag and drop,
// - unlockedCategoryIds reste volontairement en memoire pour la securite.
let categories = [];
let favorites = [];
let selectedEditFavId = "";
let selectedEditFavIds = new Set();
let selectedDeleteFavId = "";
let unlockedCategoryIds = new Set();
let expandedEditCategoryIds = new Set();
let expandedDeleteCategoryIds = new Set();
let categoryOrderIds = loadCategoryOrder();
let favoriteOrderByCategory = loadFavoriteOrder();
let defaultCategoryId = loadDefaultCategory();
let draggedCategoryId = "";
let draggedFavoriteId = "";
let draggedFavoriteIds = [];
let currentActionMode = "edit";

const html = `
  <section class="hero">
    <h1>Organiser votre nid</h1>
    <p>Ajoutez, classez et retrouvez vos favoris avec une vue claire sur vos catégories.</p>
  </section>

  <section class="layout">
    <aside class="panel form-panel">
      <h2>Ajouter un favori</h2>
      <form id="favForm" class="form-grid favorite-form">
        <div class="field">
          <label for="favTitle">Titre</label>
          <input id="favTitle" type="text" placeholder="Ex: Princess Mononoke" required />
          <p class="help">Nom du site, de l'application ou titre du film.</p>
        </div>

        <div class="field url-field">
          <label for="favUrl">URL</label>
          <input id="favUrl" type="url" placeholder="https://exemple.com" />
          <p class="help">Lien facultatif vers le site, l'outil ou la fiche du film.</p>
        </div>

        <div class="field category-field">
          <label for="favCategory">Catégorie</label>
          <select id="favCategory">
            <option value="">-- Laissez vide pour utiliser la catégorie par défaut --</option>
          </select>
          <p id="favCategoryHelp" class="help"></p>
        </div>

        <p id="favFormMessage" class="help confirmation-message" aria-live="polite"></p>

        <div class="actions">
          <button type="submit" class="btn btn-primary">Ajouter le favori</button>
          <button type="reset" class="btn btn-ghost">Réinitialiser</button>
        </div>
      </form>
    </aside>

    <section class="panel list-panel">
      <div class="stats">
        <div class="stat">
          <p id="favTotalCount" class="stat-value">0</p>
          <p class="stat-label">Total favoris</p>
        </div>
        <div class="stat">
          <p id="favLinkedCount" class="stat-value">0</p>
          <p class="stat-label">Avec lien</p>
        </div>
        <div class="stat">
          <p id="favWithoutLinkCount" class="stat-value">0</p>
          <p class="stat-label">Sans lien</p>
        </div>
        <div class="stat">
          <p id="favTotalCategoryCount" class="stat-value">0</p>
          <p class="stat-label">Total catégories</p>
        </div>
        <div class="stat">
          <p id="favCategoryCount" class="stat-value">0</p>
          <p class="stat-label">Catégories utilisées</p>
        </div>
        <div class="stat">
          <p id="favUnusedCategoryCount" class="stat-value">0</p>
          <p class="stat-label">Catégories non utilisées</p>
        </div>
      </div>

      <p id="favoriteSummary" class="default-category-summary"></p>

      <div class="workspace-actions">
        <button id="enterEditMode" type="button" class="btn btn-primary">Modifier</button>
        <button id="enterDeleteMode" type="button" class="btn btn-primary">Supprimer</button>
      </div>

      <p id="workspaceActionHelper" class="action-helper"></p>

      <section id="editWorkspaceSection" class="workspace-section">
        <div class="workspace-section-header">
          <h2>Modifier un favori</h2>
          <p>Ouvrez une ou plusieurs catégories pour choisir le favori à mettre à jour.</p>
        </div>

        <div class="edit-board-header">
          <h3>Ouvrez une ou plusieurs catégories</h3>
          <p id="editBoardMessage" class="help">
            Ouvrez une catégorie, puis cochez plusieurs favoris si vous voulez les déplacer ensemble.
          </p>
        </div>

        <div class="edit-category-shortcuts">
          <p class="edit-category-shortcuts-title">Catégories ouvrables</p>
          <div id="editCategoryQuickList" class="edit-category-quick-list"></div>
        </div>

        <div id="editDragBoard" class="edit-drag-board"></div>
        <p id="editCategoryEmptyState" class="help">Aucune catégorie pour le moment.</p>

        <form id="editFavForm" class="form-grid edit-favorite-form is-collapsed" aria-expanded="false">
          <p id="editSelectionSummary" class="help edit-selection-summary">
            Ouvrez une catégorie puis choisissez un favori pour le modifier.
          </p>

          <div class="field">
            <label for="editFavTitle">Titre</label>
            <input id="editFavTitle" type="text" required />
          </div>

          <div class="field url-field">
            <label for="editFavUrl">URL</label>
            <input id="editFavUrl" type="url" />
          </div>

          <div class="field category-field">
            <label for="editFavCategory">Catégorie</label>
            <select id="editFavCategory" required>
              <option value="">-- Sélectionnez une catégorie --</option>
            </select>
          </div>

          <p id="editFavMessage" class="help confirmation-message" aria-live="polite"></p>

          <div class="actions">
            <button type="submit" class="btn btn-primary">Mettre à jour</button>
          </div>
        </form>
      </section>

      <section id="deleteWorkspaceSection" class="workspace-section">
        <div class="workspace-section-header">
          <h2>Supprimer un favori</h2>
          <p>Parcourez vos catégories et sélectionnez le favori à retirer.</p>
        </div>

        <div class="edit-board-header">
          <h3>Parcourez vos catégories</h3>
          <p id="deleteBoardMessage" class="help">
            Ouvrez une catégorie, puis choisissez un favori à supprimer.
          </p>
        </div>

        <div id="deleteFavBoard" class="edit-drag-board delete-board"></div>
        <p id="deleteCategoryEmptyState" class="help">Aucune catégorie pour le moment.</p>

        <form id="deleteFavForm" class="form-grid">
          <input id="deleteFavId" type="hidden" value="" />

          <p id="deleteSelectionSummary" class="help edit-selection-summary">
            Ouvrez une catégorie puis choisissez un favori pour le supprimer.
          </p>

          <div class="actions">
            <button type="submit" class="btn btn-primary">Supprimer le favori</button>
          </div>

          <p id="deleteFavMessage" class="help confirmation-message" aria-live="polite"></p>
        </form>
      </section>
    </section>
  </section>
`;

// La page fav.html contient seulement les emplacements header/main/footer.
// Tout le contenu principal est injecte ici pour garder la logique au meme endroit.
document.querySelector(".js_main").innerHTML = html;

// References DOM.
// Les garder groupees en haut evite de refaire des querySelector partout.
const favForm = document.getElementById("favForm");
const favTitle = document.getElementById("favTitle");
const favUrl = document.getElementById("favUrl");
const favCategory = document.getElementById("favCategory");
const favCategoryHelp = document.getElementById("favCategoryHelp");
const favFormMessage = document.getElementById("favFormMessage");
const favTotalCount = document.getElementById("favTotalCount");
const favLinkedCount = document.getElementById("favLinkedCount");
const favWithoutLinkCount = document.getElementById("favWithoutLinkCount");
const favTotalCategoryCount = document.getElementById("favTotalCategoryCount");
const favCategoryCount = document.getElementById("favCategoryCount");
const favUnusedCategoryCount = document.getElementById("favUnusedCategoryCount");
const favoriteSummary = document.getElementById("favoriteSummary");
const enterEditModeButton = document.getElementById("enterEditMode");
const enterDeleteModeButton = document.getElementById("enterDeleteMode");
const workspaceActionHelper = document.getElementById("workspaceActionHelper");
const editWorkspaceSection = document.getElementById("editWorkspaceSection");
const deleteWorkspaceSection = document.getElementById("deleteWorkspaceSection");
const editFavForm = document.getElementById("editFavForm");
const editDragBoard = document.getElementById("editDragBoard");
const editBoardMessage = document.getElementById("editBoardMessage");
const editCategoryQuickList = document.getElementById("editCategoryQuickList");
const editCategoryEmptyState = document.getElementById("editCategoryEmptyState");
const editSelectionSummary = document.getElementById("editSelectionSummary");
const editFavTitle = document.getElementById("editFavTitle");
const editFavUrl = document.getElementById("editFavUrl");
const editFavCategory = document.getElementById("editFavCategory");
const editFavMessage = document.getElementById("editFavMessage");
const deleteFavForm = document.getElementById("deleteFavForm");
const deleteFavBoard = document.getElementById("deleteFavBoard");
const deleteBoardMessage = document.getElementById("deleteBoardMessage");
const deleteCategoryEmptyState = document.getElementById("deleteCategoryEmptyState");
const deleteFavId = document.getElementById("deleteFavId");
const deleteSelectionSummary = document.getElementById("deleteSelectionSummary");
const deleteFavMessage = document.getElementById("deleteFavMessage");
const addSubmitButton = favForm.querySelector('button[type="submit"]');
const editSubmitButton = editFavForm.querySelector('button[type="submit"]');
const deleteSubmitButton = deleteFavForm.querySelector('button[type="submit"]');

function getAuthToken() {
  // Recupere le token JWT stocke apres connexion.
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function redirectToLogin() {
  // Utilise quand le token manque ou expire.
  window.location.assign("../html/connexion.html#login");
}

function clearUnlockedCategories() {
  // Verrouille toutes les categories privees pour cette page.
  unlockedCategoryIds.clear();
  sessionStorage.removeItem(UNLOCKED_CATEGORIES_STORAGE_KEY);
}

function loadCategoryOrder() {
  // Lit l'ordre personnalise des categories depuis le navigateur.
  try {
    const raw = localStorage.getItem(CATEGORY_ORDER_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((id) => String(id));
  } catch (error) {
    return [];
  }
}

function loadFavoriteOrder() {
  // Lit l'ordre personnalise des favoris, groupe par categorie.
  try {
    const raw = localStorage.getItem(FAVORITE_ORDER_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([categoryId, favoriteIds]) => [
        String(categoryId),
        Array.isArray(favoriteIds)
          ? [...new Set(favoriteIds.map((id) => String(id)).filter(Boolean))]
          : [],
      ])
    );
  } catch (error) {
    return {};
  }
}

function loadDefaultCategory() {
  // La categorie par defaut est lue depuis l'utilisateur stocke,
  // puis depuis localStorage si besoin.
  try {
    const storedUser = getStoredAuthUser();
    const storedUserDefaultCategory = normalizePositiveId(storedUser?.default_category_id);

    if (storedUserDefaultCategory) {
      return storedUserDefaultCategory;
    }

    return String(localStorage.getItem(DEFAULT_CATEGORY_STORAGE_KEY) || "");
  } catch (error) {
    return "";
  }
}

function persistCategoryOrder() {
  // Sauvegarde l'ordre des categories apres un drag and drop.
  localStorage.setItem(
    CATEGORY_ORDER_STORAGE_KEY,
    JSON.stringify(categoryOrderIds)
  );
}

function persistFavoriteOrder() {
  // Sauvegarde l'ordre des favoris apres un deplacement.
  localStorage.setItem(
    FAVORITE_ORDER_STORAGE_KEY,
    JSON.stringify(favoriteOrderByCategory)
  );
}

function persistDefaultCategory() {
  // Garde la categorie par defaut synchronisee entre l'utilisateur stocke et localStorage.
  syncStoredAuthUserDefaultCategory(defaultCategoryId);

  if (defaultCategoryId) {
    localStorage.setItem(DEFAULT_CATEGORY_STORAGE_KEY, String(defaultCategoryId));
    return;
  }

  localStorage.removeItem(DEFAULT_CATEGORY_STORAGE_KEY);
}

function normalizePositiveId(value) {
  // Retourne une chaine d'ID valide ou une chaine vide.
  const parsedId = Number(value);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return "";
  }

  return String(parsedId);
}

function getStoredAuthUser() {
  // Lit la copie locale de l'utilisateur connecte.
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
  // On essaie d'abord localStorage, puis le payload du token.
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

async function getCurrentUser() {
  // Recharge l'utilisateur depuis l'API pour obtenir la categorie par defaut a jour.
  const authUserId = getAuthenticatedUserId();

  if (!authUserId) {
    redirectToLogin();
    throw new Error("Connectez-vous pour accéder à vos informations.");
  }

  return fetchWithAuth(`/auth/${authUserId}`);
}

function syncDefaultCategoryFromUser(user) {
  // Applique au front la categorie par defaut renvoyee par le backend.
  const nextDefaultCategoryId = user
    ? normalizePositiveId(user.default_category_id)
    : "";

  defaultCategoryId = nextDefaultCategoryId;
  persistDefaultCategory();

  if (user) {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  }
}

async function parseJsonSafely(response) {
  // Certaines reponses HTTP peuvent etre vides.
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function fetchWithAuth(path, options = {}) {
  // Wrapper commun pour tous les appels API de cette page.
  const token = getAuthToken();

  if (!token) {
    redirectToLogin();
    throw new Error("Connectez-vous pour gérer vos favoris.");
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

async function requestCategoryUnlock(categoryId, password) {
  // Demande au backend de verifier le mot de passe d'une categorie.
  return fetchWithAuth(`/categories/${categoryId}/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
}

function setMessage(element, message, type = "") {
  // Affiche un message dans un element deja present dans la page.
  if (!element) return;

  element.textContent = message;
  const confirmationClass = element.classList.contains("confirmation-message")
    ? " confirmation-message"
    : "";
  element.className = `help${confirmationClass}${type ? ` is-${type}` : ""}`;
}

function setEditSelectionSummary(message, type = "") {
  if (!editSelectionSummary) return;

  editSelectionSummary.textContent = message;
  editSelectionSummary.className = `help edit-selection-summary${type ? ` is-${type}` : ""}`;
}

function setDeleteSelectionSummary(message, type = "") {
  if (!deleteSelectionSummary) return;

  deleteSelectionSummary.textContent = message;
  deleteSelectionSummary.className = `help edit-selection-summary${type ? ` is-${type}` : ""}`;
}

function normalizeConfidentiality(value) {
  // Convertit les formats API possibles vers "Private" ou "Public".
  const normalizedValue = String(value || "").toLowerCase();

  if (value === 1 || value === "1" || value === true) return "Private";
  if (value === 0 || value === "0" || value === false) return "Public";
  if (normalizedValue === "private") return "Private";
  if (normalizedValue === "public") return "Public";
  return "Public";
}

function isCategoryPrivate(category) {
  // Petite fonction de lecture pour rendre les conditions plus lisibles.
  return normalizeConfidentiality(category?.confidentiality) === "Private";
}

function isCategoryUnlocked(categoryId) {
  // Verifie si une categorie privee a ete deverrouillee pendant cette session de page.
  return unlockedCategoryIds.has(String(categoryId));
}

function getUnlockErrorMessage(error) {
  // Traduit les messages techniques en phrase simple pour l'utilisateur.
  const message = error?.message || "";

  if (
    message === "Mot de passe incorrect." ||
    message === "Mauvais mot de passe."
  ) {
    return "Mauvais mot de passe.";
  }

  return message || "Impossible de déverrouiller cette catégorie.";
}

function createFavoritePasswordModal(categoryName) {
  // Cree la modale de mot de passe uniquement quand une categorie privee est ouverte.
  const modalEl = document.createElement("div");
  modalEl.className = "favorite-modal";
  modalEl.innerHTML = `
    <div class="favorite-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="favoritePasswordModalTitle">
      <button type="button" class="favorite-modal__close" data-favorite-modal-cancel aria-label="Fermer">×</button>
      <p class="favorite-modal__eyebrow">Catégorie protégée</p>
      <h2 id="favoritePasswordModalTitle">Mot de passe requis</h2>
      <p class="favorite-modal__text"></p>
      <form class="favorite-modal__form">
        <label for="favoriteCategoryPassword">Mot de passe</label>
        <input id="favoriteCategoryPassword" type="password" autocomplete="current-password" required>
        <div class="favorite-modal__actions">
          <button type="button" class="favorite-modal__cancel" data-favorite-modal-cancel>Annuler</button>
          <button type="submit" class="favorite-modal__submit">Déverrouiller</button>
        </div>
      </form>
    </div>
  `;

  const textEl = modalEl.querySelector(".favorite-modal__text");

  if (textEl) {
    textEl.textContent = `Entrez le mot de passe de "${categoryName}" pour accéder à ses favoris.`;
  }

  return modalEl;
}

function askFavoriteCategoryPassword(categoryName) {
  // Promise qui renvoie le mot de passe saisi ou null si l'utilisateur annule.
  return new Promise((resolve) => {
    const modalEl = createFavoritePasswordModal(categoryName);
    const formEl = modalEl.querySelector(".favorite-modal__form");
    const passwordInputEl = modalEl.querySelector("#favoriteCategoryPassword");
    const cancelButtons = Array.from(
      modalEl.querySelectorAll("[data-favorite-modal-cancel]")
    );

    function closeModal(value) {
      // On nettoie l'ecouteur clavier pour eviter qu'il reste actif apres fermeture.
      document.removeEventListener("keydown", handleKeydown);
      modalEl.remove();
      resolve(value);
    }

    function handleKeydown(event) {
      if (event.key === "Escape") {
        closeModal(null);
      }
    }

    modalEl.addEventListener("click", (event) => {
      if (event.target === modalEl) {
        closeModal(null);
      }
    });

    for (let index = 0; index < cancelButtons.length; index += 1) {
      cancelButtons[index].addEventListener("click", () => {
        closeModal(null);
      });
    }

    formEl.addEventListener("submit", (event) => {
      event.preventDefault();
      closeModal(passwordInputEl.value);
    });

    document.addEventListener("keydown", handleKeydown);
    document.body.appendChild(modalEl);
    enhancePasswordFields(modalEl);
    passwordInputEl.focus();
  });
}

function showFavoriteConfirmModal({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
}) {
  // Modale de confirmation reutilisee pour les actions sensibles, comme supprimer.
  return new Promise((resolve) => {
    const modalEl = document.createElement("div");
    modalEl.className = "favorite-modal";
    modalEl.innerHTML = `
      <div class="favorite-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="favoriteConfirmModalTitle">
        <button type="button" class="favorite-modal__close" data-favorite-modal-cancel aria-label="Fermer">×</button>
        <p class="favorite-modal__eyebrow">SaveNest</p>
        <h2 id="favoriteConfirmModalTitle"></h2>
        <p class="favorite-modal__text"></p>
        <div class="favorite-modal__actions">
          <button type="button" class="favorite-modal__cancel" data-favorite-modal-cancel></button>
          <button type="button" class="favorite-modal__submit" data-favorite-modal-submit></button>
        </div>
      </div>
    `;

    const titleEl = modalEl.querySelector("#favoriteConfirmModalTitle");
    const textEl = modalEl.querySelector(".favorite-modal__text");
    const cancelButton = modalEl.querySelector(".favorite-modal__cancel");
    const submitButton = modalEl.querySelector(".favorite-modal__submit");
    const cancelButtons = Array.from(
      modalEl.querySelectorAll("[data-favorite-modal-cancel]")
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

function getCategoryOptionsMarkup() {
  // Genere les options des selects de categories.
  return categories
    .map(
      (category) =>
        `<option value="${category.id_category}">${category.category_name}</option>`
    )
    .join("");
}

function getCategoryById(categoryId) {
  // Recherche une categorie dans l'etat local.
  return (
    categories.find(
      (category) => String(category.id_category) === String(categoryId)
    ) || null
  );
}

function syncCategoryOrderState() {
  // Synchronise l'ordre stocke avec les categories actuellement disponibles.
  if (categories.length === 0) return;

  const currentIds = categories.map((category) => String(category.id_category));
  const filteredOrder = categoryOrderIds.filter((id) => currentIds.includes(id));
  const missingIds = currentIds.filter((id) => !filteredOrder.includes(id));
  const nextOrder = [...filteredOrder, ...missingIds];

  if (nextOrder.join("|") !== categoryOrderIds.join("|")) {
    categoryOrderIds = nextOrder;
    persistCategoryOrder();
  }
}

function sortCategoriesByStoredOrder(list) {
  // Trie les categories selon l'ordre sauvegarde en local.
  const orderMap = new Map(
    categoryOrderIds.map((id, index) => [String(id), index])
  );

  return [...list].sort((left, right) => {
    const leftOrder =
      orderMap.get(String(left.id_category)) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder =
      orderMap.get(String(right.id_category)) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return Number(left.id_category) - Number(right.id_category);
  });
}

function syncDefaultCategoryState() {
  // Si la categorie par defaut n'existe plus, on retire cette preference.
  const availableCategoryIds = new Set(
    categories.map((category) => String(category.id_category))
  );

  if (!defaultCategoryId || availableCategoryIds.has(String(defaultCategoryId))) {
    return;
  }

  defaultCategoryId = "";
  persistDefaultCategory();
}

function getPublicExpandedCategoryIds(categoryIds) {
  // Lorsqu'on rebloque les categories privees, on garde seulement les publiques ouvertes.
  return new Set(
    [...categoryIds].filter((categoryId) => {
      const category = getCategoryById(categoryId);

      return category && !isCategoryPrivate(category);
    })
  );
}

function relockProtectedCategories() {
  // Appelee quand on quitte la page ou qu'elle revient depuis le cache navigateur.
  clearUnlockedCategories();
  expandedEditCategoryIds = getPublicExpandedCategoryIds(expandedEditCategoryIds);
  expandedDeleteCategoryIds = getPublicExpandedCategoryIds(expandedDeleteCategoryIds);
}

function updateFavCategoryHelp() {
  // Met a jour le texte sous le select d'ajout de favori.
  if (!favCategoryHelp) return;

  if (categories.length === 0) {
    setMessage(
      favCategoryHelp,
      "Créez d'abord une catégorie pour pouvoir en choisir une par défaut."
    );
    return;
  }

  const selectedCategory = getCategoryById(favCategory.value);

  if (selectedCategory) {
    setMessage(
      favCategoryHelp,
      `Le favori sera ajouté dans "${selectedCategory.category_name}".`
    );
    return;
  }

  const defaultCategory = getCategoryById(defaultCategoryId);

  if (!defaultCategory) {
    setMessage(
      favCategoryHelp,
      "Choisissez une catégorie. Aucune catégorie par défaut n'est définie pour le moment."
    );
    return;
  }

  setMessage(
    favCategoryHelp,
    `Le favori sera ajouté dans la catégorie par défaut "${defaultCategory.category_name}".`
  );
}

function updateWorkspaceSummary() {
  // Recalcule les compteurs visibles en haut du panneau favoris.
  const totalFavorites = favorites.length;
  const linkedFavorites = favorites.filter(
    (fav) => typeof fav.url_favs === "string" && fav.url_favs.trim() !== ""
  ).length;
  const favoritesWithoutLink = totalFavorites - linkedFavorites;
  const totalCategories = categories.length;
  const usedCategoryCount = new Set(
    favorites
      .map((fav) => normalizePositiveId(fav.id_category))
      .filter(Boolean)
  ).size;
  const unusedCategoryCount = Math.max(totalCategories - usedCategoryCount, 0);
  const defaultCategory = getCategoryById(defaultCategoryId);

  if (favTotalCount) {
    favTotalCount.textContent = String(totalFavorites);
  }

  if (favLinkedCount) {
    favLinkedCount.textContent = String(linkedFavorites);
  }

  if (favWithoutLinkCount) {
    favWithoutLinkCount.textContent = String(favoritesWithoutLink);
  }

  if (favTotalCategoryCount) {
    favTotalCategoryCount.textContent = String(totalCategories);
  }

  if (favCategoryCount) {
    favCategoryCount.textContent = String(usedCategoryCount);
  }

  if (favUnusedCategoryCount) {
    favUnusedCategoryCount.textContent = String(unusedCategoryCount);
  }

  if (!favoriteSummary) {
    return;
  }

  favoriteSummary.textContent = defaultCategory
    ? `Catégorie par défaut : ${defaultCategory.category_name}. Les favoris ajoutés sans catégorie iront ici.`
    : "Aucune catégorie par défaut pour le moment.";
}

function getActionHelperText() {
  // Texte court qui explique le mode actif.
  if (currentActionMode === "edit") {
    return "Choisissez un favori à modifier ou cochez-en plusieurs pour les déplacer ensemble.";
  }

  if (currentActionMode === "delete") {
    return "Choisissez un favori à supprimer dans une catégorie ouverte.";
  }

  return "Choisis une action ou définis une catégorie par défaut.";
}

function updateActionModeUI() {
  // Affiche le bon panneau selon le mode choisi : modifier ou supprimer.
  if (enterEditModeButton) {
    enterEditModeButton.classList.toggle("is-active", currentActionMode === "edit");
  }

  if (enterDeleteModeButton) {
    enterDeleteModeButton.classList.toggle("is-active", currentActionMode === "delete");
  }

  if (editWorkspaceSection) {
    editWorkspaceSection.classList.toggle("is-hidden", currentActionMode !== "edit");
  }

  if (deleteWorkspaceSection) {
    deleteWorkspaceSection.classList.toggle("is-hidden", currentActionMode !== "delete");
  }

  if (workspaceActionHelper) {
    workspaceActionHelper.textContent = getActionHelperText();
  }
}

function renderCategorySelects() {
  // Remplit les selects de categories pour l'ajout et la modification.
  const selectedAddCategoryId = String(favCategory.value || "");
  const options = getCategoryOptionsMarkup();
  const availableCategoryIds = new Set(
    categories.map((category) => String(category.id_category))
  );
  const defaultCategory = getCategoryById(defaultCategoryId);
  const defaultOptionLabel = defaultCategory
    ? `Catégorie par défaut : "${defaultCategory.category_name}"`
    : "-- Choisissez une catégorie --";

  favCategory.innerHTML =
    `<option value="">${defaultOptionLabel}</option>${options}`;
  editFavCategory.innerHTML = `<option value="">-- Sélectionnez une catégorie --</option>${options}`;

  favCategory.value = availableCategoryIds.has(selectedAddCategoryId)
    ? selectedAddCategoryId
    : "";
  updateFavCategoryHelp();
}

function getFavoritesForCategory(categoryId) {
  // Filtre les favoris appartenant a une categorie.
  return favorites.filter(
    (fav) => String(fav.id_category) === String(categoryId)
  );
}

function syncFavoriteOrderState() {
  // Garde l'ordre local des favoris coherent avec les favoris venus de l'API.
  const favoriteIdsByCategory = favorites.reduce((accumulator, fav) => {
    const categoryId = String(fav.id_category || "");

    if (!categoryId) {
      return accumulator;
    }

    if (!accumulator[categoryId]) {
      accumulator[categoryId] = [];
    }

    accumulator[categoryId].push(String(fav.id_favs));
    return accumulator;
  }, {});

  const nextFavoriteOrderByCategory = Object.fromEntries(
    Object.entries(favoriteIdsByCategory).map(([categoryId, favoriteIds]) => {
      const storedFavoriteIds = Array.isArray(favoriteOrderByCategory[categoryId])
        ? favoriteOrderByCategory[categoryId]
        : [];
      const filteredFavoriteIds = storedFavoriteIds.filter((id) =>
        favoriteIds.includes(String(id))
      );
      const missingFavoriteIds = favoriteIds.filter(
        (id) => !filteredFavoriteIds.includes(String(id))
      );

      return [categoryId, [...filteredFavoriteIds, ...missingFavoriteIds]];
    })
  );

  if (
    JSON.stringify(nextFavoriteOrderByCategory) !==
    JSON.stringify(favoriteOrderByCategory)
  ) {
    favoriteOrderByCategory = nextFavoriteOrderByCategory;
    persistFavoriteOrder();
  }
}

function placeFavoritesInOrder({ favIds, targetCategoryId, beforeFavId = "" }) {
  // Met a jour l'ordre local apres un deplacement par drag and drop.
  const normalizedFavIds = [...new Set((favIds || []).map((id) => String(id || "")).filter(Boolean))];
  const normalizedCategoryId = String(targetCategoryId || "");
  const normalizedBeforeFavId = String(beforeFavId || "");

  if (normalizedFavIds.length === 0 || !normalizedCategoryId) {
    return;
  }

  const movingFavoriteIds = new Set(normalizedFavIds);
  const nextFavoriteOrderByCategory = Object.fromEntries(
    Object.entries(favoriteOrderByCategory)
      .map(([categoryId, favoriteIds]) => [
        categoryId,
        favoriteIds.filter((id) => !movingFavoriteIds.has(String(id))),
      ])
      .filter(([, favoriteIds]) => favoriteIds.length > 0)
  );

  const targetFavoriteIds = [...(nextFavoriteOrderByCategory[normalizedCategoryId] || [])];
  const insertionIndex = normalizedBeforeFavId && !movingFavoriteIds.has(normalizedBeforeFavId)
    ? targetFavoriteIds.indexOf(normalizedBeforeFavId)
    : -1;

  if (insertionIndex === -1) {
    targetFavoriteIds.push(...normalizedFavIds);
  } else {
    targetFavoriteIds.splice(insertionIndex, 0, ...normalizedFavIds);
  }

  nextFavoriteOrderByCategory[normalizedCategoryId] = targetFavoriteIds;
  favoriteOrderByCategory = nextFavoriteOrderByCategory;
  persistFavoriteOrder();
}

function placeFavoriteInOrder({ favId, targetCategoryId, beforeFavId = "" }) {
  // Version pratique pour un seul favori.
  placeFavoritesInOrder({
    favIds: [favId],
    targetCategoryId,
    beforeFavId,
  });
}

function getFavoritesGroupedByCategory() {
  // Groupe les favoris par categorie pour certains affichages.
  const categoryOrder = new Map(
    categories.map((category, index) => [String(category.id_category), index])
  );
  const sortedFavorites = [...favorites].sort((left, right) => {
    const leftOrder = categoryOrder.get(String(left.id_category)) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = categoryOrder.get(String(right.id_category)) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return Number(left.id_favs) - Number(right.id_favs);
  });
  const groupedFavorites = new Map();

  sortedFavorites.forEach((fav) => {
    const categoryKey = String(fav.id_category || "");
    const categoryName =
      fav.category_name ||
      categories.find((category) => String(category.id_category) === categoryKey)?.category_name ||
      "Sans catégorie";

    if (!groupedFavorites.has(categoryKey)) {
      groupedFavorites.set(categoryKey, {
        categoryId: categoryKey,
        categoryName,
        items: [],
      });
    }

    groupedFavorites.get(categoryKey).items.push(fav);
  });

  return [...groupedFavorites.values()];
}

function getFavUrlMarkup(fav) {
  // Affiche un lien cliquable si l'URL existe, sinon un texte simple.
  const hasUrl = typeof fav.url_favs === "string" && fav.url_favs.trim() !== "";

  if (!hasUrl) {
    return `<span>Aucune URL</span>`;
  }

  return `<a href="${fav.url_favs}" target="_blank" rel="noopener noreferrer">${fav.url_favs}</a>`;
}

function getEditBoardFavoriteMarkup(fav) {
  // Genere un favori dans le panneau de modification.
  // Le bouton principal est aussi draggable.
  const hasUrl = typeof fav.url_favs === "string" && fav.url_favs.trim() !== "";
  const isSelected = String(selectedEditFavId) === String(fav.id_favs);
  const isBatchSelected = selectedEditFavIds.has(String(fav.id_favs));

  return `
    <li
      class="fav-draft-item has-select-toggle ${isSelected ? "is-selected" : ""} ${isBatchSelected ? "is-batch-selected" : ""}"
      data-favorite-item="${fav.id_favs}"
      data-favorite-category="${fav.id_category}"
    >
      <button
        type="button"
        class="fav-select-toggle"
        data-toggle-edit-fav-selection="${fav.id_favs}"
        aria-pressed="${isBatchSelected ? "true" : "false"}"
        aria-label="${isBatchSelected ? "Retirer" : "Ajouter"} ${fav.title_favs} de la sélection multiple"
        title="${isBatchSelected ? "Retirer de la sélection" : "Ajouter à la sélection"}"
      >
        ${isBatchSelected ? "✓" : ""}
      </button>
      <button
        type="button"
        class="fav-choice edit-favorite-drag"
        data-edit-fav="${fav.id_favs}"
        data-drag-fav="${fav.id_favs}"
        draggable="true"
      >
        <span class="fav-choice-title">${fav.title_favs}</span>
        <span class="fav-choice-url">${hasUrl ? fav.url_favs : "Aucune URL"}</span>
      </button>
    </li>
  `;
}

function getDeleteBoardFavoriteMarkup(fav) {
  // Genere un favori selectionnable dans le panneau suppression.
  const hasUrl = typeof fav.url_favs === "string" && fav.url_favs.trim() !== "";
  const isSelected = String(selectedDeleteFavId) === String(fav.id_favs);

  return `
    <li class="fav-draft-item ${isSelected ? "is-selected" : ""}">
      <button
        type="button"
        class="fav-choice"
        data-delete-fav="${fav.id_favs}"
      >
        <span class="fav-choice-title">${fav.title_favs}</span>
        <span class="fav-choice-url">${hasUrl ? fav.url_favs : "Aucune URL"}</span>
      </button>
    </li>
  `;
}

function getCategoryBadgeLabel(category) {
  // Badge visible dans les cartes de categories.
  if (!category) return "";

  return isCategoryPrivate(category) ? "Privée" : "Publique";
}

function getCategoryMetaLabel(categoryId) {
  // Texte secondaire sous le nom de la categorie.
  const category = getCategoryById(categoryId);

  if (!category) return "";

  if (!isCategoryPrivate(category)) {
    return "Visible sans mot de passe";
  }

  return isCategoryUnlocked(categoryId)
    ? "Déverrouillée pour cette session"
    : "Protégée par mot de passe";
}

function renderEditCategoryQuickList() {
  // Liste compacte en haut : elle sert a ouvrir une categorie et a recevoir un drop.
  if (!editCategoryQuickList) return;

  if (categories.length === 0) {
    editCategoryQuickList.innerHTML =
      '<p class="edit-category-quick-empty">Aucune catégorie disponible pour le moment.</p>';
    return;
  }

  editCategoryQuickList.innerHTML = categories
    .map((category) => {
      const categoryId = String(category.id_category);
      const isPrivate = isCategoryPrivate(category);
      const isUnlocked = !isPrivate || isCategoryUnlocked(categoryId);
      const isExpanded = expandedEditCategoryIds.has(categoryId);
      const count = getFavoritesForCategory(categoryId).length;
      const categoryStateLabel = isPrivate
        ? isUnlocked
          ? "Privée déverrouillée"
          : "Privée"
        : "Publique";

      return `
        <button
          type="button"
          class="edit-category-pill ${isExpanded ? "is-active" : ""} ${isPrivate ? "is-private" : "is-public"}"
          data-quick-toggle-edit-category="${categoryId}"
          data-drop-fav-category="${categoryId}"
          aria-pressed="${isExpanded ? "true" : "false"}"
          title="Ouvrir la catégorie ${category.category_name} ou y déposer un favori"
        >
          <span class="edit-category-pill-main">
            <span class="edit-category-pill-name">${category.category_name}</span>
            <span class="edit-category-pill-state">${categoryStateLabel}</span>
          </span>
          <span class="edit-category-pill-side">
            ${
              isPrivate
                ? `<span class="edit-category-pill-lock" aria-hidden="true">${isUnlocked ? "🔓" : "🔒"}</span>`
                : ""
            }
            <span class="edit-category-pill-count">${count}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderEditBoard() {
  // Affiche uniquement les categories ouvertes pour ne pas encombrer l'ecran.
  if (categories.length === 0) {
    editDragBoard.innerHTML = "";
    editCategoryEmptyState.style.display = "block";
    setMessage(editBoardMessage, "Aucune catégorie disponible pour modifier un favori.");
    return;
  }

  const visibleCategories = categories.filter((category) =>
    expandedEditCategoryIds.has(String(category.id_category))
  );

  editCategoryEmptyState.style.display = "none";
  editDragBoard.innerHTML = visibleCategories
    .map((category) => {
      const categoryId = String(category.id_category);
      const isPrivate = isCategoryPrivate(category);
      const isUnlocked = !isPrivate || isCategoryUnlocked(categoryId);
      const categoryFavorites = getFavoritesForCategory(categoryId);
      const count = categoryFavorites.length;
      const hasSelectedFavorite = categoryFavorites.some(
        (fav) => String(fav.id_favs) === String(selectedEditFavId)
      );
      const badgeLabel = getCategoryBadgeLabel(category);
      const metaLabel = getCategoryMetaLabel(categoryId);

      return `
        <section
          class="edit-category-lane ${isPrivate ? "is-private" : "is-public"} ${hasSelectedFavorite ? "has-selection" : ""} is-expanded"
          data-category-lane="${categoryId}"
          data-drop-fav-category="${categoryId}"
        >
          <div class="edit-category-header">
            <button
              type="button"
              class="edit-category-drag"
              data-drag-category="${categoryId}"
              draggable="true"
              aria-label="Déplacer la catégorie ${category.category_name}"
              title="Déplacer la catégorie"
            >
              ::
            </button>

            <button
              type="button"
              class="edit-category-toggle"
              data-toggle-edit-category="${categoryId}"
              aria-expanded="true"
            >
              <div class="edit-category-main">
                <span class="edit-category-status">${badgeLabel}</span>
                <h4 class="fav-group-title">${category.category_name}</h4>
                <p class="edit-category-meta">${metaLabel}</p>
              </div>

              <span class="edit-category-side">
                ${isPrivate ? `<span class="edit-category-lock" aria-hidden="true">${isUnlocked ? "🔓" : "🔒"}</span>` : ""}
                <span class="fav-group-count">${count}</span>
                <span class="edit-category-chevron" aria-hidden="true">-</span>
              </span>
            </button>
          </div>

          ${
            !isUnlocked
              ? `
                <div class="edit-locked-state">
                  <p>Catégorie privée protégée. Cliquez de nouveau pour saisir le mot de passe.</p>
                </div>
              `
              : `
                <ul class="fav-draft-list edit-lane-list">
                  ${
                    count > 0
                      ? categoryFavorites.map(getEditBoardFavoriteMarkup).join("")
                      : `<li class="edit-empty-state">Aucun favori dans cette catégorie.</li>`
                  }
                </ul>
              `
          }
        </section>
      `;
    })
    .join("");

  setMessage(
    editBoardMessage,
    visibleCategories.length > 0
      ? "Glissez un favori vers une catégorie du haut pour le déplacer."
      : "Choisissez une catégorie dans la liste ci-dessus pour afficher ses favoris."
  );
}

function renderDeleteBoard() {
  // Le panneau suppression garde une navigation par categories.
  if (categories.length === 0) {
    deleteFavBoard.innerHTML = "";
    deleteCategoryEmptyState.style.display = "block";
    setMessage(deleteBoardMessage, "Aucune catégorie disponible pour supprimer un favori.");
    return;
  }

  deleteCategoryEmptyState.style.display = "none";
  deleteFavBoard.innerHTML = categories
    .map((category) => {
      const categoryId = String(category.id_category);
      const isPrivate = isCategoryPrivate(category);
      const isUnlocked = !isPrivate || isCategoryUnlocked(categoryId);
      const isExpanded = expandedDeleteCategoryIds.has(categoryId);
      const categoryFavorites = getFavoritesForCategory(categoryId);
      const count = categoryFavorites.length;
      const hasSelectedFavorite = categoryFavorites.some(
        (fav) => String(fav.id_favs) === String(selectedDeleteFavId)
      );
      const badgeLabel = getCategoryBadgeLabel(category);
      const metaLabel = getCategoryMetaLabel(categoryId);

      return `
        <section
          class="edit-category-lane delete-category-lane ${isPrivate ? "is-private" : "is-public"} ${hasSelectedFavorite ? "has-selection" : ""} ${isExpanded ? "is-expanded" : ""}"
          data-delete-category-lane="${categoryId}"
        >
          <div class="edit-category-header delete-category-header">
            <button
              type="button"
              class="edit-category-toggle"
              data-toggle-delete-category="${categoryId}"
              aria-expanded="${isExpanded ? "true" : "false"}"
            >
              <div class="edit-category-main">
                <span class="edit-category-status">${badgeLabel}</span>
                <h4 class="fav-group-title">${category.category_name}</h4>
                <p class="edit-category-meta">${metaLabel}</p>
              </div>

              <span class="edit-category-side">
                ${isPrivate ? `<span class="edit-category-lock" aria-hidden="true">${isUnlocked ? "🔓" : "🔒"}</span>` : ""}
                <span class="fav-group-count">${count}</span>
                <span class="edit-category-chevron" aria-hidden="true">${isExpanded ? "-" : "+"}</span>
              </span>
            </button>
          </div>

          ${
            isExpanded
              ? !isUnlocked
                ? `
                  <div class="edit-locked-state">
                    <p>Catégorie privée protégée. Cliquez de nouveau pour saisir le mot de passe.</p>
                  </div>
                `
                : `
                  <ul class="fav-draft-list edit-lane-list">
                    ${
                      count > 0
                        ? categoryFavorites.map(getDeleteBoardFavoriteMarkup).join("")
                        : `<li class="edit-empty-state">Aucun favori dans cette catégorie.</li>`
                    }
                  </ul>
                `
              : ""
          }
        </section>
      `;
    })
    .join("");

  setMessage(
    deleteBoardMessage,
    "Ouvrez une catégorie, puis choisissez un favori à supprimer."
  );
}

function fillEditForm(selectedId) {
  // Remplit le formulaire de modification avec le favori choisi.
  const fav = favorites.find((item) => String(item.id_favs) === String(selectedId));

  if (!fav) {
    selectedEditFavId = "";
    editFavForm.reset();
    setEditSelectionSummary(
      "Ouvrez une catégorie puis choisissez un favori pour le modifier."
    );
    editFavForm.classList.add("is-collapsed");
    editFavForm.setAttribute("aria-expanded", "false");
    setMessage(editFavMessage, "");
    return;
  }

  selectedEditFavId = String(selectedId);
  editFavTitle.value = fav.title_favs || "";
  editFavUrl.value = fav.url_favs || "";
  editFavCategory.value = String(fav.id_category || "");
  setEditSelectionSummary(`Favori sélectionné : ${fav.title_favs}.`);
  editFavForm.classList.remove("is-collapsed");
  editFavForm.setAttribute("aria-expanded", "true");
}

function fillDeleteSelection(selectedId) {
  // Memorise le favori choisi pour suppression.
  const fav = favorites.find((item) => String(item.id_favs) === String(selectedId));

  if (!fav) {
    selectedDeleteFavId = "";
    deleteFavId.value = "";
    setDeleteSelectionSummary(
      "Ouvrez une catégorie puis choisissez un favori pour le supprimer."
    );
    return;
  }

  selectedDeleteFavId = String(selectedId);
  deleteFavId.value = String(fav.id_favs || "");
  setDeleteSelectionSummary(`Favori sélectionné pour suppression : "${fav.title_favs}".`);
}

function syncEditSelectionState() {
  // Nettoie les selections de modification si les donnees ont change.
  const availableCategoryIds = new Set(
    categories.map((category) => String(category.id_category))
  );
  const availableFavoriteIds = new Set(
    favorites.map((fav) => String(fav.id_favs))
  );

  expandedEditCategoryIds = new Set(
    [...expandedEditCategoryIds].filter((categoryId) =>
      availableCategoryIds.has(String(categoryId))
    )
  );

  selectedEditFavIds = new Set(
    [...selectedEditFavIds].filter((favId) =>
      availableFavoriteIds.has(String(favId))
    )
  );

  const selectedFavExists = favorites.some(
    (fav) => String(fav.id_favs) === String(selectedEditFavId)
  );

  if (!selectedFavExists) {
    selectedEditFavId = "";
  }
}

function syncDeleteSelectionState() {
  // Nettoie les selections de suppression si les donnees ont change.
  const availableCategoryIds = new Set(
    categories.map((category) => String(category.id_category))
  );

  expandedDeleteCategoryIds = new Set(
    [...expandedDeleteCategoryIds].filter((categoryId) =>
      availableCategoryIds.has(String(categoryId))
    )
  );

  const selectedFavExists = favorites.some(
    (fav) => String(fav.id_favs) === String(selectedDeleteFavId)
  );

  if (!selectedFavExists) {
    selectedDeleteFavId = "";
  }
}

async function handleEditCategoryToggle(categoryId) {
  // Ouvre/ferme une categorie dans le panneau modification.
  // Si elle est privee, le deuxieme clic demande le mot de passe.
  const normalizedCategoryId = String(categoryId || "");
  const category = getCategoryById(normalizedCategoryId);

  if (!category) return;

  const isExpanded = expandedEditCategoryIds.has(normalizedCategoryId);
  const isPrivate = isCategoryPrivate(category);
  const isUnlocked = !isPrivate || isCategoryUnlocked(normalizedCategoryId);

  if (!isUnlocked) {
    if (!isExpanded) {
      expandedEditCategoryIds.add(normalizedCategoryId);
      renderEditCategoryQuickList();
      renderEditBoard();
      setMessage(
        editBoardMessage,
        `Catégorie "${category.category_name}" protégée. Cliquez de nouveau pour saisir le mot de passe.`
      );
      return;
    }

    try {
      const hasAccess = await ensureCategorySelectionAccess(normalizedCategoryId);

      if (!hasAccess) {
        return;
      }

      renderEditCategoryQuickList();
      renderEditBoard();
      setMessage(
        editBoardMessage,
        `Catégorie "${category.category_name}" déverrouillée.`,
        "success"
      );
    } catch (error) {
      setMessage(editBoardMessage, getUnlockErrorMessage(error), "error");
    }
    return;
  }

  if (isExpanded) {
    expandedEditCategoryIds.delete(normalizedCategoryId);
  } else {
    expandedEditCategoryIds.add(normalizedCategoryId);
  }

  renderEditCategoryQuickList();
  renderEditBoard();
}

function syncFormAvailability() {
  // Active ou desactive les formulaires selon les donnees disponibles.
  const hasCategories = categories.length > 0;
  const hasFavorites = favorites.length > 0;
  const hasSelectedEditFavorite = Boolean(selectedEditFavId);
  const hasSelectedDeleteFavorite = Boolean(selectedDeleteFavId);

  favCategory.disabled = !hasCategories;
  addSubmitButton.disabled = !hasCategories;

  editFavTitle.disabled = !hasSelectedEditFavorite;
  editFavUrl.disabled = !hasSelectedEditFavorite;
  editFavCategory.disabled = !hasCategories || !hasSelectedEditFavorite;
  editSubmitButton.disabled = !hasSelectedEditFavorite || !hasCategories;
  deleteSubmitButton.disabled = !hasFavorites || !hasSelectedDeleteFavorite;

  if (!hasCategories) {
    setMessage(
      favFormMessage,
      "Créez d'abord une catégorie avant d'ajouter un favori.",
      "error"
    );
  }

  if (!hasSelectedEditFavorite) {
    setEditSelectionSummary(
      "Ouvrez une catégorie puis choisissez un favori pour le modifier."
    );
  }

  if (!hasSelectedDeleteFavorite) {
    setDeleteSelectionSummary(
      "Ouvrez une catégorie puis choisissez un favori pour le supprimer."
    );
  }
}

function sortFavoritesByStoredOrder() {
  // Trie les favoris en tenant compte de l'ordre des categories et de l'ordre local.
  syncFavoriteOrderState();

  const categoryOrderMap = new Map(
    categoryOrderIds.map((id, index) => [String(id), index])
  );
  const favoriteOrderMaps = new Map(
    Object.entries(favoriteOrderByCategory).map(([categoryId, favoriteIds]) => [
      String(categoryId),
      new Map(favoriteIds.map((id, index) => [String(id), index])),
    ])
  );

  favorites.sort((left, right) => {
    const leftCategoryId = String(left.id_category || "");
    const rightCategoryId = String(right.id_category || "");
    const leftCategoryOrder =
      categoryOrderMap.get(leftCategoryId) ?? Number.MAX_SAFE_INTEGER;
    const rightCategoryOrder =
      categoryOrderMap.get(rightCategoryId) ?? Number.MAX_SAFE_INTEGER;

    if (leftCategoryOrder !== rightCategoryOrder) {
      return leftCategoryOrder - rightCategoryOrder;
    }

    if (leftCategoryId !== rightCategoryId) {
      return Number(leftCategoryId) - Number(rightCategoryId);
    }

    const categoryFavoriteOrderMap =
      favoriteOrderMaps.get(leftCategoryId) || new Map();
    const leftFavoriteOrder =
      categoryFavoriteOrderMap.get(String(left.id_favs)) ?? Number.MAX_SAFE_INTEGER;
    const rightFavoriteOrder =
      categoryFavoriteOrderMap.get(String(right.id_favs)) ?? Number.MAX_SAFE_INTEGER;

    if (leftFavoriteOrder !== rightFavoriteOrder) {
      return leftFavoriteOrder - rightFavoriteOrder;
    }

    return Number(left.id_favs) - Number(right.id_favs);
  });
}

function refreshUI() {
  // Point central : apres une modification, on synchronise puis on rerend tout.
  syncCategoryOrderState();
  sortFavoritesByStoredOrder();
  syncEditSelectionState();
  syncDeleteSelectionState();
  categories = sortCategoriesByStoredOrder(categories);
  syncDefaultCategoryState();
  updateWorkspaceSummary();
  updateActionModeUI();
  renderCategorySelects();
  renderEditCategoryQuickList();
  renderEditBoard();
  renderDeleteBoard();
  fillEditForm(selectedEditFavId);
  fillDeleteSelection(selectedDeleteFavId);
  syncFormAvailability();
}

function clearCategoryDropStates() {
  // Retire les styles temporaires du drag de categories.
  editDragBoard
    .querySelectorAll(".edit-category-lane.drop-active")
    .forEach((lane) => lane.classList.remove("drop-active"));
}

function clearFavoriteDropStates() {
  // Retire les styles temporaires du drag de favoris.
  [editDragBoard, editCategoryQuickList]
    .filter(Boolean)
    .forEach((root) => {
      root
        .querySelectorAll(
          ".edit-category-lane.favorite-drop-active, .edit-category-pill.favorite-drop-active"
        )
        .forEach((target) => target.classList.remove("favorite-drop-active"));
    });
}

function clearFavoriteItemDropStates() {
  // Retire le style de cible sur les favoris.
  editDragBoard
    .querySelectorAll(".fav-draft-item.favorite-drop-target")
    .forEach((item) => item.classList.remove("favorite-drop-target"));
}

function swapCategoryOrder(sourceCategoryId, targetCategoryId) {
  // Echange deux categories dans l'ordre local.
  if (!sourceCategoryId || !targetCategoryId || sourceCategoryId === targetCategoryId) {
    return;
  }

  syncCategoryOrderState();

  const sourceIndex = categoryOrderIds.indexOf(String(sourceCategoryId));
  const targetIndex = categoryOrderIds.indexOf(String(targetCategoryId));

  if (sourceIndex === -1 || targetIndex === -1) return;

  [categoryOrderIds[sourceIndex], categoryOrderIds[targetIndex]] = [
    categoryOrderIds[targetIndex],
    categoryOrderIds[sourceIndex],
  ];

  persistCategoryOrder();
  categories = sortCategoriesByStoredOrder(categories);
}

function canOpenCategoryAfterFavoriteMove(categoryId) {
  // Apres un deplacement, on ouvre la cible seulement si elle est accessible.
  const category = getCategoryById(categoryId);

  return Boolean(category) && (!isCategoryPrivate(category) || isCategoryUnlocked(categoryId));
}

function getFavoriteDragIds(favId) {
  // Si le favori fait partie d'une selection multiple, on deplace toute la selection.
  const normalizedFavId = String(favId || "");

  if (!normalizedFavId) {
    return [];
  }

  if (!selectedEditFavIds.has(normalizedFavId)) {
    return [normalizedFavId];
  }

  const visibleFavoriteIds = new Set(
    Array.from(editDragBoard.querySelectorAll("[data-favorite-item]")).map(
      (item) => String(item.dataset.favoriteItem)
    )
  );
  const selectedIds = new Set(
    [...selectedEditFavIds].filter((id) => visibleFavoriteIds.has(String(id)))
  );

  return favorites
    .filter((fav) => selectedIds.has(String(fav.id_favs)))
    .map((fav) => String(fav.id_favs));
}

function getDraggedFavoriteIds() {
  // Pendant le drag, cette fonction donne toujours la liste a deplacer.
  if (draggedFavoriteIds.length > 0) {
    return draggedFavoriteIds;
  }

  return draggedFavoriteId ? [String(draggedFavoriteId)] : [];
}

async function moveFavoriteToCategory(favId, targetCategoryId, options = {}) {
  // Raccourci pour deplacer un seul favori.
  return moveFavoritesToCategory([favId], targetCategoryId, options);
}

async function moveFavoritesToCategory(favIds, targetCategoryId, options = {}) {
  // Deplace un ou plusieurs favoris vers une categorie.
  // Si la categorie ne change pas, on met seulement l'ordre local a jour.
  const { beforeFavId = "" } = options;
  const targetCategory = categories.find(
    (item) => String(item.id_category) === String(targetCategoryId)
  );
  const normalizedFavIds = [...new Set((favIds || []).map((id) => String(id || "")).filter(Boolean))];
  const movingFavoriteIds = new Set(normalizedFavIds);
  const movingFavorites = favorites.filter((item) =>
    movingFavoriteIds.has(String(item.id_favs))
  );

  if (movingFavorites.length === 0 || !targetCategory) return;

  if (beforeFavId && movingFavoriteIds.has(String(beforeFavId))) {
    return;
  }

  const favoritesToPatch = movingFavorites.filter(
    (favorite) => String(favorite.id_category) !== String(targetCategoryId)
  );
  const updatedFavorites = [];

  for (const favorite of favoritesToPatch) {
    const data = await fetchWithAuth(`/favs/${favorite.id_favs}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title_favs: favorite.title_favs,
        url_favs: favorite.url_favs || null,
        id_category: Number(targetCategoryId),
      }),
    });

    if (data.fav) {
      updatedFavorites.push(data.fav);
    }
  }

  if (updatedFavorites.length > 0) {
    const updatedById = new Map(
      updatedFavorites.map((fav) => [String(fav.id_favs), fav])
    );
    favorites = favorites.map((fav) =>
      updatedById.get(String(fav.id_favs)) || fav
    );
  }

  placeFavoritesInOrder({
    favIds: movingFavorites.map((fav) => String(fav.id_favs)),
    targetCategoryId,
    beforeFavId,
  });

  const canOpenTarget = canOpenCategoryAfterFavoriteMove(targetCategoryId);
  const movedCount = movingFavorites.length;

  selectedEditFavIds.clear();
  selectedEditFavId = movedCount === 1 && canOpenTarget
    ? String(movingFavorites[0].id_favs)
    : "";

  if (canOpenTarget) {
    expandedEditCategoryIds.add(String(targetCategoryId));
  }

  refreshUI();

  if (favoritesToPatch.length === 0) {
    setMessage(
      editBoardMessage,
      movedCount === 1
        ? `Ordre des favoris mis à jour dans "${targetCategory.category_name}".`
        : `Ordre de ${movedCount} favoris mis à jour dans "${targetCategory.category_name}".`,
      "success"
    );
    return;
  }

  setMessage(
    editBoardMessage,
    movedCount === 1
      ? `Favori déplacé vers "${targetCategory.category_name}".`
      : `${movedCount} favoris déplacés vers "${targetCategory.category_name}".`,
    "success"
  );
  setMessage(editFavMessage, "");
}

async function ensureCategorySelectionAccess(categoryId) {
  // Verifie si on peut afficher une categorie privee, sinon demande son mot de passe.
  const category = getCategoryById(categoryId);

  if (!category) {
    return false;
  }

  if (!isCategoryPrivate(category) || isCategoryUnlocked(categoryId)) {
    return true;
  }

  const userInput = await askFavoriteCategoryPassword(category.category_name);

  if (userInput === null) {
    return false;
  }

  await requestCategoryUnlock(categoryId, userInput);
  unlockedCategoryIds.add(String(categoryId));
  return true;
}

async function loadPageData() {
  // Chargement initial : categories, favoris et utilisateur courant en parallele.
  setMessage(favFormMessage, "Chargement des données...");

  try {
    const [categoriesData, favoritesData, userData] = await Promise.all([
      fetchWithAuth("/categories"),
      fetchWithAuth("/favs"),
      getCurrentUser(),
    ]);

    categories = Array.isArray(categoriesData) ? categoriesData : [];
    favorites = Array.isArray(favoritesData) ? favoritesData : [];
    syncDefaultCategoryFromUser(userData);
    syncCategoryOrderState();
    categories = sortCategoriesByStoredOrder(categories);
    refreshUI();

    if (categories.length > 0) {
      setMessage(favFormMessage, "");
    }
  } catch (error) {
    categories = [];
    favorites = [];
    refreshUI();
    setMessage(
      favFormMessage,
      error.message || "Impossible de charger les catégories et les favoris.",
      "error"
    );
  }
}

favForm.addEventListener("submit", async (event) => {
  // Ajout d'un favori depuis le formulaire de gauche.
  event.preventDefault();

  const title = favTitle.value.trim();
  const url = favUrl.value.trim();
  const chosenCategoryId = String(favCategory.value || "");
  const resolvedCategoryId = chosenCategoryId || String(defaultCategoryId || "");
  const categoryId = Number(resolvedCategoryId);

  if (!title && !categoryId) {
    setMessage(
      favFormMessage,
      "Le titre est obligatoire. Choisissez aussi une catégorie ou définissez-en une par défaut dans les catégories. L'URL est facultative.",
      "error"
    );
    return;
  }

  if (!title) {
    setMessage(
      favFormMessage,
      "Le titre est obligatoire. L'URL reste facultative.",
      "error"
    );
    return;
  }

  if (!categoryId) {
    setMessage(
      favFormMessage,
      "Choisissez une catégorie ou définissez-en une par défaut dans les catégories.",
      "error"
    );
    return;
  }

  try {
    const targetCategory = getCategoryById(categoryId);
    const data = await fetchWithAuth("/favs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title_favs: title,
        url_favs: url || null,
        id_category: categoryId,
      }),
    });

    favorites.push(data.fav);
    refreshUI();
    favForm.reset();
    setMessage(
      favFormMessage,
      targetCategory
        ? chosenCategoryId
          ? `Favori ajouté dans "${targetCategory.category_name}".`
          : `Favori ajouté dans la catégorie par défaut "${targetCategory.category_name}".`
        : data.message || "Favori ajouté avec succès.",
      "success"
    );
  } catch (error) {
    setMessage(
      favFormMessage,
      error.message || "Impossible d'ajouter le favori pour le moment.",
      "error"
    );
  }
});

favCategory.addEventListener("change", () => {
  // Met a jour l'aide quand l'utilisateur choisit une categorie.
  updateFavCategoryHelp();
});

enterEditModeButton.addEventListener("click", () => {
  // Affiche le panneau de modification.
  currentActionMode = "edit";
  updateActionModeUI();
});

enterDeleteModeButton.addEventListener("click", () => {
  // Affiche le panneau de suppression.
  currentActionMode = "delete";
  updateActionModeUI();
});

window.addEventListener("pagehide", () => {
  // Securite : quand on quitte la page, les categories privees sont rebloquees.
  relockProtectedCategories();
});

window.addEventListener("pageshow", (event) => {
  // Si le navigateur restaure la page depuis son cache, on rebloque aussi.
  if (!event.persisted) return;

  relockProtectedCategories();
  refreshUI();
});

editDragBoard.addEventListener("click", async (event) => {
  // Gestion des clics dans le panneau de modification.
  const categoryToggle = event.target.closest("[data-toggle-edit-category]");

  if (categoryToggle) {
    await handleEditCategoryToggle(categoryToggle.dataset.toggleEditCategory);
    return;
  }

  const selectionToggle = event.target.closest("[data-toggle-edit-fav-selection]");

  if (selectionToggle) {
    const favId = String(selectionToggle.dataset.toggleEditFavSelection || "");

    if (!favId) return;

    if (selectedEditFavIds.has(favId)) {
      selectedEditFavIds.delete(favId);
    } else {
      selectedEditFavIds.add(favId);
    }

    renderEditBoard();
    setMessage(
      editBoardMessage,
      selectedEditFavIds.size > 0
        ? `${selectedEditFavIds.size} favori${selectedEditFavIds.size > 1 ? "s" : ""} sélectionné${selectedEditFavIds.size > 1 ? "s" : ""}. Glissez-en un pour déplacer la sélection.`
        : "Choisissez une catégorie dans la liste ci-dessus pour afficher ses favoris."
    );
    return;
  }

  const favoriteButton = event.target.closest("[data-edit-fav]");

  if (!favoriteButton) return;

  fillEditForm(favoriteButton.dataset.editFav);
  renderEditBoard();
  syncFormAvailability();
  setMessage(editFavMessage, "");
});

editCategoryQuickList?.addEventListener("click", async (event) => {
  // Clic sur une pastille du haut : ouvrir ou fermer la categorie.
  const quickToggleButton = event.target.closest("[data-quick-toggle-edit-category]");

  if (!quickToggleButton) return;

  await handleEditCategoryToggle(quickToggleButton.dataset.quickToggleEditCategory);
});

editCategoryQuickList?.addEventListener("dragover", (event) => {
  // Les pastilles du haut servent aussi de zones de depot pour les favoris.
  const favoriteDropCategory = event.target.closest("[data-drop-fav-category]");
  const movingFavoriteIds = getDraggedFavoriteIds();

  if (movingFavoriteIds.length === 0 || !favoriteDropCategory) return;

  const targetCategoryId = String(favoriteDropCategory.dataset.dropFavCategory);
  const hasDraggedFavorite = favorites.some((fav) =>
    movingFavoriteIds.includes(String(fav.id_favs))
  );

  if (!targetCategoryId || !hasDraggedFavorite) return;

  event.preventDefault();
  clearFavoriteDropStates();
  clearFavoriteItemDropStates();
  favoriteDropCategory.classList.add("favorite-drop-active");
  event.dataTransfer.dropEffect = "move";
});

editCategoryQuickList?.addEventListener("dragleave", (event) => {
  // Quand la souris quitte une pastille, on retire l'etat visuel de depot.
  const favoriteDropCategory = event.target.closest("[data-drop-fav-category]");

  if (!favoriteDropCategory) return;
  if (favoriteDropCategory.contains(event.relatedTarget)) return;

  favoriteDropCategory.classList.remove("favorite-drop-active");
});

editCategoryQuickList?.addEventListener("drop", async (event) => {
  // Depot d'un favori sur une pastille du haut.
  const favoriteDropCategory = event.target.closest("[data-drop-fav-category]");
  const movingFavoriteIds = getDraggedFavoriteIds();

  if (movingFavoriteIds.length === 0 || !favoriteDropCategory) return;

  event.preventDefault();
  const targetCategoryId = String(favoriteDropCategory.dataset.dropFavCategory);

  clearFavoriteDropStates();
  clearFavoriteItemDropStates();

  if (!targetCategoryId) return;

  try {
    await moveFavoritesToCategory(movingFavoriteIds, targetCategoryId);
  } catch (error) {
    setMessage(
      editBoardMessage,
      error.message || "Impossible de déplacer le favori pour le moment.",
      "error"
    );
  }
});

deleteFavBoard.addEventListener("click", async (event) => {
  // Gestion des clics dans le panneau suppression.
  const categoryToggle = event.target.closest("[data-toggle-delete-category]");

  if (categoryToggle) {
    const categoryId = String(categoryToggle.dataset.toggleDeleteCategory || "");
    const category = getCategoryById(categoryId);

    if (!category) return;

    const isExpanded = expandedDeleteCategoryIds.has(categoryId);
    const isPrivate = isCategoryPrivate(category);
    const isUnlocked = !isPrivate || isCategoryUnlocked(categoryId);

    if (!isUnlocked) {
      if (!isExpanded) {
        expandedDeleteCategoryIds.add(categoryId);
        renderDeleteBoard();
        setMessage(
          deleteBoardMessage,
          `Catégorie "${category.category_name}" protégée. Cliquez de nouveau pour saisir le mot de passe.`
        );
        return;
      }

      try {
        const hasAccess = await ensureCategorySelectionAccess(categoryId);

        if (!hasAccess) {
          return;
        }

        renderDeleteBoard();
        setMessage(
          deleteBoardMessage,
          `Catégorie "${category.category_name}" déverrouillée.`,
          "success"
        );
      } catch (error) {
        setMessage(deleteBoardMessage, getUnlockErrorMessage(error), "error");
      }
      return;
    }

    if (isExpanded) {
      expandedDeleteCategoryIds.delete(categoryId);
    } else {
      expandedDeleteCategoryIds.add(categoryId);
    }

    renderDeleteBoard();
    return;
  }

  const favoriteButton = event.target.closest("[data-delete-fav]");

  if (!favoriteButton) return;

  fillDeleteSelection(favoriteButton.dataset.deleteFav);
  renderDeleteBoard();
  syncFormAvailability();
  setMessage(deleteFavMessage, "");
});

editDragBoard.addEventListener("dragstart", (event) => {
  // Le drag and drop stocke l'id déplacé, puis la vue est rerendue avec le nouvel ordre.
  const dragHandle = event.target.closest("[data-drag-category]");
  const favoriteHandle = event.target.closest("[data-drag-fav]");

  if (dragHandle) {
    draggedCategoryId = String(dragHandle.dataset.dragCategory);
    draggedFavoriteId = "";
    draggedFavoriteIds = [];
    dragHandle.closest("[data-category-lane]")?.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedCategoryId);
    return;
  }

  if (!favoriteHandle) return;

  draggedFavoriteId = String(favoriteHandle.dataset.dragFav);
  draggedFavoriteIds = getFavoriteDragIds(draggedFavoriteId);
  draggedCategoryId = "";
  const draggingIds = new Set(draggedFavoriteIds);

  editDragBoard
    .querySelectorAll("[data-favorite-item]")
    .forEach((item) => {
      item.classList.toggle(
        "is-dragging",
        draggingIds.has(String(item.dataset.favoriteItem))
      );
    });
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedFavoriteId);
});

editDragBoard.addEventListener("dragend", (event) => {
  // Fin du drag : on nettoie toutes les variables temporaires et les classes CSS.
  const dragHandle = event.target.closest("[data-drag-category]");

  draggedCategoryId = "";
  draggedFavoriteId = "";
  draggedFavoriteIds = [];
  dragHandle?.closest("[data-category-lane]")?.classList.remove("is-dragging");
  editDragBoard
    .querySelectorAll(".fav-draft-item.is-dragging")
    .forEach((item) => item.classList.remove("is-dragging"));
  clearCategoryDropStates();
  clearFavoriteDropStates();
  clearFavoriteItemDropStates();
});

editDragBoard.addEventListener("dragover", (event) => {
  // Pendant le survol, on choisit le bon type de cible :
  // favori, categorie ouverte, ou ordre des categories.
  const favoriteDropItem = event.target.closest(
    "[data-favorite-item][data-favorite-category]"
  );
  const lane = event.target.closest("[data-category-lane]");
  const favoriteDropLane = event.target.closest("[data-drop-fav-category]");
  const movingFavoriteIds = getDraggedFavoriteIds();

  if (movingFavoriteIds.length > 0 && favoriteDropItem) {
    const targetFavId = String(favoriteDropItem.dataset.favoriteItem);

    if (!targetFavId || movingFavoriteIds.includes(targetFavId)) {
      return;
    }

    event.preventDefault();
    clearFavoriteDropStates();
    clearFavoriteItemDropStates();
    favoriteDropItem.classList.add("favorite-drop-target");
    event.dataTransfer.dropEffect = "move";
    return;
  }

  if (movingFavoriteIds.length > 0 && favoriteDropLane) {
    const targetCategoryId = String(favoriteDropLane.dataset.dropFavCategory);
    const hasDraggedFavorite = favorites.some(
      (fav) => movingFavoriteIds.includes(String(fav.id_favs))
    );

    if (!targetCategoryId || !hasDraggedFavorite) {
      return;
    }

    event.preventDefault();
    clearFavoriteDropStates();
    clearFavoriteItemDropStates();
    favoriteDropLane.classList.add("favorite-drop-active");
    event.dataTransfer.dropEffect = "move";
    return;
  }

  if (!lane || !draggedCategoryId) return;

  const targetCategoryId = String(lane.dataset.categoryLane);

  if (!targetCategoryId || targetCategoryId === draggedCategoryId) return;

  event.preventDefault();
  clearCategoryDropStates();
  lane.classList.add("drop-active");
  event.dataTransfer.dropEffect = "move";
});

editDragBoard.addEventListener("dragleave", (event) => {
  // Sortie d'une cible de drop : on retire l'etat visuel correspondant.
  const favoriteDropItem = event.target.closest(
    "[data-favorite-item][data-favorite-category]"
  );
  const lane = event.target.closest("[data-category-lane]");
  const favoriteDropLane = event.target.closest("[data-drop-fav-category]");

  if (favoriteDropItem) {
    if (favoriteDropItem.contains(event.relatedTarget)) return;
    favoriteDropItem.classList.remove("favorite-drop-target");
    return;
  }

  if (favoriteDropLane) {
    if (favoriteDropLane.contains(event.relatedTarget)) return;
    favoriteDropLane.classList.remove("favorite-drop-active");
    return;
  }

  if (!lane) return;

  if (lane.contains(event.relatedTarget)) return;
  lane.classList.remove("drop-active");
});

editDragBoard.addEventListener("drop", async (event) => {
  // Depot final dans le panneau de modification.
  const favoriteDropItem = event.target.closest(
    "[data-favorite-item][data-favorite-category]"
  );
  const favoriteDropLane = event.target.closest("[data-drop-fav-category]");
  const movingFavoriteIds = getDraggedFavoriteIds();

  if (movingFavoriteIds.length > 0 && favoriteDropItem) {
    event.preventDefault();
    const targetFavId = String(favoriteDropItem.dataset.favoriteItem);
    const targetCategoryId = String(favoriteDropItem.dataset.favoriteCategory);

    clearFavoriteDropStates();
    clearFavoriteItemDropStates();

    if (
      movingFavoriteIds.length === 0 ||
      !targetFavId ||
      !targetCategoryId ||
      movingFavoriteIds.includes(targetFavId)
    ) {
      return;
    }

    try {
      await moveFavoritesToCategory(movingFavoriteIds, targetCategoryId, {
        beforeFavId: targetFavId,
      });
    } catch (error) {
      setMessage(
        editBoardMessage,
        error.message || "Impossible de déplacer le favori pour le moment.",
        "error"
      );
    }

    return;
  }

  if (movingFavoriteIds.length > 0 && favoriteDropLane) {
    event.preventDefault();
    const targetCategoryId = String(favoriteDropLane.dataset.dropFavCategory);

    clearFavoriteDropStates();
    clearFavoriteItemDropStates();

    if (movingFavoriteIds.length === 0 || !targetCategoryId) return;

    try {
      await moveFavoritesToCategory(movingFavoriteIds, targetCategoryId);
    } catch (error) {
      setMessage(
        editBoardMessage,
        error.message || "Impossible de déplacer le favori pour le moment.",
        "error"
      );
    }

    return;
  }

  const lane = event.target.closest("[data-category-lane]");

  if (!lane) return;

  event.preventDefault();
  const sourceCategoryId =
    event.dataTransfer.getData("text/plain") || draggedCategoryId;
  const targetCategoryId = String(lane.dataset.categoryLane);

  clearCategoryDropStates();

  if (!sourceCategoryId || !targetCategoryId || sourceCategoryId === targetCategoryId) {
    return;
  }

  const sourceCategory = categories.find(
    (category) => String(category.id_category) === String(sourceCategoryId)
  );
  const targetCategory = categories.find(
    (category) => String(category.id_category) === String(targetCategoryId)
  );

  swapCategoryOrder(sourceCategoryId, targetCategoryId);
  draggedCategoryId = "";
  refreshUI();

  if (sourceCategory && targetCategory) {
    setMessage(
      editBoardMessage,
      `"${sourceCategory.category_name}" et "${targetCategory.category_name}" ont changé de place.`,
      "success"
    );
  }
});

editFavForm.addEventListener("submit", async (event) => {
  // Enregistre la modification du favori selectionne.
  event.preventDefault();

  const selectedId = Number(selectedEditFavId);
  const title = editFavTitle.value.trim();
  const url = editFavUrl.value.trim();
  const categoryId = Number(editFavCategory.value);

  if (!selectedId || !title || !categoryId) {
    setMessage(
      editFavMessage,
      "Le titre et la catégorie sont obligatoires. L'URL est facultative.",
      "error"
    );
    return;
  }

  try {
    const data = await fetchWithAuth(`/favs/${selectedId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title_favs: title,
        url_favs: url || null,
        id_category: categoryId,
      }),
    });

    favorites = favorites.map((fav) =>
      Number(fav.id_favs) === selectedId ? data.fav : fav
    );
    selectedEditFavId = String(data.fav.id_favs || "");
    expandedEditCategoryIds.add(String(data.fav.id_category || ""));
    refreshUI();
    setMessage(editFavMessage, data.message || "Favori mis à jour avec succès.", "success");
  } catch (error) {
    setMessage(
      editFavMessage,
      error.message || "Impossible de mettre à jour le favori pour le moment.",
      "error"
    );
  }
});

deleteFavForm.addEventListener("submit", async (event) => {
  // Supprime le favori choisi apres confirmation.
  event.preventDefault();

  const selectedId = Number(deleteFavId.value);
  const favToDelete = favorites.find((item) => Number(item.id_favs) === selectedId);

  if (!favToDelete) {
    setMessage(deleteFavMessage, "Choisissez un favori à supprimer.", "error");
    return;
  }

  const isConfirmed = await showFavoriteConfirmModal({
    title: "Supprimer ce favori ?",
    message: `Confirmer la suppression du favori "${favToDelete.title_favs}" ?`,
    confirmLabel: "Supprimer",
    cancelLabel: "Annuler",
    danger: true,
  });

  if (!isConfirmed) return;

  try {
    const data = await fetchWithAuth(`/favs/${selectedId}`, {
      method: "DELETE",
    });

    favorites = favorites.filter((item) => Number(item.id_favs) !== selectedId);
    if (String(selectedEditFavId) === String(selectedId)) {
      selectedEditFavId = "";
    }
    selectedEditFavIds.delete(String(selectedId));
    if (String(selectedDeleteFavId) === String(selectedId)) {
      selectedDeleteFavId = "";
    }
    refreshUI();
    deleteFavForm.reset();
    setMessage(deleteFavMessage, data.message || "Favori supprimé avec succès.", "success");
    setMessage(editFavMessage, "");
  } catch (error) {
    setMessage(
      deleteFavMessage,
      error.message || "Impossible de supprimer le favori pour le moment.",
      "error"
    );
  }
});

// Premier rendu vide, puis chargement des donnees reelles depuis l'API.
refreshUI();
loadPageData();
