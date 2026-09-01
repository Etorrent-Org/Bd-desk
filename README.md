# BD Desk

**BD Desk** est une application Web/PWA de gestion de collections **BD, comics et manga**. Elle conserve une seule architecture UX et propose quatre habillages visuels : **Neutre**, **BD**, **Comics** et **Manga**.

## Positionnement produit

- **Gratuit** : collection illimitée, ajout manuel, scan ISBN/EAN, recherche, séries, albums, auteurs, éditeurs, wishlist, prêts, lecture, historique, export JSON et statistiques essentielles.
- **Premium** : import massif BDGest, enrichissement automatique multi-source, statistiques avancées, détection de variantes/anomalies, API, webhooks HMAC et MCP pour n8n, Notion, Make et agents IA.
- Une fonction Premium n'est jamais seulement masquée dans l'interface : elle est **contrôlée côté serveur** par une licence signée.
- Les données personnelles du collectionneur ne sont jamais écrasées silencieusement par le moteur de métadonnées.

## État v1.0

- 36 tests automatisés.
- Couverture du cœur serveur > 95 % sur les lignes et fonctions.
- Validation de l'import sur l'export BDGest de référence : **479/479 albums**, **13 891/13 891 contrôles de champs**, **100 % de fidélité**. Voir [`docs/VALIDATION-BDGEST.md`](docs/VALIDATION-BDGEST.md).
- Les tests unitaires n'embarquent pas la collection privée : un jeu de test synthétique est utilisé dans `tests/fixtures/`.

## Démarrage local

Prérequis : Node.js 22.5+ (Node 24 recommandé).

```bash
cp .env.example .env
# renseigner au minimum les secrets en production
npm test
npm start
```

Puis ouvrir `http://localhost:3096`.

Pour charger une collection BDGest en initialisation propriétaire, sans la committer :

```bash
BD_DESK_DB=./data/bd-desk.db \
BD_DESK_SEED_CSV=/chemin/vers/export-bdgest.csv \
npm run seed
```

## Docker

```bash
cp .env.example .env
# définir BD_DESK_LICENSE_SECRET et WEBHOOK_SIGNING_SECRET

docker compose up -d --build
```

L'application écoute sur le port `3096`.

## Premium

Générer une licence avec le même secret que l'instance :

```bash
BD_DESK_LICENSE_SECRET='votre-secret-long' npm run license:generate -- owner
```

La clé `BDP1…` est ensuite activée dans **Paramètres → Licence**.

## Documentation

- [Produit et périmètre](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Modèle de données](docs/DATA-MODEL.md)
- [API REST](docs/API.md) et [`openapi.yaml`](openapi.yaml)
- [Import BDGest](docs/IMPORT-BDGEST.md)
- [Métadonnées externes](docs/METADATA.md)
- [Licence Premium](docs/PREMIUM-LICENSE.md)
- [MCP 2026-07-28](docs/MCP.md)
- [UI et quatre thèmes](docs/UI-THEMES.md)
- [Sécurité](docs/SECURITY.md)
- [Tests et validation](docs/TESTING.md)
- [Test iPad / PWA](docs/DEPLOYMENT-IPAD.md)

## Structure

```text
src/                    serveur, données, licence, MCP, métadonnées
public/                 PWA et design system
scripts/                seed, validation, licences, tests API externes
tests/                  tests automatisés et fixtures synthétiques
docs/                   documentation produit et technique
integrations/            guides n8n, Make, Notion, MCP
.github/workflows/       CI + contrôle hebdomadaire des APIs externes
```

## Données privées

Les exports de collection (`data/*.csv`), bases SQLite (`*.db`) et secrets (`.env`) sont ignorés par Git. **Ne pas les committer**, même dans un repository privé, sauf décision explicite.
