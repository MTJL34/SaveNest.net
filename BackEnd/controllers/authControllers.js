import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import connection from "../config/database.js";
import { ROLE_CODES } from "../middlewares/auth.js";

const DEFAULT_ROLE_ID = 2;

const parsePositiveId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const parseOptionalPositiveId = (value) => {
  if (value === undefined) {
    return { value: undefined, invalid: false };
  }

  if (value === null) {
    return { value: null, invalid: false };
  }

  if (typeof value === "string" && value.trim() === "") {
    return { value: null, invalid: false };
  }

  const parsedId = parsePositiveId(value);

  if (!parsedId) {
    return { value: null, invalid: true };
  }

  return { value: parsedId, invalid: false };
};

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeMail = (value) => normalizeText(value).toLowerCase();
const isAdminUser = (user) => user?.role_code === ROLE_CODES.ADMIN;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const isBcryptHash = (value) =>
  typeof value === "string" && BCRYPT_HASH_PATTERN.test(value);

const verifyStoredPassword = async (rawPassword, storedPassword) => {
  if (typeof storedPassword !== "string" || storedPassword === "") {
    return { isValid: false, needsUpgrade: false };
  }

  if (isBcryptHash(storedPassword)) {
    return {
      isValid: await bcrypt.compare(rawPassword, storedPassword),
      needsUpgrade: false,
    };
  }

  const isLegacyPlainTextMatch = rawPassword === storedPassword;

  return {
    isValid: isLegacyPlainTextMatch,
    needsUpgrade: isLegacyPlainTextMatch,
  };
};

const normalizeSpokenLanguages = (value) => {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map(normalizeText).filter(Boolean))];
};

const userSelectQuery = `
  SELECT
    u.id_user,
    u.pseudo,
    u.mail,
    u.default_category_id,
    u.id_savenest,
    s.date_inscription,
    u.id_role,
    r.role_code,
    r.role_label
  FROM user_ u
  INNER JOIN savenest s ON s.id_savenest = u.id_savenest
  INNER JOIN roles r ON r.id_role = u.id_role
`;

const sanitizeUser = (user) => ({
  id_user: user.id_user,
  pseudo: user.pseudo,
  mail: user.mail,
  default_category_id: user.default_category_id,
  id_savenest: user.id_savenest,
  date_inscription: user.date_inscription,
  id_role: user.id_role,
  role_code: user.role_code,
  role_label: user.role_label,
});

const getSpokenLanguagesByUserId = async (idUser) => {
  const [rows] = await connection.execute(
    `SELECT
      l.id_language,
      l.language_name,
      l.language_icon
    FROM speaking sp
    INNER JOIN language_ l ON l.id_language = sp.id_language
    WHERE sp.id_user = ?
    ORDER BY l.id_language ASC`,
    [idUser]
  );

  return rows;
};

const buildPublicUser = async (user) => {
  const spokenLanguages = await getSpokenLanguagesByUserId(user.id_user);

  return {
    ...sanitizeUser(user),
    spoken_languages: spokenLanguages,
  };
};

const buildPublicUsers = async (users) => {
  return Promise.all(users.map(buildPublicUser));
};

const getJoinedUserById = async (idUser) => {
  const [rows] = await connection.execute(
    `${userSelectQuery}
    WHERE u.id_user = ?`,
    [idUser]
  );

  return rows[0] || null;
};

const getRawUserById = async (idUser) => {
  const [rows] = await connection.execute(
    "SELECT id_user, pseudo, mail, password, id_savenest, id_role, default_category_id FROM user_ WHERE id_user = ?",
    [idUser]
  );

  return rows[0] || null;
};

const ensureDefaultCategoryOwnedByUser = async ({
  idUser,
  defaultCategoryId,
  executor = connection,
}) => {
  if (defaultCategoryId === null || defaultCategoryId === undefined) {
    return null;
  }

  const [rows] = await executor.execute(
    "SELECT id_category, id_user FROM category WHERE id_category = ? LIMIT 1",
    [defaultCategoryId]
  );

  if (rows.length === 0) {
    return {
      status: 404,
      message: "Catégorie par défaut introuvable.",
    };
  }

  if (Number(rows[0].id_user) !== Number(idUser)) {
    return {
      status: 403,
      message: "Vous ne pouvez pas définir comme catégorie par défaut une catégorie qui ne vous appartient pas.",
    };
  }

  return null;
};

