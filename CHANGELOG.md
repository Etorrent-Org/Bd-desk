# Changelog

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
