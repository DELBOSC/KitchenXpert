#!/bin/bash
#
# Bump Version - KitchenXpert
#
# Bumps the version number across all package files.
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
BUMP_TYPE="${BUMP_TYPE:-patch}"
DRY_RUN="${DRY_RUN:-false}"
COMMIT="${COMMIT:-true}"
TAG="${TAG:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[VERSION]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[VERSION]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[VERSION]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[VERSION]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}           KitchenXpert - Version Bump                       ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

get_current_version() {
    local package_file="$PROJECT_ROOT/package.json"

    if [ -f "$package_file" ]; then
        grep -o '"version": *"[^"]*"' "$package_file" | grep -o '[0-9]*\.[0-9]*\.[0-9]*' | head -1
    else
        echo "0.0.0"
    fi
}

parse_version() {
    local version=$1
    MAJOR=$(echo "$version" | cut -d. -f1)
    MINOR=$(echo "$version" | cut -d. -f2)
    PATCH=$(echo "$version" | cut -d. -f3 | cut -d- -f1)
    PRERELEASE=$(echo "$version" | grep -o '\-.*' | sed 's/^-//' || echo "")
}

calculate_new_version() {
    local current=$1
    local bump_type=$2

    parse_version "$current"

    case $bump_type in
        major)
            NEW_MAJOR=$((MAJOR + 1))
            NEW_MINOR=0
            NEW_PATCH=0
            ;;
        minor)
            NEW_MAJOR=$MAJOR
            NEW_MINOR=$((MINOR + 1))
            NEW_PATCH=0
            ;;
        patch)
            NEW_MAJOR=$MAJOR
            NEW_MINOR=$MINOR
            NEW_PATCH=$((PATCH + 1))
            ;;
        premajor)
            NEW_MAJOR=$((MAJOR + 1))
            NEW_MINOR=0
            NEW_PATCH=0
            NEW_PRERELEASE="alpha.0"
            ;;
        preminor)
            NEW_MAJOR=$MAJOR
            NEW_MINOR=$((MINOR + 1))
            NEW_PATCH=0
            NEW_PRERELEASE="alpha.0"
            ;;
        prepatch)
            NEW_MAJOR=$MAJOR
            NEW_MINOR=$MINOR
            NEW_PATCH=$((PATCH + 1))
            NEW_PRERELEASE="alpha.0"
            ;;
        prerelease)
            NEW_MAJOR=$MAJOR
            NEW_MINOR=$MINOR
            NEW_PATCH=$PATCH
            if [ -n "$PRERELEASE" ]; then
                # Increment prerelease number
                local pre_name=$(echo "$PRERELEASE" | cut -d. -f1)
                local pre_num=$(echo "$PRERELEASE" | cut -d. -f2)
                NEW_PRERELEASE="$pre_name.$((pre_num + 1))"
            else
                NEW_PRERELEASE="alpha.0"
            fi
            ;;
        *)
            log "ERROR" "Unknown bump type: $bump_type"
            exit 1
            ;;
    esac

    if [ -n "$NEW_PRERELEASE" ]; then
        echo "$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH-$NEW_PRERELEASE"
    else
        echo "$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
    fi
}

update_package_json() {
    local file=$1
    local new_version=$2

    if [ ! -f "$file" ]; then
        return 0
    fi

    log "INFO" "Updating: $file"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would update $file to $new_version"
        return 0
    fi

    # Use sed to update version
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": *\"[^\"]*\"/\"version\": \"$new_version\"/" "$file"
    else
        sed -i "s/\"version\": *\"[^\"]*\"/\"version\": \"$new_version\"/" "$file"
    fi
}

update_all_packages() {
    local new_version=$1

    log "STEP" "Updating package files to version $new_version..."

    # Main package.json
    update_package_json "$PROJECT_ROOT/package.json" "$new_version"

    # Find and update workspace packages
    local package_files=(
        "$PROJECT_ROOT/packages/frontend/package.json"
        "$PROJECT_ROOT/packages/backend/package.json"
        "$PROJECT_ROOT/packages/partner-portal/package.json"
        "$PROJECT_ROOT/packages/ai-modules/package.json"
        "$PROJECT_ROOT/packages/shared/package.json"
        "$PROJECT_ROOT/packages/ui/package.json"
        "$PROJECT_ROOT/packages/types/package.json"
    )

    for pkg in "${package_files[@]}"; do
        if [ -f "$pkg" ]; then
            update_package_json "$pkg" "$new_version"
        fi
    done

    # Find additional package.json files in packages directory
    if [ -d "$PROJECT_ROOT/packages" ]; then
        find "$PROJECT_ROOT/packages" -name "package.json" -type f | while read pkg; do
            update_package_json "$pkg" "$new_version"
        done
    fi

    log "SUCCESS" "All package files updated"
}

update_version_file() {
    local new_version=$1
    local version_file="$PROJECT_ROOT/VERSION"

    log "STEP" "Updating VERSION file..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would create/update VERSION file"
        return 0
    fi

    echo "$new_version" > "$version_file"
    log "SUCCESS" "VERSION file updated"
}

