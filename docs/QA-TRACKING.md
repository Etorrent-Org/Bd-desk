# Suivi QA — BD Desk

Ce fichier est le **journal QA vivant** du projet. Il est mis à jour au fil des tests, corrections et validations.

Règle de suivi :
- chaque test significatif est ajouté ou actualisé ici ;
- la colonne **Validation** indique le résultat réel et la preuve disponible ;
- la colonne **PR** référence la Pull Request quand il y en a une ; pour les changements historiques poussés directement sur `main`, le commit ou le run de référence reste indiqué.

Légende : **✅ validé** · **⚠️ partiel / non bloquant** · **⏳ à valider** · **❌ échec**.

## Tableau de suivi

## Passe complète — 2026-09-04

Cette passe est réalisée depuis une branche dédiée `fix/mvp-free-premium`, créée après synchronisation avec `origin/main` à partir du commit `9c2628f`. Le fichier privé d’import est utilisé uniquement hors dépôt et n’est pas publié.

| Gate | Validation | Preuve |
|---|---|---|
| Import BDGest réel | ✅ Contrôle local du fichier utilisateur : import, fidélité champ par champ et absence de rejet vérifiés. | `scripts/validate-bdgest.js` — fichier privé fourni localement |
| Idempotence et ISBN dupliqués | ✅ Réimport contrôlé sans doublonner les albums ; les éditions partageant un ISBN restent distinctes. | Rapport local non publié |
| Tests automatisés | ✅ 86/86 tests passés. | `npm test` |
| Couverture de code | ✅ Seuils respectés : 99,64 % lignes, 95,11 % fonctions, 78,25 % branches. | `npm run test:coverage` |
| Fournisseurs live — ISBN de référence | ⚠️ Hachette, Open Library, BnF Dublin Core et BnF Intermarc OK ; Google Books HTTP 429 sur quota anonyme, non bloquant. | `npm run test:external -- 9782344059814` |
| Sweet Revenge live | ⏳ À revalider après déploiement de cette passe ; les fixtures et le résolveur local restent verts. | Contrôle live à relancer |
| Preview AlwaysData | ✅ Health check, assets, cache PWA et couvertures Sweet Revenge/Troisième contrôlés. | `https://tatoune.alwaysdata.net/` |
| Audit fonctionnel API | ✅ Routes critiques, édition Free/licenciée, import Premium, licences, API keys, webhooks, MCP, CRUD, prêts et erreurs ajoutés ou vérifiés par tests. | 86 tests locaux |
| QA visuelle cloud | ⚠️ Accueil, collection, fiche album et affichage desktop contrôlés dans le navigateur ; le navigateur cloud ne peut pas ouvrir le serveur local et ne permet pas de remplacer une validation matérielle iOS. | Contrôle live du 04/09/2026 |
| QA iPhone/iPad matériel | ⏳ À réaliser par l’utilisateur sur appareil réel : QA-IOS-002 à QA-IOS-020. | Non simulé |
| PR et déploiement de cette passe | ⏳ À faire après mise à jour documentaire et vérification finale. | Branche `fix/mvp-free-premium` |

Les chiffres ci-dessus remplacent les anciennes notes de la passe du 03/09/2026. La section historique ci-dessous est conservée uniquement pour la traçabilité.

## Historique — passe résolveur métadonnées / couverture — 2026-09-03

État initial contrôlé avant modification : dépôt propre sur main à 75e57075a951e5c34fcf2daffa5312f71b79e1bf ; preview /api/health OK ; l’album Sweet revenge (9782344059814) portait une URL Open Library mécanique en 404 ; aucune branche de travail distante n’était encore créée.

État historique : branche fix/metadata-cover-pipeline ; commits locaux `bbc8706` et `41c5018` ; 64 tests automatisés verts ; fixtures Hachette/BnF validées ; couverture automatique refusée sans identifiant exact ; couverture utilisateur protégée ; pagination persistée ; cache serveur ISBN et PWA v29. Cette section n’est plus l’état courant.

