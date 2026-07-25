# Architecture de la Base de Données

Ce dossier centralise tous les fichiers et scripts liés à la base de données SQL Server de DahabStock.

## Structure

- **`migrations/`** : Contient les scripts SQL de mise à jour de la base de données (ajout de colonnes, nouvelles tables, etc.). Chaque fichier doit idéalement être préfixé par la date (ex: `20231012_ajout_colonne_couleur.sql`).
- **`schemas/`** : Contient les scripts de création initiaux des tables, vues, et procédures stockées. Ces fichiers décrivent la structure officielle de la base.
- **`seeds/`** : Contient les scripts d'insertion de données par défaut (ex: liste des catégories, données de test pour l'environnement de développement).

*Note: La logique de connexion et d'exécution des requêtes applicatives (CRUD) se trouve dans le backend Rust (`src-tauri/src/repositories/`).*
