// ==========================================
// 🎨 CANLI DAĞITIM SİSTEMİ - UI MANAGER
// ==========================================

class CanliDagitimUI {
  constructor(main) {
    this.main = main;
    this.overlay = null;
  }

  // Ana render
  render() {
    console.log("🎨 UI render ediliyor...");

    // Mevcut program-olustur.html container'ını gizle
    const mainContainer = document.querySelector("main.page-container");
    if (mainContainer) {
      mainContainer.style.display = "none";
    }

    // Overlay oluştur - program-olustur.html ile aynı yapı
    this.overlay = document.createElement("div");
    this.overlay.id = "canliDagitimFullscreen";
    this.overlay.innerHTML = `
      <!-- Üst Bar - AYNI TASARIM -->
      <header class="top-bar">
        <div class="top-bar-left">
          <div class="logo-container">
            <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L4 9V21H20V9L12 3Z" stroke="url(#gradient1)" stroke-width="2"/>
              <path d="M9 21V12H15V21" stroke="url(#gradient1)" stroke-width="2"/>
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color: #00d9ff"/>
                  <stop offset="100%" style="stop-color: #7b2fff"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="logo-text">
              <span class="logo-title">Canlı Dağıtım</span>
              <span class="logo-subtitle">Ders Programı</span>
            </div>
          </div>
        </div>

        <div class="top-bar-center">
          <h2 style="color: white; font-size: 20px; font-weight: 600">
            🚀 Canlı Ders Dağıtım Sistemi
          </h2>
        </div>

        <div class="top-bar-right">
          <button class="icon-btn" onclick="window.canliDagitimMain.kapat()" title="Kapat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Ana İçerik - AYNI LAYOUT -->
      <main class="page-container" style="padding: 20px; height: calc(100vh - 72px); overflow: hidden;">
        
        <!-- Başlık ve Kontrol Butonları -->
        <div class="page-header" style="margin-bottom: 20px">
          <div class="header-left">
            <h1 class="page-title">
              <span class="title-icon">🎯</span>
              Canlı Dağıtım
            </h1>
            <p class="page-description">Sürükle-bırak ile ders yerleştir</p>
          </div>
          <div class="header-right" style="display: flex; gap: 12px">
            <button class="btn-primary" onclick="window.canliDagitimMain.gridManager.render()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              <span>Yenile</span>
            </button>
            <button class="btn-secondary" onclick="window.canliDagitimMain.kapat()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <span>Kapat</span>
            </button>
          </div>
        </div>

        <!-- 3 Kolonlu Layout - AYNI YAPI -->
        <div class="program-layout" style="height: calc(100% - 100px);">
          
          <!-- SOL PANEL -->
          <div class="program-sidebar">
            ${this.getSolPanel()}
          </div>

          <!-- ORTA PANEL -->
          <div class="program-main">
            ${this.getOrtaPanel()}
          </div>

          <!-- SAĞ PANEL -->
          <div class="program-sidebar">
            ${this.getSagPanel()}
          </div>

        </div>
      </main>
    `;

    document.body.appendChild(this.overlay);

    // Event listener'ları bağla
    setTimeout(() => {
      this.baglaEventListeners();

      // Grid Manager'ı render et
      if (this.main.gridManager) {
        console.log("🎯 Grid Manager render ediliyor...");
        this.main.gridManager.render();
      }
    }, 100);

    console.log("✅ UI render tamamlandı");
  }

