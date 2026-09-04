# Validation de l’import BDGest

Le fichier réel fourni par l’utilisateur est contrôlé localement, en mémoire, avec `scripts/validate-bdgest.js`. Le fichier privé, son nom et les résultats détaillés ne sont pas publiés dans le dépôt.

La procédure vérifie :

- la lecture des lignes `ALBUM` du CSV BDGest ;
- la fidélité de chaque champ importé ;
- l’absence de rejet inattendu ;
- la réimportation idempotente par `IdAlbum` ;
- la conservation d’éditions distinctes pouvant partager un ISBN.

Commande :

```bash
npm run validate:bdgest -- /chemin/vers/fichier-import-bdgest.csv
```

La fixture publique `tests/fixtures/bdgest-sample.csv` est couverte par la suite automatisée.
