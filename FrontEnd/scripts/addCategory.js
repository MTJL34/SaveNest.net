import { setHeader, setFooter } from "../scripts/layout.js";
import { category } from "../data/category.js";

const mainEl = document.querySelector(".js_main");

setHeader();
setFooter();

const categories = category.map((item) => ({ ...item }));

let currentMode = "view";
let editingCategoryId = null;
let actionMessage = "";
let actionMessageType = "";

function normalizeConfidentiality(value, password = "") {
  const normalized = String(value || "").toLowerCase();
  const hasPassword = typeof password === "string" && password.trim() !== "";

  if (normalized === "private") return "Private";
  if (normalized === "public") return "Public";
  return hasPassword ? "Private" : "Public";
}

function resolveCategorySecurity({
  confidentiality,
  password,
  messageEl,
  privacySelect,
}) {
  const trimmedPassword = String(password || "").trim();

  if (confidentiality === "Private" && !trimmedPassword) {
    messageEl.textContent = "Ajoute un mot de passe pour une catégorie privée.";
    messageEl.className = "form-message is-error";
    return null;
  }

  if (confidentiality === "Public" && trimmedPassword) {
    const shouldProtect = window.confirm(
      "Un mot de passe a été saisi. Voulez-vous passer cette catégorie en privée ?"
    );

    if (!shouldProtect) {
      messageEl.textContent =
        "Pour une catégorie publique, laissez le mot de passe vide.";
      messageEl.className = "form-message is-error";
      return null;
    }

    if (privacySelect) {
      privacySelect.value = "Private";
    }

    return {
      confidentiality: "Private",
      password: trimmedPassword,
    };
  }

  return {
    confidentiality,
    password: confidentiality === "Private" ? trimmedPassword : "",
  };
}

function getActionButtonClass(mode) {
  return currentMode === mode ? "btn-primary is-active" : "btn-primary";
}

function renderEditPanel() {
  if (currentMode !== "edit" || !editingCategoryId) {
    return "";
  }

  const selectedCategory = categories.find(
    (item) => String(item.id_category) === String(editingCategoryId)
  );

  if (!selectedCategory) {
    return "";
  }

  const confidentiality = normalizeConfidentiality(
    selectedCategory.confidentiality,
    selectedCategory.password
  );

  return `
    <section class="inline-edit panel">
      <h2>Modifier la catégorie #${selectedCategory.id_category}</h2>
      <form id="inlineEditForm" class="category-form">
        <label for="inlineEditName">Nom</label>
        <input id="inlineEditName" type="text" value="${selectedCategory.category_name}" required />

        <label for="inlineEditPrivacy">Confidentialité</label>
        <select id="inlineEditPrivacy">
          <option value="Public" ${confidentiality === "Public" ? "selected" : ""}>Publique</option>
          <option value="Private" ${confidentiality === "Private" ? "selected" : ""}>Privée</option>
        </select>

        <label for="inlineEditPassword">Mot de passe (si privée)</label>
        <input
          id="inlineEditPassword"
          type="password"
          value="${selectedCategory.password || ""}"
          placeholder="Optionnel si publique"
          ${confidentiality === "Private" ? "required" : ""}
        />

        <div class="inline-edit-actions">
          <button type="submit" class="btn-primary">Enregistrer</button>
          <button type="button" id="cancelInlineEdit" class="btn-primary">Annuler</button>
        </div>
        <p id="inlineEditMessage" class="form-message" aria-live="polite"></p>
      </form>
    </section>
  `;
}

