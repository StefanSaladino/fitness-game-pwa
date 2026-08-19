#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/fitness-game-domain-$RANDOM"
rm -rf "$OUT"
mkdir -p "$OUT"
cd "$ROOT"
tsc --target ES2022 --module commonjs --moduleResolution node --outDir "$OUT" \
  src/domain/config.ts src/domain/types.ts src/domain/workouts/qualification.ts \
  src/domain/scoring/baseXp.ts src/domain/scoring/exerciseXp.ts src/domain/scoring/cardioBonus.ts src/domain/scoring/dailyXp.ts \
  src/domain/progression/benchmarks.ts src/domain/progression/performance.ts src/domain/consistency/weekly.ts
printf '{"type":"commonjs"}\n' > "$OUT/package.json"
node scripts/internal-test.cjs "$OUT"
rm -rf "$OUT"
