# Release de déploiement — ketos (staging)

Ce pack contient tout le nécessaire pour déployer l'app, configurer Firestore, et lancer en local.

## Fichiers clés
- `.env.example` — modèle des variables (copier en `.env.local`, jamais commité)
- `firestore.rules` — copie de la section backoffice des règles du dépôt `ketos` (tests uniquement, ne pas déployer)
- `vercel.json`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`
- `README_DEPLOY.md` — guide Vercel/Docker
- `AUDIT.md` — audit du dépôt et corrections appliquées

## Démarrage rapide
1. `cp .env.example .env.local` puis complète-le
2. Sur Vercel, ajoute les variables d'env et déploie
3. Règles Firestore : elles se déploient depuis le dépôt `ketos` (voir README.md).
