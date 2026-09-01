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
