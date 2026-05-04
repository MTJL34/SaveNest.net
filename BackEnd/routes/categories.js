// Ce fichier relie les URL /api/categories au controleur des categories.
import express from "express";
import {
  getAllCategories,
  getAdminCategories,
  getAdminCategoriesByUserId,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  unlockCategory,
} from "../controllers/categoriesControllers.js";
import { requireAuth, requireRole, ROLE_CODES } from "../middlewares/auth.js";

const router = express.Router();

// Toutes les routes categories demandent d'etre connecte.
router.use(requireAuth);

// GET /api/categories : liste les categories visibles pour l'utilisateur connecte.
router.get("/", getAllCategories);

// GET /api/categories/admin/all : vue dediee a l'administration.
router.get(
  "/admin/all",
  requireRole(ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR),
  getAdminCategories
);

// GET /api/categories/admin/user/:userId : categories d'un utilisateur cible.
router.get(
  "/admin/user/:userId",
  requireRole(ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR),
  getAdminCategoriesByUserId
);

// GET /api/categories/:id : lit une seule categorie.
router.get("/:id", getCategoryById);

// POST /api/categories : cree une nouvelle categorie.
router.post("/", createCategory);

// POST /api/categories/:id/unlock : verifie le mot de passe d'une categorie privee.
router.post("/:id/unlock", unlockCategory);

// PATCH /api/categories/:id : modifie le nom, la confidentialite ou le proprietaire.
router.patch("/:id", updateCategory);

// DELETE /api/categories/:id : supprime une categorie.
router.delete("/:id", deleteCategory);

export default router;