  // Sol Panel
  getSolPanel() {
    return `
      <!-- İstatistikler -->
      <div class="sidebar-section">
        <h3 class="section-title">📊 İstatistikler</h3>
        <div class="stats-mini">
          <div class="stat-mini">
            <span class="stat-mini-label">Toplam</span>
            <span class="stat-mini-value">${this.main.stats.toplamBlok}</span>
          </div>
          <div class="stat-mini">
            <span class="stat-mini-label">Dağıtılan</span>
            <span class="stat-mini-value" style="color: #00c851;">${
              this.main.stats.dagitilan
            }</span>
          </div>
          <div class="stat-mini">
            <span class="stat-mini-label">Bekleyen</span>
            <span class="stat-mini-value" style="color: #ff9800;">${
              this.main.stats.bekleyen
            }</span>
          </div>
        </div>
      </div>

      <!-- Öğretmenler -->
      <div class="sidebar-section">
        <div class="accordion-header active" id="canliOgretmenlerAccordion">
          <div class="accordion-title">
            <span>👨‍🏫</span>
            <span>ÖĞRETMENLER</span>
          </div>
          <div class="accordion-icon">▼</div>
        </div>
        <div class="accordion-content active" id="canliOgretmenlerContent">
          ${this.getOgretmenListesi()}
        </div>
      </div>

      <!-- Sınıflar -->
      <div class="sidebar-section">
        <div class="accordion-header" id="canliSiniflarAccordion">
          <div class="accordion-title">
            <span>🏫</span>
            <span>SINIFLAR</span>
          </div>
          <div class="accordion-icon">▶</div>
        </div>
        <div class="accordion-content" id="canliSiniflarContent">
          ${this.getSinifListesi()}
        </div>
      </div>
    `;
  }
  // Öğretmen Listesi
  getOgretmenListesi() {
    if (this.main.ogretmenler.length === 0) {
      return `
        <div class="empty-message">
          <div style="font-size: 48px; margin-bottom: 12px;">👨‍🏫</div>
          <p>Henüz öğretmen yok</p>
        </div>
      `;
    }

    let html = `
      <div style="margin-bottom: 12px;">
        <input type="text" class="form-input" id="canliInputOgretmenAra" placeholder="🔍 Öğretmen Ara..." style="width: 100%; padding: 8px 12px; font-size: 13px;">
      </div>
    `;

    this.main.ogretmenler.forEach((ogretmen) => {
      const bloklar = this.main.bloklar.filter(
        (b) => b.ogretmen_id === ogretmen.id
      );
      const bekleyen = bloklar.filter((b) => b.durum === "bekliyor").length;
      const dagitilan = bloklar.filter((b) => b.durum === "dagitildi").length;

      html += `
        <div class="draggable-item" data-canli-ogretmen-id="${
          ogretmen.id
        }" style="cursor: pointer; margin-bottom: 8px;">
          <div class="draggable-item-header">
            <div class="draggable-item-title" style="font-size: 13px;">
              <span style="font-weight: 700;">${
                ogretmen.kod || ogretmen.ad
              }</span>
            </div>
            <div class="draggable-item-badges">
              <span class="draggable-badge" style="background: #fff3e0; color: #f57c00; font-size: 11px; padding: 3px 6px;">${bekleyen}</span>
              <span class="draggable-badge" style="background: #e8f5e9; color: #2e7d32; font-size: 11px; padding: 3px 6px;">${dagitilan}</span>
            </div>
          </div>
          <div class="draggable-item-subtitle" style="font-size: 11px; color: #6c757d;">
            ${ogretmen.brans || "—"}
          </div>
        </div>
      `;
    });

    return html;
  }

  // Sınıf Listesi
  getSinifListesi() {
    if (this.main.siniflar.length === 0) {
      return `
        <div class="empty-message">
          <div style="font-size: 48px; margin-bottom: 12px;">🏫</div>
          <p>Henüz sınıf yok</p>
        </div>
      `;
    }

    let html = `
      <div style="margin-bottom: 12px;">
        <input type="text" class="form-input" id="canliInputSinifAra" placeholder="🔍 Sınıf Ara..." style="width: 100%; padding: 8px 12px; font-size: 13px;">
      </div>
    `;

    this.main.siniflar.forEach((sinif) => {
      const bloklar = this.main.bloklar.filter((b) => b.sinif_id === sinif.id);
      const bekleyen = bloklar.filter((b) => b.durum === "bekliyor").length;
      const dagitilan = bloklar.filter((b) => b.durum === "dagitildi").length;

      html += `
        <div class="draggable-item" data-canli-sinif-id="${sinif.id}" style="cursor: pointer; margin-bottom: 8px;">
          <div class="draggable-item-header">
            <div class="draggable-item-title" style="font-size: 13px;">
              <span style="font-weight: 700;">${sinif.kod}</span>
            </div>
            <div class="draggable-item-badges">
              <span class="draggable-badge" style="background: #fff3e0; color: #f57c00; font-size: 11px; padding: 3px 6px;">${bekleyen}</span>
              <span class="draggable-badge" style="background: #e8f5e9; color: #2e7d32; font-size: 11px; padding: 3px 6px;">${dagitilan}</span>
            </div>
          </div>
          <div class="draggable-item-subtitle" style="font-size: 11px; color: #6c757d;">
            Seviye ${sinif.seviye}
          </div>
        </div>
      `;
    });

    return html;
  }

