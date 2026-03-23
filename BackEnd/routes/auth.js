import express from 'express';
const router = express.Router();

//Import the userControllers

import { registerUser, loginUser, logoutUser } from '../controllers/authControllers.js';

// Route d'inscription
router.post('/register', registerUser);

// Route de connexion
router.post('/login', loginUser);

// Route de déconnexion
router.get('/logout', logoutUser);

export default router;
