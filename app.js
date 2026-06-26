/**
 * AetherFlow - Core Web Operations
 * Implementation of performance-isolated pricing calculations
 * and context-locked Bento-to-Accordion transitions.
 */

// --- PERFORMANCE-ISOLATED PRICING MATRIX CONFIGURATION ---
const PRICING_MATRIX = {
  currencies: {
    USD: { symbol: '$', rate: 1.0, subtextFormat: 'Billed annually ({symbol}{val}/yr)' },
    EUR: { symbol: '€', rate: 0.92, subtextFormat: 'Billed annually ({symbol}{val}/yr)' },
    INR: { symbol: '₹', rate: 83.5, subtextFormat: 'Billed annually ({symbol}{val}/yr)' }
  },
  tiers: {
    starter: { baseUSD: 19 },
    pro: { baseUSD: 49 },
    enterprise: { baseUSD: 149 }
  },
  discount: 0.20 // 20% flat discount on yearly billing
};

// Pricing state variables
let currentCurrency = 'USD';
let currentBilling = 'monthly';

// Pre-cached references to specific price DOM nodes for strict state isolation
let pricingUI = {};

function initPricingUI() {
  pricingUI = {
    starter: {
      val: document.getElementById('starter-value'),
      sym: document.getElementById('starter-symbol'),
      sub: document.getElementById('starter-subtext')
    },
    pro: {
      val: document.getElementById('pro-value'),
      sym: document.getElementById('pro-symbol'),
      sub: document.getElementById('pro-subtext')
    },
    enterprise: {
      val: document.getElementById('enterprise-value'),
      sym: document.getElementById('enterprise-symbol'),
      sub: document.getElementById('enterprise-subtext')
    }
  };
}

/**
 * Calculates and updates prices in the DOM in an isolated manner.
 * Only targets specific value and symbol text nodes to prevent global document reflows.
 */
function updatePricingDisplay() {
  if (!pricingUI.starter) return;

  const currInfo = PRICING_MATRIX.currencies[currentCurrency];
  const symbol = currInfo.symbol;
  const rate = currInfo.rate;
  const discount = PRICING_MATRIX.discount;

  for (const [tierId, tierData] of Object.entries(PRICING_MATRIX.tiers)) {
    const baseUSD = tierData.baseUSD;
    let finalMonthlyPrice = baseUSD * rate;
    let subtextVal = '';

    if (currentBilling === 'yearly') {
      // Annual discount applies to the monthly equivalent rate
      finalMonthlyPrice = finalMonthlyPrice * (1 - discount);
      // Total annual billing amount calculation
      const annualTotalVal = Math.round(baseUSD * rate * (1 - discount) * 12);
      subtextVal = currInfo.subtextFormat.replace('{symbol}', symbol).replace('{val}', annualTotalVal);
    } else {
      subtextVal = '&nbsp;'; // Reserve space to avoid layout shifts
    }

    const roundedVal = Math.round(finalMonthlyPrice);
    const ui = pricingUI[tierId];

    // Only modify DOM nodes if the value has changed to minimize painting
    if (ui.val.textContent !== String(roundedVal)) {
      ui.val.textContent = roundedVal;
    }
    if (ui.sym.textContent !== symbol) {
      ui.sym.textContent = symbol;
    }
    if (ui.sub.innerHTML !== subtextVal) {
      ui.sub.innerHTML = subtextVal;
    }
  }
}

// --- BENTO-TO-ACCORDION CONTEXT LOCK TRANSITION ---
const BREAKPOINT = 768;
let activeFeatureIndex = 0; // Tracks active item index (0-3)
let isMobileView = window.innerWidth < BREAKPOINT;
let cards = [];

function initBentoAccordion() {
  cards = document.querySelectorAll('.feature-card');
  
  cards.forEach((card, index) => {
    // MouseMove for premium cursor-tracking glow spotlight
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });

    // Desktop: Track hover / active focus state index
    card.addEventListener('mouseenter', () => {
      if (window.innerWidth >= BREAKPOINT) {
        activeFeatureIndex = index;
        updateBentoActiveState();
      }
    });

    card.addEventListener('focusin', () => {
      if (window.innerWidth >= BREAKPOINT) {
        activeFeatureIndex = index;
        updateBentoActiveState();
      }
    });

    // Mobile: Accordion title-area click handler
    const titleArea = card.querySelector('.card-title-area');
    if (titleArea) {
      titleArea.addEventListener('click', () => {
        if (window.innerWidth < BREAKPOINT) {
          if (card.classList.contains('active')) {
            // Collapse if clicked again
            card.classList.remove('active');
          } else {
            // Collapse all and expand clicked card
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            activeFeatureIndex = index;
          }
        }
      });
    }
  });

  // Run initial layout state syncer
  syncLayoutState();
}

