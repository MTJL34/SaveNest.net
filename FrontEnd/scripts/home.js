// Ce script charge les categories et les favoris affiches sur la page d'accueil.
import { setHeader, setFooter } from "../scripts/layout.js";
import {
  getApiBaseUrl,
  getAppBaseUrl,
  getServerUnavailableMessage,
} from "./apiConfig.js";
import { enhancePasswordFields } from "./passwordVisibility.js";

const API_BASE_URL = getApiBaseUrl();
const APP_BASE_URL = getAppBaseUrl();
const LOGIN_PAGE_URL = new URL("html/connexion.html", APP_BASE_URL).href;
const LOGIN_REASON_QUERY_KEY = "reason";
const AUTH_REQUIRED_REASON = "auth-required";
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";
const CATEGORY_ORDER_STORAGE_KEY = "savenest_category_order";
const EGG_BUTTON_ICON_SRC = "../img/egg-fullwhite.png";
const PROTECT_BUTTON_ICON_SRC = "../img/logo1eggwhite.png";

// La page d'accueil est privee : si le token manque ou est expire, on sort tout de suite.
if (!hasUsableAuthToken()) {
  clearStoredAuthSession();
  redirectToLogin();
  throw new Error("Authentification requise pour afficher la page d'accueil.");
}

setHeader();
setFooter();

const cardsContainerEl = document.querySelector(".js_content");

// Etat de la page.
// categories et favs viennent de l'API, les autres variables viennent du navigateur.
let categories = [];
let favs = [];
let unlockedCategoryIds = [];
let unlockErrorsByCategoryId = {};
let selectedCategoryId = "";

const bannerHtml = `
  <p>Vos contenus préférés, bien au chaud dans leur nid.</p>
  <button class="organiser-btn">🪹 <a href="../html/fav.html">Organiser mon nid</a></button>
`;

document.querySelector(".js_banner").innerHTML = bannerHtml;

// Les fonctions suivantes lisent et ecrivent les donnees locales du navigateur.
// Par securite, les categories deverrouillees ne sont pas stockees :
// unlockedCategoryIds reste en memoire uniquement pendant la vie de cette page.
function loadCategoryOrder() {
  // L'ordre des categories est personnel et garde en local.
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
  // Sauvegarde l'ordre calcule pour le retrouver au prochain chargement.
  localStorage.setItem(
    CATEGORY_ORDER_STORAGE_KEY,
    JSON.stringify(categoryOrderIds)
  );
}

