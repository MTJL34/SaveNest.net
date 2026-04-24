// Ce fichier centralise les URLs de l'application cote front.
// Ainsi, on evite de coder "localhost:3000" en dur dans plusieurs scripts.

const FALLBACK_APP_ORIGIN = "http://localhost:3000";
const FALLBACK_API_PORT = "3000";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_FRONTEND_PORTS = new Set(["4200", "4173", "5173", "5500", "8080", "8081"]);
const FRONTEND_DIRECTORIES = new Set(["html", "css", "scripts", "img", "data"]);

function isHttpContext() {
  return (
    typeof window !== "undefined" &&
    window.location &&
    (window.location.protocol === "http:" ||
      window.location.protocol === "https:")
  );
}

function getConfiguredApiOrigin() {
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
  if (isHttpContext()) {
    return window.location.origin;
  }

  return FALLBACK_APP_ORIGIN;
}

function getCurrentPathname() {
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
  if (endIndexExclusive <= 0) {
    return "/";
  }

  return `/${pathSegments.slice(0, endIndexExclusive).join("/")}/`;
}

function inferAppBasePath() {
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
  return new URL("/api", `${getApiOrigin()}/`).href;
}

export function getAppBaseUrl() {
  return new URL(inferAppBasePath(), `${getAppOrigin()}/`).href;
}

export function getServerUnavailableMessage() {
  const apiOrigin = new URL(getApiBaseUrl()).origin;
  return `Le serveur est injoignable. Vérifiez que le backend tourne bien sur ${apiOrigin}.`;
}
