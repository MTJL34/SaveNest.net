// Ce script charge les categories et les favoris affiches sur la page d'accueil.
import { setHeader, setFooter } from "../scripts/layout.js";

setHeader();
setFooter();

const API_BASE_URL = "http://localhost:3000/api";
const APP_BASE_URL = new URL("/", API_BASE_URL).href;
const LOGIN_PAGE_URL = new URL("html/connexion.html", APP_BASE_URL).href;
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const UNLOCKED_CATEGORIES_STORAGE_KEY = "savenest_unlocked_categories";
const CATEGORY_ORDER_STORAGE_KEY = "savenest_category_order";

const cardsContainerEl = document.querySelector(".js_content");

let categories = [];
let favs = [];
let unlockedCategoryIds = loadUnlockedCategories();
let unlockErrorsByCategoryId = {};

const bannerHtml = `
  <p>Vos contenus préférés, bien au chaud dans leur nid.</p>
  <button class="organiser-btn">🪹 <a href="../html/fav.html">Organiser mon nid</a></button>
`;

document.querySelector(".js_banner").innerHTML = bannerHtml;

// Les fonctions suivantes lisent et ecrivent les donnees locales du navigateur.
function loadUnlockedCategories() {
  try {
    const rawValue = sessionStorage.getItem(UNLOCKED_CATEGORIES_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const unlockedIds = [];

    for (let index = 0; index < parsedValue.length; index += 1) {
      const categoryId = String(parsedValue[index]);

      if (!unlockedIds.includes(categoryId)) {
        unlockedIds.push(categoryId);
      }
    }

    return unlockedIds;
  } catch (error) {
    return [];
  }
}

function persistUnlockedCategories() {
  sessionStorage.setItem(
    UNLOCKED_CATEGORIES_STORAGE_KEY,
    JSON.stringify(unlockedCategoryIds)
  );
}

function loadCategoryOrder() {
  try {
    const rawValue = localStorage.getItem(CATEGORY_ORDER_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const orderedIds = [];

    for (let index = 0; index < parsedValue.length; index += 1) {
      orderedIds.push(String(parsedValue[index]));
    }

    return orderedIds;
  } catch (error) {
    return [];
  }
}

function persistCategoryOrder(categoryOrderIds) {
  localStorage.setItem(
    CATEGORY_ORDER_STORAGE_KEY,
    JSON.stringify(categoryOrderIds)
  );
}

function getCategoryOrderIndex(orderIds, categoryId) {
  const normalizedCategoryId = String(categoryId);

  for (let index = 0; index < orderIds.length; index += 1) {
    if (orderIds[index] === normalizedCategoryId) {
      return index;
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortCategoriesByStoredOrder(list) {
  const storedOrderIds = loadCategoryOrder();
  const currentIds = [];

  for (let index = 0; index < list.length; index += 1) {
    currentIds.push(String(list[index].id_category));
  }

  const filteredOrder = [];

  for (let index = 0; index < storedOrderIds.length; index += 1) {
    const storedId = storedOrderIds[index];

    if (currentIds.includes(storedId) && !filteredOrder.includes(storedId)) {
      filteredOrder.push(storedId);
    }
  }

  const nextOrder = filteredOrder.slice();

  for (let index = 0; index < currentIds.length; index += 1) {
    const currentId = currentIds[index];

    if (!nextOrder.includes(currentId)) {
      nextOrder.push(currentId);
    }
  }

  if (nextOrder.join("|") !== storedOrderIds.join("|")) {
    persistCategoryOrder(nextOrder);
  }

  const sortedCategories = list.slice();

  sortedCategories.sort(function compareCategories(left, right) {
    const leftOrder = getCategoryOrderIndex(nextOrder, left.id_category);
    const rightOrder = getCategoryOrderIndex(nextOrder, right.id_category);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return Number(left.id_category) - Number(right.id_category);
  });

  return sortedCategories;
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function redirectToLogin() {
  const destinationUrl = new URL(LOGIN_PAGE_URL);
  destinationUrl.hash = "#login";
  window.location.assign(destinationUrl.href);
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function showHomeMessage(message) {
  cardsContainerEl.innerHTML = `<p class="empty-item">${message}</p>`;
}

function getHomeErrorMessage(error) {
  if (error && error.name === "TypeError") {
    return "Le serveur est injoignable. Vérifiez que le backend tourne bien sur le port 3000.";
  }

  if (error && error.message) {
    return error.message;
  }

  return "Impossible de charger les favoris.";
}

async function fetchWithAuth(path, options = {}) {
  // Cette fonction ajoute automatiquement le token a chaque appel API.
  const token = getAuthToken();

  if (!token) {
    redirectToLogin();
    throw new Error("Connectez-vous pour accéder à vos favoris.");
  }

  const headers = {};

  if (options.headers && typeof options.headers === "object") {
    const headerNames = Object.keys(options.headers);

    for (let index = 0; index < headerNames.length; index += 1) {
      const headerName = headerNames[index];
      headers[headerName] = options.headers[headerName];
    }
  }

  headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method,
    headers,
    body: options.body,
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

async function loadHomeData() {
  showHomeMessage("Chargement de vos favoris...");

  try {
    const categoriesData = await fetchWithAuth("/categories");
    const favsData = await fetchWithAuth("/favs");

    if (Array.isArray(categoriesData)) {
      categories = sortCategoriesByStoredOrder(categoriesData);
    } else {
      categories = [];
    }

    if (Array.isArray(favsData)) {
      favs = favsData;
    } else {
      favs = [];
    }

    renderHomeCards();
  } catch (error) {
    console.error("Erreur lors du chargement de la page d'accueil :", error);
    showHomeMessage(getHomeErrorMessage(error));
  }
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

function getUnlockErrorMessage(error) {
  let message = "";

  if (error && typeof error.message === "string") {
    message = error.message;
  }

  if (
    message === "Mot de passe incorrect." ||
    message === "Mauvais mot de passe."
  ) {
    return "Mauvais mot de passe.";
  }

  if (message) {
    return message;
  }

  return "Impossible de déverrouiller cette catégorie.";
}

function getCategoryPrivacy(category) {
  const confidentiality = category.confidentiality;
  const normalizedConfidentiality = String(confidentiality || "").toLowerCase();

  if (confidentiality === 1 || confidentiality === "1" || confidentiality === true) {
    return "Private";
  }

  if (confidentiality === 0 || confidentiality === "0" || confidentiality === false) {
    return "Public";
  }

  if (normalizedConfidentiality === "private") {
    return "Private";
  }

  return "Public";
}

function isCategoryUnlocked(categoryId) {
  return unlockedCategoryIds.includes(String(categoryId));
}

function getFavicon(url) {
  try {
    const parsedUrl = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
  } catch (error) {
    console.warn("URL invalide pour favicon :", url);
    return "https://www.google.com/s2/favicons?domain=example.com&sz=64";
  }
}

function getFavItemMarkup(fav) {
  const faviconUrl = getFavicon(fav.url_favs);
  const hasUrl =
    typeof fav.url_favs === "string" && fav.url_favs.trim() !== "";

  if (hasUrl) {
    return `
      <li class="fav-item">
        <img
          src="${faviconUrl}"
          alt="favicon de ${fav.title_favs}"
          class="fav-icon"
        >
        <a href="${fav.url_favs}" target="_blank">${fav.title_favs}</a>
      </li>
    `;
  }

  return `
    <li class="fav-item">
      <img
        src="${faviconUrl}"
        alt="favicon de ${fav.title_favs}"
        class="fav-icon"
      >
      <span>${fav.title_favs}</span>
    </li>
  `;
}

function getFavsOfCategory(categoryId) {
  const categoryFavs = [];

  for (let index = 0; index < favs.length; index += 1) {
    const fav = favs[index];

    if (String(fav.id_category) === String(categoryId)) {
      categoryFavs.push(fav);
    }
  }

  return categoryFavs;
}

function removeUnlockError(categoryId) {
  const nextErrors = {};
  const errorKeys = Object.keys(unlockErrorsByCategoryId);

  for (let index = 0; index < errorKeys.length; index += 1) {
    const key = errorKeys[index];

    if (key !== String(categoryId)) {
      nextErrors[key] = unlockErrorsByCategoryId[key];
    }
  }

  unlockErrorsByCategoryId = nextErrors;
}

function renderHomeCards() {
  // Ici, on reconstruit toutes les cartes HTML a partir des categories chargees.
  if (categories.length === 0) {
    showHomeMessage("Aucune catégorie à afficher pour le moment.");
    return;
  }

  let html = "";

  for (let index = 0; index < categories.length; index += 1) {
    const currentCategory = categories[index];
    const categoryId = String(currentCategory.id_category);
    const privacy = getCategoryPrivacy(currentCategory);
    const isPrivate = privacy === "Private";
    const unlocked = !isPrivate || isCategoryUnlocked(categoryId);
    const lockLabel = isPrivate ? (unlocked ? "🔓" : "🔒") : "";
    const favsOfCategory = getFavsOfCategory(categoryId);
    let cardBody = "";

    if (isPrivate && !unlocked) {
      const unlockError = unlockErrorsByCategoryId[categoryId] || "";

      cardBody = `
        <div class="private-locked">
          <p>Contenu protégé par mot de passe</p>
          ${unlockError ? `<p class="unlock-error" role="alert">${unlockError}</p>` : ""}
          <button type="button" class="hatch-btn" data-unlock-category="${categoryId}">
            🥚 Faire éclore l'œuf
          </button>
        </div>
      `;
    } else {
      let favsHtml = "";

      if (favsOfCategory.length === 0) {
        favsHtml = `<li class="empty-item">Aucun favori pour cette catégorie.</li>`;
      } else {
        for (let favIndex = 0; favIndex < favsOfCategory.length; favIndex += 1) {
          favsHtml += getFavItemMarkup(favsOfCategory[favIndex]);
        }
      }

      let privateActions = "";

      if (isPrivate) {
        privateActions = `
          <div class="private-actions">
            <button type="button" class="protect-btn" data-lock-category="${categoryId}">
              🪺 Protéger le nid
            </button>
          </div>
        `;
      }

      cardBody = `
        <ul>${favsHtml}</ul>
        ${privateActions}
      `;
    }

    html += `
      <div class="card ${isPrivate ? "private-card" : "public-card"}">
        <h3>
          <span>${currentCategory.category_name}</span>
          ${isPrivate ? `<span class="title-lock" aria-label="État de protection">${lockLabel}</span>` : ""}
        </h3>
        ${cardBody}
      </div>
    `;
  }

  cardsContainerEl.innerHTML = html;
}

function findCategoryById(categoryId) {
  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];

    if (String(category.id_category) === String(categoryId)) {
      return category;
    }
  }

  return null;
}

cardsContainerEl.addEventListener("click", async function handleCardsClick(event) {
  // Un seul ecouteur suffit pour gerer tous les boutons ajoutes dynamiquement.
  const unlockBtn = event.target.closest("[data-unlock-category]");

  if (unlockBtn) {
    const categoryId = String(unlockBtn.dataset.unlockCategory);
    const selectedCategory = findCategoryById(categoryId);

    if (!selectedCategory) {
      return;
    }

    const userInput = window.prompt(
      `Mot de passe de la catégorie "${selectedCategory.category_name}" :`
    );

    if (userInput === null) {
      return;
    }

    try {
      await requestCategoryUnlock(categoryId, userInput);
      removeUnlockError(categoryId);

      if (!unlockedCategoryIds.includes(categoryId)) {
        unlockedCategoryIds.push(categoryId);
      }

      persistUnlockedCategories();
      renderHomeCards();
    } catch (error) {
      unlockErrorsByCategoryId[categoryId] = getUnlockErrorMessage(error);
      renderHomeCards();
    }

    return;
  }

  const lockBtn = event.target.closest("[data-lock-category]");

  if (!lockBtn) {
    return;
  }

  const categoryId = String(lockBtn.dataset.lockCategory);
  const nextUnlockedCategoryIds = [];

  for (let index = 0; index < unlockedCategoryIds.length; index += 1) {
    if (unlockedCategoryIds[index] !== categoryId) {
      nextUnlockedCategoryIds.push(unlockedCategoryIds[index]);
    }
  }

  unlockedCategoryIds = nextUnlockedCategoryIds;
  persistUnlockedCategories();
  renderHomeCards();
});

loadHomeData();
