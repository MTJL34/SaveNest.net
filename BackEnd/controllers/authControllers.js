// Ce controleur regroupe toute la logique liee a l'authentification
// et a la gestion basique des utilisateurs.
// Pour un debutant, on peut le lire comme une suite de petites etapes :
// 1. nettoyer les donnees recues depuis la requete HTTP,
// 2. verifier qu'elles sont valides,
// 3. lire ou ecrire en base de donnees,
// 4. renvoyer une reponse JSON claire au front.
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import connection from "../config/database.js";
import { ROLE_CODES } from "../middlewares/auth.js";

// Par defaut, un nouvel utilisateur recoit le role "utilisateur classique".
// On garde cette valeur dans une constante pour eviter de "cacher" le chiffre 2
// au milieu du code metier.
const DEFAULT_ROLE_ID = 2;

// Ces petites fonctions servent a valider et normaliser les donnees
// avant de les utiliser dans la logique metier ou dans les requetes SQL.
const parsePositiveId = (value) => {
  // Number(...) tente de convertir la valeur recue en nombre.
  // Exemple : "5" devient 5, alors que "abc" devient NaN.
  const id = Number(value);

  // On n'accepte que des entiers strictement positifs pour les identifiants.
  // Si la valeur est incorrecte, on renvoie null pour signaler "ID invalide".
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const parseOptionalPositiveId = (value) => {
  // Cas 1 : le champ n'a pas ete envoye dans la requete.
  // On renvoie "undefined" pour dire "ne pas modifier la valeur actuelle".
  if (value === undefined) {
    return { value: undefined, invalid: false };
  }

  // Cas 2 : l'utilisateur envoie explicitement null.
  // Ici on garde null, ce qui signifie souvent "retirer la valeur".
  if (value === null) {
    return { value: null, invalid: false };
  }

  // Cas 3 : le front envoie une chaine vide.
  // On la traite comme null pour eviter d'enregistrer "" en base.
  if (typeof value === "string" && value.trim() === "") {
    return { value: null, invalid: false };
  }

  const parsedId = parsePositiveId(value);

  // Si la conversion echoue, on ne leve pas directement une erreur ici :
  // on renvoie un objet qui permettra a la route appelante de choisir
  // la bonne reponse HTTP.
  if (!parsedId) {
    return { value: null, invalid: true };
  }

  return { value: parsedId, invalid: false };
};

function normalizeText(value) {
  // Cette fonction garantit qu'on manipule toujours une chaine propre.
  // Si la valeur n'est pas une chaine, on renvoie une chaine vide.
  if (typeof value !== "string") {
    return "";
  }

  // trim() supprime les espaces au debut et a la fin.
  // Cela evite par exemple qu'un pseudo " Alice " soit enregistre
  // differemment de "Alice".
  return value.trim();
}

function normalizeMail(value) {
  // Un email est compare en minuscules pour eviter qu'un meme compte soit vu
  // comme different entre "Test@Mail.com" et "test@mail.com".
  return normalizeText(value).toLowerCase();
}

function isAdminUser(user) {
  // Une petite protection defensive :
  // si aucun utilisateur authentifie n'est disponible, il ne peut pas etre admin.
  if (!user) {
    return false;
  }

  return user.role_code === ROLE_CODES.ADMIN;
}

// Un mot de passe chiffre avec bcrypt suit une forme tres precise.
// Cette expression reguliere permet de reconnaitre rapidement ce format.
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function isBcryptHash(value) {
  return typeof value === "string" && BCRYPT_HASH_PATTERN.test(value);
}

async function verifyStoredPassword(rawPassword, storedPassword) {
  // Transition legacy :
  // l'application accepte encore temporairement les anciens mots de passe
  // stockes en clair. Si la connexion reussit avec cet ancien format,
  // on indiquera plus bas qu'il faut "upgrader" ce mot de passe vers bcrypt.
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
    // Si la comparaison en clair fonctionne, on demandera un rehachage.
    needsUpgrade: isLegacyPlainTextMatch,
  };
}

function normalizeSpokenLanguages(value) {
  // On attend un tableau provenant du front.
  // Toute autre forme est consideree comme vide.
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedLanguages = [];

  for (let index = 0; index < value.length; index += 1) {
    // On nettoie chaque langue une par une.
    const normalizedLanguage = normalizeText(value[index]);

    // On ignore les valeurs vides.
    if (!normalizedLanguage) {
      continue;
    }

    // On evite les doublons pour ne pas creer deux fois la meme relation
    // en base de donnees.
    if (normalizedLanguages.includes(normalizedLanguage)) {
      continue;
    }

    normalizedLanguages.push(normalizedLanguage);
  }

  return normalizedLanguages;
}

