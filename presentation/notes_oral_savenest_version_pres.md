# Notes d'oral detaillees - Projet SaveNest

Objectif : suivre le meme fil que `Pres Savenest.pdf` et tenir environ 20 a 25 minutes.  
Rythme conseille : 45 secondes a 1 min 30 par slide, avec plus de temps sur la demo et les parties techniques.

## Plan de temps conseille

- Pages 1 a 5 : ouverture, presentation, besoin, objectifs - 4 a 5 min
- Pages 6 a 8 : technologies et outils - 4 a 5 min
- Pages 9 a 12 : conception, base de donnees, normalisation - 5 a 6 min
- Pages 13 a 14 : API REST, fetch, communication front / back - 3 a 4 min
- Page 15 : demonstration - 4 a 6 min
- Pages 16 a 20 : difficultes, futur, conclusion, fin - 3 a 5 min

---

## PAGE 1 - OUVERTURE VISUELLE

### Ce que tu peux dire

Sur cette premiere slide, je montre directement l'univers visuel de SaveNest.

L'idee est de plonger tout de suite dans l'application avant meme d'entrer dans les explications techniques.

On voit deja les grandes zones de navigation du site, comme l'accueil, les favoris, les categories et le compte utilisateur.

Cette ouverture me sert a poser le contexte : SaveNest est une application web pensee pour organiser ses favoris dans un espace plus clair que la barre de favoris classique d'un navigateur.

### Transition

Apres cette premiere mise en situation, je vais presenter rapidement le projet et mon cadre de formation.

---

## PAGE 2 - PAGE DE GARDE

### Ce que tu peux dire

Bonjour, je m'appelle Mathieu Le Roy et aujourd'hui je vais vous presenter mon projet SaveNest.net, realise dans le cadre de ma formation de Developpeur Web et Web Mobile.

Cette formation est suivie avec la Ligue de l'Enseignement, avec Belkacem Taleb comme formateur, sur la session 2025 / 2026.

SaveNest est une application web full stack qui permet d'organiser des favoris web dans des categories publiques ou privees.

Pendant cette presentation, je vais d'abord me presenter rapidement, puis expliquer pourquoi j'ai choisi ce projet, quels etaient ses objectifs, quelles technologies j'ai utilisees, comment j'ai concu la base de donnees, comment le frontend communique avec le backend, puis je terminerai par une demonstration, les difficultes rencontrees et les evolutions possibles.

### Transition

Je vais commencer par une courte presentation de mon parcours.

---

## PAGE 3 - QUI-SUIS-JE ?

### Ce que tu peux dire

Sur cette slide, je me presente rapidement.

L'idee n'est pas de raconter tout mon parcours en detail, mais de montrer le lien entre ma formation et ce projet.

Tu peux expliquer :

- qui tu es ;
- ce qui t'a amene vers le developpement web ;
- ce que tu apprends dans la formation ;
- pourquoi ce projet est important dans ton parcours.

### Version simple a dire

Avec SaveNest, j'ai voulu realiser un projet concret qui me permette de travailler a la fois le frontend, le backend, la base de donnees et la securite. C'etait une bonne facon de mettre en pratique l'ensemble des competences vues pendant la formation.

### Transition

Maintenant que je me suis presente, je vais expliquer pourquoi j'ai choisi ce projet.

---

## PAGE 4 - POURQUOI LE PROJET ?

### Ce que tu peux dire

J'ai choisi ce projet parce que la gestion des favoris dans un navigateur devient vite limitee lorsqu'on accumule beaucoup de liens.

Dans la pratique, on rencontre souvent plusieurs problemes :

- trop de favoris dans la barre du navigateur ;
- une organisation peu lisible ;
- des liens melanges entre vie personnelle, travail, loisirs ou veille ;
- aucune vraie protection simple pour certains contenus plus sensibles ;
- une difficulte a faire evoluer l'organisation avec le temps.

SaveNest est donc ne d'un besoin concret : proposer un espace personnel dedie au rangement des favoris, avec une structure plus propre et plus flexible.

### Phrase utile

Le probleme de depart est simple : une barre de favoris classique fonctionne au debut, mais elle devient vite peu pratique quand les liens se multiplient.

### Transition

A partir de ce constat, j'ai defini plusieurs objectifs pour le projet.

---

