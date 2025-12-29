// ==========================================
// 🤖 AKıLLı ASİSTAN KONTROL SİSTEMİ
// ==========================================

class AkilliAsistanKontrol {
  constructor() {
    this.siniflar = [];
    this.dersler = [];
    this.ogretmenler = [];
    this.sorunlar = [];
    this.uyarilar = [];
    this.onayDurumu = false;
  }

  // Tam sayfa modal aç
  async ac() {
    console.log("🤖 Akıllı Asistan Kontrol açılıyor...");

    // Overlay oluştur
    const overlay = document.createElement("div");
    overlay.id = "akilliAsistanOverlay";
    overlay.className = "fullscreen-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #fff;
      z-index: 10000;
      overflow-y: auto;
    `;

    overlay.innerHTML = `
      <div class="akilli-asistan-container" style="max-width: 1400px; margin: 0 auto; padding: 40px;">
        <!-- Header -->
        <div class="asistan-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 16px; margin-bottom: 32px; position: relative;">
          <button onclick="akilliAsistanKontrol.kapat()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 32px; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-weight: 900;">×</button>
          
          <h1 style="font-size: 36px; margin: 0 0 12px 0; display: flex; align-items: center; gap: 16px;">
            <span style="font-size: 48px;">🤖</span>
            Akıllı Asistan - Program Kontrolü
          </h1>
          <p style="font-size: 18px; margin: 0; opacity: 0.9;">
            Verileriniz kontrol ediliyor ve dağıtım için hazırlanıyor
          </p>
        </div>

        <!-- Progress -->
        <div id="kontrolProgress" style="margin-bottom: 32px;">
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #333;">Kontrol Durumu</span>
              <span id="progressText" style="font-weight: 600; color: #667eea;">0%</span>
            </div>
            <div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
              <div id="progressBar" style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: 0%; transition: width 0.5s;"></div>
            </div>
          </div>
        </div>

        <!-- Kontrol Sonuçları -->
        <div class="kontrol-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 32px;">
          <!-- Sınıflar -->
          <div id="sinifKontrol" class="kontrol-card" style="background: #fff; border: 2px solid #e0e0e0; border-radius: 12px; padding: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="font-size: 32px;">🏫</div>
              <h3 style="margin: 0; font-size: 18px;">Sınıflar</h3>
            </div>
            <div id="sinifSonuc" style="color: #666;">Kontrol ediliyor...</div>
          </div>

          <!-- Dersler -->
          <div id="dersKontrol" class="kontrol-card" style="background: #fff; border: 2px solid #e0e0e0; border-radius: 12px; padding: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="font-size: 32px;">📚</div>
              <h3 style="margin: 0; font-size: 18px;">Dersler</h3>
            </div>
            <div id="dersSonuc" style="color: #666;">Kontrol ediliyor...</div>
          </div>

          <!-- Öğretmenler -->
          <div id="ogretmenKontrol" class="kontrol-card" style="background: #fff; border: 2px solid #e0e0e0; border-radius: 12px; padding: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="font-size: 32px;">👨‍🏫</div>
              <h3 style="margin: 0; font-size: 18px;">Öğretmenler</h3>
            </div>
            <div id="ogretmenSonuc" style="color: #666;">Kontrol ediliyor...</div>
          </div>
        </div>

        <!-- Sorunlar ve Uyarılar -->
        <div id="sorunlarContainer" style="display: none; margin-bottom: 32px;">
          <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 12px; padding: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #856404; display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 24px;">⚠️</span>
              Tespit Edilen Sorunlar
            </h3>
            <div id="sorunlarList"></div>
          </div>
        </div>

        <!-- Başarılı Durum -->
        <div id="basariliDurum" style="display: none;">
          <div style="background: linear-gradient(135deg, #00c851 0%, #007e33 100%); color: white; border-radius: 12px; padding: 48px; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 24px;">✅</div>
            <h2 style="font-size: 32px; margin: 0 0 16px 0;">Dağıtıma Hazır!</h2>
            <p style="font-size: 18px; margin: 0 0 32px 0; opacity: 0.9;">
              Tüm veriler kontrol edildi. Otomatik dağıtım başlatabilirsiniz.
            </p>
            <button onclick="akilliAsistanKontrol.dagitimBaslat()" style="background: white; color: #00c851; border: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer;">
              🚀 Dağıtımı Başlat
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Kontrolü başlat
    await this.kontrolBaslat();
  }

  // Kontrol başlat
  async kontrolBaslat() {
    console.log("🔍 Kontrol başlatılıyor...");

    // Progress güncelle
    this.progressGuncelle(10, "Veriler yükleniyor...");
    await this.bekle(500);

    // 1. ÖNCELİKLE DERSLERİ YÜKLE (Sınıflardan önce!)
    await this.dersleriKontrolEt();
    this.progressGuncelle(30, "Dersler kontrol edildi");
    await this.bekle(500);

    // 2. SONRA SINIFLARI KONTROL ET
    await this.siniflariKontrolEt();
    this.progressGuncelle(60, "Sınıflar kontrol edildi");
    await this.bekle(500);

    // 3. EN SON ÖĞRETMENLER
    await this.ogretmenleriKontrolEt();
    this.progressGuncelle(100, "Kontrol tamamlandı");
    await this.bekle(500);

    // Sonuçları göster
    this.sonuclariGoster();
  }

