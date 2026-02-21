#!/bin/bash
#
# Generate Changelog - KitchenXpert
#
# Generates changelog from git commits following conventional commits format.
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
OUTPUT_FILE="${OUTPUT_FILE:-$PROJECT_ROOT/CHANGELOG.md}"
FORMAT="${FORMAT:-markdown}"
FROM_TAG="${FROM_TAG:-}"
TO_TAG="${TO_TAG:-HEAD}"
INCLUDE_ALL="${INCLUDE_ALL:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[CHANGELOG]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[CHANGELOG]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[CHANGELOG]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[CHANGELOG]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}        KitchenXpert - Changelog Generator                   ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_git_repo() {
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        log "ERROR" "Not a git repository"
        exit 1
    fi
}

get_latest_tag() {
    cd "$PROJECT_ROOT"
    git describe --tags --abbrev=0 2>/dev/null || echo ""
}

get_all_tags() {
    cd "$PROJECT_ROOT"
    git tag --sort=-version:refname 2>/dev/null || echo ""
}

get_commits_between() {
    local from=$1
    local to=$2

    cd "$PROJECT_ROOT"

    if [ -z "$from" ]; then
        git log --pretty=format:"%H|%s|%an|%ad" --date=short "$to" 2>/dev/null
    else
        git log --pretty=format:"%H|%s|%an|%ad" --date=short "$from..$to" 2>/dev/null
    fi
}

parse_conventional_commit() {
    local message=$1

    # Parse conventional commit format: type(scope): description
    if [[ $message =~ ^([a-z]+)(\(([^)]+)\))?!?:\ (.+)$ ]]; then
        COMMIT_TYPE="${BASH_REMATCH[1]}"
        COMMIT_SCOPE="${BASH_REMATCH[3]}"
        COMMIT_DESC="${BASH_REMATCH[4]}"
        COMMIT_BREAKING=""

        if [[ $message == *"!"* ]]; then
            COMMIT_BREAKING="true"
        fi

        return 0
    fi

    COMMIT_TYPE=""
    COMMIT_SCOPE=""
    COMMIT_DESC="$message"
    COMMIT_BREAKING=""
    return 1
}

get_commit_category() {
    local type=$1

    case $type in
        feat)     echo "Features" ;;
        fix)      echo "Bug Fixes" ;;
        docs)     echo "Documentation" ;;
        style)    echo "Styles" ;;
        refactor) echo "Code Refactoring" ;;
        perf)     echo "Performance Improvements" ;;
        test)     echo "Tests" ;;
        build)    echo "Build System" ;;
        ci)       echo "Continuous Integration" ;;
        chore)    echo "Chores" ;;
        revert)   echo "Reverts" ;;
        *)        echo "Other Changes" ;;
    esac
}

