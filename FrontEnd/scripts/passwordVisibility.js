const CLOSED_EGG_IMAGE_URL = new URL("../img/egg-full.png", import.meta.url).href;
const OPEN_EGG_IMAGE_URL = new URL("../img/egg-1.gif", import.meta.url).href;

function getEggIconMarkup(isVisible) {
  // Le bouton reutilise les images du projet pour montrer l'etat du champ.
  const imageUrl = isVisible ? OPEN_EGG_IMAGE_URL : CLOSED_EGG_IMAGE_URL;
  const altText = isVisible ? "Mot de passe montré" : "Mot de passe caché";

  return `
    <img
      src="${imageUrl}"
      alt="${altText}"
      class="password-visibility-icon-img"
      aria-hidden="true"
    >
  `;
}

function renderPasswordToggle(toggleButton, isVisible) {
  // Cette fonction synchronise tout ce qui depend de l'etat visible/cache :
  // attributs d'accessibilite, classe CSS, image et texte cache pour lecteurs d'ecran.
  const toggleStatus = toggleButton.parentElement
    ? toggleButton.parentElement.querySelector(".password-visibility-status")
    : null;
  const toggleIcon = toggleButton.querySelector(".password-visibility-icon");

  toggleButton.setAttribute("aria-pressed", String(isVisible));
  toggleButton.setAttribute(
    "aria-label",
    isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
  );
  toggleButton.classList.toggle("is-visible", isVisible);

  if (toggleIcon) {
    toggleIcon.innerHTML = getEggIconMarkup(isVisible);
  }

  if (toggleStatus) {
    toggleStatus.textContent = isVisible ? "Montré" : "Caché";
  }
}

export function enhancePasswordFields(root = document) {
  // Fonction appelee apres le rendu des formulaires.
  // Elle transforme automatiquement chaque input password en champ avec bouton afficher/masquer.
  if (!root || typeof root.querySelectorAll !== "function") {
    return;
  }

  const passwordInputs = Array.from(
    root.querySelectorAll(
      'input[type="password"], input[data-password-toggle-ready="true"]'
    )
  );

  for (let index = 0; index < passwordInputs.length; index += 1) {
    const input = passwordInputs[index];

    if (!(input instanceof HTMLInputElement)) {
      continue;
    }

    if (input.dataset.passwordToggleReady === "true") {
      // Evite d'ajouter deux boutons si la fonction est appelee plusieurs fois.
      continue;
    }

    // On enveloppe l'input dans une div pour positionner le bouton en CSS.
    const wrapper = document.createElement("div");
    wrapper.className = "password-field";

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const statusText = document.createElement("span");
    statusText.className = "password-visibility-status";
    wrapper.appendChild(statusText);

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "password-visibility-toggle";
    toggleButton.innerHTML = `
      <span class="password-visibility-icon" aria-hidden="true"></span>
    `;

    toggleButton.addEventListener("click", () => {
      // Clic : on inverse simplement le type du champ.
      const shouldReveal = input.type === "password";

      input.type = shouldReveal ? "text" : "password";
      renderPasswordToggle(toggleButton, shouldReveal);
    });

    renderPasswordToggle(toggleButton, false);
    wrapper.appendChild(toggleButton);
    input.dataset.passwordToggleReady = "true";
  }
}
