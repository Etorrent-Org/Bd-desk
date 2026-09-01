# Métadonnées externes

## Sources v1

### BnF Catalogue général — SRU

Endpoint : `https://catalogue.bnf.fr/api/SRU`.

La recherche ISBN utilise une requête `bib.isbn adj "<isbn>"` et `recordSchema=dublincore`. Priorité élevée pour titre, éditeur et date lorsque présents.

### Google Books API

Endpoint : `https://www.googleapis.com/books/v1/volumes?q=isbn:<isbn>`.

Utilisé pour titre, auteurs, éditeur, description et miniature. Une clé peut être fournie pour les quotas.

### Open Library

Endpoint de recherche ISBN : `https://openlibrary.org/search.json?isbn=<isbn>` et couverture `https://covers.openlibrary.org/b/isbn/...`. La Search API est utilisée à la place de l'ancien lookup direct afin d'obtenir une réponse JSON stable et documentée.

Source complémentaire ; une indisponibilité ne bloque pas les autres sources. Les requêtes utilisent un `User-Agent` identifié par le projet, conformément aux recommandations Open Library.

## Fusion

Ordre de préférence actuel : BnF → Google Books → Open Library selon le champ. Un champ déjà renseigné dans la collection n'est pas remplacé. Chaque champ ajouté génère une ligne de provenance.

## Tests

- URLs, parsers et fusion : tests unitaires locaux.
- Tolérance à la panne de chaque fournisseur : test par doubles réseau.
- Contrôle live des trois fournisseurs : `npm run test:external -- <ISBN>` et workflow GitHub Actions hebdomadaire.
