# CRUD 2 SaveNest

Documentation API backend.

**Base URL :** `http://localhost:3000/api`

## Regles generales

- Les routes `POST /auth/register` et `POST /auth/login` sont publiques.
- Toutes les autres routes demandent un token JWT : `Authorization: Bearer TOKEN`
- Les roles utilises dans le projet sont `ADMIN`, `MODERATOR` et `USER`.
- Remplace `:id` et `:userId` par un identifiant numerique valide.

**Exemple :** `GET http://localhost:3000/api/categories/6`

## 1. AUTH / UTILISATEURS

**Objectif :** gerer l'inscription, la connexion, la lecture et la modification des comptes.

### `GET /auth`

- Liste tous les utilisateurs.
- **Token :** oui
- **Droits :** `ADMIN` ou `MODERATOR`

### `POST /auth/register`

- Cree un nouveau compte utilisateur.
- **Token :** non

**Body exemple :**

```json
{
  "pseudo": "Neo",
  "mail": "neo@savenest.test",
  "password": "NeoPass123!",
  "spoken_languages": ["French", "English"]
}
```

### `POST /auth/login`

- Connecte un utilisateur et renvoie les informations utiles a la session.
- **Token :** non

**Body exemple :**

```json
{
  "identifier": "neo@savenest.test",
  "password": "NeoPass123!"
}
```

**Variantes acceptees :**

```json
{
  "mail": "neo@savenest.test",
  "password": "NeoPass123!"
}
```

```json
{
  "pseudo": "Neo",
  "password": "NeoPass123!"
}
```

### `GET /auth/logout`

- Deconnecte l'utilisateur authentifie.
- **Token :** oui

### `GET /auth/:id`

- Lit un utilisateur par son ID.
- **Token :** oui
- **Droits :** utilisateur concerne, `ADMIN` ou `MODERATOR`

### `PATCH /auth/:id`

- Modifie un utilisateur.
- **Token :** oui
- **Droits :** utilisateur concerne ou `ADMIN`

**Body possible :**

```json
{
  "pseudo": "MTJL",
  "mail": "leroy.mathiieu@gmail.com",
  "password": "NouveauMotDePasse",
  "default_category_id": 6
}
```

**Notes :**

- En `PATCH`, seuls les champs envoyes sont modifies.
- `default_category_id` peut etre `null` pour retirer la categorie par defaut.

### `DELETE /auth/:id`

- Supprime un utilisateur.
- **Token :** oui
- **Droits :** utilisateur concerne ou `ADMIN`

## 2. CATEGORIES

**Objectif :** creer, lire, modifier, supprimer, restaurer et deverrouiller des categories.

### `GET /categories`

- Liste les categories du compte connecte.
- **Token :** oui

### `GET /categories/admin/all`

- Liste complete pour administration.
- **Token :** oui
- **Droits :** `ADMIN` ou `MODERATOR`

### `GET /categories/admin/user/:userId`

- Liste les categories d'un utilisateur cible.
- **Token :** oui
- **Droits :** `ADMIN` ou `MODERATOR`

### `GET /categories/:id`

- Lit une categorie precise.
- **Token :** oui
- **Droits :** proprietaire, `ADMIN` ou `MODERATOR`

### `POST /categories`

- Cree une categorie.
- **Token :** oui

**Body categorie publique :**

```json
{
  "category_name": "Travail",
  "confidentiality": 0,
  "password": null
}
```

**Body categorie privee :**

```json
{
  "category_name": "Lectures",
  "confidentiality": 1,
  "password": "Test123"
}
```

**Notes :**

- `confidentiality = 0` : categorie publique
- `confidentiality = 1` : categorie privee
- Une categorie privee doit avoir un mot de passe.
- Si `id_user` n'est pas envoye, la categorie appartient a l'utilisateur connecte.
- Un `ADMIN` ou `MODERATOR` peut creer pour un autre utilisateur.

### `PATCH /categories/:id`

- Modifie une categorie.
- **Token :** oui
- **Droits :** proprietaire, `ADMIN` ou `MODERATOR`

