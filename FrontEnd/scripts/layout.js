// Ce fichier construit le header, le footer et la gestion des langues cote front.
import { getApiBaseUrl } from "./apiConfig.js";

export const USER_LANGUAGES_STORAGE_KEY = "savenest_user_languages";
export const ACTIVE_LANGUAGE_STORAGE_KEY = "savenest_active_language";

const API_BASE_URL = getApiBaseUrl();
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";
const DEFAULT_CATEGORY_STORAGE_KEY = "savenest_default_category";
const UNLOCKED_CATEGORIES_STORAGE_KEY = "savenest_unlocked_categories";
const AUTH_TRANSFER_TOKEN_QUERY_KEY = "sn_token";
const AUTH_TRANSFER_USER_QUERY_KEY = "sn_user";
const LOGIN_REASON_QUERY_KEY = "reason";
const LOGGED_OUT_REASON = "logged-out";
const HEADER_EGG_OPEN_SRC = "../img/egg-1.gif";
const HEADER_EGG_CLOSED_SRC = "../img/egg-full.png";

let isHeaderEggOpen = true;

// Cette configuration centralise les libelles visibles dans le header.
const LANGUAGE_CONFIG = {
  French: {
    code: "fr",
    label: "Français",
    flag: "🇫🇷",
    header: {
      home: "Accueil",
      favorites: "Favoris",
      categories: "Catégories",
      about: "À propos",
      login: "Connexion",
      logout: "Déconnexion",
      language: "Langue",
    },
  },
  English: {
    code: "en",
    label: "English",
    flag: "🇬🇧",
    header: {
      home: "Home",
      favorites: "Favorites",
      categories: "Categories",
      about: "About",
      login: "Login",
      logout: "Logout",
      language: "Language",
    },
  },
  Spanish: {
    code: "es",
    label: "Español",
    flag: "🇪🇸",
    header: {
      home: "Inicio",
      favorites: "Favoritos",
      categories: "Categorías",
      about: "Acerca de",
      login: "Conexión",
      logout: "Desconexión",
      language: "Idioma",
    },
  },
  German: {
    code: "de",
    label: "Deutsch",
    flag: "🇩🇪",
    header: {
      home: "Startseite",
      favorites: "Favoriten",
      categories: "Kategorien",
      about: "Über uns",
      login: "Anmeldung",
      logout: "Abmelden",
      language: "Sprache",
    },
  },
  Japanese: {
    code: "ja",
    label: "日本語",
    flag: "🇯🇵",
    header: {
      home: "ホーム",
      favorites: "お気に入り",
      categories: "カテゴリ",
      about: "概要",
      login: "ログイン",
      logout: "ログアウト",
      language: "言語",
    },
  },
};

export const footerMarkup = `
  <a href="../html/index.html" class="footer-logo" aria-label="Retour à l'accueil">
    <img src="../img/logo.png" alt="SaveNest logo">
    <span>SaveNest</span>
  </a>
  <div class="footer-links">
    <ul>
      <li><a href="../html/contact.html">Contact</a></li>
      <li><a href="../html/about.html">À propos</a></li>
      <li><a href="../html/policy.html">Politique de confidentialité</a></li>
      <li><a href="../html/cgu.html">Conditions d’utilisation</a></li>
    </ul>
  </div>
`;

function normalizeLanguageName(value) {
  if (typeof value === "string" && LANGUAGE_CONFIG[value]) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.language_name === "string" &&
    LANGUAGE_CONFIG[value.language_name]
  ) {
    return value.language_name;
  }

  return null;
}

function keepUniqueLanguageNames(languageNames) {
  const uniqueNames = [];

  for (let index = 0; index < languageNames.length; index += 1) {
    const languageName = normalizeLanguageName(languageNames[index]);

    if (!languageName) {
      continue;
    }

    if (uniqueNames.includes(languageName)) {
      continue;
    }

    uniqueNames.push(languageName);
  }

  return uniqueNames;
}

function getLanguageNamesFromUser(user) {
  if (!user || !Array.isArray(user.spoken_languages)) {
    return [];
  }

  return keepUniqueLanguageNames(user.spoken_languages);
}

