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

// Route pour obtenir tous les utilisateurs
router.get('/', getAllUsers);

// Route d'inscription
router.post('/register', registerUser);

// Route de connexion
router.post('/login', loginUser);

// Route de déconnexion
router.get('/logout', logoutUser);

// Route pour obtenir un utilisateur par ID
router.get('/:id', getUserById);

// Route pour mettre à jour un utilisateur
router.patch('/:id', updateUser);

// Route pour supprimer un utilisateur
router.delete('/:id', deleteUser);

export default router;
