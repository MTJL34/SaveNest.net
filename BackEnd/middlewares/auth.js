import jwt from "jsonwebtoken";
import connection from "../config/database.js";

export const ROLE_CODES = Object.freeze({
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  USER: "USER",
});

const PRIVILEGED_ROLE_CODES = new Set([ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR]);

const extractBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== "string") return null;

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token.trim() || null;
};

const parsePositiveId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const getAuthUserById = async (idUser) => {
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

  return rows[0] || null;
};

export const hasRole = (user, allowedRoleCodes = []) => {
  if (!user?.role_code) return false;
  return allowedRoleCodes.includes(user.role_code);
};

export const isPrivilegedUser = (user) => {
  return PRIVILEGED_ROLE_CODES.has(user?.role_code);
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const decoded = jwt.verify(token, secret);
    const idUser = parsePositiveId(decoded?.id_user);

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
};

export const requireRole = (...allowedRoleCodes) => {
  return (req, res, next) => {
    if (!req.authUser) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    if (hasRole(req.authUser, allowedRoleCodes)) {
      return next();
    }

    return res.status(403).json({ message: "Accès refusé." });
  };
};

export const requireSelfOrRole = (resolveTargetUserId, ...allowedRoleCodes) => {
  return (req, res, next) => {
    if (!req.authUser) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const targetUserId = parsePositiveId(resolveTargetUserId(req));

    if (targetUserId !== null && targetUserId === req.authUser.id_user) {
      return next();
    }

    if (hasRole(req.authUser, allowedRoleCodes)) {
      return next();
    }

    return res.status(403).json({ message: "Accès refusé." });
  };
};
