// Ce script pilote la page de connexion et d'inscription.
import {
  USER_LANGUAGES_STORAGE_KEY,
  saveUserLanguagePreferences,
  setHeader,
  setFooter,
} from "./layout.js";
import {
  getApiBaseUrl,
  getAppBaseUrl,
  getServerUnavailableMessage,
} from "./apiConfig.js";
import { enhancePasswordFields } from "./passwordVisibility.js";

setHeader();
setFooter();

// Ce contenu change selon le mode choisi : connexion ou inscription.
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

const switchButtons = Array.from(
  document.querySelectorAll(".auth-switch-btn[data-auth-target]")
);
const inlineSwitchButtons = Array.from(
  document.querySelectorAll(".auth-inline-btn[data-auth-target]")
);
const panels = Array.from(document.querySelectorAll("[data-auth-panel]"));
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
const languageCheckboxes = Array.from(
  document.querySelectorAll('.signup-form input[name="spoken_languages"]')
);

enhancePasswordFields();

const API_BASE_URL = getApiBaseUrl();
const APP_BASE_URL = getAppBaseUrl();
const HOME_PAGE_URL = new URL("html/index.html", APP_BASE_URL).href;
const LOGIN_PAGE_URL = new URL("html/connexion.html", APP_BASE_URL).href;
const LOGIN_REASON_QUERY_KEY = "reason";
const AUTH_REQUIRED_REASON = "auth-required";
const LOGGED_OUT_REASON = "logged-out";
const AUTH_TRANSFER_TOKEN_QUERY_KEY = "sn_token";
const AUTH_TRANSFER_USER_QUERY_KEY = "sn_user";
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";
const DEFAULT_CATEGORY_STORAGE_KEY = "savenest_default_category";

function normalizeAuthPageOrigin() {
  // Si la page est ouverte depuis une autre origine que celle calculee par l'app,
  // on redirige vers l'URL canonique pour garder les liens et fetch coherents.
  const destinationUrl = new URL(LOGIN_PAGE_URL);

  if (window.location.origin === destinationUrl.origin) {
    return;
  }

  const currentUrl = new URL(window.location.href);
  const loginReason = currentUrl.searchParams.get(LOGIN_REASON_QUERY_KEY);

  if (loginReason === AUTH_REQUIRED_REASON) {
    destinationUrl.searchParams.set(LOGIN_REASON_QUERY_KEY, AUTH_REQUIRED_REASON);
  } else if (loginReason === LOGGED_OUT_REASON) {
    destinationUrl.searchParams.set(LOGIN_REASON_QUERY_KEY, LOGGED_OUT_REASON);
  }

  destinationUrl.hash = window.location.hash === "#signup" ? "#signup" : "#login";
  window.location.replace(destinationUrl.href);
}

normalizeAuthPageOrigin();

function getModeFromHash() {
  // L'URL choisit l'onglet actif : #signup ou #login.
  if (window.location.hash === "#signup") {
    return "signup";
  }

  return "login";
}

function showLoginReasonMessage() {
  // Affiche un message si l'utilisateur arrive ici apres expiration ou deconnexion.
  const currentUrl = new URL(window.location.href);
  const loginReason = currentUrl.searchParams.get(LOGIN_REASON_QUERY_KEY);

  if (loginReason !== AUTH_REQUIRED_REASON && loginReason !== LOGGED_OUT_REASON) {
    return;
  }

  setActiveMode("login", { updateHash: false });
  setFeedback(
    loginFeedbackEl,
    loginReason === LOGGED_OUT_REASON
      ? "Déconnexion réussie."
      : "Vous devez être connecté pour accéder au site.",
    loginReason === LOGGED_OUT_REASON ? "success" : "error"
  );
  currentUrl.searchParams.delete(LOGIN_REASON_QUERY_KEY);
  window.history.replaceState(
    null,
    "",
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
  );
}

function updateAside(mode) {
  // Met a jour le texte de la colonne de gauche selon le mode actif.
  const content = authContent[mode];

  if (!content) {
    return;
  }

  eyebrowEl.textContent = content.eyebrow;
  titleEl.textContent = content.title;
  descriptionEl.textContent = content.description;
  let pointsMarkup = "";

  for (let index = 0; index < content.points.length; index += 1) {
    pointsMarkup += `<li>${content.points[index]}</li>`;
  }

  pointsEl.innerHTML = pointsMarkup;
}

function setActiveMode(mode, options = {}) {
  // Change l'interface entre connexion et inscription.
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
}

