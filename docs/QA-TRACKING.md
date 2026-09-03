# Suivi QA — BD Desk

Ce fichier est le **journal QA vivant** du projet. Il est mis à jour au fil des tests, corrections et validations.

Règle de suivi :
- chaque test significatif est ajouté ou actualisé ici ;
- la colonne **Validation** indique le résultat réel et la preuve disponible ;
- la colonne **PR** référence la Pull Request quand il y en a une ; pour les changements historiques poussés directement sur `main`, le commit ou le run de référence reste indiqué.

Légende : **✅ validé** · **⚠️ partiel / non bloquant** · **⏳ à valider** · **❌ échec**.

## Tableau de suivi

| Test | Validation | PR |
|---|---|---|
| Suite automatisée — Node.js 22 | ✅ **Refonte catalogue validée** : syntaxe frontend, `npm test` et couverture réussis — CI #146, 2026-09-03. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) — CI #146 ✅ |
| Suite automatisée — Node.js 24 | ✅ **Refonte catalogue validée** : syntaxe frontend, `npm test` et couverture réussis — CI #146, 2026-09-03. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) — CI #146 ✅ |
| Couverture du code serveur | ✅ Seuils CI 95 % lignes / 90 % fonctions / 70 % branches respectés dans la CI #146 ; baseline mesurée : **99,23 % lignes**, **96,02 % fonctions**, **75,49 % branches**. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) — CI #146 ✅ |
| Smoke test frontend / fichiers PWA | ✅ `index.html`, application, `adaptive-ui.css/js` et nouveau `catalog-ui.css` présents et non vides — CI #146. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) — CI #146 ✅ |
| Interface adaptative universelle — contrat automatique | ✅ Détection `phone / tablet / desktop` et portrait/paysage par viewport + capacités tactiles, **sans `user-agent`** ; navigation basse, recherche mobile, actions regroupées et cache PWA validés. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) — CI #146 ✅ |
| Catalogue visuel 2026 — densité universelle | ⚠️ **VALIDATION AUTOMATIQUE OK** : `catalog-ui.css`, smartphone portrait 2 colonnes compactes / objectif 2 × 2, paysage 4, tablette 4/5, desktop 6–8 selon largeur, toolbar sticky et KPI compacts. CI Node 22/24 + smoke tests verts. **Reste la validation matérielle iPhone/iPad avant fusion.** | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) — `feat/catalog-ui-refresh`, CI #146 ✅ |
| Fiche album — conservation des données personnelles | ✅ Test automatisé : enrichissement éditorial sans écrasement du prix d'achat / commentaire | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| Fiche album — création riche | ✅ Test automatisé : couverture, éditeur, collection, auteur, résumé et format persistés | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| CRUD albums / filtres / export | ✅ Tests automatisés réussis | PR #1 — CI #146 ✅ |
| Premium — licence, import, stats, enrichissement, API, webhooks, MCP | ✅ Protections serveur et activation validées par tests automatisés | PR #1 — CI #146 ✅ |
| MCP 2026-07-28 | ✅ Discovery, outils, exécution, erreurs JSON-RPC, headers et origin validés | PR #1 — CI #146 ✅ |
| Métadonnées — parsers Google Books / Open Library / BnF | ✅ Tests unitaires des parsers et de la fusion multi-source réussis | PR #1 — CI #146 ✅ |
| Résilience métadonnées externes | ✅ Pannes fournisseur et réponses HTTP en erreur isolées sans casser l'agrégation | PR #1 — CI #146 ✅ |
| Import BDGest de référence | ✅ **479/479 albums**, **13 891/13 891 contrôles**, **100 % fidélité** — rapport de validation v1.0 | Direct `main` — baseline v1.0 |
| Déploiement alwaysdata — interface adaptative smartphone | ✅ Deploy **#86** : synchro SSH, vérification source, `/api/health` et contrôle live des métadonnées réussis pour l'état actuel de `main`. La branche catalogue n'est volontairement pas encore fusionnée/déployée sur `main`. | Direct `main` — Deploy #86 ✅ |
| Redémarrage automatique alwaysdata via API | ⚠️ Non bloquant : redémarrage API ignoré quand non configuré ; Deploy #86 poursuit et valide health check + contrôle live. | Direct `main` — Deploy #86 |

## Campagne active — QA iOS sur iPad et iPhone

La campagne matérielle est exécutée **strictement dans l'ordre ci-dessous, un test à la fois**. Un test doit être validé ou corrigé puis retesté avant de passer au suivant.