| Test | Validation | PR |
|---|---|---|
| Résolveur générique ISBN/EAN — métadonnées et couverture | ✅ Tests locaux : cinq fournisseurs isolés, identité exacte obligatoire, provenance et décision de couverture auditées. ⏳ CI, preview et PR à confirmer. | commits locaux `bbc8706` + `41c5018` |
| Sweet Revenge — 9782344059814 | ✅ Fixtures et contrôle live : Valhalla Bunker, tome 1, Sweet revenge, Fabien Bedouel, Glénat, Comix Buro, 2024-08-21, 64 pages, 24 × 32 cm et image Hachette. | commits locaux `bbc8706` + `41c5018` |
| Couverture utilisateur et ancienne URL mécanique | ✅ Import/création sans génération Open Library ; migration machine remplaçable ; couverture user préservée par tests. | commit local `bbc8706` |
| Suite automatisée — Node.js 22 | ✅ Refonte catalogue validée sur branche puis sur `main` : syntaxe frontend, `npm test` et couverture réussis — CI #148 et CI #149. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) fusionnée — merge `3d213285` |
| Suite automatisée — Node.js 24 | ✅ Refonte catalogue validée sur branche puis sur `main` : syntaxe frontend, `npm test` et couverture réussis — CI #148 et CI #149. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) fusionnée — merge `3d213285` |
| Couverture du code serveur | ✅ Seuils CI 95 % lignes / 90 % fonctions / 70 % branches respectés ; baseline mesurée : **99,23 % lignes**, **96,02 % fonctions**, **75,49 % branches**. | PR #1 + CI #149 ✅ |
| Smoke test frontend / fichiers PWA | ✅ `index.html`, application, `adaptive-ui.css/js` et `catalog-ui.css` présents et non vides — CI #149. | PR #1 + CI #149 ✅ |
| Interface adaptative universelle — contrat automatique | ✅ Détection `phone / tablet / desktop` et portrait/paysage par viewport + capacités tactiles, **sans `user-agent`** ; navigation basse, recherche mobile, actions regroupées et cache PWA validés. | PR #1 + CI #149 ✅ |
| Catalogue visuel 2026 — densité universelle | ✅ **Fusionné et déployé** : smartphone portrait 2 colonnes compactes avec objectif 2 × 2, paysage 4, tablette 4/5, desktop 6–8 selon largeur, toolbar sticky et KPI compacts. Validation automatique complète sur `main`. ⏳ La validation visuelle matérielle iPhone/iPad reste obligatoire avant clôture de QA-IOS-002. | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) fusionnée — Deploy #87 ✅ |
| Fiche album — conservation des données personnelles | ✅ Test automatisé : enrichissement éditorial sans écrasement du prix d'achat / commentaire | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| Fiche album — création riche | ✅ Test automatisé : couverture, éditeur, collection, auteur, résumé et format persistés | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| CRUD albums / filtres / export | ✅ Tests automatisés réussis | PR #1 — CI #149 ✅ |
| Premium — licence, import, stats, enrichissement, API, webhooks, MCP | ✅ Protections serveur et activation validées par tests automatisés | PR #1 — CI #149 ✅ |
| MCP 2026-07-28 | ✅ Discovery, outils, exécution, erreurs JSON-RPC, headers et origin validés | PR #1 — CI #149 ✅ |
| Métadonnées — parsers Google Books / Open Library / BnF | ✅ Tests unitaires des parsers et de la fusion multi-source réussis | PR #1 — CI #149 ✅ |
| Résilience métadonnées externes | ✅ Pannes fournisseur et réponses HTTP en erreur isolées sans casser l'agrégation | PR #1 — CI #149 ✅ |
| Import BDGest de référence | ✅ **479/479 albums**, **13 891/13 891 contrôles**, **100 % fidélité** — rapport de validation v1.0 | Direct `main` — baseline v1.0 |
| Déploiement alwaysdata — catalogue visuel 2026 | ✅ Deploy **#87** : synchro SSH, vérification source, `/api/health` et contrôle live des métadonnées réussis après fusion de PR #1. | `main` — merge `3d213285`, Deploy #87 ✅ |
| Redémarrage automatique alwaysdata via API | ⚠️ Non bloquant : redémarrage API ignoré quand non configuré ; Deploy #87 poursuit et valide health check + contrôle live. | `main` — Deploy #87 |

## Campagne active — QA iOS sur iPad et iPhone

La campagne matérielle est exécutée **strictement dans l'ordre ci-dessous, un test à la fois**. Un test doit être validé ou corrigé puis retesté avant de passer au suivant.

| Test | Validation | PR |
|---|---|---|
| QA-IOS-001 — iPad / navigateur réel / chargement initial : page d'accueil complète, sans écran blanc, erreur ni débordement horizontal | ✅ **VALIDÉ sur iPad avec Brave en paysage** après correction. Trois captures réelles ont permis de détecter puis confirmer la disparition du chevauchement dans `Reprendre ma lecture`. | Direct `main` — Deploy #82 ✅ |
| QA-IOS-002 — iPhone / navigateur réel / chargement initial en portrait : interface réellement adaptée au smartphone, sans zoom ni compression desktop | ⚠️ **Nouvelle UI catalogue maintenant disponible sur la preview.** La grille a été rendue plus dense après le premier test réel : 2 colonnes compactes, objectif **4 albums visibles (2 × 2)**, header mobile, recherche à la demande, `•••` et navigation basse. ✅ CI #149 et Deploy #87 verts. ⏳ **Retest matériel iPhone portrait requis pour clôturer le test.** | [PR #1](https://github.com/Etorrent-Org/Bd-desk/pull/1) fusionnée — Deploy #87 ✅ |
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
