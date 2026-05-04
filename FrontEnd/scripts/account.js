// Ce script pilote la page "Mon compte".
import {
  saveUserLanguagePreferences,
  setFooter,
  setHeader,
} from "./layout.js";
import {
  getApiBaseUrl,
  getAppBaseUrl,
  getServerUnavailableMessage,
} from "./apiConfig.js";
import { enhancePasswordFields } from "./passwordVisibility.js";

setHeader();
setFooter();
enhancePasswordFields();

const API_BASE_URL = getApiBaseUrl();
const APP_BASE_URL = getAppBaseUrl();
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";
const DEFAULT_CATEGORY_STORAGE_KEY = "savenest_default_category";
const USER_LANGUAGES_STORAGE_KEY = "savenest_user_languages";
const ACTIVE_LANGUAGE_STORAGE_KEY = "savenest_active_language";
const LOGIN_REASON_QUERY_KEY = "reason";
const AUTH_REQUIRED_REASON = "auth-required";
const DELETE_CONFIRMATION_TEXT = "SUPPRIMER";

const accountForm = document.querySelector(".js_accountForm");
const deleteForm = document.querySelector(".js_deleteForm");
const accountFeedbackEl = document.querySelector(".js_accountFeedback");
const deleteFeedbackEl = document.querySelector(".js_deleteFeedback");
const roleBadgeEl = document.querySelector(".js_accountRole");
const adminPanelEl = document.querySelector(".js_accountAdminPanel");
const pseudoInput = document.getElementById("accountPseudo");
const mailInput = document.getElementById("accountMail");
const currentPasswordInput = document.getElementById("accountCurrentPassword");
const passwordInput = document.getElementById("accountPassword");
const deleteConfirmInput = document.getElementById("deleteConfirmText");
const languageCheckboxes = Array.from(
  document.querySelectorAll('input[name="spoken_languages"]')
);

const summaryPseudoEl = document.querySelector(".js_summaryPseudo");
const summaryMailEl = document.querySelector(".js_summaryMail");
const summaryRoleEl = document.querySelector(".js_summaryRole");
const summaryDateEl = document.querySelector(".js_summaryDate");
const summaryDefaultCategoryEl = document.querySelector(".js_summaryDefaultCategory");
const summaryLanguagesEl = document.querySelector(".js_summaryLanguages");
let userCategories = [];

function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  localStorage.removeItem(DEFAULT_CATEGORY_STORAGE_KEY);
  localStorage.removeItem(USER_LANGUAGES_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_LANGUAGE_STORAGE_KEY);
}

function redirectToLogin() {
  const destinationUrl = new URL("html/connexion.html", APP_BASE_URL);
  destinationUrl.searchParams.set(LOGIN_REASON_QUERY_KEY, AUTH_REQUIRED_REASON);
  destinationUrl.hash = "#login";
  window.location.assign(destinationUrl.href);
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);

    if (!rawUser) {
      return null;
    }

    return JSON.parse(rawUser);
  } catch (error) {
    return null;
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch (error) {
    return null;
  }
}

function getAuthenticatedUserId() {
  const storedUser = getStoredUser();
  const storedUserId = storedUser ? Number(storedUser.id_user) : NaN;

  if (Number.isInteger(storedUserId) && storedUserId > 0) {
    return storedUserId;
  }

  const token = getAuthToken();
  const decodedPayload = decodeJwtPayload(token);
  const tokenUserId = decodedPayload ? Number(decodedPayload.id_user) : NaN;

  if (Number.isInteger(tokenUserId) && tokenUserId > 0) {
    return tokenUserId;
  }

  return null;
}

function setFeedback(element, message, type = "") {
  if (!element) {
    return;
  }

  element.textContent = message || "";
  element.classList.remove("is-success", "is-error");

  if (type === "success") {
    element.classList.add("is-success");
  } else if (type === "error") {
    element.classList.add("is-error");
  }
}

function setSubmitState(formEl, isBusy, defaultText, busyText) {
  if (!formEl) {
    return;
  }

  const submitButton = formEl.querySelector('button[type="submit"]');

  if (!submitButton) {
    return;
  }

  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? busyText : defaultText;
}

function parseJsonSafely(response) {
  return response.json().catch(() => ({}));
}

