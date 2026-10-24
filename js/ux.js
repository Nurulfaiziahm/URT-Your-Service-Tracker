/**
 * URT — Your Service Tracker
 * Modul 8 · UX Helpers: Toast, Skeleton, Empty/Error State, Validasi Form, Konfirmasi
 * Tidak memakai alert()/confirm() bawaan browser.
 */
(function () {
  "use strict";

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ================= TOAST ================= */
  const ICONS = {
    success: '<path d="M20 6 9 17l-5-5"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>'
  };

  function stack() {
    let el = document.getElementById("urtToastStack");
    if (!el) {
      el = document.createElement("div");
      el.id = "urtToastStack";
      el.className = "urt-toast-stack";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(message, type, duration) {
    type = ICONS[type] ? type : "success";
    const item = document.createElement("div");
    item.className = "urt-toast urt-toast--" + type;
    item.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[type] + "</svg>" +
      "<span>" + esc(message) + "</span>" +
      '<button type="button" class="urt-toast__close" aria-label="Tutup notifikasi">&times;</button>';
    stack().appendChild(item);
    requestAnimationFrame(() => item.classList.add("is-visible"));

    const close = () => {
      item.classList.remove("is-visible");
      setTimeout(() => item.remove(), 250);
    };
    item.querySelector(".urt-toast__close").addEventListener("click", close);
    setTimeout(close, duration || (type === "error" ? 4500 : 3000));
    return close;
  }

  /* ================= SKELETON ================= */
  function skeletonRows(tbody, cols, rows) {
    if (!tbody) return;
    let html = "";
    for (let r = 0; r < (rows || 5); r++) {
      html += '<tr class="urt-skeleton-row" aria-hidden="true">';
      for (let c = 0; c < cols; c++) {
        const w = [70, 55, 80, 45, 60, 35][c % 6];
        html += '<td><span class="urt-skeleton" style="width:' + w + '%"></span></td>';
      }
      html += "</tr>";
    }
    tbody.innerHTML = html;
    tbody.setAttribute("aria-busy", "true");
  }

  function skeletonBlock(el, lines) {
    if (!el) return;
    let html = '<div class="urt-skeleton-block" aria-hidden="true">';
    for (let i = 0; i < (lines || 4); i++) {
      html += '<span class="urt-skeleton" style="width:' + (i === 0 ? 40 : 85 - i * 8) + '%"></span>';
    }
    el.innerHTML = html + "</div>";
    el.setAttribute("aria-busy", "true");
  }

  function doneLoading(el) {
    if (el) el.removeAttribute("aria-busy");
  }

  /* ================= EMPTY / ERROR STATE ================= */
  const STATE_ICON = {
    empty: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    error: '<path d="M12 9v4M12 17v.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>'
  };

  /** Mengembalikan HTML kotak state. opts: type, title, message, actionLabel, action(id) */
  function stateHtml(opts) {
    const type = opts.type === "error" ? "error" : "empty";
    return (
      '<div class="urt-state urt-state--' + type + '" role="' + (type === "error" ? "alert" : "status") + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + STATE_ICON[type] + "</svg>" +
      "<strong>" + esc(opts.title) + "</strong>" +
      (opts.message ? "<p>" + esc(opts.message) + "</p>" : "") +
      (opts.actionLabel
        ? '<button type="button" class="urt-state__btn" data-urt-state-action>' + esc(opts.actionLabel) + "</button>"
        : "") +
      "</div>"
    );
  }

  /** Tampilkan state di dalam <tbody> (1 baris penuh) atau elemen biasa. */
  function showState(container, opts, colspan) {
    if (!container) return;
    const inner = stateHtml(opts);
    if (container.tagName === "TBODY") {
      container.innerHTML =
        '<tr class="urt-state-row"><td colspan="' + (colspan || 6) + '">' + inner + "</td></tr>";
    } else {
      container.innerHTML = inner;
    }
    container.removeAttribute("aria-busy");
    const btn = container.querySelector("[data-urt-state-action]");
    if (btn && typeof opts.onAction === "function") btn.addEventListener("click", opts.onAction);
  }

  /** Skeleton satu halaman penuh (mencegah konten hardcode tampil sekilas sebelum data siap). */
  function pageLoading(container, on) {
    if (!container) return;
    if (on) {
      if (container.querySelector(":scope > .urt-page-skeleton")) return;
      container.classList.add("urt-page-loading");
      const sk = document.createElement("div");
      sk.className = "urt-page-skeleton";
      skeletonBlock(sk, 8);
      container.prepend(sk);
    } else {
      container.classList.remove("urt-page-loading");
      const sk = container.querySelector(":scope > .urt-page-skeleton");
      if (sk) sk.remove();
    }
  }

  /* ================= BUTTON LOADING ================= */
  function setLoading(btn, on, label) {
    if (!btn) return;
    if (on) {
      btn.dataset.urtLabel = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.innerHTML = '<span class="urt-spinner" aria-hidden="true"></span>' + esc(label || "Mengirim...");
    } else {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      if (btn.dataset.urtLabel) btn.innerHTML = btn.dataset.urtLabel;
    }
  }

  /* ================= VALIDASI FORM ================= */
  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const RE_PHONE = /^(\+62|62|0)8[0-9]{7,12}$/;

  function normalizePhone(v) {
    return String(v || "").replace(/[\s\-().]/g, "");
  }

  function fieldWrap(input) {
    return input.closest("label, .form-group, .form-field") || input.parentElement;
  }

  function clearError(input) {
    if (!input) return;
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    const wrap = fieldWrap(input);
    const old = wrap && wrap.querySelector(".urt-field-error[data-for='" + (input.name || input.id) + "']");
    if (old) old.remove();
  }

  function setError(input, message) {
    clearError(input);
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    const msg = document.createElement("small");
    msg.className = "urt-field-error";
    msg.setAttribute("role", "alert");
    msg.dataset.for = input.name || input.id;
    msg.textContent = message;
    const wrap = fieldWrap(input);
    // pesan muncul tepat di bawah kolom yang salah
    input.insertAdjacentElement("afterend", msg);
    if (!msg.isConnected && wrap) wrap.appendChild(msg);
  }

  /**
   * rules: { fieldName: { label, required, type: 'email'|'phone'|'number'|'text',
   *                       min, max, minLength, maxLength, matches: 'otherField' } }
   * Mengembalikan { valid, values } — values sudah di-trim.
   */
  function validate(form, rules) {
    let valid = true;
    let firstBad = null;
    const values = {};

    Object.keys(rules).forEach((name) => {
      const rule = rules[name];
      const input = form.elements.namedItem(name);
      if (!input || input.length > 1 && !input.tagName) return; // grup radio/checkbox ditangani manual
      const raw = typeof input.value === "string" ? input.value : "";
      const isPwd = input.type === "password";
      const val = isPwd ? raw : raw.trim().replace(/\s{2,}/g, " ");
      if (typeof input.value === "string" && !isPwd) input.value = val; // sanitasi: tulis balik hasil trim
      values[name] = val;
      clearError(input);

      let err = "";
      if (rule.required && !val) {
        err = rule.label + " wajib diisi.";
      } else if (val) {
        if (rule.type === "email" && !RE_EMAIL.test(val)) err = "Format email tidak valid (contoh: nama@email.com).";
        else if (rule.type === "phone" && !RE_PHONE.test(normalizePhone(val)))
          err = "Nomor HP tidak valid. Gunakan format 08xx atau +628xx (9–13 digit).";
        else if (rule.type === "number") {
          const n = Number(val);
          if (isNaN(n)) err = rule.label + " harus berupa angka.";
          else if (rule.min != null && n < rule.min) err = rule.label + " minimal " + rule.min.toLocaleString("id-ID") + ".";
          else if (rule.max != null && n > rule.max) err = rule.label + " maksimal " + rule.max.toLocaleString("id-ID") + ".";
        }
        if (!err && rule.minLength && val.length < rule.minLength)
          err = rule.label + " minimal " + rule.minLength + " karakter.";
        if (!err && rule.maxLength && val.length > rule.maxLength)
          err = rule.label + " maksimal " + rule.maxLength + " karakter.";
        if (!err && rule.pattern && !rule.pattern.test(val)) err = rule.patternMessage || rule.label + " tidak valid.";
        if (!err && rule.matches) {
          const other = form.elements.namedItem(rule.matches);
          if (other && other.value !== raw) err = rule.label + " tidak sama.";
        }
      }
      if (err) {
        valid = false;
        setError(input, err);
        if (!firstBad) firstBad = input;
      }
    });

    if (firstBad) firstBad.focus();
    return { valid: valid, values: values };
  }

  /** Hapus error saat user mulai mengetik ulang. */
  function liveClear(form) {
    form.addEventListener("input", (e) => {
      if (e.target && e.target.classList && e.target.classList.contains("is-invalid")) clearError(e.target);
    });
  }

  /** Tampilkan error server pada field tertentu (mis. username dobel). */
  function serverFieldError(form, fieldName, message) {
    const input = form.elements.namedItem(fieldName);
    if (input) {
      setError(input, message);
      input.focus();
      return true;
    }
    return false;
  }

  /* ================= KONFIRMASI (pengganti confirm()) ================= */
  function confirmDialog(opts) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "urt-modal";
      overlay.innerHTML =
        '<div class="urt-modal__box" role="alertdialog" aria-modal="true" aria-labelledby="urtModalTitle">' +
        '<h3 id="urtModalTitle">' + esc(opts.title || "Konfirmasi") + "</h3>" +
        "<p>" + esc(opts.message || "") + "</p>" +
        '<div class="urt-modal__actions">' +
        '<button type="button" class="urt-modal__cancel">' + esc(opts.cancelLabel || "Batal") + "</button>" +
        '<button type="button" class="urt-modal__ok' + (opts.danger ? " is-danger" : "") + '">' + esc(opts.confirmLabel || "Ya, lanjutkan") + "</button>" +
        "</div></div>";
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("is-visible"));
      const okBtn = overlay.querySelector(".urt-modal__ok");
      okBtn.focus();

      const done = (val) => {
        document.removeEventListener("keydown", onKey);
        overlay.classList.remove("is-visible");
        setTimeout(() => overlay.remove(), 200);
        resolve(val);
      };
      const onKey = (e) => {
        if (e.key === "Escape") done(false);
      };
      document.addEventListener("keydown", onKey);
      overlay.querySelector(".urt-modal__cancel").addEventListener("click", () => done(false));
      okBtn.addEventListener("click", () => done(true));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) done(false);
      });
    });
  }

  /* ================= FLASH (toast setelah pindah halaman) ================= */
  function flash(message, type) {
    try {
      sessionStorage.setItem("urt_flash", JSON.stringify({ message: message, type: type || "success" }));
    } catch (e) {}
  }
  function showFlash() {
    try {
      const raw = sessionStorage.getItem("urt_flash");
      if (!raw) return;
      sessionStorage.removeItem("urt_flash");
      const f = JSON.parse(raw);
      toast(f.message, f.type);
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showFlash);
  else showFlash();

  window.URT_UX = {
    flash: flash,
    esc: esc,
    toast: toast,
    skeletonRows: skeletonRows,
    skeletonBlock: skeletonBlock,
    pageLoading: pageLoading,
    doneLoading: doneLoading,
    stateHtml: stateHtml,
    showState: showState,
    setLoading: setLoading,
    validate: validate,
    liveClear: liveClear,
    clearError: clearError,
    serverFieldError: serverFieldError,
    confirm: confirmDialog
  };
})();
