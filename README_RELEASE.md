# Release de déploiement — ketos (staging)

Ce pack contient tout le nécessaire pour déployer l'app, configurer Firestore, et lancer en local.

## Fichiers clés
- `.env.local` — variables à compléter
- `firestore.rules` — règles Firestore prêtes prod
- `deploy_firestore.sh` — déploiement automatisé (option test émulateur)
- `vercel.json`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`
- `README_DEPLOY.md` — guide Vercel/Docker
- `progress_vercel.png` — état d'avancement

## Démarrage rapide
1. Complète `.env.local`
2. Sur Vercel, ajoute les variables d'env et déploie
3. Déploie les règles Firestore :
   ```bash
   chmod +x deploy_firestore.sh
   ./deploy_firestore.sh -p ketos-staging
   ```
