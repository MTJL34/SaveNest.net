# API REST - SaveNest

## A dire a l'oral

Une API REST est l'interface qui permet au frontend et au backend de communiquer.

Dans SaveNest, elle sert a faire le lien entre l'interface visible dans le navigateur et le serveur qui traite les donnees puis communique avec MySQL.

## Son role dans le projet

Elle permet de :

- gerer l'authentification ;
- proteger l'acces aux donnees ;
- centraliser les verifications ;
- appliquer la logique metier ;
- renvoyer des reponses claires au frontend.

L'idee importante, c'est que le frontend ne parle jamais directement a la base de donnees. Toute la logique passe par l'API.

## Fonctionnement simple

1. l'utilisateur fait une action ;
2. le frontend envoie une requete ;
3. le backend recoit et verifie la demande ;
4. il interroge la base si besoin ;
5. il renvoie une reponse JSON ;
6. le frontend met a jour l'affichage.

## Pourquoi c'est important

L'API REST permet d'avoir une application :

- plus claire ;
- plus securisee ;
- plus facile a maintenir ;
- mieux separee entre interface, serveur et base de donnees.

## Phrase finale

Dans SaveNest, l'API REST est le coeur de la communication entre le frontend, le backend et la base de donnees.