update_changelog_header() {
    local new_version=$1
    local changelog_file="$PROJECT_ROOT/CHANGELOG.md"

    if [ ! -f "$changelog_file" ]; then
        return 0
    fi

    log "STEP" "Updating CHANGELOG.md header..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would update CHANGELOG.md"
        return 0
    fi

    local today=$(date +%Y-%m-%d)

    # Check if unreleased section exists
    if grep -q "\[Unreleased\]" "$changelog_file"; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/## \[Unreleased\]/## [$new_version] - $today\n\n## [Unreleased]/" "$changelog_file"
        else
            sed -i "s/## \[Unreleased\]/## [$new_version] - $today\n\n## [Unreleased]/" "$changelog_file"
        fi
    fi

    log "SUCCESS" "CHANGELOG.md updated"
}

commit_version_bump() {
    local new_version=$1

    log "STEP" "Committing version bump..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would commit version bump"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Check if in git repo
    if [ ! -d ".git" ]; then
        log "WARNING" "Not a git repository, skipping commit"
        return 0
    fi

    # Stage changed files
    git add package.json VERSION CHANGELOG.md 2>/dev/null || true
    git add "packages/*/package.json" 2>/dev/null || true

    # Commit
    git commit -m "chore(release): bump version to $new_version" 2>/dev/null || {
        log "WARNING" "Nothing to commit or commit failed"
        return 0
    }

    log "SUCCESS" "Version bump committed"
}

create_version_tag() {
    local new_version=$1

    log "STEP" "Creating git tag v$new_version..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would create tag v$new_version"
        return 0
    fi

    cd "$PROJECT_ROOT"

    if [ ! -d ".git" ]; then
        log "WARNING" "Not a git repository, skipping tag"
        return 0
    fi

    git tag -a "v$new_version" -m "Release v$new_version" 2>/dev/null || {
        log "WARNING" "Failed to create tag (may already exist)"
        return 0
    }

    log "SUCCESS" "Tag v$new_version created"
}

print_summary() {
    local current=$1
    local new=$2

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           Version Bump Complete                             ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Previous version: $current"
    echo "  New version:      $new"
    echo "  Bump type:        $BUMP_TYPE"
    echo ""
    if [ "$DRY_RUN" = "true" ]; then
        echo "  ${YELLOW}DRY RUN - No changes were made${NC}"
        echo ""
    fi
    if [ "$TAG" = "true" ]; then
        echo "  Tag created: v$new"
        echo ""
    fi
    echo "  Next steps:"
    echo "    1. Review the changes"
    echo "    2. Push to remote: git push && git push --tags"
    echo "    3. Create release: ./scripts/version/publish-release.sh"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        major|minor|patch|premajor|preminor|prepatch|prerelease)
            BUMP_TYPE="$1"
            shift
            ;;
        --version|-v)
            CUSTOM_VERSION="$2"
            shift 2
            ;;
        --dry-run|-d)
            DRY_RUN="true"
            shift
            ;;
        --no-commit)
            COMMIT="false"
            shift
            ;;
        --tag|-t)
            TAG="true"
            shift
            ;;
        --help)
            echo "Usage: bump-version.sh [type] [options]"
            echo ""
            echo "Bump types:"
            echo "  major        Bump major version (1.0.0 -> 2.0.0)"
            echo "  minor        Bump minor version (1.0.0 -> 1.1.0)"
            echo "  patch        Bump patch version (1.0.0 -> 1.0.1) [default]"
            echo "  premajor     Bump to next major prerelease (1.0.0 -> 2.0.0-alpha.0)"
            echo "  preminor     Bump to next minor prerelease"
            echo "  prepatch     Bump to next patch prerelease"
            echo "  prerelease   Bump prerelease version"
            echo ""
            echo "Options:"
            echo "  -v, --version <ver>  Set specific version"
            echo "  -d, --dry-run        Show what would be done"
            echo "  --no-commit          Don't commit changes"
            echo "  -t, --tag            Create git tag"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  bump-version.sh patch             # 1.0.0 -> 1.0.1"
            echo "  bump-version.sh minor --tag      # 1.0.1 -> 1.1.0, create tag"
            echo "  bump-version.sh --version 2.0.0  # Set to 2.0.0"
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

CURRENT_VERSION=$(get_current_version)
log "INFO" "Current version: $CURRENT_VERSION"

if [ -n "$CUSTOM_VERSION" ]; then
    NEW_VERSION="$CUSTOM_VERSION"
    log "INFO" "Setting custom version: $NEW_VERSION"
else
    NEW_VERSION=$(calculate_new_version "$CURRENT_VERSION" "$BUMP_TYPE")
    log "INFO" "Calculated new version: $NEW_VERSION"
fi

if [ "$DRY_RUN" = "true" ]; then
    log "WARNING" "DRY RUN MODE - No changes will be made"
    echo ""
fi

update_all_packages "$NEW_VERSION"
update_version_file "$NEW_VERSION"
update_changelog_header "$NEW_VERSION"

if [ "$COMMIT" = "true" ]; then
    commit_version_bump "$NEW_VERSION"
fi

if [ "$TAG" = "true" ]; then
    create_version_tag "$NEW_VERSION"
fi

print_summary "$CURRENT_VERSION" "$NEW_VERSION"
