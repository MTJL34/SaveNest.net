// Ce fichier construit le header, le footer et la gestion des langues cote front.
export const USER_LANGUAGES_STORAGE_KEY = "savenest_user_languages";
export const ACTIVE_LANGUAGE_STORAGE_KEY = "savenest_active_language";

const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";
const DEFAULT_CATEGORY_STORAGE_KEY = "savenest_default_category";
const AUTH_TRANSFER_TOKEN_QUERY_KEY = "sn_token";
const AUTH_TRANSFER_USER_QUERY_KEY = "sn_user";

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
      <ul>
        <li><a href="../html/index.html">${currentLanguage.header.home}</a></li>
        <li><a href="../html/fav.html">${currentLanguage.header.favorites}</a></li>
        <li><a href="../html/category.html">${currentLanguage.header.categories}</a></li>
        <li><a href="../html/connexion.html">${currentLanguage.header.login}</a></li>
      </ul>
    </nav>
  `;
}

const initialLanguages = getStoredUserLanguages();

export const headerMarkup = getHeaderMarkup(
  initialLanguages,
  getActiveLanguage(initialLanguages)
);

function markLayoutReady() {
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

  if (languageSwitcher) {
    languageSwitcher.addEventListener("change", function handleLanguageChange(event) {
      localStorage.setItem(ACTIVE_LANGUAGE_STORAGE_KEY, event.target.value);
      renderHeader(headerEl);
    });
  }

  markLayoutReady();
}

export function setHeader() {
  const headerEl = document.querySelector(".js_header");

  if (!headerEl) {
    return;
  }

  renderHeader(headerEl);
}

export function setFooter() {
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
  setHeader();
  setFooter();
}
