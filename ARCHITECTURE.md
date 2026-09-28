# Architecture — BD Desk

BD Desk est une application Web/PWA Node.js, locale-first, organisée autour d’un serveur HTTP léger, d’une base SQLite et d’un frontend statique progressif.

## Vue d’ensemble

```text
Navigateur / PWA
  ├─ public/index.html
  ├─ public/app.js
  ├─ public/app-ui.js
  ├─ modules UI progressifs
  └─ service worker
        │
        ▼
src/server.js
        │
        ▼
src/app.js
  ├─ API REST
  ├─ fichiers statiques
  ├─ licences / capacités
  ├─ webhooks / API keys / MCP
  └─ résolution de couvertures
        │
        ▼
SQLite
```

## Backend

- `src/server.js` charge la configuration, valide la production et démarre le serveur.
- `src/app.js` porte le serveur HTTP, les routes API et l’orchestration principale.
- `src/db*.js` contient la persistance SQLite et les requêtes métier.
- `src/metadata*.js`, `src/official-covers.js`, `src/publisher-covers.js` et `src/bdbase-covers.js` gèrent l’enrichissement bibliographique et les couvertures.
- `src/license.js` contrôle les capacités Premium.
- `src/webhooks.js` et `src/mcp.js` exposent les intégrations externes.
- `src/validation.js` centralise la normalisation des payloads entrants.

## Frontend

Le frontend reste volontairement simple : HTML, CSS et JavaScript sans framework.

- `public/app.js` orchestre la navigation, les appels API et les vues principales.
- `public/app-ui.js` contient les helpers de rendu réutilisables.
- les fichiers `adaptive-*`, `experience-v3*`, `catalog-ui.css`, `detail-*` et `dashboard-kpis*` ajoutent des comportements ou couches visuelles ciblées ;
- `public/sw.js` gère le cache PWA ;
- `public/cover-sources.js` et `public/cover-fallback.js` gèrent la récupération progressive des couvertures.

## Données et éditions

La base locale est SQLite. Les deux éditions utilisent le même socle :

- `free` : fonctionnalités locales essentielles ;
- `licensed` : fonctionnalités Premium contrôlées côté serveur.

Une fonction Premium ne doit pas être sécurisée uniquement par l’interface : le serveur doit continuer à vérifier la licence et la feature correspondante.

## Sécurité structurante

- secrets de licence et de webhook obligatoirement robustes en production pour l’édition licensed ;
- clés API stockées sous forme de hash ;
- couvertures externes servies uniquement depuis des hôtes autorisés et avec taille maximale ;
- payloads JSON limités et normalisés ;
- politique CSP et en-têtes de sécurité servis par l’application ;
- données utilisateur et couvertures saisies manuellement préservées lors des enrichissements automatiques.

## Tests et CI

La CI exécute notamment :

- validation de syntaxe JavaScript ;
- tests Node ;
- seuils de couverture ;
- smoke tests des assets frontend ;
- tests périodiques de contrat avec les APIs externes.

Les refactorings frontend doivent rester progressifs : extraire une responsabilité, conserver le comportement, puis laisser la CI prouver l’absence de régression avant de poursuivre.
