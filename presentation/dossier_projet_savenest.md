# Dossier Projet - SaveNest

## Page de garde

**Nom du projet :** SaveNest  
**Sous-titre :** Organiser ses favoris dans un nid numerique  
**Type de projet :** Application web full stack  
**Technologies principales :** HTML, CSS, JavaScript, Node.js, Express, MySQL  
**Auteur :** [A personnaliser]  
**Formation / promotion :** [A personnaliser]  
**Date :** [A personnaliser]

## Sommaire

1. Le projet
2. Conception
3. Realisation
4. Qualite et deploiement
5. Bilan et perspectives

---

## 1. Le projet

### 1.1 Presentation du projet

SaveNest est une application web qui permet de ranger des liens web dans des categories afin de remplacer une barre de favoris classique par un espace plus clair, plus personnel et plus securise.

L'utilisateur peut :

- creer un compte ;
- se connecter ;
- organiser ses favoris ;
- creer des categories publiques ou privees ;
- modifier et supprimer ses donnees ;
- retrouver facilement ses liens importants.

L'application a ete pensee comme un projet full stack pedagogique, avec une architecture lisible et une separation claire entre le front-end, l'API et la base de donnees.

### 1.2 Qui suis-je ?

Cette partie est a personnaliser selon ton parcours.

Exemple de structure :

- presentation rapide ;
- parcours de formation ;
- competences deja acquises ;
- lien entre ton parcours et le projet SaveNest ;
- objectif pedagogique ou professionnel du projet.

### 1.3 Probleme identifie

La gestion des favoris dans un navigateur devient vite limitee quand le nombre de liens augmente.

Les problemes principaux observes sont les suivants :

- trop d'onglets ou de favoris dans la barre du navigateur ;
- organisation peu lisible ;
- manque de classement par contexte ;
- absence de protection simple pour certains liens sensibles ;
- difficulte a faire evoluer cette organisation dans le temps.

### 1.4 Solution proposee

SaveNest apporte une solution simple :

- un espace personnel dedie au rangement des favoris ;
- des categories pour structurer les liens ;
- des categories publiques ou protegees par mot de passe ;
- une authentification JWT pour proteger les appels API ;
- une interface legere sans framework front-end.

### 1.5 Objectifs du projet

Les objectifs de SaveNest sont :

- remplacer une barre de favoris par un systeme organise ;
- permettre la creation, la modification et la suppression des favoris ;
- gerer des categories publiques et privees ;
- mettre en place une API REST securisee ;
- conserver une base de code lisible pour un contexte de formation.

### 1.6 Vue d'ensemble du projet

Quelques chiffres cles du projet :

- 7 tables relationnelles actives ;
- 21 routes API REST ;
- 0 framework front-end ;
- une architecture en 3 couches ;
- une gestion des roles `ADMIN`, `MODERATOR` et `USER`.

### 1.7 Perimetre fonctionnel

Le projet couvre les fonctionnalites suivantes :

- inscription et connexion ;
- gestion du compte utilisateur ;
- gestion des categories ;
- gestion des favoris ;
- deverrouillage des categories privees ;
- restauration de categories supprimees ;
- interface d'administration pour certains roles ;
- prise en charge de plusieurs langues dans le layout.

---

## 2. Conception

### 2.1 Architecture generale

SaveNest repose sur une architecture en 3 couches :

1. Le navigateur :
   HTML, CSS et JavaScript natif.
2. L'API Express :
   routes, controleurs, middlewares d'authentification et logique metier.
3. La base MySQL :
   persistance des utilisateurs, categories, favoris, roles et langues.

Le front-end ne communique jamais directement avec la base de donnees. Toutes les validations et tous les controles de droits passent par l'API.

### 2.2 Direction artistique

L'identite visuelle du projet repose sur un univers chaleureux :

- palette sable et brun ;
- surfaces claires et douces ;
- cartes et zones arrondies ;
- logique de "nid numerique" en coherence avec le nom SaveNest.

Cette direction graphique permet de distinguer le projet d'une simple interface technique.

### 2.3 Composants d'interface

L'interface repose sur plusieurs composants reutilisables :