const ensureForeignKeysExist = async (
  { id_savenest = null, id_role },
  executor = connection
) => {
  if (id_savenest !== null) {
    const [saveNestRows] = await executor.execute(
      "SELECT id_savenest FROM savenest WHERE id_savenest = ? LIMIT 1",
      [id_savenest]
    );

    if (saveNestRows.length === 0) {
      return { message: "SaveNest introuvable." };
    }
  }

  const [roleRows] = await executor.execute(
    "SELECT id_role FROM roles WHERE id_role = ? LIMIT 1",
    [id_role]
  );

  if (roleRows.length === 0) {
    return { message: "Rôle introuvable." };
  }

  return null;
};

const findConflictingUser = async ({
  pseudo,
  mail,
  excludeId = null,
  executor = connection,
}) => {
  const values = [pseudo, mail];
  let query =
    "SELECT id_user, pseudo, mail FROM user_ WHERE (pseudo = ? OR mail = ?) LIMIT 1";

  if (excludeId !== null) {
    query =
      "SELECT id_user, pseudo, mail FROM user_ WHERE (pseudo = ? OR mail = ?) AND id_user <> ? LIMIT 1";
    values.push(excludeId);
  }

  const [rows] = await executor.execute(query, values);
  return rows[0] || null;
};

const createSaveNestRecord = async (executor = connection) => {
  const [result] = await executor.execute(
    "INSERT INTO savenest (date_inscription) VALUES (CURRENT_TIMESTAMP)"
  );

  return result.insertId;
};

const insertSpokenLanguages = async ({
  idUser,
  spokenLanguages,
  executor = connection,
}) => {
  const normalizedLanguages = normalizeSpokenLanguages(spokenLanguages);

  if (normalizedLanguages.length === 0) {
    return { status: 400, message: "Choisissez au moins une langue parlée." };
  }

  const placeholders = normalizedLanguages.map(() => "?").join(", ");
  const [rows] = await executor.execute(
    `SELECT id_language, language_name
    FROM language_
    WHERE language_name IN (${placeholders})`,
    normalizedLanguages
  );

  if (rows.length !== normalizedLanguages.length) {
    const foundNames = new Set(rows.map((row) => row.language_name));
    const missingLanguages = normalizedLanguages.filter(
      (languageName) => !foundNames.has(languageName)
    );

    return {
      status: 400,
      message: `Langues invalides : ${missingLanguages.join(", ")}.`,
    };
  }

  for (const row of rows) {
    await executor.execute(
      "INSERT INTO speaking (id_user, id_language) VALUES (?, ?)",
      [idUser, row.id_language]
    );
  }

  return null;
};

