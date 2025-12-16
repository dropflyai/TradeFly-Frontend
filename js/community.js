/**
 * TradeFly Community - Social Feed JavaScript
 * Premium social trading platform with real-time updates
 */

// Configuration
const API_BASE_URL = 'https://api.tradeflyai.com/api/social';
const POLLING_INTERVAL = 30000; // 30 seconds
const POSTS_PER_PAGE = 20;

// State Management
let currentFilter = {
    strategy: null,
    min_confidence: 0,
    sentiment: null,
    offset: 0,
    limit: POSTS_PER_PAGE
};

let isLoading = false;
let hasMore = true;
let pollingTimer = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 TradeFly Community initializing...');

    initializeEventListeners();
    loadRooms();
    loadFeed();
    loadTrendingContracts();
    loadLeaderboard();
    startPolling();
    updateMarketStatus();

    console.log('✅ Community initialized');
});

// === EVENT LISTENERS ===

function initializeEventListeners() {
    // Feed filter tabs
    document.querySelectorAll('.feed-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            setActiveTab(e.target);
            currentFilter.strategy = filter === 'all' ? null : filter;
            currentFilter.offset = 0;
            hasMore = true;
            loadFeed(true);
        });
    });

    // Confidence filter
    const confidenceFilter = document.getElementById('confidence-filter');
    if (confidenceFilter) {
        confidenceFilter.addEventListener('change', (e) => {
            currentFilter.min_confidence = parseFloat(e.target.value);
            currentFilter.offset = 0;
            hasMore = true;
            loadFeed(true);
        });
    }

    // Sentiment filter
    const sentimentFilter = document.getElementById('sentiment-filter');
    if (sentimentFilter) {
        sentimentFilter.addEventListener('change', (e) => {
            currentFilter.sentiment = e.target.value || null;
            currentFilter.offset = 0;
            hasMore = true;
            loadFeed(true);
        });
    }

    // Infinite scroll
    window.addEventListener('scroll', handleInfiniteScroll);

    // Create post modal
    const createPostBtn = document.getElementById('create-post-btn');
    const mobileCreatePost = document.getElementById('mobile-create-post');
    const modal = document.getElementById('create-post-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const submitPost = document.getElementById('submit-post');

    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => openModal(modal));
    }

    if (mobileCreatePost) {
        mobileCreatePost.addEventListener('click', () => openModal(modal));
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => closeModal(modal));
    }

    if (modalClose) {
        modalClose.addEventListener('click', () => closeModal(modal));
    }

    if (modalCancel) {
        modalCancel.addEventListener('click', () => closeModal(modal));
    }

    if (submitPost) {
        submitPost.addEventListener('click', handleCreatePost);
    }
}

