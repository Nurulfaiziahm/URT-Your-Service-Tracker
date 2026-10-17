/**
 * URT (Your Service Tracker) - Dynamic QR Payment Logic
 * Technical Implementation: English
 * Visible UI Text: Indonesian
 */

// PROTOTYPE ONLY
// Production payment status must be verified server-side.

/**
 * Centralized QR configuration
 */
const QR_CONFIG = {
  baseUrl: "/owner/payment-success.html",
};

function generatePaymentUrl(orderId) {
  return `${window.location.origin}${QR_CONFIG.baseUrl}?order=${encodeURIComponent(orderId)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("paymentContainer")) {
    initPaymentPage();
  }

  if (document.getElementById("paymentSuccessContainer")) {
    initPaymentSuccessPage();
  }
});

/**
 * Page 3: Payment Page Initializer
 */
function initPaymentPage() {
  renderPaymentSummary();
  setupPaymentMethodSelection();
  setupPaymentExecution();
}

function renderPaymentSummary() {
  const reg = JSON.parse(localStorage.getItem("urt_registration") || "{}");
  const sub = JSON.parse(
    localStorage.getItem("urt_subscription") ||
      '{"plan":"monthly","price":99000,"duration":30}',
  );
  const isYearly = sub.plan === "yearly";

  const businessName = reg.businessName || "ServisKita";

  // Elements
  const summaryPlanTitle = document.getElementById("summaryPlanTitle");
  const summaryBusinessOwner = document.getElementById("summaryBusinessOwner");
  const summaryDuration = document.getElementById("summaryDuration");
  const summaryPrice = document.getElementById("summaryPrice");
  const summaryTotal = document.getElementById("summaryTotal");
  const discountBadgeWrap = document.getElementById("discountBadgeWrap");

  if (summaryPlanTitle)
    summaryPlanTitle.textContent = isYearly ? "Paket Tahunan" : "Paket Bulanan";
  if (summaryBusinessOwner)
    summaryBusinessOwner.textContent = `${businessName} • Pemilik Usaha`;
  if (summaryDuration)
    summaryDuration.textContent = isYearly ? "12 bulan" : "30 Hari";
  if (summaryPrice)
    summaryPrice.textContent = isYearly ? "Rp999.000" : "Rp99.000";
  if (summaryTotal)
    summaryTotal.textContent = isYearly ? "Rp999.000" : "Rp99.000";

  if (discountBadgeWrap) {
    discountBadgeWrap.innerHTML = isYearly
      ? `<span class="discount-badge">HEMAT 16%</span>`
      : "";
  }
}

function setupPaymentMethodSelection() {
  const options = document.querySelectorAll(".payment-option-item");
  const payBtnText = document.getElementById("payBtnText");

  options.forEach((opt) => {
    opt.addEventListener("click", () => {
      options.forEach((item) => item.classList.remove("selected"));
      opt.classList.add("selected");

      const method = opt.getAttribute("data-method");
      if (payBtnText) {
        if (method === "qris") payBtnText.textContent = "Bayar dengan QRIS";
        else if (method === "va")
          payBtnText.textContent = "Bayar dengan Virtual Account";
        else if (method === "ewallet")
          payBtnText.textContent = "Bayar dengan E-Wallet";
      }
    });
  });
}

function setupPaymentExecution() {
  const payButton = document.getElementById("btnExecutePayment");
  const modalOverlay = document.getElementById("qrModalOverlay");
  const closeModalBtn = document.getElementById("qrModalClose");

  if (!payButton) return;

  payButton.addEventListener("click", () => {
    const activeMethod =
      document
        .querySelector(".payment-option-item.selected")
        ?.getAttribute("data-method") || "qris";

    if (activeMethod === "qris") {
      const order = createOrder();
      generateQRCode(order.paymentUrl);
      if (modalOverlay) modalOverlay.classList.add("active");
    } else {
      alert(
        `Metode ${activeMethod.toUpperCase()} dipilih. Untuk simulasi QRIS silakan pilih QRIS.`,
      );
    }
  });

  if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener("click", () => {
      modalOverlay.classList.remove("active");
    });
  }
}

/**
 * Generate unique order and save to localStorage
 */
function createOrder() {
  const orderId = generateOrderId();
  const reg = JSON.parse(localStorage.getItem("urt_registration") || "{}");
  const sub = JSON.parse(
    localStorage.getItem("urt_subscription") ||
      '{"plan":"monthly","price":99000,"duration":30}',
  );
  const paymentUrl = generatePaymentUrl(orderId);

  const order = {
    orderId,
    businessName: reg.businessName || "ServisKita",
    plan: sub.plan,
    price: sub.price,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    paymentUrl,
  };

  localStorage.setItem("urt_order", JSON.stringify(order));
  return order;
}

function generateOrderId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${year}${month}${date}-${random}`;
}

/**
 * Generate QR code inside the modal targeting the payment success URL
 */
function generateQRCode(url) {
  const qrContainer = document.getElementById("qrcode");
  if (!qrContainer) return;

  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: url,
    width: 200,
    height: 200,
    colorDark: "#0b1329",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  const directLink = document.getElementById("qrSimulatedRedirect");
  if (directLink) {
    directLink.setAttribute("href", "beranda-owner.html");
  }
}

/**
 * Page 5: Payment Success Screen
 */
function initPaymentSuccessPage() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order");

  let order = null;
  const storedOrderRaw = localStorage.getItem("urt_order");
  if (storedOrderRaw) {
    const parsed = JSON.parse(storedOrderRaw);
    if (parsed.orderId === orderId) {
      order = parsed;
    }
  }

  // Fallback defaults if opened directly
  const displayId = orderId || (order ? order.orderId : "ORD-20261017-0001");
  const isYearly = order ? order.plan === "yearly" : false;
  const displayPlan = isYearly ? "Paket Tahunan" : "Paket Bulanan";
  const displayPrice = isYearly ? "Rp999.000" : "Rp99.000";

  const orderNumberEl = document.getElementById("orderNumber");
  const orderPlanEl = document.getElementById("orderPlan");
  const orderTotalEl = document.getElementById("orderTotal");

  if (orderNumberEl) orderNumberEl.textContent = displayId;
  if (orderPlanEl) orderPlanEl.textContent = displayPlan;
  if (orderTotalEl) orderTotalEl.textContent = displayPrice;
}
