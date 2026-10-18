(() => {
  "use strict";

  function setupTeknisiSidebar() {
    // Target the main sidebar header
    const header = document.querySelector("body > header");
    if (!header) return;

    let toggleBtn = header.querySelector(".sidebar-toggle");

    // Automatically inject hamburger button if not present in markup
    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "sidebar-toggle";
      toggleBtn.id = "teknisiSidebarToggle";
      toggleBtn.setAttribute("aria-label", "Menu navigasi");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.innerHTML = `
        <svg class="icon-hamburger" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;
      const nav = header.querySelector("nav");
      if (nav) {
        header.insertBefore(toggleBtn, nav);
      } else {
        header.appendChild(toggleBtn);
      }
    }

    if (toggleBtn && !toggleBtn.dataset.wired) {
      toggleBtn.dataset.wired = "true";

      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = header.classList.toggle("is-open");
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
      });

      // Close menu when clicking outside
      document.addEventListener("click", (e) => {
        if (header.classList.contains("is-open") && !header.contains(e.target)) {
          header.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
        }
      });

      // Close on Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && header.classList.contains("is-open")) {
          header.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
          toggleBtn.focus();
        }
      });

      // Close menu when any nav item is clicked
      header.querySelectorAll("nav a").forEach((link) => {
        link.addEventListener("click", () => {
          header.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupTeknisiSidebar);
  } else {
    setupTeknisiSidebar();
  }
})();
