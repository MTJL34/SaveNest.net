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

const saveSelectQuery = `
  SELECT
    s.id_favs,
    s.id_category,
    f.title_favs,
    f.url_favs,
    f.added_date,
    f.logo,
    c.category_name,
    c.confidentiality,
    c.id_user,
    u.pseudo AS user_pseudo
  FROM save_ s
  INNER JOIN favs f ON f.id_favs = s.id_favs
  INNER JOIN category c ON c.id_category = s.id_category
  INNER JOIN user_ u ON u.id_user = c.id_user
`;

const getJoinedSaveByFavId = async (idFavs) => {
  const [rows] = await connection.execute(
    `${saveSelectQuery}
    WHERE s.id_favs = ?`,
    [idFavs]
  );

  return rows[0] || null;
};

export const getAllSave = async (req, res) => {
  try {
    const isPrivileged = isPrivilegedUser(req.authUser);
    const query = isPrivileged
      ? `${saveSelectQuery}
      ORDER BY s.id_favs ASC, s.id_category ASC`
      : `${saveSelectQuery}
      WHERE c.id_user = ?
      ORDER BY s.id_favs ASC, s.id_category ASC`;
    const values = isPrivileged ? [] : [req.authUser.id_user];
    const [rows] = await connection.execute(query, values);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getAllSave:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getSaveByFavId = async (req, res) => {
  try {
    const idFavs = parsePositiveId(req.params.id_favs);

    if (!idFavs) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const saveRow = await getJoinedSaveByFavId(idFavs);

    if (!saveRow) {
      return res.status(404).json({ message: "Attribution introuvable." });
    }

    if (!canAccessUserOwnedResource(req, saveRow.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    return res.status(200).json(saveRow);
  } catch (error) {
    console.error("Error in getSaveByFavId:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const createSave = async (req, res) => {
  try {
    const idFavs = parsePositiveId(req.body.id_favs);
    const idCategory = parsePositiveId(req.body.id_category);

    if (!idFavs || !idCategory) {
      return res.status(400).json({
        message: "id_favs et id_category sont obligatoires et doivent être valides.",
      });
    }

    const [favRows] = await connection.execute(
      "SELECT id_favs FROM favs WHERE id_favs = ?",
      [idFavs]
    );
    if (favRows.length === 0) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    const [categoryRows] = await connection.execute(
      "SELECT id_category, id_user FROM category WHERE id_category = ?",
      [idCategory]
    );
    if (categoryRows.length === 0) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    const targetCategory = categoryRows[0];
    if (!canAccessUserOwnedResource(req, targetCategory.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const [existingRows] = await connection.execute(
      "SELECT id_favs FROM save_ WHERE id_favs = ?",
      [idFavs]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({
        message: "Ce favori est déjà attribué à une catégorie.",
      });
    }

    await connection.execute(
      "INSERT INTO save_ (id_category, id_favs) VALUES (?, ?)",
      [idCategory, idFavs]
    );

    const newSave = await getJoinedSaveByFavId(idFavs);

    return res.status(201).json({
      message: "Attribution créée avec succès.",
      save: newSave,
    });
  } catch (error) {
    console.error("Error in createSave:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const updateSave = async (req, res) => {
  try {
    const idFavs = parsePositiveId(req.params.id_favs);
    const idCategory = parsePositiveId(req.body.id_category);

    if (!idFavs) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    if (!idCategory) {
      return res.status(400).json({
        message: "id_category est obligatoire et doit être valide.",
      });
    }

    const [existingRows] = await connection.execute(
      `${saveSelectQuery}
      WHERE s.id_favs = ?`,
      [idFavs]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Attribution introuvable." });
    }

    const currentSave = existingRows[0];
    if (!canAccessUserOwnedResource(req, currentSave.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const [categoryRows] = await connection.execute(
      "SELECT id_category, id_user FROM category WHERE id_category = ?",
      [idCategory]
    );
    if (categoryRows.length === 0) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    const nextCategory = categoryRows[0];
    if (!canAccessUserOwnedResource(req, nextCategory.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    await connection.execute(
      "UPDATE save_ SET id_category = ? WHERE id_favs = ?",
      [idCategory, idFavs]
    );

    const updatedSave = await getJoinedSaveByFavId(idFavs);

    return res.status(200).json({
      message: "Attribution mise à jour avec succès.",
      save: updatedSave,
    });
  } catch (error) {
    console.error("Error in updateSave:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const deleteSave = async (req, res) => {
  try {
    const idFavs = parsePositiveId(req.params.id_favs);

    if (!idFavs) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const saveRow = await getJoinedSaveByFavId(idFavs);

    if (!saveRow) {
      return res.status(404).json({ message: "Attribution introuvable." });
    }

    if (!canAccessUserOwnedResource(req, saveRow.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const [result] = await connection.execute(
      "DELETE FROM save_ WHERE id_favs = ?",
      [idFavs]
    );

    return res.status(200).json({ message: "Attribution supprimée avec succès." });
  } catch (error) {
    console.error("Error in deleteSave:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};
