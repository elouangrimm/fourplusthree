#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# --- Configuration ---
BASE_URL="https://hankgreen.com/fourbythree"
BACKUP_DIR="/home/elouan/Coding/fourbythree/localbackup"
REMOTE_MIRROR_DIR="${BACKUP_DIR}/remote_mirror"

# List of all files making up the game platform
FILES=(
    "index.html"
    "archive.html"
    "build.html"
    "scoring.html"
    "shared.js"
    "shared.css"
    "favicon.svg"
    "logo.png"
    "logo-dark.png"
    "fish.png"
    "fish-dark.png"
    "puzzles.json"
)

echo "=================================================="
echo " Starting Hank Green's 4 × 3 Code Synchronization "
echo "=================================================="

# Ensure the required target directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$REMOTE_MIRROR_DIR"

# Trackers for auditing summary
NEW_FILES=()
CHANGED_FILES=()
UNCHANGED_FILES=()

echo "-> Fetching live assets from ${BASE_URL}..."

for file in "${FILES[@]}"; do
    REMOTE_FILE_PATH="${REMOTE_MIRROR_DIR}/${file}"
    LOCAL_FILE_PATH="${BACKUP_DIR}/${file}"

    # Download the live production copy into the remote mirror folder
    # Uses -s (silent), -L (follow redirects), and -f (fail silently on server errors)
    curl -sLf "${BASE_URL}/${file}" -o "$REMOTE_FILE_PATH" || {
        echo "   [Warning] Failed to download: ${file} (Might not exist on server)"
        rm -f "$REMOTE_FILE_PATH"
        continue
    }

    # Case 1: The file does not exist in your local copy yet
    if [ ! -f "$LOCAL_FILE_PATH" ]; then
        cp "$REMOTE_FILE_PATH" "$LOCAL_FILE_PATH"
        NEW_FILES+=("$file")

    # Case 2: The file exists locally, check if it has changed
    else
        if cmp -s "$LOCAL_FILE_PATH" "$REMOTE_FILE_PATH"; then
            UNCHANGED_FILES+=("$file")
        else
            CHANGED_FILES+=("$file")
        fi
    fi
done

echo ""
echo "=================================================="
echo " Synchronization Summary "
echo "=================================================="

# Report completely brand new files
if [ ${#NEW_FILES[@]} -ne 0 ]; then
    echo "🆕 New files discovered and saved locally:"
    for file in "${NEW_FILES[@]}"; do
        echo "   - ${file}"
    done
    echo ""
fi

# Report files with changes and generate metrics/diff strings
if [ ${#CHANGED_FILES[@]} -ne 0 ]; then
    echo "⚠️  Modified files detected (Live Production vs Local Backup):"
    echo "--------------------------------------------------"

    for file in "${CHANGED_FILES[@]}"; do
        LOCAL_FILE_PATH="${BACKUP_DIR}/${file}"
        REMOTE_FILE_PATH="${REMOTE_MIRROR_DIR}/${file}"

        echo "📄 File: ${file}"

        # Calculate line change metrics for text files
        if [[ "$file" =~ \.(html|js|css|json|svg)$ ]]; then
            # Uses diff to isolate added vs deleted line structures
            # Exclude standard error exit code 1 from diff (which just means changes were found)
            set +e
            DIFF_STATS=$(diff --numstat "$LOCAL_FILE_PATH" "$REMOTE_FILE_PATH" 2>/dev/null)
            set -e

            if [ -not -z "$DIFF_STATS" ]; then
                ADDED=$(echo "$DIFF_STATS" | awk '{print $1}')
                DELETED=$(echo "$DIFF_STATS" | awk '{print $2}')
                echo "   📈 Metrics: +${ADDED} lines added, -${DELETED} lines deleted in production version."
            fi

            # Print copy-pasteable layout diff audit command strings
            echo "   🔍 Audit Diff Command:"
            echo "      diff -u \"${LOCAL_FILE_PATH}\" \"${REMOTE_FILE_PATH}\" | less"
        else
            echo "   🖼️ Binary asset/image changed."
        fi
        echo "--------------------------------------------------"
    done
else
    echo "✅ No code changes detected. All local files match production perfectly!"
fi

echo ""
echo "ℹ️  Total summary: ${#UNCHANGED_FILES[@]} matching, ${#CHANGED_FILES[@]} changed, ${#NEW_FILES[@]} newly fetched."
echo "=================================================="
