const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");

let SQL;
let masterDB = null;
let activeSchoolDB = null;
let currentSchoolId = null;

// Veritabanı klasör yolları
const belgelerKlasoru = path.join(
  os.homedir(),
  "Documents",
  "OkulYonetimSistemi"
);
const veritabaniKlasoru = path.join(belgelerKlasoru, "Veritabani");
const yedekKlasoru = path.join(belgelerKlasoru, "Yedekler");

// Master veritabanı yolu
const masterDbPath = path.join(veritabaniKlasoru, "master.db");

console.log("📁 Veritabanı Klasörü:", veritabaniKlasoru);
console.log("📁 Yedek Klasörü:", yedekKlasoru);

// Klasörleri oluştur
[belgelerKlasoru, veritabaniKlasoru, yedekKlasoru].forEach((klasor) => {
  if (!fs.existsSync(klasor)) {
    fs.mkdirSync(klasor, { recursive: true });
    console.log("✅ Klasör oluşturuldu:", klasor);
  }
});

// SQL.js başlat
async function initDatabase() {
  try {
    SQL = await initSqlJs();
    console.log("✅ SQL.js başlatıldı");

    await loadMasterDB();
    return true;
  } catch (error) {
    console.error("❌ Veritabanı başlatma hatası:", error);
    return false;
  }
}

// Master veritabanını yükle veya oluştur
async function loadMasterDB() {
  try {
    if (fs.existsSync(masterDbPath)) {
      // Mevcut veritabanını yükle
      const data = fs.readFileSync(masterDbPath);
      masterDB = new SQL.Database(data);
      console.log("✅ Master veritabanı yüklendi");
    } else {
      // Yeni veritabanı oluştur
      masterDB = new SQL.Database();
      createMasterTables();
      createSuperAdmin();
      saveMasterDB();
      console.log("✅ Master veritabanı oluşturuldu");
    }
  } catch (error) {
    console.error("❌ Master DB yükleme hatası:", error);
    throw error;
  }
}

// Master veritabanı tablolarını oluştur
function createMasterTables() {
  console.log("📋 Master tablolar oluşturuluyor...");

  // Okullar tablosu
  masterDB.run(`
    CREATE TABLE IF NOT EXISTS okullar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      okul_kodu TEXT UNIQUE NOT NULL,
      okul_adi TEXT NOT NULL,
      sifre TEXT NOT NULL,
      veritabani_dosyasi TEXT NOT NULL,
      il TEXT,
      ilce TEXT,
      adres TEXT,
      telefon TEXT,
      email TEXT,
      yetkili_ad TEXT,
      yetkili_unvan TEXT,
      lisans_baslangic TEXT NOT NULL,
      lisans_bitis TEXT NOT NULL,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT
    )
  `);

  // Sistem kullanıcıları (sadece super adminler)
  masterDB.run(`
    CREATE TABLE IF NOT EXISTS sistem_kullanicilar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_adi TEXT UNIQUE NOT NULL,
      sifre TEXT NOT NULL,
      ad_soyad TEXT NOT NULL,
      email TEXT,
      rol TEXT DEFAULT 'super_admin',
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      son_giris TEXT
    )
  `);

  // Lisans logları
  masterDB.run(`
    CREATE TABLE IF NOT EXISTS lisans_loglari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      okul_id INTEGER,
      islem_tipi TEXT,
      eski_tarih TEXT,
      yeni_tarih TEXT,
      kullnici_id INTEGER,
      tarih TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (okul_id) REFERENCES okullar(id)
    )
  `);

  // Sistem logları
  masterDB.run(`
    CREATE TABLE IF NOT EXISTS sistem_loglari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id INTEGER,
      islem_tipi TEXT,
      detay TEXT,
      ip_adresi TEXT,
      tarih TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kullanici_id) REFERENCES sistem_kullanicilar(id)
    )
  `);

  console.log("✅ Master tablolar oluşturuldu");
}

// Super admin oluştur
function createSuperAdmin() {
  console.log("👤 Super admin oluşturuluyor...");

  const stmt = masterDB.prepare(`
    INSERT INTO sistem_kullanicilar (kullanici_adi, sifre, ad_soyad, rol)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(["superadmin", "Super123!", "Sistem Yöneticisi", "super_admin"]);
  stmt.free();

  console.log("✅ Super admin oluşturuldu");
  console.log("🔑 Kullanıcı Adı: superadmin");
  console.log("🔒 Şifre: Super123!");
}

// Master DB kaydet
function saveMasterDB() {
  try {
    const data = masterDB.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(masterDbPath, buffer);
    console.log("💾 Master veritabanı kaydedildi");
  } catch (error) {
    console.error("❌ Master DB kaydetme hatası:", error);
    throw error;
  }
}

// Okul veritabanı tabloları oluştur
function createSchoolTables(db) {
  console.log("📋 Okul tabloları oluşturuluyor...");

  // Okul kullanıcıları (admin, öğretmen vs)
  db.run(`
    CREATE TABLE IF NOT EXISTS kullanicilar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_adi TEXT UNIQUE NOT NULL,
      sifre TEXT NOT NULL,
      ad_soyad TEXT NOT NULL,
      tc_no TEXT UNIQUE,
      email TEXT,
      telefon TEXT,
      rol TEXT NOT NULL,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      son_giris TEXT
    )
  `);

  // Öğretmenler
  db.run(`
  CREATE TABLE IF NOT EXISTS ogretmenler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER UNIQUE,
    tc_no TEXT UNIQUE NOT NULL,
    ad_soyad TEXT NOT NULL,
    kisa_ad TEXT,
    brans TEXT,                       -- 🆕 Branş eklendi (örnek: Matematik, Türkçe vs.)
    cinsiyet TEXT,
    dogum_tarihi TEXT,
    dogum_yeri TEXT,
    baba_adi TEXT,
    unvan TEXT,
    kariyer TEXT,
    gorev TEXT,
    durum INTEGER DEFAULT 1,
    gorev_yeri TEXT,
    goreve_baslama TEXT,
    kurumda_baslama TEXT,
    ogrenim_durumu TEXT,
    mezun_universite TEXT,
    derece INTEGER,
    kademe INTEGER,
    emekli_sicil_no TEXT,
    kbs_personel_no TEXT,
    iban TEXT,
    banka_subesi TEXT,
    yabanci_dil_tazminati TEXT,
    ek_gosterge TEXT,
    aile_durumu TEXT,
    cocuk_0_6 INTEGER DEFAULT 0,
    cocuk_6_ustu INTEGER DEFAULT 0,
    bes TEXT,
    telefon TEXT,
    email TEXT,
    adres TEXT,
    ayrilma_tarihi TEXT,
    ayrilis_nedeni TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TEXT,
    FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id)
  )
