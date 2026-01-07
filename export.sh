#!/bin/bash
# =============================================================================
# Cloudflare Worker Project Export for LLM Analysis
# =============================================================================
# Uses git to export all tracked source files while excluding node_modules.
# =============================================================================

OUTPUT_DIR="docs/llm"
OUTPUT_FILE="$OUTPUT_DIR/dump.txt"
mkdir -p "$OUTPUT_DIR"

# Clear/Create output file with a header
{
    echo "==============================================================================="
    echo "PROJECT EXPORT: $(basename "$(pwd)")"
    echo "DATE: $(date)"
    echo "==============================================================================="
    echo ""
} > "$OUTPUT_FILE"

echo "🚀 Starting export of git-tracked files..."

# Counter for summary
COUNTER=0

# Use git ls-files to get everything tracked by git
# This avoids node_modules, .git folder, and build artifacts automatically.
while read -r file; do
    # Skip the export script itself and the output file
    if [[ "$file" == "export.sh" || "$file" == "$OUTPUT_FILE" ]]; then
        continue
    fi

    # Check if file is text-based (to avoid binary images/icons)
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

# Add a footer summary
{
    echo "==============================================================================="
    echo "EXPORT COMPLETED"
    echo "Total Files Exported: $COUNTER"
    echo "Output File: $OUTPUT_FILE"
    echo "==============================================================================="
} >> "$OUTPUT_FILE"

echo ""
echo "✅ Export complete! $COUNTER files written to $OUTPUT_FILE"
