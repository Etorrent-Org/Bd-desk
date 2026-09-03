# Tester BD Desk sur iPad et iPhone

Ce document couvre la validation matérielle iOS de BD Desk. Le fichier conserve son nom historique `DEPLOYMENT-IPAD.md`, mais la campagne de release porte désormais sur **iPad et iPhone**.

## Preview recommandée

Utiliser la preview HTTPS :

`https://tatoune.alwaysdata.net/`

L'HTTPS est nécessaire pour tester correctement les fonctions PWA et les permissions caméra du scanner ISBN/EAN.

## Alternative privée via Tailscale Serve

1. Démarrer BD Desk sur la machine qui héberge l'application :

```bash
npm start
```

2. Sur cette même machine, exposer le port dans le tailnet :

```bash
tailscale serve --bg 3096
```

Tailscale affiche une URL HTTPS du type `https://nom-machine.…ts.net` qui peut être ouverte dans Safari sur l'iPad ou l'iPhone connecté au même tailnet.

## Installation PWA

Sur chaque appareil, dans Safari : **Partager → Sur l'écran d'accueil**, puis lancer BD Desk depuis l'icône créée.

## Campagne QA iOS

La source de vérité est [`QA-TRACKING.md`](QA-TRACKING.md). Les tests sont exécutés **un par un**, dans l'ordre `QA-IOS-001` à `QA-IOS-020`.

### iPad

- Safari portrait : chargement initial ;
- navigation principale et zones tactiles ;
- paysage ;
- installation et lancement PWA ;
- thèmes Neutre, BD, Comics et Manga ;
- fiche album riche ;
- recherche et ajout manuel ;
- scanner ISBN/EAN avec caméra réelle ;
- wishlist, lu/non lu et prêt/retour ;
- fermeture puis reprise PWA.

### iPhone

- Safari portrait : chargement initial ;
- navigation basse, menu et FAB ;
- paysage ;
- installation et lancement PWA ;
- thèmes Neutre, BD, Comics et Manga ;
- fiche album riche ;
- recherche et ajout manuel ;
- scanner ISBN/EAN avec caméra réelle ;
- wishlist, lu/non lu et prêt/retour ;
- fermeture puis reprise PWA.

## Règle de validation

Pour chaque test :

1. exécuter uniquement le test courant ;
2. fournir une capture si le contrôle est visuel ou si une anomalie apparaît ;
3. inscrire le résultat dans `QA-TRACKING.md` ;
4. en cas d'échec, corriger puis retester le même identifiant ;
5. ne passer au test suivant qu'après validation.
