/**
 * URT (Your Service Tracker) - Core Auth & Form Logic
 * Technical Implementation: English
 * Visible UI Text: Indonesian
 */

// PROTOTYPE ONLY: Production authentication must be handled by the backend.

document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();
  initRegistrationForm();
  initSubscriptionPage();
  initLoginForm();
  initCustomerRegisterForm();
});

/**
 * Handle show/hide password toggle buttons
 */
function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll(".toggle-password");
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.getAttribute("type") === "password";
      input.setAttribute("type", isPassword ? "text" : "password");

      // Update Lucide SVG icon stroke or path
      btn.innerHTML = isPassword
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
  });
}

/**
 * Page 1: Validate and process owner registration
 */
function initRegistrationForm() {
  const form = document.getElementById("ownerRegistrationForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (validateRegistration()) {
      saveRegistration();
      window.location.href = "subscription.html";
    }
  });
}

function validateRegistration() {
  let isValid = true;

  const businessName = document.getElementById("businessName");
  const ownerName = document.getElementById("ownerName");
  const whatsapp = document.getElementById("whatsapp");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const termsCheckbox = document.getElementById("termsCheckbox");

  clearError("businessName");
  clearError("ownerName");
  clearError("whatsapp");
  clearError("email");
  clearError("password");
  clearError("confirmPassword");
  clearError("termsCheckbox");

  if (!businessName.value.trim()) {
    setError("businessName", "Nama Usaha wajib diisi");
    isValid = false;
  }

  if (!ownerName.value.trim()) {
    setError("ownerName", "Nama Pemilik wajib diisi");
    isValid = false;
  }

  if (!whatsapp.value.trim()) {
    setError("whatsapp", "Nomor WhatsApp wajib diisi");
    isValid = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value.trim()) {
    setError("email", "Email wajib diisi");
    isValid = false;
  } else if (!emailRegex.test(email.value.trim())) {
    setError("email", "Format email tidak valid");
    isValid = false;
  }

  if (!password.value) {
    setError("password", "Kata sandi wajib diisi");
    isValid = false;
  } else if (password.value.length < 8) {
    setError("password", "Kata sandi minimal 8 karakter");
    isValid = false;
  }

  if (!confirmPassword.value) {
    setError("confirmPassword", "Konfirmasi kata sandi wajib diisi");
    isValid = false;
  } else if (password.value !== confirmPassword.value) {
    setError("confirmPassword", "Konfirmasi kata sandi tidak cocok");
    isValid = false;
  }

  if (!termsCheckbox.checked) {
    setError("termsCheckbox", "Anda harus menyetujui syarat & kebijakan");
    isValid = false;
  }

  return isValid;
}

function setError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (input && input.classList) input.classList.add("is-invalid");
  if (errorEl) errorEl.textContent = message;
}

function clearError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (input && input.classList) input.classList.remove("is-invalid");
  if (errorEl) errorEl.textContent = "";
}

function saveRegistration() {
  const businessName = document.getElementById("businessName").value.trim();
  const ownerName = document.getElementById("ownerName").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const email = document.getElementById("email").value.trim();

  // PROTOTYPE ONLY:
  // Production authentication must be handled by the backend.
  localStorage.setItem(
    "urt_registration",
    JSON.stringify({
      businessName,
      ownerName,
      whatsapp,
      email,
    }),
  );
}

function loadRegistration() {
  const raw = localStorage.getItem("urt_registration");
  return raw ? JSON.parse(raw) : null;
}

/**
 * Page 2: Select Subscription Plan
 */
function initSubscriptionPage() {
  const businessNameTarget = document.getElementById("subBusinessName");
  if (businessNameTarget) {
    const reg = loadRegistration();
    if (reg && reg.businessName) {
      businessNameTarget.textContent = reg.businessName;
    }
  }

  const btnMonthly = document.getElementById("btnSelectMonthly");
  if (btnMonthly) {
    btnMonthly.addEventListener("click", () => {
      selectPlan("monthly", 99000, 30);
    });
  }

  const btnYearly = document.getElementById("btnSelectYearly");
  if (btnYearly) {
    btnYearly.addEventListener("click", () => {
      selectPlan("yearly", 999000, 365);
    });
  }
}

function selectPlan(plan, price, duration) {
  localStorage.setItem(
    "urt_subscription",
    JSON.stringify({
      plan,
      price,
      duration,
    }),
  );
  window.location.href = "payment.html";
}

function loadSubscription() {
  const raw = localStorage.getItem("urt_subscription");
  return raw
    ? JSON.parse(raw)
    : { plan: "monthly", price: 99000, duration: 30 };
}

/**
 * Page 4: Login Form Handling
 */
function initLoginForm() {
  const form = document.getElementById("ownerLoginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    let valid = true;
    clearError("loginEmail");
    clearError("loginPassword");

    if (!email) {
      setError("loginEmail", "Email wajib diisi");
      valid = false;
    }
    if (!password) {
      setError("loginPassword", "Password wajib diisi");
      valid = false;
    }

    if (valid) {
      window.location.href = "beranda-owner.html";
    }
  });
}

/**
 * Customer Registration Form handler (registrasi.html)
 */
function initCustomerRegisterForm() {
  const form = document.getElementById("customerRegisterForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let isValid = true;

    ["regName", "regEmail", "regPhone", "regPassword"].forEach((id) => {
      const errEl = document.getElementById(id + "Error");
      if (errEl) errEl.textContent = "";
      const inp = document.getElementById(id);
      if (inp) inp.classList.remove("is-invalid");
    });

    const name = document.getElementById("regName")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim();
    const phone = document.getElementById("regPhone")?.value.trim();
    const password = document.getElementById("regPassword")?.value;

    if (!name) {
      const err = document.getElementById("regNameError");
      if (err) err.textContent = "Nama lengkap wajib diisi.";
      document.getElementById("regName")?.classList.add("is-invalid");
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      const err = document.getElementById("regEmailError");
      if (err) err.textContent = "Email wajib diisi.";
      document.getElementById("regEmail")?.classList.add("is-invalid");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      const err = document.getElementById("regEmailError");
      if (err) err.textContent = "Format email tidak valid.";
      document.getElementById("regEmail")?.classList.add("is-invalid");
      isValid = false;
    }

    if (!phone) {
      const err = document.getElementById("regPhoneError");
      if (err) err.textContent = "Nomor WhatsApp wajib diisi.";
      document.getElementById("regPhone")?.classList.add("is-invalid");
      isValid = false;
    } else if (phone.replace(/\D/g, "").length < 9) {
      const err = document.getElementById("regPhoneError");
      if (err) err.textContent = "Nomor WhatsApp minimal 9 digit.";
      document.getElementById("regPhone")?.classList.add("is-invalid");
      isValid = false;
    }

    if (!password) {
      const err = document.getElementById("regPasswordError");
      if (err) err.textContent = "Kata sandi wajib diisi.";
      document.getElementById("regPassword")?.classList.add("is-invalid");
      isValid = false;
    } else if (password.length < 6) {
      const err = document.getElementById("regPasswordError");
      if (err) err.textContent = "Kata sandi minimal 6 karakter.";
      document.getElementById("regPassword")?.classList.add("is-invalid");
      isValid = false;
    }

    if (isValid) {
      const toast = document.getElementById("toastSuccess");
      if (toast) toast.style.display = "flex";
      setTimeout(() => {
        window.location.href = "pelanggan/beranda-pelanggan.html";
      }, 800);
    }
  });
}

// Print receipt handler
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".btn-print")?.addEventListener("click", () => {
    window.print();
  });
});