function getStoredUserLanguages() {
  try {
    const rawStoredLanguages = localStorage.getItem(USER_LANGUAGES_STORAGE_KEY);

    if (!rawStoredLanguages) {
      return ["French"];
    }

    const parsedLanguages = JSON.parse(rawStoredLanguages);

    if (!Array.isArray(parsedLanguages)) {
      return ["French"];
    }

    const normalizedLanguages = keepUniqueLanguageNames(parsedLanguages);

    if (normalizedLanguages.length === 0) {
      return ["French"];
    }

    return normalizedLanguages;
  } catch (error) {
    return ["French"];
  }
}

function getActiveLanguage(selectedLanguages) {
  try {
    const storedLanguage = normalizeLanguageName(
      localStorage.getItem(ACTIVE_LANGUAGE_STORAGE_KEY)
    );

    if (storedLanguage && selectedLanguages.includes(storedLanguage)) {
      return storedLanguage;
    }
  } catch (error) {
    // On garde simplement la première langue disponible.
  }

  if (selectedLanguages.length > 0) {
    return selectedLanguages[0];
  }

  return "French";
}

function resolveActiveLanguage(selectedLanguages, preferredActiveLanguage) {
  const normalizedPreferredLanguage = normalizeLanguageName(
    preferredActiveLanguage
  );

  if (
    normalizedPreferredLanguage &&
    selectedLanguages.includes(normalizedPreferredLanguage)
  ) {
    return normalizedPreferredLanguage;
  }

  return getActiveLanguage(selectedLanguages);
}

export function saveUserLanguagePreferences(
  selectedLanguages,
  preferredActiveLanguage = null
) {
  // Cette fonction est utilisee apres connexion/inscription.
  // Elle garde en local les langues choisies par l'utilisateur.
  const normalizedLanguages = keepUniqueLanguageNames(selectedLanguages);

  if (normalizedLanguages.length === 0) {
    return null;
  }

  const nextActiveLanguage = resolveActiveLanguage(
    normalizedLanguages,
    preferredActiveLanguage
  );

  localStorage.setItem(
    USER_LANGUAGES_STORAGE_KEY,
    JSON.stringify(normalizedLanguages)
  );
  localStorage.setItem(ACTIVE_LANGUAGE_STORAGE_KEY, nextActiveLanguage);

  return {
    selectedLanguages: normalizedLanguages,
    activeLanguage: nextActiveLanguage,
  };
}

function hydrateTransferredAuthSession() {
  // Cette etape recupere une session passee dans l'URL apres une redirection.
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const transferredToken = currentUrl.searchParams.get(
      AUTH_TRANSFER_TOKEN_QUERY_KEY
    );
    const transferredUserRaw = currentUrl.searchParams.get(
      AUTH_TRANSFER_USER_QUERY_KEY
    );

    if (!transferredToken && !transferredUserRaw) {
      return;
    }

    if (typeof transferredToken === "string" && transferredToken.trim() !== "") {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, transferredToken);
    }

    if (typeof transferredUserRaw === "string" && transferredUserRaw.trim() !== "") {
      const transferredUser = JSON.parse(transferredUserRaw);

      if (transferredUser && typeof transferredUser === "object") {
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(transferredUser));

        const defaultCategoryId = Number(transferredUser.default_category_id);

        if (Number.isInteger(defaultCategoryId) && defaultCategoryId > 0) {
          localStorage.setItem(
            DEFAULT_CATEGORY_STORAGE_KEY,
            String(defaultCategoryId)
          );
        } else {
          localStorage.removeItem(DEFAULT_CATEGORY_STORAGE_KEY);
        }

        const transferredLanguages = getLanguageNamesFromUser(transferredUser);

        if (transferredLanguages.length > 0) {
          saveUserLanguagePreferences(
            transferredLanguages,
            transferredLanguages[0]
          );
        }
      }
    }

    currentUrl.searchParams.delete(AUTH_TRANSFER_TOKEN_QUERY_KEY);
    currentUrl.searchParams.delete(AUTH_TRANSFER_USER_QUERY_KEY);
    window.history.replaceState(
      null,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
  } catch (error) {
    // Si l'import de session échoue, la page continue simplement son chargement.
  }
}

hydrateTransferredAuthSession();