function setActiveTab(activeElement) {
    document.querySelectorAll('.feed-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    activeElement.classList.add('active');
}

// === MODAL FUNCTIONS ===

function openModal(modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';

    // Clear form
    document.getElementById('post-content').value = '';
    document.getElementById('contract-symbol').value = '';
    document.getElementById('post-sentiment').value = '';
    document.getElementById('post-strategy').value = '';
}

// === FEED LOADING ===

async function loadFeed(reset = false) {
    if (isLoading || (!hasMore && !reset)) return;

    isLoading = true;

    if (reset) {
        currentFilter.offset = 0;
        const feedContainer = document.getElementById('feed-posts');
        feedContainer.innerHTML = '<div class="post-skeleton">Loading...</div>';
    }

    try {
        const params = new URLSearchParams();

        if (currentFilter.strategy) {
            params.append('strategy', currentFilter.strategy);
        }
        if (currentFilter.min_confidence > 0) {
            params.append('min_confidence', currentFilter.min_confidence);
        }
        if (currentFilter.sentiment) {
            params.append('sentiment', currentFilter.sentiment);
        }
        params.append('limit', currentFilter.limit);
        params.append('offset', currentFilter.offset);

        const response = await fetch(`${API_BASE_URL}/feed?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        renderFeed(data.posts, reset);

        hasMore = data.has_more;
        currentFilter.offset += data.posts.length;

        console.log(`📰 Loaded ${data.posts.length} posts (total: ${data.total_count})`);

    } catch (error) {
        console.error('❌ Error loading feed:', error);
        showError('Failed to load feed. Please try again.');
    } finally {
        isLoading = false;
    }
}

function renderFeed(posts, reset = false) {
    const feedContainer = document.getElementById('feed-posts');

    if (reset) {
        feedContainer.innerHTML = '';
    }

    if (posts.length === 0 && reset) {
        feedContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <h3>No signals found</h3>
                <p>Try adjusting your filters or check back later for new signals.</p>
            </div>
        `;
        return;
    }

    posts.forEach(post => {
        const postCard = createPostCard(post);
        feedContainer.appendChild(postCard);
    });
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.dataset.postId = post.post_id;

    // Parse signal data
    const signalData = post.signal_data || {};
    const contract = signalData.contract || {};
    const greeks = contract.greeks || {};

    // Determine sentiment color
    const sentimentClass = post.sentiment?.includes('bullish') ? 'sentiment-bullish' : 'sentiment-bearish';
    const sentimentIcon = post.sentiment?.includes('bullish') ? '🚀' : '📉';

    // Format timestamps
    const createdAt = new Date(post.created_at);
    const timeAgo = getTimeAgo(createdAt);

    card.innerHTML = `
        <div class="post-header">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author_id}"
                 alt="${post.author_username}"
                 class="post-avatar">
            <div class="post-author-info">
                <div class="post-author-name">
                    ${post.author_username}
                    ${post.author_verified ? '<span class="verified-badge">✓</span>' : ''}
                </div>
                <div class="post-meta">
                    <span>${timeAgo}</span>
                    ${post.strategy ? `<span class="post-strategy-tag">${post.strategy}</span>` : ''}
                </div>
            </div>
        </div>

        ${post.contract_symbol ? `
        <div class="post-contract-hero">
            <div class="contract-symbol">${post.contract_symbol}</div>
            <div class="contract-sentiment ${sentimentClass}">
                ${sentimentIcon} ${formatSentiment(post.sentiment)}
            </div>

            ${signalData.confidence !== undefined ? `
            <div class="confidence-bar-wrapper">
                <div class="confidence-label">
                    <span>Signal Confidence</span>
                    <span class="confidence-value">${Math.round(signalData.confidence * 100)}%</span>
                </div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${signalData.confidence * 100}%"></div>
                </div>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <div class="post-content">
            <div class="post-text">${formatPostContent(post.content)}</div>

            ${Object.keys(greeks).length > 0 ? `
            <div class="greeks-section">
                <div class="greeks-header" onclick="toggleGreeks(this)">
                    <span class="greeks-title">View Greeks & Analytics</span>
                    <span class="greeks-toggle">▼</span>
                </div>
                <div class="greeks-content">
                    <div class="greeks-grid">
                        ${greeks.delta !== undefined ? `
                        <div class="greek-item">
                            <div class="greek-label">Delta</div>
                            <div class="greek-value">${greeks.delta.toFixed(3)}</div>
                            <div class="greek-bar">
                                <div class="greek-bar-fill" style="width: ${Math.abs(greeks.delta) * 100}%"></div>
                            </div>
                        </div>
                        ` : ''}

                        ${greeks.gamma !== undefined ? `
                        <div class="greek-item">
                            <div class="greek-label">Gamma</div>
                            <div class="greek-value">${greeks.gamma.toFixed(3)}</div>
                            <div class="greek-bar">
                                <div class="greek-bar-fill" style="width: ${greeks.gamma * 100}%"></div>
                            </div>
                        </div>
                        ` : ''}

                        ${greeks.theta !== undefined ? `
                        <div class="greek-item">
                            <div class="greek-label">Theta</div>
                            <div class="greek-value">${greeks.theta.toFixed(3)}</div>
                            <div class="greek-bar">
                                <div class="greek-bar-fill" style="width: ${Math.abs(greeks.theta) * 20}%"></div>
                            </div>
                        </div>
                        ` : ''}

                        ${greeks.vega !== undefined ? `
                        <div class="greek-item">
                            <div class="greek-label">Vega</div>
                            <div class="greek-value">${greeks.vega.toFixed(3)}</div>
                            <div class="greek-bar">
                                <div class="greek-bar-fill" style="width: ${greeks.vega * 100}%"></div>
                            </div>
                        </div>
                        ` : ''}

                        ${greeks.implied_volatility !== undefined ? `
                        <div class="greek-item">
                            <div class="greek-label">IV</div>
                            <div class="greek-value">${(greeks.implied_volatility * 100).toFixed(1)}%</div>
                            <div class="greek-bar">
                                <div class="greek-bar-fill" style="width: ${greeks.implied_volatility * 100}%"></div>
                            </div>
                        </div>
                        ` : ''}

                        ${signalData.entry !== undefined ? `
                        <div class="greek-item">
                            <div class="greek-label">Entry</div>
                            <div class="greek-value">$${signalData.entry.toFixed(2)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            ` : ''}
        </div>

        <div class="post-actions">
            <button class="action-btn" onclick="likePost('${post.post_id}', this)">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 17.5l-1.455-1.32C4.4 12.36 1.667 9.89 1.667 6.833c0-2.42 1.913-4.333 4.333-4.333 1.383 0 2.713.647 3.583 1.663.87-1.016 2.2-1.663 3.584-1.663 2.42 0 4.333 1.913 4.333 4.333 0 3.057-2.733 5.527-6.878 9.357L10 17.5z" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="action-count">${post.likes_count || 0}</span>
            </button>

            <button class="action-btn" onclick="replyPost('${post.post_id}')">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M18 10c0 4.4-3.6 8-8 8-1.376 0-2.672-.348-3.8-.96L2 18l.96-4.2C2.348 12.672 2 11.376 2 10c0-4.4 3.6-8 8-8s8 3.6 8 8z" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="action-count">${post.replies_count || 0}</span>
            </button>

            <button class="action-btn" onclick="repostPost('${post.post_id}')">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10h12M13 7l3 3-3 3M16 10h-12M7 13l-3-3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="action-count">${post.reposts_count || 0}</span>
            </button>

            <button class="action-btn" onclick="sharePost('${post.post_id}')">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 6.667a2.333 2.333 0 1 0 0-4.667 2.333 2.333 0 0 0 0 4.667zM5 12.333A2.333 2.333 0 1 0 5 7.667a2.333 2.333 0 0 0 0 4.666zM15 18a2.333 2.333 0 1 0 0-4.667A2.333 2.333 0 0 0 15 18z" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M7.158 11.008l5.684 3.317M12.842 5.342L7.158 8.658" stroke="currentColor" stroke-width="1.5"/>
                </svg>
            </button>
        </div>
    `;

    return card;
}

// === ROOMS LOADING ===

async function loadRooms() {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms?limit=10`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const rooms = await response.json();
        renderRooms(rooms);

        console.log(`🏠 Loaded ${rooms.length} rooms`);

    } catch (error) {
        console.error('❌ Error loading rooms:', error);
    }
}

function renderRooms(rooms) {
    const roomList = document.getElementById('room-list');

    if (!roomList) return;

    roomList.innerHTML = '';

    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.dataset.roomId = room.room_id;

        roomItem.innerHTML = `
            <div class="room-name">${room.name}</div>
            <div class="room-stats">
                <span>👥 ${room.members_count || 0}</span>
                <span>💬 ${room.posts_count || 0}</span>
            </div>
        `;

        roomItem.addEventListener('click', () => {
            document.querySelectorAll('.room-item').forEach(r => r.classList.remove('active'));
            roomItem.classList.add('active');
            // Filter feed by room (future implementation)
        });

        roomList.appendChild(roomItem);
    });
}

