const CLOSED_EGG_IMAGE_URL = new URL("../img/egg-full.png", import.meta.url).href;
const OPEN_EGG_IMAGE_URL = new URL("../img/egg-1.gif", import.meta.url).href;

function getEggIconMarkup(isVisible) {
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
      continue;
    }

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
      const shouldReveal = input.type === "password";

      input.type = shouldReveal ? "text" : "password";
      renderPasswordToggle(toggleButton, shouldReveal);
    });

    renderPasswordToggle(toggleButton, false);
    wrapper.appendChild(toggleButton);
    input.dataset.passwordToggleReady = "true";
  }
}
