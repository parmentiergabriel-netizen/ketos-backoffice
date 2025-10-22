#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID_DEFAULT="ketos-staging"
PROJECT_ID="${PROJECT_ID:-$PROJECT_ID_DEFAULT}"
WITH_EMULATOR="${WITH_EMULATOR:-false}"

say() { printf "%s\n" "$*"; }

require_java() {
  if ! command -v java >/dev/null 2>&1; then
    say "❌ Java non trouvé";
    exit 1
  fi
  say "✅ Java détecté: $(java -version 2>&1 | head -n1)"
}

require_firebase_cli() {
  if ! command -v firebase >/dev/null 2>&1; then
    say "❌ Firebase CLI non trouvée";
    exit 1
  fi
  say "✅ Firebase CLI: $(firebase --version)"
}

ensure_logged_in() {
  if ! firebase projects:list >/dev/null 2>&1; then
    say "ℹ️ Connexion à Firebase requise..."
    firebase login
  fi
}

ensure_configs() {
  [[ -f firebase.json ]] || printf '{\n  "firestore": {\n    "rules": "firestore.rules"\n  }\n}\n' > firebase.json
  [[ -f .firebaserc ]]   || printf '{\n  "projects": {\n    "default": "%s"\n  }\n}\n' "$PROJECT_ID" > .firebaserc
}

deploy_rules() {
  [[ -f firestore.rules ]] || { say "❌ 'firestore.rules' introuvable"; exit 1; }
  say "🚀 Déploiement des règles sur '${PROJECT_ID}'..."
  firebase deploy --only firestore:rules --project "${PROJECT_ID}"
  say "✅ Règles déployées."
}

start_emulator_and_test() {
  say "🧪 Lancement de l'émulateur Firestore en arrière-plan (port 8080)..."
  firebase emulators:start --only firestore --project "${PROJECT_ID}" > .emulator.log 2>&1 &
  EMU_PID="$(jobs -p | tail -n1 || true)"
  if [[ -z "${EMU_PID:-}" ]]; then
    # Secours: tente de récupérer un PID écoutant sur 8080 (lsof requis)
    if command -v lsof >/dev/null 2>&1; then
      EMU_PID="$(lsof -ti tcp:8080 || true)"
    fi
  fi
  if [[ -z "${EMU_PID:-}" ]]; then
    say "❌ Impossible d'obtenir le PID de l'émulateur. Voir .emulator.log"
    exit 1
  fi

  for _ in {1..30}; do
    curl -s "http://localhost:8080/" >/dev/null && break
    sleep 1
  done
  if ! curl -s "http://localhost:8080/" >/dev/null; then
    say "❌ Émulateur indisponible sur 8080. Voir .emulator.log"
    kill "${EMU_PID}" || true
    exit 1
  fi

  say "✅ Émulateur actif. Tests HTTP…"
  T1=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents/public/")
  say "↪ emulator endpoint: HTTP ${T1}"
  T2=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents/public")
  say "↪ REST endpoint:     HTTP ${T2}"

  say "ℹ️ Arrêt de l'émulateur…"
  kill "${EMU_PID}" || true
  say "✅ Test terminé."
}

main() {
  require_java
  require_firebase_cli
  ensure_logged_in
  ensure_configs
  deploy_rules
  if [[ "${WITH_EMULATOR}" == "true" ]]; then
    start_emulator_and_test
  else
    say "ℹ️ Test émulateur ignoré. Ajoute -e pour l'activer."
  fi
  say "🎉 Terminé."
}

main "$@"
