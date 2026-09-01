# Tests et validation

## Automatisation

```bash
npm test
npm run test:coverage
```

Le seuil CI impose :

- lignes ≥ 95 % ;
- fonctions ≥ 90 % ;
- branches ≥ 70 %.

La couverture observée lors de la préparation v1 est supérieure à 98 % sur les lignes du cœur serveur et supérieure à 94 % sur les fonctions.

## Périmètre des tests

- ISBN-10/13 et normalisation ;
- parseur BDGest ;
- import et idempotence ;
- CRUD albums ;
- séries et trous ;
- prêts ;
- statistiques ;
- licence et expiration ;
- protection Premium ;
- API keys ;
- webhooks et signatures ;
- métadonnées, parsers et tolérance aux pannes ;
- MCP 2026-07-28 et validation des headers/origines ;
- routes HTTP et headers de sécurité.

## Validation réelle BDGest

Le fichier utilisateur est traité hors Git. Résultat : 479 albums importés sur 479, aucun rejet, 13 891 champs comparés, 100 % identiques après normalisation prévue.

## APIs externes

Les appels réseau sont testables via :

```bash
npm run test:external -- 9782203237766
```

La CI contient un job hebdomadaire qui appelle Google Books, Open Library et BnF SRU. Les tests locaux standards utilisent des doubles réseau afin de rester déterministes. Google Books peut répondre HTTP 429 depuis une IP CI partagée sans clé ; ce cas est signalé `DEGRADED` et devient bloquant en mode strict (`STRICT_EXTERNAL_APIS=1`) ou lorsqu'une clé est configurée.
