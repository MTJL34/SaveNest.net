// Ce script gere la vue d'administration des categories par utilisateur.
import { setFooter, setHeader } from "./layout.js";
import { getApiBaseUrl, getServerUnavailableMessage } from "./apiConfig.js";

setHeader();
setFooter();

const API_BASE_URL = getApiBaseUrl();
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";
const AUTH_USER_STORAGE_KEY = "savenest_auth_user";

const feedbackEl = document.querySelector(".js_adminFeedback");
const countEl = document.querySelector(".js_adminCount");
const usersListEl = document.querySelector(".js_adminUsersList");
const tableBodyEl = document.querySelector(".js_adminTableBody");
const selectedTitleEl = document.querySelector(".js_adminSelectedTitle");
const selectedMetaEl = document.querySelector(".js_adminSelectedMeta");
const detailPseudoEl = document.querySelector(".js_adminDetailPseudo");
const detailMailEl = document.querySelector(".js_adminDetailMail");
const detailDateEl = document.querySelector(".js_adminDetailDate");
const detailDefaultCategoryEl = document.querySelector(".js_adminDetailDefaultCategory");
const detailLanguagesEl = document.querySelector(".js_adminDetailLanguages");
const detailRoleEl = document.querySelector(".js_adminDetailRole");

let adminUsers = [];
let selectedUserId = null;

function sortAdminUsers(users) {
  const sortedUsers = Array.isArray(users)
    ? users.map((user, index) => ({ user, index }))
    : [];
  const connectedUser = getStoredAuthUser();
  const connectedUserId = Number(connectedUser?.id_user);

  sortedUsers.sort((left, right) => {
    const leftId = Number(left.user?.id_user);
    const rightId = Number(right.user?.id_user);
    const leftIsConnected =
      Number.isInteger(connectedUserId) &&
      connectedUserId > 0 &&
      leftId === connectedUserId;
    const rightIsConnected =
      Number.isInteger(connectedUserId) &&
      connectedUserId > 0 &&
      rightId === connectedUserId;

    if (leftIsConnected && !rightIsConnected) {
      return -1;
    }

    if (!leftIsConnected && rightIsConnected) {
      return 1;
    }

    return left.index - right.index;
  });

  return sortedUsers.map((entry) => entry.user);
}

function setFeedback(message, type = "") {
  if (!feedbackEl) {
    return;
  }

  feedbackEl.textContent = message || "";
  feedbackEl.classList.remove("is-error");

  if (type === "error") {
    feedbackEl.classList.add("is-error");
  }
}