## PAGE 5 - OBJECTIFS DU PROJET ?

### Ce que tu peux dire

Les objectifs de SaveNest etaient a la fois fonctionnels et techniques.

### Objectifs fonctionnels

- permettre a un utilisateur de creer un compte ;
- lui permettre de se connecter ;
- organiser ses favoris dans des categories ;
- gerer des categories publiques et privees ;
- ajouter, modifier, deplacer et supprimer des favoris ;
- definir une categorie par defaut ;
- restaurer certaines categories supprimees.

### Objectifs techniques

- construire une application full stack ;
- creer une API REST securisee ;
- utiliser JWT pour proteger les routes ;
- utiliser MySQL pour la persistance ;
- garder une architecture lisible, separee entre front, routes, controleurs et middlewares.

### Phrase utile

L'objectif n'etait pas seulement d'avoir une interface qui fonctionne, mais aussi de construire une application complete, logique et securisee.

### Transition

Pour atteindre ces objectifs, j'ai utilise plusieurs technologies que je vais presenter maintenant.

---

## PAGE 6 - TECHNOLOGIES UTILISEES

### Ce que tu peux dire

Sur cette premiere slide technologies, je presente surtout la partie frontend.

Pour l'interface, j'ai utilise HTML, CSS et JavaScript natif.

### HTML

Le HTML sert a structurer les pages.

Il permet de construire :

- les formulaires ;
- les boutons ;
- les zones d'affichage ;
- les pages principales du site.

### CSS

Le CSS sert a l'apparence du projet.

Il me permet de travailler :

- la palette de couleurs ;
- la mise en page ;
- les cartes ;
- le responsive ;
- l'identite visuelle de SaveNest.

### JavaScript

Le JavaScript rend l'application dynamique.

Dans SaveNest, il permet notamment :

- de manipuler le DOM ;
- de charger les donnees ;
- d'envoyer les formulaires ;
- d'afficher les messages d'erreur ;
- de mettre a jour l'interface sans tout recharger.

### Transition

Apres le frontend, j'ai aussi eu besoin d'un backend pour gerer la logique metier et la base de donnees.

---

## PAGE 7 - TECHNOLOGIES UTILISEES

### Ce que tu peux dire

Sur cette deuxieme slide technologies, je presente la partie backend et la base de donnees.

### Node.js

Node.js permet d'executer du JavaScript cote serveur.

Il me permet de lancer mon application backend.

### Express

Express est le framework que j'ai utilise pour creer l'API.

Il simplifie :

- la creation du serveur ;
- la gestion des routes ;
- l'organisation du backend ;
- l'envoi de reponses JSON.

### MySQL

MySQL me permet de stocker les donnees du projet dans des tables relationnelles.

Par exemple :

- les utilisateurs ;
- les roles ;
- les categories ;
- les favoris ;
- les langues ;
- les relations entre utilisateurs et langues.

### Securite

J'utilise aussi `bcrypt` pour le hachage des mots de passe et `jsonwebtoken` pour l'authentification JWT.

### Phrase utile

Node.js execute le serveur, Express organise l'API, et MySQL stocke les donnees du projet.

### Transition

En plus des technologies de code, j'ai utilise plusieurs outils pour concevoir et tester le projet.

---

## PAGE 8 - TECHNOLOGIES UTILISEES

### Ce que tu peux dire

Sur cette troisieme slide technologies, je presente les outils de travail.

### VS Code

VS Code m'a servi d'editeur de code pour le frontend, le backend et la documentation.

### Figma

Figma m'a aide a reflechir a l'interface et a l'organisation visuelle des pages avant de coder.

### Looping

Looping m'a servi pour creer le MCD et le MLD de la base de donnees.

### XAMPP

XAMPP m'a permis de travailler en local avec MySQL et phpMyAdmin.

### Postman

Postman m'a permis de tester les routes de l'API avant ou pendant l'integration avec le frontend.

### Phrase utile

Les outils m'ont aide a structurer le projet avant de coder, puis a verifier qu'il fonctionnait correctement a chaque etape.

### Transition

Je vais maintenant passer a la partie conception, avec la methode que j'ai suivie pour organiser les donnees.

---

## PAGE 9 - METHODE MERISE

### Ce que tu peux dire

Pour concevoir la base de donnees, je me suis appuye sur la methode MERISE.

