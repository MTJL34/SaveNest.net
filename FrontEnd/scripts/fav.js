import { setHeader, setFooter } from "../scripts/layout.js";

const API_BASE_URL = "http://localhost:3000/api";
const AUTH_TOKEN_STORAGE_KEY = "savenest_auth_token";

setHeader();
setFooter();

let categories = [];
let favorites = [];

const html = `
  <section class="panel info">
    <h2>Votre nid, vos favoris</h2>
    <p>Ajoutez ici un site, une app, un outil ou un film à garder bien au chaud. 🌰</p>
    <ul class="tips">
      <li>Classez par <strong>catégorie</strong>.</li>
    </ul>
  </section>

  <section class="forms-row">
    <section class="panel form">
      <h1>Ajouter un favori 🪺</h1>
      <form id="favForm" class="form-grid">
        <div class="field">
          <label for="favTitle">Titre</label>
          <input id="favTitle" type="text" placeholder="Ex: Princess Mononoke" required />
          <p class="help">Nom du site, de l'application ou titre du film.</p>
        </div>

        <div class="field url-field">
          <label for="favUrl">URL</label>
          <input id="favUrl" type="url" placeholder="https://exemple.com" required />
          <p class="help">Lien vers le site, l'outil ou la fiche du film.</p>
        </div>

        <div class="field category-field">
          <label for="favCategory">Catégorie</label>
          <select id="favCategory" required>
            <option value="">-- Sélectionnez une catégorie --</option>
          </select>
        </div>

        <div class="actions">
          <button type="submit" class="btn btn-primary">Ajouter</button>
          <button type="reset" class="btn btn-ghost">Réinitialiser</button>
        </div>

        <p id="favFormMessage" class="help" aria-live="polite"></p>
      </form>
    </section>

    <section class="panel edit">
      <h2>Modifier un favori</h2>
      <div>
        <h3>Liste des favoris</h3>
        <ul id="favDraftList" class="fav-draft-list"></ul>
        <p id="emptyState" class="help">Aucun favori pour le moment.</p>
      </div>

      <form id="editFavForm" class="form-grid">
        <div class="field category-field">
          <label for="editFavId">Favori à modifier</label>
          <select id="editFavId" required>
            <option value="">-- Choisissez un favori --</option>
          </select>
        </div>

        <div class="field">
          <label for="editFavTitle">Titre</label>
          <input id="editFavTitle" type="text" required />
        </div>

        <div class="field url-field">
          <label for="editFavUrl">URL</label>
          <input id="editFavUrl" type="url" required />
        </div>

        <div class="field category-field">
          <label for="editFavCategory">Catégorie</label>
          <select id="editFavCategory" required>
            <option value="">-- Sélectionnez une catégorie --</option>
          </select>
        </div>

        <div class="actions">
          <button type="submit" class="btn btn-primary">Mettre à jour</button>
        </div>

        <p id="editFavMessage" class="help" aria-live="polite"></p>
      </form>
    </section>

    <section class="panel delete">
      <h2>Supprimer un favori</h2>
      <form id="deleteFavForm" class="form-grid">
        <div class="field category-field">
          <label for="deleteFavId">Favori à supprimer</label>
          <select id="deleteFavId" required>
            <option value="">-- Choisissez un favori --</option>
          </select>
        </div>

        <div class="actions">
          <button type="submit" class="btn btn-primary">Supprimer</button>
        </div>

        <p id="deleteFavMessage" class="help" aria-live="polite"></p>
      </form>
    </section>
  </section>
`;

document.querySelector(".js_main").innerHTML = html;

const favForm = document.getElementById("favForm");
const favDraftList = document.getElementById("favDraftList");
const emptyState = document.getElementById("emptyState");
const favTitle = document.getElementById("favTitle");
const favUrl = document.getElementById("favUrl");
const favCategory = document.getElementById("favCategory");
const favFormMessage = document.getElementById("favFormMessage");
const editFavForm = document.getElementById("editFavForm");
const editFavId = document.getElementById("editFavId");
const editFavTitle = document.getElementById("editFavTitle");
const editFavUrl = document.getElementById("editFavUrl");
const editFavCategory = document.getElementById("editFavCategory");
const editFavMessage = document.getElementById("editFavMessage");
const deleteFavForm = document.getElementById("deleteFavForm");
const deleteFavId = document.getElementById("deleteFavId");
const deleteFavMessage = document.getElementById("deleteFavMessage");
const addSubmitButton = favForm.querySelector('button[type="submit"]');
const editSubmitButton = editFavForm.querySelector('button[type="submit"]');
const deleteSubmitButton = deleteFavForm.querySelector('button[type="submit"]');

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

async function fetchWithAuth(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    redirectToLogin();
    throw new Error("Connectez-vous pour gérer vos favoris.");
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

function setMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = `help${type ? ` is-${type}` : ""}`;
}

function getCategoryOptionsMarkup() {
  return categories
    .map(
      (category) =>
        `<option value="${category.id_category}">${category.category_name}</option>`
    )
    .join("");
}

function renderCategorySelects() {
  const options = getCategoryOptionsMarkup();

  favCategory.innerHTML = `<option value="">-- Sélectionnez une catégorie --</option>${options}`;
  editFavCategory.innerHTML = `<option value="">-- Sélectionnez une catégorie --</option>${options}`;
}

