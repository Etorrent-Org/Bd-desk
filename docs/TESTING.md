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

La mesure locale de la passe du 04/09/2026 est de **99,58 % lignes**, **95,15 % fonctions** et **76,53 % branches** sur l’ensemble testé ; les trois seuils sont respectés. Cette mesure remplace les chiffres historiques affichés dans les anciennes notes QA.

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

## Validation de l’import BDGest

Le fichier réel fourni par l’utilisateur a été contrôlé hors dépôt le 04/09/2026 avec import, contrôle champ par champ et réimport idempotent. Le fichier privé et les résultats détaillés ne sont pas committés. La fixture publique `tests/fixtures/bdgest-sample.csv` reste également validée.

## APIs externes

Les appels réseau sont testables via :

```bash
npm run test:external -- 9782203237766
```

La CI contient un contrôle live non bloquant qui appelle le catalogue Hachette/Glénat, Google Books, Open Library et les deux schémas BnF SRU. Les tests locaux standards utilisent des fixtures et doubles réseau afin de rester déterministes. Google Books peut répondre HTTP 429 depuis une IP CI partagée sans clé ; ce cas est signalé `DEGRADED`. STRICT_EXTERNAL_APIS=1 permet une validation volontairement stricte.
