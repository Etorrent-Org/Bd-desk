# Métadonnées et couvertures externes

## Contrat de résolution

Le moteur reçoit un ISBN/EAN canonique et interroge plusieurs fournisseurs en parallèle. Chaque adaptateur renvoie un candidat normalisé avec ses identifiants, ses champs éditoriaux et, le cas échéant, les preuves associées à la couverture.

Quand l’ISBN demandé est connu, un candidat sans identifiant exact est insuffisant : un titre seul ne peut pas sélectionner une fiche ou une couverture. Un identifiant contradictoire est explicitement rejeté. Le score sert uniquement à départager des candidats dont l’identité est déjà confirmée.

Les champs éditoriaux sont résolus séparément et ne remplissent que les colonnes vides de la fiche. Le prix d’achat, l’état, les commentaires, les notes, les dates personnelles, les indicateurs de lecture, wishlist, prêt et dédicace ne sont jamais touchés par cet enrichissement.

## Fournisseurs

### Catalogue officiel Hachette / Glénat

Endpoint structuré : https://api.hachette.fr/search.

L’adaptateur envoie l’EAN dans les champs de recherche catalogue et exploite la réponse structurée du produit. Pour Sweet Revenge (9782344059814), la réponse officielle fournit :

| Champ | Valeur normalisée |
|---|---|
| Série | Valhalla Bunker |
| Tome | 1 |
| Titre | Sweet revenge |
| Auteur principal | Fabien Bedouel |
| Éditeur | Glénat |
| Collection | Comix Buro |
| Parution | 2024-08-21 |
| Pages | 64 |
| Format | 24 × 32 cm |
| EAN | 9782344059814 |

La couverture est retenue uniquement quand l’URL d’image officielle est accompagnée du même identifiant produit. La fiche publique de référence est https://www.glenat.com/glenat-bd/valhalla-bunker-tome-01-9782344059814.

### BnF Catalogue général — SRU

Endpoint : https://catalogue.bnf.fr/api/SRU.

Deux schémas sont utilisés : dublincore pour les notices simples et intermarcXchange pour les champs de série, tome, pagination et format quand ils sont présents. La recherche ISBN utilise bib.isbn adj "<isbn>".

Une couverture BnF construite à partir de l’EAN n’est éligible que si la notice contient cet EAN exact.

### Google Books API

Endpoint : https://www.googleapis.com/books/v1/volumes?q=isbn:<isbn>.

L’adaptateur conserve uniquement les identifiants ISBN présents dans la réponse. La miniature n’est éligible que lorsque Google renvoie l’identifiant demandé dans le même record. Une clé peut être fournie pour les quotas.

### Open Library

Endpoint de recherche ISBN : https://openlibrary.org/search.json?isbn=<isbn>.

Open Library reste une source complémentaire. Une couverture issue d’un record API avec ISBN exact peut être utilisée comme dernier recours. En revanche, l’URL construite mécaniquement à partir d’un ISBN, de la forme covers.openlibrary.org/b/isbn/..., n’est jamais persistée ni proposée comme preuve.

Une panne ou une réponse vide d’un fournisseur est isolée des autres. Les appels possèdent un délai limite et l’agrégation est déterministe à entrée identique.

## Provenance et persistance

La table metadata_provenance conserve le champ, la source, la confiance et la valeur retenue.

La table albums ajoute ou utilise les champs éditoriaux `page_count` et :

- cover_origin : user ou machine ;
- cover_source : fournisseur ou saisie manuelle ;
- cover_confidence : confiance numérique de la décision ;
- cover_checked_at : dernière tentative de résolution ;
- cover_decision : décision explicite, par exemple verified-source ou fallback-editorial.

Les couvertures saisies ou modifiées par le collectionneur sont marquées user et ne sont jamais remplacées par le résolveur. Les anciennes URLs Open Library mécaniques sont migrées en machine avec une confiance basse afin de permettre leur réparation.

POST /api/albums/:id/cover/resolve exécute la décision de couverture pour une fiche. Il ne remplace pas une couverture utilisateur et peut renvoyer fallback-editorial quand aucune preuve suffisante n’est disponible.

## Tests

- Parsers et URLs : tests unitaires locaux.
- Résolution : fixtures Hachette/BnF, identité exacte, conflit d’ISBN et titre seul rejeté.
- Persistance : absence de génération mécanique, migration des anciennes URLs, non-écrasement des données utilisateur.
- Résilience : doubles réseau, fournisseur indisponible et réponse HTTP en erreur.
- Contrôle live : npm run test:external -- 9782344059814. Ce contrôle dépend de services tiers et est non bloquant dans la CI ; STRICT_EXTERNAL_APIS=1 le rend strict pour une validation volontaire.
