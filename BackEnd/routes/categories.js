import express from 'express';
const router = express.Router();

// Import the categoriesControllers

import { getAllCategories, createCategory, getCategoryById, updateCategory, deleteCategory } from '../controllers/categoriesControllers.js';

// Route pour obtenir toutes les catégories
router.get('/', getAllCategories);

// Route pour obtenir une catégorie par ID
router.get('/:id', getCategoryById);

// Route pour créer une nouvelle catégorie
router.post('/', createCategory);

// Route pour mettre à jour une catégorie
router.patch('/:id', updateCategory);

// Route pour supprimer une catégorie
router.delete('/:id', deleteCategory);

export default router;