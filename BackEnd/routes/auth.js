import express from "express";
import {
  getAllUsers,
  getUserById,
  registerUser,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
} from "../controllers/authControllers.js";
import {
  ROLE_CODES,
  requireAuth,
  requireRole,
  requireSelfOrRole,
} from "../middlewares/auth.js";

const router = express.Router();

function getRouteUserId(req) {
  return req.params.id;
}

router.get(
  "/",
  requireAuth,
  requireRole(ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR),
  getAllUsers
);

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", requireAuth, logoutUser);

router.get(
  "/:id",
  requireAuth,
  requireSelfOrRole(getRouteUserId, ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR),
  getUserById
);

router.patch(
  "/:id",
  requireAuth,
  requireSelfOrRole(getRouteUserId, ROLE_CODES.ADMIN),
  updateUser
);

router.delete("/:id", requireAuth, requireRole(ROLE_CODES.ADMIN), deleteUser);

export default router;
