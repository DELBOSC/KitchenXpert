#!/bin/bash
#
# Publish Release - KitchenXpert
#
# Publishes a release to GitHub with release notes and assets.
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
TAG="${TAG:-}"
DRAFT="${DRAFT:-false}"
PRERELEASE="${PRERELEASE:-false}"
GENERATE_NOTES="${GENERATE_NOTES:-true}"
ASSETS_DIR="${ASSETS_DIR:-$PROJECT_ROOT/dist}"
DRY_RUN="${DRY_RUN:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[RELEASE]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[RELEASE]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[RELEASE]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[RELEASE]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}          KitchenXpert - Publish Release                     ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log "STEP" "Checking prerequisites..."

    # Check for gh CLI
    if ! command -v gh &> /dev/null; then
        log "ERROR" "GitHub CLI (gh) is not installed"
        log "INFO" "Install it from: https://cli.github.com/"
        exit 1
    fi

    # Check gh authentication
    if ! gh auth status &> /dev/null; then
        log "ERROR" "Not authenticated with GitHub CLI"
        log "INFO" "Run: gh auth login"
        exit 1
    fi

    # Check git repo
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        log "ERROR" "Not a git repository"
        exit 1
    fi

    log "SUCCESS" "Prerequisites check passed"
}

get_latest_tag() {
    cd "$PROJECT_ROOT"
    git describe --tags --abbrev=0 2>/dev/null || echo ""
}

get_previous_tag() {
    local current_tag=$1
    cd "$PROJECT_ROOT"
    git describe --tags --abbrev=0 "$current_tag^" 2>/dev/null || echo ""
}

get_version_from_tag() {
    local tag=$1
    echo "${tag#v}"
}

detect_prerelease() {
    local tag=$1

    if [[ $tag =~ (alpha|beta|rc|preview|dev) ]]; then
        echo "true"
    else
        echo "false"
    fi
}

generate_release_notes() {
    local tag=$1
    local prev_tag=$2

    log "STEP" "Generating release notes..."

    local notes=""

    # Add version header
    local version=$(get_version_from_tag "$tag")
    notes+="## What's Changed in v$version\n\n"

    # Get commits since last tag
    cd "$PROJECT_ROOT"

    local commits=""
    if [ -n "$prev_tag" ]; then
        commits=$(git log --pretty=format:"%s|%h|%an" "$prev_tag..$tag" 2>/dev/null)
    else
        commits=$(git log --pretty=format:"%s|%h|%an" "$tag" 2>/dev/null | head -50)
    fi

    # Categorize commits
    declare -A categories
    categories["Features"]=""
    categories["Bug Fixes"]=""
    categories["Performance"]=""
    categories["Documentation"]=""
    categories["Other"]=""

    while IFS='|' read -r message hash author; do
        [ -z "$message" ] && continue

        local entry="- $message ($hash) @$author"

        if [[ $message =~ ^feat ]]; then
            categories["Features"]+="$entry\n"
        elif [[ $message =~ ^fix ]]; then
            categories["Bug Fixes"]+="$entry\n"
        elif [[ $message =~ ^perf ]]; then
            categories["Performance"]+="$entry\n"
        elif [[ $message =~ ^docs ]]; then
            categories["Documentation"]+="$entry\n"
        else
            categories["Other"]+="$entry\n"
        fi
    done <<< "$commits"

    # Build notes
    for category in "Features" "Bug Fixes" "Performance" "Documentation" "Other"; do
        if [ -n "${categories[$category]}" ]; then
            notes+="### $category\n\n"
            notes+="${categories[$category]}\n"
        fi
    done

    # Add contributors
    local contributors=$(echo "$commits" | cut -d'|' -f3 | sort -u | tr '\n' ', ' | sed 's/,$//')
    if [ -n "$contributors" ]; then
        notes+="\n### Contributors\n\n"
        notes+="Thanks to: $contributors\n\n"
    fi

    # Add footer
    notes+="---\n"
    notes+="**Full Changelog**: https://github.com/kitchenxpert/kitchenxpert/compare/${prev_tag}...${tag}\n"

    echo -e "$notes"
}

build_release_assets() {
    log "STEP" "Building release assets..."

    cd "$PROJECT_ROOT"

    # Create dist directory
    mkdir -p "$ASSETS_DIR"

    # Build the project
    if [ -f "package.json" ]; then
        log "INFO" "Running build..."
        pnpm build 2>/dev/null || npm run build 2>/dev/null || true
    fi

    # Create source archive
    local version=$(get_version_from_tag "$TAG")
    local archive_name="kitchenxpert-$version-source.tar.gz"

    log "INFO" "Creating source archive..."
    git archive --format=tar.gz --prefix="kitchenxpert-$version/" -o "$ASSETS_DIR/$archive_name" "$TAG" 2>/dev/null || true

    log "SUCCESS" "Release assets prepared"
}

