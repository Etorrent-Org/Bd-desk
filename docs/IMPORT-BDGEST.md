# Import BDGest

## Format pris en charge

Export CSV `;` de la collection en ligne BDGest contenant la table `ALBUM`.

Le parseur :

- gère les champs CSV entre guillemets et les points-virgules internes ;
- ignore les en-têtes `REVUE` et `ParaBD` éventuellement concaténés en fin de fichier ;
- normalise les ISBN-10 valides en ISBN-13 ;
- conserve les ISBN dupliqués ;
- convertit les dates `JJ/MM/AAAA` en `AAAA-MM-JJ` ;
- met à jour un album existant si le même `IdAlbum` BDGest est réimporté.

## Sécurité des données

L'export personnel ne doit pas être committé. Pour initialiser une instance propriétaire :

```bash
BD_DESK_DB=./data/bd-desk.db \
BD_DESK_SEED_CSV=/chemin/collection.csv \
npm run seed
```

Pour valider un export sans le conserver :

```bash
npm run validate:bdgest -- /chemin/collection.csv
```

## Résultat du fichier de référence

Voir `VALIDATION-BDGEST.md`. Le contrôle champ par champ est exécuté en mémoire et ne publie pas les titres, prix ou commentaires de la collection.
