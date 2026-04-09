import { setHeader, setFooter } from "../scripts/layout.js";
import { category as categories } from "../data/category.js";
import { favs } from "../data/favs.js";

setHeader();
setFooter();

const UNLOCKED_CATEGORIES_STORAGE_KEY = "savenest_unlocked_categories";
const cardsContainerEl = document.querySelector(".js_content");

function loadUnlockedCategories() {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_CATEGORIES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id)));
  } catch (error) {
    return new Set();
  }
}

let unlockedCategoryIds = loadUnlockedCategories();

function persistUnlockedCategories() {
  sessionStorage.setItem(
    UNLOCKED_CATEGORIES_STORAGE_KEY,
    JSON.stringify([...unlockedCategoryIds])
  );
}

function getCategoryPrivacy(item) {
  const confidentiality = String(item.confidentiality || "").toLowerCase();
  const hasPassword = typeof item.password === "string" && item.password.trim() !== "";

  if (confidentiality === "private") return "Private";
  if (confidentiality === "public") return "Public";
  return hasPassword ? "Private" : "Public";
}

function isCategoryUnlocked(categoryId) {
  return unlockedCategoryIds.has(String(categoryId));
}

const bannerHtml = `
  <p>Vos contenus préférés, bien au chaud dans leur nid.</p>
  <button class="organiser-btn">🪹 <a href="../html/fav.html">Organiser mon nid</a></button>
`;

document.querySelector(".js_banner").innerHTML = bannerHtml;

function getFavicon(url) {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (error) {
    console.warn("URL invalide pour favicon :", url);
    return "https://www.google.com/s2/favicons?domain=example.com&sz=64";
  }
}

function getFavItemMarkup(fav) {
  const faviconUrl = getFavicon(fav.url_favs);
  const hasUrl = typeof fav.url_favs === "string" && fav.url_favs.trim() !== "";

  return `
    <li class="fav-item">
      <img
        src="${faviconUrl}"
        alt="favicon de ${fav.title_favs}"
        class="fav-icon"
      >
      ${
        hasUrl
          ? `<a href="${fav.url_favs}" target="_blank">${fav.title_favs}</a>`
          : `<span>${fav.title_favs}</span>`
      }
    </li>
  `;
}

function renderHomeCards() {
  let html = ``;

  categories.forEach((currentCategory) => {
    const categoryId = String(currentCategory.id_category);
    const privacy = getCategoryPrivacy(currentCategory);
    const isPrivate = privacy === "Private";
    const unlocked = !isPrivate || isCategoryUnlocked(categoryId);
    const lockEmoji = isPrivate ? (unlocked ? "🔓" : "🔒") : "";

    const favsOfCategory = favs.filter((fav) => String(fav.id_category) === categoryId);

    let cardBody = "";

    if (isPrivate && !unlocked) {
      cardBody = `
        <div class="private-locked">
          <p>Contenu protégé par mot de passe</p>
          <button type="button" class="hatch-btn" data-unlock-category="${categoryId}">
            🥚 Faire éclore l'œuf
          </button>
        </div>
      `;
    } else {
      const favsHtml =
        favsOfCategory.length > 0
          ? favsOfCategory.map(getFavItemMarkup).join("")
          : `<li class="empty-item">Aucun favori pour cette catégorie.</li>`;

      cardBody = `
        <ul>${favsHtml}</ul>
        ${
          isPrivate
            ? `<div class="private-actions">
                <button type="button" class="protect-btn" data-lock-category="${categoryId}">
                  🪺 Protéger le nid
                </button>
              </div>`
            : ""
        }
      `;
    }

    html += `
      <div class="card ${isPrivate ? "private-card" : "public-card"}">
        <h3>
          <span>${currentCategory.category_name}</span>
          ${isPrivate ? `<span class="title-lock" aria-label="État de protection">${lockEmoji}</span>` : ""}
        </h3>
        ${cardBody}
      </div>
    `;
  });

  cardsContainerEl.innerHTML = html;
}

cardsContainerEl.addEventListener("click", (event) => {
  const unlockBtn = event.target.closest("[data-unlock-category]");
  if (unlockBtn) {
    const categoryId = String(unlockBtn.dataset.unlockCategory);
    const selectedCategory = categories.find(
      (item) => String(item.id_category) === categoryId
    );

    if (!selectedCategory) return;

    const expectedPassword = String(selectedCategory.password || "");
    const userInput = window.prompt(
      `Mot de passe de la catégorie "${selectedCategory.category_name}" :`
    );

    if (userInput === null) return;

    if (expectedPassword && userInput !== expectedPassword) {
      window.alert("Mot de passe incorrect.");
      return;
    }

    unlockedCategoryIds.add(categoryId);
    persistUnlockedCategories();
    renderHomeCards();
    return;
  }

  const lockBtn = event.target.closest("[data-lock-category]");
  if (!lockBtn) return;

  const categoryId = String(lockBtn.dataset.lockCategory);
  unlockedCategoryIds.delete(categoryId);
  persistUnlockedCategories();
  renderHomeCards();
});

renderHomeCards();
