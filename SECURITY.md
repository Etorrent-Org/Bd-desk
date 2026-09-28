# Politique de sécurité — BD Desk

## Versions prises en charge

La branche `main` représente la version maintenue. Les correctifs de sécurité sont appliqués en priorité sur cette branche.

## Signaler une vulnérabilité

Merci de ne pas publier de vulnérabilité exploitable dans une issue publique.

Pour un signalement, utilisez un canal privé du propriétaire du dépôt ou la fonctionnalité de signalement privé de GitHub si elle est activée pour ce repository. Fournissez uniquement les éléments nécessaires à la reproduction :

- zone ou endpoint concerné ;
- impact observé ;
- prérequis ;
- étapes de reproduction minimales ;
- proposition de correctif si vous en avez une.

Évitez d’inclure des secrets, données personnelles ou exports réels de collection.

## Principes de déploiement

En production, l’édition `licensed` exige :

- un `BD_DESK_LICENSE_SECRET` d’au moins 32 caractères ;
- un `WEBHOOK_SIGNING_SECRET` d’au moins 32 caractères ;
- des secrets différents des valeurs de développement ;
- aucune base SQLite, clé API ou fichier de données sensible committé dans Git.

Les URLs de couvertures distantes sont filtrées côté serveur et leur téléchargement est limité en taille. Les clés API applicatives ne doivent jamais être enregistrées en clair côté serveur.

## Correctifs

Un correctif de sécurité doit rester ciblé, accompagné d’un test de non-régression quand c’est possible, et passer la CI avant fusion.
