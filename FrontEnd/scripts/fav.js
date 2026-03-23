import { setHeader, setFooter } from "../scripts/layout.js";
import { category } from "../data/category.js";

setHeader();
setFooter();

// Génère les <option> à partir du tableau "category"
export function getCategoriesOptions() {
  return category
    .map((cat) => {
      return `<option value="${cat.category_name}">${cat.category_name}</option>`;
    })
    .join("");
}

let html = ``;

html += `
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

      <!-- Champ titre -->
      <div class="field">
        <label for="favTitle">Titre</label>
        <input id="favTitle" type="text" placeholder="Ex: Princess Mononoke" required />
        <p class="help">Nom du site, de l'application ou titre du film.</p>
      </div>

      <!-- ✅ Nouveau champ URL -->
      <div class="field url-field">
        <label for="favUrl">URL</label>
        <input id="favUrl" type="url" placeholder="https://exemple.com" required />
        <p class="help">Lien vers le site, l’outil ou la fiche du film.</p>
      </div>

      <!-- Catégorie -->
      <div class="field category-field">
        <label for="favCategory">Catégorie</label>
        <select id="favCategory" required>
          <option value="">-- Sélectionnez une catégorie --</option>
          ${getCategoriesOptions()}
        </select>
      </div>

      <div class="actions">
        <button type="submit" class="btn btn-primary">Ajouter</button>
        <button type="reset" class="btn btn-ghost">Réinitialiser</button>
      </div>

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
          ${getCategoriesOptions()}
        </select>
      </div>

      <div class="actions">
        <button type="submit" class="btn btn-primary">Mettre à jour</button>
      </div>
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
    </form>
  </section>
  </section>
`;

document.querySelector(".js_main").innerHTML = html;

const favForm = document.getElementById("favForm");
const favDraftList = document.getElementById("favDraftList");
const emptyState = document.getElementById("emptyState");
const editFavForm = document.getElementById("editFavForm");
const editFavId = document.getElementById("editFavId");
const editFavTitle = document.getElementById("editFavTitle");
const editFavUrl = document.getElementById("editFavUrl");
const editFavCategory = document.getElementById("editFavCategory");
const deleteFavForm = document.getElementById("deleteFavForm");
const deleteFavId = document.getElementById("deleteFavId");

let favorites = [];
let nextId = 1;

function renderFavoritesList() {
  favDraftList.innerHTML = favorites
    .map(
      (fav) => `
      <li class="fav-draft-item">
        <div class="fav-draft-content">
          <strong>#${fav.id} - ${fav.title_favs}</strong>
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
    .map((fav) => `<option value="${fav.id}">#${fav.id} - ${fav.title}</option>`)
    .join("");

  editFavId.innerHTML = `<option value="">-- Choisissez un favori --</option>${options}`;
  deleteFavId.innerHTML = `<option value="">-- Choisissez un favori --</option>${options}`;
}

function refreshUI() {
  renderFavoritesList();
  renderSelectOptions();
}

favForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("favTitle").value.trim();
  const url = document.getElementById("favUrl").value.trim();
  const categoryName = document.getElementById("favCategory").value;

  if (!title || !url || !categoryName) return;

  favorites.push({
    id: nextId++,
    title_favs: title,
    url_favs: url,
    category_name: categoryName,
  });

  refreshUI();
  favForm.reset();
});

editFavId.addEventListener("change", () => {
  const selectedId = Number(editFavId.value);
  const fav = favorites.find((item) => item.id === selectedId);

  if (!fav) {
    editFavForm.reset();
    return;
  }

  editFavTitle.value = fav.title_favs;
  editFavUrl.value = fav.url_favs;
  editFavCategory.value = fav.category_name;
});


editFavForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedId = Number(editFavId.value);
  const index = favorites.findIndex((item) => item.id === selectedId);

  if (index === -1) return;

  favorites[index] = {
    ...favorites[index],
    title_favs: editFavTitle.value.trim(),
    url_favs: editFavUrl.value.trim(),
    category_name: editFavCategory.value,
  };

  refreshUI();
});

deleteFavForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedId = Number(deleteFavId.value);
  const favToDelete = favorites.find((item) => item.id === selectedId);

  if (!favToDelete) return;

  const isConfirmed = window.confirm(
    `Confirmer la suppression du favori "${favToDelete.title_favs}" ?`
  );

  if (!isConfirmed) return;

  favorites = favorites.filter((item) => item.id !== selectedId);

  refreshUI();
  deleteFavForm.reset();
  editFavForm.reset();
});

refreshUI();
