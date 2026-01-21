#!/bin/sh

# Change to project root directory
cd "$(git rev-parse --show-toplevel)" || exit 1

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    # Suppress nvm warnings about npmrc prefix settings
    \. "$NVM_DIR/nvm.sh" 2>/dev/null || true
    
    # Use Node.js version from .nvmrc if available, otherwise try recent versions
    if [ -f ".nvmrc" ]; then
        nvm use --silent >/dev/null 2>&1 || nvm use >/dev/null 2>&1 || true
    else
        # Fallback to Node.js 20 if .nvmrc doesn't exist
        nvm use 20 --silent >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true
    fi
fi

# Execute lint-staged using npx (which will find it in node_modules or download it)
npx lint-staged
