#!/bin/bash
# Commit linting fixes

cd /workspaces/sn-hr-portal

# Stage all changed files
git add -A

# Commit with conventional commit message
git commit -m "style: fix Biome linting and formatting errors

- Fix import order in multiple files
- Remove trailing spaces and format arrays
- Replace 'any' types with proper TypeScript types
- Add node: protocol to Node.js imports
- Fix unused arrow function parameters
- Format code according to Biome rules
- Add newlines at end of files"

# Push to remote
git push origin dev/codespace

echo "✅ Linting fixes committed and pushed!"
