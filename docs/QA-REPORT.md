# Rapport QA — BD Desk v1.0.0

Date : 2026-09-01

> **Document figé de référence v1.0.0.** Le suivi QA courant, mis à jour au fur et à mesure des tests et corrections, est tenu dans [`QA-TRACKING.md`](QA-TRACKING.md).

## Synthèse

| Axe | Résultat |
|---|---:|
| Tests automatisés | **36 / 36 OK** |
| Couverture lignes cœur serveur | **98,69 %** |
| Couverture fonctions cœur serveur | **91,95 %** |
| Couverture branches cœur serveur | **70,61 %** |
| Import BDGest réel | **479 / 479** |
| Contrôles de champs BDGest | **13 891 / 13 891** |
| Fidélité import | **100 %** |
| Rejets import | **0** |
| Build Docker | **OK** |
| Smoke test `/api/health` | **OK** |
| Open Library live | **HTTP 200 · 1 résultat** |
| BnF SRU live | **HTTP 200 · 1 résultat** |
| Google Books live CI | **HTTP 429 · quota anonyme, appel testé** |

## QA navigateur

Un navigateur Chromium a été piloté avec le frontend réel, le serveur réel et une base temporaire alimentée depuis le fichier d’import BDGest de référence. Les couvertures ont été remplacées uniquement dans les captures QA par des visuels synthétiques afin de contrôler la grille sans publier ni dépendre des images distantes.

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

Le chemin caméra matériel (`getUserMedia` + `BarcodeDetector`) reste à contrôler sur un vrai iPad en HTTPS, car le navigateur QA n'expose pas de caméra matérielle.

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

## Métadonnées externes — validation live

Le workflow GitHub **Live QA** a été exécuté sur un runner Internet réel.

Résultat :

- **Open Library Search API** : HTTP 200, 1 enregistrement, parser OK ;
- **BnF SRU** : HTTP 200, 1 enregistrement, parser OK ;
- **Google Books** : la requête est bien émise mais le runner GitHub partagé reçoit HTTP 429 sur le quota anonyme. Le code gère ce cas en mode dégradé ; une clé `GOOGLE_BOOKS_API_KEY` permet de passer en mode strict/production.

La validation ne masque donc pas la limite Google : ce fournisseur est **testé mais pas validé en succès HTTP 200 sans clé depuis GitHub Actions**.

## Docker — validation live

Le workflow Live QA a construit l'image `bd-desk:qa`, lancé le conteneur avec les secrets de test, puis interrogé le vrai serveur :

```json
{"ok":true,"service":"bd-desk","version":"1.0.0","albums":0}
```

Build et démarrage Docker : **validés**.

## GitHub / CI

Repository actif : `Etorrent-Org/Bd-desk`, branche `main`, public.

- publication du code : OK ;
- CI Node.js 22 : OK ;
- CI Node.js 24 : OK ;
- preview smoke : OK ;
- Live QA : OK ;
- workflow alwaysdata : installé et prêt.

## Preview iPad / alwaysdata

URL cible : `https://tatoune.alwaysdata.net/`.

À la date de ce snapshot v1.0.0, l'activation de la preview était encore en cours. Son état actuel est suivi dans [`QA-TRACKING.md`](QA-TRACKING.md), afin de ne pas réécrire l'historique de cette validation.

## Licence Premium — limite à connaître

La vérification Free/Premium est réelle côté serveur et couverte par les tests. Cependant le repository étant public, un utilisateur qui contrôle une instance self-hosted peut modifier ce code. Une commercialisation robuste doit donc déplacer l'entitlement Premium critique vers un backend/service contrôlé par l'éditeur ou distribuer les modules commerciaux hors du code public.

## Conclusion QA

Le cœur applicatif, les parcours UI critiques, l'import réel, les contrôles Premium, API/webhooks/MCP, la CI et Docker dépassent l'objectif de validation de 90 % sur les critères applicatifs suivis. Deux éléments restent dépendants d'un environnement utilisateur : la caméra d'un vrai iPad et l'activation du compte alwaysdata. Google Books nécessite en pratique une clé API pour rendre son test live CI strict et stable.
