# BD Desk

**BD Desk** est une application Web/PWA de gestion de collections **BD, comics et manga**. Elle conserve une seule architecture fonctionnelle et propose quatre habillages visuels : **Neutre**, **BD**, **Comics** et **Manga**.

## Positionnement produit

- **Gratuit** : collection illimitée, ajout manuel, scan ISBN/EAN, recherche, séries, albums, auteurs, éditeurs, wishlist, prêts, lecture, historique, export JSON et statistiques essentielles.
- **Premium** : import massif BDGest, enrichissement automatique multi-source, statistiques avancées, détection de variantes/anomalies, API, webhooks HMAC et MCP pour n8n, Notion, Make et agents IA.
- Le résolveur de métadonnées est générique : il rapproche les fournisseurs par ISBN/EAN exact, conserve la provenance et accepte une couverture automatique uniquement avec une preuve d’identité exploitable. Le catalogue officiel Hachette utilisé par Glénat complète BnF, Google Books et Open Library.
- Une URL Open Library construite mécaniquement n’est jamais enregistrée comme couverture. Les couvertures existantes issues de l’ancien comportement sont marquées machine et remplaçables ; une couverture saisie par le collectionneur reste protégée.
- Une fonction Premium n'est jamais seulement masquée dans l'interface : elle est **contrôlée côté serveur** par une licence signée.
- Les données personnelles du collectionneur ne sont jamais écrasées silencieusement par le moteur de métadonnées.

## Interface adaptative universelle

BD Desk utilise **la même application, les mêmes données et les mêmes fonctionnalités** sur desktop, tablette et smartphone, mais la composition de l'interface s'adapte automatiquement au terminal.

La détection ne repose pas sur le nom du navigateur, `user-agent`, la marque ou le modèle du téléphone. Elle combine **largeur utile du viewport, petit côté de l'écran, pointeur tactile et orientation** afin d'appliquer un mode `phone`, `tablet` ou `desktop`.

Sur smartphone :

- le portrait utilise une vraie interface mobile avec **2 albums par ligne**, header compact, recherche à la demande, actions secondaires regroupées et navigation basse permanente ;
- le paysage conserve la navigation mobile mais augmente la densité lorsque l'espace horizontal le permet ;
- les zones tactiles, safe areas iOS/Android, fiches, modales et navigation restent utilisables sans zoom ;
- les quatre thèmes restent strictement les mêmes fonctionnellement.

Les règles adaptatives sont isolées dans `public/adaptive-ui.js` et `public/adaptive-ui.css` afin de ne pas dupliquer l'application.

## Catalogue visuel 2026

La grille de collection suit une logique de **bibliothèque visuelle dense** : on conserve l'idée efficace des gestionnaires BD historiques — parcourir rapidement beaucoup de couvertures — sans reprendre leur identité graphique ni leur mise en page.

La couche `public/catalog-ui.css` ajoute :

- smartphone portrait : **2 colonnes compactes**, avec une cible de consultation de **4 albums (2 × 2)** dans un écran PWA courant ;
- smartphone paysage : 4 colonnes ;
- tablette : 4 colonnes en portrait, 5 en paysage ;
- desktop : grille généralement comprise entre 6 et 8 couvertures selon la largeur disponible ;
- filtres de collection compacts et sticky ;
- métadonnées réduites sous les couvertures pour favoriser la densité ;
- KPI d'accueil plus compacts et derniers ajouts alignés sur le même langage de grille.

Cette refonte et les correctifs de couverture ont été déployés sur la preview AlwaysData ; la dernière exécution de déploiement est le **Deploy #113**. Le détail de la direction visuelle se trouve dans [`docs/UI-CATALOG.md`](docs/UI-CATALOG.md).

## État courant