Cette methode permet de passer progressivement du besoin utilisateur a une base de donnees structuree.

L'idee est de ne pas creer directement des tables au hasard, mais de suivre plusieurs etapes :

1. comprendre le besoin ;
2. identifier les donnees utiles ;
3. definir les relations entre ces donnees ;
4. transformer ces relations en structure exploitable dans une base.

Dans mon projet, cette methode m'a aide a clarifier les liens entre les utilisateurs, les categories, les favoris, les roles et les langues.

Si besoin, cette partie est detaillee dans le dossier projet, page 13.

### Phrase utile

MERISE m'a permis de concevoir la base de donnees de facon logique avant de passer a la partie technique.

### Transition

Je vais maintenant montrer le MCD du projet.

---

## PAGE 10 - MCD

### Ce que tu peux dire

Le MCD signifie Modele Conceptuel de Donnees.

Il sert a representer les grandes entites du projet et les relations entre elles, sans encore parler du langage SQL ou des types de colonnes.

Dans SaveNest, on retrouve notamment les entites suivantes :

- `UTILISATEUR`
- `ROLE`
- `CATEGORIE`
- `FAVORI`
- `LANGUE`
- `SAVENEST`
- `SPEAKING`

Les relations importantes sont les suivantes :

- un utilisateur possede plusieurs categories ;
- une categorie contient plusieurs favoris ;
- un utilisateur possede un role ;
- un utilisateur peut parler plusieurs langues ;
- la table `speaking` sert de liaison entre utilisateur et langue.

Le MCD m'a permis de poser les bases de la logique metier du projet avant de penser aux requetes SQL.

### Phrase utile

Le MCD sert a modeliser le fonctionnement du projet de facon claire, avant la mise en base.

### Transition

Une fois le MCD etabli, je l'ai transforme en MLD.

---

## PAGE 11 - MLD

### Ce que tu peux dire

Le MLD signifie Modele Logique de Donnees.

Ici, on passe d'une vision conceptuelle a une structure beaucoup plus proche de la vraie base.

Les entites deviennent des tables, et les relations deviennent des cles primaires, des cles etrangeres ou des tables d'association.

Dans mon projet, les principales tables sont :

- `user_`
- `roles`
- `category`
- `favs`
- `language_`
- `speaking`
- `savenest`

Quelques exemples de liens :

- `category.id_user` relie une categorie a son proprietaire ;
- `favs.id_category` relie un favori a une categorie ;
- `user_.id_role` relie un utilisateur a son role ;
- `user_.default_category_id` permet de definir une categorie par defaut ;
- `speaking.id_user` et `speaking.id_language` relient un utilisateur a ses langues.

### Phrase utile

Le MLD transforme les idees du MCD en tables et en relations directement exploitables.

### Transition

Pour que cette base reste propre et coherente, j'ai aussi tenu compte de la normalisation.

---

## PAGE 12 - LES 8 FORMES DE NORMALISATIONS

### Ce que tu peux dire

Sur cette slide, j'indique qu'il existe plusieurs niveaux de normalisation en base de donnees.

Dans le cadre de mon projet, les plus importantes a maitriser etaient surtout les trois premieres formes normales, qui sont les plus utiles dans un projet comme SaveNest.

### 1FN

Chaque colonne doit contenir une seule valeur simple.

Par exemple, dans la table des favoris, on separe bien le titre, l'URL, la date et le logo.

### 2FN

Les donnees doivent dependre entierement de la cle primaire.

Chaque information dans une table doit vraiment concerner l'element principal de cette table.

### 3FN

Les informations ne doivent pas dependre les unes des autres de facon indirecte.

Par exemple, je separe les roles et les langues dans des tables dediees pour eviter les repetitions inutiles.

### Ce que tu peux ajouter si on te pose la question

Il existe des formes de normalisation plus avancees, mais dans un projet de ce niveau, les trois premieres sont les plus pertinentes pour construire une base propre et maintenable.

### Transition

Apres la base de donnees, je vais maintenant expliquer comment le frontend et le backend communiquent.

---

## PAGE 13 - RESTFUL API

### Ce que tu peux dire

Le frontend communique avec le backend a travers une API REST.

Une API REST organise les routes selon des ressources et des methodes HTTP standards.

Dans mon projet, j'utilise principalement :

