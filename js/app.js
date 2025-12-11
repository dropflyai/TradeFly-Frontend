/**
 * TradeFly Multi-Page App
 * Main application entry point with SPA routing
 */

// Define routes
const routes = {
    '/': {
        template: '/pages/signals.html',
        init: null  // Signals page (unified scalping/swing)
    },
    '/signals': {
        template: '/pages/signals.html',
        init: null
    },
    '/scalping': {
        template: '/pages/scalping.html',
        init: null  // Keep for backward compatibility
    },
    '/swing': {
        template: '/pages/swing.html',
        init: null  // Keep for backward compatibility
    },
    '/charts': {
        template: '/pages/charts.html',
        init: null
    },
    '/monitor': {
        template: '/pages/monitor.html',
        init: null
    },
    '/paper-lab': {
        template: '/pages/paper-lab.html',
        init: null
    },
    '/learn': {
        template: '/pages/learn.html',
        init: null
    },
    '/module-1-lesson-1': {
        template: '/pages/module-1-lesson-1.html',
        init: null
    },
    '/module-1-lesson-2': {
        template: '/pages/module-1-lesson-2.html',
        init: null
    },
    '/module-1-lesson-3': {
        template: '/pages/module-1-lesson-3.html',
        init: null
    },
    '/module-1-lesson-4': {
        template: '/pages/module-1-lesson-4.html',
        init: null
    },
    '/module-1-lesson-5': {
        template: '/pages/module-1-lesson-5.html',
        init: null
    },
    '/module-1-quiz': {
        template: '/pages/module-1-quiz.html',
        init: null
    },
    '/watchlist': {
        template: '/pages/watchlist-modern.html',
        init: null
    },
    '/settings': {
        template: '/pages/settings.html',
        init: null
    }
};

// Application initialization
async function initApp() {
    console.log('TradeFly AI - Initializing...');

    try {
        // Load navigation bar
        await loadNavigation();

        // Initialize router
        const router = new Router(routes);

        console.log('✅ TradeFly AI - Ready');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Load navigation bar component
async function loadNavigation() {
    try {
        const response = await fetch('/components/navbar.html');
        const html = await response.text();

        // Insert navbar at the top of the body
        document.body.insertAdjacentHTML('afterbegin', html);

        console.log('✅ Navigation loaded');
    } catch (error) {
        console.error('Error loading navigation:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