// Morceau de requete SQL reutilisable.
// Il centralise les jointures necessaires pour recuperer un utilisateur
// avec son role et sa date d'inscription.
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

// Cette fonction retire les champs sensibles ou inutiles pour le client.
// Par exemple, on n'expose jamais le mot de passe dans la reponse JSON.
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
  // On recupere les langues parlees par un utilisateur via la table de liaison
  // "speaking" qui relie user_ et language_.
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
  // On enrichit l'utilisateur "public" avec ses langues parlees.
  // Le mot "public" signifie ici "pret a etre envoye au front".
  const spokenLanguages = await getSpokenLanguagesByUserId(user.id_user);

  return {
    ...sanitizeUser(user),
    spoken_languages: spokenLanguages,
  };
};

const buildPublicUsers = async (users) => {
  // Version tableau de buildPublicUser.
  // On parcourt les utilisateurs un par un pour construire la reponse finale.
  const publicUsers = [];

  for (let index = 0; index < users.length; index += 1) {
    publicUsers.push(await buildPublicUser(users[index]));
  }

  return publicUsers;
};

const getJoinedUserById = async (idUser) => {
  // On reutilise userSelectQuery pour garder la meme structure de donnees
  // partout dans le controleur.
  const [rows] = await connection.execute(
    `${userSelectQuery}
    WHERE u.id_user = ?`,
    [idUser]
  );

  return rows[0] || null;
};

const getRawUserById = async (idUser) => {
  // Version "brute" de l'utilisateur, utile quand on a besoin du mot de passe
  // ou des IDs techniques sans jointures supplementaires.
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
  // Si aucune categorie par defaut n'est definie, il n'y a rien a verifier.
  if (defaultCategoryId === null || defaultCategoryId === undefined) {
    return null;
  }

  // On verifie d'abord que la categorie existe bien.
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

  // Ensuite, on verifie que cette categorie appartient bien a l'utilisateur.
  // Cela empeche un utilisateur d'utiliser la categorie d'un autre.
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
  // Chaque cle etrangere doit pointer vers une ligne existante.
  // Ici on controle les references vers savenest puis vers roles.
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
  // On cherche si un autre utilisateur utilise deja le meme pseudo
  // ou le meme email. Lors d'une mise a jour, excludeId permet d'ignorer
  // l'utilisateur que l'on est en train de modifier.
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
  // Certains utilisateurs ont besoin d'un espace SaveNest cree automatiquement
  // au moment de l'inscription. Cette fonction isole cette creation.
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
  // On commence par nettoyer la liste recue du front.
  const normalizedLanguages = normalizeSpokenLanguages(spokenLanguages);

  if (normalizedLanguages.length === 0) {
    return { status: 400, message: "Choisissez au moins une langue parlée." };
  }

  // Exemple si normalizedLanguages = ["Francais", "Anglais"] :
  // placeholders deviendra "?, ?" pour alimenter la clause IN (...).
  const placeholders = normalizedLanguages.map(() => "?").join(", ");
  const [rows] = await executor.execute(
    `SELECT id_language, language_name
    FROM language_
    WHERE language_name IN (${placeholders})`,
    normalizedLanguages
  );

  // Si on n'a pas retrouve autant de lignes que de langues demandees,
  // cela signifie qu'au moins une langue envoyee par le front est inconnue.
  if (rows.length !== normalizedLanguages.length) {
    const foundNames = [];
    const missingLanguages = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const languageName = rows[rowIndex].language_name;

      if (!foundNames.includes(languageName)) {
        foundNames.push(languageName);
      }
    }

    for (
      let languageIndex = 0;
      languageIndex < normalizedLanguages.length;
      languageIndex += 1
    ) {
      const languageName = normalizedLanguages[languageIndex];

      if (!foundNames.includes(languageName)) {
        missingLanguages.push(languageName);
      }
    }

    return {
      status: 400,
      message: `Langues invalides : ${missingLanguages.join(", ")}.`,
    };
  }

  // On cree ensuite la relation entre l'utilisateur et chaque langue.
  for (const row of rows) {
    await executor.execute(
      "INSERT INTO speaking (id_user, id_language) VALUES (?, ?)",
      [idUser, row.id_language]
    );
  }

  return null;
};

