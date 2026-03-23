import connection from "../config/database.js";

export const getAllFavs = async (req, res) => {
  try {
    const [rows] = await connection.execute(
      "SELECT id_favs, title_favs, url_favs, added_date, logo FROM favs ORDER BY id_favs ASC"
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getAllFavs:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getFavById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const [rows] = await connection.execute(
      "SELECT id_favs, title_favs, url_favs, added_date, logo FROM favs WHERE id_favs = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error in getFavById:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const createFav = async (req, res) => {
  try {
    const { title_favs, url_favs = null, added_date = null, logo = null } = req.body;
    const trimmedTitle = typeof title_favs === "string" ? title_favs.trim() : "";
    const trimmedUrl = typeof url_favs === "string" ? url_favs.trim() : null;
    const trimmedLogo = typeof logo === "string" ? logo.trim() : null;

    if (!trimmedTitle) {
      return res.status(400).json({ message: "title_favs est obligatoire." });
    }

    const [result] = await connection.execute(
      "INSERT INTO favs (title_favs, url_favs, added_date, logo) VALUES (?, ?, ?, ?)",
      [trimmedTitle, trimmedUrl || null, added_date || null, trimmedLogo || null]
    );

    const [newRows] = await connection.execute(
      "SELECT id_favs, title_favs, url_favs, added_date, logo FROM favs WHERE id_favs = ?",
      [result.insertId]
    );

    return res.status(201).json({
      message: "Favori créé avec succès.",
      fav: newRows[0],
    });
  } catch (error) {
    console.error("Error in createFav:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const updateFav = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title_favs, url_favs, added_date, logo } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const [existingRows] = await connection.execute(
      "SELECT id_favs, title_favs, url_favs, added_date, logo FROM favs WHERE id_favs = ?",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    const currentFav = existingRows[0];
    const nextTitle = title_favs === undefined ? currentFav.title_favs : String(title_favs).trim();
    const nextUrl = url_favs === undefined ? currentFav.url_favs : (typeof url_favs === "string" ? url_favs.trim() : null);
    const nextDate = added_date === undefined ? currentFav.added_date : added_date;
    const nextLogo = logo === undefined ? currentFav.logo : (typeof logo === "string" ? logo.trim() : null);

    if (!nextTitle) {
      return res.status(400).json({ message: "title_favs ne peut pas être vide." });
    }

    await connection.execute(
      "UPDATE favs SET title_favs = ?, url_favs = ?, added_date = ?, logo = ? WHERE id_favs = ?",
      [nextTitle, nextUrl || null, nextDate || null, nextLogo || null, id]
    );

    const [updatedRows] = await connection.execute(
      "SELECT id_favs, title_favs, url_favs, added_date, logo FROM favs WHERE id_favs = ?",
      [id]
    );

    return res.status(200).json({
      message: "Favori mis à jour avec succès.",
      fav: updatedRows[0],
    });
  } catch (error) {
    console.error("Error in updateFav:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const deleteFav = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const [result] = await connection.execute("DELETE FROM favs WHERE id_favs = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    return res.status(200).json({ message: "Favori supprimé avec succès." });
  } catch (error) {
    console.error("Error in deleteFav:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};
