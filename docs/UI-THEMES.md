# UI / UX et thèmes

## Règle absolue

Il n'existe qu'**une UI fonctionnelle**. Les quatre thèmes ne changent ni l'information architecture, ni les composants, ni les positions des actions majeures.

## Structure

Desktop : sidebar sombre, barre de recherche supérieure, KPI, couvertures, lecture, grilles et panneau de détail.

Mobile : navigation basse à cinq actions, bouton central d'ajout, cartes horizontales et panneau album plein écran.

## Thèmes

### Neutre

Blanc/graphite, bleu comme accent. Sobre et premium.

### BD

Papier chaud, brun/ocre, détails éditoriaux légers. Pas de bulles décoratives envahissantes.

### Comics

Fond sombre, contrastes rouges/jaunes, typographie d'affichage plus énergique, trame discrète.

### Manga

Blanc/noir/violet, grille fine et marqueurs japonais très subtils. Pas de caricature graphique.

## Persistance

Le thème est stocké en `localStorage` sous `bd-theme`; le changement ne modifie aucune donnée métier.
