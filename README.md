# SaveNest

Projet full stack simple pour ranger des favoris dans des catégories publiques ou privées.

L'objectif du code est d'être lisible pour un développeur débutant : les fichiers principaux sont commentés, les routes sont séparées des contrôleurs, et les scripts front gardent leur état principal en haut de fichier.

## Démarrage

1. Installer les dépendances du projet.
2. Créer ou vérifier le fichier `.env` pour MySQL et le port.
3. Initialiser la base avec le fichier SQL du projet si besoin.
4. Lancer le serveur avec `npm start` ou `node index.js`.
5. Ouvrir `http://localhost:3000/`.

## Variables d'environnement utiles

Le backend lit ces valeurs avec `dotenv` :

- `PORT` : port du serveur Express, par défaut `3000`.
- `DB_HOST` : hôte MySQL, souvent `localhost`.
- `DB_PORT` : port MySQL, souvent `3306`.
- `DB_USER` : utilisateur MySQL.
- `DB_PASSWORD` ou `DB_PASS` : mot de passe MySQL.
- `DB_NAME` : nom de la base.
- `JWT_SECRET` : secret utilisé pour signer les tokens de connexion.

## Ordre de lecture conseillé

1. `index.js` : démarre Express, sert le front et branche les routes API.
2. `BackEnd/config/database.js` : ouvre la connexion MySQL.
3. `BackEnd/routes/*.js` : montre les URL disponibles.
4. `BackEnd/controllers/*.js` : contient la logique métier.
5. `FrontEnd/scripts/apiConfig.js` : construit les URL de l'API.
6. `FrontEnd/scripts/layout.js` : injecte le header et le footer.
7. `FrontEnd/scripts/home.js` : page d'accueil, plus simple à suivre.
8. `FrontEnd/scripts/addCategory.js` : gestion des catégories.
9. `FrontEnd/scripts/fav.js` : page la plus complète, avec formulaires et drag and drop.

## Organisation backend

Le backend suit un découpage classique :

- `routes` reçoit l'URL et choisit quelle fonction appeler.
- `middlewares` vérifie les préconditions, par exemple être connecté.
- `controllers` lit les données, valide, appelle MySQL et répond en JSON.
- `config/database.js` centralise la connexion à la base.

## Organisation frontend

Le frontend fonctionne sans framework :

- chaque page HTML contient surtout des zones vides (`js_header`, `js_main`, `js_footer`) ;
- les scripts JavaScript remplissent ces zones ;
- les styles CSS sont séparés par page ;
- `layout.js` évite de recopier le header et le footer dans chaque HTML.

## Règle de sécurité des catégories privées

Les catégories protégées peuvent être déverrouillées pendant que la page est ouverte. Elles ne sont pas gardées durablement en stockage navigateur : quitter ou recharger une page rebloque l'accès et redemande le mot de passe.

## Commandes utiles

- `npm start` : lance le serveur Express.
- `node --check FrontEnd/scripts/fav.js` : vérifie la syntaxe d'un fichier JS.
- `node --check FrontEnd/scripts/addCategory.js` : vérifie la syntaxe de la page catégories.
- `git status --short` : liste les fichiers modifiés.

## Points importants pour débuter

- Lire les commentaires au-dessus des fonctions avant de lire le détail du code.
- Suivre les noms : `render...` affiche du HTML, `fetch...` appelle l'API, `sync...` remet l'état local en cohérence.
- Ne pas modifier `node_modules`.
- Ne pas stocker de mot de passe en clair côté front.
- Quand une fonction reçoit des données utilisateur, elle doit toujours les vérifier avant de les utiliser.

## Structure utile

- `index.js` : point d'entrée Express.
- `BackEnd/routes` : routes API.
- `BackEnd/controllers` : logique métier côté serveur.
- `BackEnd/middlewares` : vérification du token et des rôles.
- `FrontEnd/html` : pages HTML.
- `FrontEnd/scripts` : logique JavaScript de chaque page.
- `FrontEnd/css` : styles de chaque page.

## Pages principales

- `FrontEnd/html/index.html` : accueil.
- `FrontEnd/html/connexion.html` : connexion et inscription.
- `FrontEnd/html/category.html` : gestion des catégories.
- `FrontEnd/html/fav.html` : gestion des favoris.
