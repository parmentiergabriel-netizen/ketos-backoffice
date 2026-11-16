# ketos-backoffice

Backoffice Next.js + Firebase (Auth Google, Firestore). Accès réservé à l’équipe.

## Démarrer
```bash
npm ci
cp .env.example .env.local   # puis compléter avec la config Firebase
npm run dev
```

## Donner l’accès à quelqu’un
1. La personne se connecte avec Google : l’écran « Accès refusé » affiche son **UID**.
2. Dans la console Firebase → Firestore, crée le document `admins/<UID>` (par ex. champ `role: "admin"`).
3. Elle recharge la page : elle a accès.

La liste `admins` n’est modifiable que depuis la console (les règles interdisent toute écriture depuis l’app).
Pour retirer l’accès, supprime le document.

Activer le fournisseur **Google** dans Firebase → Authentication → Sign-in method, et ajouter le domaine Vercel
dans *Authorized domains*. L’auth anonyme n’est plus utilisée : elle peut être désactivée.

## Qualité
```bash
npm run lint
npm run build
npm test          # tests des règles Firestore dans l’émulateur (Java requis)
```
La CI GitHub (`.github/workflows/ci.yml`) lance tout ça à chaque push et pull request.

## Déploiement
Voir `README_DEPLOY.md`.

### Règles Firestore
Le backoffice partage le projet Firebase de l'app Ketos (`ketos-staging`, `ketos-app`).
**Les règles déployées vivent dans le dépôt `ketos`** (`firestore.rules`, section « Backoffice ») et sont
déployées par sa CI. Ne jamais lancer `firebase deploy --only firestore:rules` depuis ce dépôt : cela
écraserait les règles de l'app.

Le `firestore.rules` d'ici est une copie de cette section, utilisée par `npm test`. Pour modifier une règle :
1. la changer ici et dans `ketos/firestore.rules` (à l'identique) ;
2. mettre à jour les tests des deux côtés (`tests/firestore.rules.test.mjs` ici,
   `tests/firestore.backoffice.rules.test.ts` dans `ketos`) ;
3. ouvrir une PR sur `ketos` : sa CI déploie les règles.