// === TRENDING CONTRACTS ===

async function loadTrendingContracts() {
    try {
        const response = await fetch(`${API_BASE_URL}/trending/contracts?limit=10`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const trending = await response.json();
        renderTrending(trending);

        console.log(`🔥 Loaded ${trending.length} trending contracts`);

    } catch (error) {
        console.error('❌ Error loading trending:', error);
    }
}

function renderTrending(contracts) {
    const trendingList = document.getElementById('trending-contracts');

    if (!trendingList) return;

    trendingList.innerHTML = '';

    if (contracts.length === 0) {
        trendingList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No trending contracts</p>';
        return;
    }

    contracts.forEach(contract => {
        const item = document.createElement('div');
        item.className = 'trending-item';

        item.innerHTML = `
            <div class="trending-contract">${contract.contract_symbol}</div>
            <div class="trending-stats">
                <span>${contract.underlying_symbol}</span>
                <span class="trending-mentions">${contract.mentions_count} mentions</span>
            </div>
        `;

        item.addEventListener('click', () => {
            // Filter feed by contract
            currentFilter.contract_symbol = contract.contract_symbol;
            currentFilter.offset = 0;
            hasMore = true;
            loadFeed(true);
        });

        trendingList.appendChild(item);
    });
}

// === LEADERBOARD ===

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/trending/users?limit=10`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const users = await response.json();
        renderLeaderboard(users);

        console.log(`🏆 Loaded ${users.length} leaderboard users`);

    } catch (error) {
        console.error('❌ Error loading leaderboard:', error);
    }
}

function renderLeaderboard(users) {
    const leaderboardList = document.getElementById('leaderboard');

    if (!leaderboardList) return;

    leaderboardList.innerHTML = '';

    if (users.length === 0) {
        leaderboardList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No users yet</p>';
        return;
    }

    users.forEach((user, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';

        let rankClass = '';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';

        item.innerHTML = `
            <div class="leader-rank ${rankClass}">${index + 1}</div>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_id}"
                 alt="${user.username}"
                 class="leader-avatar">
            <div class="leader-info">
                <div class="leader-name">${user.username}</div>
                <div class="leader-reputation">${user.reputation_score} pts • ${user.followers_count} followers</div>
            </div>
        `;

        leaderboardList.appendChild(item);
    });
}

// === POST ACTIONS ===

async function handleCreatePost() {
    const content = document.getElementById('post-content').value.trim();
    const contractSymbol = document.getElementById('contract-symbol').value.trim();
    const sentiment = document.getElementById('post-sentiment').value;
    const strategy = document.getElementById('post-strategy').value;

    if (!content) {
        alert('Please enter post content');
        return;
    }

    try {
        // TODO: Get actual user ID from authentication
        const userId = '00000000-0000-0000-0000-000000000000';

        const postData = {
            content,
            contract_symbol: contractSymbol || null,
            sentiment: sentiment || null,
            strategy: strategy || null,
            post_type: 'text'
        };

        const response = await fetch(`${API_BASE_URL}/posts?author_id=${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        console.log('✅ Post created:', result.data.post_id);

        // Close modal
        const modal = document.getElementById('create-post-modal');
        closeModal(modal);

        // Refresh feed
        loadFeed(true);

    } catch (error) {
        console.error('❌ Error creating post:', error);
        alert('Failed to create post. Please try again.');
    }
}

