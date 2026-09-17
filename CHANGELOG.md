# Changelog

## Unreleased

### 2026-09-08 — navigation et typographie

- KPI du dashboard rendus réellement navigables via le routeur applicatif, au clic comme au clavier ;
- conservation du filtre dédié aux séries incomplètes ;
- typographie éditoriale allégée, suppression des capitales forcées sur les cartes catalogue et stacks de polices adaptées aux thèmes ;
- aucun changement du pipeline de couvertures stabilisé.

### 2026-09-07 — accueil et couvertures

- accueil densifié jusqu'à huit acquisitions récentes ;
- résolution Premium des couvertures par lots ;
- couvertures machine servies via un proxy same-origin vérifié ;
- aucun faux visuel fournisseur persisté lorsqu'aucune preuve d'identité exploitable n'est disponible ;
- pipeline de couvertures lancé après import BDGest et au démarrage d'une instance licenciée ;
- cache PWA incrémenté pour supprimer les anciens chemins de couvertures ;
- validation de référence : 96 tests, import BDGest réel 479/479 albums et réimport idempotent ;
- QA matérielle iPhone/iPad restant explicitement suivie dans `docs/QA-TRACKING.md`.

### 2026-09-06 — import BDGest

- import reconstruit sur une page dédiée ;
- sélecteur fichier natif visible relié par `label[for]`, compatible clavier et glisser-déposer ;
- lecture locale via `File.text()` / `FileReader` ;
- aperçu serveur non destructif obligatoire avant confirmation d'import ;
- flux réservé à l'édition licenciée ;
- aucun contournement JavaScript du sélecteur natif.

### 2026-09-04 — MVP Free/licencié et métadonnées

- séparation explicite par `BD_DESK_EDITION`, Free par défaut ;
- contrôle serveur des capacités et licences ;
- Gold conservé hors périmètre ;
- résolveur générique multi-source avec identité ISBN/EAN exacte et provenance ;
- ajout du catalogue Hachette/Glénat comme source officielle ;
- suppression de la génération mécanique d'URLs Open Library ;
- protection des couvertures et données saisies par l'utilisateur ;
- édition, enrichissement, API, webhooks HMAC et MCP couverts par la suite de tests ;
- refonte UI V3, interface adaptative phone/tablet/desktop et grille catalogue dense ;
- documentation QA centralisée dans `docs/QA-TRACKING.md`.

## 1.0.1 — 2026-09-02

- refonte de la fiche album et masquage des champs vides ;
- enrichissement éditorial sans écrasement des données personnelles ;
- édition manuelle étendue ;
- amélioration de la récupération et persistance des couvertures ;
- cache PWA mis à jour ;
- tests de non-régression sur les champs éditoriaux et personnels.

## 1.0.0 — 2026-09-01

- UI/PWA unique avec thèmes Neutre, BD, Comics et Manga ;
- collection, séries, albums, auteurs, éditeurs, wishlist, lecture, prêts et historique ;
- scan ISBN/EAN avec fallback manuel ;
- recherche externe BnF / Google Books / Open Library ;
- import massif BDGest Premium ;
- licence Free/Premium signée ;
- statistiques avancées et détection de variantes Premium ;
- API, clés révocables, webhooks HMAC et MCP 2026-07-28 ;
- validation réelle de l'import BDGest et suite de tests automatisés.

## Suivi détaillé

Les preuves, nombres de tests, déploiements AlwaysData et validations matérielles sont volontairement suivis dans [`docs/QA-TRACKING.md`](docs/QA-TRACKING.md) afin d'éviter de dupliquer des chiffres susceptibles d'évoluer dans ce changelog.