function redirectToLogin() {
  window.location.assign("../html/connexion.html#login");
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function getStoredAuthUser() {
  try {
    const rawUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function fetchWithAuth(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    redirectToLogin();
    throw new Error("Connectez-vous pour accéder à l'administration.");
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
    redirectToLogin();
    throw new Error(data.message || "Votre session a expiré.");
  }

  if (response.status === 403) {
    throw new Error(data.message || "Accès réservé à l'administration.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Impossible de charger les données.");
  }

  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getVisibilityLabel(value) {
  const isPrivate = value === 1 || value === "1" || value === true;

  return {
    label: isPrivate ? "Privée" : "Publique",
    className: isPrivate ? "is-private" : "is-public",
  };
}

function formatRegistrationDate(value) {
  if (!value) {
    return "Inconnue";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(parsedDate);
}

function getLanguageNames(user) {
  if (!user || !Array.isArray(user.spoken_languages)) {
    return [];
  }

  const names = [];

  for (let index = 0; index < user.spoken_languages.length; index += 1) {
    const entry = user.spoken_languages[index];
    const name =
      typeof entry === "string"
        ? entry
        : entry && typeof entry.language_name === "string"
          ? entry.language_name
          : "";

    if (!name || names.includes(name)) {
      continue;
    }

    names.push(name);
  }

  return names;
}

function getDefaultCategoryLabel(user, categories) {
  const defaultCategoryId = Number(user?.default_category_id);

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

function renderUserDetails(user = null, categories = []) {
  if (detailPseudoEl) {
    detailPseudoEl.textContent = user?.pseudo || "-";
  }

  if (detailMailEl) {
    detailMailEl.textContent = user?.mail || "-";
  }

  if (detailDateEl) {
    detailDateEl.textContent = formatRegistrationDate(user?.date_inscription);
  }

  if (detailDefaultCategoryEl) {
    detailDefaultCategoryEl.textContent = user
      ? getDefaultCategoryLabel(user, categories)
      : "-";
  }

  if (detailLanguagesEl) {
    const languageNames = getLanguageNames(user);
    detailLanguagesEl.textContent =
      languageNames.length > 0 ? languageNames.join(", ") : "Aucune";
  }

  if (detailRoleEl) {
    detailRoleEl.textContent =
      user?.role_label || user?.role_code || "Utilisateur";
  }
}

function renderEmptyCategories(message) {
  if (!tableBodyEl) {
    return;
  }

  tableBodyEl.innerHTML = `
    <tr>
      <td colspan="2">${escapeHtml(message)}</td>
    </tr>
  `;
}

function renderUsers() {
  if (!usersListEl) {
    return;
  }

  if (!Array.isArray(adminUsers) || adminUsers.length === 0) {
    usersListEl.innerHTML = '<p class="admin-empty">Aucun utilisateur à afficher.</p>';
    return;
  }

  let html = "";

  for (let index = 0; index < adminUsers.length; index += 1) {
    const user = adminUsers[index];
    const isActive = Number(user.id_user) === Number(selectedUserId);

    html += `
      <button
        type="button"
        class="admin-user-btn${isActive ? " is-active" : ""}"
        data-admin-user-id="${escapeHtml(user.id_user)}"
      >
        <strong>${escapeHtml(user.pseudo || `Utilisateur #${user.id_user}`)}</strong>
      </button>
    `;
  }

  usersListEl.innerHTML = html;
}

function renderCategories(categories) {
  if (!tableBodyEl) {
    return;
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    renderEmptyCategories("Aucune catégorie pour cet utilisateur.");
    return;
  }

  let html = "";

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const visibility = getVisibilityLabel(category.confidentiality);

    html += `
      <tr>
        <td>${escapeHtml(category.category_name)}</td>
        <td>
          <span class="admin-visibility ${visibility.className}">
            ${visibility.label}
          </span>
        </td>
      </tr>
    `;
  }

  tableBodyEl.innerHTML = html;
}

async function loadCategoriesForUser(userId) {
  selectedUserId = Number(userId);
  renderUsers();
  setFeedback("");
  renderEmptyCategories("Chargement des catégories…");
  renderUserDetails();

  try {
    const [categoryData, user] = await Promise.all([
      fetchWithAuth(`/categories/admin/user/${userId}`),
      fetchWithAuth(`/auth/${userId}`),
    ]);
    const categories = Array.isArray(categoryData.categories)
      ? categoryData.categories
      : [];

    if (selectedTitleEl) {
      selectedTitleEl.textContent = user
        ? `Catégories de ${user.pseudo || `Utilisateur #${user.id_user}`}`
        : "Utilisateur introuvable";
    }

    if (selectedMetaEl) {
      selectedMetaEl.textContent = user
        ? `${categories.length} catégorie(s) pour ce pseudo`
        : "Aucune information disponible.";
    }

    renderUserDetails(user, categories);
    renderCategories(categories);
  } catch (error) {
    setFeedback(error.message, "error");
    renderUserDetails();

    if (selectedTitleEl) {
      selectedTitleEl.textContent = "Chargement impossible";
    }

    if (selectedMetaEl) {
      selectedMetaEl.textContent = "Impossible de récupérer les catégories de cet utilisateur.";
    }

    renderEmptyCategories("Impossible de charger les catégories.");
  }
}

async function loadAdminUsers() {
  const authUser = getStoredAuthUser();

  if (
    !authUser ||
    (authUser.role_code !== "ADMIN" && authUser.role_code !== "MODERATOR")
  ) {
    setFeedback("Cette page est réservée à l'administration et à la modération.", "error");
    renderEmptyCategories("Accès refusé.");

    if (usersListEl) {
      usersListEl.innerHTML = '<p class="admin-empty">Accès refusé.</p>';
    }

    if (countEl) {
      countEl.textContent = "Accès refusé";
    }

    return;
  }

  try {
    const users = await fetchWithAuth("/auth");
    adminUsers = sortAdminUsers(users);
    renderUsers();

    if (countEl) {
      countEl.textContent = `${adminUsers.length} utilisateur(s)`;
    }

    if (adminUsers.length > 0) {
      await loadCategoriesForUser(adminUsers[0].id_user);
    } else {
      renderEmptyCategories("Aucun utilisateur à afficher.");
    }
  } catch (error) {
    setFeedback(error.message, "error");

    if (usersListEl) {
      usersListEl.innerHTML =
        '<p class="admin-empty">Impossible de charger les utilisateurs.</p>';
    }

    renderEmptyCategories("Impossible de charger les utilisateurs.");

    if (countEl) {
      countEl.textContent = "Chargement impossible";
    }
  }
}

if (usersListEl) {
  usersListEl.addEventListener("click", async (event) => {
    const userButton = event.target.closest("[data-admin-user-id]");

    if (!userButton) {
      return;
    }

    const nextUserId = Number(userButton.dataset.adminUserId);

    if (!Number.isInteger(nextUserId) || nextUserId <= 0) {
      return;
    }

    if (nextUserId === selectedUserId) {
      return;
    }

    await loadCategoriesForUser(nextUserId);
  });
}

loadAdminUsers();
