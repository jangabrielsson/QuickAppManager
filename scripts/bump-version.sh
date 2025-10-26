#!/bin/bash
# Version bump script for QuickAppManager

if [ -z "$1" ]; then
    echo "Usage: ./scripts/bump-version.sh <version>"
    echo "Example: ./scripts/bump-version.sh 0.1.1"
    exit 1
fi

VERSION=$1

echo "Bumping version to $VERSION..."

# Update Cargo.toml
sed -i '' "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml

# Update tauri.conf.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json

# Update package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

echo "✅ Updated version to $VERSION in:"
echo "   - src-tauri/Cargo.toml"
echo "   - src-tauri/tauri.conf.json"
echo "   - package.json"
echo ""
echo "Next steps:"
echo "1. Update VERSION.md with release notes"
echo "2. git add ."
echo "3. git commit -m \"Bump version to $VERSION\""
echo "4. git tag v$VERSION"
echo "5. git push origin v$VERSION"
