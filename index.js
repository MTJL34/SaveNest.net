// Point d'entree du projet : cree le serveur Express, sert le front et branche les routes API.
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontEndRoot = path.join(__dirname, "FrontEnd");
const homePagePath = path.join(frontEndRoot, "html", "index.html");
const PORT = Number(process.env.PORT) || 3000;

// Les middlewares generaux s'appliquent a tout le projet.
app.use(cors());
app.use(express.json());

// Tous les fichiers du dossier FrontEnd sont servis tels quels au navigateur.
app.use(express.static(frontEndRoot));

app.get("/", function sendHomePage(req, res) {
  res.sendFile(homePagePath);
});

// Chaque bloc /api/... delegue le travail au fichier de routes correspondant.
app.use("/api/categories", categoriesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favs", favsRoutes);
app.listen(PORT, function handleServerStart() {
  console.log(`Server is running on port ${PORT}`);
});
