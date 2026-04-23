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

router.get("/", getAllFavs);
router.get("/:id", getFavById);
router.post("/", createFav);
router.patch("/:id", updateFav);
router.delete("/:id", deleteFav);

export default router;
