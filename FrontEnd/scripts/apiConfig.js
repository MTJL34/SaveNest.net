// Ce fichier centralise les URLs de l'application cote front.
// Ainsi, on evite de coder "localhost:3000" en dur dans plusieurs scripts.

const FALLBACK_APP_ORIGIN = "http://localhost:3000";
const FALLBACK_API_PORT = "3000";

// Ces constantes rendent le fichier adaptable :
// le site peut etre ouvert depuis Express, Live Server ou un autre port local.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_FRONTEND_PORTS = new Set(["4200", "4173", "5173", "5500", "8080", "8081"]);
const FRONTEND_DIRECTORIES = new Set(["html", "css", "scripts", "img", "data"]);

function isHttpContext() {
  // Quand on ouvre un fichier en file://, window.location existe mais il n'y a pas
  // d'origine HTTP fiable. On utilise alors les valeurs de secours.
  return (
    typeof window !== "undefined" &&
    window.location &&
    (window.location.protocol === "http:" ||
      window.location.protocol === "https:")
  );
}

function getConfiguredApiOrigin() {
  // Methode 1 : le HTML peut definir window.__SAVENEST_API_ORIGIN__.
  // Methode 2 : le HTML peut definir une balise meta savenest-api-origin.
  // Si rien n'est defini, on laisse la fonction suivante deviner.
  if (typeof window === "undefined") {
    return "";
  }

  const windowOverride =
    typeof window.__SAVENEST_API_ORIGIN__ === "string"
      ? window.__SAVENEST_API_ORIGIN__.trim()
      : "";

  if (windowOverride) {
    return new URL(windowOverride, window.location.href).origin;
  }

  if (typeof document === "undefined") {
    return "";
  }

  const metaTag = document.querySelector('meta[name="savenest-api-origin"]');
  const metaOverride = metaTag ? metaTag.getAttribute("content") : "";
  const trimmedMetaOverride =
    typeof metaOverride === "string" ? metaOverride.trim() : "";

  if (trimmedMetaOverride) {
    return new URL(trimmedMetaOverride, window.location.href).origin;
  }

  return "";
}

function getAppOrigin() {
  // Origine du site actuel, par exemple http://localhost:3000.
  if (isHttpContext()) {
    return window.location.origin;
  }

  return FALLBACK_APP_ORIGIN;
}

function getCurrentPathname() {
  // Chemin actuel dans l'URL, par exemple /html/fav.html.
  if (!isHttpContext()) {
    return "/";
  }

  const pathname =
    window.location && typeof window.location.pathname === "string"
      ? window.location.pathname.trim()
      : "";

  if (!pathname) {
    return "/";
  }

  if (pathname.startsWith("/")) {
    return pathname;
  }

  return `/${pathname}`;
}

function buildBasePathFromSegments(pathSegments, endIndexExclusive) {
  // Reconstruit un chemin propre a partir de morceaux d'URL.
  // Exemple : ["FrontEnd", "html", "fav.html"] avec index 1 donne /FrontEnd/.
  if (endIndexExclusive <= 0) {
    return "/";
  }

  return `/${pathSegments.slice(0, endIndexExclusive).join("/")}/`;
}

function inferAppBasePath() {
  // Cette fonction sert aux liens du header/footer.
  // Elle evite que les liens cassent si le projet est servi depuis un sous-dossier.
  const pathname = getCurrentPathname();

  if (pathname === "/") {
    return "/";
  }

  const pathSegments = pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) {
    return "/";
  }

  const frontEndFolderIndex = pathSegments.lastIndexOf("FrontEnd");

  if (frontEndFolderIndex >= 0) {
    return buildBasePathFromSegments(pathSegments, frontEndFolderIndex + 1);
  }

  const frontAssetFolderIndex = pathSegments.findIndex((segment) =>
    FRONTEND_DIRECTORIES.has(segment)
  );

  if (frontAssetFolderIndex >= 0) {
    return buildBasePathFromSegments(pathSegments, frontAssetFolderIndex);
  }

  const lastSegment = pathSegments[pathSegments.length - 1];

  if (lastSegment.includes(".")) {
    return buildBasePathFromSegments(pathSegments, pathSegments.length - 1);
  }

  return buildBasePathFromSegments(pathSegments, pathSegments.length);
}

function getLocalDevelopmentApiOrigin() {
  // Cas typique : front sur Live Server port 5500, backend Express sur 3000.
  if (!isHttpContext()) {
    return "";
  }

  const { protocol, hostname, port } = window.location;

  if (!LOOPBACK_HOSTS.has(hostname)) {
    return "";
  }

  if (!LOCAL_FRONTEND_PORTS.has(port)) {
    return "";
  }

  return `${protocol}//${hostname}:${FALLBACK_API_PORT}`;
}

function getApiOrigin() {
  // Ordre de priorite :
  // 1. configuration explicite,
  // 2. detection d'un front local separe,
  // 3. meme origine que la page.
  const configuredOrigin = getConfiguredApiOrigin();

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const localDevelopmentApiOrigin = getLocalDevelopmentApiOrigin();

  if (localDevelopmentApiOrigin) {
    return localDevelopmentApiOrigin;
  }

  return getAppOrigin();
}

export function getApiBaseUrl() {
  // Toutes les pages front appellent cette fonction pour construire leurs fetch().
  return new URL("/api", `${getApiOrigin()}/`).href;
}

export function getAppBaseUrl() {
  // Base utilisee pour fabriquer des liens internes robustes.
  return new URL(inferAppBasePath(), `${getAppOrigin()}/`).href;
}

export function getServerUnavailableMessage() {
  // Message commun quand fetch echoue parce que le backend n'est pas lance.
  const apiOrigin = new URL(getApiBaseUrl()).origin;
  return `Le serveur est injoignable. Vérifiez que le backend tourne bien sur ${apiOrigin}.`;
}