**Body possible :**

```json
{
  "category_name": "Travail perso",
  "confidentiality": 0,
  "password": ""
}
```

**Cas utiles :**

Rendre une categorie publique privee :

```json
{
  "confidentiality": 1,
  "password": "NouveauMotDePasse"
}
```

Rendre une categorie privee publique :

```json
{
  "confidentiality": 0,
  "password": "MotDePasseActuel"
}
```

Reassigner une categorie a un autre utilisateur :

```json
{
  "id_user": 8
}
```

**Notes :**

- Si la categorie est deja privee, son mot de passe actuel est requis pour confirmer la modification.
- Un utilisateur simple ne peut pas reassigner une categorie a un autre compte.

### `DELETE /categories/:id`

- Supprime une categorie.
- **Token :** oui
- **Droits :** proprietaire, `ADMIN` ou `MODERATOR`

**Comportement special :**

- Si la categorie contient encore des favoris, l'API peut repondre `409`.
- Il faut alors choisir une strategie avec `delete_strategy`.

**Body possible pour suppression :**

```json
{
  "delete_strategy": "delete_favorites"
}
```

ou

```json
{
  "delete_strategy": "move_to_default"
}
```

### `POST /categories/restore`

- Restaure une ou plusieurs categories supprimees recemment.
- **Token :** oui

**Body exemple :**

```json
{
  "category_ids": [6, 7]
}
```

### `POST /categories/:id/unlock`

- Verifie le mot de passe d'une categorie privee.
- **Token :** oui

**Body :**

```json
{
  "password": "Test123"
}
```

**Note :**

Cette route ne modifie pas la base. Elle confirme seulement l'acces.

## 3. FAVS / FAVORIS

**Objectif :** creer, lire, modifier et supprimer des favoris rattaches a une categorie.

### `GET /favs`

- Liste les favoris accessibles.
- **Token :** oui
- `USER` : seulement ses favoris
- `ADMIN` ou `MODERATOR` : tous les favoris

### `GET /favs/:id`

- Lit un favori precis.
- **Token :** oui

### `POST /favs`

- Cree un favori.
- **Token :** oui

**Body minimum :**

```json
{
  "title_favs": "OpenAI",
  "id_category": 6
}
```

**Body complet possible :**

```json
{
  "title_favs": "OpenAI",
  "url_favs": "https://openai.com",
  "added_date": "2026-04-25",
  "logo": null,
  "id_category": 6
}
```

**Notes :**

- `title_favs` est obligatoire.
- `id_category` est obligatoire.
- `url_favs` est facultatif.
- Un utilisateur ne peut pas ajouter un favori dans la categorie d'un autre.
- Une URL deja enregistree peut renvoyer une erreur `409`.

### `PATCH /favs/:id`

- Modifie un favori.
- **Token :** oui

**Body possible :**

```json
{
  "title_favs": "OpenAI Docs",
  "url_favs": "https://platform.openai.com/docs",
  "id_category": 6
}
```

**Deplacer un favori :**

```json
{
  "id_category": 2
}
```

**Notes :**

- En `PATCH`, seuls les champs envoyes sont modifies.
- Le titre ne peut pas etre vide.
- La categorie cible doit exister et etre accessible.

### `DELETE /favs/:id`

- Supprime un favori.
- **Token :** oui

## Resume court des routes

### AUTH

- `GET /auth`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/logout`
- `GET /auth/:id`
- `PATCH /auth/:id`
- `DELETE /auth/:id`

### CATEGORIES

- `GET /categories`
- `GET /categories/admin/all`
- `GET /categories/admin/user/:userId`
- `GET /categories/:id`
- `POST /categories`
- `POST /categories/restore`
- `POST /categories/:id/unlock`
- `PATCH /categories/:id`
- `DELETE /categories/:id`

### FAVS

- `GET /favs`
- `GET /favs/:id`
- `POST /favs`
- `PATCH /favs/:id`
- `DELETE /favs/:id`
