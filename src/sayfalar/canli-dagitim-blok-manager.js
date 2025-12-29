// ==========================================
// 🧩 CANLI DAĞITIM - BLOK MANAGER
// ==========================================

class CanliDagitimBlokManager {
  constructor(main) {
    this.main = main;
  }

  // Blok seç
  blokSec(blokId) {
    this.main.seciliBlok = this.main.bloklar.find((b) => b.id === blokId);
    console.log("✅ Blok seçildi:", this.main.seciliBlok);

    // UI'yi güncelle
    this.vurgulaBlok(blokId);
  }

  // Bloku vurgula
  vurgulaBlok(blokId) {
    // Tüm blok vurgularını kaldır
    document.querySelectorAll(".blok-item").forEach((el) => {
      el.classList.remove("selected");
    });

    // Seçili bloğu vurgula
    const blokEl = document.querySelector(`[data-blok-id="${blokId}"]`);
    if (blokEl) {
      blokEl.classList.add("selected");
    }
  }

  // Bloğu yerleştir
  blokYerlestir(blokId, gun, saatNo) {
    const blok = this.main.bloklar.find((b) => b.id === blokId);
    if (!blok) {
      console.error("❌ Blok bulunamadı:", blokId);
      return false;
    }

    // Kontroller
    if (!this.yerlestirebilirMi(blok, gun, saatNo)) {
      alert("❌ Bu bloğu buraya yerleştiremezsiniz!");
      return false;
    }

    // Yerleştir
    blok.gun = gun;
    blok.saat_no = saatNo;
    blok.durum = "manuel";

    console.log("✅ Blok yerleştirildi:", blok);

    // İstatistikleri güncelle
    this.main.stats.dagitilan++;
    this.main.stats.bekleyen--;

    // UI'yi güncelle
    this.main.uiManager.guncelle();
    if (this.main.gridManager) {
      this.main.gridManager.render();
    }

    return true;
  }

  // Yerleştirebilir mi?
  yerlestirebilirMi(blok, gun, saatNo) {
    // 1. Aynı öğretmen aynı saatte başka yerde mi?
    const cakisanOgretmen = this.main.bloklar.find(
      (b) =>
        b.ogretmen_id === blok.ogretmen_id &&
        b.gun === gun &&
        b.saat_no === saatNo &&
        b.id !== blok.id
    );

    if (cakisanOgretmen) {
      console.warn("⚠️ Öğretmen çakışması:", cakisanOgretmen);
      return false;
    }

    // 2. Aynı sınıf aynı saatte başka derse mi giriyor?
    const cakisanSinif = this.main.bloklar.find(
      (b) =>
        b.sinif_id === blok.sinif_id &&
        b.gun === gun &&
        b.saat_no === saatNo &&
        b.id !== blok.id
    );

    if (cakisanSinif) {
      console.warn("⚠️ Sınıf çakışması:", cakisanSinif);
      return false;
    }

    // 3. Aynı dersin diğer blokları aynı günde mi? (Kısıt: Bloklar farklı günlerde olmalı)
    const ayniDersDigerBloklar = this.main.bloklar.filter(
      (b) =>
        b.ogretmen_id === blok.ogretmen_id &&
        b.sinif_id === blok.sinif_id &&
        b.ders_id === blok.ders_id &&
        b.id !== blok.id &&
        b.gun === gun
    );

    if (ayniDersDigerBloklar.length > 0) {
      console.warn(
        "⚠️ Aynı dersin başka bloğu bu günde:",
        ayniDersDigerBloklar
      );
      return false;
    }

    return true;
  }

  // Bloğu kaldır
  blokKaldir(blokId) {
    const blok = this.main.bloklar.find((b) => b.id === blokId);
    if (!blok) return false;

    blok.gun = null;
    blok.saat_no = null;
    blok.durum = "bekliyor";

    // İstatistikleri güncelle
    this.main.stats.dagitilan--;
    this.main.stats.bekleyen++;

    // UI'yi güncelle
    this.main.uiManager.guncelle();
    if (this.main.gridManager) {
      this.main.gridManager.render();
    }

    console.log("✅ Blok kaldırıldı:", blok);
    return true;
  }

  // Seçili öğretmenlerin bloklarını dağıt
  async seciliOgretmenleriDagit() {
    if (this.main.seciliOgretmenler.size === 0) {
      alert("Lütfen en az bir öğretmen seçin!");
      return;
    }

    console.log(
      "🚀 Seçili öğretmenler dağıtılıyor:",
      this.main.seciliOgretmenler
    );

    // Seçili öğretmenlerin bloklarını al
    const bloklarDagitilacak = this.main.bloklar.filter(
      (b) =>
        this.main.seciliOgretmenler.has(b.ogretmen_id) && b.durum === "bekliyor"
    );

    if (bloklarDagitilacak.length === 0) {
      alert("Seçili öğretmenlerin dağıtılacak bloğu yok!");
      return;
    }

    // Dağıtım algoritmasını çalıştır
    await this.otomatikDagit(bloklarDagitilacak);
  }

  // Seçili sınıfları dağıt
  async seciliSiniflariDagit() {
    if (this.main.seciliSiniflar.size === 0) {
      alert("Lütfen en az bir sınıf seçin!");
      return;
    }

    console.log("🚀 Seçili sınıflar dağıtılıyor:", this.main.seciliSiniflar);

    // Seçili sınıfların bloklarını al
    const bloklarDagitilacak = this.main.bloklar.filter(
      (b) => this.main.seciliSiniflar.has(b.sinif_id) && b.durum === "bekliyor"
    );

    if (bloklarDagitilacak.length === 0) {
      alert("Seçili sınıfların dağıtılacak bloğu yok!");
      return;
    }

    // Dağıtım algoritmasını çalıştır
    await this.otomatikDagit(bloklarDagitilacak);
  }

  // Otomatik dağıt (Basit algoritma - şimdilik rastgele)
  async otomatikDagit(bloklar) {
    console.log(`🤖 ${bloklar.length} blok otomatik dağıtılıyor...`);

    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    let basarili = 0;
    let basarisiz = 0;

    for (const blok of bloklar) {
      let yerlestirildi = false;

      // Her gün ve her saat için dene
      for (const gun of gunler) {
        for (let saatNo = 1; saatNo <= 8; saatNo++) {
          if (this.yerlestirebilirMi(blok, gun, saatNo)) {
            this.blokYerlestir(blok.id, gun, saatNo);
            yerlestirildi = true;
            basarili++;
            break;
          }
        }
        if (yerlestirildi) break;
      }

      if (!yerlestirildi) {
        console.warn("⚠️ Blok yerleştirilemedi:", blok);
        basarisiz++;
      }

      // Animasyon için bekle
      await this.bekle(50);
    }

    console.log(
      `✅ Dağıtım tamamlandı: ${basarili} başarılı, ${basarisiz} başarısız`
    );

    if (basarisiz > 0) {
      alert(
        `⚠️ ${basarisiz} blok yerleştirilemedi!\n\nKısıtlar veya çakışmalar nedeniyle bazı bloklar yerleştirilemedi.`
      );
    } else {
      alert(`✅ ${basarili} blok başarıyla yerleştirildi!`);
    }
  }

  // Bekle
  bekle(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export
window.CanliDagitimBlokManager = CanliDagitimBlokManager;

console.log("✅ Canlı Dağıtım Blok Manager yüklendi");
