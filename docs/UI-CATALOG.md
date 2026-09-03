# UI catalogue — direction 2026

## Intention

BD Desk reprend une force des gestionnaires BD historiques : **voir beaucoup de couvertures rapidement** et parcourir sa collection comme une bibliothèque visuelle. Cette idée est conservée sans copier l'identité graphique ni la structure exacte de BDGest Online.

La direction 2026 repose sur une interface plus légère : moins de grands panneaux, moins de chrome, davantage de couvertures visibles, filtres compacts, hiérarchie typographique nette et navigation tactile.

## Principes

- La couverture est l'élément visuel principal.
- Les informations sous une couverture restent courtes : série/titre, tome et éventuellement une ligne secondaire.
- La densité augmente avec l'espace disponible sans créer plusieurs applications.
- Les quatre thèmes Neutre, BD, Comics et Manga modifient l'habillage, jamais la structure fonctionnelle.
- La fiche complète reste accessible à l'ouverture d'un album au lieu de surcharger la grille.
- Les filtres de collection restent proches de la grille et peuvent rester visibles pendant le scroll.

## Matrice de densité

| Contexte | Cible |
|---|---|
| Petit smartphone portrait | 2 colonnes compactes |
| Smartphone portrait | 2 colonnes compactes, objectif de consultation 2 × 2 dans un écran PWA courant |
| Smartphone paysage | 4 colonnes |
| Tablette portrait | 4 colonnes |
| Tablette paysage | 5 colonnes |
| Desktop | généralement 6 à 8 colonnes selon largeur disponible |

Les tailles ne sont pas basées sur une marque ou un modèle. `adaptive-ui.js` classe l'espace disponible en `phone`, `tablet` ou `desktop`, puis `catalog-ui.css` applique la densité correspondante.

## Accueil

L'accueil garde les KPI essentiels mais les rend plus compacts. Les derniers ajouts utilisent le même langage de grille que la collection pour éviter un changement brutal de densité entre les écrans.

## Ma collection

La collection est conçue comme un **catalogue visuel dense** :

- barre de recherche/filtrage compacte et sticky ;
- couvertures alignées selon une grille adaptative ;
- métadonnées courtes sous chaque couverture ;
- sur smartphone portrait, la troisième ligne descriptive est masquée pour gagner de la hauteur ;
- interactions détaillées reportées dans la fiche album.

## Implémentation

- `public/styles.css` : design system et composants communs.
- `public/adaptive-ui.js` : classification de l'espace et orientation.
- `public/adaptive-ui.css` : composition navigation/header mobile.
- `public/catalog-ui.css` : densité catalogue, tailles de cartes, grilles tablette/desktop/smartphone.
- `public/detail-v2.css` : fiche album.

La séparation permet de revenir à la composition précédente sans modifier les règles métier, l'API ou les données.

## QA

La nouvelle direction est développée sur la branche `feat/catalog-ui-refresh`. Elle ne doit rejoindre `main` qu'après CI verte et validation visuelle de `QA-IOS-002` sur iPhone, puis reprise de la campagne iPad/iPhone.
