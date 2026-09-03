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
| Suite automatisée — Node.js 22 | ✅ **43/43 tests réussis**, 0 échec — CI #100, 2026-09-03 | Direct `main` — [`6acc9d1`](https://github.com/Etorrent-Org/Bd-desk/commit/6acc9d14423ebfb140e146ea3318dd6c882980ae) |
| Suite automatisée — Node.js 24 | ✅ Job CI terminé avec succès — CI #100, 2026-09-03 | Direct `main` — [`6acc9d1`](https://github.com/Etorrent-Org/Bd-desk/commit/6acc9d14423ebfb140e146ea3318dd6c882980ae) |
| Couverture du code serveur | ✅ **99,23 % lignes**, **96,02 % fonctions**, **75,49 % branches** ; seuils CI respectés (95 / 90 / 70) | Direct `main` — [`6acc9d1`](https://github.com/Etorrent-Org/Bd-desk/commit/6acc9d14423ebfb140e146ea3318dd6c882980ae) |
| Smoke test frontend / fichiers PWA | ✅ `public/index.html`, `public/app.js`, `public/styles.css` présents et non vides — CI #100 | Direct `main` — [`6acc9d1`](https://github.com/Etorrent-Org/Bd-desk/commit/6acc9d14423ebfb140e146ea3318dd6c882980ae) |
| Fiche album — conservation des données personnelles | ✅ Test automatisé : enrichissement éditorial sans écrasement du prix d'achat / commentaire | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| Fiche album — création riche | ✅ Test automatisé : couverture, éditeur, collection, auteur, résumé et format persistés | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| CRUD albums / filtres / export | ✅ Tests automatisés réussis | Direct `main` — CI #100 |
| Premium — licence, import, stats, enrichissement, API, webhooks, MCP | ✅ Protections serveur et activation validées par tests automatisés | Direct `main` — CI #100 |
| MCP 2026-07-28 | ✅ Discovery, outils, exécution, erreurs JSON-RPC, headers et origin validés | Direct `main` — CI #100 |
| Métadonnées — parsers Google Books / Open Library / BnF | ✅ Tests unitaires des parsers et de la fusion multi-source réussis | Direct `main` — CI #100 |
| Résilience métadonnées externes | ✅ Pannes fournisseur et réponses HTTP en erreur isolées sans casser l'agrégation | Direct `main` — CI #100 |
| Import BDGest de référence | ✅ **479/479 albums**, **13 891/13 891 contrôles**, **100 % fidélité** — rapport de validation v1.0 | Direct `main` — baseline v1.0 |
| Déploiement alwaysdata — synchronisation SSH | ✅ Synchronisation et vérification des fichiers réussies — Deploy #79 | Direct `main` — [`6acc9d1`](https://github.com/Etorrent-Org/Bd-desk/commit/6acc9d14423ebfb140e146ea3318dd6c882980ae) |
| Preview alwaysdata — `/api/health` | ✅ Health check live réussi — Deploy #79 | Direct `main` — [`6acc9d1`](https://github.com/Etorrent-Org/Bd-desk/commit/6acc9d14423ebfb140e146ea3318dd6c882980ae) |
| Preview alwaysdata — normalisation métadonnées live | ✅ BnF live validé sur ISBN `9782344059814` : titre `Sweet revenge`, éditeur `Glénat`, collection `Comix Buro` — Deploy #79 | Direct `main` — [`6acc9d1`](https://github.com/Etorrent-Org/Bd-desk/commit/6acc9d14423ebfb140e146ea3318dd6c882980ae) |
| Redémarrage automatique alwaysdata via API | ⚠️ Non bloquant : clé API non visible par GitHub Actions ; redémarrage manuel effectué puis health check live validé | Direct `main` — [`6acc9d1`](https://github.com/Etorrent-Org/Bd-desk/commit/6acc9d14423ebfb140e146ea3318dd6c882980ae) |

## Campagne active — QA iOS sur iPad et iPhone

La campagne matérielle est exécutée **strictement dans l'ordre ci-dessous, un test à la fois**. Un test doit être validé ou corrigé puis retesté avant de passer au suivant.

| Test | Validation | PR |
|---|---|---|
| QA-IOS-001 — iPad / Safari / chargement initial en portrait : page d'accueil complète, sans écran blanc, erreur ni débordement horizontal | ⚠️ **Deuxième capture reçue sur iPad en Brave paysage** : le correctif est visuellement confirmé, plus aucun chevauchement dans `Reprendre ma lecture`, cartes et progression lisibles, pas de débordement horizontal observé. La compatibilité Brave paysage est donc ✅ en contrôle complémentaire, mais **QA-IOS-001 reste ouvert jusqu'au retest Safari portrait prévu par le plan**. | Direct `main` — correctif [`bcb8b0b`](https://github.com/Etorrent-Org/Bd-desk/commit/bcb8b0b71e5111f69b162e66b51ddeffab6b53bd), refresh [`5c2cf1c`](https://github.com/Etorrent-Org/Bd-desk/commit/5c2cf1cabdbe7de97653fa4016fcaf395720e08a), cache [`e41397f`](https://github.com/Etorrent-Org/Bd-desk/commit/e41397ff5179d2f94f832b7745fb0f3391225d46), Deploy #82 ✅ |
| QA-IOS-002 — iPhone / Safari / chargement initial en portrait : page d'accueil complète, sans écran blanc, erreur ni débordement horizontal | ⏳ À valider après QA-IOS-001 | À venir |
| QA-IOS-003 — iPad / navigation principale en portrait : navigation, sidebar/menu, FAB et zones tactiles | ⏳ À valider | À venir |
| QA-IOS-004 — iPhone / navigation principale en portrait : navigation basse, menu, FAB et zones tactiles | ⏳ À valider | À venir |
| QA-IOS-005 — iPad / paysage : adaptation du layout, absence de chevauchement et conservation des actions | ⏳ À valider | À venir |
| QA-IOS-006 — iPhone / paysage : adaptation du layout et absence de contenu inaccessible | ⏳ À valider | À venir |
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
