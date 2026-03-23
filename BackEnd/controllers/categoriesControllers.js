import connection from "../config/database.js";

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

export const getAllCategories = async (req, res) => {
  try {
    const [rows] = await connection.execute(
      "SELECT id_category, category_name, confidentiality, id_user FROM category ORDER BY id_category ASC"
    );

    return res.status(200).json(rows.map(toPublicCategory));
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de catégorie invalide." });
    }

    const [rows] = await connection.execute(
      "SELECT id_category, category_name, confidentiality, id_user FROM category WHERE id_category = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    return res.status(200).json(toPublicCategory(rows[0]));
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

    if (!trimmedCategoryName) {
      return res.status(400).json({ message: "Le nom de catégorie est obligatoire." });
    }

    if (!id_user || !Number.isInteger(Number(id_user)) || Number(id_user) <= 0) {
      return res.status(400).json({ message: "id_user est obligatoire et doit être valide." });
    }

    if (confidentialValue === null) {
      return res.status(400).json({ message: "confidentiality doit valoir 0 ou 1." });
    }

    if (confidentialValue === 1 && !trimmedPassword) {
      return res.status(400).json({ message: "Un mot de passe est requis pour une catégorie confidentielle." });
    }

    const [result] = await connection.execute(
      "INSERT INTO category (category_name, confidentiality, password, id_user) VALUES (?, ?, ?, ?)",
      [trimmedCategoryName, confidentialValue, confidentialValue ? trimmedPassword : null, Number(id_user)]
    );

    const [newCategoryRows] = await connection.execute(
      "SELECT id_category, category_name, confidentiality, id_user FROM category WHERE id_category = ?",
      [result.insertId]
    );

    return res.status(201).json({
      message: "Catégorie créée avec succès.",
      category: toPublicCategory(newCategoryRows[0]),
    });
  } catch (error) {
    console.error("Error in createCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { category_name, confidentiality, password, id_user } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de catégorie invalide." });
    }

    const [existingRows] = await connection.execute(
      "SELECT id_category, category_name, confidentiality, password, id_user FROM category WHERE id_category = ?",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    const currentCategory = existingRows[0];
    const nextConfidentiality = parseConfidentiality(confidentiality, currentCategory.confidentiality);

    const nextCategoryName =
      category_name === undefined ? currentCategory.category_name : String(category_name).trim();
    const nextIdUser = id_user === undefined ? currentCategory.id_user : Number(id_user);
    let nextPassword = password === undefined ? currentCategory.password : password;

    if (!nextCategoryName) {
      return res.status(400).json({ message: "Le nom de catégorie ne peut pas être vide." });
    }

    if (!Number.isInteger(nextIdUser) || nextIdUser <= 0) {
      return res.status(400).json({ message: "id_user doit être un entier valide." });
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

    await connection.execute(
      "UPDATE category SET category_name = ?, confidentiality = ?, password = ?, id_user = ? WHERE id_category = ?",
      [nextCategoryName, nextConfidentiality, nextPassword, nextIdUser, id]
    );

    const [updatedRows] = await connection.execute(
      "SELECT id_category, category_name, confidentiality, id_user FROM category WHERE id_category = ?",
      [id]
    );

    return res.status(200).json({
      message: "Catégorie mise à jour avec succès.",
      category: toPublicCategory(updatedRows[0]),
    });
  } catch (error) {
    console.error("Error in updateCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de catégorie invalide." });
    }

    const [result] = await connection.execute(
      "DELETE FROM category WHERE id_category = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    return res.status(200).json({ message: "Catégorie supprimée avec succès." });
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};
