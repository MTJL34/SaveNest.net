export const headerMarkup = `
  <div class="logo">
    <img src="../img/logo.png" alt="SaveNest logo">
    <span>SaveNest</span>
  </div>
  <nav>
    <ul>
      <li><a href="../html/index.html">Accueil</a></li>
      <li><a href="../html/category.html">Catégories</a></li>
      <li><a href="../html/about.html">À propos</a></li>
      <li><a href="../html/connexion.html">Connexion</a></li>
    </ul>
  </nav>
`;

export const footerMarkup = `
  <div class="footer-logo">
    <img src="../img/logo.png" alt="SaveNest logo">
    <span>SaveNest</span>
  </div>
  <div class="footer-links">
    <ul>
      <li><a href="../html/contact.html">Contact</a></li>
      <li><a href="../html/policy.html">Politique de confidentialité</a></li>
      <li><a href="../html/cgu.html">Conditions d’utilisation</a></li>
    </ul>
  </div>
`;

export function setHeader() {
  const headerEl = document.querySelector(".js_header");
  if (!headerEl) return;
  if (headerEl.dataset.hydrated === "true") return;

  if (headerEl.innerHTML.trim() !== headerMarkup.trim()) {
    headerEl.innerHTML = headerMarkup;
  }

  headerEl.dataset.hydrated = "true";
  markLayoutReady();
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
