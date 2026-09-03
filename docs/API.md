# API REST

Base : `/api`.

## Libre / application

| Méthode | Route | Usage |
|---|---|---|
| GET | `/health` | santé et nombre d'albums |
| GET | `/license` | plan et fonctionnalités |
| POST | `/license/activate` | activer une licence signée |
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

## Premium

| Méthode | Route | Feature licence |
|---|---|---|
| GET | `/stats/advanced` | `advanced_stats` |
| GET | `/editions/anomalies` | `advanced_stats` |
| POST | `/metadata/:id/enrich` | `metadata_auto`, champs éditoriaux vides et provenance |
| POST | `/import/bdgest` | `bulk_import` |
| GET/POST | `/keys` | `api` |
| DELETE | `/keys/:id` | `api` |
| GET/POST | `/webhooks` | `webhooks` |
| PATCH/DELETE | `/webhooks/:id` | `webhooks` |
| GET | `/v1/collection` | `api` + clé API |

L'API machine utilise `Authorization: Bearer bdk_…` ou `X-API-Key`.

Voir `openapi.yaml` pour la définition OpenAPI.
