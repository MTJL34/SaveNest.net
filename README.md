# SaveNest

Projet full stack simple pour ranger des favoris dans des catégories publiques ou privées.

## Démarrage

1. Installer les dépendances du projet.
2. Vérifier les variables d'environnement pour MySQL et le port.
3. Lancer le serveur avec `node index.js`.
4. Ouvrir `http://localhost:3000/`.

## Structure utile

- `index.js` : point d'entrée Express.
- `BackEnd/routes` : routes API.
- `BackEnd/controllers` : logique métier côté serveur.
- `BackEnd/middlewares` : vérification du token et des rôles.
- `FrontEnd/html` : pages HTML.
- `FrontEnd/scripts` : logique JavaScript de chaque page.
- `FrontEnd/css` : styles de chaque page.

## Par où commencer quand on débute

- Lire `index.js` pour comprendre comment le front et l'API sont servis.
- Lire `BackEnd/middlewares/auth.js` pour voir comment fonctionne la connexion.
- Lire `FrontEnd/scripts/layout.js` pour comprendre le header, le footer et les langues.
- Lire `FrontEnd/scripts/home.js` pour un exemple de page front assez simple.
- Ensuite seulement passer sur `FrontEnd/scripts/addCategory.js` et `FrontEnd/scripts/fav.js`, qui sont les deux pages les plus riches du projet.

## Pages principales

- `FrontEnd/html/index.html` : accueil.
- `FrontEnd/html/connexion.html` : connexion et inscription.
- `FrontEnd/html/category.html` : gestion des catégories.
- `FrontEnd/html/fav.html` : gestion des favoris.
