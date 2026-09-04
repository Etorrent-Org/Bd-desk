# MVP BD Desk — Free et édition licenciée

## Périmètre validé

Le MVP couvre deux éditions du même produit. Les données, l'interface, les quatre thèmes et les parcours de collection restent communs ; l'édition détermine les droits côté serveur.

| Capacité | Free | Licenciée avec licence Premium valide |
|---|---:|---:|
| Collection sans limite fonctionnelle | ✅ | ✅ |
| Ajout manuel et scan ISBN/EAN | ✅ | ✅ |
| Recherche collection et recherche ISBN multi-source | ✅ | ✅ |
| Séries, albums, auteurs, éditeurs | ✅ | ✅ |
| Wishlist, lecture, prêts, historique | ✅ | ✅ |
| Export JSON | ✅ | ✅ |
| Statistiques essentielles | ✅ | ✅ |
| Import **BDGest** CSV | — | ✅ `bulk_import` |
| Enrichissement automatique et provenance | — | ✅ `metadata_auto` |
| Statistiques avancées et anomalies | — | ✅ `advanced_stats` |
| API, webhooks HMAC, MCP | — | ✅ selon les features du jeton |
| Gold | — | Hors périmètre |

Les protections sont appliquées dans `src/app.js`. Masquer un bouton dans la PWA ne constitue jamais le contrôle d'accès.

## Choisir l'édition

Le paramètre `BD_DESK_EDITION` accepte uniquement `free` ou `licensed`. En l'absence de paramètre, l'installation locale démarre en Free.

### Free

```bash
BD_DESK_EDITION=free NODE_ENV=production npm start
```

Aucun secret de licence n'est nécessaire. Les routes Premium renvoient `402` et l'écran Paramètres explique que l'activation doit se faire sur une instance licenciée.

### Licenciée

```bash
BD_DESK_EDITION=licensed \
BD_DESK_LICENSE_SECRET='secret-aléatoire-de-32-caractères-minimum' \
WEBHOOK_SIGNING_SECRET='autre-secret-aléatoire-de-32-caractères-minimum' \
NODE_ENV=production npm start
```

Une licence `BDP1.…` générée avec le même `BD_DESK_LICENSE_SECRET` est activée depuis Paramètres. Une instance licenciée sans jeton valide reste fonctionnellement Free jusqu'à l'activation.

## Import BDGest

L'import est un **import dans BD Desk**, pas un export BDGest. Il est réservé à l'édition licenciée :

```bash
npm run validate:bdgest -- /chemin/vers/CollectionEnLigne.csv
```

Le contrôle de référence a confirmé 479/479 lignes importées, 13 891/13 891 champs concordants et un ré-import idempotent. Le fichier utilisateur reste hors dépôt et hors preview.

## Déploiement AlwaysData

Le workflow lit la variable Actions `BD_DESK_EDITION` (`licensed` par défaut pour la preview actuelle). Pour une preview Free, définir cette variable à `free`. Pour une preview licenciée, conserver `licensed` et définir également le secret Actions `BD_DESK_LICENSE_SECRET`.

Le workflow transmet seulement le mode dans un fichier privé AlwaysData et ne synchronise ni `.env`, ni `data/`, ni export personnel. La base de preview reste alimentée par la fixture synthétique du dépôt.

## Non inclus dans le MVP

- Gold, automatisations ou fonctionnalités non décrites dans la matrice ci-dessus ;
- authentification multi-utilisateur et isolation SaaS ;
- protection anti-contournement forte d'une licence dans un dépôt public.
