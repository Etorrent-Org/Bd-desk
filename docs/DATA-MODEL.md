# Modèle de données

## `albums`

Table centrale. Principaux champs :

- identifiants : `id`, `bdgest_id`, `isbn` ;
- bibliographie : `series`, `number`, `number_alt`, `title`, `publisher`, `collection_name`, `writer`, `artist` ;
- édition : `first_edition`, `legal_deposit`, `print_date`, `page_count`, `format` ;
- collectionneur : `purchase_date`, `purchase_price`, `condition`, `note`, `comment`, `signed`, `read`, `wishlist`, `for_sale` ;
- médias : `cover_url`, `description` ;
- décision de couverture : `cover_origin`, `cover_source`, `cover_confidence`, `cover_checked_at`, `cover_decision` ;
- traçabilité : `source`, `created_at`, `updated_at`.

`isbn` est indexé mais **non unique**. `bdgest_id` est unique quand il est présent.

## `metadata_provenance`

Enregistre le champ enrichi, la source, la confiance et la valeur au moment de l'enrichissement.

## `history`

Audit fonctionnel : création/modification/suppression, import, prêts.

Les colonnes de couverture distinguent une valeur choisie par le collectionneur d’une valeur machine issue du résolveur. Une valeur user est protégée lors des futures tentatives d’enrichissement ; une valeur machine à faible confiance peut être réparée par une décision mieux étayée.

## `loans`

Emprunteur, date de prêt, échéance et retour.

## `api_keys`

Nom, préfixe visible, hash de la clé, date de création/dernier usage/révocation.

## `webhooks`

URL, liste d'événements et activation.

## `settings`

Paramètres serveur persistants, dont la licence active.
