document.addEventListener("DOMContentLoaded", () => {
  initViewSwitcher();
  initPasswordToggle();
  initLoginForm();
  initForgotPasswordForm();
});

// Transisi antara Form Login dan Form Lupa Password
function initViewSwitcher() {
  const loginView = document.getElementById("loginView");
  const forgotView = document.getElementById("forgotView");
  const btnGoToForgot = document.getElementById("btnGoToForgot");
  const btnGoToLogin = document.getElementById("btnGoToLogin");

  if (btnGoToForgot) {
    btnGoToForgot.addEventListener("click", () => {
      loginView.classList.add("hidden");
      forgotView.classList.remove("hidden");
      clearErrors();
    });
  }

  if (btnGoToLogin) {
    btnGoToLogin.addEventListener("click", () => {
      forgotView.classList.add("hidden");
      loginView.classList.remove("hidden");
      clearErrors();
    });
  }
}

function initPasswordToggle() {
  const toggleBtn = document.querySelector(".toggle-password");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const targetId = toggleBtn.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;

    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";

    toggleBtn.innerHTML = isPassword
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  });
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    let isValid = true;
    clearError("loginEmail");
    clearError("loginPassword");

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim()) {
      setError("loginEmail", "Email wajib diisi");
      isValid = false;
    } else if (!emailPattern.test(emailInput.value.trim())) {
      setError("loginEmail", "Format email tidak valid");
      isValid = false;
    }

    if (!passwordInput.value) {
      setError("loginPassword", "Password wajib diisi");
      isValid = false;
    }

    if (isValid) {
      // Simulasi berhasil login, arahkan ke beranda portal yang sesuai
      window.location.href = "../teknisi/beranda-teknisi.html";
    }
  });
}

function initForgotPasswordForm() {
  const form = document.getElementById("forgotPasswordForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("forgotEmail");
    const successBanner = document.getElementById("successBanner");
    const infoBanner = document.getElementById("infoBanner");
    const submitBtn = document.getElementById("btnSubmitForgot");

    clearError("forgotEmail");

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim()) {
      setError("forgotEmail", "Email wajib diisi");
      return;
    } else if (!emailPattern.test(emailInput.value.trim())) {
      setError("forgotEmail", "Format email tidak valid");
      return;
    }

    if (successBanner) {
      document.getElementById("sentEmailTarget").textContent =
        emailInput.value.trim();
      successBanner.classList.remove("hidden");
    }
    if (infoBanner) {
      infoBanner.classList.add("hidden");
    }

    emailInput.disabled = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Tautan Terkirim";
      submitBtn.style.opacity = "0.7";
      submitBtn.style.cursor = "not-allowed";
    }
  });
}

function setError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (input) input.classList.add("is-invalid");
  if (errorEl) errorEl.textContent = message;
}

function clearError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (input) input.classList.remove("is-invalid");
  if (errorEl) errorEl.textContent = "";
}

function clearErrors() {
  clearError("loginEmail");
  clearError("loginPassword");
  clearError("forgotEmail");
}