- boutons d'action ;
- badges de statut ;
- formulaires de connexion et d'inscription ;
- cartes de categories ;
- cartes de favoris ;
- header et footer injectes par le layout.

### 2.4 Maquettes

Les pages principales du projet sont :

- page d'accueil ;
- page de connexion / inscription ;
- page de gestion des categories ;
- page de gestion des favoris ;
- pages de compte et d'administration.

Si tu veux, tu peux ajouter ici des captures d'ecran ou des maquettes exportees.

### 2.5 Modelisation de la base de donnees

La base de donnees a ete pensee selon une logique relationnelle classique.

Elle contient notamment :

- les utilisateurs ;
- les roles ;
- les categories ;
- les favoris ;
- les langues ;
- la table de liaison `speaking` ;
- la table `savenest`.

### 2.6 MCD

Les entites principales du projet sont :

- `UTILISATEUR`
- `ROLE`
- `CATEGORIE`
- `FAVORI`
- `LANGUE`
- `SAVENEST`
- `SPEAKING`

Relations principales :

- un utilisateur possede plusieurs categories ;
- une categorie contient plusieurs favoris ;
- un utilisateur possede un role ;
- un utilisateur est relie a une entite `savenest` ;
- un utilisateur peut parler plusieurs langues.

### 2.7 MLD

Les tables principales sont :

- `user_`
- `roles`
- `category`
- `favs`
- `language_`
- `speaking`
- `savenest`

Exemples de cles etrangeres :

- `user_.id_role`
- `user_.id_savenest`
- `user_.default_category_id`
- `category.id_user`
- `favs.id_category`
- `speaking.id_user`
- `speaking.id_language`

### 2.8 Formes normales

La base respecte une logique de normalisation :

- 1FN : les valeurs sont atomiques ;
- 2FN : les dependances reposent bien sur la cle ;
- 3FN : les informations communes comme les roles et les langues sont separees pour eviter les duplications.

### 2.9 Dictionnaire de donnees

Exemples de champs importants :

- `user_.id_user` : identifiant utilisateur ;
- `user_.mail` : email de connexion ;
- `user_.password` : mot de passe ;
- `category.confidentiality` : indique si une categorie est publique ou privee ;
- `category.password` : mot de passe de categorie privee ;
- `favs.url_favs` : URL du favori ;
- `favs.id_category` : categorie de rattachement.

---

## 3. Realisation

### 3.1 Front-end

Le front-end est developpe sans framework JavaScript.

Ce choix permet de travailler les fondamentaux :

- manipulation du DOM ;
- evenements ;
- appels `fetch` ;
- gestion de session ;
- organisation du code en scripts par page.

Le fichier `layout.js` permet d'injecter le header et le footer sans duplication.

### 3.2 Responsive et accessibilite

Le projet integre plusieurs bonnes pratiques :

- media queries ;
- grilles et colonnes adaptatives ;
- tailles lisibles ;
- zones tactiles confortables ;
- labels de formulaires ;
- contrastes de couleurs suffisants ;
- messages d'erreur clairs.

### 3.3 Gestion des categories et favoris

L'utilisateur peut :

- creer des categories ;
- choisir une confidentialite ;
- proteger certaines categories avec un mot de passe ;
- ajouter des favoris dans une categorie ;
- modifier les favoris ;
- deplacer un favori d'une categorie a une autre ;
- supprimer des favoris ou des categories ;
- restaurer des categories supprimees recemment.

### 3.4 API REST

L'API Express centralise toute la logique metier.

