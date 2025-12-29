// ==========================================
// MODERN BİLDİRİM SİSTEMİ V2.0
// iOS Style Toast Notifications + SES + GÜNCELLEME
// ==========================================

class BildirimSistemi {
  constructor() {
    this.container = null;
    this.activeToasts = [];
    this.maxToasts = 5;
    this.init();
  }

  init() {
    // Container oluştur
    if (!document.querySelector(".toast-container")) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector(".toast-container");
    }
  }

  // ==========================================
  // 🔊 BİLDİRİM SESİ ÇALMA
  // ==========================================

  playNotificationSound() {
    try {
      // Modern, profesyonel tik sesi (Base64 - 0.5 saniye)
      const soundBase64 =
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFA";

      const audio = new Audio(soundBase64);
      audio.volume = 0.4; // %40 ses seviyesi
      audio.play().catch((err) => {
        console.log("🔇 Ses çalınamadı (tarayıcı izni gerekebilir)");
      });
    } catch (error) {
      console.log("🔇 Ses sistemi hatası:", error);
    }
  }

  // ==========================================
  // TOAST BİLDİRİMLERİ
  // ==========================================

  goster(type, message, title = null, duration = 5000, sesliMi = true) {
    // 🔊 Ses çal (error hariç)
    if (sesliMi && type !== "error") {
      this.playNotificationSound();
    }

    // Maksimum toast sayısını aşma
    if (this.activeToasts.length >= this.maxToasts) {
      this.activeToasts[0].remove();
      this.activeToasts.shift();
    }

    const toast = this.createToast(type, message, title, duration);
    this.container.appendChild(toast);
    this.activeToasts.push(toast);

    // Otomatik kaldırma
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast);
      }, duration);
    }

    return toast;
  }

  createToast(type, message, title, duration) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Progress bar süresi ayarla
    toast.style.setProperty("--duration", `${duration}ms`);

    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    const titles = {
      success: title || "Başarılı!",
      error: title || "Hata!",
      warning: title || "Uyarı!",
      info: title || "Bilgi",
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${titles[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;

    // Kapat butonu
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      this.removeToast(toast);
    });

    // Hover'da duraklat
    toast.addEventListener("mouseenter", () => {
      toast.style.animationPlayState = "paused";
    });

    toast.addEventListener("mouseleave", () => {
      toast.style.animationPlayState = "running";
    });

    return toast;
  }

  removeToast(toast) {
    toast.classList.add("removing");

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
      const index = this.activeToasts.indexOf(toast);
      if (index > -1) {
        this.activeToasts.splice(index, 1);
      }
    }, 300);
  }

  // Kısa metodlar
  success(message, title) {
    return this.goster("success", message, title);
  }

  error(message, title) {
    return this.goster("error", message, title);
  }

  warning(message, title) {
    return this.goster("warning", message, title);
  }

  info(message, title) {
    return this.goster("info", message, title);
  }

  // ==========================================
  // 🎉 GÜNCELLEME BİLDİRİMİ (ÖZEL TASARIM)
  // ==========================================

  gosterGuncelleme(versiyon, indirilmeDurumu = false) {
    // Ses çal
    this.playNotificationSound();

    // Mevcut güncelleme bildirimini kaldır
    const mevcutBildirim = document.getElementById("guncellemeBildirimi");
    if (mevcutBildirim) {
      mevcutBildirim.remove();
    }

    const bildirim = document.createElement("div");
    bildirim.className = "toast toast-update";
    bildirim.id = "guncellemeBildirimi";

    if (!indirilmeDurumu) {
      // YENİ VERSİYON MEVCUT
      bildirim.innerHTML = `
        <div class="update-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div class="update-content">
          <div class="update-title">🎉 Yeni Versiyon Mevcut!</div>
          <div class="update-version">v${versiyon}</div>
          <div class="update-message">
            ✅ Tüm verileriniz korunacak<br>
            🚀 Yeni özellikler ve iyileştirmeler
          </div>
          <div class="update-actions">
            <button class="btn-update-primary" onclick="window.startUpdateDownload()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Şimdi Güncelle
            </button>
            <button class="btn-update-secondary" onclick="document.getElementById('guncellemeBildirimi').remove()">
              Daha Sonra
            </button>
          </div>
        </div>
      `;
    } else {
      // İNDİRME TAMAMLANDI
      bildirim.innerHTML = `
        <div class="update-icon update-icon-success">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="update-content">
          <div class="update-title">✅ Güncelleme Hazır!</div>
          <div class="update-message">
            Uygulama yeniden başlatılacak<br>
            Tüm verileriniz korunacak
          </div>
          <div class="update-actions">
            <button class="btn-update-primary" onclick="window.quitAndInstall()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Yeniden Başlat
            </button>
          </div>
        </div>
      `;
    }

    this.container.appendChild(bildirim);

    // Animasyon
    setTimeout(() => {
      bildirim.classList.add("toast-visible");
    }, 10);

    return bildirim;
  }

  // ==========================================
  // CONFIRM MODAL
  // ==========================================

  async confirm(message, title = "Onay", options = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      const icon = options.icon || "❓";
      const confirmText = options.confirmText || "Evet";
      const cancelText = options.cancelText || "İptal";
      const isDanger = options.type === "danger";

      overlay.innerHTML = `
        <div class="modal-content">
          <div class="modal-icon">${icon}</div>
          <div class="modal-title">${title}</div>
          <div class="modal-message">${message}</div>
          <div class="modal-buttons">
            <button class="modal-button secondary" data-action="cancel">${cancelText}</button>
            <button class="modal-button ${
              isDanger ? "danger" : "primary"
            }" data-action="confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Buton event'leri
      overlay.querySelectorAll(".modal-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action === "confirm";
          this.closeModal(overlay, () => resolve(action));
        });
      });

      // Overlay'e tıklayınca kapat
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay, () => resolve(false));
        }
      });

      // ESC ile kapat
      const handleEsc = (e) => {
        if (e.key === "Escape") {
          this.closeModal(overlay, () => resolve(false));
          document.removeEventListener("keydown", handleEsc);
        }
      };
      document.addEventListener("keydown", handleEsc);
    });
  }

  closeModal(overlay, callback) {
    overlay.classList.add("closing");
    setTimeout(() => {
      overlay.remove();
      if (callback) callback();
    }, 300);
  }

  // ==========================================
  // LOADING OVERLAY
  // ==========================================

  showLoading(text = "Yükleniyor...") {
    // Mevcut loading varsa kaldır
    this.hideLoading();

    const overlay = document.createElement("div");
    overlay.className = "loading-overlay";
    overlay.id = "global-loading";
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">${text}</div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  hideLoading() {
    const loading = document.getElementById("global-loading");
    if (loading) {
      loading.style.animation = "fadeOut 0.3s ease forwards";
      setTimeout(() => loading.remove(), 300);
    }
  }

  // ==========================================
  // PROMPT (INPUT MODAL)
  // ==========================================

  async prompt(message, title = "Giriş", defaultValue = "") {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      overlay.innerHTML = `
        <div class="modal-content">
          <div class="modal-icon">✏️</div>
          <div class="modal-title">${title}</div>
          <div class="modal-message">${message}</div>
          <input type="text" class="modal-input" value="${defaultValue}" 
                 style="width: 100%; padding: 12px; margin-bottom: 20px; 
                 background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); 
                 border-radius: 8px; color: white; font-size: 14px;">
          <div class="modal-buttons">
            <button class="modal-button secondary" data-action="cancel">İptal</button>
            <button class="modal-button primary" data-action="confirm">Tamam</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector(".modal-input");
      input.focus();
      input.select();

      // Enter ile onayla
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.closeModal(overlay, () => resolve(input.value));
        }
      });

      // Buton event'leri
      overlay.querySelectorAll(".modal-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action === "confirm";
          this.closeModal(overlay, () => resolve(action ? input.value : null));
        });
      });

      // ESC ile kapat
      const handleEsc = (e) => {
        if (e.key === "Escape") {
          this.closeModal(overlay, () => resolve(null));
          document.removeEventListener("keydown", handleEsc);
        }
      };
      document.addEventListener("keydown", handleEsc);
    });
  }
}

// Global instance oluştur
const Bildirim = new BildirimSistemi();

// Global erişim için
if (typeof window !== "undefined") {
  window.Bildirim = Bildirim;
}

// Node.js export
if (typeof module !== "undefined" && module.exports) {
  module.exports = Bildirim;
}

console.log("✅ Bildirim sistemi yüklendi");
