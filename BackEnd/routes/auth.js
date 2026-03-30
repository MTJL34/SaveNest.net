import express from 'express';
const router = express.Router();

//Import the userControllers

import {
  getAllUsers,
  getUserById,
  registerUser,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser
} from '../controllers/authControllers.js';
import { ROLE_CODES, requireAuth, requireRole, requireSelfOrRole } from "../middlewares/auth.js";

// Route pour obtenir tous les utilisateurs
router.get('/', requireAuth, requireRole(ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR), getAllUsers);

// Route d'inscription
router.post('/register', registerUser);

// Route de connexion
router.post('/login', loginUser);

// Route de déconnexion
router.get('/logout', requireAuth, logoutUser);

// Route pour obtenir un utilisateur par ID
router.get(
  '/:id',
  requireAuth,
  requireSelfOrRole((req) => req.params.id, ROLE_CODES.ADMIN, ROLE_CODES.MODERATOR),
  getUserById
);

// Route pour mettre à jour un utilisateur
router.patch(
  '/:id',
  requireAuth,
  requireSelfOrRole((req) => req.params.id, ROLE_CODES.ADMIN),
  updateUser
);

// Route pour supprimer un utilisateur
router.delete('/:id', requireAuth, requireRole(ROLE_CODES.ADMIN), deleteUser);

export default router;