`);

  // Sınıflar
  db.run(`
    CREATE TABLE IF NOT EXISTS siniflar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sinif_adi TEXT NOT NULL,
      seviye TEXT,
      sube TEXT,
      kapasite INTEGER,
      sinif_ogretmeni_id INTEGER,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sinif_ogretmeni_id) REFERENCES ogretmenler(id)
    )
  `);

  // Öğrenciler
  db.run(`
    CREATE TABLE IF NOT EXISTS ogrenciler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tc_no TEXT UNIQUE,
      ad TEXT NOT NULL,
      soyad TEXT NOT NULL,
      okul_no TEXT UNIQUE NOT NULL,
      ad_soyad TEXT NOT NULL,
      sinif TEXT,
      cinsiyet TEXT,
      alan TEXT,
      dal TEXT,
      durum INTEGER DEFAULT 1,
      dogum_yeri TEXT,
      dogum_tarihi TEXT,
      fotograf_path TEXT,
      anne_ad_soyad TEXT,
      anne_telefon TEXT,
      anne_durum TEXT,
      anne_birlikte TEXT,
      anne_iliski TEXT,
      anne_meslek TEXT,
      baba_ad_soyad TEXT,
      baba_telefon TEXT,
      baba_durum TEXT,
      baba_birlikte TEXT,
      baba_iliski TEXT,
      baba_meslek TEXT,
      burslu INTEGER DEFAULT 0,
      sehit_cocugu INTEGER DEFAULT 0,
      gazi_cocugu INTEGER DEFAULT 0,
      destek_egitim INTEGER DEFAULT 0,
      evde_egitim INTEGER DEFAULT 0,
      sporcu_lisansi TEXT,
      kaynastirma INTEGER DEFAULT 0,
      kaynastirma_tani TEXT,
      kayit_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Dersler
  db.run(`
    CREATE TABLE IF NOT EXISTS dersler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ders_adi TEXT NOT NULL,
      ders_kodu TEXT UNIQUE,
      kredi INTEGER,
      durum INTEGER DEFAULT 1
    )
  `);

  // Ders programı
  db.run(`
    CREATE TABLE IF NOT EXISTS ders_programi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sinif_id INTEGER,
      ders_id INTEGER,
      ogretmen_id INTEGER,
      gun TEXT,
      saat_baslangic TEXT,
      saat_bitis TEXT,
      donem TEXT,
      FOREIGN KEY (sinif_id) REFERENCES siniflar(id),
      FOREIGN KEY (ders_id) REFERENCES dersler(id),
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id)
    )
  `);

  // Notlar
  db.run(`
  CREATE TABLE IF NOT EXISTS notlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ogrenci_id INTEGER,
    ders_id INTEGER,
    sinav_tipi TEXT,
    puan INTEGER,
    donem TEXT,
    tarih TEXT DEFAULT CURRENT_TIMESTAMP,
    ogretmen_id INTEGER,
    FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id),
    FOREIGN KEY (ders_id) REFERENCES dersler(id),
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id)
  )
`);

  // Devamsızlık
  db.run(`
    CREATE TABLE IF NOT EXISTS devamsizlik (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ogrenci_id INTEGER,
      tarih TEXT,
      ders_id INTEGER,
      devamsizlik_tipi TEXT,
      aciklama TEXT,
      ogretmen_id INTEGER,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id),
      FOREIGN KEY (ders_id) REFERENCES dersler(id),
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id)
    )
  `);

  // İşlem logları
  db.run(`
    CREATE TABLE IF NOT EXISTS islem_loglari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id INTEGER,
      islem_tipi TEXT,
      tablo_adi TEXT,
      kayit_id INTEGER,
      detay TEXT,
      tarih TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id)
    )
  `);

  console.log("✅ Okul tabloları oluşturuldu");
}

// ============================================
// OKUL YÖNETİMİ FONKSİYONLARI
// ============================================

