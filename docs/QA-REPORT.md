# Rapport QA — BD Desk v1.0.0

Date : 2026-09-01

## Synthèse

| Axe | Résultat |
|---|---:|
| Tests automatisés | 36 / 36 OK |
| Couverture lignes cœur serveur | 98,96 % |
| Couverture fonctions cœur serveur | 95,33 % |
| Couverture branches cœur serveur | 76,52 % |
| Import BDGest réel | 479 / 479 |
| Contrôles de champs BDGest | 13 891 / 13 891 |
| Fidélité import | 100 % |
| Rejets import | 0 |

## QA navigateur

Un navigateur Chromium a été piloté dans l'environnement de test avec le frontend réel, le serveur réel et une base temporaire alimentée depuis l'export BDGest de référence. Les accès réseau du navigateur sont administrativement bloqués dans l'environnement ; les requêtes vers le serveur local ont donc été relayées par le harnais QA. Les couvertures ont été remplacées uniquement dans les captures QA par des visuels synthétiques afin de contrôler la grille sans publier ni dépendre des images distantes.

Contrôles réalisés et validés :

- accueil desktop, sidebar et KPI issus des 479 albums ;
- cinq dernières acquisitions et reprise de lecture ;
- recherche globale `XIII` ;
- ouverture/fermeture du panneau album et présence de l'ISBN ;
- thèmes **Neutre**, **BD**, **Comics** et **Manga** sur desktop ;
- statistiques Free avec verrou Premium ;
- écran Découvrir ;
- écran Prêts et modal de création ;
- navigation mobile basse et FAB ;
- sidebar mobile ;
- affichage de trois KPI sur mobile ;
- collection et ajout sur mobile ;
- repli scanner ISBN vers saisie manuelle en absence d'API caméra ;
- thèmes **BD**, **Comics** et **Manga** sur mobile ;
- activation d'une licence Premium depuis l'UI ;
- apparition de la gestion des clés API ;
- statistiques Premium avancées.

Le chemin caméra matériel (`getUserMedia` + `BarcodeDetector`) devra être contrôlé sur un vrai iPad en HTTPS, car l'environnement navigateur actuel ne fournit pas un périphérique caméra réel.

## Import BDGest

Le CSV brut contient deux lignes supplémentaires qui ne sont pas des albums : des en-têtes `REVUE` et `ParaBD`. Le parseur les exclut volontairement.

Résultat métier :

- 479 albums ;
- 165 séries ;
- 466 ISBN renseignés ;
- 363 EO marquées ;
- 382 albums lus ;
- 1 groupe d'ISBN dupliqué dans l'export réel.

L'ISBN n'est donc **pas** une contrainte d'unicité : plusieurs exemplaires/variantes peuvent légitimement partager un ISBN.

## Métadonnées externes

Les adaptateurs, URLs, parsers, fusions, priorités et scénarios de panne sont couverts par les tests locaux pour :

- BnF Catalogue général / SRU ;
- Google Books ;
- Open Library.

La documentation BnF 2026 confirme que l'API SRU est publique, HTTP GET/POST, SRU 1.2, avec recherche ISBN et sortie Dublin Core/XML.

### Limitation d'environnement

Le runtime de test n'a pas de résolution DNS sortante utilisable pour exécuter les trois appels live. Un script `npm run test:external` et un job GitHub Actions hebdomadaire sont prêts. Cette partie ne sera considérée **live validée** qu'après une exécution sur un runner disposant d'Internet.

## GitHub

Repository actif : `Etorrent-Org/Bd-desk`, branche `main`, repository public.

Le transfert vers l'organisation a levé le blocage d'écriture du connecteur GitHub. La publication du code est autorisée.

## Docker

`Dockerfile`, `docker-compose.yml`, healthcheck et configuration production sont présents. Le build Docker n'a pas pu être exécuté dans l'environnement courant car aucun daemon Docker n'y est disponible.

## Conclusion QA

Le cœur applicatif, l'import réel, les contrôles d'accès Premium et les parcours UI critiques dépassent l'objectif de validation de 90 %. Les éléments non fermés ne sont pas des échecs de code identifiés : ils dépendent de services indisponibles dans l'environnement courant (écriture GitHub, réseau sortant live, caméra iPad, daemon Docker).