window.likePost = async function(postId, button) {
    try {
        // TODO: Get actual user ID from authentication
        const userId = '00000000-0000-0000-0000-000000000000';

        const response = await fetch(`${API_BASE_URL}/posts/${postId}/like?user_id=${userId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        button.classList.add('active');
        const countSpan = button.querySelector('.action-count');
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = currentCount + 1;
        }

    } catch (error) {
        console.error('❌ Error liking post:', error);
    }
};

window.replyPost = function(postId) {
    console.log('Reply to post:', postId);
    // TODO: Implement reply modal
};

window.repostPost = function(postId) {
    console.log('Repost:', postId);
    // TODO: Implement repost
};

window.sharePost = function(postId) {
    console.log('Share post:', postId);
    // TODO: Implement share
};

window.toggleGreeks = function(header) {
    const content = header.nextElementSibling;
    const toggle = header.querySelector('.greeks-toggle');

    if (content.classList.contains('open')) {
        content.classList.remove('open');
        toggle.classList.remove('open');
    } else {
        content.classList.add('open');
        toggle.classList.add('open');
    }
};

// === UTILITY FUNCTIONS ===

function formatSentiment(sentiment) {
    if (!sentiment) return 'Neutral';

    const sentimentMap = {
        'bullish_call': 'Bullish Call',
        'bearish_put': 'Bearish Put',
        'neutral': 'Neutral'
    };

    return sentimentMap[sentiment] || sentiment;
}

function formatPostContent(content) {
    // Convert hashtags to links
    content = content.replace(/#(\w+)/g, '<span style="color: var(--cyber-blue); font-weight: 600;">#$1</span>');

    // Convert mentions to links
    content = content.replace(/@(\w+)/g, '<span style="color: var(--tradefly-green); font-weight: 600;">@$1</span>');

    // Preserve line breaks
    content = content.replace(/\n/g, '<br>');

    return content;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

function handleInfiniteScroll() {
    if (isLoading || !hasMore) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 500;

    if (scrollPosition >= threshold) {
        loadFeed();
    }
}

function showError(message) {
    // TODO: Implement proper error toast notification
    console.error(message);
}

// === POLLING FOR REAL-TIME UPDATES ===

function startPolling() {
    pollingTimer = setInterval(() => {
        // Silently refresh trending and leaderboard
        loadTrendingContracts();
        loadLeaderboard();
        updateMarketStatus();
    }, POLLING_INTERVAL);
}

function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

// === MARKET STATUS ===

function updateMarketStatus() {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const statusText = document.getElementById('market-status-text');
    const statusTime = document.getElementById('market-time');
    const pulseDot = document.querySelector('.pulse-dot');

    if (!statusText || !statusTime || !pulseDot) return;

    // Weekend
    if (day === 0 || day === 6) {
        statusText.textContent = 'Market Closed';
        statusTime.textContent = 'Reopens Monday 9:30 AM ET';
        pulseDot.classList.remove('live');
        return;
    }

    // Market hours: 9:30 AM - 4:00 PM ET (simplified, not accounting for timezone)
    const currentMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        statusText.textContent = 'Market Open';
        statusTime.textContent = 'Closes at 4:00 PM ET';
        pulseDot.classList.add('live');
    } else if (currentMinutes < marketOpen) {
        const minutesUntilOpen = marketOpen - currentMinutes;
        const hoursUntil = Math.floor(minutesUntilOpen / 60);
        const minsUntil = minutesUntilOpen % 60;
        statusText.textContent = 'Pre-Market';
        statusTime.textContent = `Opens in ${hoursUntil}h ${minsUntil}m`;
        pulseDot.classList.remove('live');
    } else {
        statusText.textContent = 'After Hours';
        statusTime.textContent = 'Closed - Opens tomorrow 9:30 AM ET';
        pulseDot.classList.remove('live');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopPolling();
});
