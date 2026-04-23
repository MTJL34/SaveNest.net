// Ce script gere la page d'ajout, de modification et de suppression des favoris.
import { setHeader, setFooter } from "../scripts/layout.js";

const API_BASE_URL = "http://localhost:3000/api";
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";
const UNLOCKED_CATEGORIES_STORAGE_KEY = "savenest_unlocked_categories";
const CATEGORY_ORDER_STORAGE_KEY = "savenest_category_order";
const FAVORITE_ORDER_STORAGE_KEY = "savenest_favorite_order";
const DEFAULT_CATEGORY_STORAGE_KEY = "savenest_default_category";

setHeader();
setFooter();

// Etat central de la page favoris : listes, catégories ouvertes, ordre local et mode actif.
let categories = [];
let favorites = [];
let selectedEditFavId = "";
let selectedDeleteFavId = "";
let unlockedCategoryIds = loadUnlockedCategories();
let expandedEditCategoryIds = new Set();
let expandedDeleteCategoryIds = new Set();
let categoryOrderIds = loadCategoryOrder();
let favoriteOrderByCategory = loadFavoriteOrder();
let defaultCategoryId = loadDefaultCategory();
let draggedCategoryId = "";
let draggedFavoriteId = "";
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

        <div class="actions">
          <button type="submit" class="btn btn-primary">Ajouter le favori</button>
          <button type="reset" class="btn btn-ghost">Réinitialiser</button>
        </div>

        <p id="favFormMessage" class="help" aria-live="polite"></p>
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
            Ouvrez une catégorie, puis choisissez un favori à modifier.
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

          <div class="actions">
            <button type="submit" class="btn btn-primary">Mettre à jour</button>
          </div>

          <p id="editFavMessage" class="help" aria-live="polite"></p>
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

          <p id="deleteFavMessage" class="help" aria-live="polite"></p>
        </form>
      </section>
    </section>
  </section>
`;

document.querySelector(".js_main").innerHTML = html;

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
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function redirectToLogin() {
  window.location.assign("../html/connexion.html#login");
}

function loadUnlockedCategories() {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_CATEGORIES_STORAGE_KEY);
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.map((id) => String(id)));
  } catch (error) {
    return new Set();
  }
}

function persistUnlockedCategories() {
  sessionStorage.setItem(
    UNLOCKED_CATEGORIES_STORAGE_KEY,
    JSON.stringify([...unlockedCategoryIds])
  );
}

function loadCategoryOrder() {
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
  localStorage.setItem(
    CATEGORY_ORDER_STORAGE_KEY,
    JSON.stringify(categoryOrderIds)
  );
}

function persistFavoriteOrder() {
  localStorage.setItem(
    FAVORITE_ORDER_STORAGE_KEY,
    JSON.stringify(favoriteOrderByCategory)
  );
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

async function getCurrentUser() {
  const authUserId = getAuthenticatedUserId();

  if (!authUserId) {
    redirectToLogin();
    throw new Error("Connectez-vous pour accéder à vos informations.");
  }

  return fetchWithAuth(`/auth/${authUserId}`);
}

function syncDefaultCategoryFromUser(user) {
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
    throw new Error("Connectez-vous pour gérer vos favoris.");
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

async function requestCategoryUnlock(categoryId, password) {
  return fetchWithAuth(`/categories/${categoryId}/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
}

function setMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = `help${type ? ` is-${type}` : ""}`;
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
  const normalizedValue = String(value || "").toLowerCase();

  if (value === 1 || value === "1" || value === true) return "Private";
  if (value === 0 || value === "0" || value === false) return "Public";
  if (normalizedValue === "private") return "Private";
  if (normalizedValue === "public") return "Public";
  return "Public";
}

function isCategoryPrivate(category) {
  return normalizeConfidentiality(category?.confidentiality) === "Private";
}

