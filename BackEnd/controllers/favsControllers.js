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

const favSelectQuery = `
  SELECT
    f.id_favs,
    f.title_favs,
    f.url_favs,
    f.added_date,
    f.logo,
    f.id_category,
    c.category_name,
    c.confidentiality,
    c.id_user
  FROM favs f
  INNER JOIN category c ON c.id_category = f.id_category
`;

const getRawFavById = async (id) => {
  const [rows] = await connection.execute(
    "SELECT id_favs, title_favs, url_favs, added_date, logo, id_category FROM favs WHERE id_favs = ?",
    [id]
  );

  return rows[0] || null;
};

const getCategoryRowById = async (idCategory) => {
  const [rows] = await connection.execute(
    "SELECT id_category, category_name, confidentiality, id_user FROM category WHERE id_category = ?",
    [idCategory]
  );

  return rows[0] || null;
};

const getJoinedFavById = async (id, authUser) => {
  const isPrivileged = isPrivilegedUser(authUser);
  const query = isPrivileged
    ? `${favSelectQuery}
    WHERE f.id_favs = ?`
    : `${favSelectQuery}
    WHERE f.id_favs = ? AND c.id_user = ?`;
  const values = isPrivileged ? [id] : [id, authUser.id_user];
  const [rows] = await connection.execute(
    query,
    values
  );

  return rows[0] || null;
};

export const getAllFavs = async (req, res) => {
  try {
    const isPrivileged = isPrivilegedUser(req.authUser);
    const query = isPrivileged
      ? `${favSelectQuery}
      ORDER BY f.id_favs ASC`
      : `${favSelectQuery}
      WHERE c.id_user = ?
      ORDER BY f.id_favs ASC`;
    const values = isPrivileged ? [] : [req.authUser.id_user];
    const [rows] = await connection.execute(
      query,
      values
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getAllFavs:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getFavById = async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const fav = await getJoinedFavById(id, req.authUser);

    if (!fav) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    return res.status(200).json(fav);
  } catch (error) {
    console.error("Error in getFavById:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const createFav = async (req, res) => {
  try {
    const {
      title_favs,
      url_favs = null,
      added_date = null,
      logo = null,
      id_category,
    } = req.body;
    const trimmedTitle = typeof title_favs === "string" ? title_favs.trim() : "";
    const trimmedUrl = typeof url_favs === "string" ? url_favs.trim() : null;
    const trimmedLogo = typeof logo === "string" ? logo.trim() : null;
    const parsedCategoryId = parsePositiveId(id_category);

    if (!trimmedTitle) {
      return res.status(400).json({ message: "title_favs est obligatoire." });
    }

    if (!parsedCategoryId) {
      return res.status(400).json({ message: "id_category est obligatoire et doit être valide." });
    }

    const targetCategory = await getCategoryRowById(parsedCategoryId);

    if (!targetCategory) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    if (!canAccessUserOwnedResource(req, targetCategory.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const [result] = await connection.execute(
      "INSERT INTO favs (title_favs, url_favs, added_date, logo, id_category) VALUES (?, ?, ?, ?, ?)",
      [trimmedTitle, trimmedUrl || null, added_date || null, trimmedLogo || null, parsedCategoryId]
    );

    const newFav =
      (await getJoinedFavById(result.insertId, req.authUser)) ||
      (await getRawFavById(result.insertId));

    return res.status(201).json({
      message: "Favori créé avec succès.",
      fav: newFav,
    });
  } catch (error) {
    console.error("Error in createFav:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const updateFav = async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    const { title_favs, url_favs, added_date, logo, id_category } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const currentFav = await getJoinedFavById(id, req.authUser);

    if (!currentFav) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    const nextTitle = title_favs === undefined ? currentFav.title_favs : String(title_favs).trim();
    const nextUrl = url_favs === undefined ? currentFav.url_favs : (typeof url_favs === "string" ? url_favs.trim() : null);
    const nextDate = added_date === undefined ? currentFav.added_date : added_date;
    const nextLogo = logo === undefined ? currentFav.logo : (typeof logo === "string" ? logo.trim() : null);
    const nextCategoryId =
      id_category === undefined ? currentFav.id_category : parsePositiveId(id_category);

    if (!nextTitle) {
      return res.status(400).json({ message: "title_favs ne peut pas être vide." });
    }

    if (!nextCategoryId) {
      return res.status(400).json({ message: "id_category doit être un entier valide." });
    }

    const targetCategory = await getCategoryRowById(nextCategoryId);

    if (!targetCategory) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    if (!canAccessUserOwnedResource(req, targetCategory.id_user)) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    await connection.execute(
      "UPDATE favs SET title_favs = ?, url_favs = ?, added_date = ?, logo = ?, id_category = ? WHERE id_favs = ?",
      [nextTitle, nextUrl || null, nextDate || null, nextLogo || null, nextCategoryId, id]
    );

    const updatedFav = await getJoinedFavById(id, req.authUser);

    return res.status(200).json({
      message: "Favori mis à jour avec succès.",
      fav: updatedFav,
    });
  } catch (error) {
    console.error("Error in updateFav:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const deleteFav = async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const currentFav = await getJoinedFavById(id, req.authUser);

    if (!currentFav) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    const [result] = await connection.execute("DELETE FROM favs WHERE id_favs = ?", [id]);

    return res.status(200).json({ message: "Favori supprimé avec succès." });
  } catch (error) {
    console.error("Error in deleteFav:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};
