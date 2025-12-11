/**
 * TradeFly Authentication Module
 * Handles login, signup, and session management with Supabase
 */

const TradeFlyAuth = {
    get supabaseUrl() {
        return (typeof API_CONFIG !== 'undefined' && API_CONFIG.SUPABASE)
            ? API_CONFIG.SUPABASE.URL
            : 'https://nplgxhthjwwyywbnvxzt.supabase.co';
    },

    get supabaseAnonKey() {
        return (typeof API_CONFIG !== 'undefined' && API_CONFIG.SUPABASE)
            ? API_CONFIG.SUPABASE.ANON_KEY
            : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGd4aHRoand3eXl3Ym52eHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTIxNzEsImV4cCI6MjA3OTc2ODE3MX0.If32Moy6QhAHNXQfvbMLLfa0ssErIzV91qbeylJS8cg';
    },

    currentUser: null,
    currentSession: null,

    /**
     * Initialize Supabase client
     */
    init() {
        // Load Supabase client from CDN
        if (typeof supabase === 'undefined') {
            console.error('Supabase client not loaded. Make sure to include the CDN script.');
            return false;
        }

        try {
            this.client = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
            console.log('✅ Supabase client initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error);
            return false;
        }
    },

    /**
     * Ensure client is initialized
     */
    ensureInitialized() {
        if (!this.client) {
            console.log('Client not initialized, attempting to initialize...');
            const initialized = this.init();
            if (!initialized) {
                throw new Error('Failed to initialize Supabase client. Please check your configuration.');
            }
        }
        return true;
    },

    /**
     * Check if user is authenticated
     */
    async checkAuth() {
        if (!this.client) {
            console.error('Supabase client not initialized');
            return null;
        }

        const { data: { session }, error } = await this.client.auth.getSession();

        if (error) {
            console.error('Error checking auth:', error);
            return null;
        }

        if (session) {
            this.currentSession = session;
            this.currentUser = session.user;
            return session.user;
        }

        return null;
    },

    /**
     * Sign up new user
     */
    async signUp(email, password, fullName) {
        this.ensureInitialized();

        console.log('Attempting signup for:', email);

        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) {
            console.error('Signup error:', error);
            throw error;
        }

        console.log('Signup successful:', data);
        return data;
    },

    /**
     * Sign in existing user
     */
    async signIn(email, password) {
        this.ensureInitialized();

        const { data, error } = await this.client.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        this.currentSession = data.session;
        this.currentUser = data.user;

        // Log activity
        await this.logActivity('login', { method: 'email' });

        return data;
    },

    /**
     * Sign out current user
     */
    async signOut() {
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }

        await this.logActivity('logout');

        const { error } = await this.client.auth.signOut();

        if (error) throw error;

        this.currentSession = null;
        this.currentUser = null;

        // Redirect to login
        window.location.href = '/login.html';
    },

    /**
     * Get current user profile
     */
    async getUserProfile() {
        if (!this.currentUser) {
            await this.checkAuth();
        }

        if (!this.currentUser) {
            return null;
        }

        const { data, error } = await this.client
            .from('user_profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return data;
    },

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        const { data, error } = await this.client
            .from('user_profiles')
            .update(updates)
            .eq('id', this.currentUser.id)
            .select()
            .single();

        if (error) throw error;

        return data;
    },

    /**
     * Log user activity
     */
    async logActivity(action, details = {}) {
        if (!this.currentUser) return;

        try {
            await this.client
                .from('activity_log')
                .insert({
                    user_id: this.currentUser.id,
                    action,
                    details,
                    user_agent: navigator.userAgent
                });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    },

    /**
     * Get user ID for API calls
     */
    getUserId() {
        return this.currentUser?.id || null;
    },

    /**
     * Get auth token for API calls
     */
    getAuthToken() {
        return this.currentSession?.access_token || null;
    },

    /**
     * Require authentication (redirect if not logged in)
     */
    async requireAuth() {
        const user = await this.checkAuth();

        if (!user) {
            // Save intended destination
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.href = '/login.html';
            return false;
        }

        return true;
    },

    /**
     * Reset password
     */
    async resetPassword(email) {
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }

        const { error } = await this.client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });

        if (error) throw error;
    },

    /**
     * Update password
     */
    async updatePassword(newPassword) {
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }

        const { error } = await this.client.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
    }
};

// Initialize on load
if (typeof supabase !== 'undefined') {
    TradeFlyAuth.init();
}

// Export for use in other modules
window.TradeFlyAuth = TradeFlyAuth;
