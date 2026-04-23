import { setHeader, setFooter } from "../scripts/layout.js";

setHeader();
setFooter();

const API_BASE_URL = "http://localhost:3000/api";
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const UNLOCKED_CATEGORIES_STORAGE_KEY = "savenest_unlocked_categories";
const CATEGORY_ORDER_STORAGE_KEY = "savenest_category_order";
const cardsContainerEl = document.querySelector(".js_content");
let categories = [];
let favs = [];
let unlockErrorsByCategoryId = new Map();

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

let unlockedCategoryIds = loadUnlockedCategories();

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

function persistCategoryOrder(categoryOrderIds) {
  localStorage.setItem(
    CATEGORY_ORDER_STORAGE_KEY,
    JSON.stringify(categoryOrderIds)
  );
}

function sortCategoriesByStoredOrder(list) {
  const categoryOrderIds = loadCategoryOrder();
  const currentIds = list.map((category) => String(category.id_category));
  const filteredOrder = categoryOrderIds.filter((id) => currentIds.includes(id));
  const missingIds = currentIds.filter((id) => !filteredOrder.includes(id));
  const nextOrder = [...filteredOrder, ...missingIds];

  if (nextOrder.join("|") !== categoryOrderIds.join("|")) {
    persistCategoryOrder(nextOrder);
  }

  const orderMap = new Map(
    nextOrder.map((id, index) => [String(id), index])
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

function showHomeMessage(message) {
  cardsContainerEl.innerHTML = `<p class="empty-item">${message}</p>`;
}

function getHomeErrorMessage(error) {
  if (error?.name === "TypeError") {
    return "Le serveur est injoignable. Vérifiez que le backend tourne bien sur le port 3000.";
  }

  return error?.message || "Impossible de charger les favoris.";
}

async function fetchWithAuth(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    redirectToLogin();
    throw new Error("Connectez-vous pour accéder à vos favoris.");
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

async function loadHomeData() {
  showHomeMessage("Chargement de vos favoris...");

  try {
    const [categoriesData, favsData] = await Promise.all([
      fetchWithAuth("/categories"),
      fetchWithAuth("/favs"),
    ]);

    categories = Array.isArray(categoriesData) ? sortCategoriesByStoredOrder(categoriesData) : [];
    favs = Array.isArray(favsData) ? favsData : [];
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
  const message = error?.message || "";

  if (
    message === "Mot de passe incorrect." ||
    message === "Mauvais mot de passe."
  ) {
    return "Mauvais mot de passe.";
  }

  return message || "Impossible de déverrouiller cette catégorie.";
}

function getCategoryPrivacy(item) {
  const confidentiality = item.confidentiality;
  const normalizedConfidentiality = String(confidentiality || "").toLowerCase();

  if (confidentiality === 1 || confidentiality === "1" || confidentiality === true) {
    return "Private";
  }

  if (confidentiality === 0 || confidentiality === "0" || confidentiality === false) {
    return "Public";
  }

  if (normalizedConfidentiality === "private") return "Private";
  if (normalizedConfidentiality === "public") return "Public";
  return "Public";
}

function isCategoryUnlocked(categoryId) {
  return unlockedCategoryIds.has(String(categoryId));
}

const bannerHtml = `
  <p>Vos contenus préférés, bien au chaud dans leur nid.</p>
  <button class="organiser-btn">🪹 <a href="../html/fav.html">Organiser mon nid</a></button>
`;

document.querySelector(".js_banner").innerHTML = bannerHtml;

function getFavicon(url) {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (error) {
    console.warn("URL invalide pour favicon :", url);
    return "https://www.google.com/s2/favicons?domain=example.com&sz=64";
  }
}

function getFavItemMarkup(fav) {
  const faviconUrl = getFavicon(fav.url_favs);
  const hasUrl = typeof fav.url_favs === "string" && fav.url_favs.trim() !== "";

  return `
    <li class="fav-item">
      <img
        src="${faviconUrl}"
        alt="favicon de ${fav.title_favs}"
        class="fav-icon"
      >
      ${
        hasUrl
          ? `<a href="${fav.url_favs}" target="_blank">${fav.title_favs}</a>`
          : `<span>${fav.title_favs}</span>`
      }
    </li>
  `;
}

function renderHomeCards() {
  if (categories.length === 0) {
    showHomeMessage("Aucune catégorie à afficher pour le moment.");
    return;
  }

  let html = ``;

  categories.forEach((currentCategory) => {
    const categoryId = String(currentCategory.id_category);
    const privacy = getCategoryPrivacy(currentCategory);
    const isPrivate = privacy === "Private";
    const unlocked = !isPrivate || isCategoryUnlocked(categoryId);
    const lockEmoji = isPrivate ? (unlocked ? "🔓" : "🔒") : "";

    const favsOfCategory = favs.filter((fav) => String(fav.id_category) === categoryId);

    let cardBody = "";

    if (isPrivate && !unlocked) {
      const unlockError = unlockErrorsByCategoryId.get(categoryId) || "";

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
      const favsHtml =
        favsOfCategory.length > 0
          ? favsOfCategory.map(getFavItemMarkup).join("")
          : `<li class="empty-item">Aucun favori pour cette catégorie.</li>`;

      cardBody = `
        <ul>${favsHtml}</ul>
        ${
          isPrivate
            ? `<div class="private-actions">
                <button type="button" class="protect-btn" data-lock-category="${categoryId}">
                  🪺 Protéger le nid
                </button>
              </div>`
            : ""
        }
      `;
    }

    html += `
      <div class="card ${isPrivate ? "private-card" : "public-card"}">
        <h3>
          <span>${currentCategory.category_name}</span>
          ${isPrivate ? `<span class="title-lock" aria-label="État de protection">${lockEmoji}</span>` : ""}
        </h3>
        ${cardBody}
      </div>
    `;
  });

  cardsContainerEl.innerHTML = html;
}

cardsContainerEl.addEventListener("click", async (event) => {
  const unlockBtn = event.target.closest("[data-unlock-category]");
  if (unlockBtn) {
    const categoryId = String(unlockBtn.dataset.unlockCategory);
    const selectedCategory = categories.find(
      (item) => String(item.id_category) === categoryId
    );

    if (!selectedCategory) return;

    const userInput = window.prompt(
      `Mot de passe de la catégorie "${selectedCategory.category_name}" :`
    );

    if (userInput === null) return;

    try {
      await requestCategoryUnlock(categoryId, userInput);
    } catch (error) {
      unlockErrorsByCategoryId.set(categoryId, getUnlockErrorMessage(error));
      renderHomeCards();
      return;
    }

    unlockErrorsByCategoryId.delete(categoryId);
    unlockedCategoryIds.add(categoryId);
    persistUnlockedCategories();
    renderHomeCards();
    return;
  }

  const lockBtn = event.target.closest("[data-lock-category]");
  if (!lockBtn) return;

  const categoryId = String(lockBtn.dataset.lockCategory);
  unlockedCategoryIds.delete(categoryId);
  persistUnlockedCategories();
  renderHomeCards();
});

loadHomeData();
