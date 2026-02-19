#!/bin/bash
# =============================================================================
# Project Export for LLM Analysis
# =============================================================================
# Exports only source code and config files relevant for LLM context.
# Excludes lock files, docs, binaries, SVGs, and other noise.
# =============================================================================

OUTPUT_DIR="docs/llm"
OUTPUT_FILE="$OUTPUT_DIR/dump.txt"
mkdir -p "$OUTPUT_DIR"

# Files/patterns to SKIP — add more as needed
SKIP_PATTERNS=(
    "export.sh"
    "$OUTPUT_FILE"
    "yarn.lock"
    "package-lock.json"
    "pnpm-lock.yaml"
    "*.svg"
    "*.png"
    "*.ico"
    "*.md"
    "docs/*"
    "scripts/*"
    ".gitignore"
    ".eslintrc.cjs"
    "eslint.config.js"
    "src/vite-env.d.ts"
    "manual-testing-notes.md"
    "setup.sh"
)

should_skip() {
    local file="$1"
    for pattern in "${SKIP_PATTERNS[@]}"; do
        # Support both exact match and glob patterns
        # shellcheck disable=SC2254
        case "$file" in
            $pattern) return 0 ;;
        esac
    done
    return 1
}

# Header
{
    echo "==============================================================================="
    echo "PROJECT: $(basename "$(pwd)")"
    echo "DATE: $(date)"
    echo "==============================================================================="
    echo ""
} > "$OUTPUT_FILE"

echo "🚀 Starting export..."

COUNTER=0

while read -r file; do
    if should_skip "$file"; then
        echo "⏩ Skipping: $file"
        continue
    fi

    # Only include text files
    if file "$file" | grep -qE 'text|JSON|XML'; then
        echo "📄 Adding: $file"
        {
            echo "-------------------------------------------------------------------------------"
            echo "FILE: $file"
            echo "-------------------------------------------------------------------------------"
            cat "$file"
            echo ""
            echo ""
        } >> "$OUTPUT_FILE"
        ((COUNTER++))
    else
        echo "⏩ Skipping binary: $file"
    fi
done < <(git ls-files)

# Footer
{
    echo "==============================================================================="
    echo "EXPORT COMPLETE — $COUNTER files"
    echo "==============================================================================="
} >> "$OUTPUT_FILE"

echo ""
echo "✅ Done! $COUNTER files → $OUTPUT_FILE"
