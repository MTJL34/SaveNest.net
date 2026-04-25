// Ce fichier ouvre la connexion MySQL utilisee par tous les controleurs du backend.
// Il exporte un "pool" de connexions : MySQL gere plusieurs connexions en interne,
// ce qui evite d'ouvrir et fermer une connexion a chaque requete HTTP.
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

let connection;

try {
  // Les informations sensibles viennent du fichier .env.
  // Cela evite de mettre le mot de passe MySQL directement dans le code.
  connection = mysql
    .createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
      database: process.env.DB_NAME,
    })
    .promise();

  // Message utile en developpement pour confirmer que la configuration MySQL est correcte.
  console.log("Database connection established successfully");
} catch (error) {
  // Si la connexion echoue au demarrage, on affiche l'erreur puis on bloque le serveur.
  console.error("Error establishing database connection:", error);
  throw error;
}

// Tous les controleurs importent cette connexion pour lancer leurs requetes SQL.
export default connection;
