/**
 * ============================================
 * KISIT YÖNETİM SİSTEMİ
 * ============================================
 * Ders dağıtımında uygulanacak kurallar
 */

// ============================================
// KISIT TİPLERİ
// ============================================

const KisitTipleri = {
  // Öğretmen Kısıtları
  OGRETMEN_AYNI_GUN_MAX_DERS: "ogretmen_ayni_gun_max_ders",
  OGRETMEN_BOS_GUN: "ogretmen_bos_gun",
  OGRETMEN_KARNIYARIK: "ogretmen_karniyarik",
  OGRETMEN_TERCIH_SAATLERI: "ogretmen_tercih_saatleri",

  // Sınıf Kısıtları
  SINIF_AYNI_GUN_AYNI_DERS: "sinif_ayni_gun_ayni_ders",
  SINIF_KARNIYARIK: "sinif_karniyarik",
  SINIF_OGLE_ARASI_BOLUNME: "sinif_ogle_arasi_bolunme",

  // Ders Kısıtları
  DERS_BLOK_BOLUNMEMELI: "ders_blok_bolunmemeli",
  DERS_AYNI_GUN_OLAMASIN: "ders_ayni_gun_olamasin",

  // Genel Kısıtlar
  FIZIKI_MEKAN_CAKISMA: "fiziki_mekan_cakisma",
  OGRETMEN_CAKISMA: "ogretmen_cakisma",
};

// ============================================
// KISIT SINIFI
// ============================================

class Kisit {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.tip = data.tip || "";
    this.baslik = data.baslik || "";
    this.aciklama = data.aciklama || "";
    this.aktif = data.aktif !== undefined ? data.aktif : true;
    this.oncelik = data.oncelik || 1; // 1-10 arası (10 en yüksek)
    this.hedefler = data.hedefler || {}; // {ogretmenId: [], sinifId: [], dersId: []}
    this.parametreler = data.parametreler || {}; // Kısıta özel parametreler
  }

  generateId() {
    return "KIS_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }
}

// ============================================
// KISIT YÖNETİCİSİ
// ============================================

class ConstraintManager {
  constructor() {
    if (ConstraintManager.instance) {
      return ConstraintManager.instance;
    }

    this.kisitlar = [];
    this.ihlaller = []; // Kısıt ihlalleri log'u

    this.loadFromStorage();
    ConstraintManager.instance = this;
  }

  // ============================================
  // KISIT İŞLEMLERİ
  // ============================================

  kisitEkle(kisitData) {
    const kisit = new Kisit(kisitData);
    this.kisitlar.push(kisit);
    this.saveToStorage();
    console.log("✅ Kısıt eklendi:", kisit.baslik);
    return kisit;
  }

  kisitGuncelle(id, yeniData) {
    const index = this.kisitlar.findIndex((k) => k.id === id);
    if (index !== -1) {
      this.kisitlar[index] = new Kisit({
        ...this.kisitlar[index],
        ...yeniData,
      });
      this.saveToStorage();
      return this.kisitlar[index];
    }
    return null;
  }

  kisitSil(id) {
    this.kisitlar = this.kisitlar.filter((k) => k.id !== id);
    this.saveToStorage();
    return true;
  }

  kisitBul(id) {
    return this.kisitlar.find((k) => k.id === id);
  }

  kisitlariGetir(filtre = {}) {
    let sonuc = [...this.kisitlar];

    if (filtre.tip) {
      sonuc = sonuc.filter((k) => k.tip === filtre.tip);
    }

    if (filtre.aktif !== undefined) {
      sonuc = sonuc.filter((k) => k.aktif === filtre.aktif);
    }

    // Önceliğe göre sırala (yüksek önce)
    sonuc.sort((a, b) => b.oncelik - a.oncelik);

    return sonuc;
  }

  // ============================================
  // KISIT KONTROLÜ - ANA FONKSİYON
  // ============================================

