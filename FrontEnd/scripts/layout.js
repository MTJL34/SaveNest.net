export const USER_LANGUAGES_STORAGE_KEY = "savenest_user_languages";
export const ACTIVE_LANGUAGE_STORAGE_KEY = "savenest_active_language";

// Petit dictionnaire de traduction pour le header.
const LANGUAGE_CONFIG = {
  French: {
    code: "fr",
    label: "Français",
    flag: "🇫🇷",
    header: {
      home: "Accueil",
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
      categories: "カテゴリ",
      about: "概要",
      login: "ログイン",
      language: "言語",
    },
  },
};

const footerMarkup = `
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

const normalizeLanguageName = (value) => {
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
};

const getStoredUserLanguages = () => {
  try {
    const raw = localStorage.getItem(USER_LANGUAGES_STORAGE_KEY);
    if (!raw) return ["French"];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ["French"];

    const normalized = [...new Set(parsed.map(normalizeLanguageName).filter(Boolean))];
    return normalized.length > 0 ? normalized : ["French"];
  } catch (error) {
    return ["French"];
  }
};

const getActiveLanguage = (selectedLanguages) => {
  try {
    const storedLanguage = normalizeLanguageName(
      localStorage.getItem(ACTIVE_LANGUAGE_STORAGE_KEY)
    );

    if (storedLanguage && selectedLanguages.includes(storedLanguage)) {
      return storedLanguage;
    }
  } catch (error) {
    // Pas bloquant : on retombe simplement sur la première langue disponible.
  }

  return selectedLanguages[0] || "French";
};

const resolveActiveLanguage = (selectedLanguages, preferredActiveLanguage = null) => {
  const normalizedPreferredLanguage = normalizeLanguageName(preferredActiveLanguage);

  if (
    normalizedPreferredLanguage &&
    selectedLanguages.includes(normalizedPreferredLanguage)
  ) {
    return normalizedPreferredLanguage;
  }

  return getActiveLanguage(selectedLanguages);
};

export function saveUserLanguagePreferences(
  selectedLanguages,
  preferredActiveLanguage = null
) {
  const normalizedLanguages = [
    ...new Set(selectedLanguages.map(normalizeLanguageName).filter(Boolean)),
  ];

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

const getHeaderMarkup = (selectedLanguages, activeLanguage) => {
  const currentLanguage = LANGUAGE_CONFIG[activeLanguage] || LANGUAGE_CONFIG.French;
  const languageOptionsMarkup = selectedLanguages
    .map((languageName) => {
      const language = LANGUAGE_CONFIG[languageName];
      const isSelected = languageName === activeLanguage ? " selected" : "";

      return `<option value="${languageName}"${isSelected}>${language.flag} ${language.label}</option>`;
    })
    .join("");

  const languageControlMarkup = `
    <div class="header-language">
      <select
        id="headerLanguageSwitcher"
        class="header-language-select js_language_switcher"
        aria-label="${currentLanguage.header.language}"
      >
        ${languageOptionsMarkup}
      </select>
    </div>
  `;

  return `
    <a href="../html/index.html" class="logo" aria-label="Retour à l'accueil">
      <img src="../img/logo.png" alt="SaveNest logo">
      <span>SaveNest</span>
    </a>
    <nav class="header-nav">
      ${languageControlMarkup}
      <ul>
        <li><a href="../html/index.html">${currentLanguage.header.home}</a></li>
        <li><a href="../html/category.html">${currentLanguage.header.categories}</a></li>
        <li><a href="../html/connexion.html">${currentLanguage.header.login}</a></li>
      </ul>
    </nav>
  `;
};

const initialLanguages = getStoredUserLanguages();

export const headerMarkup = getHeaderMarkup(
  initialLanguages,
  getActiveLanguage(initialLanguages)
);

function renderHeader(headerEl) {
  const selectedLanguages = getStoredUserLanguages();
  const activeLanguage = getActiveLanguage(selectedLanguages);

  headerEl.innerHTML = getHeaderMarkup(selectedLanguages, activeLanguage);
  headerEl.dataset.hydrated = "true";
  headerEl.dataset.activeLanguage = activeLanguage;

  document.documentElement.lang = LANGUAGE_CONFIG[activeLanguage]?.code || "fr";

  const languageSwitcher = headerEl.querySelector(".js_language_switcher");
  if (languageSwitcher) {
    languageSwitcher.addEventListener("change", (event) => {
      localStorage.setItem(ACTIVE_LANGUAGE_STORAGE_KEY, event.target.value);
      renderHeader(headerEl);
    });
  }

  markLayoutReady();
}

export function setHeader() {
  const headerEl = document.querySelector(".js_header");
  if (!headerEl) return;

  renderHeader(headerEl);
}

export function setFooter() {
  const footerEl = document.querySelector(".js_footer");
  if (!footerEl) return;
  if (footerEl.dataset.hydrated === "true") return;

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

function markLayoutReady() {
  const bodyEl = document.body;
  if (!bodyEl) return;

  const headerEl = document.querySelector(".js_header");
  const footerEl = document.querySelector(".js_footer");

  const headerReady = !headerEl || headerEl.dataset.hydrated === "true";
  const footerReady = !footerEl || footerEl.dataset.hydrated === "true";

  if (headerReady && footerReady) {
    bodyEl.classList.add("layout-ready");
  }
}