function renderPage() {
  const totalCount = categories.length;
  const privateCount = categories.filter(
    (item) =>
      normalizeConfidentiality(item.confidentiality, item.password) === "Private"
  ).length;
  const publicCount = totalCount - privateCount;

  const cards = categories
    .map((item) => {
      const mode = normalizeConfidentiality(item.confidentiality, item.password);
      const isPrivate = mode === "Private";
      const isSelected =
        currentMode === "edit" && String(item.id_category) === String(editingCategoryId);
      const interactiveClass = currentMode === "view" ? "" : "is-clickable";

      return `
        <article
          class="category-card ${isPrivate ? "is-private" : "is-public"} ${interactiveClass} ${isSelected ? "is-selected" : ""}"
          data-category-id="${item.id_category}"
        >
          ${isPrivate ? '<span class="lock-emoji" title="Catégorie protégée" aria-label="Catégorie protégée">🔒</span>' : ""}
          <div class="category-top">
            <p class="category-id">#${item.id_category}</p>
            <span class="badge">${isPrivate ? "Privée" : "Publique"}</span>
          </div>
          <h3>${item.category_name}</h3>
          <p class="category-meta">
            ${isPrivate ? "Protégée par mot de passe" : "Visible sans mot de passe"}
          </p>
        </article>
      `;
    })
    .join("");

  const helperText =
    currentMode === "edit"
      ? "Mode modification actif: clique sur une catégorie pour l'éditer."
      : currentMode === "delete"
        ? "Mode suppression actif: clique sur une catégorie pour la supprimer."
        : "Choisis une action puis clique sur une catégorie.";

  mainEl.innerHTML = `
    <section class="hero">
      <h1>Mes Catégories</h1>
      <p>Ajoute tes espaces de rangement et garde une vue claire sur ton organisation.</p>
    </section>

    <section class="layout">
      <aside class="panel form-panel">
        <h2>Nouvelle catégorie</h2>
        <form id="categoryForm" class="category-form">
          <label for="categoryName">Nom</label>
          <input id="categoryName" type="text" placeholder="Ex: Productivité" required />

          <label for="categoryPrivacy">Confidentialité</label>
          <select id="categoryPrivacy">
            <option value="Public">Publique</option>
            <option value="Private">Privée</option>
          </select>

          <label for="categoryPassword">Mot de passe (si privée)</label>
          <input id="categoryPassword" type="password" placeholder="Optionnel si publique" />

          <button type="submit" class="btn-primary">Ajouter la catégorie</button>
          <p id="categoryMessage" class="form-message" aria-live="polite"></p>
        </form>
      </aside>

      <section class="panel list-panel">
        <div class="stats">
          <div class="stat">
            <p class="stat-value">${totalCount}</p>
            <p class="stat-label">Total</p>
          </div>
          <div class="stat">
            <p class="stat-value">${publicCount}</p>
            <p class="stat-label">Publiques</p>
          </div>
          <div class="stat">
            <p class="stat-value">${privateCount}</p>
            <p class="stat-label">Privées</p>
          </div>
        </div>

        <div class="cards-grid" id="cardsGrid">
          ${cards}
        </div>

        <div class="category-actions">
          <button id="enterEditMode" class="${getActionButtonClass("edit")}">Modifier</button>
          <button id="enterDeleteMode" class="${getActionButtonClass("delete")}">Supprimer</button>
          <button id="exitActionMode" class="btn-primary">Annuler l'action</button>
        </div>

        <p class="action-helper">${helperText}</p>
        <p class="form-message ${actionMessageType ? `is-${actionMessageType}` : ""}" id="actionMessage" aria-live="polite">${actionMessage}</p>

        ${renderEditPanel()}
      </section>
    </section>
  `;

  setupFormEvents();
}