  // Orta Panel
  getOrtaPanel() {
    return `
      <div class="tablo-header">
        <div class="tablo-info">
          <span id="canliTabloBaslik">Program Tablosu</span>
          <span class="tablo-meta" id="canliTabloMeta">Sürükle-bırak ile yerleştir</span>
        </div>
        <div class="tablo-actions">
          <button class="btn-icon" id="btnCanliOgretmenSec" title="Öğretmen Seç">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          <button class="btn-icon" id="btnCanliSinifSec" title="Sınıf Seç">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="tablo-container" id="canliTabloContainer" style="height: calc(100% - 70px); overflow: auto;">
        <div id="canliProgramGrid">
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 40px;">
            <div style="text-align: center;">
              <div style="font-size: 64px; margin-bottom: 16px;">📊</div>
              <h3 style="margin: 0 0 8px 0; color: #1a1a1a;">Program Yükleniyor...</h3>
              <p style="margin: 0; color: #6c757d;">Lütfen bekleyin</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Sağ Panel
  getSagPanel() {
    return `
      <!-- AI Önerileri -->
      <div class="sidebar-section">
        <h3 class="section-title">💡 AI Önerileri</h3>
        <div class="oneri-list">
          <div class="oneri-item oneri-bilgi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <div>
              <strong>Hoş Geldiniz!</strong>
              <p>Sol panelden öğretmen seçin</p>
            </div>
          </div>
        </div>
      </div>

      <!-- İstatistikler Detay -->
      <div class="sidebar-section">
        <h3 class="section-title">📈 Detaylı İstatistikler</h3>
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Toplam Blok</div>
          <div style="font-size: 36px; font-weight: 900;">${
            this.main.stats.toplamBlok
          }</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #00c851 0%, #007e33 100%); color: white; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Dağıtılan</div>
          <div style="font-size: 36px; font-weight: 900;">${
            this.main.stats.dagitilan
          }</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Bekleyen</div>
          <div style="font-size: 36px; font-weight: 900;">${
            this.main.stats.bekleyen
          }</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #9c27b0 0%, #6a1b9a 100%); color: white; padding: 16px; border-radius: 12px;">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">İlerleme</div>
          <div style="font-size: 36px; font-weight: 900;">
            ${
              this.main.stats.toplamBlok > 0
                ? Math.round(
                    (this.main.stats.dagitilan / this.main.stats.toplamBlok) *
                      100
                  )
                : 0
            }%
          </div>
        </div>
      </div>

      <!-- Blok Detay -->
      <div id="canliBlokDetayContainer"></div>
    `;
  }
  // Event Listener'ları Bağla
  baglaEventListeners() {
    console.log("🔌 Event listener'lar bağlanıyor...");

    // Accordion toggle
    const ogretmenAccordion = document.getElementById(
      "canliOgretmenlerAccordion"
    );
    if (ogretmenAccordion) {
      ogretmenAccordion.addEventListener("click", () => {
        const content = document.getElementById("canliOgretmenlerContent");
        const icon = ogretmenAccordion.querySelector(".accordion-icon");

        ogretmenAccordion.classList.toggle("active");
        content.classList.toggle("active");
        icon.textContent = content.classList.contains("active") ? "▼" : "▶";
      });
    }

    const sinifAccordion = document.getElementById("canliSiniflarAccordion");
    if (sinifAccordion) {
      sinifAccordion.addEventListener("click", () => {
        const content = document.getElementById("canliSiniflarContent");
        const icon = sinifAccordion.querySelector(".accordion-icon");

        sinifAccordion.classList.toggle("active");
        content.classList.toggle("active");
        icon.textContent = content.classList.contains("active") ? "▼" : "▶";
      });
    }

    // Öğretmen Listesi - Tıklama
    document.querySelectorAll("[data-canli-ogretmen-id]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const ogretmenId = el.dataset.canliOgretmenId;

        // Seçili öğretmeni işaretle
        document
          .querySelectorAll("[data-canli-ogretmen-id]")
          .forEach((item) => {
            item.style.background = "";
            item.style.borderLeft = "";
          });
        el.style.background = "#e3f2fd";
        el.style.borderLeft = "4px solid #2196f3";

        // Grid'i güncelle
        if (this.main.gridManager) {
          this.main.goruntulemeModu = "ogretmen";
          this.main.gridManager.ogretmenDegistir(ogretmenId);

          // Başlığı güncelle
          const baslik = document.getElementById("canliTabloBaslik");
          const ogretmen = this.main.ogretmenler.find(
            (o) => o.id === ogretmenId
          );
          if (baslik && ogretmen) {
            baslik.textContent = `${ogretmen.kod} - ${ogretmen.ad} ${ogretmen.soyad}`;
          }
        }
      });
    });

    // Sınıf Listesi - Tıklama
    document.querySelectorAll("[data-canli-sinif-id]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const sinifId = el.dataset.canliSinifId;

        // Seçili sınıfı işaretle
        document.querySelectorAll("[data-canli-sinif-id]").forEach((item) => {
          item.style.background = "";
          item.style.borderLeft = "";
        });
        el.style.background = "#fff3e0";
        el.style.borderLeft = "4px solid #ff9800";

        // Grid'i güncelle
        if (this.main.gridManager) {
          this.main.goruntulemeModu = "sinif";
          this.main.gridManager.sinifDegistir(sinifId);

          // Başlığı güncelle
          const baslik = document.getElementById("canliTabloBaslik");
          const sinif = this.main.siniflar.find((s) => s.id === sinifId);
          if (baslik && sinif) {
            baslik.textContent = `${sinif.kod} Sınıfı`;
          }
        }
      });
    });

    // Öğretmen Arama
    const inputOgretmenAra = document.getElementById("canliInputOgretmenAra");
    if (inputOgretmenAra) {
      inputOgretmenAra.addEventListener("input", (e) => {
        const kelime = e.target.value.toLowerCase().trim();
        document.querySelectorAll("[data-canli-ogretmen-id]").forEach((el) => {
          const text = el.textContent.toLowerCase();
          el.style.display = text.includes(kelime) ? "block" : "none";
        });
      });
    }

    // Sınıf Arama
    const inputSinifAra = document.getElementById("canliInputSinifAra");
    if (inputSinifAra) {
      inputSinifAra.addEventListener("input", (e) => {
        const kelime = e.target.value.toLowerCase().trim();
        document.querySelectorAll("[data-canli-sinif-id]").forEach((el) => {
          const text = el.textContent.toLowerCase();
          el.style.display = text.includes(kelime) ? "block" : "none";
        });
      });
    }

    // Öğretmen Seç Butonu
    document
      .getElementById("btnCanliOgretmenSec")
      ?.addEventListener("click", () => {
        this.main.goruntulemeModu = "ogretmen";
        if (this.main.gridManager) {
          this.main.gridManager.render();
        }
      });

    // Sınıf Seç Butonu
    document
      .getElementById("btnCanliSinifSec")
      ?.addEventListener("click", () => {
        this.main.goruntulemeModu = "sinif";
        if (this.main.gridManager) {
          this.main.gridManager.render();
        }
      });

    console.log("✅ Event listener'lar bağlandı");
  }

  // Güncelle
  guncelle() {
    console.log("🔄 UI güncelleniyor...");

    // Öğretmen listesini güncelle
    const ogretmenContent = document.getElementById("canliOgretmenlerContent");
    if (ogretmenContent) {
      ogretmenContent.innerHTML = this.getOgretmenListesi();
    }

    // Sınıf listesini güncelle
    const sinifContent = document.getElementById("canliSiniflarContent");
    if (sinifContent) {
      sinifContent.innerHTML = this.getSinifListesi();
    }

    // İstatistikleri güncelle
    const sagPanel = document.querySelector(".program-sidebar:last-child");
    if (sagPanel) {
      sagPanel.innerHTML = this.getSagPanel();
    }

    // Grid'i güncelle
    if (this.main.gridManager) {
      this.main.gridManager.render();
    }

    // Event listener'ları yeniden bağla
    this.baglaEventListeners();

    console.log("✅ UI güncelleme tamamlandı");
  }
}

// Export
window.CanliDagitimUI = CanliDagitimUI;

console.log("✅ Canlı Dağıtım UI yüklendi");
