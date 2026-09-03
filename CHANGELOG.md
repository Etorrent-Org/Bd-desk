# Changelog

## Unreleased

- Ajout de `docs/QA-TRACKING.md`, journal QA vivant sous forme de tableau **Test / Validation / PR**.
- Mise à jour du suivi CI : Node.js 22/24, couverture et smoke tests exécutés à chaque changement.
- Validation live de la preview alwaysdata : synchronisation SSH, `/api/health` et normalisation BnF réussies dans le déploiement #79.
- Le redémarrage automatique via l'API alwaysdata devient non bloquant : un redémarrage manuel reste possible sans empêcher les contrôles live.
- Lancement d'une campagne QA matérielle **iPad + iPhone**, navigateur réel puis PWA, structurée en 20 tests `QA-IOS-001` à `QA-IOS-020` et exécutée strictement un test à la fois.
- Premier retour matériel iPad : correction du chevauchement des cartes `Reprendre ma lecture` lorsque la couverture est absente, avec cache PWA incrémenté pour forcer le nouveau CSS.
- Premier retour iPhone portrait : décision de remplacer le simple responsive compressé par une **interface smartphone universelle dédiée**.
- Nouvelle couche `adaptive-ui.js` / `adaptive-ui.css` : détection `phone / tablet / desktop` par viewport, taille d'écran, capacités tactiles et orientation, **sans sniffing user-agent**.
- Smartphone portrait : header compact, recherche à la demande, actions secondaires regroupées, navigation basse permanente et collection en **2 colonnes**.
- Smartphone paysage : densité adaptée tout en conservant la navigation mobile.
- Branche `feat/catalog-ui-refresh` créée depuis le dernier état validé de `main` afin d'isoler la refonte de densité et de permettre un retour arrière immédiat.
- Nouvelle couche `catalog-ui.css` : bibliothèque visuelle dense inspirée du principe de catalogue de BDGest Online sans en copier l'identité graphique.
- Nouvelle matrice de grille : smartphone portrait 2 colonnes compactes avec objectif 2 × 2 visible, smartphone paysage 4 colonnes, tablette 4/5 colonnes, desktop généralement 6 à 8 couvertures.
- Filtres de collection rendus plus compacts et sticky ; informations secondaires réduites sur smartphone pour privilégier les couvertures.
- KPI d'accueil compactés et derniers ajouts alignés sur le même langage de grille que la collection.
- Cache PWA incrémenté en `bd-desk-v24` et CI étendue à `catalog-ui.css`.
- Ajout de `docs/UI-CATALOG.md` et harmonisation README / architecture / QA avec cette direction 2026.
- **PR #1 fusionnée dans `main`** (`3d213285`) après CI Node 22/24 et smoke tests verts ; **Deploy #87 réussi** avec synchro SSH, `/api/health` et contrôle live des métadonnées validés.

## 1.0.1 — 2026-09-02

- Refonte de la fiche album : hiérarchie éditoriale, grande couverture, sections informations/créateurs/résumé/collection/métadonnées.
- Masquage des champs vides au lieu d'afficher des tirets.
- Affichage intelligent Auteur(s) quand les rôles scénario/dessin ne sont pas distincts.
- Récupération de couverture de secours via les fournisseurs disponibles puis mémorisation de l'URL valide.
- Enrichissement Premium étendu côté client : série, tome, collection, auteur, couverture, résumé et date éditoriale quand les champs sont absents.
- Édition manuelle étendue : collection, format, état, couverture et résumé.
- Modèle de persistance élargi sans écrasement silencieux des données personnelles.
- Cache PWA incrémenté pour forcer la mise à jour sur iPad/mobile.
- Ajout de tests de non-régression sur les champs éditoriaux et personnels.

## 1.0.0 — 2026-09-01

- UI/PWA unique avec thèmes Neutre, BD, Comics et Manga.
- Collection, séries, albums, auteurs, éditeurs, wishlist, lecture, prêts, historique.
- Scan ISBN/EAN avec fallback manuel.
- Recherche externe BnF / Google Books / Open Library.
- Import massif BDGest Premium.
- Licence Free/Premium signée.
- Statistiques avancées et détection de variantes Premium.
- API, clés révocables, webhooks HMAC et MCP 2026-07-28.
- Validation réelle de l'import BDGest et suite de tests automatisés.