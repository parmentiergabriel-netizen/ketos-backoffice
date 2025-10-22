# Script de déploiement des règles Firestore

## Pré-requis
- Java JDK 21+ (macOS Intel: Oracle JDK .dmg)
- Firebase CLI (`curl -sL https://firebase.tools | bash`)
- Fichier `firestore.rules` dans le dossier courant

## Utilisation rapide
```bash
chmod +x deploy_firestore.sh
./deploy_firestore.sh -p ketos-staging
```

## Avec test local via émulateur
```bash
./deploy_firestore.sh -p ketos-staging -e
# ou
WITH_EMULATOR=true PROJECT_ID=ketos-staging ./deploy_firestore.sh
```

Le script:
- vérifie Java et Firebase CLI
- se connecte à Firebase si nécessaire
- sélectionne le projet
- déploie `firestore.rules`
- (optionnel) lance l'émulateur Firestore et réalise deux tests HTTP
