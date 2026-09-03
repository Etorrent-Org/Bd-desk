# Résolution d’identité et de couverture

## Décision

La clé de rapprochement est l’ISBN/EAN canonique. Un candidat fournisseur est éligible pour une fiche connue seulement si le même record contient cet identifiant exact. Un titre, une série ou une URL accessible ne suffit pas à identifier une édition.

Le résolveur produit deux sorties :

- fields : valeur éditoriale retenue par champ, fournisseur, identifiant de record et confiance ;
- cover : URL, fournisseur, confiance, décision et éléments de preuve.

Les fournisseurs ne sont pas fusionnés par une règle spéciale pour un ISBN donné. Le score de source départage les candidats éligibles ; les contradictions d’identifiant sont rejetées avant ce classement.

## Couverture

Une couverture automatique doit réunir :

1. une URL HTTPS provenant d’un hôte fournisseur reconnu ;
2. un record qui porte l’ISBN/EAN demandé ;
3. une URL d’image renvoyée par ce record ou construite par un adaptateur dont l’identifiant a été vérifié ;
4. une confiance et une décision enregistrées dans albums et metadata_provenance.

L’URL Open Library de forme isbn/... est un helper de compatibilité uniquement. Elle n’est ni enregistrée ni utilisée comme candidat autonome.

Le serveur choisit d’abord une source officielle quand elle est disponible. Pour Sweet revenge, le record Hachette/Glénat est prioritaire et apporte l’image officielle, la date complète et les dimensions. BnF reste un complément bibliographique et de couverture quand son EAN est présent.

## Protection des données

La création ou modification explicite d’une couverture par l’utilisateur marque cover_origin=user. POST /api/albums/:id/cover/resolve ne peut alors pas la remplacer.

Les anciennes lignes qui contiennent une URL Open Library mécanique sont migrées vers cover_origin=machine, cover_source=open-library et une confiance basse. Elles peuvent être réparées par une décision ultérieure avec une meilleure preuve.

L’enrichissement Premium applique la même résolution aux champs éditoriaux, mais ne remplace jamais une valeur déjà renseignée. Les données personnelles restent hors de la liste des champs résolus.

## Déterminisme et défaillances

Les appels externes sont parallèles, limités dans le temps et isolés. L’ordre de résolution est déterministe à candidats identiques. Si aucun record ne satisfait la preuve, la réponse est metadata-only ou fallback-editorial et l’interface affiche la couverture typographique issue de l’identité de l’album.

Les fixtures tests/fixtures/metadata documentent le contrat des réponses Hachette, BnF Dublin Core et BnF Intermarc. Les contrôles live complètent ces tests mais ne sont pas une dépendance de la suite locale.
