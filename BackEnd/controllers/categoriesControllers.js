// Ce controleur gere la lecture et la modification des categories.
import connection from "../config/database.js";
import { isPrivilegedUser } from "../middlewares/auth.js";

// Les fonctions suivantes servent a reutiliser la meme logique dans plusieurs routes.
function parsePositiveId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function canAccessUserOwnedResource(req, ownerId) {
  if (isPrivilegedUser(req.authUser)) {
    return true;
  }

  if (!req.authUser) {
    return false;
  }

  return req.authUser.id_user === ownerId;
}

function parseConfidentiality(value, fallback = 0) {
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
  return {
    id_category: row.id_category,
    category_name: row.category_name,
    confidentiality: row.confidentiality,
    id_user: row.id_user,
  };
}

async function getCategoryRowById(idCategory) {
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
  const [rows] = await connection.execute(
    "SELECT id_user FROM user_ WHERE id_user = ? LIMIT 1",
    [idUser]
  );

  return rows.length > 0;
}

export async function getAllCategories(req, res) {
  try {
    let query =
      "SELECT id_category, category_name, confidentiality, id_user FROM category WHERE id_user = ? ORDER BY id_category ASC";
    let values = [req.authUser.id_user];

    if (isPrivilegedUser(req.authUser)) {
      query =
        "SELECT id_category, category_name, confidentiality, id_user FROM category ORDER BY id_category ASC";
      values = [];
    }

    const [rows] = await connection.execute(query, values);
    const publicCategories = [];

    for (let index = 0; index < rows.length; index += 1) {
      publicCategories.push(toPublicCategory(rows[index]));
    }

    return res.status(200).json(publicCategories);
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function getCategoryById(req, res) {
  try {
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

    return res.status(200).json(toPublicCategory(category));
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function createCategory(req, res) {
  // Une categorie privee doit toujours avoir un mot de passe.
  try {
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
      return res.status(400).json({
        message: "Un mot de passe est requis pour une catégorie confidentielle.",
      });
    }

    const existingUser = await userExists(nextIdUser);

    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const [result] = await connection.execute(
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
