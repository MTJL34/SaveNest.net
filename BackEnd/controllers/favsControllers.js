// Ce controleur gere la lecture et la modification des favoris.
import connection from "../config/database.js";
import { isPrivilegedUser } from "../middlewares/auth.js";

// Les fonctions utilitaires du haut evitent de repeter les memes verifications.
function parsePositiveId(value) {
  // Les IDs peuvent venir de l'URL ou du body.
  // Cette fonction garde une seule definition de "ID valide" dans le fichier.
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function canAccessUserOwnedResource(req, ownerId) {
  // Admin et moderateur peuvent manipuler les donnees de tous les utilisateurs.
  if (isPrivilegedUser(req.authUser)) {
    return true;
  }

  // Un utilisateur classique doit etre le proprietaire.
  if (!req.authUser) {
    return false;
  }

  return req.authUser.id_user === ownerId;
}

// Morceau de SQL reutilise dans plusieurs fonctions.
// On joint favs et category pour connaitre le proprietaire de chaque favori.
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

async function getRawFavById(id) {
  // Lecture simple sans categorie. Utile en secours juste apres une creation.
  const [rows] = await connection.execute(
    "SELECT id_favs, title_favs, url_favs, added_date, logo, id_category FROM favs WHERE id_favs = ?",
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function getCategoryRowById(idCategory) {
  // Un favori appartient toujours a une categorie.
  // On lit donc la categorie avant de creer ou deplacer un favori.
  const [rows] = await connection.execute(
    "SELECT id_category, category_name, confidentiality, id_user FROM category WHERE id_category = ?",
    [idCategory]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function getJoinedFavById(id, authUser) {
  // Lecture d'un favori avec controle du proprietaire.
  let query = `${favSelectQuery}
    WHERE f.id_favs = ? AND c.id_user = ?`;
  let values = [id, authUser.id_user];

  if (isPrivilegedUser(authUser)) {
    // Les roles privilegies n'ont pas besoin du filtre c.id_user.
    query = `${favSelectQuery}
    WHERE f.id_favs = ?`;
    values = [id];
  }

  const [rows] = await connection.execute(query, values);

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

export async function getAllFavs(req, res) {
  try {
    // Par defaut : seulement les favoris des categories de l'utilisateur connecte.
    let query = `${favSelectQuery}
      WHERE c.id_user = ?
      ORDER BY f.id_favs ASC`;
    let values = [req.authUser.id_user];

    if (isPrivilegedUser(req.authUser)) {
      // Admin/moderateur : tous les favoris.
      query = `${favSelectQuery}
      ORDER BY f.id_favs ASC`;
      values = [];
    }

    const [rows] = await connection.execute(query, values);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getAllFavs:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function getFavById(req, res) {
  try {
    // On valide l'ID avant la requete SQL pour eviter les cas incoherents.
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
}

export async function createFav(req, res) {
  // Un favori doit toujours appartenir a une categorie existante.
  try {
    // Nettoyage des valeurs envoyees par le formulaire.
    const body = req.body;
    const title = typeof body.title_favs === "string" ? body.title_favs.trim() : "";
    const url = typeof body.url_favs === "string" ? body.url_favs.trim() : null;
    const logo = typeof body.logo === "string" ? body.logo.trim() : null;
    const addedDate = body.added_date || null;
    const categoryId = parsePositiveId(body.id_category);

    if (!title) {
      return res.status(400).json({ message: "title_favs est obligatoire." });
    }

    if (!categoryId) {
      return res.status(400).json({ message: "id_category est obligatoire et doit être valide." });
    }

    const targetCategory = await getCategoryRowById(categoryId);

    if (!targetCategory) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }

    if (!canAccessUserOwnedResource(req, targetCategory.id_user)) {
      // Un utilisateur ne peut pas ajouter un favori dans la categorie d'un autre.
      return res.status(403).json({ message: "Accès refusé." });
    }

    const [result] = await connection.execute(
      "INSERT INTO favs (title_favs, url_favs, added_date, logo, id_category) VALUES (?, ?, ?, ?, ?)",
      [title, url || null, addedDate, logo || null, categoryId]
    );

    let newFav = await getJoinedFavById(result.insertId, req.authUser);

    if (!newFav) {
      newFav = await getRawFavById(result.insertId);
    }

    return res.status(201).json({
      message: "Favori créé avec succès.",
      fav: newFav,
    });
  } catch (error) {
    console.error("Error in createFav:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

export async function updateFav(req, res) {
  try {
    // On lit le favori actuel pour faire une mise a jour partielle.
    const id = parsePositiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const currentFav = await getJoinedFavById(id, req.authUser);

    if (!currentFav) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    const body = req.body;
    // Si un champ est absent, on garde l'ancienne valeur.
    const nextTitle =
      body.title_favs === undefined
        ? currentFav.title_favs
        : String(body.title_favs).trim();
    const nextUrl =
      body.url_favs === undefined
        ? currentFav.url_favs
        : typeof body.url_favs === "string"
          ? body.url_favs.trim()
          : null;
    const nextDate =
      body.added_date === undefined ? currentFav.added_date : body.added_date;
    const nextLogo =
      body.logo === undefined
        ? currentFav.logo
        : typeof body.logo === "string"
          ? body.logo.trim()
          : null;
    const nextCategoryId =
      body.id_category === undefined
        ? currentFav.id_category
        : parsePositiveId(body.id_category);

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
      // Cette verification protege aussi le deplacement vers une categorie interdite.
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
}

export async function deleteFav(req, res) {
  try {
    // La lecture avec jointure sert aussi de controle d'autorisation.
    const id = parsePositiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de favori invalide." });
    }

    const currentFav = await getJoinedFavById(id, req.authUser);

    if (!currentFav) {
      return res.status(404).json({ message: "Favori introuvable." });
    }

    await connection.execute("DELETE FROM favs WHERE id_favs = ?", [id]);

    return res.status(200).json({ message: "Favori supprimé avec succès." });
  } catch (error) {
    console.error("Error in deleteFav:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}
