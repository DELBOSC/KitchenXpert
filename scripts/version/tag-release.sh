#!/bin/bash
#
# Tag Release - KitchenXpert
#
# Creates and manages git release tags.
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
TAG_PREFIX="${TAG_PREFIX:-v}"
SIGN_TAG="${SIGN_TAG:-false}"
PUSH_TAG="${PUSH_TAG:-false}"
DRY_RUN="${DRY_RUN:-false}"

# Logging
log() {
    local level=$1
    local message=$2
    case $level in
        "INFO")    echo -e "${BLUE}[TAG]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[TAG]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[TAG]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[TAG]${NC} $message" ;;
        "STEP")    echo -e "${CYAN}[STEP]${NC} $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}           KitchenXpert - Tag Release                        ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_git_repo() {
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        log "ERROR" "Not a git repository"
        exit 1
    fi
}

get_current_version() {
    local package_file="$PROJECT_ROOT/package.json"
    local version_file="$PROJECT_ROOT/VERSION"

    if [ -f "$version_file" ]; then
        cat "$version_file"
    elif [ -f "$package_file" ]; then
        grep -o '"version": *"[^"]*"' "$package_file" | grep -o '[0-9]*\.[0-9]*\.[0-9]*[^"]*' | head -1
    else
        echo ""
    fi
}

get_latest_tag() {
    cd "$PROJECT_ROOT"
    git describe --tags --abbrev=0 2>/dev/null || echo ""
}

get_all_tags() {
    cd "$PROJECT_ROOT"
    git tag --sort=-version:refname 2>/dev/null
}

check_tag_exists() {
    local tag=$1
    cd "$PROJECT_ROOT"
    git tag -l "$tag" | grep -q "^$tag$"
}

check_clean_working_tree() {
    cd "$PROJECT_ROOT"

    if [ -n "$(git status --porcelain)" ]; then
        log "WARNING" "Working tree has uncommitted changes"
        git status --short
        echo ""

        read -p "Continue anyway? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            log "INFO" "Aborted"
            exit 0
        fi
    fi
}

get_commits_since_tag() {
    local tag=$1
    cd "$PROJECT_ROOT"

    if [ -n "$tag" ]; then
        git log --oneline "$tag..HEAD" 2>/dev/null
    else
        git log --oneline 2>/dev/null | head -20
    fi
}

generate_tag_message() {
    local version=$1
    local tag=$2

    local message="Release $version\n\n"

    # Get commits since last tag
    local latest_tag=$(get_latest_tag)
    local commits=$(get_commits_since_tag "$latest_tag")

    if [ -n "$commits" ]; then
        message+="Changes in this release:\n\n"

        # Group by type
        local features=$(echo "$commits" | grep -E "^[a-f0-9]+ feat" | sed 's/^[a-f0-9]* /- /')
        local fixes=$(echo "$commits" | grep -E "^[a-f0-9]+ fix" | sed 's/^[a-f0-9]* /- /')
        local other=$(echo "$commits" | grep -vE "^[a-f0-9]+ (feat|fix)" | sed 's/^[a-f0-9]* /- /')

        if [ -n "$features" ]; then
            message+="### Features\n$features\n\n"
        fi

        if [ -n "$fixes" ]; then
            message+="### Bug Fixes\n$fixes\n\n"
        fi

        if [ -n "$other" ]; then
            message+="### Other Changes\n$other\n\n"
        fi
    fi

    echo -e "$message"
}

create_tag() {
    local tag=$1
    local message=$2

    log "STEP" "Creating tag: $tag"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would create tag: $tag"
        log "INFO" "Message:"
        echo -e "$message"
        return 0
    fi

    cd "$PROJECT_ROOT"

    local tag_args=("-a" "$tag")

    if [ "$SIGN_TAG" = "true" ]; then
        tag_args+=("-s")
    fi

    # Create tag with message
    if [ -n "$message" ]; then
        git tag "${tag_args[@]}" -m "$message"
    else
        git tag "${tag_args[@]}" -m "Release $tag"
    fi

    log "SUCCESS" "Tag $tag created"
}

push_tag() {
    local tag=$1

    log "STEP" "Pushing tag to remote..."

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would push tag: $tag"
        return 0
    fi

    cd "$PROJECT_ROOT"

    git push origin "$tag"

    log "SUCCESS" "Tag $tag pushed to remote"
}

delete_tag() {
    local tag=$1
    local remote=${2:-false}

    log "STEP" "Deleting tag: $tag"

    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "[DRY RUN] Would delete tag: $tag"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Delete local tag
    git tag -d "$tag" 2>/dev/null || log "WARNING" "Local tag not found"

    # Delete remote tag
    if [ "$remote" = "true" ]; then
        git push origin ":refs/tags/$tag" 2>/dev/null || log "WARNING" "Remote tag not found"
        log "SUCCESS" "Remote tag deleted"
    fi

    log "SUCCESS" "Tag $tag deleted"
}

