// TradeFly API Configuration
const API_CONFIG = {
    // Production API URL (using IP until DNS is configured)
    BASE_URL: 'http://18.223.164.188:8002',

    // API Endpoints
    ENDPOINTS: {
        health: '/api/health',
        marketData: '/api/market/dynamic-watchlist',
        optionsSignals: '/api/options/signals',
        paperTrades: '/api/paper-trading/positions',
        topMovers: '/api/market/top-movers'
    },

    // Supabase Configuration
    SUPABASE: {
        URL: 'https://nplgxhthjwwyywbnvxzt.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGd4aHRoand3eXl3Ym52eHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTIxNzEsImV4cCI6MjA3OTc2ODE3MX0.If32Moy6QhAHNXQfvbMLLfa0ssErIzV91qbeylJS8cg'
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
