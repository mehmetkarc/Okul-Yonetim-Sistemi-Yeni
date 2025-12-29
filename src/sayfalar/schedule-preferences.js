/**
 * ============================================
 * ÖĞRETMEN TERCİH YÖNETİM SİSTEMİ
 * ============================================
 * Öğretmen boş gün ve kapalı saat tercihlerini yönetir
 */

class PreferenceManager {
  constructor() {
    if (PreferenceManager.instance) {
      return PreferenceManager.instance;
    }

    this.tercihler = {}; // {ogretmenId: {bosGun, kapaliSaatler}}
    this.loadFromStorage();

    PreferenceManager.instance = this;
  }

  // ============================================
  // TERCİH İŞLEMLERİ
  // ============================================

  /**
   * Öğretmen tercihi ekle/güncelle
   */
  tercihKaydet(ogretmenId, tercihData) {
    if (!ogretmenId) {
      console.error("❌ Öğretmen ID gerekli!");
      return false;
    }

    this.tercihler[ogretmenId] = {
      bosGun: tercihData.bosGun || null,
      kapaliSaatler: tercihData.kapaliSaatler || {},
      guncellemeTarihi: new Date().toISOString(),
    };

    this.saveToStorage();
    console.log("✅ Tercih kaydedildi: Öğretmen", ogretmenId);
    return true;
  }

  /**
   * Öğretmen tercihini getir
   */
  tercihGetir(ogretmenId) {
    return this.tercihler[ogretmenId] || null;
  }

  /**
   * Öğretmen tercihini sil
   */
  tercihSil(ogretmenId) {
    if (this.tercihler[ogretmenId]) {
      delete this.tercihler[ogretmenId];
      this.saveToStorage();
      console.log("🗑️ Tercih silindi: Öğretmen", ogretmenId);
      return true;
    }
    return false;
  }

  /**
   * Tüm tercihleri getir
   */
  tumTercihleriGetir() {
    return { ...this.tercihler };
  }

  // ============================================
  // SKOR HESAPLAMA (Algoritma için)
  // ============================================

  /**
   * Öğretmenin belirli bir gün/saatte ders vermek için skor hesapla
   * Yüksek skor = Tercih ediyor
   * Düşük skor = Tercih etmiyor
   */
  skorHesapla(gun, saat, ogretmenId) {
    const tercih = this.tercihGetir(ogretmenId);
    if (!tercih) {
      return 100; // Tercih yoksa nötr skor
    }

    let skor = 100;

    // BOŞ GÜN KONTROLÜ (-50 puan)
    if (tercih.bosGun && parseInt(tercih.bosGun) === parseInt(gun)) {
      skor -= 50;
    }

    // KAPALI SAAT KONTROLÜ (-30 puan)
    if (tercih.kapaliSaatler && tercih.kapaliSaatler[gun]) {
      const kapaliSaatler = tercih.kapaliSaatler[gun];
      if (kapaliSaatler.includes(parseInt(saat))) {
        skor -= 30;
      }
    }

    return skor;
  }

  /**
   * Öğretmenin bir güne ders verip veremeyeceğini kontrol et
   */
  gunMusaitMi(gun, ogretmenId) {
    const tercih = this.tercihGetir(ogretmenId);
    if (!tercih) return true;

    if (tercih.bosGun && parseInt(tercih.bosGun) === parseInt(gun)) {
      return false;
    }

    return true;
  }

  /**
   * Öğretmenin bir saatte ders verip veremeyeceğini kontrol et
   */
  saatMusaitMi(gun, saat, ogretmenId) {
    const tercih = this.tercihGetir(ogretmenId);
    if (!tercih) return true;

    // Boş gün ise müsait değil
    if (!this.gunMusaitMi(gun, ogretmenId)) {
      return false;
    }

    // Kapalı saat ise müsait değil
    if (tercih.kapaliSaatler && tercih.kapaliSaatler[gun]) {
      if (tercih.kapaliSaatler[gun].includes(parseInt(saat))) {
        return false;
      }
    }

    return true;
  }

  // ============================================
  // ANALİZ VE İSTATİSTİK
  // ============================================