  /**
   * Bir dersin yerleştirilebilir olup olmadığını kontrol eder
   * @returns {success: boolean, ihlaller: []}
   */
  kontrolEt(gun, saat, dersId, ogretmenId, sinifId, programData) {
    const ihlaller = [];
    const aktifKisitlar = this.kisitlariGetir({ aktif: true });

    aktifKisitlar.forEach((kisit) => {
      let sonuc = null;

      switch (kisit.tip) {
        case KisitTipleri.OGRETMEN_CAKISMA:
          sonuc = this.kontrolOgretmenCakisma(
            gun,
            saat,
            ogretmenId,
            programData
          );
          break;

        case KisitTipleri.OGRETMEN_AYNI_GUN_MAX_DERS:
          sonuc = this.kontrolOgretmenMaxDers(
            gun,
            ogretmenId,
            programData,
            kisit.parametreler
          );
          break;

        case KisitTipleri.OGRETMEN_BOS_GUN:
          sonuc = this.kontrolOgretmenBosGun(
            gun,
            ogretmenId,
            programData,
            kisit.parametreler
          );
          break;

        case KisitTipleri.SINIF_AYNI_GUN_AYNI_DERS:
          sonuc = this.kontrolSinifAyniDers(gun, dersId, sinifId, programData);
          break;

        case KisitTipleri.SINIF_OGLE_ARASI_BOLUNME:
          sonuc = this.kontrolOgleArasiBolunme(
            gun,
            saat,
            dersId,
            sinifId,
            programData,
            kisit.parametreler
          );
          break;

        case KisitTipleri.SINIF_KARNIYARIK:
          sonuc = this.kontrolSinifKarniyarik(
            gun,
            saat,
            sinifId,
            programData,
            kisit.parametreler
          );
          break;

        case KisitTipleri.OGRETMEN_KARNIYARIK:
          sonuc = this.kontrolOgretmenKarniyarik(
            gun,
            saat,
            ogretmenId,
            programData,
            kisit.parametreler
          );
          break;

        case KisitTipleri.FIZIKI_MEKAN_CAKISMA:
          // TODO: Fiziki mekan kontrolü
          break;

        default:
          break;
      }

      if (sonuc && !sonuc.success) {
        ihlaller.push({
          kisitId: kisit.id,
          kisitBaslik: kisit.baslik,
          mesaj: sonuc.mesaj,
          oncelik: kisit.oncelik,
        });
      }
    });

    return {
      success: ihlaller.length === 0,
      ihlaller,
    };
  }

  // ============================================
  // KISIT KONTROL FONKSİYONLARI
  // ============================================

  /**
   * 1. Öğretmen aynı saatte başka yerde olamaz
   */
  kontrolOgretmenCakisma(gun, saat, ogretmenId, programData) {
    if (!programData[gun] || !programData[gun][saat]) {
      return { success: true };
    }

    const mevcutDers = programData[gun][saat];
    if (mevcutDers.ogretmen_id === ogretmenId) {
      return {
        success: false,
        mesaj: `Öğretmen ${gun} günü ${saat}. saatte zaten başka bir derste!`,
      };
    }

    return { success: true };
  }

  /**
   * 2. Öğretmen günlük maksimum ders sınırı
   */
  kontrolOgretmenMaxDers(gun, ogretmenId, programData, parametreler) {
    const maxDers = parametreler.maxDers || 8;
    let gunlukDers = 0;

    if (programData[gun]) {
      Object.values(programData[gun]).forEach((hucre) => {
        if (hucre.ogretmen_id === ogretmenId) {
          gunlukDers++;
        }
      });
    }

    if (gunlukDers >= maxDers) {
      return {
        success: false,
        mesaj: `Öğretmen ${gun} günü için maksimum ${maxDers} ders sınırına ulaştı!`,
      };
    }

    return { success: true };
  }

