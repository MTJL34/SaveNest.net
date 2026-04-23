import jwt from "jsonwebtoken";
import connection from "../config/database.js";

export const ROLE_CODES = Object.freeze({
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  USER: "USER",
});

const PRIVILEGED_ROLE_CODES = [ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR];

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
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

async function getAuthUserById(idUser) {
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
  if (!user || typeof user !== "object") {
    return false;
  }

  if (typeof user.role_code !== "string" || user.role_code === "") {
    return false;
  }

  return allowedRoleCodes.includes(user.role_code);
}

export function isPrivilegedUser(user) {
  return hasRole(user, PRIVILEGED_ROLE_CODES);
}

export async function requireAuth(req, res, next) {
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