  /**
   * Belirli bir günde kaç öğretmen boş gün istiyor?
   */
  bosGunSayisi(gun) {
    let sayac = 0;
    for (const ogretmenId in this.tercihler) {
      const tercih = this.tercihler[ogretmenId];
      if (tercih.bosGun && parseInt(tercih.bosGun) === parseInt(gun)) {
        sayac++;
      }
    }
    return sayac;
  }

  /**
   * Boş gün çakışma analizi
   */
  bosGunCakismaAnalizi() {
    const analiz = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const ogretmenId in this.tercihler) {
      const tercih = this.tercihler[ogretmenId];
      if (tercih.bosGun) {
        analiz[tercih.bosGun]++;
      }
    }

    return analiz;
  }

  /**
   * Uyarı: Çok fazla öğretmen aynı günü boş istiyor mu?
   */
  cakismaUyarisi(gun, esikDegeri = 5) {
    const sayac = this.bosGunSayisi(gun);
    if (sayac >= esikDegeri) {
      return {
        uyari: true,
        mesaj: `⚠️ ${sayac} öğretmen ${this.gunAdiGetir(
          gun
        )} gününü boş istiyor! Dağıtım zorlaşabilir.`,
        ogretmenSayisi: sayac,
      };
    }
    return { uyari: false };
  }

  /**
   * Gün adını getir
   */
  gunAdiGetir(gun) {
    const gunler = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    return gunler[gun] || "Gün " + gun;
  }
  // ============================================
  // STORAGE İŞLEMLERİ
  // ============================================

  saveToStorage() {
    try {
      const data = {
        tercihler: this.tercihler,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("schedulePreferences", JSON.stringify(data));
      console.log("💾 Tercihler localStorage'a kaydedildi");
    } catch (error) {
      console.error("❌ Tercih kaydetme hatası:", error);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem("schedulePreferences");
      if (data) {
        const parsed = JSON.parse(data);
        this.tercihler = parsed.tercihler || {};
        console.log(
          "📂 Tercihler yüklendi:",
          Object.keys(this.tercihler).length,
          "öğretmen"
        );
      }
    } catch (error) {
      console.error("❌ Tercih yükleme hatası:", error);
    }
  }

  clearAll() {
    this.tercihler = {};
    localStorage.removeItem("schedulePreferences");
    console.log("🗑️ Tüm tercihler temizlendi");
  }

  // ============================================
  // EXPORT/IMPORT
  // ============================================

  exportData() {
    return {
      tercihler: this.tercihler,
      exportDate: new Date().toISOString(),
    };
  }

  importData(data) {
    try {
      this.tercihler = data.tercihler || {};
      this.saveToStorage();
      console.log("✅ Tercihler import edildi");
      return true;
    } catch (error) {
      console.error("❌ Import hatası:", error);
      return false;
    }
  }

  // ============================================
  // İSTATİSTİKLER
  // ============================================

  getIstatistikler() {
    const bosGunAnalizi = this.bosGunCakismaAnalizi();
    const toplamTercih = Object.keys(this.tercihler).length;

    let toplamKapaliSaat = 0;
    for (const ogretmenId in this.tercihler) {
      const tercih = this.tercihler[ogretmenId];
      if (tercih.kapaliSaatler) {
        for (const gun in tercih.kapaliSaatler) {
          toplamKapaliSaat += tercih.kapaliSaatler[gun].length;
        }
      }
    }

    return {
      toplamTercih: toplamTercih,
      bosGunAnalizi: bosGunAnalizi,
      toplamKapaliSaat: toplamKapaliSaat,
      enCokBosGunIstenenGun: Object.entries(bosGunAnalizi).reduce(
        (max, entry) => {
          const gun = entry[0];
          const sayi = entry[1];
          return sayi > max.sayi ? { gun: gun, sayi: sayi } : max;
        },
        { gun: null, sayi: 0 }
      ),
    };
  }
}

// ============================================
// EXPORT
// ============================================

const preferenceManager = new PreferenceManager();
window.PreferenceManager = preferenceManager;

console.log("✅ PreferenceManager hazır");
console.log(
  "📊 Mevcut tercihler:",
  Object.keys(preferenceManager.tercihler).length,
  "öğretmen"
);
