// Imports removed for classic script compatibility

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initI18n(route);
    initRouter();
    initPWA();

    if (document.startViewTransition) {
        console.log("🪄 View Transitions API supported and active.");
    } else {
        console.warn("⚠️ View Transitions API NOT supported in this browser.");
    }



    loadData().then(() => {
        route();
    });

    // 🔌 Offline Status Monitoring
    const offlineIndicator = document.getElementById('offline-indicator');
    const updateOnlineStatus = () => {
        if (offlineIndicator) {
            offlineIndicator.hidden = navigator.onLine;
        }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Initial check
});
