(() => {
  "use strict";

  const toast = document.getElementById("toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;

    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2200);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = text;
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand("copy");
        temporaryInput.remove();
      }

      showToast("Tautan berhasil disalin.");
    } catch (error) {
      showToast("Tautan belum dapat disalin.");
    }
  }

  document.querySelectorAll(".copy-link").forEach((button) => {
    button.addEventListener("click", () => {
      copyText(button.dataset.copy || "");
    });
  });

  const notificationButton = document.getElementById("notificationButton");
  if (notificationButton) {
    notificationButton.addEventListener("click", () => {
      showToast("Tidak ada notifikasi baru.");
    });
  }
})();