Exemples de routes principales :

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/categories`
- `POST /api/categories`
- `POST /api/categories/:id/unlock`
- `POST /api/categories/restore`
- `GET /api/favs`
- `POST /api/favs`
- `PATCH /api/favs/:id`
- `DELETE /api/favs/:id`

### 3.5 Communication front / back

Les echanges entre le front et le back se font avec `fetch` et `async / await`.

Le front :

- construit les requetes HTTP ;
- envoie le token JWT si necessaire ;
- traite les reponses JSON ;
- gere les erreurs et met a jour l'interface.

### 3.6 Securite

Le projet met en place plusieurs couches de securite :

1. Authentification :
   JWT et verification de l'utilisateur.
2. Autorisation :
   controle des roles et de l'appartenance aux ressources.
3. Validation :
   verifications sur les IDs, les champs et les regles metier.
4. Persistance :
   SQL parametre et mot de passe chiffre avec bcrypt.

### 3.7 Cycle d'une requete authentifiee

Le cycle standard est le suivant :

1. l'utilisateur effectue une action ;
2. le front envoie une requete `fetch` ;
3. le middleware verifie le token ;
4. le controleur valide puis interroge MySQL ;
5. l'API renvoie une reponse JSON ;
6. le front met a jour l'interface.

---

## 4. Qualite et deploiement

### 4.1 Strategie de tests

Plusieurs cas peuvent etre testes manuellement :

- inscription valide ;
- connexion valide ;
- acces refuse sans token ;
- ajout d'un favori ;
- refus d'un favori deja existant ;
- deverrouillage d'une categorie privee ;
- suppression d'une categorie avec gestion des favoris ;
- restauration d'une categorie supprimee.

### 4.2 Deploiement

Etapes de mise en route du projet :

1. installer les dependances ;
2. configurer le fichier `.env` ;
3. initialiser la base MySQL ;
4. lancer le serveur avec `npm start` ou `node index.js` ;
5. ouvrir l'application dans le navigateur.

### 4.3 Conformite et bonnes pratiques

Le projet prend en compte :

- la minimisation des donnees utilisateur ;
- le hachage des mots de passe ;
- la separation des roles ;
- la protection des routes ;
- une stack simple et sobre ;
- une attention portee a l'accessibilite.

### 4.4 Methode de travail

Le projet suit une logique en plusieurs phases :

1. analyse du besoin ;
2. conception des maquettes et de la base ;
3. realisation front-end et back-end ;
4. validation ;
5. ameliorations progressives.

### 4.5 Difficultes rencontrees

Parmi les difficultes importantes du projet :

- gerer des categories privees sans stocker durablement le mot de passe ;
- supprimer une categorie contenant deja des favoris ;
- maintenir une coherence de session front / back ;
- garder un code lisible dans tout le projet.

### 4.6 Solutions apportees

Les solutions mises en place sont :

- deverrouillage temporaire d'une categorie ;
- strategie de suppression ou de reaffectation des favoris ;
- redirection vers la connexion en cas de token invalide ;
- separation claire entre routes, middlewares et controleurs.

---

## 5. Bilan et perspectives

### 5.1 Demonstration possible

Pour une presentation orale, le projet peut etre demontre ainsi :

1. connexion avec un compte existant ;
2. creation d'une categorie ;
3. ajout d'un favori ;
4. modification et suppression d'un favori ;
5. deverrouillage d'une categorie privee ;
6. consultation du compte ou des fonctions d'administration.

### 5.2 Competences mobilisees

Competences front-end :

- structurer une interface web ;
- creer des pages responsive ;
- programmer en JavaScript natif ;
- gerer les appels API et l'etat de session.

Competences back-end :

- modeliser une base relationnelle ;
- concevoir une API REST ;
- mettre en place bcrypt et JWT ;
- proteger l'acces aux ressources.

### 5.3 Perspectives d'evolution

Le projet pourrait evoluer avec :

- un deploiement complet en HTTPS ;
- des tests automatises ;
- une recuperation de mot de passe par email ;
- un partage de favoris entre utilisateurs ;
- une meilleure experience mobile ;
- un renforcement de l'accessibilite.

### 5.4 Conclusion

SaveNest est un projet full stack coherent qui combine :

- une interface claire ;
- une base de donnees relationnelle ;
- une API REST securisee ;
- une logique metier utile autour des categories et favoris ;
- une architecture pedagogique et lisible.

Ce projet montre une capacite a concevoir, realiser, securiser et documenter une application web complete.

---

## Annexe possible

Tu peux ajouter en fin de dossier :

- captures d'ecran ;
- MCD / MLD exportes depuis Looping ;
- extraits de code ;
- tableau des routes API ;
- planning ou retroplanning ;
- bibliographie ou sources.
