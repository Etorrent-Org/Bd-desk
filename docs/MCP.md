# MCP BD Desk — révision 2026-07-28

BD Desk vise la révision MCP **2026-07-28**, stateless et sans handshake/session de protocole.

Endpoint Premium : `POST /mcp`.

## Authentification

```http
Authorization: Bearer bdk_...
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/list
Content-Type: application/json
```

Pour `tools/call`, ajouter `Mcp-Name` avec le nom exact de l'outil. Le serveur vérifie que les headers correspondent au corps et valide `Origin` lorsqu'il est présent.

## Outils

- `collection_summary`
- `search_albums`
- `series_progress`
- `set_read_status`

## Discovery

`server/discover` expose la version du serveur et ses capacités. `tools/list` renvoie des indications de cache.

## Exemple `tools/call`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_albums",
    "arguments": {"query": "Thorgal", "limit": 20}
  },
  "_meta": {
    "io.modelcontextprotocol/clientInfo": {"name": "my-agent", "version": "1.0"}
  }
}
```

La compatibilité 2025-06-18 n'est pas simulée dans la v1 : le serveur annonce explicitement 2026-07-28.
