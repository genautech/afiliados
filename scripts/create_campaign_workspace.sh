#!/usr/bin/env bash
set -e

# Script: create_campaign_workspace.sh
# Purpose: Initialize physical workspace for a new low-ticket campaign

CAMPAIGN_SLUG="${1}"

if [ -z "${CAMPAIGN_SLUG}" ]; then
  echo "Usage: $0 <campaign-slug>"
  echo "Example: $0 femicore-low-ticket"
  exit 1
fi

# Base paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
BASE_DIR="${PROJECT_ROOT}/campaigns_data/low_ticket/${CAMPAIGN_SLUG}"

echo "🚀 Initializing Campaign Workspace for '${CAMPAIGN_SLUG}' at ${BASE_DIR}..."

mkdir -p "${BASE_DIR}/01_research"
mkdir -p "${BASE_DIR}/02_drafts"
mkdir -p "${BASE_DIR}/03_pages"
mkdir -p "${BASE_DIR}/04_assets"

MANIFEST_FILE="${BASE_DIR}/manifest.json"
NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [ ! -f "${MANIFEST_FILE}" ]; then
  cat <<EOF > "${MANIFEST_FILE}"
{
  "campaign_slug": "${CAMPAIGN_SLUG}",
  "created_at": "${NOW_ISO}",
  "updated_at": "${NOW_ISO}",
  "status": "draft",
  "type": "low_ticket",
  "drafts": {
    "landing_page": null,
    "ebook": null
  },
  "insights": []
}
EOF
  echo "✅ Manifest created: ${MANIFEST_FILE}"
else
  echo "ℹ️ Manifest already exists: ${MANIFEST_FILE}"
fi

echo "✨ Workspace setup complete for '${CAMPAIGN_SLUG}'."
