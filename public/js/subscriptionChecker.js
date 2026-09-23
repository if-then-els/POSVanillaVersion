// Unified Subscription Checker - Single Source of Truth for Subscription Validation
// This script prevents race conditions and ensures consistent subscription checking across all pages

(async function() {
  'use strict';
  
  // --- Configuration ---
  const CONFIG = {
    DAYS_UNTIL_EXPIRY_WARNING: 7,
    BANNER_ID: 'subscription-banner',
    MODAL_ID: 'subscription-inactive-modal',
    TOAST_CONTAINER_ID: 'toast-container',
    CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
    API_ENDPOINT: '/subscriptions/details'
  };

  // Pages where the blocking "Subscription Expired" overlay must NEVER appear,
  // so users can actually renew / purchase a plan.
  const EXEMPT_PAGES = [
    'managesubscriptions.html',
    'paymentconfigurations.html'
  ];

  function isExemptPage() {
    try {
      const path = (window.location.pathname || '').toLowerCase();
      return EXEMPT_PAGES.some((p) => path.endsWith(p));
    } catch (e) {
      return false;
    }
  }

  // Set once we decide the session is dead - stops all further
  // subscription enforcement (no locking, no modal, no toasts).
  let sessionRedirecting = false;

  // True when an HTTP failure means "not logged in" rather than
  // "no subscription". Those must go to login, never to the
  // "Subscription Expired" overlay.
  function isAuthError(status, message) {
    if (status === 401) return true;
    if (status === 403) {
      return /token|auth|unauthorized|login|session|forbidden/i.test(
        String(message || ''),
      );
    }
    return false;
  }

  // Session expired/invalid -> log the user out to the login page.
  // Never show the subscription overlay for this case.
  function handleSessionExpired() {
    if (sessionRedirecting) return;
    sessionRedirecting = true;
    setModalVisibility(false);
    try {
      const path = (window.location.pathname || '').toLowerCase();
      if (path.endsWith('login.html') || path.endsWith('/login')) return;
    } catch (e) { /* fall through to redirect */ }
    console.warn('Session expired - redirecting to login.');
    window.location.href = '/login.html?session=expired';
  }

  // --- Global State ---
  let globalSubscriptionState = {
    subscription: null,
    isActive: false,
    isExpired: true,
    daysUntilExpiry: 0,
    expiryDate: null,
    lastChecked: null
  };

  // --- HTML Templates ---
  const MODAL_HTML = `
    <!-- Toast notification container -->
    <div id="${CONFIG.TOAST_CONTAINER_ID}" class="fixed top-6 left-1/2 transform -translate-x-1/2 z-[999] space-y-2"></div>
    
    <!-- Subscription Inactive Modal -->
    <div id="${CONFIG.MODAL_ID}" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] hidden flex items-center justify-center">
        <div class="glass-dark rounded-3xl p-8 max-w-md w-full text-center relative animate-scale-in">
            <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-6"></i>
            <h2 class="text-2xl font-bold text-white mb-4">Subscription Expired!</h2>
            <p class="text-gray-300 mb-6">Your subscription has expired or is inactive. Please renew your plan to continue using this functionalities.</p>
            <a href="/manageSubscriptions.html" class="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 inline-flex items-center">
                <i class="fas fa-dollar-sign mr-2"></i> Manage Subscription
            </a>
        </div>
    </div>
  `;

  const STYLES = `
    <style>
      @keyframes slide-down {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
      @keyframes scale-in {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      #${CONFIG.BANNER_ID} {
        animation: slide-down 0.5s ease-out forwards;
      }
      #${CONFIG.MODAL_ID} .animate-scale-in {
        animation: scale-in 0.3s ease-out forwards;
      }
    </style>
  `;

  // --- Core Functions ---

  /**
   * Fetches subscription details from server.
   * Returns { subscription } on success (subscription may be null),
   * { sessionExpired: true } when the user is no longer logged in,
   * or { fetchError: true } on network/unexpected failures.
   */
  async function fetchSubscriptionDetails() {
    try {
      const response = await fetch(CONFIG.API_ENDPOINT, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return { subscription: data.subscription || null };
      }

      let message = '';
      try {
        const errData = await response.json();
        message = errData.message || '';
      } catch (_) {
        message = response.statusText || '';
      }

      // Logged-out / expired session -> login page, NOT the subscription modal.
      if (isAuthError(response.status, message)) {
        console.warn('Session invalid (' + response.status + '): ' + message);
        return { sessionExpired: true };
      }

      if (response.status === 403 || response.status === 404) {
        console.log('No active subscription found.');
        return { subscription: null };
      }

      throw new Error(`Failed to fetch subscription details: ${response.statusText}`);
    } catch (error) {
      // fetch() itself threw (network down, server unreachable, ...)
      if (error && error.sessionExpired) return { sessionExpired: true };
      console.error('Error fetching subscription details:', error);
      return { fetchError: true };
    }
  }

  /**
   * Calculates comprehensive subscription status
   */
  function calculateSubscriptionStatus(subscription) {
    const now = new Date();
    
    if (!subscription || subscription.status !== 'active') {
      return {
        isActive: false,
        isExpired: true,
        daysUntilExpiry: 0,
        expiryDate: null,
        status: 'inactive'
      };
    }

    const expiryDate = new Date(subscription.endDate);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    const isExpired = daysUntilExpiry <= 0;
    const isActive = subscription.status === 'active' && !isExpired;

    return {
      isActive,
      isExpired,
      daysUntilExpiry,
      expiryDate,
      status: isExpired ? 'expired' : 'active'
    };
  }

  /**
   * Updates global subscription state.
   * Returns null when redirecting to login (caller must skip enforcement).
   */
  async function updateSubscriptionState() {
    const result = await fetchSubscriptionDetails();

    if (result.sessionExpired) {
      handleSessionExpired();
      return null;
    }

    if (result.fetchError) {
      // Can't reach the server - keep the previous state instead of
      // assuming the subscription died. Enforcement uses last known state.
      console.warn('Subscription check failed (network?). Keeping last known state.');
      return globalSubscriptionState;
    }

    const subscription = result.subscription;
    const status = calculateSubscriptionStatus(subscription);
    
    globalSubscriptionState = {
      subscription,
      ...status,
      lastChecked: new Date()
    };

    console.log('Subscription state updated:', globalSubscriptionState);
    return globalSubscriptionState;
  }

  /**
   * Shows toast notification
   */
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById(CONFIG.TOAST_CONTAINER_ID);
    if (!toastContainer) return;

    const colors = {
      success: 'from-success-500 to-success-600',
      error: 'from-red-500 to-red-600',
      warning: 'from-yellow-500 to-yellow-600',
      info: 'from-primary-500 to-primary-600'
    };

    const icon = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `glass-dark rounded-xl p-4 text-white font-medium transform transition-all duration-300 animate-slide-in border-l-4 border-${type}-500`;
    toast.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="fas fa-${icon[type]} text-${type}-400"></i>
        <span>${message}</span>
      </div>
    `;

    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * Locks restricted features
   */
  function lockFeatures() {
    console.log('Locking features - subscription inactive/expired');
    const restrictedElements = document.querySelectorAll('[data-requires-subscription="true"]');
    restrictedElements.forEach(element => {
      element.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
    });
  }

  /**
   * Unlocks restricted features
   */
  function unlockFeatures() {
    console.log('Unlocking features - subscription active');
    const restrictedElements = document.querySelectorAll('[data-requires-subscription="true"]');
    restrictedElements.forEach(element => {
      element.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
    });
  }

  /**
   * Shows expiry notification banner
   */
  function showExpiryNotification() {
    // No banner needed on the page where users renew (it links to itself).
    if (isExemptPage()) {
      const existingBanner = document.getElementById(CONFIG.BANNER_ID);
      if (existingBanner) existingBanner.remove();
      return;
    }

    const existingBanner = document.getElementById(CONFIG.BANNER_ID);
    if (existingBanner) existingBanner.remove();

    let message, type;
    
    if (globalSubscriptionState.isExpired) {
      message = 'Your subscription has expired. Services are now limited. Please renew to restore full access.';
      type = 'error';
    } else if (globalSubscriptionState.daysUntilExpiry <= CONFIG.DAYS_UNTIL_EXPIRY_WARNING) {
      message = `Your subscription will expire in ${globalSubscriptionState.daysUntilExpiry} day${globalSubscriptionState.daysUntilExpiry === 1 ? '' : 's'}. Please renew to avoid service interruption.`;
      type = 'warning';
    } else {
      return; // No notification needed
    }

    const bannerHtml = `
      <div id="${CONFIG.BANNER_ID}" class="fixed top-0 left-0 right-0 bg-gradient-to-r ${type === 'error' ? 'from-red-600 to-red-700' : 'from-yellow-600 to-yellow-700'} text-white py-3 px-4 text-center z-50">
        <p class="text-sm font-medium">${message}</p>
        <a href="/manageSubscriptions.html" class="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-${type === 'error' ? 'red' : 'yellow'}-700 bg-white hover:bg-gray-100">
          Renew Now
        </a>
      </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', bannerHtml);
  }

  /**
   * Shows/hides subscription inactive modal
   */
  function setModalVisibility(visible) {
    const modal = document.getElementById(CONFIG.MODAL_ID);
    if (modal) {
      // Exempt pages must never show the blocking overlay.
      if (isExemptPage()) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        modal.remove();
        return;
      }
      if (visible) {
        modal.classList.remove('hidden');
      } else {
        modal.classList.add('hidden');
      }
    }
  }

  /**
   * Main enforcement function - applies subscription rules
   */
  function enforceSubscriptionRules() {
    // Session is dead and we're heading to login - do nothing here.
    if (sessionRedirecting) return;

    // NEVER block exempt pages (e.g. Subscription Hub) - users must be able
    // to interact with the page to renew/purchase a plan.
    if (isExemptPage()) {
      unlockFeatures();
      setModalVisibility(false);
      return;
    }

    if (globalSubscriptionState.isActive) {
      unlockFeatures();
      showExpiryNotification();
      setModalVisibility(false);
    } else {
      lockFeatures();
      setModalVisibility(true);
      
      if (globalSubscriptionState.isExpired) {
        showToast('Your subscription has expired. Features are limited.', 'error');
      } else {
        showToast('Your subscription is inactive. Features are limited.', 'error');
      }
    }
  }

  /**
   * Initial check and setup
   */
  async function initializeSubscriptionChecker() {
    // Inject HTML templates
    document.body.insertAdjacentHTML('afterbegin', MODAL_HTML + STYLES);

    try {
      const state = await updateSubscriptionState();
      if (state === null) return; // redirecting to login
      enforceSubscriptionRules();
      
      // Set up periodic checking
      setInterval(async () => {
        const s = await updateSubscriptionState();
        if (s === null) return; // redirecting to login
        enforceSubscriptionRules();
      }, CONFIG.CHECK_INTERVAL);

    } catch (error) {
      console.error('Failed to initialize subscription checker:', error);
      if (sessionRedirecting) return; // heading to login - no modal
      // Fail-safe: lock features if we can't determine status
      // ...unless we're on an exempt page (must stay usable to renew).
      if (isExemptPage()) {
        unlockFeatures();
        setModalVisibility(false);
        return;
      }
      lockFeatures();
      setModalVisibility(true);
      showToast('Could not verify subscription status. Features are limited.', 'error');
    }
  }

  // --- Public API ---
  window.SubscriptionManager = {
    getCurrentState: () => ({...globalSubscriptionState}),
    forceRefresh: updateSubscriptionState,
    isActive: () => globalSubscriptionState.isActive,
    getDaysUntilExpiry: () => globalSubscriptionState.daysUntilExpiry,
    isExpired: () => globalSubscriptionState.isExpired
  };

  // --- Initialize on DOM Ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSubscriptionChecker);
  } else {
    initializeSubscriptionChecker();
  }

})();