generate_markdown_changelog() {
    local from=$1
    local to=$2
    local version=$3

    log "STEP" "Generating changelog from ${from:-beginning} to $to..."

    # Initialize arrays for categories
    declare -A categories
    declare -a breaking_changes

    # Get commits
    while IFS='|' read -r hash message author date; do
        [ -z "$hash" ] && continue

        if parse_conventional_commit "$message"; then
            local category=$(get_commit_category "$COMMIT_TYPE")

            # Build entry
            local entry="- "
            if [ -n "$COMMIT_SCOPE" ]; then
                entry+="**$COMMIT_SCOPE:** "
            fi
            entry+="$COMMIT_DESC"

            # Add to category
            if [ -z "${categories[$category]}" ]; then
                categories[$category]="$entry"
            else
                categories[$category]="${categories[$category]}\n$entry"
            fi

            # Track breaking changes
            if [ "$COMMIT_BREAKING" = "true" ]; then
                breaking_changes+=("$entry")
            fi
        elif [ "$INCLUDE_ALL" = "true" ]; then
            local entry="- $message"
            if [ -z "${categories[Other Changes]}" ]; then
                categories["Other Changes"]="$entry"
            else
                categories["Other Changes"]="${categories[Other Changes]}\n$entry"
            fi
        fi
    done < <(get_commits_between "$from" "$to")

    # Generate output
    local output=""

    if [ -n "$version" ]; then
        output+="## [$version] - $(date +%Y-%m-%d)\n\n"
    else
        output+="## [Unreleased]\n\n"
    fi

    # Breaking changes first
    if [ ${#breaking_changes[@]} -gt 0 ]; then
        output+="### ⚠️ BREAKING CHANGES\n\n"
        for change in "${breaking_changes[@]}"; do
            output+="$change\n"
        done
        output+="\n"
    fi

    # Categories in order
    local category_order=("Features" "Bug Fixes" "Performance Improvements" "Code Refactoring" "Documentation" "Tests" "Build System" "Continuous Integration" "Chores" "Reverts" "Other Changes")

    for category in "${category_order[@]}"; do
        if [ -n "${categories[$category]}" ]; then
            output+="### $category\n\n"
            output+="${categories[$category]}\n\n"
        fi
    done

    echo -e "$output"
}

generate_full_changelog() {
    log "STEP" "Generating full changelog..."

    local tags=$(get_all_tags)
    local output=""

    # Header
    output+="# Changelog\n\n"
    output+="All notable changes to this project will be documented in this file.\n\n"
    output+="The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\n"
    output+="and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n"

    # Unreleased section
    local latest_tag=$(get_latest_tag)
    if [ -n "$latest_tag" ]; then
        output+="## [Unreleased]\n\n"
        output+="<!-- Add unreleased changes here -->\n\n"
    fi

    # Generate sections for each tag
    local prev_tag=""
    for tag in $tags; do
        if [ -n "$prev_tag" ]; then
            output+=$(generate_markdown_changelog "$tag" "$prev_tag" "${prev_tag#v}")
        else
            output+=$(generate_markdown_changelog "$tag" "HEAD" "${tag#v}")
        fi
        prev_tag="$tag"
    done

    # Initial commits (before first tag)
    if [ -n "$prev_tag" ]; then
        local initial=$(generate_markdown_changelog "" "$prev_tag" "")
        if [ -n "$initial" ]; then
            output+="## Initial Release\n\n"
            output+="$initial"
        fi
    fi

    echo -e "$output"
}

generate_json_changelog() {
    local from=$1
    local to=$2

    log "STEP" "Generating JSON changelog..."

    echo "{"
    echo "  \"generated\": \"$(date -Iseconds)\","
    echo "  \"from\": \"$from\","
    echo "  \"to\": \"$to\","
    echo "  \"commits\": ["

    local first=true
    while IFS='|' read -r hash message author date; do
        [ -z "$hash" ] && continue

        parse_conventional_commit "$message" || true

        if [ "$first" = "true" ]; then
            first=false
        else
            echo ","
        fi

        cat << EOF
    {
      "hash": "$hash",
      "message": "$message",
      "author": "$author",
      "date": "$date",
      "type": "$COMMIT_TYPE",
      "scope": "$COMMIT_SCOPE",
      "description": "$COMMIT_DESC",
      "breaking": ${COMMIT_BREAKING:-false}
    }
EOF
    done < <(get_commits_between "$from" "$to")

    echo ""
    echo "  ]"
    echo "}"
}

append_to_changelog() {
    local content=$1

    if [ -f "$OUTPUT_FILE" ]; then
        # Check if unreleased section exists
        if grep -q "## \[Unreleased\]" "$OUTPUT_FILE"; then
            # Insert after unreleased section
            local temp_file=$(mktemp)
            awk -v new="$content" '
                /^## \[Unreleased\]/ {
                    print
                    found=1
                    next
                }
                found && /^## \[/ {
                    print new
                    found=0
                }
                {print}
            ' "$OUTPUT_FILE" > "$temp_file"
            mv "$temp_file" "$OUTPUT_FILE"
        else
            # Prepend to file (after header)
            local temp_file=$(mktemp)
            head -n 6 "$OUTPUT_FILE" > "$temp_file"
            echo -e "$content" >> "$temp_file"
            tail -n +7 "$OUTPUT_FILE" >> "$temp_file"
            mv "$temp_file" "$OUTPUT_FILE"
        fi
    else
        echo -e "$content" > "$OUTPUT_FILE"
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}         Changelog Generated                                ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Output: $OUTPUT_FILE"
    echo "  Format: $FORMAT"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --from|-f)
            FROM_TAG="$2"
            shift 2
            ;;
        --to|-t)
            TO_TAG="$2"
            shift 2
            ;;
        --output|-o)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --full)
            GENERATE_FULL="true"
            shift
            ;;
        --all|-a)
            INCLUDE_ALL="true"
            shift
            ;;
        --stdout)
            OUTPUT_STDOUT="true"
            shift
            ;;
        --help)
            echo "Usage: generate-changelog.sh [options]"
            echo ""
            echo "Options:"
            echo "  -f, --from <tag>     Start from tag (exclusive)"
            echo "  -t, --to <ref>       End at reference (default: HEAD)"
            echo "  -o, --output <file>  Output file (default: CHANGELOG.md)"
            echo "  --format <fmt>       Output format: markdown, json"
            echo "  --full               Generate full changelog from all tags"
            echo "  -a, --all            Include non-conventional commits"
            echo "  --stdout             Output to stdout instead of file"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  generate-changelog.sh                     # Since last tag"
            echo "  generate-changelog.sh --full              # Full changelog"
            echo "  generate-changelog.sh --from v1.0.0       # Since v1.0.0"
            echo "  generate-changelog.sh --format json       # JSON output"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
print_header
check_git_repo

cd "$PROJECT_ROOT"

if [ -z "$FROM_TAG" ]; then
    FROM_TAG=$(get_latest_tag)
    if [ -n "$FROM_TAG" ]; then
        log "INFO" "Using latest tag as starting point: $FROM_TAG"
    fi
fi

if [ "$GENERATE_FULL" = "true" ]; then
    changelog=$(generate_full_changelog)
elif [ "$FORMAT" = "json" ]; then
    changelog=$(generate_json_changelog "$FROM_TAG" "$TO_TAG")
else
    changelog=$(generate_markdown_changelog "$FROM_TAG" "$TO_TAG" "")
fi

if [ "$OUTPUT_STDOUT" = "true" ]; then
    echo -e "$changelog"
else
    if [ "$GENERATE_FULL" = "true" ]; then
        echo -e "$changelog" > "$OUTPUT_FILE"
    else
        append_to_changelog "$changelog"
    fi
    print_summary
fi
