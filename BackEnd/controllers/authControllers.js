
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import connection from "../config/database.js";

const sanitizeUser = (user) => ({
  id_user: user.id_user,
  pseudo: user.pseudo,
  mail: user.mail,
  id_savenest: user.id_savenest,
  id_country: user.id_country,
  id_roles: user.id_roles,
});

export const registerUser = async (req, res) => {
  try {
    const { pseudo, mail, password, id_savenest, id_country, id_roles = 2 } = req.body;
    const trimmedPseudo = typeof pseudo === "string" ? pseudo.trim() : "";
    const trimmedMail = typeof mail === "string" ? mail.trim().toLowerCase() : "";
    const rawPassword = typeof password === "string" ? password : "";
    const parsedSaveNest = Number(id_savenest);
    const parsedCountry = Number(id_country);
    const parsedRole = Number(id_roles);

    if (!trimmedPseudo || !trimmedMail || !rawPassword) {
      return res.status(400).json({ message: "pseudo, mail et password sont obligatoires." });
    }

    if (!Number.isInteger(parsedSaveNest) || parsedSaveNest <= 0) {
      return res.status(400).json({ message: "id_savenest doit être un entier valide." });
    }

    if (!Number.isInteger(parsedCountry) || parsedCountry <= 0) {
      return res.status(400).json({ message: "id_country doit être un entier valide." });
    }

    if (!Number.isInteger(parsedRole) || parsedRole <= 0) {
      return res.status(400).json({ message: "id_roles doit être un entier valide." });
    }

    const [existingUsers] = await connection.execute(
      "SELECT id_user FROM user_ WHERE mail = ? LIMIT 1",
      [trimmedMail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Un compte avec cet email existe déjà." });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const [result] = await connection.execute(
      "INSERT INTO user_ (pseudo, mail, password, id_savenest, id_country, id_roles) VALUES (?, ?, ?, ?, ?, ?)",
      [trimmedPseudo, trimmedMail, hashedPassword, parsedSaveNest, parsedCountry, parsedRole]
    );

    const [createdRows] = await connection.execute(
      "SELECT id_user, pseudo, mail, id_savenest, id_country, id_roles FROM user_ WHERE id_user = ?",
      [result.insertId]
    );

    return res.status(201).json({
      message: "Inscription réussie.",
      user: sanitizeUser(createdRows[0]),
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
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

    return res.status(200).json({
      message: "Connexion réussie.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const logoutUser = async (req, res) => {
  return res.status(200).json({ message: "Déconnexion réussie (côté client)." });
};