| Test | Validation | PR |
|---|---|---|
| QA-IOS-001 — iPad / navigateur réel / chargement initial : page d'accueil complète, sans écran blanc, erreur ni débordement horizontal | ✅ **VALIDÉ sur iPad avec Brave en paysage** après correction. Trois captures réelles ont permis de détecter puis confirmer la disparition du chevauchement dans `Reprendre ma lecture`. | Direct `main` — Deploy #82 ✅ |
| QA-IOS-002 — iPhone / navigateur réel / chargement initial en portrait : interface réellement adaptée au smartphone, sans zoom ni compression desktop | ⚠️ **Refonte catalogue prête pour retest.** Le premier correctif 2 colonnes fonctionnait mais les couvertures restaient trop grandes. PR #1 vise désormais **4 albums visibles (2 × 2) dans un écran PWA courant**, tout en conservant header mobile, recherche à la demande, `•••` et navigation basse. ✅ CI #146 verte. ⏳ Retest matériel requis après mise à disposition de la branche. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) — CI #146 ✅ |
| QA-IOS-003 — iPad / navigation principale en portrait : navigation, sidebar/menu, FAB et zones tactiles | ⏳ Bloqué jusqu'à validation de QA-IOS-002 | À venir |
| QA-IOS-004 — iPhone / navigation principale en portrait : navigation basse, menu, FAB et zones tactiles | ⏳ À valider | À venir |
| QA-IOS-005 — iPad / paysage : adaptation du layout, absence de chevauchement et conservation des actions | ⏳ À valider | À venir |
| QA-IOS-006 — iPhone / paysage : adaptation du layout et absence de contenu inaccessible | ⏳ Capture complémentaire déjà favorable ; validation formelle à son tour | À venir |
| QA-IOS-007 — iPad / installation PWA depuis Safari puis lancement depuis l'écran d'accueil | ⏳ À valider | À venir |
| QA-IOS-008 — iPhone / installation PWA depuis Safari puis lancement depuis l'écran d'accueil | ⏳ À valider | À venir |
| QA-IOS-009 — iPad / thèmes Neutre, BD, Comics, Manga : cohérence et lisibilité | ⏳ À valider | À venir |
| QA-IOS-010 — iPhone / thèmes Neutre, BD, Comics, Manga : cohérence et lisibilité | ⏳ À valider | À venir |
| QA-IOS-011 — iPad / fiche album riche : ouverture, scroll, couverture, sections, fermeture | ⏳ À valider | À venir |
| QA-IOS-012 — iPhone / fiche album riche : ouverture, scroll, couverture, sections, fermeture | ⏳ À valider | À venir |
| QA-IOS-013 — iPad / recherche et ajout manuel d'un album | ⏳ À valider | À venir |
| QA-IOS-014 — iPhone / recherche et ajout manuel d'un album | ⏳ À valider | À venir |
| QA-IOS-015 — iPad / scanner ISBN-EAN réel en HTTPS : permission caméra, lecture et fallback manuel | ⏳ À valider sur matériel réel | À venir |
| QA-IOS-016 — iPhone / scanner ISBN-EAN réel en HTTPS : permission caméra, lecture et fallback manuel | ⏳ À valider sur matériel réel | À venir |
| QA-IOS-017 — iPad / interactions collection : wishlist, lu/non lu, prêt/retour | ⏳ À valider | À venir |
| QA-IOS-018 — iPhone / interactions collection : wishlist, lu/non lu, prêt/retour | ⏳ À valider | À venir |
| QA-IOS-019 — iPad / reprise PWA : fermeture, relance, cache et état d'affichage | ⏳ À valider | À venir |
| QA-IOS-020 — iPhone / reprise PWA : fermeture, relance, cache et état d'affichage | ⏳ À valider | À venir |

## Règle pour la suite

À chaque nouvelle passe QA, ce tableau doit être mis à jour **avant de considérer la fonctionnalité validée**. Les refontes UI significatives passent désormais par une branche dédiée et une PR avant fusion dans `main`.

Pour la campagne iOS, aucune ligne `QA-IOS-xxx` suivante n'est lancée tant que la précédente n'est pas soit **✅ validée**, soit **❌ corrigée puis retestée et validée**.

Le rapport [`QA-REPORT.md`](QA-REPORT.md) reste le snapshot détaillé de la validation v1.0.0 ; ce fichier-ci est la source de suivi courante.