function getSelectedLanguageInputs() {
  // Renvoie les cases de langues cochees dans le formulaire d'inscription.
  return Array.from(
    signupForm.querySelectorAll('input[name="spoken_languages"]:checked')
  );
}

function getSelectedLanguages() {
  // Transforme les inputs coches en tableau de noms de langues.
  const selectedInputs = getSelectedLanguageInputs();
  const selectedLanguages = [];

  for (let index = 0; index < selectedInputs.length; index += 1) {
    selectedLanguages.push(selectedInputs[index].value);
  }

  return selectedLanguages;
}

function getSelectedLanguageLabels() {
  // Recupere les libelles visibles pour resumer le choix de l'utilisateur.
  const selectedInputs = getSelectedLanguageInputs();
  const selectedLabels = [];

  for (let index = 0; index < selectedInputs.length; index += 1) {
    const input = selectedInputs[index];
    const option = input.closest(".language-option");
    let labelText = input.value;

    if (option) {
      const languageLabel = option.querySelector(".language-label");

      if (languageLabel && typeof languageLabel.textContent === "string") {
        const trimmedLabel = languageLabel.textContent.trim();

        if (trimmedLabel !== "") {
          labelText = trimmedLabel;
        }
      }
    }

    selectedLabels.push(labelText);
  }

  return selectedLabels;
}

function formatSelectedLanguagesSummary() {
  // Texte affiche sur le bouton du menu de langues.
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
}

function openLanguagesSelect() {
  // Ouvre le menu personnalise de choix des langues.
  if (!languagesSelectEl || !languagesTriggerEl) {
    return;
  }

  languagesSelectEl.classList.add("is-open");
  languagesTriggerEl.setAttribute("aria-expanded", "true");
}

function closeLanguagesSelect() {
  // Ferme le menu de langues.
  if (!languagesSelectEl || !languagesTriggerEl) {
    return;
  }

  languagesSelectEl.classList.remove("is-open");
  languagesTriggerEl.setAttribute("aria-expanded", "false");
}

function syncLanguageOptionStates() {
  // Met a jour l'apparence des options de langues apres chaque coche.
  for (let index = 0; index < languageCheckboxes.length; index += 1) {
    const checkbox = languageCheckboxes[index];
    const option = checkbox.closest(".language-option");

    if (option) {
      option.classList.toggle("is-selected", checkbox.checked);
    }
  }

  if (languagesTriggerTextEl) {
    languagesTriggerTextEl.textContent = formatSelectedLanguagesSummary();
  }

  if (languagesCountEl) {
    const selectedLanguagesCount = getSelectedLanguages().length;
    languagesCountEl.textContent = String(selectedLanguagesCount);
    languagesCountEl.hidden = selectedLanguagesCount === 0;
  }

  if (languagesTriggerEl) {
    languagesTriggerEl.classList.toggle(
      "is-placeholder",
      getSelectedLanguages().length === 0
    );
  }
}

function syncLanguageCheckboxesFromStorage() {
  // Recharge les langues deja choisies lors d'une session precedente.
  try {
    const raw = localStorage.getItem(USER_LANGUAGES_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const storedLanguages = JSON.parse(raw);
    if (!Array.isArray(storedLanguages)) {
      return;
    }

    for (let index = 0; index < languageCheckboxes.length; index += 1) {
      const checkbox = languageCheckboxes[index];
      checkbox.checked = storedLanguages.includes(checkbox.value);
    }
  } catch (error) {
    // Rien de bloquant ici.
  }

  syncLanguageOptionStates();
}

function refreshHeaderLanguages(preferredLanguage = null) {
  // Sauvegarde les langues cochees puis reconstruit le header.
  const selectedLanguages = getSelectedLanguages();

  if (selectedLanguages.length === 0) {
    signupFeedbackEl.textContent = "Choisissez au moins une langue parlée.";
    return null;
  }

  saveUserLanguagePreferences(selectedLanguages, preferredLanguage);
  setHeader();

  return getSelectedLanguageLabels();
}

function setFeedback(element, message, type = "") {
  // Affiche un message de formulaire avec une classe d'etat.
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.remove("is-error", "is-success");

  if (type) {
    element.classList.add(`is-${type}`);
  }
}

function setSubmitState(form, isLoading, defaultLabel, loadingLabel) {
  // Evite les doubles clics pendant un appel API.
  if (!form) {
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');

  if (!submitButton) {
    return;
  }

  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? loadingLabel : defaultLabel;
}

const parseJsonSafely = async (response) => {
  // Certaines erreurs serveur peuvent ne pas contenir de JSON.
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
};

const saveAuthSession = ({ token, user }) => {
  // Stocke ce dont les autres pages ont besoin pour reconnaitre l'utilisateur.
  if (typeof token === "string" && token.trim() !== "") {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));

    const defaultCategoryId = Number(user.default_category_id);

    if (Number.isInteger(defaultCategoryId) && defaultCategoryId > 0) {
      localStorage.setItem(DEFAULT_CATEGORY_STORAGE_KEY, String(defaultCategoryId));
    } else {
      localStorage.removeItem(DEFAULT_CATEGORY_STORAGE_KEY);
    }
  }
};