  /**
   * 3. Öğretmen boş gün tercihi
   */
  kontrolOgretmenBosGun(gun, ogretmenId, programData, parametreler) {
    const bosGunler = parametreler.bosGunler || [];

    if (bosGunler.includes(gun)) {
      return {
        success: false,
        mesaj: `Öğretmen ${gun} gününü boş gün olarak belirlemiş!`,
      };
    }

    return { success: true };
  }

  /**
   * 4. Sınıf aynı gün aynı dersten 2 tane olamaz
   */
  kontrolSinifAyniDers(gun, dersId, sinifId, programData) {
    if (!programData[gun]) return { success: true };

    let dersSayisi = 0;
    Object.values(programData[gun]).forEach((hucre) => {
      if (hucre.sinif_id === sinifId && hucre.ders_id === dersId) {
        dersSayisi++;
      }
    });

    if (dersSayisi > 0) {
      return {
        success: false,
        mesaj: `Sınıf ${gun} günü zaten bu dersten alıyor!`,
      };
    }

    return { success: true };
  }

  /**
   * 5. Öğle arası ile bölünme kontrolü
   */
  kontrolOgleArasiBolunme(
    gun,
    saat,
    dersId,
    sinifId,
    programData,
    parametreler
  ) {
    const ogleArasiSaat = parametreler.ogleArasiSaat || 6; // 6. saat öğle arası
    const ders = window.ScheduleDataManager?.dersBul(dersId);

    if (!ders || !ders.bloklar) return { success: true };

    // Eğer ders bloklu ise ve öğle arasını kapsıyorsa
    const dersUzunluk = ders.bloklar[0] || 1;
    const dersBitisSaat = parseInt(saat) + dersUzunluk - 1;

    if (parseInt(saat) < ogleArasiSaat && dersBitisSaat >= ogleArasiSaat) {
      return {
        success: false,
        mesaj: "Bu ders öğle arası ile bölünüyor!",
      };
    }

    return { success: true };
  }

  /**
   * 6. Sınıf karnıyarık (boşluk) kontrolü
   */
  kontrolSinifKarniyarik(gun, saat, sinifId, programData, parametreler) {
    if (!parametreler.engellensin) return { success: true };

    if (!programData[gun]) return { success: true };

    // Bu günde sınıfın dersleri
    const dersler = Object.entries(programData[gun])
      .filter(([s, hucre]) => hucre.sinif_id === sinifId)
      .map(([s, hucre]) => parseInt(s))
      .sort((a, b) => a - b);

    if (dersler.length === 0) return { success: true };

    // Eğer yeni saat mevcut derslerin arasında boşluk oluşturuyorsa
    const yeniSaat = parseInt(saat);
    const ilkDers = dersler[0];
    const sonDers = dersler[dersler.length - 1];

    if (yeniSaat > ilkDers && yeniSaat < sonDers) {
      // Aradaki tüm saatlerde ders var mı kontrol et
      for (let i = ilkDers + 1; i < sonDers; i++) {
        if (!dersler.includes(i) && i !== yeniSaat) {
          return {
            success: false,
            mesaj: "Bu ders sınıf programında boşluk oluşturacak!",
          };
        }
      }
    }

    return { success: true };
  }

  /**
   * 7. Öğretmen karnıyarık kontrolü
   */
  kontrolOgretmenKarniyarik(gun, saat, ogretmenId, programData, parametreler) {
    if (!parametreler.engellensin) return { success: true };

    if (!programData[gun]) return { success: true };

    // Bu günde öğretmenin dersleri
    const dersler = Object.entries(programData[gun])
      .filter(([s, hucre]) => hucre.ogretmen_id === ogretmenId)
      .map(([s, hucre]) => parseInt(s))
      .sort((a, b) => a - b);

    if (dersler.length === 0) return { success: true };

    const yeniSaat = parseInt(saat);
    const ilkDers = dersler[0];
    const sonDers = dersler[dersler.length - 1];

    if (yeniSaat > ilkDers && yeniSaat < sonDers) {
      for (let i = ilkDers + 1; i < sonDers; i++) {
        if (!dersler.includes(i) && i !== yeniSaat) {
          return {
            success: false,
            mesaj: "Bu ders öğretmen programında boşluk oluşturacak!",
          };
        }
      }
    }

    return { success: true };
  }