list_tags() {
    log "STEP" "Listing release tags..."

    cd "$PROJECT_ROOT"

    echo ""
    echo "  Release Tags:"
    echo "  ─────────────────────────────────────────────────"

    git tag --sort=-version:refname -l "${TAG_PREFIX}*" | while read tag; do
        local date=$(git log -1 --format=%ci "$tag" 2>/dev/null | cut -d' ' -f1)
        local message=$(git tag -l -n1 "$tag" | sed "s/^$tag *//")
        printf "  %-12s  %-10s  %s\n" "$tag" "$date" "${message:0:40}"
    done

    echo ""
}

verify_tag() {
    local tag=$1

    log "STEP" "Verifying tag: $tag"

    cd "$PROJECT_ROOT"

    if git tag -v "$tag" 2>/dev/null; then
        log "SUCCESS" "Tag signature verified"
    else
        log "WARNING" "Tag is not signed or signature verification failed"
    fi
}

print_summary() {
    local tag=$1

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}           Tag Created Successfully                         ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Tag: $tag"

    if [ "$PUSH_TAG" = "true" ]; then
        echo "  Pushed: Yes"
    else
        echo ""
        echo "  To push the tag:"
        echo "    git push origin $tag"
    fi

    echo ""
    echo "  To create a GitHub release:"
    echo "    ./scripts/version/publish-release.sh --tag $tag"
    echo ""
}

# Parse arguments
ACTION="create"
VERSION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --version|-v)
            VERSION="$2"
            shift 2
            ;;
        --prefix|-p)
            TAG_PREFIX="$2"
            shift 2
            ;;
        --sign|-s)
            SIGN_TAG="true"
            shift
            ;;
        --push)
            PUSH_TAG="true"
            shift
            ;;
        --dry-run|-d)
            DRY_RUN="true"
            shift
            ;;
        --delete)
            ACTION="delete"
            DELETE_TAG="$2"
            shift 2
            ;;
        --delete-remote)
            DELETE_REMOTE="true"
            shift
            ;;
        --list|-l)
            ACTION="list"
            shift
            ;;
        --verify)
            ACTION="verify"
            VERIFY_TAG="$2"
            shift 2
            ;;
        --message|-m)
            CUSTOM_MESSAGE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: tag-release.sh [options]"
            echo ""
            echo "Options:"
            echo "  -v, --version <ver>    Version to tag (default: from package.json)"
            echo "  -p, --prefix <prefix>  Tag prefix (default: v)"
            echo "  -s, --sign             Sign the tag with GPG"
            echo "  --push                 Push tag to remote after creation"
            echo "  -d, --dry-run          Show what would be done"
            echo "  -m, --message <msg>    Custom tag message"
            echo "  -l, --list             List all release tags"
            echo "  --delete <tag>         Delete a tag"
            echo "  --delete-remote        Also delete from remote"
            echo "  --verify <tag>         Verify tag signature"
            echo "  --help                 Show this help message"
            echo ""
            echo "Examples:"
            echo "  tag-release.sh                         # Tag current version"
            echo "  tag-release.sh -v 2.0.0 --push        # Tag v2.0.0 and push"
            echo "  tag-release.sh --list                  # List all tags"
            echo "  tag-release.sh --delete v1.0.0         # Delete tag"
            exit 0
            ;;
        *)
            # Assume it's a version number
            if [[ $1 =~ ^[0-9] ]]; then
                VERSION="$1"
            else
                log "ERROR" "Unknown option: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Main execution
print_header
check_git_repo

cd "$PROJECT_ROOT"

case $ACTION in
    list)
        list_tags
        ;;

    delete)
        if [ -z "$DELETE_TAG" ]; then
            log "ERROR" "No tag specified for deletion"
            exit 1
        fi
        delete_tag "$DELETE_TAG" "$DELETE_REMOTE"
        ;;

    verify)
        if [ -z "$VERIFY_TAG" ]; then
            log "ERROR" "No tag specified for verification"
            exit 1
        fi
        verify_tag "$VERIFY_TAG"
        ;;

    create)
        # Get version
        if [ -z "$VERSION" ]; then
            VERSION=$(get_current_version)
        fi

        if [ -z "$VERSION" ]; then
            log "ERROR" "Could not determine version. Use --version to specify."
            exit 1
        fi

        TAG_NAME="${TAG_PREFIX}${VERSION}"

        log "INFO" "Version: $VERSION"
        log "INFO" "Tag: $TAG_NAME"

        # Check if tag exists
        if check_tag_exists "$TAG_NAME"; then
            log "ERROR" "Tag $TAG_NAME already exists"
            log "INFO" "Use --delete $TAG_NAME to remove it first"
            exit 1
        fi

        check_clean_working_tree

        # Generate or use custom message
        if [ -n "$CUSTOM_MESSAGE" ]; then
            TAG_MESSAGE="$CUSTOM_MESSAGE"
        else
            TAG_MESSAGE=$(generate_tag_message "$VERSION" "$TAG_NAME")
        fi

        # Create tag
        create_tag "$TAG_NAME" "$TAG_MESSAGE"

        # Push if requested
        if [ "$PUSH_TAG" = "true" ]; then
            push_tag "$TAG_NAME"
        fi

        if [ "$DRY_RUN" != "true" ]; then
            print_summary "$TAG_NAME"
        fi
        ;;
esac