  // Sınıfları kontrol et
  async siniflariKontrolEt() {
    try {
      console.log("🔍 === SINIF KONTROLÜ BAŞLADI ===");

      const result = await window.electronAPI.getAllClasses();
      console.log("📦 getAllClasses sonucu:", result);

      if (result.success) {
        this.siniflar = result.data.filter((s) => s.durum === 1);

        console.log(`📚 Aktif sınıf sayısı: ${this.siniflar.length}`);

        // Her sınıfın yapısını detaylı logla
        this.siniflar.forEach((sinif, index) => {
          console.log(`\n📋 SINIF ${index + 1}:`, {
            id: sinif.id,
            sinif_adi: sinif.sinif_adi,
            sinif_kodu: sinif.sinif_kodu,
            seviye: sinif.seviye || sinif.sinif_duzey,
            atanan_dersler: sinif.atanan_dersler,
            "TÜM VERİ": sinif,
          });

          // Atanan dersler varsa detaylandır
          if (sinif.atanan_dersler) {
            console.log(
              `  └─ atanan_dersler tipi:`,
              typeof sinif.atanan_dersler
            );
            console.log(`  └─ atanan_dersler içeriği:`, sinif.atanan_dersler);
          }
        });

        if (this.siniflar.length === 0) {
          this.sorunlar.push({
            tip: "kritik",
            mesaj: "Hiç sınıf bulunamadı! Lütfen önce sınıf ekleyin.",
            cozum: "Sınıf Yönetimi sayfasından sınıf ekleyin.",
          });
        } else {
          // Atama kontrolü
          let atamaSayisi = 0;
          let detayliMesaj = "";

          this.siniflar.forEach((sinif) => {
            const dersCount = sinif.atanan_dersler?.length || 0;

            if (dersCount > 0) {
              atamaSayisi++;
              detayliMesaj += `\n• ${sinif.sinif_adi}: ${dersCount} ders`;
            } else {
              detayliMesaj += `\n• ${sinif.sinif_adi}: Ders atanmamış ❌`;
            }
          });

          if (atamaSayisi === 0) {
            this.sorunlar.push({
              tip: "kritik",
              mesaj: "Hiçbir sınıfa ders atanmamış!",
              cozum:
                "Sınıf-Ders-Öğretmen Atama butonuna tıklayarak atama yapın.",
              detay: detayliMesaj,
            });
          }
        }

        document.getElementById("sinifSonuc").innerHTML = `
        <div style="font-size: 32px; font-weight: 900; color: ${
          this.siniflar.length > 0 ? "#00c851" : "#f44336"
        }; margin-bottom: 8px;">
          ${this.siniflar.length}
        </div>
        <div style="font-size: 14px; color: #666;">
          ${this.siniflar.length > 0 ? "Sınıf bulundu" : "Sınıf yok!"}
        </div>
      `;
      }

      console.log("🔍 === SINIF KONTROLÜ BİTTİ ===\n");
    } catch (error) {
      console.error("❌ Sınıf kontrol hatası:", error);
      this.sorunlar.push({
        tip: "kritik",
        mesaj: "Sınıflar yüklenirken hata oluştu!",
        cozum: "Veritabanı bağlantısını kontrol edin.",
      });
    }
  }

  // Dersleri kontrol et
  async dersleriKontrolEt() {
    try {
      console.log("🔍 === DERS KONTROLÜ BAŞLADI ===");

      const result = await window.electronAPI.getAllDersler();
      console.log("📦 getAllDersler sonucu:", result);

      if (result.success) {
        this.dersler = result.data.filter((d) => d.durum === 1);

        console.log(`📚 Aktif ders sayısı: ${this.dersler.length}`);

        // Her dersin yapısını logla
        this.dersler.forEach((ders, index) => {
          console.log(`\n📖 DERS ${index + 1}:`, {
            id: ders.id,
            ders_adi: ders.ders_adi,
            ders_kodu: ders.ders_kodu,
            haftalik_saat: ders.haftalik_saat || ders.haftalik_ders_saati,
            ders_blogu: ders.ders_blogu,
            "TÜM VERİ": ders,
          });
        });

        if (this.dersler.length === 0) {
          this.sorunlar.push({
            tip: "kritik",
            mesaj: "Hiç ders bulunamadı!",
            cozum: "Ders Yönetimi sayfasından ders ekleyin.",
          });
        }

        document.getElementById("dersSonuc").innerHTML = `
        <div style="font-size: 32px; font-weight: 900; color: ${
          this.dersler.length > 0 ? "#00c851" : "#f44336"
        }; margin-bottom: 8px;">
          ${this.dersler.length}
        </div>
        <div style="font-size: 14px; color: #666;">
          ${this.dersler.length > 0 ? "Ders bulundu" : "Ders yok!"}
        </div>
      `;
      }

      console.log("🔍 === DERS KONTROLÜ BİTTİ ===\n");
    } catch (error) {
      console.error("❌ Ders kontrol hatası:", error);
      this.sorunlar.push({
        tip: "kritik",
        mesaj: "Dersler yüklenirken hata oluştu!",
        cozum: "Veritabanı bağlantısını kontrol edin.",
      });
    }
  }

