# QuickAppManager Auto-Update Setup

## Step 1: Generate Signing Keys

Run this command in your terminal:

```bash
cargo tauri signer generate --write-keys ~/.tauri/quickappmanager.key
```

**Important:** Press Enter twice (empty password) when prompted. This is required for GitHub Actions to work.

The command will output something like:

```
untrusted comment: minisign public key: ABCD1234EFGH5678
RWS1234567890abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH==
```

## Step 2: Update tauri.conf.json

Copy the **entire public key** (including the "untrusted comment" line) and update `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "untrusted comment: minisign public key: ABCD1234EFGH5678\nRWS1234567890abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH==",
      "endpoints": [
        "https://github.com/janzeman/QuickAppManager/releases/latest/download/latest.json"
      ]
    }
  }
}
```

**Note:** Replace `janzeman` with your actual GitHub username if different.

## Step 3: Add GitHub Secret

1. Go to your GitHub repository: https://github.com/janzeman/QuickAppManager
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `TAURI_PRIVATE_KEY`
5. Value: Paste the contents of `~/.tauri/quickappmanager.key` (the private key file)

To get the private key content:
```bash
cat ~/.tauri/quickappmanager.key
```

## Step 4: Create First Release

1. Commit and push all changes:
   ```bash
   git add .
   git commit -m "Add auto-updater support"
   git push
   ```

2. Create and push a tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. GitHub Actions will automatically:
   - Build for macOS (aarch64 and x86_64)
   - Build for Windows
   - Sign all binaries
   - Create a draft release
   - Generate `latest.json` with signatures

4. Go to GitHub Releases and publish the draft release

## Step 5: Test Auto-Update

1. Install the v0.1.0 release on your system
2. Create a new version (e.g., v0.1.1):
   ```bash
   # Update version in src-tauri/Cargo.toml and tauri.conf.json
   git add .
   git commit -m "Bump version to 0.1.1"
   git tag v0.1.1
   git push origin v0.1.1
   ```

3. Wait for the build to complete and publish the release
4. Launch your installed v0.1.0 app
5. After 3 seconds, you should see an update prompt!

## Troubleshooting

### No update prompt appears
- Check browser console for errors
- Verify the `pubkey` in tauri.conf.json is correct (including "untrusted comment" line)
- Check that GitHub release has `latest.json` and `.sig` files
- Make sure `TAURI_PRIVATE_KEY` secret is set correctly

### Build fails in GitHub Actions
- Verify `TAURI_PRIVATE_KEY` secret is set
- Check that the private key has no password
- Look at the GitHub Actions logs for specific errors

### "Invalid signature" error
- The public and private keys don't match
- Regenerate keys and update both the config and GitHub secret

## Files Modified

- ✅ `.github/workflows/release.yml` - GitHub Actions workflow
- ✅ `src/updater.js` - Frontend updater code
- ✅ `src/index.html` - Added updater script
- ✅ `package.json` - Added for npm compatibility
- ✅ `VERSION.md` - Version history tracking
- ⏳ `src-tauri/tauri.conf.json` - Need to add pubkey and endpoint
- ⏳ GitHub secret `TAURI_PRIVATE_KEY` - Need to add

## Next Steps

1. Generate the signing keys (Step 1 above)
2. Update tauri.conf.json with the public key
3. Add the private key to GitHub secrets
4. Create the first release tag