function getLanguageNamesFromUser(user) {
  // L'API peut renvoyer les langues sous forme d'objets.
  // Le front garde seulement leurs noms.
  if (!user || !Array.isArray(user.spoken_languages)) {
    return [];
  }

  const languageNames = [];

  for (let index = 0; index < user.spoken_languages.length; index += 1) {
    const language = user.spoken_languages[index];
    let languageName = null;

    if (typeof language === "string") {
      languageName = language;
    } else if (language && typeof language.language_name === "string") {
      languageName = language.language_name;
    }

    if (languageName) {
      languageNames.push(languageName);
    }
  }

  return languageNames;
}

const getPostLoginRedirectUrl = ({ token, user }) => {
  // En cas de changement d'origine, on transfere temporairement la session dans l'URL.
  const destinationUrl = new URL(HOME_PAGE_URL);

  if (window.location.origin === destinationUrl.origin) {
    return destinationUrl.href;
  }

  if (typeof token === "string" && token.trim() !== "") {
    destinationUrl.searchParams.set(AUTH_TRANSFER_TOKEN_QUERY_KEY, token);
  }

  if (user && typeof user === "object") {
    destinationUrl.searchParams.set(
      AUTH_TRANSFER_USER_QUERY_KEY,
      JSON.stringify(user)
    );
  }

  return destinationUrl.href;
};

switchButtons.forEach((button) => {
  // Boutons principaux de bascule connexion/inscription.
  button.addEventListener("click", () => {
    setActiveMode(button.dataset.authTarget);
  });
});

window.addEventListener("hashchange", () => {
  // Si l'utilisateur change directement le hash de l'URL, l'interface suit.
  setActiveMode(getModeFromHash(), { updateHash: false });
});

if (languagesTriggerEl) {
  languagesTriggerEl.addEventListener("click", () => {
    if (languagesSelectEl && languagesSelectEl.classList.contains("is-open")) {
      closeLanguagesSelect();
      return;
    }

    openLanguagesSelect();
  });
}

document.addEventListener("click", (event) => {
  // Clic hors du menu des langues : on le ferme.
  if (!languagesSelectEl) return;
  if (languagesSelectEl.contains(event.target)) return;
  closeLanguagesSelect();
});

document.addEventListener("keydown", (event) => {
  // Echap ferme le menu des langues.
  if (event.key === "Escape") {
    closeLanguagesSelect();
  }
});

syncLanguageCheckboxesFromStorage();
syncLanguageOptionStates();
setActiveMode(getModeFromHash(), { updateHash: false });
showLoginReasonMessage();

inlineSwitchButtons.forEach((button) => {
  // Liens secondaires places dans les textes des formulaires.
  button.addEventListener("click", () => {
    setActiveMode(button.dataset.authTarget);
  });
});

languageCheckboxes.forEach((checkbox) => {
  // Chaque changement de langue met a jour le resume et le header.
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
    // La connexion envoie l'identifiant et le mot de passe a l'API.
    event.preventDefault();

    const identifier = loginIdentifierInput ? loginIdentifierInput.value.trim() : "";
    const password = loginPasswordInput ? loginPasswordInput.value : "";

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
        window.location.assign(
          getPostLoginRedirectUrl({
            token: data.token,
            user: data.user,
          })
        );
      }, 500);
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
      setFeedback(loginFeedbackEl, getServerUnavailableMessage(), "error");
    } finally {
      setSubmitState(loginForm, false, "Se connecter", "Connexion...");
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    // L'inscription cree le compte puis replace l'utilisateur sur le mode connexion.
    event.preventDefault();

    const pseudo = signupPseudoInput ? signupPseudoInput.value.trim() : "";
    const mail = signupEmailInput ? signupEmailInput.value.trim() : "";
    const password = signupPasswordInput ? signupPasswordInput.value : "";
    const passwordConfirm = signupPasswordConfirmInput
      ? signupPasswordConfirmInput.value
      : "";
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
      setFeedback(signupFeedbackEl, getServerUnavailableMessage(), "error");
    } finally {
      setSubmitState(signupForm, false, "Créer mon compte", "Inscription...");
    }
  });
}
