# Import BDGest

## Format pris en charge

Fichier CSV `;` exporté depuis la collection en ligne BDGest, contenant la table `ALBUM` et destiné à l’import dans BD Desk.

Il s'agit bien d'un **import BDGest vers BD Desk**, et non d'une fonction d'export BDGest. Le bouton est disponible uniquement avec le feature `bulk_import` de l'édition licenciée ; le serveur renvoie `402` même si un client tente d'appeler directement la route.

## Parcours utilisateur

La fenêtre d'import utilise un seul contrôle **Choisir un fichier** visible, relié directement par un label HTML au champ fichier natif. Le navigateur ouvre son sélecteur système ; après l'événement `change`, le fichier est lu localement avec `File.text()` ou `FileReader`. Le glisser-déposer est accepté sur la même zone comme comportement complémentaire.

Dans tous les cas, le bouton **Analyser** doit être utilisé avant **Importer**. L'analyse appelle `POST /api/import/bdgest/preview`, ne modifie pas la base et retourne uniquement des compteurs de contrôle. Si cette route n'est pas disponible, l'import reste bloqué : le déploiement est incomplet et doit être corrigé avant de transmettre ou d'écrire le fichier. L'import réel appelle ensuite `POST /api/import/bdgest` avec le contenu explicitement validé.

Le parcours bloque les extensions non CSV, les fichiers de plus de 5 Mo, les CSV vides, les colonnes BDGest indispensables manquantes et les lignes `ALBUM` dont l'`IdAlbum` n'est pas numérique. Les erreurs restent affichées dans la fenêtre afin d'éviter un import aveugle.

Le parseur :

- gère les champs CSV entre guillemets et les points-virgules internes ;
- ignore les en-têtes `REVUE` et `ParaBD` éventuellement concaténés en fin de fichier ;
- normalise les ISBN-10 valides en ISBN-13 ;
- conserve les ISBN dupliqués ;
- convertit les dates `JJ/MM/AAAA` en `AAAA-MM-JJ` ;
- met à jour un album existant si le même `IdAlbum` BDGest est réimporté.
- ne génère pas de couverture à partir d'une URL Open Library construite mécaniquement.

L'aperçu expose notamment le nombre d'albums reconnus, les lignes ignorées, les ISBN renseignés, les groupes d'ISBN partagés et les erreurs de structure. Les titres, commentaires, prix et autres valeurs personnelles ne sont pas renvoyés par cet aperçu.

## Sécurité des données

Le fichier personnel d’import ne doit pas être committé. Pour initialiser une instance propriétaire :

```bash
BD_DESK_DB=./data/bd-desk.db \
  BD_DESK_SEED_CSV=/chemin/fichier-import-bdgest.csv \
npm run seed
```

Pour valider un fichier d’import sans le conserver :

```bash
npm run validate:bdgest -- /chemin/fichier-import-bdgest.csv
```

## Résultat du fichier de référence

Voir `VALIDATION-BDGEST.md`. Le contrôle champ par champ est exécuté en mémoire et ne publie pas les titres, prix ou commentaires de la collection.
