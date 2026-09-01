# Licence fonctionnelle Free / Premium

## Format

Une licence Premium est un jeton :

```text
BDP1.<payload-base64url>.<signature-HMAC-SHA256>
```

Le payload contient le plan, le client, la date d'émission, l'expiration optionnelle et les features.

## Features v1

- `bulk_import`
- `metadata_auto`
- `api`
- `webhooks`
- `mcp`
- `advanced_stats`

## Génération

```bash
BD_DESK_LICENSE_SECRET='secret-long-et-aleatoire' \
npm run license:generate -- client-123 2027-09-01T00:00:00Z
```

Le secret de signature reste exclusivement côté éditeur/serveur. Une instance de production refuse les secrets de développement connus.

## Validation

- signature HMAC vérifiée avec comparaison constante ;
- expiration contrôlée côté serveur ;
- les endpoints Premium retournent `402` ou `401` sans droit valide ;
- l'UI ne constitue pas la barrière de sécurité.

## Limite d'un repository public

La licence locale empêche un utilisateur normal d'utiliser les endpoints Premium sans entitlement valide. Elle **ne peut pas empêcher** le propriétaire d'une instance self-hosted de modifier le code source public pour supprimer la vérification.

Pour une commercialisation réelle, les fonctions qui créent la valeur Premium doivent donc dépendre d'un composant contrôlé par l'éditeur : serveur d'entitlement, services d'enrichissement, API Premium hébergée ou modules commerciaux distribués séparément. Le client peut rester largement ouvert, mais la preuve de droit ne doit pas reposer uniquement sur du code que l'abonné contrôle.