- `GET` pour lire des donnees ;
- `POST` pour creer ou declencher une action ;
- `PATCH` pour modifier une ressource ;
- `DELETE` pour supprimer.

Quelques exemples de routes dans SaveNest :

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/categories`
- `POST /api/categories/:id/unlock`
- `POST /api/categories/restore`
- `GET /api/favs`
- `POST /api/favs`
- `PATCH /api/favs/:id`
- `DELETE /api/favs/:id`

Le projet contient au total 21 routes API REST.

Cette partie est detaillee plus loin dans le dossier projet, notamment page 19.

### Phrase utile

L'API REST est le pont entre l'interface utilisateur, la logique metier et la base de donnees.

### Transition

Maintenant que j'ai presente l'API, je vais montrer comment le frontend l'appelle concretement.

---

## PAGE 14 - FETCH AVEC ASYNC/AWAIT

### Ce que tu peux dire

Pour dialoguer avec l'API, j'utilise `fetch()` en JavaScript, avec `async/await`.

Le fonctionnement est le suivant :

1. l'utilisateur fait une action sur la page ;
2. JavaScript envoie une requete HTTP avec `fetch()` ;
3. le backend recoit la requete ;
4. si la route est protegee, le token JWT est verifie ;
5. le controleur applique la logique metier ;
6. le backend interroge MySQL si besoin ;
7. une reponse JSON est renvoyee au frontend ;
8. le frontend met a jour l'affichage.

J'utilise `async/await` parce que les requetes sont asynchrones et que cette syntaxe est beaucoup plus lisible que des chaines de callbacks.

### Exemple simple a dire

Quand un utilisateur ajoute un favori, le frontend recupere les valeurs du formulaire, envoie une requete `POST`, puis attend la reponse JSON du serveur pour remettre la page a jour.

### Phrase utile

`fetch()` permet au frontend de parler au backend, et `async/await` permet d'attendre la reponse de facon claire et lisible.

### Transition

Apres cette partie technique, je vais montrer le projet en fonctionnement.

---

## PAGE 15 - DEMONSTRATION

### Ce que tu peux dire avant de commencer

Je vais maintenant faire une demonstration de SaveNest pour montrer les fonctionnalites principales du projet.

### Ordre de demo conseille

1. connexion avec un compte existant ;
2. affichage des categories ;
3. creation d'une categorie publique ou privee ;
4. ajout d'un favori ;
5. modification ou suppression d'un favori ;
6. deverrouillage d'une categorie privee ;
7. suppression d'une categorie avec choix de strategie ;
8. restauration d'une categorie supprimee ;
9. consultation du compte ou de l'administration si tu veux finir par une vue plus complete.

### Ce que tu peux dire pendant la demo

A chaque action visible dans l'interface, il se passe aussi quelque chose en arriere-plan :

- une requete part du frontend ;
- l'API verifie les droits ;
- la base est interrogee ou modifiee ;
- le frontend se met a jour.

### Point fort a souligner

SaveNest ne se limite pas a un CRUD basique : il y a une vraie logique metier avec les categories privees, les roles, la categorie par defaut et la restauration.

### Transition

Comme tout projet, SaveNest m'a aussi pose plusieurs difficultes pendant le developpement.

---

## PAGE 16 - PROBLEMES RENCONTRES

### Ce que tu peux dire

Pendant le projet, j'ai rencontre plusieurs difficultes importantes.

### 1. La communication complete entre front, back et base

Il fallait bien comprendre qu'une erreur pouvait venir :

- du formulaire ;
- de la requete `fetch()` ;
- d'une route Express ;
- d'un controleur ;
- du token ;
- d'une requete SQL.

### 2. La securite

J'ai du mettre en place :

- le hachage des mots de passe avec `bcrypt` ;
- JWT pour l'authentification ;
- la verification des droits ;
- la distinction entre utilisateur classique, moderateur et administrateur.

### 3. Les categories privees

Une categorie privee demandait une logique particuliere.

Il fallait :

- verifier le mot de passe ;
- ne pas exposer ce mot de passe au frontend ;
- autoriser l'acces temporairement ;
- rebloquer l'acces apres rechargement si necessaire.

### 4. La suppression de categories

Supprimer une categorie contenant deja des favoris n'etait pas un simple `DELETE`.

Il fallait proposer plusieurs strategies :

- supprimer les favoris ;
- ou les deplacer vers la categorie par defaut.

### Phrase utile

Ces difficultes m'ont surtout appris a raisonner sur l'ensemble de l'application, et pas seulement sur l'affichage.

### Transition

Malgre ces difficultes, le projet fonctionne deja bien, et il peut encore evoluer.

---

## PAGE 17 - FUTUR DU PROJET

### Ce que tu peux dire

Plusieurs evolutions sont possibles pour une future version de SaveNest.

### Evolutions envisageables

- deploiement complet en HTTPS ;
- tests automatises ;
- recuperation de mot de passe par email ;
- partage de favoris ou de categories entre utilisateurs ;
- experience mobile encore amelioree ;
- recherche et filtres plus avances ;
- accessibilite encore renforcee ;
- gestion plus poussee des preferences utilisateur.

Le projet a donc ete pense pour pouvoir evoluer, meme si toutes ces fonctionnalites ne sont pas encore implementees aujourd'hui.

### Phrase utile

Le projet est deja fonctionnel, mais il garde un vrai potentiel d'evolution.

### Transition

Je vais maintenant terminer avec un bilan global du projet.

---

## PAGE 18 - CONCLUSION

### Ce que tu peux dire

Pour conclure, SaveNest est un projet full stack coherent qui m'a permis de travailler l'ensemble des etapes de developpement d'une application web.

Ce projet m'a permis de mobiliser :

- le frontend avec HTML, CSS et JavaScript ;
- le backend avec Node.js et Express ;
- la base de donnees avec MySQL ;
- la securite avec JWT et `bcrypt` ;
- la conception avec MERISE, MCD et MLD.

Au-dela de la technique, il m'a aussi appris a mieux structurer mon code, a resoudre des problemes, et a raisonner sur une logique metier complete.

### Phrase de conclusion forte

SaveNest m'a permis de comprendre concretement le fonctionnement d'une application web dynamique complete, depuis l'action utilisateur jusqu'a l'enregistrement securise des donnees en base.

### Transition

Je vais maintenant terminer par les remerciements.

---

## PAGE 19 - REMERCIEMENTS

### Ce que tu peux dire

Pour terminer, je remercie la Ligue de l'Enseignement, mon formateur Belkacem Taleb, ainsi que toutes les personnes qui m'ont accompagne pendant la formation.

Ce projet m'a permis de mettre en pratique les competences vues pendant l'annee et de mieux comprendre le metier de developpeur web et web mobile.

Merci pour votre attention. Je suis maintenant disponible pour repondre a vos questions.

### Transition

La derniere slide me sert surtout de fermeture visuelle.

---

## PAGE 20 - SLIDE FINALE

### Ce que tu peux dire

Cette derniere slide est une touche finale plus personnelle.

Tu peux soit ne rien dire de plus et laisser cette slide apparaitre comme une sortie visuelle, soit ajouter une phrase legere pour relacher la tension de fin d'oral.

### Version tres simple

Je vous remercie encore pour votre attention.

### Version plus detendue

Je vous laisse sur cette derniere slide, qui ferme la presentation sur une note un peu plus libre et personnelle.

---

## ANNEXE - QUESTIONS POSSIBLES DU JURY

### Pourquoi avoir choisi MySQL ?

Parce que mon projet contient des donnees relationnelles : un utilisateur possede des categories, une categorie contient des favoris, et un utilisateur possede aussi un role et des langues.

### A quoi sert Express ?

Express sert a creer le serveur backend et a organiser les routes de l'API.

### A quoi sert JWT ?

JWT permet d'authentifier l'utilisateur sur les routes protegees.

### A quoi sert `bcrypt` ?

`bcrypt` permet de hacher les mots de passe avant de les stocker en base.

### C'est quoi une API REST ?

C'est une maniere d'organiser la communication entre le frontend et le backend avec des routes et des methodes HTTP comme `GET`, `POST`, `PATCH` et `DELETE`.

### Quelle difference entre MCD et MLD ?

Le MCD sert a modeliser les donnees de facon conceptuelle, alors que le MLD transforme cette logique en tables et en relations plus proches de la vraie base.

### Quelle fonctionnalite rend le projet plus interessant qu'un CRUD tres simple ?

La gestion des categories privees, des roles, de la categorie par defaut et de la restauration de categories ajoute une vraie logique metier au projet.