function isCategoryUnlocked(categoryId) {
  return unlockedCategoryIds.has(String(categoryId));
}

function getUnlockErrorMessage(error) {
  const message = error?.message || "";

  if (
    message === "Mot de passe incorrect." ||
    message === "Mauvais mot de passe."
  ) {
    return "Mauvais mot de passe.";
  }

  return message || "Impossible de déverrouiller cette catégorie.";
}

function getCategoryOptionsMarkup() {
  return categories
    .map(
      (category) =>
        `<option value="${category.id_category}">${category.category_name}</option>`
    )
    .join("");
}

function getCategoryById(categoryId) {
  return (
    categories.find(
      (category) => String(category.id_category) === String(categoryId)
    ) || null
  );
}

function syncCategoryOrderState() {
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
  const availableCategoryIds = new Set(
    categories.map((category) => String(category.id_category))
  );

  if (!defaultCategoryId || availableCategoryIds.has(String(defaultCategoryId))) {
    return;
  }

  defaultCategoryId = "";
  persistDefaultCategory();
}

function updateFavCategoryHelp() {
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
  if (currentActionMode === "edit") {
    return "Choisissez un favori à modifier dans une catégorie ouverte.";
  }

  if (currentActionMode === "delete") {
    return "Choisissez un favori à supprimer dans une catégorie ouverte.";
  }

  return "Choisis une action ou définis une catégorie par défaut.";
}

function updateActionModeUI() {
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
  return favorites.filter(
    (fav) => String(fav.id_category) === String(categoryId)
  );
}

