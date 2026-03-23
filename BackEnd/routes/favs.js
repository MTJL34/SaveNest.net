import express from "express";
const router = express.Router();

// Import the favsControllers

import { getAllFavs, createFav, getFavById, updateFav, deleteFav } from "../controllers/favsControllers.js";

// Route pour obtenir tous les favoris
router.get("/", getAllFavs);

// Route pour obtenir un favori par ID
router.get("/:id", getFavById);

// Route pour créer un nouveau favori
router.post("/", createFav);

// Route pour mettre à jour un favori
router.patch("/:id", updateFav);

// Route pour supprimer un favori
router.delete("/:id", deleteFav);

export default router;