async function fetchWithAuth(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    clearAuthSession();
    redirectToLogin();
    throw new Error("Connectez-vous pour gérer votre compte.");
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new Error(getServerUnavailableMessage());
  }

  const data = await parseJsonSafely(response);

  if (response.status === 401) {
    clearAuthSession();
    redirectToLogin();
    throw new Error("Votre session a expiré. Merci de vous reconnecter.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Une erreur est survenue.");
  }

  return data;
}

function getLanguageNamesFromUser(user) {
  if (!user || !Array.isArray(user.spoken_languages)) {
    return [];
  }

  const languageNames = [];

  for (let index = 0; index < user.spoken_languages.length; index += 1) {
    const language = user.spoken_languages[index];
    const languageName =
      typeof language === "string"
        ? language
        : language && typeof language.language_name === "string"
          ? language.language_name
          : "";

    if (!languageName || languageNames.includes(languageName)) {
      continue;
    }

    languageNames.push(languageName);
  }

  return languageNames;
}

function getSelectedLanguages() {
  const selectedLanguages = [];

  for (let index = 0; index < languageCheckboxes.length; index += 1) {
    const input = languageCheckboxes[index];

    if (input.checked) {
      selectedLanguages.push(input.value);
    }
  }

  return selectedLanguages;
}

function setSelectedLanguages(languageNames) {
  for (let index = 0; index < languageCheckboxes.length; index += 1) {
    const input = languageCheckboxes[index];
    input.checked = languageNames.includes(input.value);
  }
}

function formatRoleLabel(user) {
  if (!user) {
    return "Utilisateur";
  }

  if (typeof user.role_label === "string" && user.role_label.trim() !== "") {
    return user.role_label.trim();
  }

  if (typeof user.role_code === "string" && user.role_code.trim() !== "") {
    return user.role_code.trim();
  }

  return "Utilisateur";
}

function canAccessAdminArea(user) {
  if (!user || typeof user !== "object") {
    return false;
  }

  return user.role_code === "ADMIN" || user.role_code === "MODERATOR";
}

function formatRegistrationDate(value) {
  if (!value) {
    return "Date inconnue";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(date);
}

function getDefaultCategoryLabel(user, categories = []) {
  const defaultCategoryId = Number(user.default_category_id);

  if (!Number.isInteger(defaultCategoryId) || defaultCategoryId <= 0) {
    return "Aucune";
  }

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];

    if (Number(category.id_category) === defaultCategoryId) {
      return category.category_name || `Catégorie #${defaultCategoryId}`;
    }
  }

  return `Catégorie #${defaultCategoryId}`;
}

function updateSummary(user, categories = []) {
  if (summaryPseudoEl) {
    summaryPseudoEl.textContent = user.pseudo || "-";
  }

  if (summaryMailEl) {
    summaryMailEl.textContent = user.mail || "-";
  }

  if (summaryRoleEl) {
    summaryRoleEl.textContent = formatRoleLabel(user);
  }

  if (summaryDateEl) {
    summaryDateEl.textContent = formatRegistrationDate(user.date_inscription);
  }

  if (summaryDefaultCategoryEl) {
    summaryDefaultCategoryEl.textContent = getDefaultCategoryLabel(user, categories);
  }

  if (summaryLanguagesEl) {
    const languageNames = getLanguageNamesFromUser(user);
    summaryLanguagesEl.textContent =
      languageNames.length > 0 ? languageNames.join(", ") : "Aucune";
  }

  if (roleBadgeEl) {
    roleBadgeEl.textContent = formatRoleLabel(user);
  }

  if (adminPanelEl) {
    adminPanelEl.hidden = !canAccessAdminArea(user);
  }
}

function populateForm(user) {
  if (pseudoInput) {
    pseudoInput.value = user.pseudo || "";
  }

  if (mailInput) {
    mailInput.value = user.mail || "";
  }

  if (currentPasswordInput) {
    currentPasswordInput.value = "";
  }

  if (passwordInput) {
    passwordInput.value = "";
  }

  setSelectedLanguages(getLanguageNamesFromUser(user));
}

