# n8n

BD Desk s'intègre à n8n par API et webhooks.

## Lire la collection

Node **HTTP Request** :

- Method: `GET`
- URL: `https://bd-desk.example/api/v1/collection`
- Header `Authorization`: `Bearer bdk_...`

## Réagir à un événement

Créer dans n8n un **Webhook** HTTPS, puis l'enregistrer dans BD Desk avec les événements souhaités : `album.created`, `album.updated`, `album.enriched`, `collection.imported`, `loan.created`, `loan.returned`.

Vérifier `X-BD-Desk-Signature` avec le secret partagé avant d'utiliser le contenu.
