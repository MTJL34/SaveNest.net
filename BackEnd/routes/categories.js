// Ce fichier relie les URL /api/categories au controleur des categories.
import express from "express";
import {
  getAllCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  unlockCategory,
} from "../controllers/categoriesControllers.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

// Toutes les routes categories demandent d'etre connecte.
router.use(requireAuth);

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.post("/", createCategory);
router.post("/:id/unlock", unlockCategory);
router.patch("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