function buildLanguageOptionsMarkup(selectedLanguages, activeLanguage) {
  // Construit les <option> du select de langue.
  let html = "";

  for (let index = 0; index < selectedLanguages.length; index += 1) {
    const languageName = selectedLanguages[index];
    const language = LANGUAGE_CONFIG[languageName];

    if (!language) {
      continue;
    }

    let selectedAttribute = "";

    if (languageName === activeLanguage) {
      selectedAttribute = " selected";
    }

    html += `<option value="${languageName}"${selectedAttribute}>${language.flag} ${language.label}</option>`;
  }

  return html;
}

function getHeaderMarkup(selectedLanguages, activeLanguage) {
  // Le header est genere en JS pour etre partage par toutes les pages.
  const currentLanguage =
    LANGUAGE_CONFIG[activeLanguage] || LANGUAGE_CONFIG.French;
  const languageOptionsMarkup = buildLanguageOptionsMarkup(
    selectedLanguages,
    activeLanguage
  );

  return `
    <a href="../html/index.html" class="logo" aria-label="Retour à l'accueil">
      <img src="../img/logo.png" alt="SaveNest logo">
      <span>SaveNest</span>
    </a>
    <nav class="header-nav">
      <div class="header-language">
        <select
          id="headerLanguageSwitcher"
          class="header-language-select js_language_switcher"
          aria-label="${currentLanguage.header.language}"
        >
          ${languageOptionsMarkup}
        </select>
      </div>
      <button
        type="button"
        class="header-egg-toggle js_headerEggToggle"
        aria-label="Fermer l'œuf"
        aria-pressed="true"
      >
        <img src="${HEADER_EGG_OPEN_SRC}" alt="" class="header-egg-img js_headerEggImg" aria-hidden="true">
      </button>
      <ul>
        <li><a href="../html/index.html">${currentLanguage.header.home}</a></li>
        <li><a href="../html/fav.html">${currentLanguage.header.favorites}</a></li>
        <li><a href="../html/category.html">${currentLanguage.header.categories}</a></li>
        <li>
          <button type="button" class="header-logout-btn js_logoutBtn">
            ${currentLanguage.header.logout}
          </button>
        </li>
      </ul>
    </nav>
  `;
}

function clearAuthSession() {
  // Deconnexion locale : on retire tout ce qui prouve que l'utilisateur est connecte.
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  localStorage.removeItem(DEFAULT_CATEGORY_STORAGE_KEY);
  sessionStorage.removeItem(UNLOCKED_CATEGORIES_STORAGE_KEY);
}

function redirectAfterLogout() {
  // Apres deconnexion, on renvoie vers l'onglet connexion avec une raison dans l'URL.
  const destinationUrl = new URL("../html/connexion.html", window.location.href);
  destinationUrl.searchParams.set(LOGIN_REASON_QUERY_KEY, LOGGED_OUT_REASON);
  destinationUrl.hash = "#login";
  window.location.assign(destinationUrl.href);
}

async function notifyLogoutEndpoint(token) {
  // Cette notification serveur est utile, mais non bloquante.
  // Meme si elle echoue, on deconnecte quand meme l'utilisateur cote navigateur.
  if (!token) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    // La deconnexion locale reste prioritaire meme si le serveur est indisponible.
  }
}