export const getAllUsers = async (req, res) => {
  try {
    const [rows] = await connection.execute(
      `${userSelectQuery}
      ORDER BY u.id_user ASC`
    );

    const users = await buildPublicUsers(rows);

    return res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getUserById = async (req, res) => {
  try {
    const idUser = parsePositiveId(req.params.id);

    if (!idUser) {
      return res.status(400).json({ message: "ID utilisateur invalide." });
    }

    const user = await getJoinedUserById(idUser);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const publicUser = await buildPublicUser(user);

    return res.status(200).json(publicUser);
  } catch (error) {
    console.error("Error in getUserById:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const registerUser = async (req, res) => {
  try {
    const {
      pseudo,
      mail,
      password,
      id_savenest,
      spoken_languages = [],
    } = req.body;
    const trimmedPseudo = normalizeText(pseudo);
    const trimmedMail = normalizeMail(mail);
    const rawPassword = typeof password === "string" ? password : "";
    const normalizedLanguages = normalizeSpokenLanguages(spoken_languages);
    const hasProvidedSaveNest =
      id_savenest !== undefined && id_savenest !== null && String(id_savenest).trim() !== "";
    const parsedSaveNest = hasProvidedSaveNest ? parsePositiveId(id_savenest) : null;
    const parsedRole = DEFAULT_ROLE_ID;

    if (!trimmedPseudo || !trimmedMail || !rawPassword) {
      return res.status(400).json({ message: "pseudo, mail et password sont obligatoires." });
    }

    if (hasProvidedSaveNest && !parsedSaveNest) {
      return res.status(400).json({ message: "id_savenest doit être un entier valide." });
    }

    if (normalizedLanguages.length === 0) {
      return res.status(400).json({ message: "Choisissez au moins une langue parlée." });
    }

    const conflictingUser = await findConflictingUser({
      pseudo: trimmedPseudo,
      mail: trimmedMail,
    });

    if (conflictingUser) {
      if (conflictingUser.mail === trimmedMail) {
        return res.status(409).json({ message: "Un compte avec cet email existe déjà." });
      }

      return res.status(409).json({ message: "Ce pseudo est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const db = await connection.getConnection();

    try {
      await db.beginTransaction();

      let nextSaveNestId = parsedSaveNest;

      if (nextSaveNestId === null) {
        const roleError = await ensureForeignKeysExist(
          { id_savenest: null, id_role: parsedRole },
          db
        );

        if (roleError) {
          await db.rollback();
          return res.status(404).json(roleError);
        }

        nextSaveNestId = await createSaveNestRecord(db);
      } else {
        const foreignKeyError = await ensureForeignKeysExist(
          { id_savenest: nextSaveNestId, id_role: parsedRole },
          db
        );

        if (foreignKeyError) {
          await db.rollback();
          return res.status(404).json(foreignKeyError);
        }
      }

      const [result] = await db.execute(
        "INSERT INTO user_ (pseudo, mail, password, id_savenest, id_role) VALUES (?, ?, ?, ?, ?)",
        [trimmedPseudo, trimmedMail, hashedPassword, nextSaveNestId, parsedRole]
      );

      const languagesError = await insertSpokenLanguages({
        idUser: result.insertId,
        spokenLanguages: normalizedLanguages,
        executor: db,
      });

      if (languagesError) {
        await db.rollback();
        return res.status(languagesError.status).json({ message: languagesError.message });
      }

      await db.commit();

      const createdUser = await getJoinedUserById(result.insertId);
      const publicUser = await buildPublicUser(createdUser);

      return res.status(201).json({
        message: "Inscription réussie.",
        user: publicUser,
      });
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  } catch (error) {
    console.error("Error in registerUser:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const updateUser = async (req, res) => {
  try {
    const idUser = parsePositiveId(req.params.id);

    if (!idUser) {
      return res.status(400).json({ message: "ID utilisateur invalide." });
    }

    const existingUser = await getRawUserById(idUser);

    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const nextPseudo =
      req.body.pseudo === undefined ? existingUser.pseudo : normalizeText(req.body.pseudo);
    const nextMail =
      req.body.mail === undefined ? existingUser.mail : normalizeMail(req.body.mail);
    const nextPasswordRaw =
      req.body.password === undefined ? null : String(req.body.password);
    const nextSaveNest =
      req.body.id_savenest === undefined
        ? existingUser.id_savenest
        : parsePositiveId(req.body.id_savenest);
    const nextRole =
      req.body.id_role === undefined ? existingUser.id_role : parsePositiveId(req.body.id_role);
    const hasProvidedDefaultCategory = Object.prototype.hasOwnProperty.call(
      req.body,
      "default_category_id"
    );
    const parsedDefaultCategory = parseOptionalPositiveId(
      hasProvidedDefaultCategory
        ? req.body.default_category_id
        : existingUser.default_category_id
    );
    const nextDefaultCategory = parsedDefaultCategory.value;

    if (!nextPseudo || !nextMail) {
      return res.status(400).json({ message: "pseudo et mail ne peuvent pas être vides." });
    }

    if (!nextSaveNest) {
      return res.status(400).json({ message: "id_savenest doit être un entier valide." });
    }

    if (!nextRole) {
      return res.status(400).json({ message: "id_role doit être un entier valide." });
    }

    if (hasProvidedDefaultCategory && parsedDefaultCategory.invalid) {
      return res.status(400).json({
        message: "default_category_id doit être un entier valide ou null.",
      });
    }

    if (!isAdminUser(req.authUser) && nextRole !== existingUser.id_role) {
      return res.status(403).json({
        message: "Seul un administrateur peut modifier le rôle d'un utilisateur.",
      });
    }

    if (nextPasswordRaw !== null && nextPasswordRaw.trim() === "") {
      return res.status(400).json({ message: "password ne peut pas être vide." });
    }

    const foreignKeyError = await ensureForeignKeysExist({
      id_savenest: nextSaveNest,
      id_role: nextRole,
    });

    if (foreignKeyError) {
      return res.status(404).json(foreignKeyError);
    }

    const defaultCategoryError = await ensureDefaultCategoryOwnedByUser({
      idUser,
      defaultCategoryId: nextDefaultCategory,
    });

    if (defaultCategoryError) {
      return res.status(defaultCategoryError.status).json({
        message: defaultCategoryError.message,
      });
    }

    const conflictingUser = await findConflictingUser({
      pseudo: nextPseudo,
      mail: nextMail,
      excludeId: idUser,
    });

    if (conflictingUser) {
      if (conflictingUser.mail === nextMail) {
        return res.status(409).json({ message: "Un compte avec cet email existe déjà." });
      }

      return res.status(409).json({ message: "Ce pseudo est déjà utilisé." });
    }

    const nextPassword =
      nextPasswordRaw === null ? existingUser.password : await bcrypt.hash(nextPasswordRaw, 10);

    await connection.execute(
      "UPDATE user_ SET pseudo = ?, mail = ?, password = ?, id_savenest = ?, id_role = ?, default_category_id = ? WHERE id_user = ?",
      [nextPseudo, nextMail, nextPassword, nextSaveNest, nextRole, nextDefaultCategory, idUser]
    );

    const updatedUser = await getJoinedUserById(idUser);
    const publicUser = await buildPublicUser(updatedUser);

    return res.status(200).json({
      message: "Utilisateur mis à jour avec succès.",
      user: publicUser,
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const idUser = parsePositiveId(req.params.id);

    if (!idUser) {
      return res.status(400).json({ message: "ID utilisateur invalide." });
    }

    const [result] = await connection.execute("DELETE FROM user_ WHERE id_user = ?", [idUser]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    return res.status(200).json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { identifier, mail, pseudo, password } = req.body;
    const rawIdentifier =
      typeof identifier === "string" && identifier.trim() !== ""
        ? identifier
        : typeof mail === "string" && mail.trim() !== ""
          ? mail
          : pseudo;
    const trimmedIdentifier = normalizeText(rawIdentifier);
    const normalizedMailCandidate = normalizeMail(rawIdentifier);
    const rawPassword = typeof password === "string" ? password : "";

    if (!trimmedIdentifier || !rawPassword) {
      return res.status(400).json({
        message: "mail ou pseudo, puis password, sont obligatoires.",
      });
    }

    const [rows] = await connection.execute(
      `SELECT id_user, pseudo, mail, password, id_savenest, id_role
      FROM user_
      WHERE LOWER(mail) = ? OR pseudo = ?
      LIMIT 1`,
      [normalizedMailCandidate, trimmedIdentifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const user = rows[0];
    const passwordCheck = await verifyStoredPassword(rawPassword, user.password);

    if (!passwordCheck.isValid) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    if (passwordCheck.needsUpgrade) {
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      await connection.execute(
        "UPDATE user_ SET password = ? WHERE id_user = ?",
        [hashedPassword, user.id_user]
      );
    }

    const fullUser = await getJoinedUserById(user.id_user);
    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const token = jwt.sign(
      {
        id_user: fullUser.id_user,
        mail: fullUser.mail,
        id_role: fullUser.id_role,
        role_code: fullUser.role_code,
      },
      secret,
      { expiresIn: "24h" }
    );
    const publicUser = await buildPublicUser(fullUser);

    return res.status(200).json({
      message: "Connexion réussie.",
      token,
      user: publicUser,
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const logoutUser = async (req, res) => {
  return res.status(200).json({ message: "Déconnexion réussie (côté client)." });
};
