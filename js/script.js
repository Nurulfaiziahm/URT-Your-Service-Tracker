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

  /* ==========================================================================
     6. Public Service Tracker (tracking_result.html)
     ========================================================================== */
  function initTrackingResultPage() {
    const displayTicketIdEl = document.getElementById('displayTicketId');
    if (!displayTicketIdEl) return;

    const urlParams = new URLSearchParams(window.location.search);
    const ticketQuery = urlParams.get('ticket');
    const defaultId = 'URT-2026-001';

    let targetId = defaultId;
    if (ticketQuery) {
      const raw = ticketQuery.trim().replace(/^#/, '').toUpperCase();
      if (raw) targetId = raw;
    }

    const ticket = (window.getTicketById && window.getTicketById(targetId)) ||
      (window.URT_DATA && window.URT_DATA.tickets.find(t => t.id === targetId)) ||
      (window.URT_DATA && window.URT_DATA.tickets[0]);

    if (!ticket) return;

    const customer = window.getCustomerById ? window.getCustomerById(ticket.customerId) : null;
    const technician = window.getTechnicianById ? window.getTechnicianById(ticket.technicianId) : null;

    displayTicketIdEl.textContent = '#' + ticket.id;
    const inputEl = document.getElementById('searchTicketInput');
    if (inputEl && ticketQuery) inputEl.value = '#' + ticket.id;

    const deviceEl = document.getElementById('displayDevice');
    if (deviceEl) deviceEl.textContent = ticket.device;

    const customerEl = document.getElementById('displayCustomer');
    if (customerEl && customer) customerEl.textContent = customer.name;

    const techEl = document.getElementById('displayTechnician');
    if (techEl && technician) techEl.textContent = technician.name;

    const statusBadge = document.getElementById('displayStatusBadge');
    const statusText = document.getElementById('displayStatusText');

    // Details cells
    const detailCells = document.querySelectorAll('.details-grid .detail-cell dd');
    if (detailCells.length >= 6) {
      detailCells[4].textContent = ticket.diagnosisSummary || ticket.issue;
      detailCells[5].textContent = window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : 'Rp' + ticket.estimatedCost;
    }

    // Stepper mapping
    const steps = document.querySelectorAll('.tracker-stepper .tracker-step');
    steps.forEach(s => {
      s.classList.remove('is-done', 'is-active');
      const circle = s.querySelector('.step-circle');
      if (circle) circle.textContent = circle.getAttribute('data-step') || circle.textContent;
    });

    let activeIndex = 2; // Default Persetujuan
    if (ticket.status === 'MASUK') activeIndex = 0;
    else if (ticket.status === 'DIAGNOSA') activeIndex = 1;
    else if (ticket.status === 'PERSETUJUAN') activeIndex = 2;
    else if (ticket.status === 'PENGERJAAN' || ticket.status === 'QC') activeIndex = 3;
    else if (ticket.status === 'SELESAI') activeIndex = 4;

    steps.forEach((step, idx) => {
      const circle = step.querySelector('.step-circle');
      if (idx < activeIndex) {
        step.classList.add('is-done');
        if (circle) circle.textContent = '✓';
      } else if (idx === activeIndex) {
        step.classList.add('is-active');
        if (ticket.status === 'SELESAI') {
          step.classList.remove('is-active');
          step.classList.add('is-done');
          if (circle) circle.textContent = '✓';
        }
      }
    });

    // Status Badge styling & Action banner
    const actionBanner = document.querySelector('.action-banner');
    if (ticket.status === 'SELESAI') {
      if (statusBadge) {
        statusBadge.style.background = '#dcfce7';
        statusBadge.style.color = '#15803d';
      }
      if (statusText) statusText.textContent = 'Servis Selesai & Siap Diambil';
      if (actionBanner) {
        actionBanner.style.background = '#f0fdf4';
        actionBanner.style.borderColor = '#bbf7d0';
        actionBanner.innerHTML = `
          <div>
            <h2 style="font-size: 15px; font-weight: 700; color: #166534; margin-bottom: 4px;">Perangkat Siap Diambil</h2>
            <p style="font-size: 13px; color: #15803d; margin: 0;">Pengerjaan servis ${ticket.device} telah selesai dan lulus uji Quality Control. Silakan ambil unit di counter ServisKita.</p>
          </div>
          <a href="pelanggan/beranda-pelanggan.html" class="btn btn--primary" style="padding: 10px 20px; font-size: 14px; white-space: nowrap; background: #16a34a; border-color: #16a34a;">
            Buka Portal Pelanggan &rarr;
          </a>
        `;
      }
    } else if (ticket.status === 'PERSETUJUAN') {
      if (statusBadge) {
        statusBadge.style.background = '#fef3c7';
        statusBadge.style.color = '#b45309';
      }
      if (statusText) statusText.textContent = 'Menunggu Persetujuan Biaya';
      if (actionBanner) {
        const formattedCost = window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : 'Rp' + ticket.estimatedCost;
        actionBanner.innerHTML = `
          <div>
            <h2 style="font-size: 15px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">Tindakan Perlu Persetujuan Anda</h2>
            <p style="font-size: 13px; color: #3b82f6; margin: 0;">Teknisi telah menyelesaikan diagnosis dan memerlukan persetujuan estimasi ${formattedCost} sebelum pekerjaan dimulai.</p>
          </div>
          <a href="pelanggan/persetujuan-servis.html?id=${ticket.id}" class="btn btn--primary" style="padding: 10px 20px; font-size: 14px; white-space: nowrap;">
            Tinjau & Setujui Biaya &rarr;
          </a>
        `;
      }
    } else {
      if (statusBadge) {
        statusBadge.style.background = '#dbeafe';
        statusBadge.style.color = '#1d4ed8';
      }
      if (statusText) statusText.textContent = ticket.statusLabel || ticket.status;
      if (actionBanner) {
        actionBanner.innerHTML = `
          <div>
            <h2 style="font-size: 15px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">Unit Sedang Dalam Penanganan</h2>
            <p style="font-size: 13px; color: #3b82f6; margin: 0;">Teknisi ${technician ? technician.name : 'kami'} sedang menangani perangkat ${ticket.device}. Anda akan menerima pemberitahuan otomatis setelah tahap selesai.</p>
          </div>
          <a href="pelanggan/beranda-pelanggan.html" class="btn btn--primary" style="padding: 10px 20px; font-size: 14px; white-space: nowrap;">
            Buka Portal Pelanggan &rarr;
          </a>
        `;
      }
    }
  }

  initTrackingResultPage();
});