// Yeni okul oluştur
async function createSchool(okulBilgileri) {
  try {
    console.log("🏫 Yeni okul oluşturuluyor:", okulBilgileri.okul_adi);

    // Okul kodu kontrol (sadece rakam)
    if (!/^\d+$/.test(okulBilgileri.okul_kodu)) {
      return {
        success: false,
        message: "Okul kodu sadece rakamlardan oluşmalıdır!",
      };
    }

    // Okul kodu benzersiz mi kontrol et (SADECE AKTİF OKULLARDA)
    const checkStmt = masterDB.prepare(
      "SELECT id FROM okullar WHERE okul_kodu = ? AND durum = 1"
    );
    checkStmt.bind([okulBilgileri.okul_kodu]);

    if (checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Bu okul kodu zaten kayıtlı!" };
    }
    checkStmt.free();

    // Eğer silinen (durum=0) bir okul varsa, onu güncelle
    const deletedStmt = masterDB.prepare(
      "SELECT id FROM okullar WHERE okul_kodu = ? AND durum = 0"
    );
    deletedStmt.bind([okulBilgileri.okul_kodu]);

    if (deletedStmt.step()) {
      const deletedRow = deletedStmt.getAsObject();
      deletedStmt.free();

      console.log("♻️ Silinen okul bulundu, yeniden aktif ediliyor...");

      // Silinen okulu güncelle
      const updateStmt = masterDB.prepare(`
        UPDATE okullar SET
          okul_adi = ?,
          sifre = ?,
          il = ?,
          ilce = ?,
          adres = ?,
          telefon = ?,
          email = ?,
          yetkili_ad = ?,
          yetkili_unvan = ?,
          lisans_baslangic = ?,
          lisans_bitis = ?,
          durum = 1,
          guncelleme_tarihi = ?
        WHERE id = ?
      `);

      const baslangic = new Date();
      const bitis = new Date();
      bitis.setFullYear(bitis.getFullYear() + 1);

      updateStmt.run([
        okulBilgileri.okul_adi,
        okulBilgileri.okul_sifre,
        okulBilgileri.il || "",
        okulBilgileri.ilce || "",
        okulBilgileri.adres || "",
        okulBilgileri.telefon || "",
        okulBilgileri.email || "",
        okulBilgileri.yetkili_ad || "",
        okulBilgileri.yetkili_unvan || "",
        baslangic.toISOString(),
        bitis.toISOString(),
        new Date().toISOString(),
        deletedRow.id,
      ]);
      updateStmt.free();

      saveMasterDB();

      console.log("✅ Silinen okul yeniden aktif edildi");

      return {
        success: true,
        message: "Okul başarıyla oluşturuldu (yeniden aktif edildi)",
        data: {
          okul_kodu: okulBilgileri.okul_kodu,
          admin_kullanici: "admin",
          admin_sifre: okulBilgileri.admin_sifre,
          lisans_bitis: bitis.toLocaleDateString("tr-TR"),
        },
      };
    }
    deletedStmt.free();

    // Lisans tarihleri
    const baslangic = new Date();
    const bitis = new Date();
    bitis.setFullYear(bitis.getFullYear() + 1); // 1 yıl

    // Okul veritabanı dosya adı
    const dbFileName = `okul_${okulBilgileri.okul_kodu}.db`;
    const dbFilePath = path.join(veritabaniKlasoru, dbFileName);

    // Yeni okul veritabanı oluştur
    const schoolDB = new SQL.Database();
    createSchoolTables(schoolDB);

    // Okul admin kullanıcısı oluştur
    const adminStmt = schoolDB.prepare(`
      INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol)
      VALUES (?, ?, ?, ?)
    `);
    adminStmt.run([
      "admin",
      okulBilgileri.admin_sifre,
      "Okul Yöneticisi",
      "okul_admin",
    ]);
    adminStmt.free();

    // Okul veritabanını kaydet
    const data = schoolDB.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
    console.log("✅ Okul veritabanı oluşturuldu:", dbFileName);

    // Master veritabanına okul kaydı ekle
    const insertStmt = masterDB.prepare(`
      INSERT INTO okullar (
        okul_kodu, okul_adi, sifre, veritabani_dosyasi,
        il, ilce, adres, telefon, email,
        yetkili_ad, yetkili_unvan,
        lisans_baslangic, lisans_bitis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run([
      okulBilgileri.okul_kodu,
      okulBilgileri.okul_adi,
      okulBilgileri.okul_sifre,
      dbFileName,
      okulBilgileri.il || "",
      okulBilgileri.ilce || "",
      okulBilgileri.adres || "",
      okulBilgileri.telefon || "",
      okulBilgileri.email || "",
      okulBilgileri.yetkili_ad || "",
      okulBilgileri.yetkili_unvan || "",
      baslangic.toISOString(),
      bitis.toISOString(),
    ]);
    insertStmt.free();

    saveMasterDB();

    console.log("✅ Okul başarıyla oluşturuldu");
    console.log("🔑 Okul Kodu:", okulBilgileri.okul_kodu);
    console.log("👤 Admin Kullanıcı: admin");
    console.log("🔒 Admin Şifre:", okulBilgileri.admin_sifre);
    console.log("📅 Lisans Bitiş:", bitis.toLocaleDateString("tr-TR"));

    return {
      success: true,
      message: "Okul başarıyla oluşturuldu",
      data: {
        okul_kodu: okulBilgileri.okul_kodu,
        admin_kullanici: "admin",
        admin_sifre: okulBilgileri.admin_sifre,
        lisans_bitis: bitis.toLocaleDateString("tr-TR"),
      },
    };
  } catch (error) {
    console.error("❌ Okul oluşturma hatası:", error);
    return { success: false, message: error.message };
  }
}

// Okul listesini getir (sadece super admin)
function getAllSchools() {
  try {
    console.log("📋 Okul listesi istendi");

    const stmt = masterDB.prepare(`
      SELECT 
        id, okul_kodu, okul_adi, il, ilce,
        yetkili_ad, yetkili_unvan, telefon, email,
        adres,
        lisans_baslangic, lisans_bitis, durum,
        olusturma_tarihi
      FROM okullar
      WHERE durum = 1
      ORDER BY olusturma_tarihi DESC
    `);

    const schools = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();

      // Lisans durumu hesapla
      const bitis = new Date(row.lisans_bitis);
      const bugun = new Date();
      const kalanGun = Math.ceil((bitis - bugun) / (1000 * 60 * 60 * 24));

      schools.push({
        ...row,
        adres: row.adres || "", // ← NULL kontrolü
        telefon: row.telefon || "",
        email: row.email || "",
        yetkili_ad: row.yetkili_ad || "",
        yetkili_unvan: row.yetkili_unvan || "",
        lisans_kalan_gun: kalanGun,
        lisans_durumu:
          kalanGun > 30 ? "aktif" : kalanGun > 0 ? "uyari" : "bitmis",
      });
    }
    stmt.free();

    console.log(`✅ ${schools.length} okul bulundu (durum=1)`);

    return { success: true, data: schools };
  } catch (error) {
    console.error("❌ Okul listesi hatası:", error);
    return { success: false, message: error.message };
  }
}

// Okul girişi kontrol et
async function loginSchool(okulKodu, kullaniciAdi, sifre) {
  try {
    console.log("🔐 Giriş denemesi:", okulKodu, kullaniciAdi);

    // Super admin girişi mi?
    if (okulKodu === "000000" || okulKodu === "SISTEM") {
      const stmt = masterDB.prepare(`
        SELECT * FROM sistem_kullanicilar 
        WHERE kullanici_adi = ? AND sifre = ? AND durum = 1
      `);
      stmt.bind([kullaniciAdi, sifre]);

      if (stmt.step()) {
        const user = stmt.getAsObject();
        stmt.free();

        // Son giriş güncelle
        masterDB.run(
          "UPDATE sistem_kullanicilar SET son_giris = ? WHERE id = ?",
          [new Date().toISOString(), user.id]
        );
        saveMasterDB();

        console.log("✅ Super admin girişi başarılı");
        return {
          success: true,
          userType: "super_admin",
          user: {
            id: user.id,
            kullanici_adi: user.kullanici_adi,
            ad_soyad: user.ad_soyad,
            rol: user.rol,
          },
        };
      }
      stmt.free();
      return { success: false, message: "Kullanıcı adı veya şifre hatalı!" };
    }

    // Okul kontrolü
    const schoolStmt = masterDB.prepare(`
      SELECT * FROM okullar 
      WHERE okul_kodu = ? AND durum = 1
    `);
    schoolStmt.bind([okulKodu]);

    if (!schoolStmt.step()) {
      schoolStmt.free();
      return { success: false, message: "Okul bulunamadı!" };
    }

    const school = schoolStmt.getAsObject();
    schoolStmt.free();

    // Lisans kontrolü
    const bitisTarihi = new Date(school.lisans_bitis);
    const bugun = new Date();

    if (bugun > bitisTarihi) {
      return {
        success: false,
        message:
          "Lisansınızın süresi dolmuştur! Lütfen yöneticinizle iletişime geçin.",
      };
    }

    // Okul veritabanını yükle
    const dbPath = path.join(veritabaniKlasoru, school.veritabani_dosyasi);

    if (!fs.existsSync(dbPath)) {
      return { success: false, message: "Okul veritabanı bulunamadı!" };
    }

    const dbData = fs.readFileSync(dbPath);
    activeSchoolDB = new SQL.Database(dbData);
    currentSchoolId = school.id;

    // Kullanıcı kontrolü
    const userStmt = activeSchoolDB.prepare(`
      SELECT * FROM kullanicilar 
      WHERE kullanici_adi = ? AND sifre = ? AND durum = 1
    `);
    userStmt.bind([kullaniciAdi, sifre]);

    if (!userStmt.step()) {
      userStmt.free();
      activeSchoolDB = null;
      currentSchoolId = null;
      return { success: false, message: "Kullanıcı adı veya şifre hatalı!" };
    }

    const user = userStmt.getAsObject();
    userStmt.free();

    // Son giriş güncelle
    activeSchoolDB.run("UPDATE kullanicilar SET son_giris = ? WHERE id = ?", [
      new Date().toISOString(),
      user.id,
    ]);
    saveActiveSchoolDB();

    console.log("✅ Okul girişi başarılı");

    // Veritabanını güncelle
    await updateExistingDatabase();

    return {
      success: true,
      userType: "school_user",
      school: {
        id: school.id,
        okul_kodu: school.okul_kodu,
        okul_adi: school.okul_adi,
        lisans_bitis: school.lisans_bitis,
      },
      user: {
        id: user.id,
        kullanici_adi: user.kullanici_adi,
        ad_soyad: user.ad_soyad,
        rol: user.rol,
      },
    };
  } catch (error) {
    console.error("❌ Giriş hatası:", error);
    return { success: false, message: "Giriş sırasında bir hata oluştu!" };
  }
}

// Aktif okul veritabanını kaydet
function saveActiveSchoolDB() {
  if (!activeSchoolDB || !currentSchoolId) {
    console.warn("⚠️ Aktif okul veritabanı yok");
    return;
  }

  try {
    // Okul bilgisini al
    const stmt = masterDB.prepare(
      "SELECT veritabani_dosyasi FROM okullar WHERE id = ?"
    );
    stmt.bind([currentSchoolId]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      const dbPath = path.join(veritabaniKlasoru, row.veritabani_dosyasi);

      const data = activeSchoolDB.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);

      console.log("💾 Okul veritabanı kaydedildi");
    }
    stmt.free();
  } catch (error) {
    console.error("❌ Okul DB kaydetme hatası:", error);
  }
}

// ============================================
// ÖĞRETMEN YÖNETİMİ FONKSİYONLARI
// ============================================

// Yeni öğretmen ekle
async function createTeacher(ogretmenBilgileri) {
  try {
    console.log("👨‍🏫 Yeni öğretmen ekleniyor:", ogretmenBilgileri.ad_soyad);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    // TC No kontrol (11 hane, sadece rakam)
    if (!/^\d{11}$/.test(ogretmenBilgileri.tc_no)) {
      return {
        success: false,
        message: "TC Kimlik No 11 haneli rakamlardan oluşmalıdır!",
      };
    }

    // TC No benzersiz mi kontrol et
    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogretmenler WHERE tc_no = ?"
    );
    checkStmt.bind([ogretmenBilgileri.tc_no]);

    if (checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Bu TC Kimlik No zaten kayıtlı!" };
    }
    checkStmt.free();

    // Kısa ad oluştur (MEHMET KARCI → M.KRC)
    const kisaAd = generateKisaAd(ogretmenBilgileri.ad_soyad);

    // Otomatik şifre oluştur
    const otomatikSifre = generateTeacherPassword();

    // Kullanıcı hesabı oluştur
    const userStmt = activeSchoolDB.prepare(`
      INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, tc_no, rol, durum)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    userStmt.run([
      ogretmenBilgileri.tc_no, // Kullanıcı adı = TC No
      otomatikSifre,
      ogretmenBilgileri.ad_soyad,
      ogretmenBilgileri.tc_no,
      "ogretmen",
      ogretmenBilgileri.durum || 1,
    ]);
    userStmt.free();

    // Kullanıcı ID'sini al
    const getUserStmt = activeSchoolDB.prepare(
      "SELECT id FROM kullanicilar WHERE tc_no = ?"
    );
    getUserStmt.bind([ogretmenBilgileri.tc_no]);
    let kullaniciId = null;
    if (getUserStmt.step()) {
      kullaniciId = getUserStmt.getAsObject().id;
    }
    getUserStmt.free();

    // Öğretmen kaydını ekle
    const insertStmt = activeSchoolDB.prepare(`
      INSERT INTO ogretmenler (
        kullanici_id, tc_no, ad_soyad, kisa_ad, cinsiyet,
        dogum_tarihi, dogum_yeri, baba_adi,
        unvan, kariyer, gorev, durum, gorev_yeri,
        goreve_baslama, kurumda_baslama,
        ogrenim_durumu, mezun_universite, derece, kademe,
        emekli_sicil_no, kbs_personel_no,
        iban, banka_subesi, yabanci_dil_tazminati, ek_gosterge,
        aile_durumu, cocuk_0_6, cocuk_6_ustu, bes,
        telefon, email, adres,
        ayrilma_tarihi, ayrilis_nedeni
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run([
      kullaniciId,
      ogretmenBilgileri.tc_no,
      ogretmenBilgileri.ad_soyad,
      kisaAd,
      ogretmenBilgileri.cinsiyet,
      ogretmenBilgileri.dogum_tarihi || null,
      ogretmenBilgileri.dogum_yeri || null,
      ogretmenBilgileri.baba_adi || null,
      ogretmenBilgileri.unvan,
      ogretmenBilgileri.kariyer,
      ogretmenBilgileri.gorev,
      ogretmenBilgileri.durum || 1,
      ogretmenBilgileri.gorev_yeri || null,
      ogretmenBilgileri.goreve_baslama || null,
      ogretmenBilgileri.kurumda_baslama || null,
      ogretmenBilgileri.ogrenim_durumu || null,
      ogretmenBilgileri.mezun_universite || null,
      ogretmenBilgileri.derece || null,
      ogretmenBilgileri.kademe || null,
      ogretmenBilgileri.emekli_sicil_no || null,
      ogretmenBilgileri.kbs_personel_no || null,
      ogretmenBilgileri.iban || null,
      ogretmenBilgileri.banka_subesi || null,
      ogretmenBilgileri.yabanci_dil_tazminati || null,
      ogretmenBilgileri.ek_gosterge || null,
      ogretmenBilgileri.aile_durumu || null,
      ogretmenBilgileri.cocuk_0_6 || 0,
      ogretmenBilgileri.cocuk_6_ustu || 0,
      ogretmenBilgileri.bes || null,
      ogretmenBilgileri.telefon || null,
      ogretmenBilgileri.email || null,
      ogretmenBilgileri.adres || null,
      ogretmenBilgileri.ayrilma_tarihi || null,
      ogretmenBilgileri.ayrilis_nedeni || null,
    ]);
    insertStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Öğretmen başarıyla eklendi");
    console.log("🔑 TC No:", ogretmenBilgileri.tc_no);
    console.log("🔒 Otomatik Şifre:", otomatikSifre);

    return {
      success: true,
      message: "Öğretmen başarıyla eklendi",
      data: {
        tc_no: ogretmenBilgileri.tc_no,
        ad_soyad: ogretmenBilgileri.ad_soyad,
        kisa_ad: kisaAd,
        otomatik_sifre: otomatikSifre,
      },
    };
  } catch (error) {
    console.error("❌ Öğretmen ekleme hatası:", error);
    return { success: false, message: error.message };
  }
}

// Tüm öğretmenleri getir
function getAllTeachers() {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Öğretmenler listesi istendi");

    const stmt = activeSchoolDB.prepare(`
      SELECT * FROM ogretmenler
      ORDER BY ad_soyad ASC
    `);

    const teachers = [];
    while (stmt.step()) {
      teachers.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${teachers.length} öğretmen bulundu`);

    return { success: true, data: teachers };
  } catch (error) {
    console.error("❌ Öğretmen listesi hatası:", error);
    return { success: false, message: error.message };
  }
}

