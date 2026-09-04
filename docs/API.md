# API REST

Base : `/api`.

## Libre / application

L'édition est exposée par `edition` dans `/license` et `/capabilities` : `free` ou `licensed`. Le plan actif est `free` tant qu'aucune licence valide n'est activée.

| Méthode | Route | Usage |
|---|---|---|
| GET | `/health` | santé et nombre d'albums |
| GET | `/license` | plan et fonctionnalités |
| POST | `/license/activate` | activer une licence signée |
| GET | `/capabilities` | matrice des capacités de l'édition et du plan |
| GET | `/dashboard` | KPI d'accueil |
| GET | `/stats` | statistiques essentielles |
| GET | `/series` | synthèse des séries et trous détectés |
| GET | `/authors` | auteurs/dessinateurs |
| GET | `/publishers` | éditeurs |
| GET | `/history` | 100 derniers événements |
| GET/POST | `/loans` | lister/créer un prêt |
| PATCH | `/loans/:id/return` | marquer un prêt rendu |
| GET/POST | `/albums` | lister/créer |
| GET/PATCH/DELETE | `/albums/:id` | fiche album |
| POST | `/albums/:id/cover/resolve` | résoudre une couverture avec preuve ISBN/EAN, sans écraser une couverture utilisateur |
| GET | `/discover?isbn=…` | recherche externe manuelle avec candidats, scores et résolution retenue |
| GET | `/export/collection.json` | export complet gratuit |

`GET /albums` accepte `limit` (1–500), `offset`, `search`, `wishlist=0|1` et `read=0|1`. La réponse contient toujours `items`, `total`, `limit` et `offset`, ce qui permet à la PWA de parcourir une collection sans limite fonctionnelle.

## Premium

| Méthode | Route | Feature licence |
|---|---|---|
| GET | `/stats/advanced` | `advanced_stats` |
| GET | `/editions/anomalies` | `advanced_stats` |
| POST | `/metadata/:id/enrich` | `metadata_auto`, champs éditoriaux vides et provenance |
| POST | `/import/bdgest` | `bulk_import` — import du CSV BDGest dans BD Desk, jamais export |
| GET/POST | `/keys` | `api` |
| DELETE | `/keys/:id` | `api` |
| GET/POST | `/webhooks` | `webhooks` |
| PATCH/DELETE | `/webhooks/:id` | `webhooks` |
| GET | `/v1/collection` | `api` + clé API |

L'API machine utilise `Authorization: Bearer bdk_…` ou `X-API-Key`.

Voir `openapi.yaml` pour la définition OpenAPI.