function syncFavoriteOrderState() {
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

function placeFavoriteInOrder({ favId, targetCategoryId, beforeFavId = "" }) {
  const normalizedFavId = String(favId || "");
  const normalizedCategoryId = String(targetCategoryId || "");
  const normalizedBeforeFavId = String(beforeFavId || "");

  if (!normalizedFavId || !normalizedCategoryId) {
    return;
  }

  const nextFavoriteOrderByCategory = Object.fromEntries(
    Object.entries(favoriteOrderByCategory)
      .map(([categoryId, favoriteIds]) => [
        categoryId,
        favoriteIds.filter((id) => String(id) !== normalizedFavId),
      ])
      .filter(([, favoriteIds]) => favoriteIds.length > 0)
  );

  const targetFavoriteIds = [...(nextFavoriteOrderByCategory[normalizedCategoryId] || [])];
  const insertionIndex = normalizedBeforeFavId
    ? targetFavoriteIds.indexOf(normalizedBeforeFavId)
    : -1;

  if (insertionIndex === -1) {
    targetFavoriteIds.push(normalizedFavId);
  } else {
    targetFavoriteIds.splice(insertionIndex, 0, normalizedFavId);
  }

  nextFavoriteOrderByCategory[normalizedCategoryId] = targetFavoriteIds;
  favoriteOrderByCategory = nextFavoriteOrderByCategory;
  persistFavoriteOrder();
}

function getFavoritesGroupedByCategory() {
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
  const hasUrl = typeof fav.url_favs === "string" && fav.url_favs.trim() !== "";

  if (!hasUrl) {
    return `<span>Aucune URL</span>`;
  }

  return `<a href="${fav.url_favs}" target="_blank" rel="noopener noreferrer">${fav.url_favs}</a>`;
}

function getEditBoardFavoriteMarkup(fav) {
  const hasUrl = typeof fav.url_favs === "string" && fav.url_favs.trim() !== "";
  const isSelected = String(selectedEditFavId) === String(fav.id_favs);

  return `
    <li
      class="fav-draft-item ${isSelected ? "is-selected" : ""}"
      data-favorite-item="${fav.id_favs}"
      data-favorite-category="${fav.id_category}"
    >
      <button
        type="button"
        class="fav-choice edit-favorite-drag"
        data-edit-fav="${fav.id_favs}"
        data-drag-fav="${fav.id_favs}"
        draggable="true"
      >
        <span class="fav-choice-title">#${fav.id_favs} - ${fav.title_favs}</span>
        <span class="fav-choice-url">${hasUrl ? fav.url_favs : "Aucune URL"}</span>
      </button>
    </li>
  `;
}

function getDeleteBoardFavoriteMarkup(fav) {
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
  if (!category) return "";

  return isCategoryPrivate(category) ? "Privée" : "Publique";
}

function getCategoryMetaLabel(categoryId) {
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
          aria-pressed="${isExpanded ? "true" : "false"}"
          title="Ouvrir la catégorie ${category.category_name}"
        >
          <span class="edit-category-pill-main">
            <span class="edit-category-pill-name">${category.category_name}</span>
            <span class="edit-category-pill-state">${categoryStateLabel}</span>
          </span>
          <span class="edit-category-pill-side">
            <span class="edit-category-pill-count">${count}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function getExpandedEditCategories() {
  return categories.filter((category) =>
    expandedEditCategoryIds.has(String(category.id_category))
  );
}

function renderEditBoard() {
  if (categories.length === 0) {
    editDragBoard.innerHTML = "";
    editCategoryEmptyState.style.display = "block";
    setMessage(editBoardMessage, "Aucune catégorie disponible pour modifier un favori.");
    return;
  }

  editCategoryEmptyState.style.display = "none";
  const expandedCategories = getExpandedEditCategories();

  if (expandedCategories.length === 0) {
    editDragBoard.innerHTML = `
      <div class="edit-open-placeholder">
        <p class="edit-open-placeholder-title">Aucune catégorie ouverte</p>
        <p>Choisissez une catégorie dans la liste ci-dessus pour afficher ici ses favoris modifiables.</p>
      </div>
    `;
    setMessage(
      editBoardMessage,
      "Ouvrez une catégorie depuis la liste ci-dessus pour commencer à modifier vos favoris."
    );
    return;
  }

  editDragBoard.innerHTML = expandedCategories
    .map((category) => {
      const categoryId = String(category.id_category);
      const isPrivate = isCategoryPrivate(category);
      const isUnlocked = !isPrivate || isCategoryUnlocked(categoryId);
      const isExpanded = expandedEditCategoryIds.has(categoryId);
      const categoryFavorites = getFavoritesForCategory(categoryId);
      const count = categoryFavorites.length;
      const hasSelectedFavorite = categoryFavorites.some(
        (fav) => String(fav.id_favs) === String(selectedEditFavId)
      );
      const badgeLabel = getCategoryBadgeLabel(category);
      const metaLabel = getCategoryMetaLabel(categoryId);

      return `
        <section
          class="edit-category-lane ${isPrivate ? "is-private" : "is-public"} ${hasSelectedFavorite ? "has-selection" : ""} ${isExpanded ? "is-expanded" : ""}"
          data-category-lane="${categoryId}"
          ${isUnlocked ? `data-drop-fav-category="${categoryId}"` : ""}
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
              aria-expanded="${isExpanded ? "true" : "false"}"
            >
              <div class="edit-category-main">
                <span class="edit-category-status">${badgeLabel}</span>
                <h4 class="fav-group-title">${category.category_name}</h4>
                <p class="edit-category-meta">${metaLabel}</p>
              </div>

              <span class="edit-category-side">
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
                        ? categoryFavorites.map(getEditBoardFavoriteMarkup).join("")
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
    editBoardMessage,
    "Ouvrez une catégorie, puis choisissez un favori à modifier."
  );
}

function renderDeleteBoard() {
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
  setEditSelectionSummary(`Favori sélectionné : #${fav.id_favs} - ${fav.title_favs}.`);
  editFavForm.classList.remove("is-collapsed");
  editFavForm.setAttribute("aria-expanded", "true");
}

function fillDeleteSelection(selectedId) {
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
  const availableCategoryIds = new Set(
    categories.map((category) => String(category.id_category))
  );

  expandedEditCategoryIds = new Set(
    [...expandedEditCategoryIds].filter((categoryId) =>
      availableCategoryIds.has(String(categoryId))
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
  editDragBoard
    .querySelectorAll(".edit-category-lane.drop-active")
    .forEach((lane) => lane.classList.remove("drop-active"));
}

function clearFavoriteDropStates() {
  editDragBoard
    .querySelectorAll(".edit-category-lane.favorite-drop-active")
    .forEach((lane) => lane.classList.remove("favorite-drop-active"));
}

function clearFavoriteItemDropStates() {
  editDragBoard
    .querySelectorAll(".fav-draft-item.favorite-drop-target")
    .forEach((item) => item.classList.remove("favorite-drop-target"));
}

function swapCategoryOrder(sourceCategoryId, targetCategoryId) {
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

async function moveFavoriteToCategory(favId, targetCategoryId, options = {}) {
  const { beforeFavId = "" } = options;
  const favorite = favorites.find(
    (item) => String(item.id_favs) === String(favId)
  );
  const targetCategory = categories.find(
    (item) => String(item.id_category) === String(targetCategoryId)
  );

  if (!favorite || !targetCategory) return;

  if (String(favorite.id_category) === String(targetCategoryId)) {
    placeFavoriteInOrder({
      favId,
      targetCategoryId,
      beforeFavId,
    });
    selectedEditFavId = String(favId);
    expandedEditCategoryIds.add(String(targetCategoryId));
    refreshUI();
    setMessage(
      editBoardMessage,
      `Ordre des favoris mis à jour dans "${targetCategory.category_name}".`,
      "success"
    );
    return;
  }

  const data = await fetchWithAuth(`/favs/${favId}`, {
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

  favorites = favorites.map((fav) =>
    String(fav.id_favs) === String(favId) ? data.fav : fav
  );
  placeFavoriteInOrder({
    favId,
    targetCategoryId,
    beforeFavId,
  });
  selectedEditFavId = String(favId);
  expandedEditCategoryIds.add(String(targetCategoryId));
  refreshUI();
  setMessage(
    editBoardMessage,
    `Favori déplacé vers "${targetCategory.category_name}".`,
    "success"
  );
  setMessage(editFavMessage, "");
}

async function ensureCategorySelectionAccess(categoryId) {
  const category = getCategoryById(categoryId);

  if (!category) {
    return false;
  }

  if (!isCategoryPrivate(category) || isCategoryUnlocked(categoryId)) {
    return true;
  }

  const userInput = window.prompt(
    `Mot de passe de la catégorie "${category.category_name}" :`
  );

  if (userInput === null) {
    return false;
  }

  await requestCategoryUnlock(categoryId, userInput);
  unlockedCategoryIds.add(String(categoryId));
  persistUnlockedCategories();
  return true;
}

async function loadPageData() {
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
  updateFavCategoryHelp();
});

enterEditModeButton.addEventListener("click", () => {
  currentActionMode = "edit";
  updateActionModeUI();
});

enterDeleteModeButton.addEventListener("click", () => {
  currentActionMode = "delete";
  updateActionModeUI();
});

editDragBoard.addEventListener("click", async (event) => {
  const categoryToggle = event.target.closest("[data-toggle-edit-category]");

  if (categoryToggle) {
    await handleEditCategoryToggle(categoryToggle.dataset.toggleEditCategory);
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
  const quickToggleButton = event.target.closest("[data-quick-toggle-edit-category]");

  if (!quickToggleButton) return;

  await handleEditCategoryToggle(quickToggleButton.dataset.quickToggleEditCategory);
});

deleteFavBoard.addEventListener("click", async (event) => {
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
    dragHandle.closest("[data-category-lane]")?.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedCategoryId);
    return;
  }

  if (!favoriteHandle) return;

  draggedFavoriteId = String(favoriteHandle.dataset.dragFav);
  draggedCategoryId = "";
  favoriteHandle.closest(".fav-draft-item")?.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedFavoriteId);
});

editDragBoard.addEventListener("dragend", (event) => {
  const dragHandle = event.target.closest("[data-drag-category]");
  const favoriteHandle = event.target.closest("[data-drag-fav]");

  draggedCategoryId = "";
  draggedFavoriteId = "";
  dragHandle?.closest("[data-category-lane]")?.classList.remove("is-dragging");
  favoriteHandle?.closest(".fav-draft-item")?.classList.remove("is-dragging");
  clearCategoryDropStates();
  clearFavoriteDropStates();
  clearFavoriteItemDropStates();
});

editDragBoard.addEventListener("dragover", (event) => {
  const favoriteDropItem = event.target.closest(
    "[data-favorite-item][data-favorite-category]"
  );
  const lane = event.target.closest("[data-category-lane]");
  const favoriteDropLane = event.target.closest("[data-drop-fav-category]");

  if (draggedFavoriteId && favoriteDropItem) {
    const targetFavId = String(favoriteDropItem.dataset.favoriteItem);

    if (!targetFavId || targetFavId === draggedFavoriteId) {
      return;
    }

    event.preventDefault();
    clearFavoriteDropStates();
    clearFavoriteItemDropStates();
    favoriteDropItem.classList.add("favorite-drop-target");
    event.dataTransfer.dropEffect = "move";
    return;
  }

  if (draggedFavoriteId && favoriteDropLane) {
    const targetCategoryId = String(favoriteDropLane.dataset.dropFavCategory);
    const draggedFavorite = favorites.find(
      (fav) => String(fav.id_favs) === String(draggedFavoriteId)
    );

    if (!targetCategoryId || !draggedFavorite) {
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
  const favoriteDropItem = event.target.closest(
    "[data-favorite-item][data-favorite-category]"
  );
  const favoriteDropLane = event.target.closest("[data-drop-fav-category]");

  if (draggedFavoriteId && favoriteDropItem) {
    event.preventDefault();
    const favId =
      event.dataTransfer.getData("text/plain") || draggedFavoriteId;
    const targetFavId = String(favoriteDropItem.dataset.favoriteItem);
    const targetCategoryId = String(favoriteDropItem.dataset.favoriteCategory);

    clearFavoriteDropStates();
    clearFavoriteItemDropStates();

    if (!favId || !targetFavId || !targetCategoryId || favId === targetFavId) {
      return;
    }

    try {
      await moveFavoriteToCategory(favId, targetCategoryId, {
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

  if (draggedFavoriteId && favoriteDropLane) {
    event.preventDefault();
    const favId =
      event.dataTransfer.getData("text/plain") || draggedFavoriteId;
    const targetCategoryId = String(favoriteDropLane.dataset.dropFavCategory);

    clearFavoriteDropStates();
    clearFavoriteItemDropStates();

    if (!favId || !targetCategoryId) return;

    try {
      await moveFavoriteToCategory(favId, targetCategoryId);
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
  event.preventDefault();

  const selectedId = Number(deleteFavId.value);
  const favToDelete = favorites.find((item) => Number(item.id_favs) === selectedId);

  if (!favToDelete) {
    setMessage(deleteFavMessage, "Choisissez un favori à supprimer.", "error");
    return;
  }

  const isConfirmed = window.confirm(
    `Confirmer la suppression du favori "${favToDelete.title_favs}" ?`
  );

  if (!isConfirmed) return;

  try {
    const data = await fetchWithAuth(`/favs/${selectedId}`, {
      method: "DELETE",
    });

    favorites = favorites.filter((item) => Number(item.id_favs) !== selectedId);
    if (String(selectedEditFavId) === String(selectedId)) {
      selectedEditFavId = "";
    }
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

refreshUI();
loadPageData();
