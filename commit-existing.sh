#!/usr/bin/env bash
# commit-existing.sh
# Splits the current uncommitted work into 5 logical commits.
# Run from repo root: `bash commit-existing.sh`
#
# Order: tooling -> services -> constants/utils -> stores -> UI.
# Each commit is self-consistent given what came before.

set -euo pipefail

cd "$(dirname "$0")"

if ! git diff --quiet --cached; then
  echo "ERROR: there are already staged changes. Unstage them first (git reset) and re-run." >&2
  exit 1
fi

echo "==> Commit A: tooling — config, deps, entry point, assets"
git add \
  .prettierrc \
  eslint.config.mjs \
  app.json \
  package.json \
  package-lock.json \
  index.ts \
  assets/adaptive-icon.png \
  assets/favicon.png \
  assets/icon.png
git commit -m "chore: tooling — Prettier, ESLint, app config, deps, Expo Router entry point

- Switch entry point from App.tsx to index.ts (expo-router/entry)
- Update Prettier and ESLint configs
- Lock dependency versions in package-lock.json
- Refresh app icons and assets"

echo "==> Commit B: services — Firebase init + users/activities CRUD with tests"
git add \
  services/firebase.ts \
  services/users.service.ts \
  services/activities.service.ts \
  __tests__/services/firebase.test.ts \
  __tests__/services/users.service.test.ts \
  __tests__/services/activities.service.test.ts
git commit -m "feat(services): Firebase init with graceful fallback + users/activities CRUD

- services/firebase.ts: export null + isConfigured flag when env vars are missing,
  so the app does not crash in dev without .env.local
- services/users.service.ts: full CRUD on the users collection + getUsersBySport
- services/activities.service.ts: full CRUD on activities; chatUnlocked is never
  written from the client (security rule — only Cloud Functions may set it)
- Tests cover the happy paths and missing-config branches"

echo "==> Commit C: constants + utils — sports, theme, geo, format helpers"
git add \
  constants/sports.ts \
  constants/theme.ts \
  utils/geo.utils.ts \
  utils/format.utils.ts \
  __tests__/utils/geo.utils.test.ts \
  __tests__/utils/format.utils.test.ts
git commit -m "feat(constants+utils): sports/level catalogs, theme tokens, geo and format helpers

- constants/sports.ts: 5 disciplines, 3 levels, MAX_BIO_LENGTH, DEFAULT_RADIUS_KM
- constants/theme.ts: colors, font sizes, spacing, radius, shadow, layout tokens
- utils/geo.utils.ts: haversine distance, formatDistance
- utils/format.utils.ts: pace, time, last-active formatting
- Full unit tests for both util modules"

echo "==> Commit D: stores — auth and discovery (Zustand)"
git add \
  stores/auth.store.ts \
  stores/discovery.store.ts \
  __tests__/stores/auth.store.test.ts
git commit -m "feat(stores): auth and discovery Zustand stores

- stores/auth.store.ts: firebaseUser + profile state, initialize/signIn/signOut
  actions; gracefully no-ops when Firebase is not configured
- stores/discovery.store.ts: filters, fetchUsers(lat, lon), in-memory mock
  dataset for development without Firebase
- Tests cover the auth lifecycle and graceful-degradation paths"

echo "==> Commit E: UI — UserCard component + auth and tab screens"
git add \
  components/ui/UserCard.tsx \
  __tests__/components/ui/UserCard.test.tsx \
  app/_layout.tsx \
  app/index.tsx \
  'app/(auth)/_layout.tsx' \
  'app/(auth)/login.tsx' \
  'app/(auth)/onboarding.tsx' \
  'app/(tabs)/_layout.tsx' \
  'app/(tabs)/discover.tsx' \
  'app/(tabs)/activities.tsx' \
  'app/(tabs)/profile.tsx'
git commit -m "feat(ui): UserCard + auth and tabs screens (Expo Router)

- components/ui/UserCard.tsx: card with initial-based avatar (no profile photos
  by design), distance, sport, level, last-active
- app/_layout.tsx + app/index.tsx: root layout and auth gating
- app/(auth)/login.tsx: Google/Apple sign-in UI (handlers TODO — providers wired
  in a follow-up)
- app/(auth)/onboarding.tsx: 3-step profile form (name, sport+level, bio+stats)
- app/(tabs)/discover.tsx: discovery feed wired to discovery.store
- app/(tabs)/profile.tsx: shows profile + sign-out
- app/(tabs)/activities.tsx: placeholder until activity flow lands"

echo
echo "Done. 5 commits added on top of HEAD."
git log --oneline -8
echo
echo "Next: run 'bash commit-feature.sh' to land the useDiscovery + geo.service feature."