const replaceSpokenLanguages = async ({
  idUser,
  spokenLanguages,
  executor = connection,
}) => {
  // Pour une mise a jour, on remplace completement la liste des langues si elle
  // est fournie. Cela garde un comportement simple et previsible cote front.
  const normalizedLanguages = normalizeSpokenLanguages(spokenLanguages);

  if (normalizedLanguages.length === 0) {
    return { status: 400, message: "Choisissez au moins une langue parlée." };
  }

  await executor.execute("DELETE FROM speaking WHERE id_user = ?", [idUser]);

  return insertSpokenLanguages({
    idUser,
    spokenLanguages: normalizedLanguages,
    executor,
  });
};

export const getAllUsers = async (req, res) => {
  try {
    // On recupere tous les utilisateurs, puis on les transforme
    // dans un format public sans donnees sensibles.
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
    // Les parametres d'URL arrivent sous forme de chaine.
    // On les convertit d'abord en entier exploitable.
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
  // Cette route d'inscription fait plusieurs choses d'un coup :
  // 1. verifier les champs envoyes par le front,
  // 2. creer ou reutiliser un espace SaveNest,
  // 3. enregistrer l'utilisateur avec un mot de passe hache,
  // 4. lier les langues parlees dans la table speaking.
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

    // Ici on bloque tout de suite les cas incomplets avant d'aller en base.
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

    // bcrypt.hash(...) transforme le mot de passe brut en hash securise.
    // On ne stocke jamais le mot de passe en clair dans la base.
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const db = await connection.getConnection();

    try {
      // Une transaction permet de dire :
      // "soit toutes les operations reussissent, soit aucune n'est conservee".
      // C'est utile ici car on cree potentiellement plusieurs lignes liees.
      await db.beginTransaction();

      let nextSaveNestId = parsedSaveNest;

      if (nextSaveNestId === null) {
        // Si aucun espace SaveNest n'a ete fourni, on verifie d'abord que le role
        // existe, puis on cree automatiquement un nouvel espace SaveNest.
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
        // Sinon, on controle simplement que les references envoyees existent.
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

      // Une fois l'utilisateur cree, on ajoute ses langues parlees
      // dans la table de liaison.
      const languagesError = await insertSpokenLanguages({
        idUser: result.insertId,
        spokenLanguages: normalizedLanguages,
        executor: db,
      });

      if (languagesError) {
        await db.rollback();
        return res.status(languagesError.status).json({ message: languagesError.message });
      }

      // Si tout s'est bien passe, on valide definitivement la transaction.
      await db.commit();

      const createdUser = await getJoinedUserById(result.insertId);
      const publicUser = await buildPublicUser(createdUser);

      return res.status(201).json({
        message: "Inscription réussie.",
        user: publicUser,
      });
    } catch (error) {
      // Au moindre probleme, on annule toutes les ecritures faites
      // depuis beginTransaction().
      await db.rollback();
      throw error;
    } finally {
      // On libere toujours la connexion empruntee au pool.
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
    const currentPasswordRaw =
      req.body.current_password === undefined ? null : String(req.body.current_password);
    const hasProvidedSaveNest = Object.prototype.hasOwnProperty.call(
      req.body,
      "id_savenest"
    );
    const nextSaveNest = hasProvidedSaveNest
      ? parsePositiveId(req.body.id_savenest)
      : existingUser.id_savenest;
    const hasProvidedRole = Object.prototype.hasOwnProperty.call(req.body, "id_role");
    const nextRole =
      hasProvidedRole ? parsePositiveId(req.body.id_role) : existingUser.id_role;
    const hasProvidedDefaultCategory = Object.prototype.hasOwnProperty.call(
      req.body,
      "default_category_id"
    );
    const hasProvidedSpokenLanguages = Object.prototype.hasOwnProperty.call(
      req.body,
      "spoken_languages"
    );
    const parsedDefaultCategory = parseOptionalPositiveId(
      hasProvidedDefaultCategory
        ? req.body.default_category_id
        : existingUser.default_category_id
    );
    const nextDefaultCategory = parsedDefaultCategory.value;

    // Chaque valeur "next..." represente l'etat final souhaite apres la mise a jour.
    // Si un champ n'est pas fourni dans la requete, on conserve la valeur existante.
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

    if (!isAdminUser(req.authUser) && hasProvidedSaveNest) {
      return res.status(403).json({
        message: "Seul un administrateur peut modifier l'espace SaveNest d'un utilisateur.",
      });
    }

    // Un mot de passe vide n'a pas de sens. En revanche, null signifie
    // "ne pas changer le mot de passe".
    if (nextPasswordRaw !== null && nextPasswordRaw.trim() === "") {
      return res.status(400).json({ message: "password ne peut pas être vide." });
    }

    if (nextPasswordRaw !== null && req.authUser && req.authUser.id_user === idUser) {
      if (currentPasswordRaw === null || currentPasswordRaw.trim() === "") {
        return res.status(400).json({
          message: "Le mot de passe actuel est requis pour définir un nouveau mot de passe.",
        });
      }

      const currentPasswordCheck = await verifyStoredPassword(
        currentPasswordRaw,
        existingUser.password
      );

      if (!currentPasswordCheck.isValid) {
        return res.status(403).json({
          message: "Le mot de passe actuel est incorrect.",
        });
      }
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

    // Si un nouveau mot de passe est fourni, on le hache.
    // Sinon, on garde simplement le hash deja stocke.
    const nextPassword =
      nextPasswordRaw === null ? existingUser.password : await bcrypt.hash(nextPasswordRaw, 10);
    const db = await connection.getConnection();

    try {
      await db.beginTransaction();

      await db.execute(
        "UPDATE user_ SET pseudo = ?, mail = ?, password = ?, id_savenest = ?, id_role = ?, default_category_id = ? WHERE id_user = ?",
        [
          nextPseudo,
          nextMail,
          nextPassword,
          nextSaveNest,
          nextRole,
          nextDefaultCategory,
          idUser,
        ]
      );

      if (hasProvidedSpokenLanguages) {
        const languagesError = await replaceSpokenLanguages({
          idUser,
          spokenLanguages: req.body.spoken_languages,
          executor: db,
        });

        if (languagesError) {
          await db.rollback();
          return res.status(languagesError.status).json({
            message: languagesError.message,
          });
        }
      }

      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }

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

    const existingUser = await getRawUserById(idUser);

    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const db = await connection.getConnection();

    try {
      await db.beginTransaction();

      // Si des categories de cet utilisateur sont definies comme categorie par
      // defaut, on les retire avant suppression pour eviter une contrainte FK.
      await db.execute(
        `UPDATE user_
        SET default_category_id = NULL
        WHERE default_category_id IN (
          SELECT id_category
          FROM (
            SELECT id_category
            FROM category
            WHERE id_user = ?
          ) AS owned_categories
        )`,
        [idUser]
      );

      // On supprime d'abord les favoris relies aux categories de l'utilisateur.
      await db.execute(
        `DELETE FROM favs
        WHERE id_category IN (
          SELECT id_category
          FROM (
            SELECT id_category
            FROM category
            WHERE id_user = ?
          ) AS owned_categories
        )`,
        [idUser]
      );

      await db.execute("DELETE FROM speaking WHERE id_user = ?", [idUser]);
      await db.execute("DELETE FROM category WHERE id_user = ?", [idUser]);

      const [deleteUserResult] = await db.execute(
        "DELETE FROM user_ WHERE id_user = ?",
        [idUser]
      );

      if (deleteUserResult.affectedRows === 0) {
        await db.rollback();
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }

      // Si l'espace SaveNest n'est plus partage avec aucun autre utilisateur,
      // on le nettoie aussi pour eviter les lignes orphelines.
      const [remainingUsersRows] = await db.execute(
        "SELECT id_user FROM user_ WHERE id_savenest = ? LIMIT 1",
        [existingUser.id_savenest]
      );

      if (remainingUsersRows.length === 0) {
        await db.execute("DELETE FROM savenest WHERE id_savenest = ?", [
          existingUser.id_savenest,
        ]);
      }

      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }

    return res.status(200).json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const loginUser = async (req, res) => {
  // La connexion accepte soit un email, soit un pseudo dans le champ identifier.
  // Cette route :
  // 1. choisit le bon identifiant,
  // 2. retrouve l'utilisateur,
  // 3. verifie le mot de passe,
  // 4. retourne un token JWT si tout est correct.
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

    // On cherche par email en minuscules ou par pseudo exact.
    // LIMIT 1 garantit qu'on ne prend au maximum qu'un seul utilisateur.
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

    // Cas legacy : si l'ancien mot de passe en clair a fonctionne,
    // on en profite pour le remplacer immediatement par un hash bcrypt.
    if (passwordCheck.needsUpgrade) {
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      await connection.execute(
        "UPDATE user_ SET password = ? WHERE id_user = ?",
        [hashedPassword, user.id_user]
      );
    }

    const fullUser = await getJoinedUserById(user.id_user);
    const secret = process.env.JWT_SECRET || "dev_secret_change_me";

    // Le JWT contient les infos minimales utiles pour reconnaitre l'utilisateur
    // sur les prochaines requetes authentifiees.
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
  // Ici, rien n'est a supprimer cote serveur car le JWT est gere cote client.
  // On renvoie simplement une confirmation au front.
  return res.status(200).json({ message: "Déconnexion réussie (côté client)." });
};
