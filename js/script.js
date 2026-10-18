/**
 * URT — Your Service Tracker Landing Page Script
 * Responsible for UI interactions:
 * 1. Responsive Mobile Navigation (with Animated Hamburger-to-X)
 * 2. Persona Showcase Tab Switching
 * 3. Monthly / Annual Pricing Toggle
 * 4. Tracking Sample Input Helper
 * 5. Smooth Section Scroll & Active Navigation State
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ==========================================================================
     1. Mobile Navigation Menu Toggle
     ========================================================================== */
  const navToggle = document.getElementById('navToggle');
  const primaryNav = document.getElementById('primaryNav');

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isExpanded));

      // Toggle dropdown and hamburger-to-X animation
      primaryNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-active');

      if (!isExpanded) {
        navToggle.setAttribute('aria-label', 'Tutup menu navigasi');
      } else {
        navToggle.setAttribute('aria-label', 'Buka menu navigasi');
      }
    });

    // Close mobile nav when clicking any nav link
    const navLinks = primaryNav.querySelectorAll('.site-nav__link');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (primaryNav.classList.contains('is-open')) {
          primaryNav.classList.remove('is-open');
          navToggle.classList.remove('is-active');
          navToggle.setAttribute('aria-expanded', 'false');
          navToggle.setAttribute('aria-label', 'Buka menu navigasi');
        }
      });
    });
  }

  /* ==========================================================================
     2. Persona Showcase Tabs (Owner / Technician / Customer)
     ========================================================================== */
  const personaTabs = document.querySelectorAll('.persona-tab');
  const personaPanels = document.querySelectorAll('.persona-panel');

  if (personaTabs.length > 0 && personaPanels.length > 0) {
    personaTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetPersona = tab.getAttribute('data-persona');

        // Deactivate all tabs
        personaTabs.forEach((t) => {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });

        // Hide all panels
        personaPanels.forEach((panel) => {
          panel.classList.remove('is-active');
          panel.hidden = true;
        });

        // Activate selected tab
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        // Show matching panel
        const activePanel = document.getElementById(`panel-${targetPersona}`);
        if (activePanel) {
          activePanel.classList.add('is-active');
          activePanel.hidden = false;
        }
      });

      // Keyboard navigation support between tabs
      tab.addEventListener('keydown', (e) => {
        const tabsArray = Array.from(personaTabs);
        const currentIndex = tabsArray.indexOf(tab);

        let targetIndex = null;
        if (e.key === 'ArrowRight') {
          targetIndex = (currentIndex + 1) % tabsArray.length;
        } else if (e.key === 'ArrowLeft') {
          targetIndex = (currentIndex - 1 + tabsArray.length) % tabsArray.length;
        }

        if (targetIndex !== null) {
          e.preventDefault();
          tabsArray[targetIndex].focus();
          tabsArray[targetIndex].click();
        }
      });
    });
  }

  /* ==========================================================================
     3. Pricing Billing Switcher (Monthly ↔ Annual)
     ========================================================================== */
  const btnMonthly = document.getElementById('btnBillingMonthly');
  const btnAnnual = document.getElementById('btnBillingAnnual');
  const monthlyAmount = document.querySelector('#priceMonthlyDisplay .pricing-value__amount');
  const monthlyBilledText = document.getElementById('priceMonthlyBilledText');

  if (btnMonthly && btnAnnual && monthlyAmount) {
    const setBillingCycle = (cycle) => {
      if (cycle === 'annual') {
        btnAnnual.classList.add('is-active');
        btnAnnual.setAttribute('aria-pressed', 'true');
        btnMonthly.classList.remove('is-active');
        btnMonthly.setAttribute('aria-pressed', 'false');

        // Show discounted equivalent rate
        monthlyAmount.textContent = monthlyAmount.getAttribute('data-annual');
        if (monthlyBilledText) {
          monthlyBilledText.textContent = 'Ditagih tahunan (Rp 999.000/tahun)';
        }
      } else {
        btnMonthly.classList.add('is-active');
        btnMonthly.setAttribute('aria-pressed', 'true');
        btnAnnual.classList.remove('is-active');
        btnAnnual.setAttribute('aria-pressed', 'false');

        // Show standard monthly rate
        monthlyAmount.textContent = monthlyAmount.getAttribute('data-monthly');
        if (monthlyBilledText) {
          monthlyBilledText.textContent = 'Ditagih setiap bulan';
        }
      }
    };

    btnMonthly.addEventListener('click', () => setBillingCycle('monthly'));
    btnAnnual.addEventListener('click', () => setBillingCycle('annual'));
  }

  /* ==========================================================================
     4. Quick Sample Ticket Fill Helper
     ========================================================================== */
  const btnFillDemoTicket = document.getElementById('btnFillDemoTicket');
  const ticketInput = document.getElementById('nomor-tiket');

  if (btnFillDemoTicket && ticketInput) {
    btnFillDemoTicket.addEventListener('click', () => {
      const demoTicket = btnFillDemoTicket.getAttribute('data-ticket') || 'URT-1024';
      ticketInput.value = demoTicket;
      ticketInput.focus();
    });
  }

  /* ==========================================================================
     5. Scroll Spy: Active Navigation Link Indicator
     ========================================================================== */
  const sections = document.querySelectorAll('main section[id]');
  const navLinkElements = document.querySelectorAll('.site-nav__link');

  if (sections.length > 0 && navLinkElements.length > 0 && 'IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          navLinkElements.forEach((link) => {
            const href = link.getAttribute('href');
            if (href === `#${currentId}`) {
              link.classList.add('is-active');
            } else if (href.startsWith('#')) {
              link.classList.remove('is-active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach((section) => sectionObserver.observe(section));
  }
});