/**
 * Updates visual classes for Bento grid cells in desktop mode.
 */
function updateBentoActiveState() {
  cards.forEach((card, index) => {
    if (index === activeFeatureIndex) {
      card.classList.add('active-hover');
    } else {
      card.classList.remove('active-hover');
    }
  });
}

/**
 * Automatically locks context indexes when switching between layouts.
 * If user hovers Card 3 on desktop and resizes, Card 3 Accordion opens on mobile.
 */
function syncLayoutState() {
  if (isMobileView) {
    // Transitioning to Mobile view: Set active accordion item matching active index
    cards.forEach((card, index) => {
      card.classList.remove('active-hover');
      if (index === activeFeatureIndex) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  } else {
    // Transitioning to Desktop view: Remove mobile accordion active classes and update bento hls
    cards.forEach(card => card.classList.remove('active'));
    updateBentoActiveState();
  }
}

// --- VIEWPORT MONITORING ---
function initResizeObserver() {
  // Utilizing a ResizeObserver on body to handle width crossings smoothly
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const width = entry.contentRect.width;
      const nowMobile = width < BREAKPOINT;
      if (nowMobile !== isMobileView) {
        isMobileView = nowMobile;
        syncLayoutState();
      }
    }
  });
  resizeObserver.observe(document.body);
}

// --- INTERACTIVE CONTROLS LISTENERS ---
function initControls() {
  // Billing cycle toggles
  const billingToggleContainer = document.getElementById('billing-toggle-container');
  const monthlyBtn = document.getElementById('toggle-monthly-btn');
  const yearlyBtn = document.getElementById('toggle-yearly-btn');

  if (billingToggleContainer && monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener('click', () => {
      if (currentBilling !== 'monthly') {
        currentBilling = 'monthly';
        billingToggleContainer.classList.remove('yearly');
        monthlyBtn.classList.add('active');
        yearlyBtn.classList.remove('active');
        updatePricingDisplay();
      }
    });

    yearlyBtn.addEventListener('click', () => {
      if (currentBilling !== 'yearly') {
        currentBilling = 'yearly';
        billingToggleContainer.classList.add('yearly');
        yearlyBtn.classList.add('active');
        monthlyBtn.classList.remove('active');
        updatePricingDisplay();
      }
    });
  }

  // Currency Dropdown
  const dropdownWrapper = document.getElementById('currency-dropdown');
  const dropdownTrigger = document.getElementById('dropdown-trigger-btn');
  const currencyLabel = document.getElementById('selected-currency-label');
  const dropdownItems = document.querySelectorAll('.dropdown-item');

  if (dropdownTrigger && dropdownWrapper) {
    // Toggle dropdown open
    dropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownWrapper.classList.toggle('open');
      dropdownTrigger.setAttribute('aria-expanded', dropdownWrapper.classList.contains('open'));
    });

    // Option selections
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value');
        currentCurrency = val;
        
        // Update label text
        currencyLabel.textContent = item.textContent;

        // Manage active classes
        dropdownItems.forEach(i => {
          i.classList.remove('selected');
          i.setAttribute('aria-selected', 'false');
        });
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');

        // Close dropdown
        dropdownWrapper.classList.remove('open');
        dropdownTrigger.setAttribute('aria-expanded', 'false');

        // Trigger pricing recalculation
        updatePricingDisplay();
      });
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => {
      if (dropdownWrapper.classList.contains('open')) {
        dropdownWrapper.classList.remove('open');
        dropdownTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

// --- ENTRANCE ORCHESTRATION TIMELINE (<500ms) ---
window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  
  // Initialize modules
  initPricingUI();
  initBentoAccordion();
  initControls();
  initResizeObserver();

  // Fade out loader after initialization to prevent loading blockages
  setTimeout(() => {
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.visibility = 'hidden';
      }, 250);
    }
  }, 100);
});
