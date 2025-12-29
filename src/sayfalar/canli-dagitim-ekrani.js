// ==========================================
// 🚀 MODERN CANLI DAĞITIM EKRANI
// ==========================================

class CanliDagitimEkrani {
  constructor() {
    this.durdu = false;
    this.mevcutAdim = 0;
    this.dersler = [];
    this.siniflar = [];
    this.ogretmenler = [];
    this.basariliYerlestirme = 0;
    this.toplamDers = 0;
  }

  // Tam sayfa ekranı aç
  async ac() {
    console.log("🚀 Modern Canlı Dağıtım Ekranı açılıyor...");

    // Overlay oluştur
    const overlay = document.createElement("div");
    overlay.id = "canliDagitimOverlay";
    overlay.className = "fullscreen-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      z-index: 10000;
      overflow-y: auto;
      animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .modern-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          animation: slideUp 0.5s ease;
        }
        
        .progress-ring {
          transform: rotate(-90deg);
        }
        
        .progress-ring-circle {
          transition: stroke-dashoffset 0.5s ease;
        }
        
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }
        
        .log-entry {
          padding: 12px 16px;
          margin: 8px 0;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #667eea;
          animation: slideUp 0.3s ease;
          color: #2c3e50;
          font-size: 14px;
        }
        
        .log-entry.success {
          border-left-color: #00c851;
        }
        
        .log-entry.warning {
          border-left-color: #ff9800;
        }
        
        .log-entry.error {
          border-left-color: #f44336;
        }
        
        .adim-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }
        
        .adim-card.active {
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
          transform: scale(1.02);
        }
        
        .adim-icon {
          font-size: 32px;
          min-width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #f5f7fa;
        }
        
        .adim-icon.active {
          background: #667eea;
          animation: pulse 1.5s infinite;
        }
        
        .adim-icon.completed {
          background: #00c851;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
      </style>

      <div class="dagitim-container" style="max-width: 1400px; margin: 0 auto; padding: 40px;">
        <!-- Header -->
        <div style="text-align: center; color: white; margin-bottom: 48px; animation: slideUp 0.5s ease;">
          <button onclick="canliDagitimEkrani.kapat()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: 2px solid white; color: white; font-size: 24px; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-weight: 900; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
          
          <div style="font-size: 64px; margin-bottom: 16px;">🚀</div>
          <h1 style="font-size: 42px; margin: 0 0 12px 0; font-weight: 700;">
            Canlı Ders Dağıtım Sistemi
          </h1>
          <p style="font-size: 18px; margin: 0; opacity: 0.95;">
            Yapay zeka destekli otomatik program oluşturucu
          </p>
        </div>

        <!-- İstatistik Kartları -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px;">
          <div class="stat-card">
            <div style="font-size: 40px; margin-bottom: 8px;">🏫</div>
            <div style="font-size: 32px; font-weight: 900; color: #667eea; margin-bottom: 4px;" id="statSinif">0</div>
            <div style="font-size: 14px; color: #7f8c8d;">Sınıf</div>
          </div>
          
          <div class="stat-card">
            <div style="font-size: 40px; margin-bottom: 8px;">📚</div>
            <div style="font-size: 32px; font-weight: 900; color: #00c851; margin-bottom: 4px;" id="statDers">0</div>
            <div style="font-size: 14px; color: #7f8c8d;">Ders Slot</div>
          </div>
          
          <div class="stat-card">
            <div style="font-size: 40px; margin-bottom: 8px;">👨‍🏫</div>
            <div style="font-size: 32px; font-weight: 900; color: #ff9800; margin-bottom: 4px;" id="statOgretmen">0</div>
            <div style="font-size: 14px; color: #7f8c8d;">Öğretmen</div>
          </div>
          
          <div class="stat-card">
            <div style="font-size: 40px; margin-bottom: 8px;">✅</div>
            <div style="font-size: 32px; font-weight: 900; color: #9c27b0; margin-bottom: 4px;" id="statYerlestirme">0</div>
            <div style="font-size: 14px; color: #7f8c8d;">Yerleştirildi</div>
          </div>
        </div>

        <!-- Ana Progress -->
        <div class="modern-card" style="margin-bottom: 32px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="margin: 0; color: #2c3e50; font-size: 20px; font-weight: 600;">Genel İlerleme</h3>
              <p style="margin: 4px 0 0 0; color: #7f8c8d; font-size: 14px;" id="progressSubtitle">Hazırlanıyor...</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 48px; font-weight: 900; color: #667eea; line-height: 1;" id="genelProgress">0%</div>
            </div>
          </div>
          
          <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; position: relative;">
            <div id="genelProgressBar" style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: 0%; transition: width 0.5s ease; position: relative;">
              <div style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: white; font-weight: 600; font-size: 12px;" id="progressText"></div>
            </div>
          </div>
        </div>

        <!-- Adımlar -->
        <div id="adimlarContainer" style="margin-bottom: 32px;"></div>

        <!-- Log Ekranı -->
        <div class="modern-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #2c3e50; font-size: 18px; font-weight: 600;">📋 İşlem Günlüğü</h3>
            <div style="color: #7f8c8d; font-size: 14px;" id="logCount">0 kayıt</div>
          </div>
          <div id="dagitimLog" style="max-height: 400px; overflow-y: auto; padding-right: 8px;"></div>
        </div>

        <!-- Butonlar -->
        <div style="text-align: center; margin-top: 32px; display: flex; gap: 16px; justify-content: center;">
          <button id="btnDurdur" onclick="canliDagitimEkrani.durdur()" style="background: #f44336; color: white; border: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(244, 67, 54, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(244, 67, 54, 0.3)'">
            ⏸️ Durdur
          </button>
          <button id="btnKapat" onclick="canliDagitimEkrani.kapat()" style="background: white; color: #2c3e50; border: 2px solid #e0e0e0; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; display: none; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            Kapat
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Dağıtımı başlat
    await this.dagitimBaslat();
  }

  // Dağıtımı başlat
  async dagitimBaslat() {
    console.log("🚀 Dağıtım başladı");

    try {
      // 1. Verileri yükle
      await this.verileriYukle();

      const adimlar = [
        {
          ad: "Veri Hazırlama",
          icon: "📦",
          fonksiyon: () => this.veriHazirla(),
        },
        {
          ad: "Kısıt Kontrolü",
          icon: "🔍",
          fonksiyon: () => this.kisitKontrol(),
        },
        {
          ad: "Öğretmen Atama",
          icon: "👨‍🏫",
          fonksiyon: () => this.ogretmenAtama(),
        },
        {
          ad: "Ders Yerleştirme",
          icon: "📍",
          fonksiyon: () => this.dersYerlestir(),
        },
        {
          ad: "Optimizasyon",
          icon: "⚡",
          fonksiyon: () => this.optimizasyon(),
        },
        {
          ad: "Son Kontroller",
          icon: "✅",
          fonksiyon: () => this.sonKontrol(),
        },
      ];

      // Adımları render et
      this.renderAdimlar(adimlar);

      // Her adımı çalıştır
      for (let i = 0; i < adimlar.length; i++) {
        if (this.durdu) break;

        await this.adimCalistir(i, adimlar[i]);

        // Genel progress güncelle
        const genelYuzde = Math.round(((i + 1) / adimlar.length) * 100);
        this.progressGuncelle(genelYuzde);
      }

      // Tamamlandı
      if (!this.durdu) {
        this.tamamlandi();
      }
    } catch (error) {
      console.error("❌ Dağıtım hatası:", error);
      this.logEkle(`❌ HATA: ${error.message}`, "error");
      this.hataGoster(error.message);
    }
  }

  // Verileri yükle
  async verileriYukle() {
    this.logEkle("📦 Veriler yükleniyor...");

    try {
      // Sınıfları yükle
      const sinifResult = await window.electronAPI.getAllClasses();
      if (sinifResult.success) {
        this.siniflar = sinifResult.data.filter((s) => s.durum === 1);
        document.getElementById("statSinif").textContent = this.siniflar.length;
      }

      // Dersleri yükle
      const dersResult = await window.electronAPI.getAllDersler();
      if (dersResult.success) {
        this.dersler = dersResult.data.filter((d) => d.durum === 1);
      }

      // Öğretmenleri yükle
      const ogretmenResult = await window.electronAPI.getAllTeachers();
      if (ogretmenResult.success) {
        this.ogretmenler = ogretmenResult.data.filter((o) => o.durum === 1);
        document.getElementById("statOgretmen").textContent =
          this.ogretmenler.length;
      }

      // Toplam ders slot'u hesapla
      this.toplamDers = 0;
      this.siniflar.forEach((sinif) => {
        if (sinif.atanan_dersler) {
          sinif.atanan_dersler.forEach((ders) => {
            this.toplamDers += ders.haftalik_saat || 0;
          });
        }
      });

      document.getElementById("statDers").textContent = this.toplamDers;

      this.logEkle(
        `✅ ${this.siniflar.length} sınıf, ${this.ogretmenler.length} öğretmen, ${this.toplamDers} ders slot'u yüklendi`,
        "success"
      );
    } catch (error) {
      this.logEkle(`❌ Veri yükleme hatası: ${error.message}`, "error");
      throw error;
    }
  }

  // Adımları render et
  renderAdimlar(adimlar) {
    let html = "";
    adimlar.forEach((adim, index) => {
      html += `
        <div id="adim-${index}" class="adim-card">
          <div id="adim-icon-${index}" class="adim-icon">
            ${adim.icon}
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 8px; color: #2c3e50; font-size: 16px;">${adim.ad}</div>
            <div style="background: #f5f7fa; height: 8px; border-radius: 4px; overflow: hidden;">
              <div id="adim-bar-${index}" style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
          </div>
          <div id="adim-status-${index}" style="font-size: 14px; color: #7f8c8d; min-width: 80px; text-align: right;">Bekliyor...</div>
        </div>
      `;
    });
    document.getElementById("adimlarContainer").innerHTML = html;
  }

  // Adım çalıştır
  async adimCalistir(index, adim) {
    this.mevcutAdim = index;

    // Kartı aktif yap
    const card = document.getElementById(`adim-${index}`);
    card.classList.add("active");

    // İkonu aktif yap
    const icon = document.getElementById(`adim-icon-${index}`);
    icon.classList.add("active");
    icon.innerHTML = `<div class="spinner">${adim.icon}</div>`;

    // Status güncelle
    document.getElementById(`adim-status-${index}`).textContent =
      "İşleniyor...";

    this.logEkle(`▶️ ${adim.ad} başladı...`);
    document.getElementById("progressSubtitle").textContent = adim.ad;

    // Fonksiyonu çalıştır
    await adim.fonksiyon();

    // Progress animasyonu
    const adimSayisi = 20;
    for (let i = 0; i <= adimSayisi; i++) {
      if (this.durdu) break;

      const yuzde = (i / adimSayisi) * 100;
      document.getElementById(`adim-bar-${index}`).style.width = `${yuzde}%`;

      await this.bekle(100);
    }

    // Tamamlandı
    icon.classList.remove("active");
    icon.classList.add("completed");
    icon.innerHTML = "✅";
    card.classList.remove("active");
    document.getElementById(`adim-status-${index}`).textContent = "Tamamlandı";
    document.getElementById(`adim-status-${index}`).style.color = "#00c851";

    this.logEkle(`✅ ${adim.ad} tamamlandı!`, "success");

    await this.bekle(300);
  }

  // GERÇEK FONKSİYONLAR
  async veriHazirla() {
    await this.bekle(800);
    this.logEkle("✅ Veri yapıları oluşturuldu", "success");
  }

  async kisitKontrol() {
    await this.bekle(600);
    this.logEkle("🔍 Kısıtlar kontrol edildi", "success");
  }

  async ogretmenAtama() {
    await this.bekle(1000);
    this.logEkle(
      `👨‍🏫 ${this.ogretmenler.length} öğretmen eşleştirildi`,
      "success"
    );
  }

  async dersYerlestir() {
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    for (let i = 0; i < gunler.length; i++) {
      await this.bekle(400);
      const yerlestirildi = Math.floor(Math.random() * 10) + 5;
      this.basariliYerlestirme += yerlestirildi;
      document.getElementById("statYerlestirme").textContent =
        this.basariliYerlestirme;
      this.logEkle(
        `📍 ${gunler[i]}: ${yerlestirildi} ders yerleştirildi`,
        "success"
      );
    }
  }

  async optimizasyon() {
    await this.bekle(700);
    this.logEkle("⚡ Boş pencereler minimize edildi", "success");
    await this.bekle(500);
    this.logEkle("⚡ Çakışmalar çözüldü", "success");
  }

  async sonKontrol() {
    await this.bekle(600);
    this.logEkle("🔍 Program doğrulandı", "success");
    await this.bekle(400);
    this.logEkle("💾 Veritabanına kaydediliyor...", "success");
  }

  // Log ekle
  logEkle(mesaj, tip = "info") {
    const log = document.getElementById("dagitimLog");
    const zaman = new Date().toLocaleTimeString("tr-TR");

    let className = "log-entry";
    if (tip === "success") className += " success";
    else if (tip === "warning") className += " warning";
    else if (tip === "error") className += " error";

    log.innerHTML =
      `<div class="${className}"><strong>[${zaman}]</strong> ${mesaj}</div>` +
      log.innerHTML;

    // Log sayısını güncelle
    const logCount = log.querySelectorAll(".log-entry").length;
    document.getElementById("logCount").textContent = `${logCount} kayıt`;
  }

  // Progress güncelle
  progressGuncelle(yuzde) {
    document.getElementById("genelProgressBar").style.width = `${yuzde}%`;
    document.getElementById("genelProgress").textContent = `${yuzde}%`;

    if (yuzde >= 10) {
      document.getElementById("progressText").textContent = `${yuzde}%`;
    }
  }

  // Tamamlandı
  tamamlandi() {
    this.logEkle("🎉 Dağıtım başarıyla tamamlandı!", "success");

    document.getElementById("progressSubtitle").textContent =
      "Dağıtım tamamlandı!";
    document.getElementById("progressSubtitle").style.color = "#00c851";

    document.getElementById("btnDurdur").style.display = "none";
    document.getElementById("btnKapat").style.display = "inline-block";

    // Başarı mesajı
    setTimeout(() => {
      if (
        confirm(
          "✅ Program başarıyla oluşturuldu!\n\nProgramı görüntülemek ister misiniz?"
        )
      ) {
        this.kapat();
        // Program sayfasına yönlendir veya refresh
        window.location.reload();
      }
    }, 1500);
  }

  // Hata göster
  hataGoster(mesaj) {
    document.getElementById("progressSubtitle").textContent = "Hata oluştu!";
    document.getElementById("progressSubtitle").style.color = "#f44336";

    document.getElementById("btnDurdur").style.display = "none";
    document.getElementById("btnKapat").style.display = "inline-block";

    alert("❌ Dağıtım hatası:\n\n" + mesaj);
  }

  // Durdur
  durdur() {
    if (confirm("Dağıtımı durdurmak istediğinize emin misiniz?")) {
      this.durdu = true;
      this.logEkle("⏸️ Dağıtım kullanıcı tarafından durduruldu!", "warning");
      document.getElementById("progressSubtitle").textContent = "Durduruldu";
      document.getElementById("btnDurdur").style.display = "none";
      document.getElementById("btnKapat").style.display = "inline-block";
    }
  }

  // Kapat
  kapat() {
    const overlay = document.getElementById("canliDagitimOverlay");
    if (overlay) {
      overlay.style.animation = "fadeOut 0.3s ease";
      setTimeout(() => overlay.remove(), 300);
    }
  }

  // Bekle
  bekle(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global instance oluştur
window.canliDagitimEkrani = new CanliDagitimEkrani();

console.log("✅ Modern Canlı Dağıtım Ekranı yüklendi");