function renderFavoritesList() {
  favDraftList.innerHTML = favorites
    .map(
      (fav) => `
        <li class="fav-draft-item">
          <div class="fav-draft-content">
            <strong>#${fav.id_favs} - ${fav.title_favs}</strong>
            <a href="${fav.url_favs}" target="_blank" rel="noopener noreferrer">${fav.url_favs}</a>
            <small>Catégorie: ${fav.category_name}</small>
          </div>
        </li>
      `
    )
    .join("");

  emptyState.style.display = favorites.length === 0 ? "block" : "none";
}

function renderSelectOptions() {
  const options = favorites
    .map(
      (fav) => `<option value="${fav.id_favs}">#${fav.id_favs} - ${fav.title_favs}</option>`
    )
    .join("");

  editFavId.innerHTML = `<option value="">-- Choisissez un favori --</option>${options}`;
  deleteFavId.innerHTML = `<option value="">-- Choisissez un favori --</option>${options}`;
}

function fillEditForm(selectedId) {
  const fav = favorites.find((item) => String(item.id_favs) === String(selectedId));

  if (!fav) {
    editFavForm.reset();
    return;
  }

  editFavTitle.value = fav.title_favs || "";
  editFavUrl.value = fav.url_favs || "";
  editFavCategory.value = String(fav.id_category || "");
}

function syncFormAvailability() {
  const hasCategories = categories.length > 0;
  const hasFavorites = favorites.length > 0;

  favCategory.disabled = !hasCategories;
  editFavCategory.disabled = !hasCategories;
  addSubmitButton.disabled = !hasCategories;

  editFavId.disabled = !hasFavorites;
  deleteFavId.disabled = !hasFavorites;
  editSubmitButton.disabled = !hasFavorites || !hasCategories;
  deleteSubmitButton.disabled = !hasFavorites;

  if (!hasCategories) {
    setMessage(
      favFormMessage,
      "Créez d'abord une catégorie avant d'ajouter un favori.",
      "error"
    );
  }
}

function sortFavoritesById() {
  favorites.sort((left, right) => Number(left.id_favs) - Number(right.id_favs));
}

function refreshUI() {
  sortFavoritesById();
  renderCategorySelects();
  renderFavoritesList();
  renderSelectOptions();
  syncFormAvailability();
}

async function loadPageData() {
  setMessage(favFormMessage, "Chargement des données...");

  try {
    const [categoriesData, favoritesData] = await Promise.all([
      fetchWithAuth("/categories"),
      fetchWithAuth("/favs"),
    ]);

    categories = Array.isArray(categoriesData) ? categoriesData : [];
    favorites = Array.isArray(favoritesData) ? favoritesData : [];
    refreshUI();

    if (categories.length > 0) {
      setMessage(favFormMessage, "");
    }
  } catch (error) {
    categories = [];
    favorites = [];
    refreshUI();
    setMessage(
      favFormMessage,
      error.message || "Impossible de charger les catégories et les favoris.",
      "error"
    );
  }
}

favForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = favTitle.value.trim();
  const url = favUrl.value.trim();
  const categoryId = Number(favCategory.value);

  if (!title || !url || !categoryId) {
    setMessage(favFormMessage, "Tous les champs sont obligatoires.", "error");
    return;
  }

  try {
    const data = await fetchWithAuth("/favs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title_favs: title,
        url_favs: url,
        id_category: categoryId,
      }),
    });

    favorites.push(data.fav);
    refreshUI();
    favForm.reset();
    setMessage(favFormMessage, data.message || "Favori ajouté avec succès.", "success");
  } catch (error) {
    setMessage(
      favFormMessage,
      error.message || "Impossible d'ajouter le favori pour le moment.",
      "error"
    );
  }
});

editFavId.addEventListener("change", () => {
  fillEditForm(editFavId.value);
  setMessage(editFavMessage, "");
});

editFavForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedId = Number(editFavId.value);
  const title = editFavTitle.value.trim();
  const url = editFavUrl.value.trim();
  const categoryId = Number(editFavCategory.value);

  if (!selectedId || !title || !url || !categoryId) {
    setMessage(editFavMessage, "Tous les champs sont obligatoires.", "error");
    return;
  }

  try {
    const data = await fetchWithAuth(`/favs/${selectedId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title_favs: title,
        url_favs: url,
        id_category: categoryId,
      }),
    });

    favorites = favorites.map((fav) =>
      Number(fav.id_favs) === selectedId ? data.fav : fav
    );
    refreshUI();
    editFavId.value = String(selectedId);
    fillEditForm(selectedId);
    setMessage(editFavMessage, data.message || "Favori mis à jour avec succès.", "success");
  } catch (error) {
    setMessage(
      editFavMessage,
      error.message || "Impossible de mettre à jour le favori pour le moment.",
      "error"
    );
  }
});

deleteFavForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedId = Number(deleteFavId.value);
  const favToDelete = favorites.find((item) => Number(item.id_favs) === selectedId);

  if (!favToDelete) {
    setMessage(deleteFavMessage, "Choisissez un favori à supprimer.", "error");
    return;
  }

  const isConfirmed = window.confirm(
    `Confirmer la suppression du favori "${favToDelete.title_favs}" ?`
  );

  if (!isConfirmed) return;

  try {
    const data = await fetchWithAuth(`/favs/${selectedId}`, {
      method: "DELETE",
    });

    favorites = favorites.filter((item) => Number(item.id_favs) !== selectedId);
    refreshUI();
    deleteFavForm.reset();
    editFavForm.reset();
    setMessage(deleteFavMessage, data.message || "Favori supprimé avec succès.", "success");
    setMessage(editFavMessage, "");
  } catch (error) {
    setMessage(
      deleteFavMessage,
      error.message || "Impossible de supprimer le favori pour le moment.",
      "error"
    );
  }
});

refreshUI();
loadPageData();
