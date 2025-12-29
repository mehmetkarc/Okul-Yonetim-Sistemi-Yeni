// ==========================================
// 🚀 CANLI DAĞITIM SİSTEMİ - ANA KONTROL
// ==========================================

class CanliDagitimMain {
  constructor() {
    console.log("🚀 Canlı Dağıtım Main başlatılıyor...");

    // Veri yapıları
    this.siniflar = [];
    this.dersler = [];
    this.ogretmenler = [];
    this.atamalar = [];
    this.bloklar = [];
    this.grid = [];
    this.stats = {
      toplamBlok: 0,
      dagitilan: 0,
      bekleyen: 0,
      kilitli: 0,
    };
    this.goruntulemeModu = "genel"; // genel, ogretmen, sinif

    // ✅ Manager'ları NULL başlat (baslat() içinde oluşturulacak)
    this.uiManager = null;
    this.blokManager = null;
    this.gridManager = null;

    console.log("✅ Canlı Dağıtım Main oluşturuldu");
  }

  // ==========================================
  // BAŞLAT
  // ==========================================
  async baslat() {
    console.log("🚀 Canlı Dağıtım başlatılıyor...");

    try {
      // ✅ 0. MANAGER'LARI OLUŞTUR
      console.log("🔧 Manager'lar oluşturuluyor...");

      if (typeof CanliDagitimUI !== "undefined") {
        this.uiManager = new CanliDagitimUI(this);
        console.log("✅ UIManager oluşturuldu");
      } else {
        console.error("❌ CanliDagitimUI class bulunamadı!");
        Bildirim.goster("error", "UI sistemi yüklenemedi!");
        return;
      }

      if (typeof CanliDagitimBlokManager !== "undefined") {
        this.blokManager = new CanliDagitimBlokManager(this);
        console.log("✅ BlokManager oluşturuldu");
      } else {
        console.error("❌ CanliDagitimBlokManager class bulunamadı!");
      }

      if (typeof CanliDagitimGridManager !== "undefined") {
        this.gridManager = new CanliDagitimGridManager(this);
        console.log("✅ GridManager oluşturuldu");
      } else {
        console.error("❌ CanliDagitimGridManager class bulunamadı!");
      }

      // 1. VERİ KONTROLÜ
      console.log("📊 1. Veri kontrolü yapılıyor...");
      const kontrolSonucu = await this.verileriKontrolEt();

      if (!kontrolSonucu.success) {
        Bildirim.goster("error", kontrolSonucu.message);
        return;
      }

      // 2. VERİLERİ YÜKLE
      console.log("📦 2. Veriler yükleniyor...");
      await this.verileriYukle();

      // 3. BLOKLARI OLUŞTUR
      console.log("🧩 3. Bloklar oluşturuluyor...");
      this.bloklariOlustur();

      // 4. İSTATİSTİKLERİ HESAPLA
      this.istatistikleriHesapla();

      // 5. UI'YI RENDER ET
      console.log("🎨 4. UI render ediliyor...");
      if (this.uiManager) {
        this.uiManager.render();
      } else {
        console.error("❌ UIManager bulunamadı!");
      }

      console.log("✅ Canlı Dağıtım başarıyla başlatıldı!");
      Bildirim.goster(
        "success",
        "Canlı Dağıtım hazır! Dağıtıma başlayabilirsiniz."
      );
    } catch (error) {
      console.error("❌ Başlatma hatası:", error);
      Bildirim.goster("error", "Başlatma hatası: " + error.message);
    }
  }

  // ==========================================
  // VERİ KONTROL SİSTEMİ
  // ==========================================

