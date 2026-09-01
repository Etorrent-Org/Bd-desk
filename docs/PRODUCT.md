# Produit — BD Desk v1.0

## Principe

BD Desk doit pouvoir remplacer un gestionnaire de collection traditionnel sans imposer un abonnement pour conserver une grosse collection. La monétisation porte sur l'automatisation, l'enrichissement et la connectivité.

## Gratuit

- Collection illimitée.
- Ajout manuel.
- Scan ISBN/EAN avec caméra lorsque le navigateur expose `BarcodeDetector`; saisie manuelle en repli.
- Recherche dans la collection et recherche externe par ISBN.
- Séries, albums, auteurs, éditeurs.
- Wishlist, lecture, prêts et historique.
- Détection des trous numériques simples dans les séries.
- Export JSON complet.
- Statistiques essentielles.
- Quatre thèmes visuels sans différence fonctionnelle.

## Premium

- Import massif BDGest CSV.
- Mise à jour/enrichissement de fiches depuis plusieurs sources.
- Provenance et niveau de confiance des champs enrichis.
- Statistiques avancées : prix d'achat, valeur renseignée, EO, éditeurs, formats, années.
- Détection de groupes ISBN dupliqués et variantes potentielles d'un même tome.
- Clés API révocables.
- Webhooks signés HMAC.
- Endpoint MCP stateless conforme à la révision 2026-07-28.
- Intégration n8n, Make, Notion et agents IA via API/webhooks/MCP.

## Règles de données

1. L'ISBN n'est pas une clé unique : plusieurs exemplaires/variantes peuvent partager le même ISBN.
2. `bdgest_id` est utilisé pour rendre un ré-import BDGest idempotent.
3. Une donnée utilisateur existante a priorité sur une donnée externe.
4. Une cote ne doit pas être inventée : seules les valeurs importées ou issues d'une source de cotation autorisée peuvent alimenter `market_value`.
5. Une EO n'est pas déduite de manière affirmative sans source suffisante. BD Desk conserve l'indication BDGest et peut signaler les variantes/anomalies.
