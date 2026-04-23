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

router.use(requireAuth);

router.get("/", getAllFavs);
router.get("/:id", getFavById);
router.post("/", createFav);
router.patch("/:id", updateFav);
router.delete("/:id", deleteFav);

export default router;