  async verileriKontrolEt() {
    console.log("🔍 Veri kontrolü başlatılıyor...");

    const hatalar = [];
    const uyarilar = [];

    try {
      // 1. SINIF KONTROLÜ
      console.log("🏫 Sınıflar kontrol ediliyor...");
      const sinifResult = await window.electronAPI.getAllClasses();

      if (!sinifResult.success) {
        hatalar.push("Sınıflar yüklenemedi!");
      } else if (sinifResult.data.length === 0) {
        hatalar.push("Hiç sınıf bulunamadı! Önce sınıf ekleyin.");
      } else {
        console.log(`✅ ${sinifResult.data.length} sınıf bulundu`);
      }

      // 2. DERS KONTROLÜ
      console.log("📚 Dersler kontrol ediliyor...");
      const dersResult = await window.electronAPI.getAllDerslerWithBlocks();

      if (!dersResult.success) {
        hatalar.push("Dersler yüklenemedi!");
      } else if (dersResult.data.length === 0) {
        hatalar.push("Hiç ders bulunamadı! Önce ders ekleyin.");
      } else {
        console.log(`✅ ${dersResult.data.length} ders bulundu`);

        // Blok kontrolü
        const bloksuzDersler = dersResult.data.filter(
          (d) => !d.ders_blogu || d.ders_blogu === "YOK"
        );
        if (bloksuzDersler.length > 0) {
          uyarilar.push(
            `${bloksuzDersler.length} dersin blok bilgisi yok. ` +
              `Dersler: ${bloksuzDersler.map((d) => d.ders_adi).join(", ")}`
          );
        }
      }

      // 3. ÖĞRETMEN KONTROLÜ
      console.log("👨‍🏫 Öğretmenler kontrol ediliyor...");
      const ogretmenResult = await window.electronAPI.getAllTeachers();

      if (!ogretmenResult.success) {
        hatalar.push("Öğretmenler yüklenemedi!");
      } else if (ogretmenResult.data.length === 0) {
        hatalar.push("Hiç öğretmen bulunamadı! Önce öğretmen ekleyin.");
      } else {
        console.log(`✅ ${ogretmenResult.data.length} öğretmen bulundu`);
      }

      // 4. ATAMA KONTROLÜ
      console.log("🔗 Atamalar kontrol ediliyor...");
      const atamaResult = await window.electronAPI.dbQuery(
        "SELECT COUNT(*) as sayi FROM sinif_ders_ogretmen"
      );

      if (atamaResult.success && atamaResult.data.length > 0) {
        const atamaSayisi = atamaResult.data[0].sayi;
        if (atamaSayisi === 0) {
          hatalar.push(
            "Hiç atama bulunamadı! Önce 'Sınıf-Ders-Öğretmen Atama' ekranından atama yapın."
          );
        } else {
          console.log(`✅ ${atamaSayisi} atama bulundu`);
        }
      } else {
        uyarilar.push("Atama bilgisi alınamadı, devam ediliyor...");
      }

      // 5. SONUÇ
      if (hatalar.length > 0) {
        console.error("❌ Kritik hatalar:", hatalar);
        return {
          success: false,
          message: "Kritik hatalar bulundu:\n• " + hatalar.join("\n• "),
          hatalar: hatalar,
          uyarilar: uyarilar,
        };
      }

      if (uyarilar.length > 0) {
        console.warn("⚠️ Uyarılar:", uyarilar);
        Bildirim.goster(
          "warning",
          `${uyarilar.length} uyarı bulundu. Konsolu kontrol edin.`
        );
      }

      console.log("✅ Veri kontrolü başarılı!");
      return {
        success: true,
        message: "Tüm veriler hazır!",
        hatalar: [],
        uyarilar: uyarilar,
      };
    } catch (error) {
      console.error("❌ Kontrol hatası:", error);
      return {
        success: false,
        message: "Kontrol sırasında hata: " + error.message,
        hatalar: [error.message],
        uyarilar: [],
      };
    }
  }

  // ==========================================
  // VERİLERİ YÜKLE
  // ==========================================

