# Suivi QA — BD Desk

Ce fichier est le **journal QA vivant** du projet. Il est mis à jour au fil des tests, corrections et validations.

Règle de suivi :
- chaque test significatif est ajouté ou actualisé ici ;
- la colonne **Validation** indique le résultat réel et la preuve disponible ;
- la colonne **PR** référence la Pull Request quand il y en a une ; tant que les changements sont poussés directement sur `main`, le commit de référence est indiqué à la place.

Légende : **✅ validé** · **⚠️ partiel / non bloquant** · **⏳ à valider** · **❌ échec**.

## Tableau de suivi

| Test | Validation | PR |
|---|---|---|
| Suite automatisée — Node.js 22 | ✅ **47/47 tests réussis**, 0 échec — CI #129, 2026-09-03 | Direct `main` — CI #129 |
| Suite automatisée — Node.js 24 | ✅ Job complet réussi : syntaxe frontend, `npm test` et couverture — CI #129, 2026-09-03 | Direct `main` — CI #129 |
| Couverture du code serveur | ✅ **99,23 % lignes**, **96,02 % fonctions**, **75,49 % branches** ; seuils CI 95 / 90 / 70 respectés — CI #129 | Direct `main` — CI #129 |
| Smoke test frontend / fichiers PWA | ✅ `index.html`, application et assets `adaptive-ui.css/js` présents et non vides — CI #129 | Direct `main` — CI #129 |
| Interface adaptative universelle — contrat automatique | ✅ Détection `phone / tablet / desktop` et portrait/paysage par viewport + capacités tactiles, **sans `user-agent`** ; smartphone portrait en 2 colonnes, navigation basse, recherche mobile, actions regroupées, cache PWA et syntaxe JS validés. | Direct `main` — [`86b16db`](https://github.com/Etorrent-Org/Bd-desk/commit/86b16db9bffdef0b1a3fb23a50f9c4a932829fc5), [`b2e264d`](https://github.com/Etorrent-Org/Bd-desk/commit/b2e264dca69c1a0137adb2ed156306468aa553d4), [`6ad64a2`](https://github.com/Etorrent-Org/Bd-desk/commit/6ad64a2f6eac49ee0265ac6bfe1d4b5ffd040ef5), [`7693717`](https://github.com/Etorrent-Org/Bd-desk/commit/7693717db0dd929ead3eeb4597808de4d008caad), [`131b7cd`](https://github.com/Etorrent-Org/Bd-desk/commit/131b7cd64052aa9cbbc7d5d53e3131ee4f616f24), CI #129 ✅ |
| Fiche album — conservation des données personnelles | ✅ Test automatisé : enrichissement éditorial sans écrasement du prix d'achat / commentaire | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| Fiche album — création riche | ✅ Test automatisé : couverture, éditeur, collection, auteur, résumé et format persistés | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| CRUD albums / filtres / export | ✅ Tests automatisés réussis | Direct `main` — CI #129 |
| Premium — licence, import, stats, enrichissement, API, webhooks, MCP | ✅ Protections serveur et activation validées par tests automatisés | Direct `main` — CI #129 |
| MCP 2026-07-28 | ✅ Discovery, outils, exécution, erreurs JSON-RPC, headers et origin validés | Direct `main` — CI #129 |
| Métadonnées — parsers Google Books / Open Library / BnF | ✅ Tests unitaires des parsers et de la fusion multi-source réussis | Direct `main` — CI #129 |
| Résilience métadonnées externes | ✅ Pannes fournisseur et réponses HTTP en erreur isolées sans casser l'agrégation | Direct `main` — CI #129 |
| Import BDGest de référence | ✅ **479/479 albums**, **13 891/13 891 contrôles**, **100 % fidélité** — rapport de validation v1.0 | Direct `main` — baseline v1.0 |
| Déploiement alwaysdata — interface adaptative smartphone | ✅ Deploy **#86** : synchro SSH, vérification source, `/api/health` et contrôle live des métadonnées réussis. | Direct `main` — [`bef614e`](https://github.com/Etorrent-Org/Bd-desk/commit/bef614ec7646edca55c820a44a3724c67693294a), Deploy #86 ✅ |
| Redémarrage automatique alwaysdata via API | ⚠️ Non bloquant : redémarrage API ignoré quand non configuré ; Deploy #86 poursuit et valide health check + contrôle live. | Direct `main` — Deploy #86 |

## Campagne active — QA iOS sur iPad et iPhone

La campagne matérielle est exécutée **strictement dans l'ordre ci-dessous, un test à la fois**. Un test doit être validé ou corrigé puis retesté avant de passer au suivant.

| Test | Validation | PR |
|---|---|---|
| QA-IOS-001 — iPad / navigateur réel / chargement initial : page d'accueil complète, sans écran blanc, erreur ni débordement horizontal | ✅ **VALIDÉ sur iPad avec Brave en paysage** après correction. Trois captures réelles ont permis de détecter puis confirmer la disparition du chevauchement dans `Reprendre ma lecture`. Accueil, sidebar, KPI, acquisitions, reprise de lecture, actions rapides et panneau Premium restent lisibles ; aucun débordement horizontal visible. Safari/PWA reste contrôlé dans les tests dédiés plus bas. | Direct `main` — correctif [`bcb8b0b`](https://github.com/Etorrent-Org/Bd-desk/commit/bcb8b0b71e5111f69b162e66b51ddeffab6b53bd), refresh [`5c2cf1c`](https://github.com/Etorrent-Org/Bd-desk/commit/5c2cf1cabdbe7de97653fa4016fcaf395720e08a), cache [`e41397f`](https://github.com/Etorrent-Org/Bd-desk/commit/e41397ff5179d2f94f832b7745fb0f3391225d46), Deploy #82 ✅ |
| QA-IOS-002 — iPhone / navigateur réel / chargement initial en portrait : interface réellement adaptée au smartphone, sans zoom ni compression desktop | ❌ **Capture portrait initiale non validée** : ancienne interface trop proche du desktop. ✅ **Correctif implémenté, tests automatisés CI #129 verts et Deploy #86 vert.** Nouvelle cible : 2 couvertures par ligne, header compact, recherche à la demande, actions secondaires dans `•••`, navigation basse et adaptation automatique au terminal. ⏳ **Retest matériel iPhone portrait requis pour clôturer le test.** | Direct `main` — [`86b16db`](https://github.com/Etorrent-Org/Bd-desk/commit/86b16db9bffdef0b1a3fb23a50f9c4a932829fc5), [`b2e264d`](https://github.com/Etorrent-Org/Bd-desk/commit/b2e264dca69c1a0137adb2ed156306468aa553d4), [`6ad64a2`](https://github.com/Etorrent-Org/Bd-desk/commit/6ad64a2f6eac49ee0265ac6bfe1d4b5ffd040ef5), cache [`bef614e`](https://github.com/Etorrent-Org/Bd-desk/commit/bef614ec7646edca55c820a44a3724c67693294a), CI #129 ✅, Deploy #86 ✅ |
| QA-IOS-003 — iPad / navigation principale en portrait : navigation, sidebar/menu, FAB et zones tactiles | ⏳ Bloqué jusqu'à validation de QA-IOS-002 | À venir |
| QA-IOS-004 — iPhone / navigation principale en portrait : navigation basse, menu, FAB et zones tactiles | ⏳ À valider | À venir |
| QA-IOS-005 — iPad / paysage : adaptation du layout, absence de chevauchement et conservation des actions | ⏳ À valider | À venir |
| QA-IOS-006 — iPhone / paysage : adaptation du layout et absence de contenu inaccessible | ⏳ Capture complémentaire déjà favorable ; validation formelle à son tour avec la nouvelle couche adaptative | À venir |
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

À chaque nouvelle passe QA, ce tableau doit être mis à jour **avant de considérer la fonctionnalité validée**. Une correction qui répond à un test en échec doit référencer sa PR ; si aucune PR n'est utilisée, le commit `main` correspondant doit rester traçable.

Pour la campagne iOS, aucune ligne `QA-IOS-xxx` suivante n'est lancée tant que la précédente n'est pas soit **✅ validée**, soit **❌ corrigée puis retestée et validée**.

Le rapport [`QA-REPORT.md`](QA-REPORT.md) reste le snapshot détaillé de la validation v1.0.0 ; ce fichier-ci est la source de suivi courante.