  // ============================================
  // İHLAL KAYDI
  // ============================================

  ihlalKaydet(gun, saat, dersId, ogretmenId, sinifId, ihlaller) {
    this.ihlaller.push({
      tarih: new Date().toISOString(),
      gun,
      saat,
      dersId,
      ogretmenId,
      sinifId,
      ihlaller,
    });

    // Son 100 ihlali tut
    if (this.ihlaller.length > 100) {
      this.ihlaller = this.ihlaller.slice(-100);
    }

    this.saveToStorage();
  }

  ihlalleriGetir(limit = 10) {
    return this.ihlaller.slice(-limit).reverse();
  }

  // ============================================
  // STORAGE
  // ============================================

  saveToStorage() {
    try {
      const data = {
        kisitlar: this.kisitlar,
        ihlaller: this.ihlaller,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("scheduleConstraints", JSON.stringify(data));
    } catch (error) {
      console.error("Kısıt kaydetme hatası:", error);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem("scheduleConstraints");
      if (data) {
        const parsed = JSON.parse(data);
        this.kisitlar = (parsed.kisitlar || []).map((k) => new Kisit(k));
        this.ihlaller = parsed.ihlaller || [];
      }
    } catch (error) {
      console.error("Kısıt yükleme hatası:", error);
    }
  }

  clearAll() {
    this.kisitlar = [];
    this.ihlaller = [];
    localStorage.removeItem("scheduleConstraints");
  }

  // ============================================
  // VARSAYILAN KISITLARI OLUŞTUR
  // ============================================

  varsayilanKisitlariOlustur() {
    // 1. Öğretmen çakışma kontrolü (EN ÖNEMLİ)
    this.kisitEkle({
      tip: KisitTipleri.OGRETMEN_CAKISMA,
      baslik: "Öğretmen Çakışma Kontrolü",
      aciklama: "Bir öğretmen aynı saatte iki yerde olamaz",
      aktif: true,
      oncelik: 10,
    });

    // 2. Öğretmen günlük max ders
    this.kisitEkle({
      tip: KisitTipleri.OGRETMEN_AYNI_GUN_MAX_DERS,
      baslik: "Öğretmen Günlük Maksimum Ders",
      aciklama: "Bir öğretmen günde en fazla belirli sayıda ders verebilir",
      aktif: true,
      oncelik: 8,
      parametreler: { maxDers: 8 },
    });

    // 3. Sınıf aynı gün aynı ders
    this.kisitEkle({
      tip: KisitTipleri.SINIF_AYNI_GUN_AYNI_DERS,
      baslik: "Sınıf Aynı Gün Aynı Ders",
      aciklama: "Bir sınıf aynı gün aynı dersten iki kez alamaz",
      aktif: true,
      oncelik: 9,
    });

    // 4. Öğle arası bölünme
    this.kisitEkle({
      tip: KisitTipleri.SINIF_OGLE_ARASI_BOLUNME,
      baslik: "Öğle Arası Bölünme Kontrolü",
      aciklama: "Dersler öğle arası ile bölünmemeli",
      aktif: false, // Başlangıçta kapalı
      oncelik: 6,
      parametreler: { ogleArasiSaat: 6 },
    });

    console.log("✅ Varsayılan kısıtlar oluşturuldu");
  }
}

// ============================================
// EXPORT
// ============================================

const constraintManager = new ConstraintManager();
window.ConstraintManager = constraintManager;
window.KisitTipleri = KisitTipleri;

console.log("✅ ConstraintManager hazır");
console.log("📋 Mevcut kısıtlar:", constraintManager.kisitlariGetir().length);
