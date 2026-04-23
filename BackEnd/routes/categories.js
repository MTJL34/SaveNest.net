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

router.use(requireAuth);

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.post("/", createCategory);
router.post("/:id/unlock", unlockCategory);
router.patch("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
