# Audit — ketos-backoffice (14/11/2026)

Périmètre : tout le dépôt (Next.js 14 pages router + Firebase Auth/Firestore, règles Firestore, Docker, Vercel, script de déploiement).
Vérifications faites : `tsc`, `next lint`, `next build` (avec et sans variables d'env), `npm audit`, tests des règles dans l'émulateur Firestore (`@firebase/rules-unit-testing`).

## Corrigé dans ce commit

| # | Gravité | Problème | Correction |
|---|---|---|---|
| 1 | 🔴 Bloquant | `/demo` cassé : `collection(db, "private/demo")` vise un chemin de **document** (2 segments) → `invalid-argument` à chaque appel. | Collection `private/demo/items`. |
| 2 | 🔴 Bloquant | La règle `match /private/{collection}/{doc}` porte sur 3 segments, donc ne correspond à **aucun document** : toute lecture/écriture privée était refusée (vérifié dans l'émulateur). | `match /private/{space}/items/{itemId}`. |
| 3 | 🟠 Sécurité | `users/{userId}` : création autorisée si `data.uid == auth.uid` sans vérifier `userId` → un utilisateur pouvait créer `users/<uid d'un autre>` (vérifié : ALLOW). | `create` exige `auth.uid == userId`. |
| 4 | 🟠 Sécurité | Le propriétaire pouvait réécrire `ownerId` d'un document (transfert/injection chez un autre utilisateur). | `update` exige `ownerId` inchangé. |
| 5 | 🔴 Build | `next build` plante (`auth/invalid-api-key`) dès que les variables `NEXT_PUBLIC_FIREBASE_*` sont absentes : `getAuth()` exécuté au chargement du module pendant le prerender. | Initialisation Firebase paresseuse (`getDb()` / `getFirebaseAuth()`), appelée seulement côté navigateur, avec message d'erreur explicite. |
| 6 | 🔴 Docker | Les `NEXT_PUBLIC_*` sont figées **au build**, mais `docker-compose` ne les fournissait qu'au runtime (`env_file`) → bundle client sans config (et build en échec, cf. #5). | `ARG` dans le Dockerfile + `build.args` dans compose (`docker compose --env-file .env.local up --build`). |
| 7 | 🟡 Docker | `.env.local` copié dans l'image (`COPY . .`), pas de lockfile (`npm install` non reproductible), devDependencies et sources dans l'image finale, exécution en root, base `node:20` en fin de vie (avril 2026), `.dockerignore` excluant `pnpm-lock.yaml` que le Dockerfile tentait de copier. | `package-lock.json` commité + `npm ci`, `.env*` ignorés, `npm prune --omit=dev`, image runner minimale, `USER node`, `node:22-alpine`. |
| 8 | 🟡 Bug | `waitUser()` créait un listener `onAuthStateChanged` jamais désabonné ; après « Login Google » l'UID et la liste ne se mettaient pas à jour ; erreurs de login non affichées. | Abonnement unique avec désabonnement au démontage ; UI rafraîchie à chaque changement d'utilisateur. |
| 9 | 🟡 Script | `deploy_firestore.sh` : les docs annoncent `-p` / `-e`, mais le script ignorait ses arguments ; PID de l'émulateur via `jobs -p` fragile, émulateur pas toujours arrêté. | `getopts -p/-e/-h`, `$!` + `trap` à la sortie. |
| 10 | 🟢 Hygiène | Logs commités (`.emulator.log`, `firestore-debug.log`), pas de `.env.example`, doublon `.env.local` dans `.gitignore`, `next lint` interactif (pas de config ESLint), README_RELEASE citant des fichiers absents (`.env.local`, `progress_vercel.png`), `version:` obsolète dans compose, double initialisation Firebase (`lib/auth.ts` + `lib/firebase.ts`). | Nettoyé ; `.env.example` et `.eslintrc.json` ajoutés ; docs mises à jour ; une seule initialisation dans `lib/firebase.ts`. |

Secrets : `.env.local` a bien été commité puis retiré, mais l'historique ne contenait que des placeholders `REPLACE…` → rien à révoquer.

Résultat après correction : `tsc` ✅, `next lint` ✅ (0 warning), `next build` ✅ même sans variables d'env, règles testées dans l'émulateur :

| Cas | Attendu | Obtenu |
|---|---|---|
| alice crée `private/demo/items/x` (ownerId=alice) | ALLOW | ALLOW |
| alice requête ses items (`where ownerId == alice`) | ALLOW | ALLOW |
| alice met à jour le titre de son item | ALLOW | ALLOW |
| alice passe `ownerId` à bob | DENY | DENY |
| bob lit les items d'alice | DENY | DENY |
| alice crée `users/alice` | ALLOW | ALLOW |
| alice crée `users/bob` | DENY | DENY |

## Reste à faire (non corrigé — changements majeurs, à décider)

1. **Dépendances vulnérables** (`npm audit --omit=dev` : 1 critique, 6 hautes, 6 modérées).
   - `next@14.2.35` (dernière 14.x) : advisories ouvertes, corrigées seulement en 15/16. La plupart visent l'App Router, `next/image`, le middleware, les Server Actions ou les rewrites, absents de ce projet, donc l'exposition réelle est faible. Prévoir quand même la migration vers Next 15+ (pages router supporté).
   - `firebase@10` → `undici`, `@grpc/grpc-js` vulnérables. Passer à `firebase@11`/`12` (API modulaire identique pour ce code).
   - `eslint@8` n'est plus maintenu → ESLint 9 avec la migration Next.
2. ✅ *Fait (étape 2)* — **Aucun test ni CI** : ajouter les tests de règles (`@firebase/rules-unit-testing`, cf. tableau ci-dessus) et un workflow GitHub Actions `lint + build + rules`.
3. ✅ *Fait (étape 2)* — **Validation du schéma dans les règles** : `create` n'impose ni les champs autorisés (`keys().hasOnly([...])`) ni de type/longueur pour `title` → un utilisateur peut stocker des données arbitraires (taille jusqu'à 1 Mo) dans ses propres documents.
4. ✅ *Fait (étape 2 : connexion Google + liste `admins`)* — **Auth anonyme automatique** sur `/demo` : chaque visite crée un compte anonyme. Activer App Check et le nettoyage automatique des comptes anonymes, ou retirer la connexion automatique.
5. ✅ *Remplacé par `npm test`* — **Test émulateur de `deploy_firestore.sh`** : il ne fait que deux `curl` sur des endpoints REST (dont un inexistant, cf. l'ancien log) et ne teste pas les règles. À remplacer par les tests du point 2.
6. **En-têtes de sécurité HTTP** (CSP, `X-Frame-Options`, etc.) absents de `next.config.js` / `vercel.json`.

---

# Audit n° 3 — UX et design (16/11/2026)

Périmètre : interface après la refonte « effet WOW » (commit 7b5b29a). 10 écrans capturés (clair/sombre, ordinateur/mobile) sur une copie locale avec données fictives ; `tsc`, `next lint`, `next build` ✅ ; `npm audit --omit=dev` : 1 critique, 6 hautes, 6 modérées (inchangé).

Notes : Simplicité 5/10 · Intuitivité 5/10 · Beauté 7/10 · Technique 6/10.

## Top 5
1. **Réserver le dégradé « marée » à un usage par écran** (il est sur 9 types d'éléments) ; neutres teintés et encre pleine ailleurs.
2. **Charger la police** (Inter est déclarée mais jamais chargée) via `next/font` + **contrastes** : `--text-faint` 2,9:1 en clair, 3,7:1 en sombre ; blanc sur bouton dégradé jusqu'à 2,2:1.
3. **Tableau de bord compact** : supprimer le hero de 200 px et le KPI « Documents publics · collection public » ; 3 chiffres comparables + liste récente.
4. **Liste groupée** (Aujourd'hui / Cette semaine / Plus tôt) dans une seule surface, saisie dans la liste, menu « ⋯ » visible, clic pour éditer (double-clic et survol cachent renommer/supprimer).
5. **Menu compte** sur l'avatar : sur mobile, aucun moyen visible de se déconnecter.

## Autres constats
- Intuitivité : delta KPI qui masque les baisses (`Math.max(0, …)`) ; série remise à 0 chaque matin ; graphique déformé (`preserveAspectRatio="none"`, 300 px, jours sans mois) ; mini-courbe par jour sous un total ; palette ⌘K sans `scrollIntoView` ni rôles ARIA ; pas de création au doigt sur mobile ; thème « Système » impossible à retrouver ; suppression perdue si l'onglet est fermé pendant l'annulation ; obtention de l'accès par copie d'UID + console Firebase (→ « Demander l'accès » + page Équipe).
- Simplicité : gamification (série, confettis, compteurs rejoués à chaque navigation) ; textes d'aide permanents (0/200, « Entrée pour valider », « Espace privé ») ; libellé « ESPACE » pour 2 liens ; vocabulaire technique (« Éléments », `/demo`, titre d'onglet unique) ; pastilles arc-en-ciel sans signification.
- Beauté : tout est une carte ; mode sombre trop plat (#060E18 / #0C1826) ; 11 tailles de texte et graisses 550/650/750 ; emojis dans l'interface ; écran de connexion déséquilibré (aurore coupée, grille + bordure tournante en trop).
- Technique : migration Next 15 / firebase 12 / ESLint 9 ; en-têtes de sécurité (CSP…) toujours absents ; ajouter des tests visuels Playwright.

## Plan
- ✅ **Lot 1 — fait** : police, contrastes, menu compte + thème Système, delta/série/mini-courbe, retrait KPI publics et emojis, compteur conditionnel, titres d'onglet, palette au clavier.
- **Lot 2 (~3 j)** : tableau de bord compact, liste groupée, marée limitée, échelle typo, sombre étagé, barre mobile ancrée avec « + », vocabulaire métier.
- **Lot 3 (~3 j)** : demande d'accès + page Équipe, Next 15 / firebase 12 / ESLint 9, en-têtes de sécurité, tests visuels en CI.

### Lot 1 — détail des changements
- **Polices** auto-hébergées via `@fontsource-variable/inter` et `@fontsource-variable/bricolage-grotesque` (pas d'appel réseau au build, contrairement à `next/font/google`) ; Bricolage pour h1/h2, chiffres des KPI et marque.
- **Contrastes AA** : `--text-faint` #627387 (4,9:1 / 4,5:1) en clair, #72869C (≥ 4,8:1) en sombre ; accent clair #0A66D6 (blanc dessus 5,4:1) ; bouton principal en accent plein, texte marine en sombre (6,2:1) ; `--success` #0A7A5A ; nouveau `--warning`.
- **Menu du compte** sur l'avatar (barre latérale et barre mobile) : thème Clair / Sombre / Auto, Rechercher, Nouvel élément, Se déconnecter ; fermeture par Échap / clic extérieur. Libellé « Espace » retiré.
- **Thème « Auto »** : `setThemePref("system")` retire le forçage et l'entrée `localStorage` ; suit les changements de réglage de l'appareil.
- **Tableau de bord** : delta signé (↑ vert, ↓ orange, = gris) ; série comptée jusqu'à hier si rien aujourd'hui ; mini-courbe cumulée (min → max) ; KPI « Documents publics » remplacé par « Aujourd'hui · vs hier » (plus de requête `getCountFromServer`) ; emojis retirés.
- **Éléments** : compteur affiché à partir de 160 caractères (« 30 caractères restants » / « 3 caractères de trop »), « Entrée pour valider » retiré ; toasts sans emoji.
- **Titres d'onglet** : « Tableau de bord · Ketos », « Éléments · Ketos », « Connexion · Ketos », « Accès en attente · Ketos »…
- **Palette ⌘K** : option active gardée visible (`scrollIntoView`), `combobox` / `listbox` / `option` + `aria-activedescendant`, `aria-modal`, Tab bloqué dans la palette, Début/Fin, focus rendu à la fermeture.

Vérifié : `tsc`, `next lint` (0 alerte), `next build`, `npm test` (règles) ✅ ; captures sur copie locale (menu ordinateur/mobile, clair/sombre, palette au clavier, compteur).
