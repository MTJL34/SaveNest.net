import express from "express";
const router = express.Router();

import {
  getAllSave,
  createSave,
  getSaveByFavId,
  updateSave,
  deleteSave,
} from "../controllers/saveControllers.js";

// Route pour obtenir toutes les attributions favori/catégorie
router.get("/", getAllSave);

// Route pour obtenir l'attribution d'un favori
router.get("/:id_favs", getSaveByFavId);

// Route pour créer une attribution favori/catégorie
router.post("/", createSave);

// Route pour mettre à jour la catégorie d'un favori
router.patch("/:id_favs", updateSave);

// Route pour supprimer une attribution favori/catégorie
router.delete("/:id_favs", deleteSave);

export default router;