  async verileriYukle() {
    console.log("📦 Veriler yükleniyor...");

    try {
      // 1. Sınıfları yükle
      const sinifResult = await window.electronAPI.getAllClasses();
      this.siniflar = sinifResult.success
        ? sinifResult.data.filter((s) => s.durum === 1)
        : [];

      // 2. Dersleri yükle
      const dersResult = await window.electronAPI.getAllDerslerWithBlocks();
      this.dersler = dersResult.success ? dersResult.data : [];

      // 3. Öğretmenleri yükle
      const ogretmenResult = await window.electronAPI.getAllTeachers();
      this.ogretmenler = ogretmenResult.success
        ? ogretmenResult.data.filter((o) => o.durum === 1)
        : [];

      // 4. Atamaları yükle
      const atamaResult = await window.electronAPI.dbQuery(`
        SELECT 
          sdo.*,
          d.ders_adi,
          d.ders_kodu,
          d.ders_blogu,
          d.ders_rengi,
          d.haftalik_saat,
          o.ad_soyad,
          o.kisa_ad,
          s.sinif_adi
        FROM sinif_ders_ogretmen sdo
        JOIN dersler d ON sdo.ders_id = d.id
        JOIN ogretmenler o ON sdo.ogretmen_id = o.id
        JOIN siniflar s ON sdo.sinif_id = s.id
        WHERE d.durum = 1 AND o.durum = 1 AND s.durum = 1
      `);

      this.atamalar = atamaResult.success ? atamaResult.data : [];

      console.log("📊 Yüklenen veri:");
      console.log(`   - ${this.siniflar.length} sınıf`);
      console.log(`   - ${this.dersler.length} ders`);
      console.log(`   - ${this.ogretmenler.length} öğretmen`);
      console.log(`   - ${this.atamalar.length} atama`);

      return true;
    } catch (error) {
      console.error("❌ Veri yükleme hatası:", error);
      throw error;
    }
  }
  // ==========================================
  // BLOK OLUŞTURMA (DÜZELTİLMİŞ)
  // ==========================================

  bloklariOlustur() {
    console.log("🧩 Bloklar oluşturuluyor...");

    this.bloklar = [];

    this.siniflar.forEach((sinif) => {
      console.log(`📋 ${sinif.sinif_adi} için bloklar oluşturuluyor...`);

      const sinifAtamalari = this.atamalar.filter(
        (a) => a.sinif_id === sinif.id
      );

      console.log(`   🔗 ${sinifAtamalari.length} atama bulundu`);

      sinifAtamalari.forEach((atama) => {
        const ders = this.dersler.find((d) => d.id === atama.ders_id);
        const ogretmen = this.ogretmenler.find(
          (o) => o.id === atama.ogretmen_id
        );

        if (!ders || !ogretmen) {
          console.warn(`⚠️ Ders veya öğretmen bulunamadı:`, atama);
          return;
        }

        const blokBilgisi = this.parseBlokBilgisi(
          ders.ders_blogu,
          atama.haftalik_saat || ders.haftalik_saat
        );

        console.log(
          `   📚 ${ders.ders_adi} → Blok: ${blokBilgisi.bloklar.join("-")} (${
            blokBilgisi.toplam
          } saat)`
        );

        blokBilgisi.bloklar.forEach((blokSaati, index) => {
          const blok = {
            id: `blok_${sinif.id}_${ders.id}_${ogretmen.id}_${index}`,
            sinif_id: sinif.id,
            sinif_adi: sinif.sinif_adi,
            ders_id: ders.id,
            ders_adi: ders.ders_adi,
            ders_kodu: ders.ders_kodu,
            ogretmen_id: ogretmen.id,
            ogretmen_adi: ogretmen.ad_soyad,
            ogretmen_kisa:
              ogretmen.kisa_ad || this.kisaAdOlustur(ogretmen.ad_soyad),
            blok_index: index + 1,
            blok_saati: blokSaati,
            toplam_blok: blokBilgisi.bloklar.length,
            renk: ders.ders_rengi || this.renkOlustur(ders.ders_adi),
            durum: "bekliyor",
            yerlesim: null,
          };

          this.bloklar.push(blok);
          console.log(
            `     ✅ Blok ${index + 1}/${blokBilgisi.bloklar.length}: ${
              ders.ders_adi
            } - ${
              ogretmen.kisa_ad || this.kisaAdOlustur(ogretmen.ad_soyad)
            } (${blokSaati} saat)`
          );
        });
      });
    });

    console.log(`✅ Toplam ${this.bloklar.length} blok oluşturuldu`);
  }

