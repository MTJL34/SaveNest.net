import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import connection from "../config/database.js";

const parsePositiveId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const userSelectQuery = `
  SELECT
    u.id_user,
    u.pseudo,
    u.mail,
    u.id_savenest,
    s.date_inscription,
    u.id_country,
    c.country_name,
    u.id_roles,
    r.roles_name,
    r.right_
  FROM user_ u
  INNER JOIN savenest s ON s.id_savenest = u.id_savenest
  INNER JOIN country c ON c.id_country = u.id_country
  INNER JOIN roles r ON r.id_roles = u.id_roles
`;

const sanitizeUser = (user) => ({
  id_user: user.id_user,
  pseudo: user.pseudo,
  mail: user.mail,
  id_savenest: user.id_savenest,
  date_inscription: user.date_inscription,
  id_country: user.id_country,
  country_name: user.country_name,
  id_roles: user.id_roles,
  roles_name: user.roles_name,
  right_: user.right_,
});

const getSpokenLanguagesByUserId = async (idUser) => {
  const [rows] = await connection.execute(
    `SELECT
      l.id_language,
      l.language_name,
      l.country_flag
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
    "SELECT id_user, pseudo, mail, password, id_savenest, id_country, id_roles FROM user_ WHERE id_user = ?",
    [idUser]
  );

  return rows[0] || null;
};

const ensureForeignKeysExist = async ({ id_savenest, id_country, id_roles }) => {
  const [[saveNestRows], [countryRows], [roleRows]] = await Promise.all([
    connection.execute("SELECT id_savenest FROM savenest WHERE id_savenest = ? LIMIT 1", [id_savenest]),
    connection.execute("SELECT id_country FROM country WHERE id_country = ? LIMIT 1", [id_country]),
    connection.execute("SELECT id_roles FROM roles WHERE id_roles = ? LIMIT 1", [id_roles]),
  ]);

  if (saveNestRows.length === 0) {
    return { message: "SaveNest introuvable." };
  }

  if (countryRows.length === 0) {
    return { message: "Pays introuvable." };
  }

  if (roleRows.length === 0) {
    return { message: "Rôle introuvable." };
  }

  return null;
};

const findConflictingUser = async ({ pseudo, mail, excludeId = null }) => {
  const values = [pseudo, mail];
  let query =
    "SELECT id_user, pseudo, mail FROM user_ WHERE (pseudo = ? OR mail = ?) LIMIT 1";

  if (excludeId !== null) {
    query =
      "SELECT id_user, pseudo, mail FROM user_ WHERE (pseudo = ? OR mail = ?) AND id_user <> ? LIMIT 1";
    values.push(excludeId);
  }

  const [rows] = await connection.execute(query, values);
  return rows[0] || null;
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
    const { pseudo, mail, password, id_savenest, id_country, id_roles = 2 } = req.body;
    const trimmedPseudo = typeof pseudo === "string" ? pseudo.trim() : "";
    const trimmedMail = typeof mail === "string" ? mail.trim().toLowerCase() : "";
    const rawPassword = typeof password === "string" ? password : "";
    const parsedSaveNest = parsePositiveId(id_savenest);
    const parsedCountry = parsePositiveId(id_country);
    const parsedRole = parsePositiveId(id_roles);

    if (!trimmedPseudo || !trimmedMail || !rawPassword) {
      return res.status(400).json({ message: "pseudo, mail et password sont obligatoires." });
    }

    if (!parsedSaveNest) {
      return res.status(400).json({ message: "id_savenest doit être un entier valide." });
    }

    if (!parsedCountry) {
      return res.status(400).json({ message: "id_country doit être un entier valide." });
    }

    if (!parsedRole) {
      return res.status(400).json({ message: "id_roles doit être un entier valide." });
    }

    const foreignKeyError = await ensureForeignKeysExist({
      id_savenest: parsedSaveNest,
      id_country: parsedCountry,
      id_roles: parsedRole,
    });

    if (foreignKeyError) {
      return res.status(404).json(foreignKeyError);
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

    const [result] = await connection.execute(
      "INSERT INTO user_ (pseudo, mail, password, id_savenest, id_country, id_roles) VALUES (?, ?, ?, ?, ?, ?)",
      [trimmedPseudo, trimmedMail, hashedPassword, parsedSaveNest, parsedCountry, parsedRole]
    );

    const createdUser = await getJoinedUserById(result.insertId);
    const publicUser = await buildPublicUser(createdUser);

    return res.status(201).json({
      message: "Inscription réussie.",
      user: publicUser,
    });
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
      req.body.pseudo === undefined ? existingUser.pseudo : String(req.body.pseudo).trim();
    const nextMail =
      req.body.mail === undefined ? existingUser.mail : String(req.body.mail).trim().toLowerCase();
    const nextPasswordRaw =
      req.body.password === undefined ? null : String(req.body.password);
    const nextSaveNest =
      req.body.id_savenest === undefined
        ? existingUser.id_savenest
        : parsePositiveId(req.body.id_savenest);
    const nextCountry =
      req.body.id_country === undefined
        ? existingUser.id_country
        : parsePositiveId(req.body.id_country);
    const nextRole =
      req.body.id_roles === undefined
        ? existingUser.id_roles
        : parsePositiveId(req.body.id_roles);

    if (!nextPseudo || !nextMail) {
      return res.status(400).json({ message: "pseudo et mail ne peuvent pas être vides." });
    }

    if (!nextSaveNest) {
      return res.status(400).json({ message: "id_savenest doit être un entier valide." });
    }

    if (!nextCountry) {
      return res.status(400).json({ message: "id_country doit être un entier valide." });
    }

    if (!nextRole) {
      return res.status(400).json({ message: "id_roles doit être un entier valide." });
    }

    if (nextPasswordRaw !== null && nextPasswordRaw.trim() === "") {
      return res.status(400).json({ message: "password ne peut pas être vide." });
    }

    const foreignKeyError = await ensureForeignKeysExist({
      id_savenest: nextSaveNest,
      id_country: nextCountry,
      id_roles: nextRole,
    });

    if (foreignKeyError) {
      return res.status(404).json(foreignKeyError);
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
      "UPDATE user_ SET pseudo = ?, mail = ?, password = ?, id_savenest = ?, id_country = ?, id_roles = ? WHERE id_user = ?",
      [nextPseudo, nextMail, nextPassword, nextSaveNest, nextCountry, nextRole, idUser]
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
    const { mail, password } = req.body;
    const trimmedMail = typeof mail === "string" ? mail.trim().toLowerCase() : "";
    const rawPassword = typeof password === "string" ? password : "";

    if (!trimmedMail || !rawPassword) {
      return res.status(400).json({ message: "mail et password sont obligatoires." });
    }

    const [rows] = await connection.execute(
      "SELECT id_user, pseudo, mail, password, id_savenest, id_country, id_roles FROM user_ WHERE mail = ? LIMIT 1",
      [trimmedMail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(rawPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const token = jwt.sign(
      { id_user: user.id_user, mail: user.mail, id_roles: user.id_roles },
      secret,
      { expiresIn: "24h" }
    );

    const fullUser = await getJoinedUserById(user.id_user);
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
