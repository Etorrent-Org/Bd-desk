# Preview BD Desk sur alwaysdata

Objectif : disposer en permanence de l'UI de développement sur `https://tatoune.alwaysdata.net/`, notamment pour les contrôles depuis iPad, sans dépendre d'un PC allumé.

Cette instance est une **preview UI/QA**. Elle utilise uniquement le jeu synthétique `tests/fixtures/bdgest-sample.csv`. La collection BDGest privée n'est jamais envoyée sur alwaysdata par ce workflow.

## Architecture

```text
push sur main
   ↓
GitHub Actions
   ↓ SSH/rsync
/home/tatoune/www/bd-desk
   ↓
alwaysdata Node.js
   ↓
https://tatoune.alwaysdata.net/
```

## 1. Activer l'accès SSH alwaysdata

Dans l'administration alwaysdata :

1. **Accès distant → SSH/SFTP**.
2. Utiliser l'utilisateur `tatoune`.
3. Autoriser temporairement/explicitement la connexion par mot de passe pour cet utilisateur.

Hôte utilisé par le workflow : `ssh-tatoune.alwaysdata.net`, port `22`.

## 2. Ajouter le secret GitHub

Dans `Etorrent-Org/Bd-desk` :

1. **Settings → Secrets and variables → Actions**.
2. **New repository secret**.
3. Nom : `ALWAYSDATA_PASSWORD`.
4. Valeur : le mot de passe de l'utilisateur SSH `tatoune`.

La clé `ALWAYSDATA_API_KEY` est facultative. Si elle est configurée, le workflow redémarre le site via l'API AlwaysData. Sinon, il utilise une relance SSH ciblée du processus Node BD Desk.

La variable Actions `BD_DESK_EDITION` choisit l'édition de la preview : `licensed` par défaut, ou `free` pour vérifier le parcours sans licence. En mode `licensed`, le secret Actions `BD_DESK_LICENSE_SECRET` est nécessaire pour l'activation automatique ; en mode `free`, ce secret n'est pas requis.

Ne jamais enregistrer ce mot de passe dans un fichier du repository.

> Une migration vers une clé SSH dédiée est recommandée après la mise en route. Le mot de passe est utilisé ici pour réduire à une seule étape la configuration initiale depuis iPad.

## 3. Configurer le site alwaysdata une seule fois

Dans **Web → Sites**, modifier le site associé à `tatoune.alwaysdata.net` :

- Type : **Node.js**.
- Version Node.js : **24**.
- Commande :

```sh
sh /home/tatoune/www/bd-desk/deploy/alwaysdata-start.sh
```

- Répertoire de travail :

```text
/home/tatoune/www/bd-desk
```

- Adresse : `tatoune.alwaysdata.net`.
- Redirection HTTPS : activée.

Le port et l'adresse d'écoute sont fournis par alwaysdata via `PORT` et `IP`/`HOST`. BD Desk les prend en charge automatiquement.

## 4. Premier déploiement

Après avoir ajouté le secret GitHub, aller dans :

**Actions → Deploy preview to alwaysdata → Run workflow**.

Le workflow :

1. synchronise le repository vers `/home/tatoune/www/bd-desk` ;
2. conserve la base de preview dans `/home/tatoune/data/bd-desk-preview.db` ;
3. ne transfère ni `.env`, ni fichier privé d’import BDGest, ni base locale ;
4. écrit seulement le mode `free|licensed` dans un fichier privé AlwaysData ;
5. effectue un contrôle sur `https://tatoune.alwaysdata.net/api/health`.

Le workflow redémarre le processus Node après la synchronisation et résout les couvertures des albums de preview déjà présents. La clé API AlwaysData n'est donc pas obligatoire pour les déploiements de preview.

## Déploiements suivants

Après la configuration initiale, tout push sur `main` touchant l'UI, le serveur ou le lanceur alwaysdata déclenche automatiquement la synchronisation.

Pour une simple modification UI (`public/`), un rafraîchissement Safari suffit généralement : les fichiers statiques sont relus depuis le disque. Pour le serveur, le workflow relance le processus Node avant les contrôles live.

## Contrôle iPad

Ouvrir :

`https://tatoune.alwaysdata.net/`

Contrôler au minimum :

- Neutre / BD / Comics / Manga ;
- portrait et paysage ;
- sidebar / navigation basse ;
- dashboard et fiches ;
- collection / séries / auteurs / éditeurs ;
- statistiques Free et écran Premium ;
- recherche et formulaires ;
- pour une fiche sans couverture, vérifier que la résolution passe par l’API cover/resolve et qu’une absence de preuve laisse la couverture éditoriale ;
- pour l’ISBN 9782344059814, vérifier la fiche Sweet revenge et la source officielle Hachette quand le service externe est disponible ;
- installation PWA via **Partager → Sur l'écran d'accueil**.

## Important

Cette instance n'est pas la future production commerciale. Elle sert exclusivement à visualiser et valider le développement. La production utilisera des secrets dédiés, une configuration `NODE_ENV=production`, des sauvegardes et une base séparée.