function showLogoutConfirmModal() {
  // On renvoie une Promise pour pouvoir ecrire ensuite :
  // const shouldLogout = await showLogoutConfirmModal();
  return new Promise((resolve) => {
    const modalEl = document.createElement("div");
    modalEl.className = "logout-modal";
    modalEl.innerHTML = `
      <div class="logout-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="logoutModalTitle">
        <button type="button" class="logout-modal__close" data-logout-cancel aria-label="Fermer">×</button>
        <p class="logout-modal__eyebrow">SaveNest</p>
        <h2 id="logoutModalTitle">Déconnexion</h2>
        <p class="logout-modal__text">Voulez-vous vraiment vous déconnecter ?</p>
        <div class="logout-modal__actions">
          <button type="button" class="logout-modal__cancel" data-logout-cancel>Non</button>
          <button type="button" class="logout-modal__submit" data-logout-confirm>Oui</button>
        </div>
      </div>
    `;

    const cancelButtons = Array.from(modalEl.querySelectorAll("[data-logout-cancel]"));
    const confirmButton = modalEl.querySelector("[data-logout-confirm]");

    function closeModal(value) {
      // Toujours nettoyer les ecouteurs avant de supprimer la modale.
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

    if (confirmButton) {
      confirmButton.addEventListener("click", () => {
        closeModal(true);
      });
    }

    document.addEventListener("keydown", handleKeydown);
    document.body.appendChild(modalEl);

    if (confirmButton) {
      confirmButton.focus();
    }
  });
}

async function handleLogout() {
  // Flux complet de deconnexion : confirmation, nettoyage local, appel serveur, redirection.
  const shouldLogout = await showLogoutConfirmModal();

  if (!shouldLogout) {
    return;
  }

  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";

  clearAuthSession();
  notifyLogoutEndpoint(token);
  redirectAfterLogout();
}

const initialLanguages = getStoredUserLanguages();

export const headerMarkup = getHeaderMarkup(
  initialLanguages,
  getActiveLanguage(initialLanguages)
);

function markLayoutReady() {
  // Ajoute une classe sur body quand header et footer sont injectes.
  // Cela permet au CSS d'eviter les petits sauts visuels au chargement.
  const bodyEl = document.body;

  if (!bodyEl) {
    return;
  }

  const headerEl = document.querySelector(".js_header");
  const footerEl = document.querySelector(".js_footer");
  const headerReady = !headerEl || headerEl.dataset.hydrated === "true";
  const footerReady = !footerEl || footerEl.dataset.hydrated === "true";

  if (headerReady && footerReady) {
    bodyEl.classList.add("layout-ready");
  }
}

function renderHeader(headerEl) {
  // A chaque changement de langue, on rerend simplement tout le header.
  const selectedLanguages = getStoredUserLanguages();
  const activeLanguage = getActiveLanguage(selectedLanguages);
  const activeLanguageConfig =
    LANGUAGE_CONFIG[activeLanguage] || LANGUAGE_CONFIG.French;

  headerEl.innerHTML = getHeaderMarkup(selectedLanguages, activeLanguage);
  headerEl.dataset.hydrated = "true";
  headerEl.dataset.activeLanguage = activeLanguage;
  document.documentElement.lang = activeLanguageConfig.code;

  const languageSwitcher = headerEl.querySelector(".js_language_switcher");
  const eggToggle = headerEl.querySelector(".js_headerEggToggle");
  const eggImg = headerEl.querySelector(".js_headerEggImg");
  const logoutBtn = headerEl.querySelector(".js_logoutBtn");

  if (languageSwitcher) {
    languageSwitcher.addEventListener("change", function handleLanguageChange(event) {
      localStorage.setItem(ACTIVE_LANGUAGE_STORAGE_KEY, event.target.value);
      renderHeader(headerEl);
    });
  }

  function syncHeaderEgg() {
    // Le bouton de l'oeuf garde son image, son aria-label et sa classe en accord.
    if (!eggToggle || !eggImg) {
      return;
    }

    eggImg.src = isHeaderEggOpen ? HEADER_EGG_OPEN_SRC : HEADER_EGG_CLOSED_SRC;
    eggToggle.setAttribute("aria-pressed", String(isHeaderEggOpen));
    eggToggle.setAttribute(
      "aria-label",
      isHeaderEggOpen ? "Fermer l'œuf" : "Ouvrir l'œuf"
    );
    eggToggle.classList.toggle("is-open", isHeaderEggOpen);
  }

  syncHeaderEgg();

  if (eggToggle) {
    eggToggle.addEventListener("click", function handleHeaderEggClick() {
      isHeaderEggOpen = !isHeaderEggOpen;
      syncHeaderEgg();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  markLayoutReady();
}

export function setHeader() {
  // Fonction publique appelee dans chaque page.
  const headerEl = document.querySelector(".js_header");

  if (!headerEl) {
    return;
  }

  renderHeader(headerEl);
}

export function setFooter() {
  // Fonction publique appelee dans chaque page.
  const footerEl = document.querySelector(".js_footer");

  if (!footerEl) {
    return;
  }

  if (footerEl.dataset.hydrated === "true") {
    return;
  }

  if (footerEl.innerHTML.trim() !== footerMarkup.trim()) {
    footerEl.innerHTML = footerMarkup;
  }

  footerEl.dataset.hydrated = "true";
  markLayoutReady();
}

export function injectLayout() {
  // Raccourci si une page veut injecter header et footer en une seule fois.
  setHeader();
  setFooter();
}
