#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.internal-build"
rm -rf "$OUT"
mkdir -p "$OUT"

# Compile the framework-independent domain layer with the globally available TypeScript compiler.
tsc   --target ES2022   --module commonjs   --moduleResolution node   --strict   --esModuleInterop   --skipLibCheck   --outDir "$OUT"   "$ROOT/src/domain/config.ts"   "$ROOT/src/domain/types.ts"   "$ROOT/src/domain/workouts/qualification.ts"   "$ROOT/src/domain/scoring/baseXp.ts"   "$ROOT/src/domain/progression/benchmarks.ts"   "$ROOT/src/domain/progression/performance.ts"   "$ROOT/src/domain/consistency/weekly.ts"

printf '{"type":"commonjs"}
' > "$OUT/package.json"
node "$ROOT/scripts/internal-test.cjs" "$OUT"
rm -rf "$OUT"
