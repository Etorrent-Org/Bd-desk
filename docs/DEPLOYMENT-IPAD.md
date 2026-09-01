# Tester BD Desk sur iPad

## Option recommandée : HTTPS privé via Tailscale Serve

1. Démarrer BD Desk sur la machine qui héberge l'application :

```bash
npm start
```

2. Sur cette même machine, exposer le port dans le tailnet :

```bash
tailscale serve --bg 3096
```

Tailscale affiche une URL HTTPS du type `https://nom-machine.…ts.net` qui peut être ouverte dans Safari sur l'iPad connecté au même tailnet.

3. Dans Safari : **Partager → Sur l'écran d'accueil** pour installer la PWA.

L'HTTPS est important pour autoriser la caméra du scanner ISBN/EAN.

## Réseau local sans Tailscale

Ouvrir `http://IP-DE-LA-MACHINE:3096`. Toute la gestion fonctionne, mais les APIs caméra de Safari peuvent être indisponibles sans HTTPS.

## Vérification iPad

- portrait et paysage ;
- navigation basse ;
- changement des quatre thèmes ;
- ouverture/fermeture fiche album ;
- recherche ;
- ajout manuel ;
- scan caméra sous HTTPS ;
- wishlist/lecture ;
- prêt/retour ;
- installation PWA ;
- reprise après relance.
