// Ce controleur gere la lecture et la modification des categories.
import connection from "../config/database.js";
import { isPrivilegedUser } from "../middlewares/auth.js";

// Les fonctions suivantes servent a reutiliser la meme logique dans plusieurs routes.
function parsePositiveId(value) {
  // Les IDs arrivent souvent sous forme de texte depuis l'URL.
  // On les convertit et on refuse les valeurs qui ne sont pas des entiers positifs.
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function canAccessUserOwnedResource(req, ownerId) {
  // Admin et moderateur peuvent acceder aux ressources de tous les utilisateurs.
  if (isPrivilegedUser(req.authUser)) {
    return true;
  }

  // Un utilisateur classique doit posseder la ressource.
  if (!req.authUser) {
    return false;
  }

  return req.authUser.id_user === ownerId;
}

function parseConfidentiality(value, fallback = 0) {
  // La base attend 0 ou 1, mais le front peut envoyer plusieurs formats.
  // Cette fonction transforme tout en 0, 1 ou null si la valeur est invalide.
  if (value === undefined) {
    return fallback;
  }

  if (value === 1 || value === "1" || value === true) {
    return 1;
  }

  if (value === 0 || value === "0" || value === false) {
    return 0;
  }

  return null;
}

function toPublicCategory(row) {
  // Important : on ne renvoie jamais le mot de passe d'une categorie au navigateur.
  return {
    id_category: row.id_category,
    category_name: row.category_name,
    confidentiality: row.confidentiality,
    id_user: row.id_user,
  };
}

async function getCategoryRowById(idCategory) {
  // Fonction interne : elle recupere aussi le mot de passe pour les verifications.
  const [rows] = await connection.execute(
    "SELECT id_category, category_name, confidentiality, password, id_user FROM category WHERE id_category = ?",
    [idCategory]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function userExists(idUser) {
  // Verification simple pour eviter de relier une categorie a un utilisateur inexistant.
  const [rows] = await connection.execute(
    "SELECT id_user FROM user_ WHERE id_user = ? LIMIT 1",
    [idUser]
  );

  return rows.length > 0;
}

export async function getAllCategories(req, res) {
  try {
    // La page categories standard doit toujours montrer uniquement
    // les categories du compte connecte, meme pour un administrateur.
    const [rows] = await connection.execute(
      "SELECT id_category, category_name, confidentiality, id_user FROM category WHERE id_user = ? ORDER BY id_category ASC",
      [req.authUser.id_user]
    );
    const publicCategories = [];

    // Boucle volontairement explicite pour un lecteur debutant.
    for (let index = 0; index < rows.length; index += 1) {
      publicCategories.push(toPublicCategory(rows[index]));
    }

    return res.status(200).json(publicCategories);
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function getAdminCategories(req, res) {
  try {
    // Vue dediee a l'administration : liste complete avec proprietaire.
    const [rows] = await connection.execute(
      `SELECT
        c.id_category,
        c.category_name,
        c.confidentiality,
        c.id_user,
        u.pseudo AS owner_pseudo,
        u.mail AS owner_mail
      FROM category c
      INNER JOIN user_ u ON u.id_user = c.id_user
      ORDER BY c.id_category ASC`
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getAdminCategories:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function getAdminCategoriesByUserId(req, res) {
  try {
    const idUser = parsePositiveId(req.params.userId);

    if (!idUser) {
      return res.status(400).json({ message: "ID utilisateur invalide." });
    }

    const [userRows] = await connection.execute(
      "SELECT id_user, pseudo, mail FROM user_ WHERE id_user = ? LIMIT 1",
      [idUser]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const [rows] = await connection.execute(
      `SELECT
        c.id_category,
        c.category_name,
        c.confidentiality,
        c.id_user,
        u.pseudo AS owner_pseudo,
        u.mail AS owner_mail
      FROM category c
      INNER JOIN user_ u ON u.id_user = c.id_user
      WHERE c.id_user = ?
      ORDER BY c.id_category ASC`,
      [idUser]
    );

    return res.status(200).json({
      user: userRows[0],
      categories: rows,
    });
  } catch (error) {
    console.error("Error in getAdminCategoriesByUserId:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function getCategoryById(req, res) {
  try {
    // Etape 1 : verifier l'identifiant recu dans l'URL.
    const id = parsePositiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de catégorie invalide." });
    }

    // Etape 2 : recuperer la categorie complete en base.
    const category = await getCategoryRowById(id);

    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    // Etape 3 : refuser l'acces si la categorie appartient a quelqu'un d'autre.
    if (!canAccessUserOwnedResource(req, category.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    return res.status(200).json(toPublicCategory(category));
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function createCategory(req, res) {
  // Une categorie privee doit toujours avoir un mot de passe.
  try {
    // On nettoie les champs recus avant toute verification ou requete SQL.
    const body = req.body;
    const categoryName =
      typeof body.category_name === "string" ? body.category_name.trim() : "";
    const confidentialValue = parseConfidentiality(body.confidentiality, 0);
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const nextIdUser =
      body.id_user === undefined ? req.authUser.id_user : parsePositiveId(body.id_user);

    if (!categoryName) {
      return res.status(400).json({ message: "Le nom de catégorie est obligatoire." });
    }

    if (!nextIdUser) {
      return res.status(400).json({ message: "id_user est obligatoire et doit être valide." });
    }

    if (!canAccessUserOwnedResource(req, nextIdUser)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    if (confidentialValue === null) {
      return res.status(400).json({ message: "confidentiality doit valoir 0 ou 1." });
    }

    if (confidentialValue === 1 && !password) {
      // Sans mot de passe, une categorie privee ne protegerait rien.
      return res.status(400).json({
        message: "Un mot de passe est requis pour une catégorie confidentielle.",
      });
    }

    const existingUser = await userExists(nextIdUser);

    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const [result] = await connection.execute(
      // Les points d'interrogation sont remplaces par MySQL de facon securisee.
      "INSERT INTO category (category_name, confidentiality, password, id_user) VALUES (?, ?, ?, ?)",
      [categoryName, confidentialValue, confidentialValue === 1 ? password : null, nextIdUser]
    );

    const newCategory = await getCategoryRowById(result.insertId);

    return res.status(201).json({
      message: "Catégorie créée avec succès.",
      category: toPublicCategory(newCategory),
    });
  } catch (error) {
    console.error("Error in createCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function updateCategory(req, res) {
  try {
    // On lit d'abord l'ancienne categorie pour garder les champs non modifies.
    const id = parsePositiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de catégorie invalide." });
    }

    const currentCategory = await getCategoryRowById(id);

    if (!currentCategory) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    if (!canAccessUserOwnedResource(req, currentCategory.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const body = req.body;
    // Pour chaque champ : undefined signifie "ne pas changer cette valeur".
    const nextCategoryName =
      body.category_name === undefined
        ? currentCategory.category_name
        : String(body.category_name).trim();
    const nextConfidentiality = parseConfidentiality(
      body.confidentiality,
      currentCategory.confidentiality
    );
    const currentConfidentiality = parseConfidentiality(
      currentCategory.confidentiality,
      0
    );
    const submittedPassword =
      typeof body.password === "string" ? body.password.trim() : "";
    const nextIdUser =
      body.id_user === undefined
        ? currentCategory.id_user
        : parsePositiveId(body.id_user);
    let nextPassword = currentCategory.password;

    if (!nextCategoryName) {
      return res.status(400).json({ message: "Le nom de catégorie ne peut pas être vide." });
    }

    if (!nextIdUser) {
      return res.status(400).json({ message: "id_user doit être un entier valide." });
    }

    if (!isPrivilegedUser(req.authUser) && nextIdUser !== currentCategory.id_user) {
      return res.status(403).json({
        message: "Vous ne pouvez pas réassigner une catégorie à un autre utilisateur.",
      });
    }

    if (nextConfidentiality === null) {
      return res.status(400).json({ message: "confidentiality doit valoir 0 ou 1." });
    }

    if (currentConfidentiality === 1) {
      // Pour une categorie deja privee, le mot de passe actuel confirme l'action.
      if (!submittedPassword) {
        if (nextConfidentiality === 0) {
          return res.status(400).json({
            message:
              "Le mot de passe actuel de la catégorie est requis pour la rendre publique.",
          });
        }

        return res.status(400).json({
          message:
            "Le mot de passe actuel de la catégorie est requis pour confirmer la modification.",
        });
      }

      if (submittedPassword !== String(currentCategory.password || "")) {
        return res.status(403).json({ message: "Mauvais mot de passe." });
      }

      if (nextConfidentiality === 1) {
        nextPassword = currentCategory.password;
      } else {
        nextPassword = null;
      }
    } else if (nextConfidentiality === 1) {
      if (!submittedPassword) {
        return res.status(400).json({
          message: "Un mot de passe est requis pour une catégorie confidentielle.",
        });
      }

      nextPassword = submittedPassword;
    } else {
      nextPassword = null;
    }

    const existingUser = await userExists(nextIdUser);

    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    await connection.execute(
      // Toutes les validations sont passees : on applique la modification.
      "UPDATE category SET category_name = ?, confidentiality = ?, password = ?, id_user = ? WHERE id_category = ?",
      [nextCategoryName, nextConfidentiality, nextPassword, nextIdUser, id]
    );

    const updatedCategory = await getCategoryRowById(id);

    return res.status(200).json({
      message: "Catégorie mise à jour avec succès.",
      category: toPublicCategory(updatedCategory),
    });
  } catch (error) {
    console.error("Error in updateCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function deleteCategory(req, res) {
  try {
    // La suppression suit le meme schema : ID valide, ressource existante, droit d'acces.
    const id = parsePositiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de catégorie invalide." });
    }

    const category = await getCategoryRowById(id);

    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    if (!canAccessUserOwnedResource(req, category.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    await connection.execute("DELETE FROM category WHERE id_category = ?", [id]);

    return res.status(200).json({ message: "Catégorie supprimée avec succès." });
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function unlockCategory(req, res) {
  try {
    // Cette route ne change pas la base : elle verifie juste le mot de passe.
    const id = parsePositiveId(req.params.id);
    const submittedPassword =
      typeof req.body.password === "string" ? req.body.password.trim() : "";

    if (!id) {
      return res.status(400).json({ message: "ID de catégorie invalide." });
    }

    const category = await getCategoryRowById(id);

    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    if (!canAccessUserOwnedResource(req, category.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    if (Number(category.confidentiality) !== 1) {
      return res.status(200).json({
        message: "Cette catégorie est déjà publique.",
        category: toPublicCategory(category),
      });
    }

    if (!submittedPassword) {
      return res.status(400).json({
        message: "Le mot de passe de la catégorie est obligatoire.",
      });
    }

    if (submittedPassword !== String(category.password || "")) {
      return res.status(403).json({ message: "Mauvais mot de passe." });
    }

    return res.status(200).json({
      message: "Catégorie déverrouillée.",
      category: toPublicCategory(category),
    });
  } catch (error) {
    console.error("Error in unlockCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}
