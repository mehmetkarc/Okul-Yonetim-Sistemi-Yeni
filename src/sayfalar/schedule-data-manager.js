/**
 * ============================================
 * DERS DAĞITIM SİSTEMİ - VERİ YÖNETİCİSİ (V1.1)
 * ============================================
 * Tüm verileri yöneten merkezi sistem
 * - Öğretmenler, Dersler, Sınıflar
 * - LocalStorage entegrasyonu
 * - CRUD operasyonları
 * - DataAdapter'dan gelen işlenmiş veriyi sisteme yükleme mekanizması eklendi.
 */

// ============================================
// SINIF TANIMLARI
// ============================================

/**
 * Öğretmen Sınıfı
 */
class Ogretmen {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.kod = data.kod || ""; // Örn: "M.KA"
    this.ad = data.ad || "";
    this.soyad = data.soyad || "";
    this.brans = data.brans || "";
    this.email = data.email || "";
    this.dersYuku = data.dersYuku || 0; // Haftalık ders saati
    this.atananDersler = data.atananDersler || []; // [{sinifId, dersId, saatSayisi}]
    this.tercihler = data.tercihler || {
      bosGunler: [], // ["Pazartesi", "Cuma"]
      tercihEdilenSaatler: {}, // {"Pazartesi": [1,2,3], "Salı": [4,5,6]}
      tercihEdilmeyenSaatler: {}, // Aynı format
    };
    this.kisitlar = data.kisitlar || {
      gunlukMaxSaat: 8,
      gunlukMinSaat: 0,
      karniyarikIstemez: true, // Boşluksuz program
    };
    this.sinifOgretmenligi = data.sinifOgretmenligi || null; // sinifId
    this.kulup = data.kulup || null;
  }

  generateId() {
    return "OGR_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // Öğretmene ders atama
  dersAta(sinifId, dersId, saatSayisi) {
    this.atananDersler.push({ sinifId, dersId, saatSayisi });
    this.dersYuku += saatSayisi;
  }

  // Dersi kaldırma
  dersiKaldir(sinifId, dersId) {
    const index = this.atananDersler.findIndex(
      (d) => d.sinifId === sinifId && d.dersId === dersId
    );
    if (index !== -1) {
      this.dersYuku -= this.atananDersler[index].saatSayisi;
      this.atananDersler.splice(index, 1);
    }
  }

  // Tam adı döndür
  get tamAd() {
    return `${this.ad} ${this.soyad}`;
  }
}

/**
 * Ders Sınıfı
 */
