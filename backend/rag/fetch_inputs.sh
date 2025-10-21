#!/usr/bin/env bash
# fetch_inputs.sh
# - Download or copy inputs (faculty rules PDFs) into backend/rag/inputs/faculty_rules_pdfs
# - This script intentionally does NOT include credentials. Run locally to populate inputs.

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INPUT_DIR="$ROOT_DIR/backend/rag/inputs/faculty_rules_pdfs"
mkdir -p "$INPUT_DIR"

# Option A: If you have a local copy, copy from a directory
# LOCAL_SOURCE="$HOME/Desktop/wasedaai-rag/inputs/faculty_rules_pdfs"
# if [ -d "$LOCAL_SOURCE" ]; then
#   cp -rv "$LOCAL_SOURCE/"* "$INPUT_DIR/"
#   exit 0
# fi

# Option B: Download from known URLs (uncomment and edit as needed)
# Example:
# curl -o "$INPUT_DIR/AY2025_Course-Registration-Guide_SP1.pdf" "https://example.com/path/to/AY2025_Course-Registration-Guide_SP1.pdf"

echo "No automatic downloads configured.\nPlease either:\n  - copy PDFs into $INPUT_DIR manually, or\n  - edit this script to add curl/wget commands to download them."

exit 0
