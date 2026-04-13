import connection from "../config/database.js";
import { isPrivilegedUser } from "../middlewares/auth.js";

const parsePositiveId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const canAccessUserOwnedResource = (req, ownerId) => {
  return isPrivilegedUser(req.authUser) || req.authUser?.id_user === ownerId;
};

const parseConfidentiality = (value, fallback = 0) => {
  if (value === undefined) return fallback;
  if (value === 1 || value === "1" || value === true) return 1;
  if (value === 0 || value === "0" || value === false) return 0;
  return null;
};

const toPublicCategory = (row) => ({
  id_category: row.id_category,
  category_name: row.category_name,
  confidentiality: row.confidentiality,
  id_user: row.id_user,
});

const getCategoryRowById = async (idCategory) => {
  const [rows] = await connection.execute(
    "SELECT id_category, category_name, confidentiality, password, id_user FROM category WHERE id_category = ?",
    [idCategory]
  );

  return rows[0] || null;
};

const userExists = async (idUser) => {
  const [rows] = await connection.execute(
    "SELECT id_user FROM user_ WHERE id_user = ? LIMIT 1",
    [idUser]
  );

  return rows.length > 0;
};

export const getAllCategories = async (req, res) => {
  try {
    const isPrivileged = isPrivilegedUser(req.authUser);
    const query = isPrivileged
      ? "SELECT id_category, category_name, confidentiality, id_user FROM category ORDER BY id_category ASC"
      : "SELECT id_category, category_name, confidentiality, id_user FROM category WHERE id_user = ? ORDER BY id_category ASC";
    const values = isPrivileged ? [] : [req.authUser.id_user];
    const [rows] = await connection.execute(query, values);

    return res.status(200).json(rows.map(toPublicCategory));
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getCategoryById = async (req, res) => {
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
};

export const createCategory = async (req, res) => {
  try {
    const { category_name, confidentiality = 0, password = null, id_user } = req.body;
    const confidentialValue = parseConfidentiality(confidentiality);
    const trimmedCategoryName = typeof category_name === "string" ? category_name.trim() : "";
    const trimmedPassword = typeof password === "string" ? password.trim() : "";
    const nextIdUser = id_user === undefined ? req.authUser.id_user : parsePositiveId(id_user);

    if (!trimmedCategoryName) {
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

    if (confidentialValue === 1 && !trimmedPassword) {
      return res.status(400).json({ message: "Un mot de passe est requis pour une catégorie confidentielle." });
    }

    if (!(await userExists(nextIdUser))) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const [result] = await connection.execute(
      "INSERT INTO category (category_name, confidentiality, password, id_user) VALUES (?, ?, ?, ?)",
      [trimmedCategoryName, confidentialValue, confidentialValue ? trimmedPassword : null, nextIdUser]
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
};

export const updateCategory = async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    const { category_name, confidentiality, password, id_user } = req.body;

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

    const nextConfidentiality = parseConfidentiality(confidentiality, currentCategory.confidentiality);

    const nextCategoryName =
      category_name === undefined ? currentCategory.category_name : String(category_name).trim();
    const nextIdUser =
      id_user === undefined ? currentCategory.id_user : parsePositiveId(id_user);
    let nextPassword = password === undefined ? currentCategory.password : password;

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

    if (nextConfidentiality === 1 && (!nextPassword || String(nextPassword).trim() === "")) {
      return res.status(400).json({ message: "Un mot de passe est requis pour une catégorie confidentielle." });
    }

    if (nextConfidentiality === 0) {
      nextPassword = null;
    }

    if (!(await userExists(nextIdUser))) {
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
};

export const deleteCategory = async (req, res) => {
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

    const [result] = await connection.execute(
      "DELETE FROM category WHERE id_category = ?",
      [id]
    );

    return res.status(200).json({ message: "Catégorie supprimée avec succès." });
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const unlockCategory = async (req, res) => {
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
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    return res.status(200).json({
      message: "Catégorie déverrouillée.",
      category: toPublicCategory(category),
    });
  } catch (error) {
    console.error("Error in unlockCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};
