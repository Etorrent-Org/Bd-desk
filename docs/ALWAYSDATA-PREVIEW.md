# Preview UI sur alwaysdata

Objectif : fournir une URL permanente consultable sur iPad pendant le développement, sans dépendre du PC local.

URL cible : `https://tatoune.alwaysdata.net/`

## Principe

BD Desk publie le contenu de `public/` comme preview UI statique. Cette preview sert à valider l'UX, le responsive et les quatre thèmes. Elle ne remplace pas l'API de production.

## Déploiement Git

Sur alwaysdata, configurer un site de type **Fichiers statiques** dont la racine pointe vers un clone du dépôt, sous-dossier `public/`.

Exemple de chemin :

```text
/home/tatoune/www/bd-desk/public
```

Le dépôt à cloner est :

```text
https://github.com/Etorrent-Org/Bd-desk.git
```

Après chaque mise à jour :

```bash
cd ~/www/bd-desk
git pull --ff-only origin main
```

Pour automatiser totalement la mise à jour, créer dans alwaysdata un webhook GitHub qui exécute `scripts/deploy-preview.sh`.

## Ce qui est vérifié sur la preview

- Neutre / BD / Comics / Manga ;
- navigation desktop et mobile ;
- dashboard, collection, séries, albums, statistiques ;
- panneaux et modales ;
- responsive iPad ;
- PWA et ajout à l'écran d'accueil.