function storeUserSession(user) {
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));

  const defaultCategoryId = Number(user.default_category_id);

  if (Number.isInteger(defaultCategoryId) && defaultCategoryId > 0) {
    localStorage.setItem(DEFAULT_CATEGORY_STORAGE_KEY, String(defaultCategoryId));
  } else {
    localStorage.removeItem(DEFAULT_CATEGORY_STORAGE_KEY);
  }

  const userLanguageNames = getLanguageNamesFromUser(user);

  if (userLanguageNames.length > 0) {
    saveUserLanguagePreferences(userLanguageNames, userLanguageNames[0]);
  }
}

async function loadUserProfile() {
  const authUserId = getAuthenticatedUserId();

  if (!authUserId) {
    clearAuthSession();
    redirectToLogin();
    return;
  }

  try {
    const [user, categories] = await Promise.all([
      fetchWithAuth(`/auth/${authUserId}`),
      fetchWithAuth("/categories"),
    ]);

    userCategories = Array.isArray(categories) ? categories : [];
    storeUserSession(user);
    updateSummary(user, userCategories);
    populateForm(user);
    setHeader();
  } catch (error) {
    setFeedback(accountFeedbackEl, error.message, "error");
  }
}

if (accountForm) {
  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const authUserId = getAuthenticatedUserId();
    const pseudo = pseudoInput ? pseudoInput.value.trim() : "";
    const mail = mailInput ? mailInput.value.trim() : "";
    const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
    const password = passwordInput ? passwordInput.value : "";
    const selectedLanguages = getSelectedLanguages();

    if (!authUserId) {
      clearAuthSession();
      redirectToLogin();
      return;
    }

    if (!pseudo || !mail) {
      setFeedback(accountFeedbackEl, "Pseudo et e-mail sont obligatoires.", "error");
      return;
    }

    if (selectedLanguages.length === 0) {
      setFeedback(accountFeedbackEl, "Sélectionnez au moins une langue.", "error");
      return;
    }

    if (password.trim() !== "" && currentPassword.trim() === "") {
      setFeedback(
        accountFeedbackEl,
        "Saisissez votre mot de passe actuel pour confirmer le changement.",
        "error"
      );
      return;
    }

    setFeedback(accountFeedbackEl, "");
    setSubmitState(
      accountForm,
      true,
      "Enregistrer les modifications",
      "Enregistrement..."
    );

    const payload = {
      pseudo,
      mail,
      spoken_languages: selectedLanguages,
    };

    if (password.trim() !== "") {
      payload.current_password = currentPassword;
      payload.password = password;
    }

    try {
      const data = await fetchWithAuth(`/auth/${authUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (data && data.user) {
        storeUserSession(data.user);
        updateSummary(data.user, userCategories);
        populateForm(data.user);
        setHeader();
      }

      setFeedback(
        accountFeedbackEl,
        data.message || "Profil mis à jour avec succès.",
        "success"
      );
    } catch (error) {
      setFeedback(accountFeedbackEl, error.message, "error");
    } finally {
      setSubmitState(
        accountForm,
        false,
        "Enregistrer les modifications",
        "Enregistrement..."
      );
    }
  });
}

if (deleteForm) {
  deleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const authUserId = getAuthenticatedUserId();
    const confirmationText = deleteConfirmInput
      ? deleteConfirmInput.value.trim().toUpperCase()
      : "";

    if (!authUserId) {
      clearAuthSession();
      redirectToLogin();
      return;
    }

    if (confirmationText !== DELETE_CONFIRMATION_TEXT) {
      setFeedback(
        deleteFeedbackEl,
        'Tapez exactement "SUPPRIMER" pour confirmer.',
        "error"
      );
      return;
    }

    setFeedback(deleteFeedbackEl, "");
    setSubmitState(
      deleteForm,
      true,
      "Supprimer définitivement",
      "Suppression..."
    );

    try {
      const data = await fetchWithAuth(`/auth/${authUserId}`, {
        method: "DELETE",
      });

      clearAuthSession();
      const destinationUrl = new URL("html/connexion.html", APP_BASE_URL);
      destinationUrl.hash = "#login";
      window.location.assign(destinationUrl.href);
      setFeedback(
        deleteFeedbackEl,
        data.message || "Compte supprimé avec succès.",
        "success"
      );
    } catch (error) {
      setFeedback(deleteFeedbackEl, error.message, "error");
      setSubmitState(
        deleteForm,
        false,
        "Supprimer définitivement",
        "Suppression..."
      );
    }
  });
}

loadUserProfile();