- CI Node.js 22 et 24, couverture et smoke tests sont exécutés à chaque changement.
- La CI contrôle aussi la syntaxe des scripts frontend critiques et le contrat de l'interface adaptative mobile.
- **Catalogue visuel et résolveur couverture sur `main`** : CI #197 verte, Deploy #113 validé ; la dernière série de correctifs est portée par le commit [`9c2628f`](https://github.com/Etorrent-Org/Bd-desk/commit/9c2628ff6a35ccc8f06e45295c420d996736fc7a).
- Preview alwaysdata : synchronisation SSH, `/api/health` et contrôle live de normalisation BnF **validés** sur `main`.
- Live QA fournisseurs : le catalogue Hachette/Glénat, BnF Dublin Core/Intermarc, Open Library et Google Books sont isolés par fournisseur ; Google Books peut être limité en CI par le quota anonyme HTTP 429 sans clé dédiée.
- Le cas de référence Sweet Revenge (EAN 9782344059814) est couvert par des fixtures locales et la résolution attendue est : Valhalla Bunker, tome 1, Glénat, Comix Buro, 2024-08-21, 64 pages, 24 × 32 cm, Fabien Bedouel, avec couverture officielle Hachette.
- Import BDGest de référence contrôlé localement le 04/09/2026 avec la procédure d’idempotence et de fidélité champ par champ. Le fichier privé et les résultats détaillés ne sont jamais committés ; la procédure est décrite dans [`docs/VALIDATION-BDGEST.md`](docs/VALIDATION-BDGEST.md).
- Les tests unitaires n'embarquent pas la collection privée : un jeu de test synthétique est utilisé dans `tests/fixtures/`.
- Le suivi QA vivant est tenu dans [`docs/QA-TRACKING.md`](docs/QA-TRACKING.md).
- **Campagne QA matérielle iOS en cours** : iPad + iPhone, navigateur réel puis PWA, exécutée test par test dans l'ordre `QA-IOS-001` à `QA-IOS-020`.

## Preview iOS — iPad et iPhone

La preview de développement est disponible sur :

`https://tatoune.alwaysdata.net/`

Le workflow GitHub `Deploy preview to alwaysdata` synchronise les changements de `main` vers alwaysdata puis exécute un health check et un contrôle live des métadonnées. Si la clé API alwaysdata n'est pas exposée au workflow, le redémarrage HTTP automatique est ignoré et peut être effectué manuellement ; les contrôles live restent exécutés.

La preview n'utilise que des données synthétiques et ne publie jamais le fichier privé d'import BDGest.

La validation réelle est menée sur **iPad et iPhone**, d'abord dans un navigateur réel, puis comme PWA installée sur l'écran d'accueil. Les résultats sont enregistrés au fur et à mesure dans [`docs/QA-TRACKING.md`](docs/QA-TRACKING.md).

Voir [Test iOS / PWA](docs/DEPLOYMENT-IPAD.md) et [Déploiement alwaysdata](docs/DEPLOYMENT-ALWAYSDATA.md).

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
  BD_DESK_SEED_CSV=/chemin/vers/fichier-import-bdgest.csv \
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

> **Commercialisation :** le repository est actuellement public. Un utilisateur qui contrôle son instance peut donc modifier le code de vérification de licence. Pour une offre Premium réellement vendable, les droits commerciaux sensibles doivent être validés par un service d'entitlement/backend contrôlé par l'éditeur. La licence locale v1 est adaptée aux previews, tests et déploiements de confiance, pas à une protection anti-contournement forte.

## Documentation

- [Produit et périmètre](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Modèle de données](docs/DATA-MODEL.md)
- [API REST](docs/API.md) et [`openapi.yaml`](openapi.yaml)
- [Import BDGest](docs/IMPORT-BDGEST.md)
- [Métadonnées externes](docs/METADATA.md)
- [Résolution d’identité et de couverture](docs/METADATA-RESOLUTION.md)
- [Licence Premium](docs/PREMIUM-LICENSE.md)
- [MCP 2026-07-28](docs/MCP.md)
- [UI et quatre thèmes](docs/UI-THEMES.md)
- [UI catalogue 2026](docs/UI-CATALOG.md)
- [Sécurité](docs/SECURITY.md)
- [Tests et validation](docs/TESTING.md)
- [Suivi QA vivant](docs/QA-TRACKING.md)
- [Rapport QA v1.0.0](docs/QA-REPORT.md)
- [Test iPad + iPhone / PWA](docs/DEPLOYMENT-IPAD.md)
- [Preview alwaysdata](docs/DEPLOYMENT-ALWAYSDATA.md)

## Structure

```text
src/                    serveur, données, licence, MCP, métadonnées
public/                 PWA, design system, adaptation responsive et grille catalogue
scripts/                seed, validation, licences, tests API externes
tests/                  tests automatisés et fixtures synthétiques
deploy/                 lanceurs d'environnements de preview
docs/                   documentation produit, technique et suivi QA
integrations/            guides n8n, Make, Notion, MCP
.github/workflows/       CI, Live QA et déploiement preview
```

## Données privées

Les exports de collection (`data/*.csv`), bases SQLite (`*.db`) et secrets (`.env`) sont ignorés par Git. **Ne pas les committer**, même dans un repository privé, sauf décision explicite.
