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
| Fiche album riche — validation visuelle après refonte v1.0.1 | ⏳ À contrôler sur navigateur/iPad réel ; backend et persistance déjà couverts par tests | Direct `main` — [`8e64483`](https://github.com/Etorrent-Org/Bd-desk/commit/8e6448398b9fd5c4c7bb28784fd53bb1d051c084) |
| Scanner ISBN — caméra réelle iPad HTTPS | ⏳ À valider sur matériel réel (`getUserMedia` + `BarcodeDetector`) | À venir |

## Règle pour la suite

À chaque nouvelle passe QA, ce tableau doit être mis à jour **avant de considérer la fonctionnalité validée**. Une correction qui répond à un test en échec doit référencer sa PR ; si aucune PR n'est utilisée, le commit `main` correspondant doit rester traçable.

Le rapport [`QA-REPORT.md`](QA-REPORT.md) reste le snapshot détaillé de la validation v1.0.0 ; ce fichier-ci est la source de suivi courante.
