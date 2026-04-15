#!/usr/bin/env bash
# Regenerates flowComputation.ts and signalProcessing.ts from the client
# sources in src/utils/. Run before `supabase functions deploy compute_signal_volume`
# so the edge function runs the exact same math the client UI does.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"

cp "$ROOT/src/utils/signalProcessing.ts" "$HERE/signalProcessing.ts"

# flowComputation imports signalProcessing via the @/ alias, which doesn't
# resolve inside a Deno edge function bundle. Rewrite to a sibling import.
sed "s|@/utils/signalProcessing|./signalProcessing.ts|g" \
    "$ROOT/src/utils/flowComputation.ts" > "$HERE/flowComputation.ts"

echo "Synced flowComputation.ts + signalProcessing.ts from src/utils/"
