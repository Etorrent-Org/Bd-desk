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

La mesure locale de cette passe est de 99,42 % lignes, 95,09 % fonctions et 74,58 % branches sur l’ensemble testé ; les trois seuils sont respectés.

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

## Validation BDGest

Le fichier BDGest privé de référence n’est pas présent dans ce workspace et n’a donc pas été relu pendant cette passe. Il ne faut pas présenter l’ancien résultat 479/479 comme une revalidation de cette branche. La fixture publique tests/fixtures/bdgest-sample.csv reste validée : 4 lignes importées, 0 rejet, 116 contrôles de champs concordants, score 100.

## APIs externes

Les appels réseau sont testables via :

```bash
npm run test:external -- 9782203237766
```

La CI contient un contrôle live non bloquant qui appelle le catalogue Hachette/Glénat, Google Books, Open Library et les deux schémas BnF SRU. Les tests locaux standards utilisent des fixtures et doubles réseau afin de rester déterministes. Google Books peut répondre HTTP 429 depuis une IP CI partagée sans clé ; ce cas est signalé `DEGRADED`. STRICT_EXTERNAL_APIS=1 permet une validation volontairement stricte.
