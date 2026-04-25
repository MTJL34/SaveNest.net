// Point d'entree du projet.
// Quand on lance `node index.js` ou `npm start`, c'est ce fichier qui demarre.
// Son role reste volontairement simple :
// 1. charger la configuration,
// 2. creer le serveur Express,
// 3. servir les fichiers du front,
// 4. brancher les routes API du backend.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import categoriesRoutes from "./BackEnd/routes/categories.js";
import authRoutes from "./BackEnd/routes/auth.js";
import favsRoutes from "./BackEnd/routes/favs.js";

dotenv.config();

const app = express();

// En modules ES, __dirname n'existe pas automatiquement.
// Ces deux lignes recreent l'equivalent pour pouvoir construire des chemins fiables.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tous les chemins importants sont construits ici pour eviter les chemins en dur
// disperses dans le fichier.
const frontEndRoot = path.join(__dirname, "FrontEnd");
const homePagePath = path.join(frontEndRoot, "html", "index.html");
const PORT = Number(process.env.PORT) || 3000;

// Les middlewares generaux s'appliquent a tout le projet.
// cors() autorise les appels depuis le navigateur en developpement.
app.use(cors());

// express.json() permet de lire req.body quand le front envoie du JSON.
app.use(express.json());

// Tous les fichiers du dossier FrontEnd sont servis tels quels au navigateur.
// Exemple : /html/fav.html renvoie FrontEnd/html/fav.html.
app.use(express.static(frontEndRoot));

app.get("/", function sendHomePage(req, res) {
  // La racine du site affiche la page d'accueil.
  res.sendFile(homePagePath);
});

// Chaque bloc /api/... delegue le travail au fichier de routes correspondant.
// Les routes gardent ce fichier court et lisible.
app.use("/api/categories", categoriesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favs", favsRoutes);

app.listen(PORT, function handleServerStart() {
  // Ce message confirme dans le terminal que le serveur est pret.
  console.log(`Server is running on port ${PORT}`);
});
