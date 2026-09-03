# BD Desk — Expérience UI V3

## Objectif

La V3 remplace l'empilement visuel précédent par une couche d'expérience cohérente, sans modifier le modèle de données ni les workflows métier. L'application conserve une seule UX et quatre thèmes visuels : Neutre, BD, Comics et Manga.

## Principes

- **La couverture est l'objet principal** : grandes vignettes, ratio album constant, hiérarchie titre/série/tome lisible.
- **Aucun fallback générique « Couverture »** : si aucune image exploitable n'est disponible, BD Desk génère une couverture éditoriale typographique déterministe à partir de la fiche.
- **Récupération progressive** : les couvertures manquantes visibles peuvent être recherchées via les fournisseurs existants, avec concurrence et nombre d'appels limités.
- **Densité adaptée** : 2 colonnes sur smartphone portrait, 4 environ sur tablette, 5 à 6 sur desktop selon l'espace disponible.
- **Même structure fonctionnelle** dans tous les thèmes : seules les variables visuelles et certains détails graphiques changent.

## Écrans couverts

Accueil, collection, albums, séries, auteurs, éditeurs, wishlist, prêts, historique, statistiques, découverte, paramètres, modales et fiche album latérale utilisent la nouvelle couche `experience-v3.css`.

## Couvertures

`experience-v3.js` transforme les placeholders existants en couvertures éditoriales. Lorsqu'un album visible possède un ISBN mais pas de couverture exploitable, une recherche progressive est tentée via `/api/discover`. Une URL valide peut être mémorisée dans le champ éditorial `coverUrl` uniquement lorsqu'il était vide.

La donnée collectionneur (état, prix d'achat, dédicace, notes, possession) n'est jamais modifiée par cette logique.

## Responsive

La V3 s'appuie sur la classification existante `phone / tablet / desktop` et ne fait aucun sniffing user-agent. Le shell, les grilles, la navigation basse et les drawers sont adaptés à la largeur disponible.

## Cache

La V3 utilise le cache PWA `bd-desk-v26` et le build `2026.09.03.3` afin d'éviter de resservir l'ancienne interface sur iPad/iPhone.

## QA

La CI vérifie :

- la syntaxe JS de la couche V3 ;
- le branchement CSS/JS dans `index.html` ;
- la présence des quatre thèmes ;
- le fallback éditorial ;
- le cache PWA V26 ;
- la suite fonctionnelle et la couverture existantes.
