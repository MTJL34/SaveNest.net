// Ce middleware verifie le token JWT et controle les droits d'acces des utilisateurs.
import jwt from "jsonwebtoken";
import connection from "../config/database.js";

export const ROLE_CODES = Object.freeze({
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  USER: "USER",
});

// Les administrateurs et moderateurs peuvent acceder a plus de ressources
// qu'un utilisateur classique. On regroupe ces roles ici pour eviter de repeter
// la meme liste dans plusieurs fichiers.
const PRIVILEGED_ROLE_CODES = [ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR];

// Cette fonction recupere proprement le token dans l'en-tete Authorization.
function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const parts = authorizationHeader.split(" ");

  if (parts.length < 2) {
    return null;
  }

  if (parts[0] !== "Bearer") {
    return null;
  }

  if (!parts[1]) {
    return null;
  }

  const token = parts[1].trim();

  if (token === "") {
    return null;
  }

  return token;
}

function parsePositiveId(value) {
  // Les IDs provenant d'une URL ou d'un token peuvent arriver sous forme de texte.
  // On les convertit, puis on refuse les valeurs invalides.
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

async function getAuthUserById(idUser) {
  // On recharge l'utilisateur depuis la base a chaque requete protegee.
  // Cela evite de faire confiance aveuglement aux infos contenues dans le token.
  const [rows] = await connection.execute(
    `SELECT
      u.id_user,
      u.mail,
      u.id_role,
      r.role_code,
      r.role_label
    FROM user_ u
    INNER JOIN roles r ON r.id_role = u.id_role
    WHERE u.id_user = ?
    LIMIT 1`,
    [idUser]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

export function hasRole(user, allowedRoleCodes = []) {
  // Fonction tres simple : elle dit si l'utilisateur possede l'un des roles autorises.
  if (!user || typeof user !== "object") {
    return false;
  }

  if (typeof user.role_code !== "string" || user.role_code === "") {
    return false;
  }

  return allowedRoleCodes.includes(user.role_code);
}

export function isPrivilegedUser(user) {
  // Sert dans les controleurs pour autoriser admin/moderateur a voir plus de donnees.
  return hasRole(user, PRIVILEGED_ROLE_CODES);
}

export async function requireAuth(req, res, next) {
  // On lit le token, on le decode, puis on recharge l'utilisateur depuis la base.
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const decodedToken = jwt.verify(token, secret);
    const decodedUserId = decodedToken ? decodedToken.id_user : null;
    const idUser = parsePositiveId(decodedUserId);

    if (!idUser) {
      return res.status(401).json({ message: "Token invalide." });
    }

    const authUser = await getAuthUserById(idUser);

    if (!authUser) {
      return res.status(401).json({ message: "Utilisateur du token introuvable." });
    }

    req.authUser = authUser;
    return next();
  } catch (error) {
    console.error("Error in requireAuth:", error);
    return res.status(401).json({ message: "Token invalide ou expiré." });
  }
}

export function requireRole(...allowedRoleCodes) {
  // Middleware configurable.
  // Exemple : requireRole(ROLE_CODES.ADMIN) bloque tous les non-admins.
  return function checkRole(req, res, next) {
    if (!req.authUser) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    if (hasRole(req.authUser, allowedRoleCodes)) {
      return next();
    }

    return res.status(403).json({ message: "Accès refusé." });
  };
}

export function requireSelfOrRole(resolveTargetUserId, ...allowedRoleCodes) {
  // Ce middleware autorise deux cas :
  // 1. l'utilisateur modifie sa propre ressource,
  // 2. l'utilisateur a un role special, comme ADMIN.
  return function checkSelfOrRole(req, res, next) {
    if (!req.authUser) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const rawTargetUserId = resolveTargetUserId(req);
    const targetUserId = parsePositiveId(rawTargetUserId);

    if (targetUserId !== null && targetUserId === req.authUser.id_user) {
      return next();
    }

    if (hasRole(req.authUser, allowedRoleCodes)) {
      return next();
    }

    return res.status(403).json({ message: "Accès refusé." });
  };
}