class Ders {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.kod = data.kod || ""; // Örn: "MAT101"
    this.ad = data.ad || ""; // Örn: "MATEMATİK"
    this.brans = data.brans || "";
    this.bloklar = data.bloklar || []; // [2, 1] = 2 saatlik blok + 1 saatlik blok
    this.toplamSaat = data.toplamSaat || this.calculateToplamSaat();
    this.renk = data.renk || this.generateColor(); // Ders rengi
    this.fizikiMekan = data.fizikiMekan || null; // Laboratuvar, spor salonu vb.
  }

  generateId() {
    return "DRS_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  calculateToplamSaat() {
    return this.bloklar.reduce((sum, blok) => sum + blok, 0);
  }

  generateColor() {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

/**
 * Sınıf (Şube) Sınıfı
 */
class Sinif {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.kod = data.kod || ""; // Örn: "9/A"
    this.seviye = data.seviye || ""; // "9"
    this.sube = data.sube || ""; // "A"
    this.tedrisat = data.tedrisat || "S"; // S: Sabah, Ö: Öğle, T: Tam gün
    this.mevcutDersler = data.mevcutDersler || []; // [{dersId, ogretmenId, saatSayisi}]
    this.zamanTablosu = data.zamanTablosu || this.createDefaultZamanTablosu();
    this.ogrenciSayisi = data.ogrenciSayisi || 0;
  }

  generateId() {
    return "SNF_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // Varsayılan zaman tablosu (tüm saatler açık)
  createDefaultZamanTablosu() {
    const gunler = ["Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma"];
    const tablo = {};
    gunler.forEach((gun) => {
      tablo[gun] = Array(10).fill(true); // 10 saat (1-10)
    });
    return tablo;
  }

  // Sınıfa ders ekleme
  dersEkle(dersId, ogretmenId, saatSayisi) {
    this.mevcutDersler.push({ dersId, ogretmenId, saatSayisi });
  }

  // Dersi kaldırma
  dersiKaldir(dersId) {
    const index = this.mevcutDersler.findIndex((d) => d.dersId === dersId);
    if (index !== -1) {
      this.mevcutDersler.splice(index, 1);
    }
  }
}

/**
 * Program Hücresi
 */
class ProgramHucresi {
  constructor(data) {
    this.gun = data.gun || ""; // "Pazartesi"
    this.saat = data.saat || 1; // 1-10 arası
    this.sinifId = data.sinifId || null;
    this.dersId = data.dersId || null;
    this.ogretmenId = data.ogretmenId || null;
    this.fizikiMekanId = data.fizikiMekanId || null;
    this.blokUzunlugu = data.blokUzunlugu || 1; // 2 saatlik ders için 2
    this.cakiliMi = data.cakiliMi || false; // Manuel çakılan dersler
  }
}

// ============================================
// VERİ YÖNETİCİ (SINGLETON)
// ============================================

class ScheduleDataManager {
  constructor() {
    if (ScheduleDataManager.instance) {
      return ScheduleDataManager.instance;
    }

    // DİKKAT: Bu diziler sadece CRUD işlemleri ve LocalStorage için tutulur.
    // ALGORİTMA, formatlanmış veriyi DataAdapter'dan alır.
    this.ogretmenler = [];
    this.dersler = [];
    this.siniflar = [];
    this.program = []; // ProgramHucresi nesneleri
    this.kisitlar = []; // Global kısıtlar
    this.loglar = []; // İşlem logları

    // LocalStorage'dan yükle
    this.loadFromStorage();

    ScheduleDataManager.instance = this;
  }

  // ============================================
  // YENİ EKLEME: ALGORİTMA VERİSİNİ HAZIRLAMA VE YÜKLEME
  // ============================================

  /**
   * DataAdapter'ı kullanarak algoritmanın ihtiyacı olan formatlanmış veriyi çeker.
   * Çekilen veriyi dahili dizilere de yükler.
   * @returns {Promise<Object>} Algoritma için formatlanmış veri nesnesi.
   */
  async getAlgorithmData() {
    if (typeof DataAdapter === "undefined") {
      throw new Error(
        "❌ DataAdapter Sınıfı globalde tanımlı değil. DataAdapter.js dosyasının yüklü olduğundan emin olun."
      );
    }

    console.log(
      "🔥 getAlgorithmData çağrıldı. DataAdapter ile veri hazırlanıyor..."
    );

    const adapter = new DataAdapter();
    const data = await adapter.prepareAlgorithmData();

    // ↓↓↓ YENİ: DataAdapter'dan gelen işlenmiş veriyi dahili dizilere yükle ↓↓↓
    this.loadProcessedData(data);
    // ↑↑↑ YENİ: DataAdapter'dan gelen işlenmiş veriyi dahili dizilere yükle ↑↑↑

    console.log(
      `✅ DataAdapter'dan formatlanmış veri alındı. Toplam Ders: ${data.lessons.length}`
    );

    // Bu, lessons, classes, teachers vb. içeren nihai nesnedir.
    return data;
  }

  /**
   * DataAdapter'dan gelen işlenmiş veriyi ScheduleDataManager'ın dahili dizilerine yükler.
   * Bu, istatistiklerin doğru görünmesini sağlar.
   * @param {Object} data - DataAdapter'dan dönen nesne (lessons, classes, teachers vb. içerir)
   */
  loadProcessedData(data) {
    if (data.teachers && Array.isArray(data.teachers)) {
      this.ogretmenler = data.teachers.map((t) => new Ogretmen(t));
    }
    if (data.lessons && Array.isArray(data.lessons)) {
      this.dersler = data.lessons.map((l) => new Ders(l));
    }
    if (data.classes && Array.isArray(data.classes)) {
      this.siniflar = data.classes.map((s) => new Sinif(s));
    }

    // Programın son hali varsa onu da yükle
    if (data.program && Array.isArray(data.program)) {
      this.program = data.program.map((h) => new ProgramHucresi(h));
    }

    this.saveToStorage(); // Yeni güncel veriyi kaydedelim

    console.log(
      "✅ DataAdapter verileri ScheduleDataManager dahili dizilerine yüklendi."
    );
    console.log("📊 Yüklenen Veri İstatistikleri:", {
      ogretmen: this.ogretmenler.length,
      ders: this.dersler.length,
      sinif: this.siniflar.length,
    });

    // Yükleme sonrası istatistikleri yayınla
    this.triggerEvent("dataLoaded", this.getIstatistikler());
  }

  /**
   * Özel event tetikleyici
   */
  triggerEvent(eventName, data) {
    const event = new CustomEvent(`dataManager:${eventName}`, { detail: data });
    if (typeof window !== "undefined") {
      window.dispatchEvent(event);
    }
  }

  // ============================================
  // ÖĞRETMEN İŞLEMLERİ
  // ============================================

  ogretmenEkle(ogretmenData) {
    const ogretmen = new Ogretmen(ogretmenData);
    this.ogretmenler.push(ogretmen);
    this.saveToStorage();
    this.logEkle(`Öğretmen eklendi: ${ogretmen.tamAd}`);
    return ogretmen;
  }

  ogretmenGuncelle(id, yeniData) {
    const index = this.ogretmenler.findIndex((o) => o.id === id);
    if (index !== -1) {
      this.ogretmenler[index] = new Ogretmen({
        ...this.ogretmenler[index],
        ...yeniData,
      });
      this.saveToStorage();
      this.logEkle(`Öğretmen güncellendi: ${this.ogretmenler[index].tamAd}`);
      return this.ogretmenler[index];
    }
    return null;
  }

  ogretmenSil(id) {
    const ogretmen = this.ogretmenBul(id);
    if (ogretmen) {
      this.ogretmenler = this.ogretmenler.filter((o) => o.id !== id);
      this.saveToStorage();
      this.logEkle(`Öğretmen silindi: ${ogretmen.tamAd}`);
      return true;
    }
    return false;
  }

  ogretmenBul(id) {
    return this.ogretmenler.find((o) => o.id === id);
  }

  ogretmenleriGetir(filtre = {}) {
    let sonuc = [...this.ogretmenler];
    if (filtre.brans) {
      sonuc = sonuc.filter((o) => o.brans === filtre.brans);
    }
    return sonuc;
  }

  // ============================================
  // DERS İŞLEMLERİ
  // ============================================

  dersEkle(dersData) {
    const ders = new Ders(dersData);
    this.dersler.push(ders);
    this.saveToStorage();
    this.logEkle(`Ders eklendi: ${ders.ad}`);
    return ders;
  }

  dersGuncelle(id, yeniData) {
    const index = this.dersler.findIndex((d) => d.id === id);
    if (index !== -1) {
      this.dersler[index] = new Ders({ ...this.dersler[index], ...yeniData });
      this.saveToStorage();
      this.logEkle(`Ders güncellendi: ${this.dersler[index].ad}`);
      return this.dersler[index];
    }
    return null;
  }

  dersSil(id) {
    const ders = this.dersBul(id);
    if (ders) {
      this.dersler = this.dersler.filter((d) => d.id !== id);
      this.saveToStorage();
      this.logEkle(`Ders silindi: ${ders.ad}`);
      return true;
    }
    return false;
  }

  dersBul(id) {
    return this.dersler.find((d) => d.id === id);
  }

  dersleriGetir(filtre = {}) {
    let sonuc = [...this.dersler];
    if (filtre.brans) {
      sonuc = sonuc.filter((d) => d.brans === filtre.brans);
    }
    return sonuc;
  }

  // ============================================
  // SINIF İŞLEMLERİ
  // ============================================

  sinifEkle(sinifData) {
    const sinif = new Sinif(sinifData);
    this.siniflar.push(sinif);
    this.saveToStorage();
    this.logEkle(`Sınıf eklendi: ${sinif.kod}`);
    return sinif;
  }

  sinifGuncelle(id, yeniData) {
    const index = this.siniflar.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.siniflar[index] = new Sinif({
        ...this.siniflar[index],
        ...yeniData,
      });
      this.saveToStorage();
      this.logEkle(`Sınıf güncellendi: ${this.siniflar[index].kod}`);
      return this.siniflar[index];
    }
    return null;
  }

  sinifSil(id) {
    const sinif = this.sinifBul(id);
    if (sinif) {
      this.siniflar = this.siniflar.filter((s) => s.id !== id);
      this.saveToStorage();
      this.logEkle(`Sınıf silindi: ${sinif.kod}`);
      return true;
    }
    return false;
  }

  sinifBul(id) {
    return this.siniflar.find((s) => s.id === id);
  }

  siniflariGetir(filtre = {}) {
    let sonuc = [...this.siniflar];
    if (filtre.seviye) {
      sonuc = sonuc.filter((s) => s.seviye === filtre.seviye);
    }
    if (filtre.tedrisat) {
      sonuc = sonuc.filter((s) => s.tedrisat === filtre.tedrisat);
    }
    return sonuc;
  }

  // ============================================
  // PROGRAM İŞLEMLERİ
  // ============================================

  programaEkle(hucreData) {
    const hucre = new ProgramHucresi(hucreData);
    this.program.push(hucre);
    this.saveToStorage();
    return hucre;
  }

  programdanSil(sinifId, gun, saat) {
    this.program = this.program.filter(
      (h) => !(h.sinifId === sinifId && h.gun === gun && h.saat === saat)
    );
    this.saveToStorage();
  }

  programiTemizle() {
    this.program = [];
    this.saveToStorage();
    this.logEkle("Program tamamen temizlendi");
  }

  programGetir(filtre = {}) {
    let sonuc = [...this.program];
    if (filtre.sinifId) {
      sonuc = sonuc.filter((h) => h.sinifId === filtre.sinifId);
    }
    if (filtre.ogretmenId) {
      sonuc = sonuc.filter((h) => h.ogretmenId === filtre.ogretmenId);
    }
    if (filtre.gun) {
      sonuc = sonuc.filter((h) => h.gun === filtre.gun);
    }
    return sonuc;
  }

  // ============================================
  // STORAGE İŞLEMLERİ
  // ============================================

  saveToStorage() {
    try {
      const data = {
        ogretmenler: this.ogretmenler,
        dersler: this.dersler,
        siniflar: this.siniflar,
        program: this.program,
        kisitlar: this.kisitlar,
        loglar: this.loglar.slice(-100),
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("scheduleDagitimData", JSON.stringify(data));
      // console.log("✅ Veriler LocalStorage'a kaydedildi"); // Çok sık çalışmaması için log kapatıldı
    } catch (error) {
      console.error("❌ LocalStorage kaydetme hatası:", error);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem("scheduleDagitimData");
      if (data) {
        const parsed = JSON.parse(data);

        // Array kontrolü ekle
        this.ogretmenler = Array.isArray(parsed.ogretmenler)
          ? parsed.ogretmenler.map((o) => new Ogretmen(o))
          : [];

        this.dersler = Array.isArray(parsed.dersler)
          ? parsed.dersler.map((d) => new Ders(d))
          : [];

        this.siniflar = Array.isArray(parsed.siniflar)
          ? parsed.siniflar.map((s) => new Sinif(s))
          : [];

        this.program = Array.isArray(parsed.program)
          ? parsed.program.map((h) => new ProgramHucresi(h))
          : [];

        this.kisitlar = Array.isArray(parsed.kisitlar) ? parsed.kisitlar : [];

        this.loglar = Array.isArray(parsed.loglar) ? parsed.loglar : [];

        console.log("✅ LocalStorage'dan veri yüklendi");
        // ↓↓↓ DÜZELTME: Veri yüklendikten sonra log gösterimi ↓↓↓
        console.log("💾 LocalStorage Başlangıç İstatistikleri:", {
          ogretmen: this.ogretmenler.length,
          ders: this.dersler.length,
          sinif: this.siniflar.length,
        });
        // ↑↑↑ DÜZELTME: Veri yüklendikten sonra log gösterimi ↑↑↑
      } else {
        console.log("ℹ️ LocalStorage boş, yeni başlangıç");
      }
    } catch (error) {
      console.error("❌ LocalStorage yükleme hatası:", error);

      // Hata durumunda temizle
      localStorage.removeItem("scheduleDagitimData");

      // Boş arrayler
      this.ogretmenler = [];
      this.dersler = [];
      this.siniflar = [];
      this.program = [];
      this.kisitlar = [];
      this.loglar = [];
    }
  }

  clearStorage() {
    localStorage.removeItem("scheduleDagitimData");
    this.ogretmenler = [];
    this.dersler = [];
    this.siniflar = [];
    this.program = [];
    this.kisitlar = [];
    this.loglar = [];
    this.logEkle("Tüm veriler temizlendi");
    console.log("✅ LocalStorage temizlendi");
  }

  // Excel/JSON export
  exportData() {
    return {
      ogretmenler: this.ogretmenler,
      dersler: this.dersler,
      siniflar: this.siniflar,
      program: this.program,
      kisitlar: this.kisitlar,
      exportDate: new Date().toISOString(),
    };
  }

  // JSON import
  importData(data) {
    try {
      this.ogretmenler = (data.ogretmenler || []).map((o) => new Ogretmen(o));
      this.dersler = (data.dersler || []).map((d) => new Ders(d));
      this.siniflar = (data.siniflar || []).map((s) => new Sinif(s));
      this.program = (data.program || []).map((h) => new ProgramHucresi(h));
      this.kisitlar = data.kisitlar || [];
      this.saveToStorage();
      this.logEkle("Veri import edildi");
      return true;
    } catch (error) {
      console.error("Import hatası:", error);
      return false;
    }
  }

  // ============================================
  // LOG İŞLEMLERİ
  // ============================================

  logEkle(mesaj) {
    this.loglar.push({
      mesaj,
      tarih: new Date().toISOString(),
    });
    // Son 100 log'u tut
    if (this.loglar.length > 100) {
      this.loglar = this.loglar.slice(-100);
    }
  }

  loglariGetir(limit = 10) {
    return this.loglar.slice(-limit).reverse();
  }

  logError(source, message, error) {
    this.logEkle(`[HATA/${source}] ${message}: ${error.message || error}`);
    console.error(`[ScheduleDataManager Error] ${source}: ${message}`, error);
  }

  // ============================================
  // İSTATİSTİKLER
  // ============================================

  getIstatistikler() {
    return {
      toplamOgretmen: this.ogretmenler.length,
      toplamDers: this.dersler.length,
      toplamSinif: this.siniflar.length,
      dolulukOrani: this.calculateDolulukOrani(),
      tamamlananDagitim: this.calculateTamamlananDagitim(),
    };
  }

  calculateDolulukOrani() {
    const toplamHucre = this.siniflar.length * 5 * 10; // sınıf * gün * saat (Varsayım: 5 gün, 10 saat)
    const doluHucre = this.program.length;
    return toplamHucre > 0 ? ((doluHucre / toplamHucre) * 100).toFixed(1) : 0;
  }

  calculateTamamlananDagitim() {
    let toplamDersSaati = 0;
    this.siniflar.forEach((sinif) => {
      // DİKKAT: Sınıfın mevcutDersler dizisi, DataAdapter'dan yüklenen güncel veriyi yansıtmalıdır.
      // loadProcessedData metodu bu senkronizasyonu sağlar.
      sinif.mevcutDersler.forEach((ders) => {
        toplamDersSaati += ders.saatSayisi;
      });
    });

    const dagitilmis = this.program.length;
    return toplamDersSaati > 0
      ? ((dagitilmis / toplamDersSaati) * 100).toFixed(1)
      : 0;
  }
}

// ============================================
// EXPORT (ELECTRON UYUMLU)
// ============================================

// Singleton instance oluştur
const dataManager = new ScheduleDataManager();

// ✅ DOĞRU: Her zaman window'a ekle
window.ScheduleDataManager = dataManager;

// ✅ Class'ları da export et (ihtiyaç olursa)
window.ScheduleClasses = {
  Ogretmen,
  Ders,
  Sinif,
  ProgramHucresi,
};

// ============================================
// YARDIMCI METODLAR (HELPER) - EN SONA EKLE
// ============================================

ScheduleDataManager.prototype.getOgretmenler = function () {
  return this.ogretmenleriGetir();
};

ScheduleDataManager.prototype.getDersler = function () {
  return this.dersleriGetir();
};

ScheduleDataManager.prototype.getSiniflar = function () {
  return this.siniflariGetir();
};

ScheduleDataManager.prototype.getOgretmenProgrami = function (ogretmenId) {
  return this.programGetir({ ogretmenId });
};

ScheduleDataManager.prototype.getSinifProgrami = function (sinifId) {
  return this.programGetir({ sinifId });
};

console.log("✅ Helper metodlar eklendi");

// ↓↓↓ DÜZELTME: Bu loglar LocalStorage'dan yükleme bitince çalışıyor.
// Artık daha doğru veriyi, DataAdapter'dan veri yüklendiğinde (loadProcessedData) logluyoruz.
console.log("✅ ScheduleDataManager window objesine eklendi");
console.log(
  "ℹ️ Detaylı veri istatistikleri, DataAdapter tamamlanınca loglanacaktır."
);
// ↑↑↑ DÜZELTME: Başlangıç logu kaldırıldı/değiştirildi ↑↑↑
