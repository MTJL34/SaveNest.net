import express from "express";
const router = express.Router();

// Import the favsControllers

import { getAllFavs, createFav, getFavById, updateFav, deleteFav } from "../controllers/favsControllers.js";
import { ROLE_CODES, requireAuth, requireRole } from "../middlewares/auth.js";

router.use(requireAuth);

// Route pour obtenir tous les favoris
router.get("/", getAllFavs);

// Route pour obtenir un favori par ID
router.get("/:id", getFavById);

// Route pour créer un nouveau favori
router.post("/", createFav);

// Route pour mettre à jour un favori
router.patch("/:id", requireRole(ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR), updateFav);

// Route pour supprimer un favori
router.delete("/:id", requireRole(ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR), deleteFav);

export default router;
