#!/bin/sh
# Install git hooks for Hará Match.
# This script is run automatically by `npm install` via the prepare lifecycle script.

HOOKS_DIR=".git/hooks"
SOURCE_DIR="scripts/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  # Not a git repo or running in CI — skip silently
  exit 0
fi

if ! cp "$SOURCE_DIR/pre-push" "$HOOKS_DIR/pre-push"; then
  echo "Failed to install pre-push hook (source: $SOURCE_DIR/pre-push)"
  exit 1
fi

chmod +x "$HOOKS_DIR/pre-push"
echo "Git hooks installed."
