// Auto-updater functionality

async function setupUpdater() {
    const { check } = window.__TAURI__?.updater || {};
    const { ask } = window.__TAURI__?.dialog || {};
    const { relaunch } = window.__TAURI__?.process || {};
    
    if (!check) {
        console.log('Updater not available');
        return;
    }

    try {
        console.log('Checking for updates...');
        const update = await check();
        
        if (update?.available) {
            console.log(`Update available: ${update.version}`);
            console.log(`Current version: ${update.currentVersion}`);
            
            const yes = await ask(
                `Update to version ${update.version} is available!\n\nRelease notes:\n${update.body}\n\nWould you like to install it now?`,
                {
                    title: 'Update Available',
                    kind: 'info',
                    okLabel: 'Update',
                    cancelLabel: 'Later'
                }
            );
            
            if (yes) {
                console.log('Downloading and installing update...');
                await update.downloadAndInstall();
                
                const relaunchNow = await ask(
                    'Update installed successfully!\n\nRestart now to apply the update?',
                    {
                        title: 'Update Installed',
                        kind: 'info',
                        okLabel: 'Restart Now',
                        cancelLabel: 'Restart Later'
                    }
                );
                
                if (relaunchNow && relaunch) {
                    await relaunch();
                }
            }
        } else {
            console.log('No updates available');
        }
    } catch (error) {
        console.error('Update check failed:', error);
        // Silently fail - don't bother the user
    }
}

// Check for updates on startup (after a short delay)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(setupUpdater, 3000); // Check 3 seconds after load
    });
} else {
    setTimeout(setupUpdater, 3000);
}

// Export for manual checking
window.checkForUpdates = setupUpdater;
