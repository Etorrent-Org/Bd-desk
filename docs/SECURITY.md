# Sécurité

## Mesures v1

- Secrets obligatoires en environnement `production`.
- Licence HMAC SHA-256 côté serveur.
- Clés API aléatoires, hashées en base et révocables.
- Webhooks signés avec `X-BD-Desk-Signature: sha256=…`.
- Taille maximale des corps HTTP : 5 Mo.
- JSON invalide rejeté en `400`.
- CSP, `nosniff`, politique de référent et permission caméra restreinte à l'origine.
- MCP authentifié et validation `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, `Origin`.
- Pas de secrets ni de collection personnelle dans le dépôt.

## Webhooks et SSRF

Les URL de webhooks sont configurées par l'administrateur Premium et peuvent viser un n8n local. Elles ne sont donc pas bloquées par une politique SSRF générique dans la v1. Sur une offre SaaS multi-tenant, ajouter une résolution DNS sûre et le blocage des réseaux privés/non autorisés.

## Limites connues

- Pas d'authentification multi-utilisateur dans la v1 : c'est une instance personnelle/mono-propriétaire.
- Pour une exposition Internet publique, placer l'application derrière un reverse proxy HTTPS et une couche d'authentification/OIDC.
- Une vraie offre SaaS devra migrer la base vers PostgreSQL et isoler les tenants.
