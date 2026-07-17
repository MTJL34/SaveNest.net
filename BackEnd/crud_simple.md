# API

## Auth / Utilisateurs

| Fonction JS | Route appelee |
| --- | --- |
| `getAllUsers()` | `GET /api/auth` |
| `registerUser(user)` | `POST /api/auth/register` |
| `loginUser(user)` | `POST /api/auth/login` |
| `logoutUser()` | `GET /api/auth/logout` |
| `getUserById(id)` | `GET /api/auth/:id` |
| `updateUser(id, user)` | `PATCH /api/auth/:id` |
| `deleteUser(id)` | `DELETE /api/auth/:id` |

## Categories

| Fonction JS | Route appelee |
| --- | --- |
| `getAllCategories()` | `GET /api/categories` |
| `getAdminCategories()` | `GET /api/categories/admin/all` |
| `getAdminCategoriesByUserId(userId)` | `GET /api/categories/admin/user/:userId` |
| `getCategoryById(id)` | `GET /api/categories/:id` |
| `createCategory(category)` | `POST /api/categories` |
| `unlockCategory(id)` | `POST /api/categories/:id/unlock` |
| `restoreDeletedCategories(data)` | `POST /api/categories/restore` |
| `updateCategory(id, category)` | `PATCH /api/categories/:id` |
| `deleteCategory(id)` | `DELETE /api/categories/:id` |

## Favoris

| Fonction JS | Route appelee |
| --- | --- |
| `getAllFavs()` | `GET /api/favs` |
| `getFavById(id)` | `GET /api/favs/:id` |
| `createFav(fav)` | `POST /api/favs` |
| `updateFav(id, fav)` | `PATCH /api/favs/:id` |
| `deleteFav(id)` | `DELETE /api/favs/:id` |
