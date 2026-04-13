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
const loginIdentifierInput = document.getElementById("loginIdentifier");
const loginPasswordInput = document.getElementById("loginPassword");
const signupPseudoInput = document.getElementById("signupPseudo");
const signupEmailInput = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const signupPasswordConfirmInput = document.getElementById("signupPasswordConfirm");
const languagesSelectEl = document.querySelector(".js_languagesSelect");
const languagesTriggerEl = document.querySelector(".js_languagesTrigger");
const languagesTriggerTextEl = document.querySelector(".js_languagesTriggerText");
const languagesCountEl = document.querySelector(".js_languagesCount");
const languageCheckboxes = [
  ...document.querySelectorAll('.signup-form input[name="spoken_languages"]'),
];

const API_BASE_URL = "http://localhost:3000/api";
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";

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
    const languageLabel = input.closest(".language-option")?.querySelector(".language-label");
    return languageLabel?.textContent?.trim() || input.value;
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

const setFeedback = (element, message, type = "") => {
  if (!element) return;

  element.textContent = message;
  element.classList.remove("is-error", "is-success");

  if (type) {
    element.classList.add(`is-${type}`);
  }
};

const setSubmitState = (form, isLoading, defaultLabel, loadingLabel) => {
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!submitButton) return;

  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? loadingLabel : defaultLabel;
};

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
};

const saveAuthSession = ({ token, user }) => {
  if (typeof token === "string" && token.trim() !== "") {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  }
};

const getLanguageNamesFromUser = (user) => {
  if (!Array.isArray(user?.spoken_languages)) return [];

  return user.spoken_languages
    .map((language) => {
      if (typeof language === "string") return language;
      if (language && typeof language.language_name === "string") {
        return language.language_name;
      }

      return null;
    })
    .filter(Boolean);
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
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const identifier = loginIdentifierInput?.value.trim() || "";
    const password = loginPasswordInput?.value || "";

    if (!identifier || !password) {
      setFeedback(
        loginFeedbackEl,
        "Entrez votre e-mail ou votre pseudo, puis votre mot de passe.",
        "error"
      );
      return;
    }

    setFeedback(loginFeedbackEl, "");
    setSubmitState(loginForm, true, "Se connecter", "Connexion...");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });
      const data = await parseJsonSafely(response);

      if (!response.ok) {
        setFeedback(
          loginFeedbackEl,
          data.message || "Impossible de se connecter pour le moment.",
          "error"
        );
        return;
      }

      saveAuthSession({
        token: data.token,
        user: data.user,
      });

      const userLanguageNames = getLanguageNamesFromUser(data.user);
      if (userLanguageNames.length > 0) {
        saveUserLanguagePreferences(userLanguageNames, userLanguageNames[0]);
        setHeader();
      }

      setFeedback(
        loginFeedbackEl,
        data.message || "Connexion réussie. Redirection en cours...",
        "success"
      );

      window.setTimeout(() => {
        window.location.assign("../html/index.html");
      }, 500);
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
      setFeedback(
        loginFeedbackEl,
        "Le serveur est injoignable. Vérifiez que le backend tourne bien sur le port 3000.",
        "error"
      );
    } finally {
      setSubmitState(loginForm, false, "Se connecter", "Connexion...");
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const pseudo = signupPseudoInput?.value.trim() || "";
    const mail = signupEmailInput?.value.trim() || "";
    const password = signupPasswordInput?.value ?? "";
    const passwordConfirm = signupPasswordConfirmInput?.value ?? "";
    const selectedLanguages = getSelectedLanguages();

    if (!pseudo || !mail || !password) {
      setFeedback(signupFeedbackEl, "Tous les champs sont obligatoires.", "error");
      return;
    }

    if (password !== passwordConfirm) {
      setFeedback(signupFeedbackEl, "Les mots de passe ne correspondent pas.", "error");
      return;
    }

    if (selectedLanguages.length === 0) {
      setFeedback(signupFeedbackEl, "Choisissez au moins une langue parlée.", "error");
      return;
    }

    setFeedback(signupFeedbackEl, "");
    setSubmitState(signupForm, true, "Créer mon compte", "Inscription...");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pseudo,
          mail,
          password,
          spoken_languages: selectedLanguages,
        }),
      });
      const data = await parseJsonSafely(response);

      if (!response.ok) {
        setFeedback(
          signupFeedbackEl,
          data.message || "Impossible de créer le compte pour le moment.",
          "error"
        );
        return;
      }

      const userLanguageNames = getLanguageNamesFromUser(data.user);
      const preferredLanguages =
        userLanguageNames.length > 0 ? userLanguageNames : selectedLanguages;

      saveUserLanguagePreferences(preferredLanguages, preferredLanguages[0] || null);
      setHeader();

      signupForm.reset();
      syncLanguageOptionStates();
      closeLanguagesSelect();

      if (loginIdentifierInput) {
        loginIdentifierInput.value = mail;
      }

      if (loginPasswordInput) {
        loginPasswordInput.value = "";
      }

      setActiveMode("login");
      setFeedback(
        signupFeedbackEl,
        data.message || "Compte créé avec succès.",
        "success"
      );
      setFeedback(
        loginFeedbackEl,
        "Compte créé. Connectez-vous avec votre e-mail ou votre pseudo.",
        "success"
      );
    } catch (error) {
      console.error("Erreur lors de l'inscription :", error);
      setFeedback(
        signupFeedbackEl,
        "Le serveur est injoignable. Vérifiez que le backend tourne bien sur le port 3000.",
        "error"
      );
    } finally {
      setSubmitState(signupForm, false, "Créer mon compte", "Inscription...");
    }
  });
}