collect_assets() {
    log "STEP" "Collecting release assets..."

    RELEASE_ASSETS=()

    if [ -d "$ASSETS_DIR" ]; then
        # Find asset files
        while IFS= read -r file; do
            if [ -f "$file" ]; then
                RELEASE_ASSETS+=("$file")
                log "INFO" "Found asset: $(basename "$file")"
            fi
        done < <(find "$ASSETS_DIR" -maxdepth 1 -type f \( -name "*.tar.gz" -o -name "*.zip" -o -name "*.tgz" \) 2>/dev/null)
    fi

    if [ ${#RELEASE_ASSETS[@]} -eq 0 ]; then
        log "INFO" "No release assets found"
    else
        log "SUCCESS" "Found ${#RELEASE_ASSETS[@]} asset(s)"
    fi
}

create_github_release() {
    local tag=$1
    local notes=$2

    log "STEP" "Creating GitHub release..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would create release for tag: $tag"
        log "INFO" "Draft: $DRAFT"
        log "INFO" "Prerelease: $PRERELEASE"
        log "INFO" "Assets: ${#RELEASE_ASSETS[@]}"
        echo ""
        echo "Release notes:"
        echo -e "$notes"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Build gh release command
    local gh_args=("release" "create" "$tag")

    # Add title
    local version=$(get_version_from_tag "$tag")
    gh_args+=("--title" "Release $version")

    # Add notes
    gh_args+=("--notes" "$notes")

    # Add flags
    [ "$DRAFT" = "true" ] && gh_args+=("--draft")
    [ "$PRERELEASE" = "true" ] && gh_args+=("--prerelease")

    # Add assets
    for asset in "${RELEASE_ASSETS[@]}"; do
        gh_args+=("$asset")
    done

    # Create release
    gh "${gh_args[@]}"

    log "SUCCESS" "GitHub release created"
}

verify_release() {
    local tag=$1

    log "STEP" "Verifying release..."

    cd "$PROJECT_ROOT"

    # Get release info
    local release_info=$(gh release view "$tag" --json url,tagName,isDraft,isPrerelease 2>/dev/null)

    if [ -n "$release_info" ]; then
        log "SUCCESS" "Release verified"
        echo "$release_info" | jq .
    else
        log "ERROR" "Could not verify release"
    fi
}

print_summary() {
    local tag=$1

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}          Release Published Successfully                     ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Tag: $tag"
    echo "  Version: $(get_version_from_tag "$tag")"
    echo "  Draft: $DRAFT"
    echo "  Prerelease: $PRERELEASE"
    echo "  Assets: ${#RELEASE_ASSETS[@]}"
    echo ""

    cd "$PROJECT_ROOT"
    local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown")
    echo "  View release:"
    echo "    https://github.com/$repo/releases/tag/$tag"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag|-t)
            TAG="$2"
            shift 2
            ;;
        --draft|-d)
            DRAFT="true"
            shift
            ;;
        --prerelease|-p)
            PRERELEASE="true"
            shift
            ;;
        --notes|-n)
            CUSTOM_NOTES="$2"
            shift 2
            ;;
        --notes-file)
            NOTES_FILE="$2"
            shift 2
            ;;
        --no-notes)
            GENERATE_NOTES="false"
            shift
            ;;
        --assets|-a)
            ASSETS_DIR="$2"
            shift 2
            ;;
        --build|-b)
            BUILD_ASSETS="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help)
            echo "Usage: publish-release.sh [options]"
            echo ""
            echo "Options:"
            echo "  -t, --tag <tag>         Tag to release (default: latest)"
            echo "  -d, --draft             Create as draft release"
            echo "  -p, --prerelease        Mark as prerelease"
            echo "  -n, --notes <notes>     Custom release notes"
            echo "  --notes-file <file>     Read notes from file"
            echo "  --no-notes              Don't auto-generate notes"
            echo "  -a, --assets <dir>      Assets directory"
            echo "  -b, --build             Build assets before release"
            echo "  --dry-run               Show what would be done"
            echo "  --help                  Show this help message"
            echo ""
            echo "Examples:"
            echo "  publish-release.sh                        # Release latest tag"
            echo "  publish-release.sh --tag v2.0.0           # Release specific tag"
            echo "  publish-release.sh --draft --build        # Draft with build"
            echo "  publish-release.sh --prerelease           # Mark as prerelease"
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
check_prerequisites

cd "$PROJECT_ROOT"

# Get tag
if [ -z "$TAG" ]; then
    TAG=$(get_latest_tag)
    if [ -z "$TAG" ]; then
        log "ERROR" "No tags found. Create a tag first with tag-release.sh"
        exit 1
    fi
    log "INFO" "Using latest tag: $TAG"
fi

# Check tag exists
if ! git rev-parse "$TAG" &> /dev/null; then
    log "ERROR" "Tag $TAG does not exist"
    exit 1
fi

log "INFO" "Preparing release for: $TAG"

# Auto-detect prerelease
if [ "$PRERELEASE" = "false" ]; then
    PRERELEASE=$(detect_prerelease "$TAG")
    if [ "$PRERELEASE" = "true" ]; then
        log "INFO" "Detected prerelease version"
    fi
fi

# Build assets if requested
if [ "$BUILD_ASSETS" = "true" ]; then
    build_release_assets
fi

# Collect assets
collect_assets

# Generate or load release notes
if [ -n "$CUSTOM_NOTES" ]; then
    RELEASE_NOTES="$CUSTOM_NOTES"
elif [ -n "$NOTES_FILE" ] && [ -f "$NOTES_FILE" ]; then
    RELEASE_NOTES=$(cat "$NOTES_FILE")
elif [ "$GENERATE_NOTES" = "true" ]; then
    PREV_TAG=$(get_previous_tag "$TAG")
    RELEASE_NOTES=$(generate_release_notes "$TAG" "$PREV_TAG")
else
    RELEASE_NOTES="Release $TAG"
fi

# Create release
create_github_release "$TAG" "$RELEASE_NOTES"

if [ "$DRY_RUN" != "true" ]; then
    verify_release "$TAG"
    print_summary "$TAG"
fi
