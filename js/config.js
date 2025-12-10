// TradeFly API Configuration
const API_CONFIG = {
    // Production API URL
    BASE_URL: 'https://api.tradeflyai.com',

    // API Endpoints
    ENDPOINTS: {
        health: '/api/health',
        marketData: '/api/market/dynamic-watchlist',
        optionsSignals: '/api/options/signals',
        paperTrades: '/api/paper-trading/positions',
        topMovers: '/api/market/top-movers'
    },

    // Helper function to get full API URL
    getUrl: function(endpoint) {
        return this.BASE_URL + endpoint;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}