function getCategoryOrderIndex(orderIds, categoryId) {
  // Si une categorie n'est pas encore dans l'ordre stocke,
  // on la place naturellement a la fin.
  const normalizedCategoryId = String(categoryId);

  for (let index = 0; index < orderIds.length; index += 1) {
    if (orderIds[index] === normalizedCategoryId) {
      return index;
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortCategoriesByStoredOrder(list) {
  // Cette fonction garde un ordre stable :
  // 1. ordre deja connu en local,
  // 2. nouvelles categories ajoutees a la fin,
  // 3. tri par ID en cas d'egalite.
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
  // Le token JWT est la preuve de connexion envoyee au backend.
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function clearStoredAuthSession() {
  // Nettoyage minimal si le token n'est plus utilisable.
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

function decodeJwtPayload(token) {
  // Decode seulement la partie payload du JWT pour lire son expiration.
  // On ne valide pas la signature ici : le backend le fera a chaque requete.
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const decodedPayload = window.atob(paddedBase64);

    return JSON.parse(decodedPayload);
  } catch (error) {
    return null;
  }
}

function hasUsableAuthToken() {
  // Evite de charger la page avec un token absent ou deja expire.
  const token = getAuthToken();

  if (!token) {
    return false;
  }

  const decodedPayload = decodeJwtPayload(token);

  if (!decodedPayload || typeof decodedPayload.exp !== "number") {
    return false;
  }

  return decodedPayload.exp * 1000 > Date.now();
}

function redirectToLogin() {
  // On conserve la raison dans l'URL pour que la page de connexion puisse afficher
  // un message adapte.
  const destinationUrl = new URL(LOGIN_PAGE_URL);
  destinationUrl.searchParams.set(LOGIN_REASON_QUERY_KEY, AUTH_REQUIRED_REASON);
  destinationUrl.hash = "#login";
  window.location.assign(destinationUrl.href);
}

async function parseJsonSafely(response) {
  // Certaines reponses peuvent etre vides.
  // Cette fonction evite qu'un await response.json() fasse planter toute la page.
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function showHomeMessage(message) {
  // Affiche un message simple dans la zone des cartes.
  cardsContainerEl.innerHTML = `<p class="empty-item">${message}</p>`;
}

function getHomeErrorMessage(error) {
  // Transforme les erreurs techniques en messages comprehensibles.
  if (error && error.name === "TypeError") {
    return getServerUnavailableMessage();
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

  // On copie les headers existants pour ne pas ecraser Content-Type.
  if (options.headers && typeof options.headers === "object") {
    const headerNames = Object.keys(options.headers);

    for (let index = 0; index < headerNames.length; index += 1) {
      const headerName = headerNames[index];
      headers[headerName] = options.headers[headerName];
    }
  }

  headers.Authorization = `Bearer ${token}`;

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers,
      body: options.body,
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

async function loadHomeData() {
  // Charge les deux ressources necessaires a l'accueil.
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

    if (
      selectedCategoryId &&
      !categories.some((item) => String(item.id_category) === String(selectedCategoryId))
    ) {
      selectedCategoryId = "";
    }

    renderHomeCards();
  } catch (error) {
    console.error("Erreur lors du chargement de la page d'accueil :", error);
    showHomeMessage(getHomeErrorMessage(error));
  }
}

async function requestCategoryUnlock(categoryId, password) {
  // Appel API dedie : le backend verifie le mot de passe.
  return fetchWithAuth(`/categories/${categoryId}/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
}

function getUnlockErrorMessage(error) {
  // Uniformise les messages d'erreur venant du backend.
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
  // Le backend peut renvoyer 0/1, mais on convertit vers des mots plus lisibles.
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
  // Simple lecture de l'etat local de la page.
  return unlockedCategoryIds.includes(String(categoryId));
}

function getFavicon(url) {
  // Google fournit une petite icone a partir du domaine d'une URL.
  try {
    const parsedUrl = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
  } catch (error) {
    console.warn("URL invalide pour favicon :", url);
    return "https://www.google.com/s2/favicons?domain=example.com&sz=64";
  }
}

function getFavItemMarkup(fav) {
  // Genere le HTML d'un favori dans une carte.
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

function getButtonMarkup(label, iconSrc = EGG_BUTTON_ICON_SRC) {
  return `
    <img
      src="${iconSrc}"
      alt=""
      aria-hidden="true"
      class="hatch-btn-icon"
    >
    <span>${label}</span>
  `;
}

function getFavsOfCategory(categoryId) {
  // Filtre manuel pour garder une lecture facile.
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
  // Retire uniquement l'erreur de la categorie qui vient d'etre deverrouillee.
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

function scrollToSelectedCategoryView() {
  const selectedViewEl = document.querySelector(".js_selectedCategoryView");

  if (!selectedViewEl) {
    return;
  }

  selectedViewEl.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function renderHomeCards() {
  // Ici, on reconstruit toutes les cartes HTML a partir des categories chargees.
  if (categories.length === 0) {
    showHomeMessage("Aucune catégorie à afficher pour le moment.");
    return;
  }

  const selectedCategory = selectedCategoryId
    ? findCategoryById(selectedCategoryId)
    : null;

  let categoriesHtml = "";

  for (let index = 0; index < categories.length; index += 1) {
    const currentCategory = categories[index];
    const categoryId = String(currentCategory.id_category);
    const privacy = getCategoryPrivacy(currentCategory);
    const isPrivate = privacy === "Private";
    const unlocked = !isPrivate || isCategoryUnlocked(categoryId);
    const lockLabel = isPrivate ? (unlocked ? "🔓" : "🔒") : "";
    const isSelected =
      selectedCategory && categoryId === String(selectedCategory.id_category);
    const toggleButtonLabel = isSelected
      ? "Protéger le nid"
      : "Faire éclore l'œuf";
    const unlockError = isPrivate ? unlockErrorsByCategoryId[categoryId] || "" : "";
    const statusText = isPrivate && !unlocked ? unlockError : "";
    const statusRole = statusText ? ' role="alert"' : "";
    const statusClassName = `category-card-status${
      statusText ? " category-card-status--error" : ""
    }`;
    const cardBody = `
      <div class="category-card-preview">
        <p class="category-card-preview-text">Ouvrir les favoris</p>
        <p class="${statusClassName}"${statusRole}>${statusText || "&nbsp;"}</p>
        <button type="button" class="hatch-btn" data-open-category="${categoryId}">
          ${getButtonMarkup(
            toggleButtonLabel,
            isSelected ? PROTECT_BUTTON_ICON_SRC : EGG_BUTTON_ICON_SRC
          )}
        </button>
      </div>
    `;

    const titleLockMarkup = `
      <span
        class="title-lock${isPrivate ? "" : " title-lock--placeholder"}"
        aria-label="${isPrivate ? "État de protection" : ""}"
        aria-hidden="${isPrivate ? "false" : "true"}"
      >${isPrivate ? lockLabel : "•"}</span>
    `;

    categoriesHtml += `
      <div
        class="card home-category-card ${isPrivate ? "private-card" : "public-card"}${isSelected ? " is-selected" : ""}"
      >
        <h3>
          <span>${currentCategory.category_name}</span>
          ${titleLockMarkup}
        </h3>
        ${cardBody}
      </div>
    `;
  }

  let selectedBody = "";
  if (selectedCategory) {
    const selectedCategoryIdSafe = String(selectedCategory.id_category);
    const selectedPrivacy = getCategoryPrivacy(selectedCategory);
    const selectedIsPrivate = selectedPrivacy === "Private";
    const selectedUnlocked =
      !selectedIsPrivate || isCategoryUnlocked(selectedCategoryIdSafe);
    const selectedLockLabel = selectedIsPrivate
      ? selectedUnlocked
        ? "🔓"
        : "🔒"
      : "";
    const selectedFavs = getFavsOfCategory(selectedCategoryIdSafe);

    if (selectedIsPrivate && !selectedUnlocked) {
      const unlockError = unlockErrorsByCategoryId[selectedCategoryIdSafe] || "";

      selectedBody = `
        <div class="private-locked">
          <p>Contenu protégé par mot de passe</p>
          ${unlockError ? `<p class="unlock-error" role="alert">${unlockError}</p>` : ""}
          <button type="button" class="hatch-btn" data-open-category="${selectedCategoryIdSafe}">
            ${getButtonMarkup("Faire éclore l'œuf")}
          </button>
        </div>
      `;
    } else {
      let favsHtml = "";

      if (selectedFavs.length === 0) {
        favsHtml = `<li class="empty-item">Aucun favori pour cette catégorie.</li>`;
      } else {
        for (let favIndex = 0; favIndex < selectedFavs.length; favIndex += 1) {
          favsHtml += getFavItemMarkup(selectedFavs[favIndex]);
        }
      }

      let privateActions = "";

      if (selectedIsPrivate) {
        privateActions = `
          <div class="private-actions">
            <button type="button" class="protect-btn" data-lock-category="${selectedCategoryIdSafe}">
              ${getButtonMarkup("Protéger le nid", PROTECT_BUTTON_ICON_SRC)}
            </button>
          </div>
        `;
      }

      const selectedTitleLockMarkup = `
        <span
          class="title-lock${selectedIsPrivate ? "" : " title-lock--placeholder"}"
          aria-label="${selectedIsPrivate ? "État de protection" : ""}"
          aria-hidden="${selectedIsPrivate ? "false" : "true"}"
        >${selectedIsPrivate ? selectedLockLabel : "•"}</span>
      `;

      selectedBody = `
        <div class="card ${selectedIsPrivate ? "private-card" : "public-card"}">
          <h3>
            <span>${selectedCategory.category_name}</span>
            ${selectedTitleLockMarkup}
          </h3>
          <ul>${favsHtml}</ul>
          ${privateActions}
        </div>
      `;
    }
  } else {
    selectedBody = `
      <div class="category-card-preview category-card-preview--empty">
        <p>Choisissez une catégorie puis cliquez sur "Faire éclore l'œuf" pour afficher ses favoris.</p>
      </div>
    `;
  }

  cardsContainerEl.innerHTML = `
    <section class="home-workspace">
      <section class="home-categories-grid">
        ${categoriesHtml}
      </section>
      <section class="selected-category-view js_selectedCategoryView">
        <h3 class="selected-category-title">
          ${selectedCategory ? `Favoris de ${selectedCategory.category_name}` : "Favoris de la catégorie"}
        </h3>
        ${selectedBody}
      </section>
    </section>
  `;
}

function findCategoryById(categoryId) {
  // Recherche simple dans le tableau categories.
  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];

    if (String(category.id_category) === String(categoryId)) {
      return category;
    }
  }

  return null;
}

function createUnlockModal(categoryName) {
  // Cree la modale en JS car elle n'apparait que lorsqu'on en a besoin.
  const modalEl = document.createElement("div");
  modalEl.className = "unlock-modal";
  modalEl.innerHTML = `
    <div class="unlock-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="unlockModalTitle">
      <button type="button" class="unlock-modal__close" data-unlock-cancel aria-label="Fermer">×</button>
      <p class="unlock-modal__eyebrow">Catégorie protégée</p>
      <h2 id="unlockModalTitle">Mot de passe requis</h2>
      <p class="unlock-modal__text"></p>
      <form class="unlock-modal__form">
        <label for="unlockCategoryPassword">Mot de passe</label>
        <input id="unlockCategoryPassword" type="password" autocomplete="current-password" required>
        <div class="unlock-modal__actions">
          <button type="button" class="unlock-modal__cancel" data-unlock-cancel>Annuler</button>
          <button type="submit" class="unlock-modal__submit">Déverrouiller</button>
        </div>
      </form>
    </div>
  `;

  const textEl = modalEl.querySelector(".unlock-modal__text");

  if (textEl) {
    textEl.textContent = `Entrez le mot de passe de "${categoryName}" pour voir ses favoris.`;
  }

  return modalEl;
}

function askCategoryPassword(categoryName) {
  // Promise qui se resout avec :
  // - le mot de passe saisi,
  // - null si l'utilisateur annule.
  return new Promise((resolve) => {
    const modalEl = createUnlockModal(categoryName);
    const formEl = modalEl.querySelector(".unlock-modal__form");
    const passwordInputEl = modalEl.querySelector("#unlockCategoryPassword");
    const cancelButtons = Array.from(
      modalEl.querySelectorAll("[data-unlock-cancel]")
    );

    function closeModal(value) {
      // On retire l'ecouteur clavier pour eviter les ecouteurs fantomes.
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

cardsContainerEl.addEventListener("click", async function handleCardsClick(event) {
  // Un seul ecouteur suffit pour gerer tous les boutons ajoutes dynamiquement.
  const openCategoryBtn = event.target.closest("[data-open-category]");

  if (openCategoryBtn) {
    const categoryId = String(openCategoryBtn.dataset.openCategory || "");
    const category = findCategoryById(categoryId);

    if (!category) {
      return;
    }

    if (selectedCategoryId === categoryId) {
      selectedCategoryId = "";
      renderHomeCards();
      return;
    }

    const privacy = getCategoryPrivacy(category);
    const isPrivate = privacy === "Private";
    const isUnlocked = !isPrivate || isCategoryUnlocked(categoryId);

    if (isPrivate && !isUnlocked) {
      const userInput = await askCategoryPassword(category.category_name);

      if (userInput === null) {
        return;
      }

      try {
        await requestCategoryUnlock(categoryId, userInput);
        removeUnlockError(categoryId);

        if (!unlockedCategoryIds.includes(categoryId)) {
          unlockedCategoryIds.push(categoryId);
        }
      } catch (error) {
        unlockErrorsByCategoryId[categoryId] = getUnlockErrorMessage(error);
        renderHomeCards();
        return;
      }
    }

    selectedCategoryId = categoryId;
    renderHomeCards();
    scrollToSelectedCategoryView();
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
  renderHomeCards();
  scrollToSelectedCategoryView();
});

loadHomeData();