// Öğretmen güncelle
function updateTeacher(ogretmenId, guncelBilgiler) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("✏️ Öğretmen güncelleniyor:", ogretmenId);

    // Öğretmen var mı kontrol et
    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogretmenler WHERE id = ?"
    );
    checkStmt.bind([parseInt(ogretmenId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Öğretmen bulunamadı!" };
    }
    checkStmt.free();

    // Güncelleme SQL'i oluştur
    const updateFields = [];
    const values = [];

    // Tüm alanları dinamik ekle
    Object.keys(guncelBilgiler).forEach((key) => {
      if (guncelBilgiler[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(guncelBilgiler[key]);
      }
    });

    // Güncelleme tarihi ekle
    updateFields.push("guncelleme_tarihi = ?");
    values.push(new Date().toISOString());

    values.push(parseInt(ogretmenId));

    const sql = `UPDATE ogretmenler SET ${updateFields.join(
      ", "
    )} WHERE id = ?`;

    const stmt = activeSchoolDB.prepare(sql);
    stmt.run(values);
    stmt.free();

    // Eğer ayrılma tarihi girildiyse, durumu pasif yap
    if (guncelBilgiler.ayrilma_tarihi) {
      activeSchoolDB.run("UPDATE ogretmenler SET durum = 0 WHERE id = ?", [
        parseInt(ogretmenId),
      ]);
    }

    saveActiveSchoolDB();

    console.log("✅ Öğretmen güncellendi");

    return {
      success: true,
      message: "Öğretmen başarıyla güncellendi!",
    };
  } catch (error) {
    console.error("❌ Öğretmen güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
}

// Öğretmen sil (soft delete)
function deleteTeacher(ogretmenId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("🗑️ Öğretmen siliniyor:", ogretmenId);

    // Öğretmen var mı kontrol et
    const checkStmt = activeSchoolDB.prepare(
      "SELECT ad_soyad, kullanici_id FROM ogretmenler WHERE id = ?"
    );
    checkStmt.bind([parseInt(ogretmenId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Öğretmen bulunamadı!" };
    }

    const row = checkStmt.getAsObject();
    const adSoyad = row.ad_soyad;
    const kullaniciId = row.kullanici_id;
    checkStmt.free();

    // Öğretmeni pasif yap (soft delete)
    const deleteStmt = activeSchoolDB.prepare(
      "UPDATE ogretmenler SET durum = 0, guncelleme_tarihi = ? WHERE id = ?"
    );
    deleteStmt.run([new Date().toISOString(), parseInt(ogretmenId)]);
    deleteStmt.free();

    // Kullanıcı hesabını da pasif yap
    if (kullaniciId) {
      activeSchoolDB.run("UPDATE kullanicilar SET durum = 0 WHERE id = ?", [
        kullaniciId,
      ]);
    }

    saveActiveSchoolDB();

    console.log(`✅ Öğretmen silindi (soft delete): ${adSoyad}`);

    return {
      success: true,
      message: "Öğretmen başarıyla silindi!",
    };
  } catch (error) {
    console.error("❌ Öğretmen silme hatası:", error);
    return { success: false, message: error.message };
  }
}

// Kısa ad oluştur
function generateKisaAd(adSoyad) {
  const parts = adSoyad.trim().toUpperCase().split(" ");

  if (parts.length < 2) {
    return adSoyad.substring(0, 5).toUpperCase();
  }

  const ad = parts[0];
  const soyad = parts[parts.length - 1];

  // MEHMET KARCI → M.KRC
  const kisaAd = `${ad.charAt(0)}.${soyad.substring(0, 3)}`;

  return kisaAd;
}

// Öğretmen şifresi oluştur
function generateTeacherPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";

  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

// ============================================
// ÖĞRENCİ YÖNETİMİ FONKSİYONLARI
// ============================================

// Yeni öğrenci ekle
async function createStudent(ogrenciBilgileri) {
  try {
    console.log("👨‍🎓 Yeni öğrenci ekleniyor:", ogrenciBilgileri.ad_soyad);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    // Zorunlu alan kontrolü
    if (
      !ogrenciBilgileri.ad_soyad ||
      !ogrenciBilgileri.okul_no ||
      !ogrenciBilgileri.sinif
    ) {
      return {
        success: false,
        message: "Ad Soyad, Okul No ve Sınıf zorunludur!",
      };
    }

    // TC No varsa kontrol et (11 hane)
    if (ogrenciBilgileri.tc_no && !/^\d{11}$/.test(ogrenciBilgileri.tc_no)) {
      return {
        success: false,
        message: "TC Kimlik No 11 haneli rakamlardan oluşmalıdır!",
      };
    }

    // Okul No benzersiz mi kontrol et
    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogrenciler WHERE okul_no = ?"
    );
    checkStmt.bind([ogrenciBilgileri.okul_no]);

    if (checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Bu okul numarası zaten kayıtlı!" };
    }
    checkStmt.free();

    // TC No varsa benzersiz mi kontrol et
    if (ogrenciBilgileri.tc_no) {
      const checkTcStmt = activeSchoolDB.prepare(
        "SELECT id FROM ogrenciler WHERE tc_no = ?"
      );
      checkTcStmt.bind([ogrenciBilgileri.tc_no]);

      if (checkTcStmt.step()) {
        checkTcStmt.free();
        return { success: false, message: "Bu TC Kimlik No zaten kayıtlı!" };
      }
      checkTcStmt.free();
    }

    // Öğrenci kaydını ekle
    const insertStmt = activeSchoolDB.prepare(`
      INSERT INTO ogrenciler (
        tc_no, okul_no, ad_soyad, sinif, cinsiyet,
        alan, dal, durum, dogum_yeri, dogum_tarihi,
        fotograf_path,
        anne_ad_soyad, anne_telefon, anne_durum, anne_birlikte, anne_iliski, anne_meslek,
        baba_ad_soyad, baba_telefon, baba_durum, baba_birlikte, baba_iliski, baba_meslek,
        burslu, sehit_cocugu, gazi_cocugu, destek_egitim, evde_egitim,
        sporcu_lisansi, kaynastirma, kaynastirma_tani
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run([
      ogrenciBilgileri.tc_no || null,
      ogrenciBilgileri.okul_no,
      ogrenciBilgileri.ad_soyad,
      ogrenciBilgileri.sinif,
      ogrenciBilgileri.cinsiyet || null,
      ogrenciBilgileri.alan || null,
      ogrenciBilgileri.dal || null,
      ogrenciBilgileri.durum || 1,
      ogrenciBilgileri.dogum_yeri || null,
      ogrenciBilgileri.dogum_tarihi || null,
      ogrenciBilgileri.fotograf_path || null,
      ogrenciBilgileri.anne_ad_soyad || null,
      ogrenciBilgileri.anne_telefon || null,
      ogrenciBilgileri.anne_durum || null,
      ogrenciBilgileri.anne_birlikte || null,
      ogrenciBilgileri.anne_iliski || null,
      ogrenciBilgileri.anne_meslek || null,
      ogrenciBilgileri.baba_ad_soyad || null,
      ogrenciBilgileri.baba_telefon || null,
      ogrenciBilgileri.baba_durum || null,
      ogrenciBilgileri.baba_birlikte || null,
      ogrenciBilgileri.baba_iliski || null,
      ogrenciBilgileri.baba_meslek || null,
      ogrenciBilgileri.burslu || 0,
      ogrenciBilgileri.sehit_cocugu || 0,
      ogrenciBilgileri.gazi_cocugu || 0,
      ogrenciBilgileri.destek_egitim || 0,
      ogrenciBilgileri.evde_egitim || 0,
      ogrenciBilgileri.sporcu_lisansi || null,
      ogrenciBilgileri.kaynastirma || 0,
      ogrenciBilgileri.kaynastirma_tani || null,
    ]);
    insertStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Öğrenci başarıyla eklendi");

    return {
      success: true,
      message: "Öğrenci başarıyla eklendi",
      data: {
        okul_no: ogrenciBilgileri.okul_no,
        ad_soyad: ogrenciBilgileri.ad_soyad,
        sinif: ogrenciBilgileri.sinif,
      },
    };
  } catch (error) {
    console.error("❌ Öğrenci ekleme hatası:", error);
    return { success: false, message: error.message };
  }
}

// Tüm öğrencileri getir
function getAllStudents() {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Öğrenci listesi istendi");

    const stmt = activeSchoolDB.prepare(`
      SELECT * FROM ogrenciler
      ORDER BY sinif, ad_soyad ASC
    `);

    const students = [];
    while (stmt.step()) {
      students.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${students.length} öğrenci bulundu`);

    return { success: true, data: students };
  } catch (error) {
    console.error("❌ Öğrenci listesi hatası:", error);
    return { success: false, message: error.message };
  }
}

// Öğrenci güncelle
function updateStudent(ogrenciId, guncelBilgiler) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("✏️ Öğrenci güncelleniyor:", ogrenciId);

    // Öğrenci var mı kontrol et
    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogrenciler WHERE id = ?"
    );
    checkStmt.bind([parseInt(ogrenciId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Öğrenci bulunamadı!" };
    }
    checkStmt.free();

    // Güncelleme SQL'i oluştur
    const updateFields = [];
    const values = [];

    Object.keys(guncelBilgiler).forEach((key) => {
      if (guncelBilgiler[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(guncelBilgiler[key]);
      }
    });

    values.push(parseInt(ogrenciId));

    const sql = `UPDATE ogrenciler SET ${updateFields.join(", ")} WHERE id = ?`;

    const stmt = activeSchoolDB.prepare(sql);
    stmt.run(values);
    stmt.free();

    saveActiveSchoolDB();

    console.log("✅ Öğrenci güncellendi");

    return {
      success: true,
      message: "Öğrenci başarıyla güncellendi!",
    };
  } catch (error) {
    console.error("❌ Öğrenci güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
}

// Öğrenci sil (soft delete)
function deleteStudent(ogrenciId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("🗑️ Öğrenci siliniyor:", ogrenciId);

    // Öğrenci var mı kontrol et
    const checkStmt = activeSchoolDB.prepare(
      "SELECT ad_soyad FROM ogrenciler WHERE id = ?"
    );
    checkStmt.bind([parseInt(ogrenciId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Öğrenci bulunamadı!" };
    }

    const row = checkStmt.getAsObject();
    const adSoyad = row.ad_soyad;
    checkStmt.free();

    // Öğrenciyi pasif yap (soft delete)
    const deleteStmt = activeSchoolDB.prepare(
      "UPDATE ogrenciler SET durum = 0 WHERE id = ?"
    );
    deleteStmt.run([parseInt(ogrenciId)]);
    deleteStmt.free();

    saveActiveSchoolDB();

    console.log(`✅ Öğrenci silindi (soft delete): ${adSoyad}`);

    return {
      success: true,
      message: "Öğrenci başarıyla silindi!",
    };
  } catch (error) {
    console.error("❌ Öğrenci silme hatası:", error);
    return { success: false, message: error.message };
  }
}

// Akıllı Excel ekleme (TC/Okul No kontrolü ile)
async function importStudentsFromExcel(ogrenciListesi) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📥 Excel'den öğrenci ekleniyor:", ogrenciListesi.length);

    let eklenenSayi = 0;
    let guncellenenSayi = 0;
    let hatalar = [];

    for (const ogrenci of ogrenciListesi) {
      try {
        console.log("💾 İşleniyor:", ogrenci.ad_soyad, ogrenci.tc_no);

        // TC No veya Okul No ile kontrol et
        let mevcutOgrenci = null;

        if (ogrenci.tc_no) {
          const checkTcStmt = activeSchoolDB.prepare(
            "SELECT id FROM ogrenciler WHERE tc_no = ? AND durum = 1"
          );
          checkTcStmt.bind([ogrenci.tc_no]);
          if (checkTcStmt.step()) {
            mevcutOgrenci = checkTcStmt.getAsObject();
          }
          checkTcStmt.free();
        }

        if (!mevcutOgrenci && ogrenci.okul_no) {
          const checkOkulStmt = activeSchoolDB.prepare(
            "SELECT id FROM ogrenciler WHERE okul_no = ? AND durum = 1"
          );
          checkOkulStmt.bind([ogrenci.okul_no]);
          if (checkOkulStmt.step()) {
            mevcutOgrenci = checkOkulStmt.getAsObject();
          }
          checkOkulStmt.free();
        }

        if (mevcutOgrenci) {
          // Güncelle
          const updateResult = updateStudent(mevcutOgrenci.id, ogrenci);
          if (updateResult.success) {
            guncellenenSayi++;
            console.log("✅ Güncellendi:", ogrenci.ad_soyad);
          }
        } else {
          // Yeni ekle - DOĞRUDAN INSERT
          activeSchoolDB.run(
            `INSERT INTO ogrenciler (
            tc_no, ad, soyad, ad_soyad, okul_no, sinif, cinsiyet, 
            baba_ad_soyad, anne_ad_soyad, dogum_tarihi, durum
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              ogrenci.tc_no,
              ogrenci.ad,
              ogrenci.soyad,
              ogrenci.ad_soyad,
              ogrenci.okul_no,
              ogrenci.sinif,
              ogrenci.cinsiyet,
              ogrenci.baba_ad_soyad,
              ogrenci.anne_ad_soyad,
              ogrenci.dogum_tarihi,
            ]
          );

          eklenenSayi++;
          console.log("✅ Eklendi:", ogrenci.ad_soyad);
        }
      } catch (err) {
        console.error("❌ Öğrenci hatası:", ogrenci.ad_soyad, err.message);
        hatalar.push(`${ogrenci.ad_soyad}: ${err.message}`);
      }
    }

    // Veritabanını kaydet
    saveActiveSchoolDB();

    console.log(
      `✅✅✅ ${eklenenSayi} öğrenci eklendi, ${guncellenenSayi} güncellendi`
    );

    return {
      success: true,
      message: `${eklenenSayi} öğrenci eklendi, ${guncellenenSayi} güncellendi`,
      data: {
        eklenen: eklenenSayi,
        guncellenen: guncellenenSayi,
        hatalar: hatalar,
      },
    };
  } catch (error) {
    console.error("❌ Excel import hatası:", error);
    return { success: false, message: error.message };
  }
}

// Mevcut veritabanını güncelle (migration)
async function updateExistingDatabase() {
  if (!activeSchoolDB) {
    console.log("⚠️ Aktif veritabanı yok, güncelleme atlanıyor");
    return;
  }

  try {
    console.log("🔄 Veritabanı yapısı kontrol ediliyor...");

    // Mevcut tablo yapısını kontrol et
    const checkStmt = activeSchoolDB.prepare("PRAGMA table_info(ogrenciler)");
    const columns = [];

    while (checkStmt.step()) {
      const row = checkStmt.getAsObject();
      columns.push(row.name);
    }
    checkStmt.free();

    console.log("📋 Mevcut sütunlar:", columns);

    // Eğer 'sinif' sütunu yoksa ekle
    if (!columns.includes("sinif")) {
      console.log("➕ 'sinif' sütunu ekleniyor...");

      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN sinif TEXT`);
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN alan TEXT`);
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN dal TEXT`);
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN dogum_yeri TEXT`);
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN fotograf_path TEXT`
      );
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN anne_ad_soyad TEXT`
      );
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN anne_telefon TEXT`);
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN anne_durum TEXT`);
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN anne_birlikte TEXT`
      );
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN anne_iliski TEXT`);
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN anne_meslek TEXT`);
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN baba_ad_soyad TEXT`
      );
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN baba_telefon TEXT`);
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN baba_durum TEXT`);
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN baba_birlikte TEXT`
      );
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN baba_iliski TEXT`);
      activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN baba_meslek TEXT`);
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN burslu INTEGER DEFAULT 0`
      );
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN sehit_cocugu INTEGER DEFAULT 0`
      );
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN gazi_cocugu INTEGER DEFAULT 0`
      );
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN destek_egitim INTEGER DEFAULT 0`
      );
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN evde_egitim INTEGER DEFAULT 0`
      );
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN sporcu_lisansi TEXT`
      );
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN kaynastirma INTEGER DEFAULT 0`
      );
      activeSchoolDB.run(
        `ALTER TABLE ogrenciler ADD COLUMN kaynastirma_tani TEXT`
      );

      // Eğer eski 'ad' ve 'soyad' sütunları varsa, birleştir
      if (
        columns.includes("ad") &&
        columns.includes("soyad") &&
        !columns.includes("ad_soyad")
      ) {
        activeSchoolDB.run(`ALTER TABLE ogrenciler ADD COLUMN ad_soyad TEXT`);
        activeSchoolDB.run(
          `UPDATE ogrenciler SET ad_soyad = ad || ' ' || soyad WHERE ad_soyad IS NULL`
        );
        console.log("✅ ad + soyad birleştirildi -> ad_soyad");
      }

      saveActiveSchoolDB();
      console.log("✅ Veritabanı başarıyla güncellendi!");
    } else {
      console.log("✅ Veritabanı zaten güncel");
    }
  } catch (error) {
    console.error("❌ Veritabanı güncelleme hatası:", error);
  }
}

// Export
module.exports = {
  initDatabase,
  saveMasterDB,
  getMasterDB: () => masterDB,
  getActiveSchoolDB: () => activeSchoolDB,
  getCurrentSchoolId: () => currentSchoolId,
  veritabaniKlasoru,
  yedekKlasoru,

  // Yeni fonksiyonlar
  createSchool,
  getAllSchools,
  loginSchool,
  saveActiveSchoolDB,
  updateExistingDatabase,
  // Öğretmen fonksiyonları
  createTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  // Öğrenci fonksiyonları
  createStudent,
  getAllStudents,
  updateStudent,
  deleteStudent,
  importStudentsFromExcel,
};