function setupFormEvents() {
  const form = document.getElementById("categoryForm");
  const nameInput = document.getElementById("categoryName");
  const privacySelect = document.getElementById("categoryPrivacy");
  const passwordInput = document.getElementById("categoryPassword");
  const messageEl = document.getElementById("categoryMessage");
  const cardsGrid = document.getElementById("cardsGrid");
  const enterEditModeBtn = document.getElementById("enterEditMode");
  const enterDeleteModeBtn = document.getElementById("enterDeleteMode");
  const exitActionModeBtn = document.getElementById("exitActionMode");
  const inlineEditForm = document.getElementById("inlineEditForm");
  const cancelInlineEditBtn = document.getElementById("cancelInlineEdit");

  privacySelect.addEventListener("change", () => {
    if (privacySelect.value === "Private") {
      passwordInput.setAttribute("required", "required");
    } else {
      passwordInput.removeAttribute("required");
      passwordInput.value = "";
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const confidentiality = privacySelect.value;
    const password = passwordInput.value.trim();

    if (!name) {
      messageEl.textContent = "Le nom de catégorie est obligatoire.";
      messageEl.className = "form-message is-error";
      return;
    }

    const security = resolveCategorySecurity({
      confidentiality,
      password,
      messageEl,
      privacySelect,
    });

    if (!security) return;

    const ids = categories.map((item) => Number(item.id_category)).filter(Number.isFinite);
    const nextId = String(ids.length > 0 ? Math.max(...ids) + 1 : 1);

    categories.push({
      id_category: nextId,
      category_name: name,
      confidentiality: security.confidentiality,
      password: security.password,
    });

    actionMessage = "Catégorie ajoutée avec succès.";
    actionMessageType = "success";
    renderPage();
  });

  enterEditModeBtn.addEventListener("click", () => {
    currentMode = "edit";
    editingCategoryId = null;
    actionMessage = "";
    actionMessageType = "";
    renderPage();
  });

  enterDeleteModeBtn.addEventListener("click", () => {
    currentMode = "delete";
    editingCategoryId = null;
    actionMessage = "";
    actionMessageType = "";
    renderPage();
  });

  exitActionModeBtn.addEventListener("click", () => {
    currentMode = "view";
    editingCategoryId = null;
    actionMessage = "";
    actionMessageType = "";
    renderPage();
  });

  cardsGrid.addEventListener("click", (event) => {
    const cardEl = event.target.closest(".category-card");
    if (!cardEl || currentMode === "view") return;

    const selectedId = cardEl.dataset.categoryId;
    const selectedCategory = categories.find(
      (item) => String(item.id_category) === String(selectedId)
    );

    if (!selectedCategory) return;

    if (currentMode === "edit") {
      editingCategoryId = selectedId;
      actionMessage = "";
      actionMessageType = "";
      renderPage();
      return;
    }

    if (currentMode === "delete") {
      const isConfirmed = window.confirm(
        `Confirmer la suppression de la catégorie "${selectedCategory.category_name}" ?`
      );

      if (!isConfirmed) return;

      const nextCategories = categories.filter(
        (item) => String(item.id_category) !== String(selectedId)
      );

      categories.length = 0;
      categories.push(...nextCategories);

      actionMessage = "Catégorie supprimée avec succès.";
      actionMessageType = "success";
      renderPage();
    }
  });

  if (cancelInlineEditBtn) {
    cancelInlineEditBtn.addEventListener("click", () => {
      editingCategoryId = null;
      actionMessage = "";
      actionMessageType = "";
      renderPage();
    });
  }

  if (inlineEditForm) {
    const inlineEditPrivacy = document.getElementById("inlineEditPrivacy");
    const inlineEditPassword = document.getElementById("inlineEditPassword");
    const inlineEditName = document.getElementById("inlineEditName");
    const inlineEditMessage = document.getElementById("inlineEditMessage");

    inlineEditPrivacy.addEventListener("change", () => {
      if (inlineEditPrivacy.value === "Private") {
        inlineEditPassword.setAttribute("required", "required");
      } else {
        inlineEditPassword.removeAttribute("required");
        inlineEditPassword.value = "";
      }
    });

    inlineEditForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const selectedCategory = categories.find(
        (item) => String(item.id_category) === String(editingCategoryId)
      );

      if (!selectedCategory) return;

      const name = inlineEditName.value.trim();
      const confidentiality = inlineEditPrivacy.value;
      const password = inlineEditPassword.value.trim();

      if (!name) {
        inlineEditMessage.textContent = "Le nom de catégorie est obligatoire.";
        inlineEditMessage.className = "form-message is-error";
        return;
      }

      const security = resolveCategorySecurity({
        confidentiality,
        password,
        messageEl: inlineEditMessage,
        privacySelect: inlineEditPrivacy,
      });

      if (!security) return;

      selectedCategory.category_name = name;
      selectedCategory.confidentiality = security.confidentiality;
      selectedCategory.password = security.password;

      editingCategoryId = null;
      actionMessage = "Catégorie mise à jour avec succès.";
      actionMessageType = "success";
      renderPage();
    });
  }
}

renderPage();
