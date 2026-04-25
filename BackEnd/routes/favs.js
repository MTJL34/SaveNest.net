// Ce fichier relie les URL /api/favs au controleur des favoris.
import express from "express";
import {
  getAllFavs,
  createFav,
  getFavById,
  updateFav,
  deleteFav,
} from "../controllers/favsControllers.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

// Toutes les routes favoris demandent d'etre connecte.
router.use(requireAuth);

// GET /api/favs : liste les favoris accessibles.
router.get("/", getAllFavs);

// GET /api/favs/:id : lit un favori precis.
router.get("/:id", getFavById);

// POST /api/favs : ajoute un favori dans une categorie.
router.post("/", createFav);

// PATCH /api/favs/:id : modifie le titre, l'URL ou la categorie du favori.
router.patch("/:id", updateFav);

// DELETE /api/favs/:id : supprime un favori.
router.delete("/:id", deleteFav);

export default router;
