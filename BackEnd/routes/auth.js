// Ce fichier relie les URL /api/auth aux fonctions du controleur des utilisateurs.
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
  // Les routes /:id mettent l'identifiant utilisateur dans req.params.id.
  // Cette petite fonction permet a requireSelfOrRole de rester reutilisable.
  return req.params.id;
}

// Liste des utilisateurs : reservee aux roles qui gerent le projet.
router.get(
  "/",
  requireAuth,
  requireRole(ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR),
  getAllUsers
);

// Inscription et connexion : pas besoin d'etre connecte avant de les appeler.
router.post("/register", registerUser);
router.post("/login", loginUser);

// Deconnexion : le front supprime surtout son token, mais cette route garde une API claire.
router.get("/logout", requireAuth, logoutUser);

// Lire un utilisateur : l'utilisateur lui-meme, un admin ou un moderateur.
router.get(
  "/:id",
  requireAuth,
  requireSelfOrRole(getRouteUserId, ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR),
  getUserById
);

// Modifier un utilisateur : l'utilisateur lui-meme ou un admin.
router.patch(
  "/:id",
  requireAuth,
  requireSelfOrRole(getRouteUserId, ROLE_CODES.ADMIN),
  updateUser
);

// Supprimer un utilisateur : action sensible, reservee aux admins.
router.delete("/:id", requireAuth, requireRole(ROLE_CODES.ADMIN), deleteUser);

export default router;
