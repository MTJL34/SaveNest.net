import {
  USER_LANGUAGES_STORAGE_KEY,
  saveUserLanguagePreferences,
  setHeader,
  setFooter,
} from "./layout.js";

setHeader();
setFooter();

const authContent = {
  login: {
    eyebrow: "Espace personnel",
    title: "Heureux de vous revoir",
    description:
      "Connectez-vous pour retrouver vos catégories, vos favoris et continuer l'organisation de votre nid numérique.",
    points: [
      "Accès rapide à vos liens enregistrés",
      "Organisation simple par catégorie",
      "Gestion sécurisée de vos espaces privés",
    ],
  },
  signup: {
    eyebrow: "Créer un compte",
    title: "Bienvenue dans SaveNest",
    description:
      "Rejoignez SaveNest pour ranger vos liens, organiser vos catégories et retrouver rapidement ce qui compte pour vous.",
    points: [
      "Un espace clair pour vos contenus utiles",
      "Catégories publiques ou privées selon vos besoins",
      "Gestion simple, même sans profil technique",
    ],
  },
};

const switchButtons = [...document.querySelectorAll(".auth-switch-btn[data-auth-target]")];
const inlineSwitchButtons = [...document.querySelectorAll(".auth-inline-btn[data-auth-target]")];
const panels = [...document.querySelectorAll("[data-auth-panel]")];
const eyebrowEl = document.querySelector(".js_authEyebrow");
const titleEl = document.querySelector(".js_authTitle");
const descriptionEl = document.querySelector(".js_authDescription");
const pointsEl = document.querySelector(".js_authPoints");
const loginForm = document.querySelector(".login-form");
const signupForm = document.querySelector(".signup-form");
const loginFeedbackEl = document.querySelector(".login-feedback");
const signupFeedbackEl = document.querySelector(".signup-feedback");
const languagesSelectEl = document.querySelector(".js_languagesSelect");
const languagesTriggerEl = document.querySelector(".js_languagesTrigger");
const languagesTriggerTextEl = document.querySelector(".js_languagesTriggerText");
const languagesCountEl = document.querySelector(".js_languagesCount");
const languageCheckboxes = [
  ...document.querySelectorAll('.signup-form input[name="spoken_languages"]'),
];

const getModeFromHash = () => (window.location.hash === "#signup" ? "signup" : "login");

const updateAside = (mode) => {
  const content = authContent[mode];
  if (!content) return;

  eyebrowEl.textContent = content.eyebrow;
  titleEl.textContent = content.title;
  descriptionEl.textContent = content.description;
  pointsEl.innerHTML = content.points.map((item) => `<li>${item}</li>`).join("");
};