  // Öğretmenleri kontrol et
  async ogretmenleriKontrolEt() {
    try {
      console.log("🔍 === ÖĞRETMEN KONTROLÜ BAŞLADI ===");

      const result = await window.electronAPI.getAllTeachers();
      console.log("📦 getAllTeachers sonucu:", result);

      if (result.success) {
        this.ogretmenler = result.data.filter((o) => o.durum === 1);

        console.log(`👨‍🏫 Aktif öğretmen sayısı: ${this.ogretmenler.length}`);

        // Her öğretmenin yapısını logla
        this.ogretmenler.forEach((ogr, index) => {
          console.log(`\n👨‍🏫 ÖĞRETMEN ${index + 1}:`, {
            id: ogr.id,
            ad_soyad: ogr.ad_soyad,
            brans: ogr.brans,
            ders_yukü: ogr.ders_yuku || ogr.haftalik_ders_saati,
            atanan_dersler: ogr.atanan_dersler || ogr.dersler,
            "TÜM VERİ": ogr,
          });
        });

        if (this.ogretmenler.length === 0) {
          this.sorunlar.push({
            tip: "kritik",
            mesaj: "Hiç öğretmen bulunamadı!",
            cozum: "Öğretmen Yönetimi sayfasından öğretmen ekleyin.",
          });
        }

        document.getElementById("ogretmenSonuc").innerHTML = `
        <div style="font-size: 32px; font-weight: 900; color: ${
          this.ogretmenler.length > 0 ? "#00c851" : "#f44336"
        }; margin-bottom: 8px;">
          ${this.ogretmenler.length}
        </div>
        <div style="font-size: 14px; color: #666;">
          ${this.ogretmenler.length > 0 ? "Öğretmen bulundu" : "Öğretmen yok!"}
        </div>
      `;
      }

      console.log("🔍 === ÖĞRETMEN KONTROLÜ BİTTİ ===\n");
    } catch (error) {
      console.error("❌ Öğretmen kontrol hatası:", error);
      this.sorunlar.push({
        tip: "kritik",
        mesaj: "Öğretmenler yüklenirken hata oluştu!",
        cozum: "Veritabanı bağlantısını kontrol edin.",
      });
    }
  }

  // Sonuçları göster
  sonuclariGoster() {
    if (this.sorunlar.length > 0 || this.uyarilar.length > 0) {
      // Sorunlar var
      document.getElementById("sorunlarContainer").style.display = "block";

      let html = "";

      this.sorunlar.forEach((sorun, index) => {
        html += `
        <div style="background: #fff; border-left: 4px solid #f44336; padding: 16px; margin-bottom: 12px; border-radius: 8px;">
          <div style="font-weight: 600; color: #f44336; margin-bottom: 8px;">
            ${index + 1}. ${sorun.mesaj}
          </div>
          <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
            💡 Çözüm: ${sorun.cozum}
          </div>
          ${
            sorun.detay
              ? `<div style="color: #999; font-size: 12px; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; white-space: pre-line;">${sorun.detay}</div>`
              : ""
          }
        </div>
      `;
      });

      this.uyarilar.forEach((uyari, index) => {
        html += `
        <div style="background: #fff; border-left: 4px solid #ff9800; padding: 16px; margin-bottom: 12px; border-radius: 8px;">
          <div style="font-weight: 600; color: #ff9800; margin-bottom: 8px;">
            ⚠️ ${uyari.mesaj}
          </div>
          <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
            💡 Öneri: ${uyari.cozum}
          </div>
          ${
            uyari.detay
              ? `<div style="color: #999; font-size: 12px; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; white-space: pre-line;">${uyari.detay}</div>`
              : ""
          }
        </div>
      `;
      });

      document.getElementById("sorunlarList").innerHTML = html;
    } else {
      // Her şey tamam
      document.getElementById("basariliDurum").style.display = "block";
      this.onayDurumu = true;
    }
  }
  // Progress güncelle
  progressGuncelle(yuzde, mesaj) {
    document.getElementById("progressBar").style.width = `${yuzde}%`;
    document.getElementById("progressText").textContent = `${yuzde}%`;
  }

  // Bekle
  bekle(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Dağıtım başlat
  dagitimBaslat() {
    console.log("🚀 Dağıtım başlatılıyor...");
    this.kapat();

    // Canlı dağıtım ekranını aç
    if (window.canliDagitimEkrani) {
      window.canliDagitimEkrani.ac();
    } else {
      alert("Canlı dağıtım ekranı henüz yüklenmedi!");
    }
  }

  // Kapat
  kapat() {
    const overlay = document.getElementById("akilliAsistanOverlay");
    if (overlay) {
      overlay.remove();
    }
  }
}

// Global instance oluştur
window.akilliAsistanKontrol = new AkilliAsistanKontrol();

console.log("✅ Akıllı Asistan Kontrol sistemi yüklendi");