  parseBlokBilgisi(blokString, haftalikSaat) {
    console.log(
      `   🔍 Parse: blokString="${blokString}", haftalikSaat=${haftalikSaat}`
    );

    if (!blokString || blokString === "YOK" || blokString === "") {
      console.log(`   → Tek blok (${haftalikSaat} saat)`);
      return {
        tip: "tek",
        bloklar: [haftalikSaat || 1],
        toplam: haftalikSaat || 1,
      };
    }

    if (blokString.includes("-")) {
      const bloklar = blokString
        .split("-")
        .map((b) => parseInt(b.trim()))
        .filter((b) => !isNaN(b) && b > 0);

      console.log(`   → Çoklu blok: ${bloklar.join("+")}`);

      return {
        tip: "coklu",
        bloklar: bloklar,
        toplam: bloklar.reduce((sum, b) => sum + b, 0),
      };
    }

    const sayi = parseInt(blokString);
    if (!isNaN(sayi) && sayi > 0) {
      console.log(`   → Tek blok (${sayi} saat)`);
      return {
        tip: "tek",
        bloklar: [sayi],
        toplam: sayi,
      };
    }

    console.log(`   → Fallback: tek blok (${haftalikSaat} saat)`);
    return {
      tip: "tek",
      bloklar: [haftalikSaat || 1],
      toplam: haftalikSaat || 1,
    };
  }

  kisaAdOlustur(adSoyad) {
    const parts = adSoyad.trim().toUpperCase().split(" ");
    if (parts.length < 2) return adSoyad.substring(0, 3);
    return `${parts[0].charAt(0)}.${parts[parts.length - 1].substring(0, 3)}`;
  }

  renkOlustur(dersAdi) {
    const renkler = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
    ];
    const index = dersAdi.charCodeAt(0) % renkler.length;
    return renkler[index];
  }

  // ==========================================
  // İSTATİSTİKLERİ HESAPLA
  // ==========================================

  istatistikleriHesapla() {
    console.log("📊 İstatistikler hesaplanıyor...");

    this.stats = {
      toplamBlok: this.bloklar.length,
      dagitilan: this.bloklar.filter((b) => b.durum === "dagitildi").length,
      bekleyen: this.bloklar.filter((b) => b.durum === "bekliyor").length,
      kilitli: this.bloklar.filter((b) => b.durum === "kilit").length,
      toplamSinif: this.siniflar.length,
      toplamOgretmen: this.ogretmenler.length,
      toplamDers: this.dersler.length,
    };

    console.log("✅ İstatistikler:", this.stats);
  }

  // ==========================================
  // VERİLERİ SIFIRLA
  // ==========================================

  verileriSifirla() {
    this.siniflar = [];
    this.dersler = [];
    this.ogretmenler = [];
    this.atamalar = [];
    this.bloklar = [];
    this.grid = [];
    this.stats = {
      toplamBlok: 0,
      dagitilan: 0,
      bekleyen: 0,
      kilitli: 0,
    };
    this.goruntulemeModu = "genel";
    console.log("🔄 Veriler sıfırlandı");
  }

  // ==========================================
  // KAPAT
  // ==========================================
  kapat() {
    const overlay = document.getElementById("canliDagitimFullscreen");
    if (overlay) {
      overlay.remove();
      console.log("✅ Canlı Dağıtım kapatıldı");
    }

    const mainContainer = document.querySelector("main.page-container");
    if (mainContainer) {
      mainContainer.style.display = "block";
    }
  }
}

// ==========================================
// GLOBAL INSTANCE
// ==========================================
window.canliDagitimMain = new CanliDagitimMain();

console.log("✅ Canlı Dağıtım Main yüklendi");