const setActiveMode = (mode, options = {}) => {
  const { updateHash = true } = options;
  const safeMode = mode === "signup" ? "signup" : "login";

  switchButtons.forEach((button) => {
    const isActive = button.dataset.authTarget === safeMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  panels.forEach((panel) => {
    const isActive = panel.dataset.authPanel === safeMode;
    panel.classList.toggle("is-active", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
  });

  if (safeMode !== "signup") {
    closeLanguagesSelect();
  }

  updateAside(safeMode);

  if (updateHash) {
    history.replaceState(null, "", safeMode === "signup" ? "#signup" : "#login");
  }
};

const getSelectedLanguageInputs = () => {
  return [...signupForm.querySelectorAll('input[name="spoken_languages"]:checked')];
};

const getSelectedLanguages = () => {
  return getSelectedLanguageInputs().map((input) => input.value);
};

const getSelectedLanguageLabels = () => {
  return getSelectedLanguageInputs().map((input) => {
    return input.parentElement?.textContent?.replace(/\s+/g, " ").trim() || input.value;
  });
};

const formatSelectedLanguagesSummary = () => {
  const selectedLanguageLabels = getSelectedLanguageLabels();

  if (selectedLanguageLabels.length === 0) {
    return "Choisir vos langues";
  }

  if (selectedLanguageLabels.length === 1) {
    return selectedLanguageLabels[0];
  }

  if (selectedLanguageLabels.length === 2) {
    return selectedLanguageLabels.join(", ");
  }

  return `${selectedLanguageLabels.length} langues sélectionnées`;
};

const openLanguagesSelect = () => {
  if (!languagesSelectEl || !languagesTriggerEl) return;

  languagesSelectEl.classList.add("is-open");
  languagesTriggerEl.setAttribute("aria-expanded", "true");
};

const closeLanguagesSelect = () => {
  if (!languagesSelectEl || !languagesTriggerEl) return;

  languagesSelectEl.classList.remove("is-open");
  languagesTriggerEl.setAttribute("aria-expanded", "false");
};

const syncLanguageOptionStates = () => {
  languageCheckboxes.forEach((checkbox) => {
    checkbox.closest(".language-option")?.classList.toggle("is-selected", checkbox.checked);
  });

  if (languagesTriggerTextEl) {
    languagesTriggerTextEl.textContent = formatSelectedLanguagesSummary();
  }

  if (languagesCountEl) {
    const selectedLanguagesCount = getSelectedLanguages().length;
    languagesCountEl.textContent = String(selectedLanguagesCount);
    languagesCountEl.hidden = selectedLanguagesCount === 0;
  }

  languagesTriggerEl?.classList.toggle("is-placeholder", getSelectedLanguages().length === 0);
};

const syncLanguageCheckboxesFromStorage = () => {
  try {
    const raw = localStorage.getItem(USER_LANGUAGES_STORAGE_KEY);
    if (!raw) return;

    const storedLanguages = JSON.parse(raw);
    if (!Array.isArray(storedLanguages)) return;

    languageCheckboxes.forEach((checkbox) => {
      checkbox.checked = storedLanguages.includes(checkbox.value);
    });
  } catch (error) {
    // Rien de bloquant ici.
  }

  syncLanguageOptionStates();
};

const refreshHeaderLanguages = (preferredLanguage = null) => {
  const selectedLanguages = getSelectedLanguages();

  if (selectedLanguages.length === 0) {
    signupFeedbackEl.textContent = "Choisissez au moins une langue parlée.";
    return null;
  }

  saveUserLanguagePreferences(selectedLanguages, preferredLanguage);
  setHeader();

  return getSelectedLanguageLabels();
};

switchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveMode(button.dataset.authTarget);
  });
});

window.addEventListener("hashchange", () => {
  setActiveMode(getModeFromHash(), { updateHash: false });
});

if (languagesTriggerEl) {
  languagesTriggerEl.addEventListener("click", () => {
    if (languagesSelectEl?.classList.contains("is-open")) {
      closeLanguagesSelect();
      return;
    }

    openLanguagesSelect();
  });
}

document.addEventListener("click", (event) => {
  if (!languagesSelectEl) return;
  if (languagesSelectEl.contains(event.target)) return;
  closeLanguagesSelect();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLanguagesSelect();
  }
});

syncLanguageCheckboxesFromStorage();
syncLanguageOptionStates();
setActiveMode(getModeFromHash(), { updateHash: false });

inlineSwitchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveMode(button.dataset.authTarget);
  });
});

languageCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    syncLanguageOptionStates();

    const preferredLanguage = checkbox.checked ? checkbox.value : null;
    const selectedLanguageLabels = refreshHeaderLanguages(preferredLanguage);

    if (!selectedLanguageLabels) return;

    signupFeedbackEl.textContent = `Langues disponibles dans le header : ${selectedLanguageLabels.join(", ")}.`;
  });
});

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginFeedbackEl.textContent = "Connexion prête à être branchée au backend.";
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const password = document.getElementById("signupPassword")?.value ?? "";
    const passwordConfirm = document.getElementById("signupPasswordConfirm")?.value ?? "";
    const selectedLanguages = getSelectedLanguages();

    if (password !== passwordConfirm) {
      signupFeedbackEl.textContent = "Les mots de passe ne correspondent pas.";
      return;
    }

    if (selectedLanguages.length === 0) {
      signupFeedbackEl.textContent = "Choisissez au moins une langue parlée.";
      return;
    }

    const selectedLanguageLabels = refreshHeaderLanguages(
      selectedLanguages[selectedLanguages.length - 1]
    );

    if (!selectedLanguageLabels) return;

    signupFeedbackEl.textContent = `Inscription prête. Langues enregistrées pour le header : ${selectedLanguageLabels.join(", ")}.`;
  });
}
