// ==========================================
// MAIN.JS — Ultra Enhanced Version
// ==========================================
// Türkiye'nin İlk Yapay Zeka Destekli Okul Yönetim Sistemi
// Main Process - Electron Backend
//
// @author SİMRE/MK
// @version 3.0.0
// @date 2025
//
// ==========================================

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const net = require("net");
const downloadsWatcher = require("./src/downloads-watcher");
const mebbisEntegrasyon = require("./mebbis-entegrasyon");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const db = require("./src/veritabani/veritabani");
const os = require("os");
const LicenseManager = require("./license-manager");
const securityManager = require("./src/utils/security-manager");

// ==========================================
// 🆕 YENİ SİSTEMLER - CACHE & PUPPETEER & LOGGER
// ==========================================
const cacheManager = require("./src/utils/cache-manager");
const puppeteerManager = require("./src/utils/puppeteer-manager");
const logger = require("./src/utils/logger");

// ==========================================
// 📦 HANDLER'LARI YÜK
// ==========================================
const registerAllHandlers = require("./src/handlers/index");

// ==========================================
// GLOBAL HATA YAKALAMA SİSTEMİ
// ==========================================

process.on("uncaughtException", (error) => {
  logger.error("Yakalanmamış hata (Uncaught Exception)", {
    error: error.message,
    stack: error.stack,
    module: "process",
  });
  console.error("❌ Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Yakalanmamış promise reddi (Unhandled Rejection)", {
    reason: reason ? reason.toString() : "Unknown",
    module: "process",
  });
  console.error("❌ Unhandled Rejection:", reason);
});

app.on("render-process-gone", (event, webContents, details) => {
  logger.error("Render process durdu", {
    reason: details.reason,
    exitCode: details.exitCode,
    module: "electron",
  });
  console.error("❌ Render Process Gone:", details);
});

// ==========================================
// PUPPETEER CACHE PATH FIX
// ==========================================
try {
  const puppeteerCachePath = path.join(
    app.getPath("userData"),
    ".cache",
    "puppeteer"
  );

  process.env.PUPPETEER_CACHE_DIR = puppeteerCachePath;

  console.log("📁 Puppeteer cache ayarlandı:", puppeteerCachePath);
  logger.info("Puppeteer cache ayarlandı", {
    path: puppeteerCachePath,
    module: "puppeteer",
  });
} catch (error) {
  console.log("ℹ️ Puppeteer ayarı atlandı (sorun yok)");
  logger.warn("Puppeteer cache ayarı atlandı", {
    error: error.message,
    module: "puppeteer",
  });
}

// ==========================================
// GLOBAL DEĞİŞKENLER
// ==========================================

let mainWindow;
let updateAvailable = false;
let currentSchoolId = null;
global.currentSchoolId = currentSchoolId;
let activeLicense = null;
global.activeLicense = null;
let tcpServer = null;

console.log("🚀 Okul Yönetim Sistemi başlatılıyor...");
console.log("👨‍💻 Geliştirici: SİMRE/MK");
console.log("📦 Version: 3.0.0");
console.log("📅 Yıl: 2025");

logger.info("🚀 Okul Yönetim Sistemi başlatıldı", {
  version: "3.0.0",
  developer: "SİMRE/MK",
  year: 2025,
  platform: process.platform,
  nodeVersion: process.version,
  electronVersion: process.versions.electron,
  module: "app-startup",
});

// ==========================================
// NATIVE MESSAGING TCP SERVER
// ==========================================

function startNativeMessagingServer() {
  tcpServer = net.createServer((socket) => {
    console.log("📨 Chrome eklentisinden bağlantı alındı");

    socket.on("data", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("📨 Mesaj tipi:", message.type);
        console.log("📊 Veri sayısı:", message.data ? message.data.length : 0);

        let response = { success: false };

        if (message.type === "students") {
          const result = await db.importStudentsFromExcel(message.data);
          response = { success: true, data: result };

          const mainWindow = BrowserWindow.getAllWindows().find(
            (win) => !win.title.includes("MEBBİS")
          );
          if (mainWindow) {
            mainWindow.webContents.send(
              "chrome-students-received",
              message.data
            );
          }

          console.log("✅ Öğrenciler kaydedildi:", result);
        } else if (message.type === "photos") {
          const photoDir = path.join(db.veritabaniKlasoru, "..", "Fotograflar");
          if (!fs.existsSync(photoDir)) {
            fs.mkdirSync(photoDir, { recursive: true });
          }

          let savedCount = 0;
          for (const photo of message.data) {
            try {
              const schoolDB = db.getActiveSchoolDB();
              const stmt = schoolDB.prepare(
                "SELECT id, okul_no FROM ogrenciler WHERE UPPER(ad_soyad) = UPPER(?) AND durum = 1"
              );
              stmt.bind([photo.ad_soyad]);

              if (stmt.step()) {
                const ogrenci = stmt.getAsObject();
                const base64Data = photo.base64.replace(
                  /^data:image\/\w+;base64,/,
                  ""
                );
                const buffer = Buffer.from(base64Data, "base64");
                const fileName = `${ogrenci.okul_no}.jpg`;
                const filePath = path.join(photoDir, fileName);

                fs.writeFileSync(filePath, buffer);
                schoolDB.run(
                  "UPDATE ogrenciler SET fotograf_path = ? WHERE id = ?",
                  [filePath, ogrenci.id]
                );

                savedCount++;
              }
              stmt.free();
            } catch (err) {
              console.error("Fotoğraf kaydetme hatası:", err);
            }
          }

          db.saveActiveSchoolDB();
          response = { success: true, data: { saved: savedCount } };
          console.log("✅ Fotoğraflar kaydedildi:", savedCount);
        }

        socket.write(JSON.stringify(response));
        socket.end();
      } catch (error) {
        console.error("❌ Mesaj işleme hatası:", error);
        socket.write(
          JSON.stringify({ success: false, message: error.message })
        );
        socket.end();
      }
    });

    socket.on("error", (err) => {
      console.error("❌ Socket hatası:", err);
    });
  });

  tcpServer.listen(9876, "127.0.0.1", () => {
    console.log("✅ Native Messaging sunucusu başlatıldı: 127.0.0.1:9876");
  });

  tcpServer.on("error", (err) => {
    console.error("❌ TCP Server hatası:", err);
  });
}

// ==========================================
// UYGULAMA YOLU VE GELİŞTİRME MODU
// ==========================================

const isDev = !app.isPackaged;
const appPath = isDev ? __dirname : path.dirname(app.getPath("exe"));

console.log("📁 Uygulama Yolu:", appPath);
console.log("🔧 Geliştirme Modu:", isDev);

// ==========================================
// ANA PENCERE OLUŞTURMA
// ==========================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    frame: true,
    icon: path.join(__dirname, "build/icon.ico"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    backgroundColor: "#ffffff",
  });

  mainWindow.loadFile("src/sayfalar/giris.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize();

    setTimeout(() => {
      checkForUpdates();
    }, 5000);
  });

  mainWindow.on("close", (e) => {
    try {
      console.log("💾 Pencere kapanıyor, veritabanı kaydediliyor...");
      const schoolDb = db.getActiveSchoolDB();
      if (schoolDb) {
        db.saveActiveSchoolDB();
        console.log("✅ Veritabanı kaydedildi");
      }
    } catch (error) {
      console.error("❌ Kapanış kayıt hatası:", error);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ==========================================
// 💾 VERİTABANI OTOMATİK KAYDETME
// ==========================================

setInterval(() => {
  try {
    const currentSchoolId = db.getCurrentSchoolId();

    if (currentSchoolId) {
      const schoolDb = db.getActiveSchoolDB();
      if (schoolDb) {
        db.saveActiveSchoolDB();
        console.log(
          "💾 Otomatik veritabanı kaydı yapıldı (Okul ID:",
          currentSchoolId,
          ")"
        );
      }
    } else {
      console.log("ℹ️ Otomatik kayıt atlandı (Superadmin veya giriş yok)");
    }
  } catch (error) {
    console.warn("⚠️ Otomatik kayıt atlandı:", error.message);
  }
}, 30000);

app.on("before-quit", () => {
  try {
    console.log("💾 Uygulama kapanıyor, son veritabanı kaydı yapılıyor...");

    const currentSchoolId = db.getCurrentSchoolId();

    if (currentSchoolId) {
      const schoolDb = db.getActiveSchoolDB();
      if (schoolDb) {
        db.saveActiveSchoolDB();
        console.log(
          "✅ Veritabanı başarıyla kaydedildi (Okul ID:",
          currentSchoolId,
          ")"
        );
      }
    } else {
      console.log("ℹ️ Kapanış kaydı atlandı (Superadmin veya giriş yok)");
    }
  } catch (error) {
    console.warn("⚠️ Kapanış kayıt hatası:", error.message);
  }
});

// ==========================================
// VERİTABANI MİGRATİONLARI
// ==========================================
async function runDatabaseMigrations(schoolDb) {
  try {
    console.log("🔄 Okul veritabanı migrasyonları kontrol ediliyor...");

    if (!schoolDb) {
      console.log("⚠️ Okul veritabanı yok, migration atlanıyor");
      return;
    }

    const geziColumns = schoolDb.exec("PRAGMA table_info(geziler)");
    if (geziColumns && geziColumns.length > 0) {
      const columns = geziColumns[0].values.map((row) => row[1]);

      if (!columns.includes("durum")) {
        console.log("📊 geziler.durum sütunu ekleniyor...");
        schoolDb.run(
          "ALTER TABLE geziler ADD COLUMN durum TEXT DEFAULT 'planlanan'"
        );
        console.log("✅ durum sütunu eklendi");
      }

      if (!columns.includes("gezi_turu")) {
        console.log("📊 geziler.gezi_turu sütunu ekleniyor...");
        schoolDb.run(
          "ALTER TABLE geziler ADD COLUMN gezi_turu TEXT DEFAULT 'ilce_ici'"
        );
        console.log("✅ gezi_turu sütunu eklendi");
      }

      if (!columns.includes("butce")) {
        console.log("📊 geziler.butce sütunu ekleniyor...");
        schoolDb.run("ALTER TABLE geziler ADD COLUMN butce REAL DEFAULT 0");
        console.log("✅ butce sütunu eklendi");
      }

      if (!columns.includes("para_birimi")) {
        console.log("📊 geziler.para_birimi sütunu ekleniyor...");
        schoolDb.run(
          "ALTER TABLE geziler ADD COLUMN para_birimi TEXT DEFAULT 'TL'"
        );
        console.log("✅ para_birimi sütunu eklendi");
      }

      if (!columns.includes("onay_durumu")) {
        console.log("📊 geziler.onay_durumu sütunu ekleniyor...");
        schoolDb.run(
          "ALTER TABLE geziler ADD COLUMN onay_durumu TEXT DEFAULT 'bekliyor'"
        );
        console.log("✅ onay_durumu sütunu eklendi");
      }

      if (!columns.includes("olusturma_tarihi")) {
        console.log("📊 geziler.olusturma_tarihi sütunu ekleniyor...");
        schoolDb.run(
          "ALTER TABLE geziler ADD COLUMN olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP"
        );
        console.log("✅ olusturma_tarihi sütunu eklendi");
      }
    }

    db.saveActiveSchoolDB();
    console.log("✅ Okul veritabanı migrasyonları tamamlandı");
  } catch (error) {
    console.error("❌ Migration hatası:", error);
  }
}

// ==========================================
// UYGULAMA HAZIR
// ==========================================

app.whenReady().then(async () => {
  console.log("🎯 Uygulama hazırlanıyor...");

  startNativeMessagingServer();

  const dbReady = await db.initDatabase();
  if (!dbReady) {
    dialog.showErrorBox(
      "Veritabanı Hatası",
      "Veritabanı başlatılamadı! Uygulama kapatılıyor."
    );
    app.quit();
    return;
  }

  console.log("✅ Veritabanı başarıyla başlatıldı");

  // ==========================================
  // 📦 HANDLER'LARI YÜKLEİ
  // ==========================================
  console.log("📦 Handler'lar yükleniyor...");
  registerAllHandlers(db);
  console.log("✅ Handler'lar yüklendi!");

  try {
    // İlk deneme: Aktif DB var mı? (Giriş yapılmış mı?)
    const schoolDb = db.getActiveSchoolDB();
    if (schoolDb) {
      console.log("🔧 Gezi tabloları kontrol ediliyor...");

      const odemelerCheck = schoolDb.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='gezi_odemeler'"
      );

      if (
        odemelerCheck &&
        odemelerCheck.length > 0 &&
        odemelerCheck[0].values.length > 0
      ) {
        const columns = schoolDb.exec("PRAGMA table_info(gezi_odemeler)");
        const columnNames = columns[0].values.map((row) => row[1]);

        console.log("📋 Mevcut sütunlar:", columnNames.join(", "));

        const requiredColumns = [
          "katilimci_ucret_id",
          "taksit_no",
          "taksit_tutari",
          "vade_tarihi",
          "odeme_durumu",
        ];
        const hasCorrectStructure = requiredColumns.every((col) =>
          columnNames.includes(col)
        );

        if (!hasCorrectStructure) {
          console.log("⚠️ Yanlış tablo yapısı! Yeniden oluşturuluyor...");
          schoolDb.run("DROP TABLE IF EXISTS gezi_odemeler");
          schoolDb.run(`
            CREATE TABLE gezi_odemeler (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              katilimci_ucret_id INTEGER NOT NULL,
              taksit_no INTEGER NOT NULL,
              taksit_tutari REAL NOT NULL,
              vade_tarihi TEXT NOT NULL,
              odeme_durumu TEXT DEFAULT 'bekliyor' CHECK(odeme_durumu IN ('bekliyor', 'odendi', 'gecikti')),
              odeme_tarihi TEXT,
              odeme_sekli TEXT,
              makbuz_no TEXT,
              notlar TEXT,
              olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (katilimci_ucret_id) REFERENCES gezi_katilimci_ucretler(id) ON DELETE CASCADE
            )
          `);
          console.log("✅ gezi_odemeler tablosu yeniden oluşturuldu");
        } else {
          console.log("✅ gezi_odemeler tablosu güncel");
        }
      } else {
        console.log("📊 gezi_odemeler tablosu oluşturuluyor...");
        schoolDb.run(`
          CREATE TABLE gezi_odemeler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            katilimci_ucret_id INTEGER NOT NULL,
            taksit_no INTEGER NOT NULL,
            taksit_tutari REAL NOT NULL,
            vade_tarihi TEXT NOT NULL,
            odeme_durumu TEXT DEFAULT 'bekliyor' CHECK(odeme_durumu IN ('bekliyor', 'odendi', 'gecikti')),
            odeme_tarihi TEXT,
            odeme_sekli TEXT,
            makbuz_no TEXT,
            notlar TEXT,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (katilimci_ucret_id) REFERENCES gezi_katilimci_ucretler(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ gezi_odemeler tablosu oluşturuldu");
      }

      db.saveActiveSchoolDB();
      console.log("✅ Tüm gezi tabloları güncellendi!");
    }
  } catch (err) {
    // Giriş yapılmadığı için getActiveSchoolDB hata fırlatırsa buraya düşer
    console.log(
      "ℹ️ Henüz okul seçilmedi, tablo kontrolleri giriş yapıldığında gerçekleşecek."
    );
  }

  const cron = require("node-cron");

  function startAutoBackup() {
    const settingsPath = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "backup-settings.json"
    );

    cron.schedule("0 * * * *", async () => {
      try {
        if (!fs.existsSync(settingsPath)) return;

        const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        if (!settings.enabled) return;

        const now = new Date();
        const [hour, minute] = settings.time.split(":");

        if (
          now.getHours() !== parseInt(hour) ||
          now.getMinutes() !== parseInt(minute)
        ) {
          return;
        }

        const lastBackupPath = path.join(
          os.homedir(),
          "Documents",
          "OkulYonetimSistemi",
          ".last-auto-backup"
        );
        let shouldBackup = false;

        if (fs.existsSync(lastBackupPath)) {
          const lastBackup = new Date(fs.readFileSync(lastBackupPath, "utf8"));
          const daysSince = (now - lastBackup) / (1000 * 60 * 60 * 24);

          if (settings.frequency === "gunluk" && daysSince >= 1)
            shouldBackup = true;
          if (settings.frequency === "haftalik" && daysSince >= 7)
            shouldBackup = true;
          if (settings.frequency === "aylik" && daysSince >= 30)
            shouldBackup = true;
        } else {
          shouldBackup = true;
        }

        if (shouldBackup) {
          console.log("🤖 Otomatik yedekleme başlatılıyor...");

          const archiver = require("archiver");
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const backupName = `backup_${settings.frequency}_${timestamp}.zip`;
          const backupDir = path.join(
            os.homedir(),
            "Documents",
            "OkulYonetimSistemi",
            "Yedekler"
          );

          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }

          const backupPath = path.join(backupDir, backupName);
          const dbDir = path.join(
            os.homedir(),
            "Documents",
            "OkulYonetimSistemi",
            "Veritabani"
          );
          const output = fs.createWriteStream(backupPath);
          const archive = archiver("zip", { zlib: { level: 9 } });

          output.on("close", () => {
            console.log("✅ Otomatik yedek oluşturuldu:", backupName);
            fs.writeFileSync(lastBackupPath, now.toISOString());
            cleanOldBackups(settings.keepDays);
          });

          archive.on("error", (err) => {
            console.error("❌ Otomatik yedekleme hatası:", err);
          });

          archive.pipe(output);
          archive.directory(dbDir, "Veritabani");
          archive.finalize();
        }
      } catch (error) {
        console.error("❌ Otomatik yedekleme sistemi hatası:", error);
      }
    });

    console.log("🤖 Otomatik yedekleme sistemi başlatıldı");
  }

  function cleanOldBackups(keepDays) {
    try {
      const backupDir = path.join(
        os.homedir(),
        "Documents",
        "OkulYonetimSistemi",
        "Yedekler"
      );
      if (!fs.existsSync(backupDir)) return;

      const files = fs.readdirSync(backupDir);
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith(".zip")) continue;

        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const daysSince = (now - stats.birthtimeMs) / (1000 * 60 * 60 * 24);

        if (daysSince > keepDays) {
          fs.unlinkSync(filePath);
          console.log("🗑️ Eski yedek silindi:", file);
        }
      }
    } catch (error) {
      console.error("❌ Yedek temizleme hatası:", error);
    }
  }

  startAutoBackup();

  console.log("🧹 Cache yönetimi başlatılıyor...");
  const cacheResult = await cacheManager.checkAndClearIfNeeded();

  if (cacheResult.cleared) {
    console.log("🎉 Cache temizlendi!");
    console.log(`   • Eski versiyon: ${cacheResult.oldVersion}`);
    console.log(`   • Yeni versiyon: ${cacheResult.newVersion}`);
  } else {
    console.log(`ℹ️ Cache temizlenmedi (${cacheResult.reason})`);
  }

  console.log("🎨 Puppeteer hazırlığı yapılıyor...");
  const chromeStatus = puppeteerManager.getChromeStatus();

  if (!chromeStatus.downloaded) {
    console.log("📥 Chrome henüz indirilmemiş, ilk PDF işleminde indirilecek");
  } else {
    console.log("✅ Chrome hazır:", chromeStatus.path);
  }

  console.log("✅ Tüm hazırlıklar tamamlandı");

  downloadsWatcher.startWatching(async (excelPath) => {
    console.log("📊 Excel dosyası işleniyor:", excelPath);

    const mainWindow = BrowserWindow.getAllWindows().find(
      (win) => !win.title.includes("MEBBİS")
    );

    if (mainWindow) {
      mainWindow.webContents.send("excel-auto-detected", excelPath);
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // 🔥 GEZİ TABLOLARINI OLUŞTUR (GÜVENLİ VE HATA KONTROLLÜ)
  try {
    const schoolDb = db.getActiveSchoolDB();

    if (schoolDb) {
      console.log("🔧 Gezi tabloları oluşturuluyor...");

      // 1. ARAÇLAR
      schoolDb.run(`
        CREATE TABLE IF NOT EXISTS gezi_araclar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gezi_id INTEGER NOT NULL,
          plaka TEXT NOT NULL,
          arac_modeli TEXT,
          trafige_cikis_tarihi TEXT,
          son_muayene_tarihi TEXT,
          mali_sorumluluk_police_no TEXT,
          mali_sorumluluk_bitis_tarihi TEXT,
          ferdi_kaza_police_no TEXT,
          ferdi_kaza_bitis_tarihi TEXT,
          kapasite INTEGER,
          arac_ozellikleri TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. ULAŞIM
      schoolDb.run(`
        CREATE TABLE IF NOT EXISTS gezi_ulasim (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gezi_id INTEGER NOT NULL,
          ulasim_tipi TEXT NOT NULL,
          firma_adi TEXT,
          sefer_no TEXT,
          pnr_kodu TEXT,
          kalkis_yeri TEXT,
          varis_yeri TEXT,
          kalkis_tarihi TEXT,
          kalkis_saati TEXT,
          varis_tarihi TEXT,
          varis_saati TEXT,
          aktarma_var INTEGER DEFAULT 0,
          aktarma_bilgisi TEXT,
          ucret REAL,
          notlar TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. KONAKLAMA
      schoolDb.run(`
        CREATE TABLE IF NOT EXISTS gezi_konaklama (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gezi_id INTEGER NOT NULL,
          otel_adi TEXT NOT NULL,
          otel_adresi TEXT,
          otel_telefon TEXT,
          otel_email TEXT,
          giris_tarihi TEXT,
          cikis_tarihi TEXT,
          gece_sayisi INTEGER,
          oda_sayisi INTEGER,
          notlar TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 4. KONAKLAMA ODALAR
      schoolDb.run(`
        CREATE TABLE IF NOT EXISTS gezi_konaklama_odalar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          konaklama_id INTEGER NOT NULL,
          oda_no TEXT NOT NULL,
          oda_tipi TEXT,
          kapasite INTEGER,
          kat_no INTEGER,
          notlar TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (konaklama_id) REFERENCES gezi_konaklama(id) ON DELETE CASCADE
        )
      `);

      // 5. KONAKLAMA YERLEŞİM
      schoolDb.run(`
        CREATE TABLE IF NOT EXISTS gezi_konaklama_yerlesim (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          oda_id INTEGER NOT NULL,
          kisi_tipi TEXT NOT NULL,
          kisi_id INTEGER NOT NULL,
          tc_no TEXT,
          ad_soyad TEXT,
          dogum_tarihi TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (oda_id) REFERENCES gezi_konaklama_odalar(id) ON DELETE CASCADE
        )
      `);

      // 6. ŞOFÖRLER
      schoolDb.run(`
        CREATE TABLE IF NOT EXISTS gezi_arac_soforler (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          arac_id INTEGER NOT NULL,
          tc_no TEXT NOT NULL,
          ad_soyad TEXT NOT NULL,
          telefon TEXT,
          src_belge_no TEXT,
          src_belge_tarihi TEXT,
          sofor_tipi TEXT DEFAULT 'ana_sofor',
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (arac_id) REFERENCES gezi_araclar(id) ON DELETE CASCADE
        )
      `);

      // 7. BELGELER
      schoolDb.run(`
        CREATE TABLE IF NOT EXISTS gezi_arac_belgeler (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          arac_id INTEGER NOT NULL,
          belge_tipi TEXT NOT NULL,
          belge_adi TEXT NOT NULL,
          dosya_yolu TEXT NOT NULL,
          dosya_uzantisi TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (arac_id) REFERENCES gezi_araclar(id) ON DELETE CASCADE
        )
      `);

      db.saveActiveSchoolDB();
      console.log("✅ GEZİ TABLOLARI OLUŞTURULDU!");
    }
  } catch (error) {
    // Hata durumunda (Giriş yapılmadığında) sessizce geç
    console.log(
      "ℹ️ Gezi tabloları şimdilik atlandı (Aktif okul veritabanı bulunamadı)."
    );
  }

  console.log("🎉 Uygulama başarıyla başlatıldı!");
});

// ==========================================
// UYGULAMA KAPATMA
// ==========================================

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (tcpServer) {
    tcpServer.close();
    console.log("✅ TCP Server kapatıldı");
  }

  downloadsWatcher.stopWatching();
  console.log("✅ Downloads watcher durduruldu");
});

// ==========================================
// OTOMATİK GÜNCELLEME SİSTEMİ
// ==========================================

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function checkForUpdates() {
  if (isDev) {
    console.log("⚠️ Geliştirme modunda, güncelleme kontrolü yapılmıyor");
    return;
  }

  console.log("🔍 Güncelleme kontrol ediliyor...");

  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    console.error("❌ Güncelleme kontrolü hatası:", error);
  }
}

autoUpdater.on("update-available", (info) => {
  console.log("✅ Yeni güncelleme bulundu:", info.version);
  console.log("📝 Release Notes:", info.releaseNotes);
  updateAvailable = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    // Önce renderer'a gönder
    mainWindow.webContents.send("update-available", {
      version: info.version,
      releaseDate: info.releaseDate || new Date().toISOString(),
      releaseNotes: info.releaseNotes || "Yeni özellikler ve iyileştirmeler",
    });

    // Kullanıcıya dialog göster
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "🎉 Yeni Güncelleme Mevcut",
        message: `Yeni versiyon: v${info.version}`,
        detail: `📋 Yenilikler:\n\n${
          info.releaseNotes || "Yeni özellikler ve iyileştirmeler"
        }\n\nGüncellemek ister misiniz?`,
        buttons: ["✅ İndir ve Kur", "⏰ Daha Sonra"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      })
      .then((result) => {
        if (result.response === 0) {
          console.log("📥 Kullanıcı güncellemeyi kabul etti, indiriliyor...");
          autoUpdater.downloadUpdate();
        } else {
          console.log("⏰ Kullanıcı güncellemeyi erteledi");
        }
      });
  }
});

autoUpdater.on("update-not-available", () => {
  console.log("✅ Uygulama güncel");
  updateAvailable = false;
});

autoUpdater.on("download-progress", (progress) => {
  const percent = progress.percent || 0;
  console.log(`📥 İndiriliyor: ${Math.floor(percent)}%`);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-progress", {
      percent: Math.floor(percent),
      transferred: progress.transferred || 0,
      total: progress.total || 0,
      bytesPerSecond: progress.bytesPerSecond || 0,
    });
  }
});

// ==========================================
// 📦 GÜNCELLEME SİSTEMİ
// ==========================================

autoUpdater.on("before-quit-for-update", () => {
  console.log("💾 Güncelleme öncesi veritabanı kaydediliyor...");

  try {
    const schoolDb = db.getActiveSchoolDB();
    if (schoolDb) {
      db.saveActiveSchoolDB();
      console.log("✅ Veritabanı güncelleme öncesi kaydedildi");
    }
  } catch (error) {
    console.error("❌ Güncelleme öncesi kayıt hatası:", error);
  }
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("✅ Güncelleme indirildi, hazır!");

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-downloaded", {
      version: info.version,
      releaseDate: info.releaseDate,
    });

    // İndirme tamamlandı dialogu
    dialog
      .showMessageBox(mainWindow, {
        type: "success",
        title: "✅ Güncelleme Hazır",
        message: `v${info.version} başarıyla indirildi!`,
        detail:
          "Güncellemelerin aktif olması için uygulamayı yeniden başlatmanız gerekiyor.",
        buttons: ["🔄 Şimdi Yeniden Başlat", "⏰ Daha Sonra"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      })
      .then((result) => {
        if (result.response === 0) {
          console.log("🔄 Kullanıcı yeniden başlatmayı seçti");
          autoUpdater.quitAndInstall(false, true);
        }
      });
  }

  // Otomatik yeniden başlatma YOK - Kullanıcı butona basacak
});

autoUpdater.on("error", (error) => {
  console.error("❌ Güncelleme hatası:", error);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-error", {
      message: error.message || "Bilinmeyen güncelleme hatası",
      code: error.code || "UNKNOWN",
    });
  }
});

// Manuel güncelleme indirme başlat
ipcMain.handle("start-update-download", async () => {
  try {
    if (updateAvailable) {
      console.log("📥 Güncelleme indirmeye başlanıyor...");
      autoUpdater.downloadUpdate();
      return { success: true, message: "İndirme başlatıldı" };
    } else {
      console.warn("⚠️ İndirilecek güncelleme yok");
      return { success: false, message: "Yeni güncelleme bulunamadı" };
    }
  } catch (error) {
    console.error("❌ İndirme başlatma hatası:", error);
    return { success: false, message: error.message };
  }
});

// Manuel güncelleme kontrolü
ipcMain.handle("check-for-updates", async () => {
  checkForUpdates();
  return { success: true };
});

// Uygulamayı yeniden başlat ve güncelle
ipcMain.handle("quit-and-install", async () => {
  try {
    console.log("🔄 Güncelleme yükleniyor ve uygulama yeniden başlatılıyor...");

    // Veritabanını kaydet
    const schoolDb = db.getActiveSchoolDB();
    if (schoolDb) {
      db.saveActiveSchoolDB();
      console.log("💾 Veritabanı güncelleme öncesi kaydedildi");
    }

    // 1 saniye bekle ve yeniden başlat
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 1000);

    return { success: true };
  } catch (error) {
    console.error("❌ Yeniden başlatma hatası:", error);
    return { success: false, message: error.message };
  }
});

// ==========================================
// TEMEL UYGULAMA BİLGİLERİ
// ==========================================

ipcMain.handle("get-app-path", () => {
  return appPath;
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("get-app-info", () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    path: appPath,
    isDev: isDev,
  };
});

// ============================================================
// 🔐 GİRİŞ İŞLEMLERİ (GÜVENLİK GÜNCELLEMESİ - TAM VE KESİNTİSİZ KOD)
// ============================================================

ipcMain.handle("login", async (event, okulKodu, kullaniciAdi, sifre) => {
  try {
    const cleanOkulKodu = String(okulKodu).trim();
    const cleanKullaniciAdi = String(kullaniciAdi).trim();
    const cleanSifre = String(sifre).trim();

    console.log("=".repeat(60));
    console.log("👑 GİRİŞ DENETİMİ BAŞLADI");
    console.log(
      `📍 Kurum: [${cleanOkulKodu}] Kullanıcı: [${cleanKullaniciAdi}]`
    );
    console.log("=".repeat(60));

    // ==========================================
    // 👑 1. ÖNCELİK: SÜPER ADMİN KONTROLÜ
    // ==========================================
    if (cleanOkulKodu === "000000" && cleanKullaniciAdi === "superadmin") {
      console.log("🔐 [DEBUG]: Süper Admin şifre doğrulaması yapılıyor...");

      if (securityManager.isFirstSetup()) {
        console.log("⚠️ [WARN]: İlk kurulum tespit edildi!");

        if (cleanSifre === "Superadmin123!") {
          console.log("✅ [SUCCESS]: İlk kurulum şifresi kabul edildi.");

          return {
            success: false,
            needSetup: true,
            message: "Lütfen güvenli bir superadmin şifresi oluşturun!",
          };
        } else {
          return {
            success: false,
            message: "İlk kurulum için varsayılan şifre: Superadmin123!",
          };
        }
      }

      if (!securityManager.verifyAdminPassword(cleanSifre)) {
        console.warn("⚠️ [WARN]: Superadmin şifresi yanlış!");
        return { success: false, message: "Kullanıcı adı veya şifre hatalı!" };
      }

      console.log("🚀 [DEBUG]: Süper Admin girişi onaylandı.");

      const superAdminData = {
        okul_kodu: "000000",
        okul_adi: "Sistem Yönetim Merkezi",
        kullanici_adi: "superadmin",
        role: "super_admin",
        moduller: [
          "okullar",
          "lisanslar",
          "kullanicilar",
          "genel-raporlar",
          "yedekleme",
          "loglar",
          "guvenlik",
          "istatistikler",
          "ayarlar",
          "bildirimler",
          "destek",
          "guncellemeler",
          "api",
          "tema",
          "email",
          "dashboard",
          "yeni-okul",
          "okul-listesi",
          "lisans-takip",
          "finansal",
          "istatistik",
          "kullanici-yonetimi",
          "sistem-saglik",
          "veritabani",
          "yedek-al",
          "yedek-yukle",
          "log-goruntuleyici",
          "guvenlik-rapor",
          "api-anahtar",
          "mail-sablonlari",
          "bildirim-ayarlari",
          "tema-editor",
          "dil-ayarlari",
          "sms-entegrasyon",
          "excel-export",
          "pdf-export",
          "toplu-islem",
          "onay-bekleyen",
          "sikca-sorulan",
          "destek-talep",
        ],
        gecerlilik: "2099-12-31",
      };

      global.activeLicense = superAdminData;

      return {
        success: true,
        message: "Sistem Yöneticisi Paneline Hoş Geldiniz!",
        okul: superAdminData,
      };
    }

    // ==========================================
    // 🏢 2. NORMAL OKUL GİRİŞİ (LİSANS KONTROLLÜ)
    // ==========================================
    if (!cleanOkulKodu || !cleanKullaniciAdi || !cleanSifre) {
      return { success: false, message: "Tüm alanları doldurunuz!" };
    }

    const licensesDir = path.join(app.getPath("userData"), "licenses");
    const licenseFilePath = path.join(
      licensesDir,
      `lisans_${cleanOkulKodu}.lic`
    );

    console.log(`📂 [DEBUG]: Lisans aranıyor: ${licenseFilePath}`);

    if (!fs.existsSync(licenseFilePath)) {
      console.error("❌ [ERROR]: Lisans dosyası bulunamadı.");
      return {
        success: false,
        message: "Bu kurum kodu için lisans bulunamadı!",
        needLicense: true,
      };
    }

    const licenseContent = fs.readFileSync(licenseFilePath, "utf8");
    console.log("🔍 [DEBUG]: Lisans içeriği doğrulanıyor...");
    const licenseResult = LicenseManager.readLicenseFromContent(licenseContent);

    if (!licenseResult.success) {
      console.error(
        `❌ [ERROR]: Lisans doğrulama hatası: ${licenseResult.error}`
      );
      return { success: false, message: licenseResult.error };
    }

    const license = licenseResult.license;

    // 🛡️ LİSANS KULLANICI ADI KONTROLÜ
    if (String(license.kullanici_adi).trim() !== cleanKullaniciAdi) {
      console.warn("⚠️ [WARN]: Kullanıcı adı lisansla uyuşmuyor.");
      return { success: false, message: "Giriş bilgileri hatalı!" };
    }

    // 🔥 4. MASTER DB'DE OKUL KAYDI KONTROLÜ
    console.log("🔍 [DEBUG]: Master DB'de okul kontrolü...");
    const masterDB = db.getMasterDB();

    const checkSchoolStmt = masterDB.prepare(
      "SELECT id FROM okullar WHERE okul_kodu = ? AND durum = 1"
    );
    checkSchoolStmt.bind([cleanOkulKodu]);
    const okulVarMi = checkSchoolStmt.step();
    checkSchoolStmt.free();

    if (!okulVarMi) {
      console.warn("⚠️ [WARN]: Master DB'de okul kaydı YOK, oluşturuluyor...");

      const baslangic = new Date().toISOString();
      const bitis = new Date(license.gecerlilik).toISOString();
      const dbFileName = `okul_${cleanOkulKodu}.db`;

      const insertSchoolStmt = masterDB.prepare(`
        INSERT INTO okullar (
          okul_kodu, okul_adi, sifre, veritabani_dosyasi,
          lisans_baslangic, lisans_bitis, durum
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `);

      insertSchoolStmt.run([
        cleanOkulKodu,
        license.okul_adi || `Okul ${cleanOkulKodu}`,
        "LİSANSLI_GİRİŞ", // Master DB şifre alanı referans olarak tutulur
        dbFileName,
        baslangic,
        bitis,
      ]);
      insertSchoolStmt.free();

      db.saveMasterDB();
      console.log("✅ [SUCCESS]: Master DB'ye okul kaydı eklendi!");
    }

    // 5. ✅ VERİTABANI LOGİN İŞLEMİ (ASIL DOĞRULAMA BURADA YAPILIR)
    // db.loginSchool fonksiyonu içeride şifre hash kontrolünü yapar.
    console.log(
      "🗄️ [DEBUG]: Okul veritabanına bağlanılıyor ve şifre doğrulanıyor..."
    );
    const dbResult = await db.loginSchool(
      cleanOkulKodu,
      cleanKullaniciAdi,
      cleanSifre
    );

    if (!dbResult.success) {
      console.error(`❌ [ERROR]: Veritabanı login hatası: ${dbResult.message}`);
      // Lisanstaki şifre hash olabileceği için dbResult hatası daha güvenilirdir.
      return { success: false, message: "Kullanıcı adı veya şifre hatalı!" };
    }

    global.activeLicense = license;
    console.log("✅ [SUCCESS]: Giriş işlemi başarıyla tamamlandı.");

    return {
      success: true,
      message: "Giriş başarılı!",
      okul: license,
    };
  } catch (error) {
    console.error("❌ [KRİTİK HATA]:", error);
    return { success: false, message: "Sistem hatası: " + error.message };
  }
});
/**
 * 📥 LİSANS YÜKLEME HANDLER'I (GÜNCEL - OKUL KAYDI İLE)
 */
ipcMain.handle("upload-license", async (event, licenseFileData) => {
  try {
    console.log("📥 [DEBUG]: Lisans yükleme isteği alındı.");

    // 1. Base64 veriyi temizle ve UTF-8 metne çevir
    let base64Data = licenseFileData.data;
    if (base64Data.includes(",")) {
      base64Data = base64Data.split(",")[1];
    }

    const licenseContent = Buffer.from(base64Data, "base64").toString("utf8");

    // 2. İçeriği LicenseManager ile kontrol et
    const licenseResult = LicenseManager.readLicenseFromContent(licenseContent);

    if (!licenseResult.success) {
      console.error(
        `❌ [ERROR]: Yüklenmeye çalışılan lisans geçersiz: ${licenseResult.error}`
      );
      return { success: false, message: licenseResult.error };
    }

    const license = licenseResult.license;

    // 3. Kayıt klasörünü hazırla
    const licensesDir = path.join(app.getPath("userData"), "licenses");
    if (!fs.existsSync(licensesDir)) {
      fs.mkdirSync(licensesDir, { recursive: true });
      console.log("📁 [DEBUG]: Licenses klasörü oluşturuldu.");
    }

    // 4. Dosyayı fiziksel olarak kaydet
    const licenseFilePath = path.join(
      licensesDir,
      `lisans_${license.okul_kodu}.lic`
    );
    fs.writeFileSync(licenseFilePath, licenseContent, "utf8");
    console.log(`💾 [SUCCESS]: Lisans kaydedildi: ${licenseFilePath}`);

    // 🔥 5. MASTER DB'YE OKUL KAYDI EKLE
    console.log("📊 [DEBUG]: Master DB'ye okul kaydı ekleniyor...");
    const masterDB = db.getMasterDB();

    // Okul zaten var mı kontrol et
    const checkStmt = masterDB.prepare(
      "SELECT id FROM okullar WHERE okul_kodu = ? AND durum = 1"
    );
    checkStmt.bind([license.okul_kodu]);
    const mevcutOkul = checkStmt.step();
    checkStmt.free();

    if (!mevcutOkul) {
      // Yeni okul kaydı oluştur
      const baslangic = new Date().toISOString();
      const bitis = new Date(license.gecerlilik).toISOString();
      const dbFileName = `okul_${license.okul_kodu}.db`;

      const insertStmt = masterDB.prepare(`
        INSERT INTO okullar (
          okul_kodu, okul_adi, sifre, veritabani_dosyasi,
          lisans_baslangic, lisans_bitis, durum
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `);

      insertStmt.run([
        license.okul_kodu,
        license.okul_adi || `Okul ${license.okul_kodu}`,
        license.sifre,
        dbFileName,
        baslangic,
        bitis,
      ]);
      insertStmt.free();

      db.saveMasterDB();
      console.log("✅ [SUCCESS]: Master DB'ye okul kaydı eklendi!");
    } else {
      console.log("ℹ️ [INFO]: Okul zaten Master DB'de kayıtlı.");
    }

    // 6. Frontend'e başarılı yanıtı dön
    return {
      success: true,
      message: "Lisans başarıyla yüklendi!",
      okul_kodu: license.okul_kodu,
      okul_adi: license.okul_adi,
    };
  } catch (error) {
    console.error("❌ [ERROR]: Lisans yükleme sırasında hata:", error);
    return { success: false, message: "Yükleme hatası: " + error.message };
  }
});

/**
 * 🚪 ÇIKIŞ VE KULLANICI BİLGİSİ HANDLER'LARI
 */
ipcMain.handle("logout", async () => {
  try {
    console.log("🚪 [DEBUG]: Kullanıcı çıkış yapıyor...");
    const schoolDb = db.getActiveSchoolDB();
    if (schoolDb) db.saveActiveSchoolDB();
    global.activeLicense = null;
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-current-user", async () => {
  return { success: true, data: global.activeLicense || null };
});

/**
 * 🔐 SUPERADMIN ŞİFRE YÖNETİMİ
 */
ipcMain.handle("setup-admin-password", async (event, password) => {
  try {
    console.log("🔐 [DEBUG]: Superadmin şifresi ayarlanıyor...");

    const result = securityManager.setupAdminPassword(password);

    if (result.success) {
      console.log("✅ [SUCCESS]: Superadmin şifresi başarıyla ayarlandı!");
    } else {
      console.error("❌ [ERROR]: Şifre ayarlama hatası:", result.message);
    }

    return result;
  } catch (error) {
    console.error("❌ [ERROR]: setup-admin-password hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("verify-admin-password", async (event, password) => {
  try {
    const isValid = securityManager.verifyAdminPassword(password);
    return { success: true, valid: isValid };
  } catch (error) {
    console.error("❌ [ERROR]: verify-admin-password hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("is-first-setup", async () => {
  try {
    const isFirst = securityManager.isFirstSetup();
    return { success: true, isFirstSetup: isFirst };
  } catch (error) {
    console.error("❌ [ERROR]: is-first-setup hatası:", error);
    return { success: false, message: error.message };
  }
});

// ==========================================
// 🏫 OKUL YÖNETİMİ (TAM LİSTE)
// ==========================================

ipcMain.handle("create-school", async (event, okulBilgileri) => {
  try {
    const result = await db.createSchool(okulBilgileri);
    if (result.success) db.saveMasterDB();
    return result;
  } catch (error) {
    return { success: false, message: "Hata: " + error.message };
  }
});

ipcMain.handle("get-all-schools", async () => {
  try {
    return db.getAllSchools();
  } catch (error) {
    return { success: false, message: "Hata: " + error.message };
  }
});

ipcMain.handle("update-school", async (event, okulId, guncelBilgiler) => {
  try {
    const result = db.updateSchool(okulId, guncelBilgiler);
    if (result.success) db.saveMasterDB();
    return result;
  } catch (error) {
    return { success: false, message: "Hata: " + error.message };
  }
});

ipcMain.handle("delete-school", async (event, okulId) => {
  try {
    const result = db.deleteSchool(okulId);
    if (result.success) db.saveMasterDB();
    return result;
  } catch (error) {
    return { success: false, message: "Hata: " + error.message };
  }
});

ipcMain.handle("renew-license", async (event, okulId, yilSayisi) => {
  try {
    const masterDB = db.getMasterDB();
    const getStmt = masterDB.prepare(
      "SELECT lisans_bitis FROM okullar WHERE id = ?"
    );
    getStmt.bind([parseInt(okulId)]);
    if (!getStmt.step()) {
      getStmt.free();
      return { success: false, message: "Okul bulunamadı!" };
    }

    const row = getStmt.getAsObject();
    getStmt.free();

    let yeniBitis = row.lisans_bitis ? new Date(row.lisans_bitis) : new Date();
    yeniBitis.setFullYear(yeniBitis.getFullYear() + parseInt(yilSayisi));

    const updateStmt = masterDB.prepare(
      "UPDATE okullar SET lisans_bitis = ? WHERE id = ?"
    );
    updateStmt.run([yeniBitis.toISOString(), parseInt(okulId)]);
    updateStmt.free();
    db.saveMasterDB();

    return {
      success: true,
      message: "Lisans yenilendi!",
      yeni_bitis: yeniBitis.toLocaleDateString("tr-TR"),
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-school-password", async (event, okulId) => {
  try {
    const masterDB = db.getMasterDB();
    const stmt = masterDB.prepare("SELECT * FROM okullar WHERE id = ?");
    stmt.bind([parseInt(okulId)]);
    if (!stmt.step()) {
      stmt.free();
      return { success: false, message: "Okul yok" };
    }
    const row = stmt.getAsObject();
    stmt.free();

    const dbPath = path.join(db.veritabaniKlasoru, row.veritabani_dosyasi);
    let adminSifre = "Bilinmiyor";
    if (fs.existsSync(dbPath)) {
      // ... (Şifre okuma mantığı aynı kalacak)
      adminSifre = "Dosya Mevcut";
    }

    return { success: true, data: { ...row, admin_sifre: adminSifre } };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
// ==========================================
// 🔄 ŞİFRE SIFIRLAMA (YENİ!)
// ==========================================

ipcMain.handle("reset-school-password", async (event, okulId, yeniSifre) => {
  try {
    console.log("=".repeat(60));
    console.log("🔄 OKUL ŞİFRESİ SIFIRLANIYOR");
    console.log("📋 Okul ID:", okulId);
    console.log("=".repeat(60));

    const masterDB = db.getMasterDB();
    if (!masterDB) {
      return { success: false, message: "Veritabanı bulunamadı!" };
    }

    const stmt = masterDB.prepare(
      "SELECT okul_kodu, okul_adi, veritabani_dosyasi FROM okullar WHERE id = ?"
    );
    stmt.bind([parseInt(okulId)]);

    if (!stmt.step()) {
      stmt.free();
      return { success: false, message: "Okul bulunamadı!" };
    }

    const row = stmt.getAsObject();
    stmt.free();

    const okulKodu = row.okul_kodu;
    const okulAdi = row.okul_adi;
    const dbFileName = row.veritabani_dosyasi;

    console.log("🏫 Okul:", okulAdi, `(${okulKodu})`);
    console.log("📁 DB Dosyası:", dbFileName);

    const dbPath = path.join(db.veritabaniKlasoru, dbFileName);

    if (!fs.existsSync(dbPath)) {
      return {
        success: false,
        message: "Okul veritabanı dosyası bulunamadı!",
      };
    }

    // ✅ OKUL DB'Yİ AÇ VE ŞİFREYİ HASH'LE
    const initSqlJs = require("sql.js");
    const SQL = await initSqlJs();
    const dbData = fs.readFileSync(dbPath);
    const schoolDB = new SQL.Database(dbData);

    console.log("🔐 Şifre hash'leniyor...");
    const hashedPassword = db.hashUserPassword(yeniSifre);
    console.log(
      "✅ Hash oluşturuldu:",
      hashedPassword.substring(0, 20) + "..."
    );

    const updateStmt = schoolDB.prepare(
      "UPDATE kullanicilar SET sifre = ? WHERE kullanici_adi = 'admin'"
    );
    updateStmt.run([hashedPassword]);
    updateStmt.free();

    // Kaydet
    const newData = schoolDB.export();
    fs.writeFileSync(dbPath, Buffer.from(newData));
    schoolDB.close();

    console.log("✅ Şifre başarıyla güncellendi");
    console.log("=".repeat(60));

    return {
      success: true,
      message: "Şifre başarıyla sıfırlandı!",
      yeni_sifre: yeniSifre,
      okul_adi: okulAdi,
      okul_kodu: okulKodu,
    };
  } catch (error) {
    console.error("❌ Şifre sıfırlama hatası:", error);
    return {
      success: false,
      message: "Şifre sıfırlanamadı: " + error.message,
    };
  }
});

// ==========================================
// 🔍 DEBUG: OKUL ŞİFRELERİNİ KONTROL ET
// ==========================================

ipcMain.handle("debug-get-school-passwords", async () => {
  try {
    const masterDB = db.getMasterDB();

    if (!masterDB) {
      return { success: false, message: "Master DB yok!" };
    }

    const stmt = masterDB.prepare(`
      SELECT id, okul_kodu, okul_adi, sifre
      FROM okullar
      WHERE durum = 1
      ORDER BY okul_kodu
    `);

    const schools = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      schools.push({
        id: row.id,
        okul_kodu: row.okul_kodu,
        okul_adi: row.okul_adi,
        sifre: row.sifre || "❌ BOŞ",
      });
    }
    stmt.free();

    console.log("🔍 === OKUL ŞİFRELERİ (MASTER DB) ===");
    schools.forEach((s) => {
      console.log(`   ${s.okul_kodu}: ${s.sifre}`);
    });

    return { success: true, data: schools };
  } catch (error) {
    console.error("❌ Hata:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Veritabanı ve Okul Yönetimi IPC Handlers yüklendi");

// ==========================================
// 👥 KULLANICI YÖNETİMİ IPC HANDLER'LARI
// ==========================================

// Tüm kullanıcıları listele
ipcMain.handle("get-all-users", async (event) => {
  try {
    console.log("👥 Tüm kullanıcılar getiriliyor...");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif okul veritabanı yok!" };
    }

    const stmt = activeDB.prepare(`
      SELECT 
        id,
        kullanici_adi,
        ad_soyad,
        tc_no,
        email,
        telefon,
        rol,
        durum,
        olusturma_tarihi,
        son_giris
      FROM kullanicilar
      ORDER BY id ASC
    `);

    const users = [];
    while (stmt.step()) {
      users.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${users.length} kullanıcı bulundu`);

    return {
      success: true,
      data: users,
    };
  } catch (error) {
    console.error("❌ Kullanıcı listeleme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Yeni kullanıcı oluştur
ipcMain.handle("create-user", async (event, userData) => {
  try {
    console.log("👤 Yeni kullanıcı oluşturuluyor:", userData.kullanici_adi);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif okul veritabanı yok!" };
    }

    // Kullanıcı adı kontrolü
    const checkStmt = activeDB.prepare(
      "SELECT id FROM kullanicilar WHERE kullanici_adi = ?"
    );
    checkStmt.bind([userData.kullanici_adi]);

    if (checkStmt.step()) {
      checkStmt.free();
      return {
        success: false,
        message: "Bu kullanıcı adı zaten kullanılıyor!",
      };
    }
    checkStmt.free();

    // Şifreyi hash'le
    const hashedPassword = db.hashUserPassword(userData.sifre);

    // Kullanıcı ekle
    const insertStmt = activeDB.prepare(`
      INSERT INTO kullanicilar (
        kullanici_adi, sifre, ad_soyad, tc_no, email, telefon, rol, durum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertStmt.run([
      userData.kullanici_adi,
      hashedPassword,
      userData.ad_soyad,
      userData.tc_no || null,
      userData.email || null,
      userData.telefon || null,
      userData.rol || "kullanici",
    ]);

    const userId = activeDB.exec("SELECT last_insert_rowid() as id")[0]
      .values[0][0];
    insertStmt.free();

    // Veritabanını kaydet
    db.saveActiveSchoolDB();

    console.log("✅ Kullanıcı oluşturuldu, ID:", userId);

    return {
      success: true,
      message: "Kullanıcı başarıyla oluşturuldu!",
      data: { id: userId },
    };
  } catch (error) {
    console.error("❌ Kullanıcı oluşturma hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Kullanıcı güncelle
ipcMain.handle("update-user", async (event, userId, userData) => {
  try {
    console.log("✏️ Kullanıcı güncelleniyor:", userId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif okul veritabanı yok!" };
    }

    // Kullanıcı adı değiştiriliyorsa kontrol et
    if (userData.kullanici_adi) {
      const checkStmt = activeDB.prepare(
        "SELECT id FROM kullanicilar WHERE kullanici_adi = ? AND id != ?"
      );
      checkStmt.bind([userData.kullanici_adi, userId]);

      if (checkStmt.step()) {
        checkStmt.free();
        return {
          success: false,
          message: "Bu kullanıcı adı zaten kullanılıyor!",
        };
      }
      checkStmt.free();
    }

    const updateStmt = activeDB.prepare(`
      UPDATE kullanicilar
      SET ad_soyad = ?, tc_no = ?, email = ?, telefon = ?, rol = ?
      WHERE id = ?
    `);

    updateStmt.run([
      userData.ad_soyad,
      userData.tc_no || null,
      userData.email || null,
      userData.telefon || null,
      userData.rol,
      userId,
    ]);
    updateStmt.free();

    db.saveActiveSchoolDB();

    console.log("✅ Kullanıcı güncellendi");

    return {
      success: true,
      message: "Kullanıcı başarıyla güncellendi!",
    };
  } catch (error) {
    console.error("❌ Kullanıcı güncelleme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Kullanıcı şifre sıfırla
ipcMain.handle("reset-user-password", async (event, userId, yeniSifre) => {
  try {
    console.log("🔄 Kullanıcı şifresi sıfırlanıyor:", userId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif okul veritabanı yok!" };
    }

    const hashedPassword = db.hashUserPassword(yeniSifre);

    const updateStmt = activeDB.prepare(
      "UPDATE kullanicilar SET sifre = ? WHERE id = ?"
    );
    updateStmt.run([hashedPassword, userId]);
    updateStmt.free();

    db.saveActiveSchoolDB();

    console.log("✅ Şifre sıfırlandı");

    return {
      success: true,
      message: "Şifre başarıyla sıfırlandı!",
      yeni_sifre: yeniSifre,
    };
  } catch (error) {
    console.error("❌ Şifre sıfırlama hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Kullanıcı durumu değiştir (aktif/pasif)
ipcMain.handle("toggle-user-status", async (event, userId) => {
  try {
    console.log("🔄 Kullanıcı durumu değiştiriliyor:", userId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif okul veritabanı yok!" };
    }

    // Mevcut durumu al
    const getStmt = activeDB.prepare(
      "SELECT durum FROM kullanicilar WHERE id = ?"
    );
    getStmt.bind([userId]);

    if (!getStmt.step()) {
      getStmt.free();
      return { success: false, message: "Kullanıcı bulunamadı!" };
    }

    const currentStatus = getStmt.getAsObject().durum;
    getStmt.free();

    const newStatus = currentStatus === 1 ? 0 : 1;

    const updateStmt = activeDB.prepare(
      "UPDATE kullanicilar SET durum = ? WHERE id = ?"
    );
    updateStmt.run([newStatus, userId]);
    updateStmt.free();

    db.saveActiveSchoolDB();

    console.log(`✅ Kullanıcı durumu: ${newStatus === 1 ? "Aktif" : "Pasif"}`);

    return {
      success: true,
      message: `Kullanıcı ${
        newStatus === 1 ? "aktifleştirildi" : "pasifleştirildi"
      }!`,
      new_status: newStatus,
    };
  } catch (error) {
    console.error("❌ Durum değiştirme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Kullanıcı sil
ipcMain.handle("delete-user", async (event, userId) => {
  try {
    console.log("🗑️ Kullanıcı siliniyor:", userId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif okul veritabanı yok!" };
    }

    // Admin kullanıcısı silinemez kontrolü
    const checkStmt = activeDB.prepare(
      "SELECT kullanici_adi FROM kullanicilar WHERE id = ?"
    );
    checkStmt.bind([userId]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Kullanıcı bulunamadı!" };
    }

    const user = checkStmt.getAsObject();
    checkStmt.free();

    if (user.kullanici_adi === "admin") {
      return { success: false, message: "Admin kullanıcısı silinemez!" };
    }

    const deleteStmt = activeDB.prepare(
      "DELETE FROM kullanicilar WHERE id = ?"
    );
    deleteStmt.run([userId]);
    deleteStmt.free();

    db.saveActiveSchoolDB();

    console.log("✅ Kullanıcı silindi");

    return {
      success: true,
      message: "Kullanıcı başarıyla silindi!",
    };
  } catch (error) {
    console.error("❌ Kullanıcı silme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

console.log("✅ Kullanıcı Yönetimi IPC Handlers yüklendi");

// ==========================================
// 💾 YEDEKLEME SİSTEMİ IPC HANDLER'LARI
// ==========================================

// Manuel yedek al
ipcMain.handle("create-backup", async (event, backupType = "manuel") => {
  try {
    console.log("💾 Yedekleme başlatılıyor...", backupType);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `backup_${backupType}_${timestamp}.zip`;

    // Yedek klasörünü kontrol et
    const backupDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Yedekler"
    );

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, backupName);

    // Veritabanı klasörü
    const dbDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    // ZIP arşivi oluştur
    const archiver = require("archiver");
    const output = fs.createWriteStream(backupPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on("close", () => {
        const stats = fs.statSync(backupPath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`✅ Yedek oluşturuldu: ${backupName} (${sizeInMB} MB)`);

        resolve({
          success: true,
          message: "Yedek başarıyla oluşturuldu!",
          data: {
            filename: backupName,
            path: backupPath,
            size: stats.size,
            sizeInMB: sizeInMB,
            created_at: new Date().toISOString(),
            type: backupType,
          },
        });
      });

      archive.on("error", (err) => {
        console.error("❌ Yedekleme hatası:", err);
        reject({
          success: false,
          message: "Yedekleme sırasında hata oluştu: " + err.message,
        });
      });

      archive.pipe(output);

      // Tüm veritabanı dosyalarını ekle
      archive.directory(dbDir, "Veritabani");

      archive.finalize();
    });
  } catch (error) {
    console.error("❌ Yedekleme hatası:", error);
    return {
      success: false,
      message: "Yedekleme sırasında hata oluştu: " + error.message,
    };
  }
});

// Tüm yedekleri listele
ipcMain.handle("get-all-backups", async () => {
  try {
    console.log("📋 Yedekler listeleniyor...");

    const backupDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Yedekler"
    );

    if (!fs.existsSync(backupDir)) {
      return { success: true, data: [] };
    }

    const files = fs.readdirSync(backupDir);
    const backups = [];

    for (const file of files) {
      if (file.endsWith(".zip") || file.endsWith(".db")) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);

        // Dosya adından tipi çıkar
        let type = "manuel";
        if (file.includes("_otomatik_")) type = "otomatik";
        else if (file.includes("_gunluk_")) type = "günlük";
        else if (file.includes("_haftalik_")) type = "haftalık";
        else if (file.includes("_aylik_")) type = "aylık";

        backups.push({
          filename: file,
          path: filePath,
          size: stats.size,
          sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
          created_at: stats.birthtime.toISOString(),
          type: type,
        });
      }
    }

    // Tarihe göre sırala (en yeni önce)
    backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`✅ ${backups.length} yedek bulundu`);

    return {
      success: true,
      data: backups,
    };
  } catch (error) {
    console.error("❌ Yedek listeleme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Yedek geri yükle
ipcMain.handle("restore-backup", async (event, backupPath) => {
  try {
    console.log("📥 Yedek geri yükleniyor:", backupPath);

    if (!fs.existsSync(backupPath)) {
      return { success: false, message: "Yedek dosyası bulunamadı!" };
    }

    const dbDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    // Mevcut veritabanını yedekle
    const tempBackup = path.join(
      dbDir,
      "..",
      "Yedekler",
      `temp_before_restore_${Date.now()}.zip`
    );

    const archiver = require("archiver");
    const output = fs.createWriteStream(tempBackup);
    const archive = archiver("zip", { zlib: { level: 9 } });

    await new Promise((resolve) => {
      output.on("close", resolve);
      archive.pipe(output);
      archive.directory(dbDir, "Veritabani");
      archive.finalize();
    });

    console.log("✅ Mevcut veritabanı yedeklendi");

    // ZIP'i aç
    const extract = require("extract-zip");
    const tempExtractDir = path.join(dbDir, "..", "temp_restore");

    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }

    await extract(backupPath, { dir: tempExtractDir });

    // Veritabanı dosyalarını kopyala
    const extractedDbDir = path.join(tempExtractDir, "Veritabani");

    if (fs.existsSync(extractedDbDir)) {
      const files = fs.readdirSync(extractedDbDir);

      for (const file of files) {
        const srcPath = path.join(extractedDbDir, file);
        const destPath = path.join(dbDir, file);

        fs.copyFileSync(srcPath, destPath);
      }
    }

    // Geçici klasörü temizle
    fs.rmSync(tempExtractDir, { recursive: true, force: true });

    console.log("✅ Yedek geri yüklendi");

    return {
      success: true,
      message: "Yedek başarıyla geri yüklendi! Programı yeniden başlatın.",
    };
  } catch (error) {
    console.error("❌ Yedek geri yükleme hatası:", error);
    return {
      success: false,
      message: "Geri yükleme sırasında hata oluştu: " + error.message,
    };
  }
});

// Yedek sil
ipcMain.handle("delete-backup", async (event, backupPath) => {
  try {
    console.log("🗑️ Yedek siliniyor:", backupPath);

    if (!fs.existsSync(backupPath)) {
      return { success: false, message: "Yedek dosyası bulunamadı!" };
    }

    fs.unlinkSync(backupPath);

    console.log("✅ Yedek silindi");

    return {
      success: true,
      message: "Yedek başarıyla silindi!",
    };
  } catch (error) {
    console.error("❌ Yedek silme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Yedek indir (klasörü aç)
ipcMain.handle("open-backup-folder", async () => {
  try {
    const backupDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Yedekler"
    );

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const { shell } = require("electron");
    shell.openPath(backupDir);

    return { success: true };
  } catch (error) {
    console.error("❌ Klasör açma hatası:", error);
    return { success: false, message: error.message };
  }
});

// Otomatik yedekleme ayarlarını kaydet
ipcMain.handle("save-backup-settings", async (event, settings) => {
  try {
    const settingsPath = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "backup-settings.json"
    );

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    console.log("✅ Yedekleme ayarları kaydedildi");

    return {
      success: true,
      message: "Ayarlar başarıyla kaydedildi!",
    };
  } catch (error) {
    console.error("❌ Ayar kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Otomatik yedekleme ayarlarını yükle
ipcMain.handle("load-backup-settings", async () => {
  try {
    const settingsPath = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "backup-settings.json"
    );

    if (!fs.existsSync(settingsPath)) {
      // Varsayılan ayarlar
      return {
        success: true,
        data: {
          enabled: false,
          frequency: "gunluk",
          time: "02:00",
          keepDays: 30,
        },
      };
    }

    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error("❌ Ayar yükleme hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Yedekleme Sistemi IPC Handlers yüklendi");

// ==========================================
// ❤️ SİSTEM SAĞLIĞI IPC HANDLER'LARI
// ==========================================

const si = require("systeminformation"); // ✅ SADECE BU

// Sistem bilgilerini al
ipcMain.handle("get-system-health", async () => {
  try {
    console.log("❤️ Sistem sağlık bilgileri alınıyor...");

    // CPU Bilgisi
    const cpuLoad = await si.currentLoad();
    const cpuTemp = await si.cpuTemperature();

    // RAM Bilgisi
    const mem = await si.mem();

    // Disk Bilgisi
    const fsSize = await si.fsSize();
    const mainDisk = fsSize[0];

    // Sistem Uptime
    const uptimeSeconds = os.uptime();

    // Veritabanı boyutu
    const dbDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    let dbSize = 0;
    if (fs.existsSync(dbDir)) {
      const files = fs.readdirSync(dbDir);
      for (const file of files) {
        const filePath = path.join(dbDir, file);
        const stats = fs.statSync(filePath);
        dbSize += stats.size;
      }
    }

    // Aktif okul sayısı
    const masterDB = db.getMasterDB();
    let activeSchools = 0;
    if (masterDB) {
      const stmt = masterDB.prepare(
        "SELECT COUNT(*) as count FROM okullar WHERE durum = 1"
      );
      stmt.bind([]);
      if (stmt.step()) {
        activeSchools = stmt.getAsObject().count;
      }
      stmt.free();
    }

    // Son yedek tarihi
    const backupDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Yedekler"
    );

    let lastBackup = null;
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      const backups = files
        .filter((f) => f.endsWith(".zip"))
        .map((f) => {
          const filePath = path.join(backupDir, f);
          return {
            name: f,
            time: fs.statSync(filePath).birthtime,
          };
        })
        .sort((a, b) => b.time - a.time);

      if (backups.length > 0) {
        lastBackup = backups[0].time.toISOString();
      }
    }

    const data = {
      cpu: {
        usage: parseFloat(cpuLoad.currentLoad.toFixed(2)),
        temp: cpuTemp.main || 0,
        cores: os.cpus().length,
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usagePercent: parseFloat(((mem.used / mem.total) * 100).toFixed(2)),
      },
      disk: {
        total: mainDisk.size,
        used: mainDisk.used,
        free: mainDisk.available,
        usagePercent: parseFloat(mainDisk.use.toFixed(2)),
      },
      database: {
        size: dbSize,
        sizeInMB: (dbSize / (1024 * 1024)).toFixed(2),
      },
      system: {
        platform: os.platform(),
        hostname: os.hostname(),
        uptime: uptimeSeconds,
        activeSchools: activeSchools,
        lastBackup: lastBackup,
      },
    };

    console.log("✅ Sistem sağlık bilgileri alındı");

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("❌ Sistem sağlık bilgisi hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Süreç bilgilerini al
ipcMain.handle("get-process-info", async () => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      success: true,
      data: {
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        uptime: process.uptime(),
        pid: process.pid,
      },
    };
  } catch (error) {
    console.error("❌ Süreç bilgisi hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

console.log("✅ Sistem Sağlığı IPC Handlers yüklendi");

// ==========================================
// 📜 LOG GÖRÜNTÜLEYİCİ IPC HANDLER'LARI
// ==========================================

// Tüm logları al
ipcMain.handle("get-all-logs", async (event, options = {}) => {
  try {
    console.log("📜 Loglar getiriliyor...");

    const logDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Logs"
    );

    const logFile = path.join(logDir, "app.log");

    if (!fs.existsSync(logFile)) {
      return { success: true, data: [] };
    }

    // Log dosyasını oku
    const content = fs.readFileSync(logFile, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    const logs = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // En yeni üstte

    // Filtreleme
    let filteredLogs = logs;

    // Seviye filtresi
    if (options.level && options.level !== "all") {
      filteredLogs = filteredLogs.filter((log) => log.level === options.level);
    }

    // Tarih filtresi
    if (options.startDate) {
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.timestamp) >= new Date(options.startDate)
      );
    }

    if (options.endDate) {
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.timestamp) <= new Date(options.endDate)
      );
    }

    // Arama
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          (log.meta &&
            JSON.stringify(log.meta).toLowerCase().includes(searchLower))
      );
    }

    // Limit
    const limit = options.limit || 100;
    filteredLogs = filteredLogs.slice(0, limit);

    console.log(`✅ ${filteredLogs.length} log bulundu`);

    return {
      success: true,
      data: filteredLogs,
      total: logs.length,
    };
  } catch (error) {
    console.error("❌ Log getirme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Hata loglarını al
ipcMain.handle("get-error-logs", async () => {
  try {
    const logDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Logs"
    );

    const errorFile = path.join(logDir, "error.log");

    if (!fs.existsSync(errorFile)) {
      return { success: true, data: [] };
    }

    const content = fs.readFileSync(errorFile, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    const logs = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    return {
      success: true,
      data: logs.slice(0, 100),
    };
  } catch (error) {
    console.error("❌ Hata log getirme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Log ekle
ipcMain.handle("add-log", async (event, logData) => {
  try {
    const { level, message, meta } = logData;

    logger.log({
      level: level || "info",
      message: message,
      meta: meta || {},
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Log ekleme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Logları temizle
ipcMain.handle("clear-logs", async (event, type = "all") => {
  try {
    console.log("🗑️ Loglar temizleniyor:", type);

    const logDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Logs"
    );

    if (type === "all" || type === "app") {
      const appLog = path.join(logDir, "app.log");
      if (fs.existsSync(appLog)) {
        fs.writeFileSync(appLog, "");
      }
    }

    if (type === "all" || type === "error") {
      const errorLog = path.join(logDir, "error.log");
      if (fs.existsSync(errorLog)) {
        fs.writeFileSync(errorLog, "");
      }
    }

    console.log("✅ Loglar temizlendi");

    return {
      success: true,
      message: "Loglar başarıyla temizlendi!",
    };
  } catch (error) {
    console.error("❌ Log temizleme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Log dosyasını export et
ipcMain.handle("export-logs", async (event, format = "txt") => {
  try {
    const logDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Logs"
    );

    const logFile = path.join(logDir, "app.log");

    if (!fs.existsSync(logFile)) {
      return { success: false, message: "Log dosyası bulunamadı!" };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const exportName = `logs_${timestamp}.${format}`;
    const exportPath = path.join(logDir, exportName);

    if (format === "json") {
      const content = fs.readFileSync(logFile, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      const logs = lines.map((line) => JSON.parse(line));

      fs.writeFileSync(exportPath, JSON.stringify(logs, null, 2));
    } else {
      // TXT
      fs.copyFileSync(logFile, exportPath);
    }

    console.log("✅ Log export edildi:", exportName);

    return {
      success: true,
      message: "Log başarıyla export edildi!",
      path: exportPath,
    };
  } catch (error) {
    console.error("❌ Log export hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Log klasörünü aç
ipcMain.handle("open-log-folder", async () => {
  try {
    const logDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Logs"
    );

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const { shell } = require("electron");
    shell.openPath(logDir);

    return { success: true };
  } catch (error) {
    console.error("❌ Klasör açma hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Log Görüntüleyici IPC Handlers yüklendi");

// ==========================================
// 💰 SADECE ÖDEME VE TAHSİLAT TAKİBİ
// ==========================================

ipcMain.handle("save-payment", async (event, okulId, odemeBilgisi) => {
  try {
    console.log("💰 Yeni ödeme kaydı alınıyor. Okul ID:", okulId);
    const masterDB = db.getMasterDB();

    // 1. Tahsilat tablosu yoksa oluştur (Güvenlik önlemi)
    masterDB.run(`
      CREATE TABLE IF NOT EXISTS tahsilatlar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        okul_id INTEGER,
        tutar REAL,
        odeme_yontemi TEXT,
        odeme_tarihi TEXT,
        aciklama TEXT
      )
    `);

    // 2. Ödemeyi kaydet
    const stmt = masterDB.prepare(
      "INSERT INTO tahsilatlar (okul_id, tutar, odeme_yontemi, odeme_tarihi, aciklama) VALUES (?, ?, ?, ?, ?)"
    );

    stmt.run([
      parseInt(okulId),
      parseFloat(odemeBilgisi.tutar),
      odemeBilgisi.yontem || "Nakit",
      new Date().toISOString(),
      odemeBilgisi.aciklama || "Yıllık Bakım/Ödeme",
    ]);
    stmt.free();

    db.saveMasterDB();
    console.log("✅ Ödeme başarıyla veritabanına işlendi.");

    return { success: true, message: "Ödeme kaydı oluşturuldu." };
  } catch (error) {
    console.error("❌ Ödeme kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Geçmişi getirme handler'ı aynı kalabilir
ipcMain.handle("get-school-payments", async (event, okulId) => {
  try {
    const masterDB = db.getMasterDB();
    const stmt = masterDB.prepare(
      "SELECT * FROM tahsilatlar WHERE okul_id = ? ORDER BY odeme_tarihi DESC"
    );
    stmt.bind([parseInt(okulId)]);
    const payments = [];
    while (stmt.step()) {
      payments.push(stmt.getAsObject());
    }
    stmt.free();
    return { success: true, data: payments };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// ==========================================
// 👨‍🏫 ÖĞRETMEN YÖNETİMİ IPC HANDLER'LARI
// ==========================================

ipcMain.handle("create-teacher", async (event, ogretmenBilgileri) => {
  try {
    console.log("👨‍🏫 Yeni öğretmen ekleme isteği");

    if (
      !ogretmenBilgileri.tc_no ||
      !ogretmenBilgileri.ad_soyad ||
      !ogretmenBilgileri.cinsiyet ||
      !ogretmenBilgileri.unvan ||
      !ogretmenBilgileri.kariyer ||
      !ogretmenBilgileri.gorev
    ) {
      return {
        success: false,
        message: "Zorunlu alanları doldurunuz!",
      };
    }

    const result = await db.createTeacher(ogretmenBilgileri);
    return result;
  } catch (error) {
    console.error("❌ Öğretmen ekleme handler hatası:", error);
    return {
      success: false,
      message: "Öğretmen eklenirken bir hata oluştu!",
    };
  }
});

ipcMain.handle("get-all-teachers", async () => {
  try {
    console.log("📋 Öğretmen listesi isteği");

    const result = db.getAllTeachers();
    return result;
  } catch (error) {
    console.error("❌ Öğretmen listesi handler hatası:", error);
    return {
      success: false,
      message: "Öğretmen listesi alınırken hata oluştu!",
      data: [],
    };
  }
});

ipcMain.handle("update-teacher", async (event, ogretmenId, guncelBilgiler) => {
  try {
    console.log("✏️ Öğretmen güncelleme isteği:", ogretmenId);

    const result = db.updateTeacher(ogretmenId, guncelBilgiler);
    return result;
  } catch (error) {
    console.error("❌ Öğretmen güncelleme handler hatası:", error);
    return {
      success: false,
      message: "Güncelleme sırasında hata oluştu: " + error.message,
    };
  }
});

ipcMain.handle("delete-teacher", async (event, ogretmenId) => {
  try {
    console.log("🗑️ Öğretmen silme isteği:", ogretmenId);

    const result = db.deleteTeacher(ogretmenId);
    return result;
  } catch (error) {
    console.error("❌ Öğretmen silme handler hatası:", error);
    return {
      success: false,
      message: "Silme sırasında hata oluştu: " + error.message,
    };
  }
});

ipcMain.handle("get-teacher-password", async (event, ogretmenId) => {
  try {
    console.log("🔑 Öğretmen şifre görüntüleme isteği:", ogretmenId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare(`
      SELECT o.tc_no, o.ad_soyad, k.sifre 
      FROM ogretmenler o
      LEFT JOIN kullanicilar k ON o.kullanici_id = k.id
      WHERE o.id = ?
    `);
    stmt.bind([parseInt(ogretmenId)]);

    if (!stmt.step()) {
      stmt.free();
      return { success: false, message: "Öğretmen bulunamadı!" };
    }

    const row = stmt.getAsObject();
    stmt.free();

    console.log("✅ Öğretmen şifresi alındı");

    return {
      success: true,
      data: {
        tc_no: row.tc_no,
        ad_soyad: row.ad_soyad,
        sifre: row.sifre || "Şifre bulunamadı",
      },
    };
  } catch (error) {
    console.error("❌ Öğretmen şifre görüntüleme hatası:", error);
    return {
      success: false,
      message: "Şifre görüntülenemedi: " + error.message,
    };
  }
});

ipcMain.handle("reset-teacher-password", async (event, ogretmenId) => {
  try {
    console.log("🔑 Öğretmen şifre sıfırlama isteği:", ogretmenId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const getStmt = activeDB.prepare(
      "SELECT kullanici_id FROM ogretmenler WHERE id = ?"
    );
    getStmt.bind([parseInt(ogretmenId)]);

    if (!getStmt.step()) {
      getStmt.free();
      return { success: false, message: "Öğretmen bulunamadı!" };
    }

    const row = getStmt.getAsObject();
    const kullaniciId = row.kullanici_id;
    getStmt.free();

    const yeniSifre = generateRandomPassword();

    const updateStmt = activeDB.prepare(
      "UPDATE kullanicilar SET sifre = ? WHERE id = ?"
    );
    updateStmt.run([yeniSifre, kullaniciId]);
    updateStmt.free();

    db.saveActiveSchoolDB();

    console.log("✅ Şifre sıfırlandı:", yeniSifre);

    return {
      success: true,
      message: "Şifre başarıyla sıfırlandı!",
      yeni_sifre: yeniSifre,
    };
  } catch (error) {
    console.error("❌ Şifre sıfırlama hatası:", error);
    return {
      success: false,
      message: "Şifre sıfırlanamadı: " + error.message,
    };
  }
});

ipcMain.handle("get-teacher-details", async (event, ogretmenId) => {
  try {
    console.log("🔍 Öğretmen detay isteği:", ogretmenId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare("SELECT * FROM ogretmenler WHERE id = ?");
    stmt.bind([parseInt(ogretmenId)]);

    if (!stmt.step()) {
      stmt.free();
      return { success: false, message: "Öğretmen bulunamadı!" };
    }

    const teacher = stmt.getAsObject();
    stmt.free();

    return { success: true, data: teacher };
  } catch (error) {
    console.error("❌ Öğretmen detay hatası:", error);
    return {
      success: false,
      message: "Öğrenci bilgileri alınamadı: " + error.message,
    };
  }
});

function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";

  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

console.log("✅ Öğretmen IPC Handler'ları yüklendi");

// ==========================================
// 👨‍🎓 ÖĞRENCİ YÖNETİMİ IPC HANDLER'LARI
// ==========================================

ipcMain.handle("create-student", async (event, ogrenciBilgileri) => {
  try {
    console.log("👨‍🎓 Yeni öğrenci ekleme isteği");

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

    const result = await db.createStudent(ogrenciBilgileri);
    return result;
  } catch (error) {
    console.error("❌ Öğrenci ekleme handler hatası:", error);
    return {
      success: false,
      message: "Öğrenci eklenirken bir hata oluştu!",
    };
  }
});

ipcMain.handle("get-all-students", async (event, kullaniciRol, ogretmenId) => {
  try {
    console.log("📋 Öğrenci listesi isteği - Rol:", kullaniciRol);

    const result = db.getAllStudents();

    if (!result.success) {
      return result;
    }

    // Eğer öğretmen ise, sadece kendi sınıflarını getir
    if (kullaniciRol === "ogretmen" && ogretmenId) {
      const activeDB = db.getActiveSchoolDB();
      const siniflarStmt = activeDB.prepare(`
        SELECT DISTINCT sinif_id 
        FROM ders_programi 
        WHERE ogretmen_id = ? AND ders_id IN (
          SELECT id FROM dersler WHERE ders_adi LIKE '%Rehberlik%'
        )
      `);
      siniflarStmt.bind([ogretmenId]);

      const sinifIds = [];
      while (siniflarStmt.step()) {
        sinifIds.push(siniflarStmt.getAsObject().sinif_id);
      }
      siniflarStmt.free();

      const filteredStudents = result.data.filter((ogrenci) =>
        sinifIds.includes(ogrenci.sinif_id)
      );

      console.log(
        `✅ Öğretmen için ${filteredStudents.length} öğrenci filtrelendi`
      );

      return { success: true, data: filteredStudents };
    }

    return result;
  } catch (error) {
    console.error("❌ Öğrenci listesi handler hatası:", error);
    return {
      success: false,
      message: "Öğrenci listesi alınırken hata oluştu!",
    };
  }
});

ipcMain.handle(
  "update-student",
  async (event, ogrenciId, guncelBilgiler, kullaniciRol, ogretmenId) => {
    try {
      console.log("✏️ Öğrenci güncelleme isteği:", ogrenciId);

      // Öğretmen ise yetki kontrolü
      if (kullaniciRol === "ogretmen" && ogretmenId) {
        const activeDB = db.getActiveSchoolDB();

        const ogrenciStmt = activeDB.prepare(
          "SELECT sinif_id FROM ogrenciler WHERE id = ?"
        );
        ogrenciStmt.bind([parseInt(ogrenciId)]);

        if (!ogrenciStmt.step()) {
          ogrenciStmt.free();
          return { success: false, message: "Öğrenci bulunamadı!" };
        }

        const ogrenciSinifId = ogrenciStmt.getAsObject().sinif_id;
        ogrenciStmt.free();

        const yetkiStmt = activeDB.prepare(`
        SELECT COUNT(*) as sayi
        FROM ders_programi 
        WHERE ogretmen_id = ? 
          AND sinif_id = ? 
          AND ders_id IN (SELECT id FROM dersler WHERE ders_adi LIKE '%Rehberlik%')
      `);
        yetkiStmt.bind([ogretmenId, ogrenciSinifId]);

        let yetkiVar = false;
        if (yetkiStmt.step()) {
          yetkiVar = yetkiStmt.getAsObject().sayi > 0;
        }
        yetkiStmt.free();

        if (!yetkiVar) {
          return {
            success: false,
            message:
              "Bu öğrenciyi güncelleme yetkiniz yok! Sadece Rehberlik dersi verdiğiniz sınıfların öğrencilerini güncelleyebilirsiniz.",
          };
        }
      }

      const result = db.updateStudent(ogrenciId, guncelBilgiler);
      return result;
    } catch (error) {
      console.error("❌ Öğrenci güncelleme handler hatası:", error);
      return {
        success: false,
        message: "Güncelleme sırasında hata oluştu: " + error.message,
      };
    }
  }
);

ipcMain.handle("delete-student", async (event, ogrenciId, kullaniciRol) => {
  try {
    console.log("🗑️ Öğrenci silme isteği:", ogrenciId);

    if (kullaniciRol !== "okul_admin") {
      return {
        success: false,
        message: "Öğrenci silme yetkiniz yok! Sadece admin silebilir.",
      };
    }

    const result = db.deleteStudent(ogrenciId);
    return result;
  } catch (error) {
    console.error("❌ Öğrenci silme handler hatası:", error);
    return {
      success: false,
      message: "Silme sırasında hata oluştu: " + error.message,
    };
  }
});

ipcMain.handle("import-students-from-excel", async (event, excelData) => {
  try {
    console.log("📥 Excel'den öğrenci içe aktarma isteği");

    const result = await db.importStudentsFromExcel(excelData);
    return result;
  } catch (error) {
    console.error("❌ Öğrenci içe aktarma hatası:", error);
    return {
      success: false,
      message: "İçe aktarma sırasında hata oluştu: " + error.message,
    };
  }
});

ipcMain.handle("get-student-details", async (event, ogrenciId) => {
  try {
    console.log("🔍 Öğrenci detay isteği:", ogrenciId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare("SELECT * FROM ogrenciler WHERE id = ?");
    stmt.bind([parseInt(ogrenciId)]);

    if (!stmt.step()) {
      stmt.free();
      return { success: false, message: "Öğrenci bulunamadı!" };
    }

    const student = stmt.getAsObject();
    stmt.free();

    return { success: true, data: student };
  } catch (error) {
    console.error("❌ Öğrenci detay hatası:", error);
    return {
      success: false,
      message: "Öğrenci bilgileri alınamadı: " + error.message,
    };
  }
});

ipcMain.handle("get-students", async () => {
  try {
    const schoolDB = db.getActiveSchoolDB();

    if (!schoolDB) {
      return { success: false, message: "Okul seçili değil!" };
    }

    const stmt = schoolDB.prepare("SELECT * FROM ogrenciler WHERE durum = 1");
    const students = [];

    while (stmt.step()) {
      students.push(stmt.getAsObject());
    }

    stmt.free();

    return { success: true, data: students };
  } catch (error) {
    console.error("❌ Öğrenci listeleme hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-student-by-id", async (event, id) => {
  try {
    const schoolDB = db.getActiveSchoolDB();
    if (!schoolDB) {
      return { success: false, message: "Aktif okul yok!" };
    }

    const stmt = schoolDB.prepare("SELECT * FROM ogrenciler WHERE id = ?");
    stmt.bind([id]);

    if (stmt.step()) {
      const ogrenci = stmt.getAsObject();
      stmt.free();
      return { success: true, data: ogrenci };
    }

    stmt.free();
    return { success: false, message: "Öğrenci bulunamadı!" };
  } catch (error) {
    console.error("❌ Öğrenci getirme hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("delete-all-students", async () => {
  try {
    const schoolDB = db.getActiveSchoolDB();
    if (!schoolDB) {
      return { success: false, message: "Aktif okul yok!" };
    }

    schoolDB.run("DELETE FROM ogrenciler");
    db.saveActiveSchoolDB();

    console.log("✅ Tüm öğrenciler silindi");
    return { success: true, message: "Tüm öğrenciler silindi!" };
  } catch (error) {
    console.error("❌ Silme hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-all-students-including-inactive", async () => {
  try {
    const schoolDB = db.getActiveSchoolDB();
    const stmt = schoolDB.prepare("SELECT * FROM ogrenciler");
    const students = [];
    while (stmt.step()) {
      students.push(stmt.getAsObject());
    }
    stmt.free();
    return { success: true, data: students };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

console.log("✅ Öğrenci IPC Handler'ları yüklendi");

// ==========================================
// 🏫 SINIF YÖNETİMİ IPC HANDLER'LARI
// ==========================================

ipcMain.handle("get-all-classes", async () => {
  try {
    console.log("📋 Sınıf listesi istendi");

    const result = db.getAllClasses();

    if (result.success) {
      console.log(`✅ ${result.data.length} sınıf bulundu`);
    }

    return result;
  } catch (error) {
    console.error("❌ Sınıf listesi hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

ipcMain.handle("create-class", async (event, sinifBilgileri) => {
  try {
    console.log("🆕 Yeni sınıf ekleme isteği");

    const result = await db.createClass(sinifBilgileri);

    if (result.success) {
      console.log("✅ Sınıf eklendi:", result.data.sinif_adi);
    }

    return result;
  } catch (error) {
    console.error("❌ Sınıf ekleme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

ipcMain.handle("update-class", async (event, sinifId, guncelBilgiler) => {
  try {
    console.log("✏️ Sınıf güncelleme isteği:", sinifId);

    const result = db.updateClass(sinifId, guncelBilgiler);

    if (result.success) {
      console.log("✅ Sınıf güncellendi:", sinifId);
    }

    return result;
  } catch (error) {
    console.error("❌ Sınıf güncelleme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

ipcMain.handle("delete-class", async (event, sinifId) => {
  try {
    console.log("🗑️ Sınıf silme isteği:", sinifId);

    const result = db.deleteClass(sinifId);

    if (result.success) {
      console.log("✅ Sınıf silindi:", sinifId);
    }

    return result;
  } catch (error) {
    console.error("❌ Sınıf silme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

ipcMain.handle("get-stats-for-class", async (event, sinifAdi) => {
  try {
    console.log(`📊 ${sinifAdi} sınıfı için istatistikler istendi`);

    const result = db.getStatsForClass(sinifAdi);
    return result;
  } catch (error) {
    console.error("❌ Sınıf istatistikleri alınamadı:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

console.log("✅ Sınıf IPC Handler'ları yüklendi");
// ==========================================
// 📚 DERSLER - IPC HANDLERS
// ==========================================

ipcMain.handle("get-all-dersler", async () => {
  try {
    console.log("📚 Tüm dersler getiriliyor...");

    const result = db.getAllDersler();
    return result;
  } catch (error) {
    console.error("❌ Dersler getirme hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("add-ders", async (event, dersData) => {
  try {
    console.log("🆕 Yeni ders ekleniyor:", dersData);

    const result = db.addDers(dersData);
    return result;
  } catch (error) {
    console.error("❌ Ders ekleme hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("update-ders", async (event, dersData) => {
  try {
    console.log("✏️ Ders güncelleniyor:", dersData);

    const result = db.updateDers(dersData);
    return result;
  } catch (error) {
    console.error("❌ Ders güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("delete-ders", async (event, dersId) => {
  try {
    console.log("🗑️ Ders siliniyor:", dersId);

    const result = db.deleteDers(dersId);
    return result;
  } catch (error) {
    console.error("❌ Ders silme hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-all-dersler-with-blocks", async () => {
  try {
    console.log("📚 IPC: get-all-dersler-with-blocks çağrıldı");

    const result = db.getAllDerslerWithBlocks();
    return result;
  } catch (error) {
    console.error("❌ get-all-dersler-with-blocks hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Dersler IPC handlers yüklendi");

// ==========================================
// 📅 DERS PROGRAMI - IPC HANDLERS
// ==========================================

ipcMain.handle(
  "create-ders-program",
  async (event, programBilgileri, hucreVerileri) => {
    try {
      console.log("📅 IPC: create-ders-program çağrıldı");

      // Eğer hücre verisi yoksa basit oluştur
      if (!hucreVerileri || hucreVerileri.length === 0) {
        console.log("🔄 Basit program oluşturma moduna geçiliyor...");
        const result = await db.createDersProgramBasit(programBilgileri);
        return result;
      }

      const result = await db.createDersProgram(
        programBilgileri,
        hucreVerileri
      );
      return result;
    } catch (error) {
      console.error("❌ create-ders-program hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("get-ders-program", async (event, programId) => {
  try {
    console.log("📋 IPC: get-ders-program çağrıldı, ID:", programId);

    const result = db.getDersProgram(programId);
    return result;
  } catch (error) {
    console.error("❌ get-ders-program hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-ders-program-by-sinif", async (event, sinifId) => {
  try {
    console.log(
      "📋 IPC: get-ders-program-by-sinif çağrıldı, Sınıf ID:",
      sinifId
    );

    const result = db.getDersProgramBySinif(sinifId);
    return result;
  } catch (error) {
    console.error("❌ get-ders-program-by-sinif hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-all-ders-programlari", async (event, sadeceDurumAktif) => {
  try {
    console.log("📋 IPC: get-all-ders-programlari çağrıldı");

    const result = db.getAllDersProgramlari(sadeceDurumAktif);
    return result;
  } catch (error) {
    console.error("❌ get-all-ders-programlari hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "update-ders-program",
  async (event, programId, guncelBilgiler, yeniHucreler) => {
    try {
      console.log("✏️ IPC: update-ders-program çağrıldı, ID:", programId);

      const result = await db.updateDersProgram(
        programId,
        guncelBilgiler,
        yeniHucreler
      );
      return result;
    } catch (error) {
      console.error("❌ update-ders-program hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("delete-ders-program", async (event, programId) => {
  try {
    console.log("🗑️ IPC: delete-ders-program çağrıldı, ID:", programId);

    const result = db.deleteDersProgram(programId);
    return result;
  } catch (error) {
    console.error("❌ delete-ders-program hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("restore-ders-program", async (event, programId) => {
  try {
    console.log("♻️ IPC: restore-ders-program çağrıldı, ID:", programId);

    const result = db.restoreDersProgram(programId);
    return result;
  } catch (error) {
    console.error("❌ restore-ders-program hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("hard-delete-ders-program", async (event, programId) => {
  try {
    console.log("💥 IPC: hard-delete-ders-program çağrıldı, ID:", programId);

    const result = db.hardDeleteDersProgram(programId);
    return result;
  } catch (error) {
    console.error("❌ hard-delete-ders-program hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "check-cakisma",
  async (event, ogretmenId, gun, saat, haricProgramId) => {
    try {
      console.log("🔍 IPC: check-cakisma çağrıldı");

      const result = db.checkCakisma(ogretmenId, gun, saat, haricProgramId);
      return result;
    } catch (error) {
      console.error("❌ check-cakisma hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("get-all-teachers-with-load", async (event, programId) => {
  try {
    console.log("👨‍🏫 IPC: get-all-teachers-with-load çağrıldı");

    const result = db.getAllTeachersWithLoad(programId);
    return result;
  } catch (error) {
    console.error("❌ get-all-teachers-with-load hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-all-classes-with-load", async () => {
  try {
    console.log("🏛️ IPC: get-all-classes-with-load çağrıldı");

    const result = db.getAllClassesWithLoad();
    return result;
  } catch (error) {
    console.error("❌ get-all-classes-with-load hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "get-program-dashboard-data",
  async (event, programId, sinifId) => {
    try {
      console.log("📊 IPC: get-program-dashboard-data çağrıldı");

      const result = db.getProgramDashboardData(programId, sinifId);
      return result;
    } catch (error) {
      console.error("❌ get-program-dashboard-data hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle(
  "parse-blok-bilgisi",
  async (event, blokString, haftalikSaat) => {
    try {
      console.log("🧩 IPC: parse-blok-bilgisi çağrıldı");

      const result = db.parseBlokBilgisi(blokString, haftalikSaat);
      return result;
    } catch (error) {
      console.error("❌ parse-blok-bilgisi hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

console.log("✅ Ders Programı IPC handlers yüklendi");

// ==========================================
// 🎯 KISITLAR - IPC HANDLERS
// ==========================================

ipcMain.handle("save-genel-kisitlar", async (event, programId, kisitlar) => {
  try {
    console.log("🎯 IPC: save-genel-kisitlar çağrıldı");

    const result = await db.saveGenelKisitlar(programId, kisitlar);
    return result;
  } catch (error) {
    console.error("❌ save-genel-kisitlar hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "save-ogretmen-kisit",
  async (event, programId, ogretmenId, kisitlar) => {
    try {
      console.log("👨‍🏫 IPC: save-ogretmen-kisit çağrıldı");

      const result = await db.saveOgretmenKisit(
        programId,
        ogretmenId,
        kisitlar
      );
      return result;
    } catch (error) {
      console.error("❌ save-ogretmen-kisit hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("get-kisitlar", async (event, programId) => {
  try {
    console.log("📋 IPC: get-kisitlar çağrıldı");

    const result = db.getKisitlar(programId);
    return result;
  } catch (error) {
    console.error("❌ get-kisitlar hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "delete-ogretmen-kisit",
  async (event, programId, ogretmenId) => {
    try {
      console.log("🗑️ IPC: delete-ogretmen-kisit çağrıldı");

      const result = db.deleteOgretmenKisit(programId, ogretmenId);
      return result;
    } catch (error) {
      console.error("❌ delete-ogretmen-kisit hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("get-default-kisitlar", async () => {
  try {
    console.log("⚙️ IPC: get-default-kisitlar çağrıldı");

    const result = db.getDefaultKisitlar();
    return result;
  } catch (error) {
    console.error("❌ get-default-kisitlar hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Kısıtlar IPC handlers yüklendi");

// ==========================================
// 👨‍🏫 ÖĞRETMEN TERCİHLERİ - IPC HANDLERS
// ==========================================

ipcMain.handle(
  "save-ogretmen-tercihi",
  async (event, programId, ogretmenId, tercihler) => {
    try {
      console.log("💾 IPC: save-ogretmen-tercihi çağrıldı");

      const result = await db.saveOgretmenTercihi(
        programId,
        ogretmenId,
        tercihler
      );
      return result;
    } catch (error) {
      console.error("❌ save-ogretmen-tercihi hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("get-ogretmen-tercihi", async (event, programId, ogretmenId) => {
  try {
    console.log("📋 IPC: get-ogretmen-tercihi çağrıldı");

    const result = db.getOgretmenTercihi(programId, ogretmenId);
    return result;
  } catch (error) {
    console.error("❌ get-ogretmen-tercihi hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-all-ogretmen-tercihleri", async (event, programId) => {
  try {
    console.log("📋 IPC: get-all-ogretmen-tercihleri çağrıldı");

    const result = db.getAllOgretmenTercihleri(programId);
    return result;
  } catch (error) {
    console.error("❌ get-all-ogretmen-tercihleri hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "delete-ogretmen-tercihi",
  async (event, programId, ogretmenId) => {
    try {
      console.log("🗑️ IPC: delete-ogretmen-tercihi çağrıldı");

      const result = db.deleteOgretmenTercihi(programId, ogretmenId);
      return result;
    } catch (error) {
      console.error("❌ delete-ogretmen-tercihi hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

console.log("✅ Öğretmen Tercihleri IPC handlers yüklendi");

// ==========================================
// 🤖 YAPAY ZEKA UYARI - IPC HANDLERS
// ==========================================

ipcMain.handle("check-bos-gun-cakismasi", async (event, programId, bosGun) => {
  try {
    console.log("🔍 IPC: check-bos-gun-cakismasi çağrıldı");

    const result = db.checkBosGunCakismasi(programId, bosGun);
    return result;
  } catch (error) {
    console.error("❌ check-bos-gun-cakismasi hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-aktif-uyarilar", async (event, programId) => {
  try {
    console.log("📋 IPC: get-aktif-uyarilar çağrıldı");

    const result = db.getAktifUyarilar(programId);
    return result;
  } catch (error) {
    console.error("❌ get-aktif-uyarilar hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("resolve-uyari", async (event, uyariId) => {
  try {
    console.log("✅ IPC: resolve-uyari çağrıldı");

    const result = db.resolveUyari(uyariId);
    return result;
  } catch (error) {
    console.error("❌ resolve-uyari hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("validate-kisitlar-tercihler", async (event, programId) => {
  try {
    console.log("🔍 IPC: validate-kisitlar-tercihler çağrıldı");

    const result = db.validateKisitlarVeTercihler(programId);
    return result;
  } catch (error) {
    console.error("❌ validate-kisitlar-tercihler hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("save-kisit-uyarisi", async (event, programId, uyari) => {
  try {
    console.log("⚠️ IPC: save-kisit-uyarisi çağrıldı");

    const result = db.saveKisitUyarisi(programId, uyari);
    return result;
  } catch (error) {
    console.error("❌ save-kisit-uyarisi hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Yapay Zeka Uyarı IPC handlers yüklendi");

// ==========================================
// 💾 SINIF-DERS-ÖĞRETMEN ATAMA
// ==========================================

ipcMain.handle("save-sinif-ders-ogretmen-atama", async (event, payload) => {
  try {
    console.log("💾 Sınıf-Ders-Öğretmen Atama Kaydediliyor:", payload);

    const result = await db.saveSinifDersOgretmenAtama(payload);
    return result;
  } catch (error) {
    console.error("❌ save-sinif-ders-ogretmen-atama hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-sinif-ders-ogretmen-atama", async (event, sinifId) => {
  try {
    console.log("📋 IPC: get-sinif-ders-ogretmen-atama çağrıldı");

    const result = db.getSinifDersOgretmenAtama(sinifId);
    return result;
  } catch (error) {
    console.error("❌ get-sinif-ders-ogretmen-atama hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("delete-sinif-ders-ogretmen-atama", async (event, atamaId) => {
  try {
    console.log("🗑️ IPC: delete-sinif-ders-ogretmen-atama çağrıldı");

    const result = db.deleteSinifDersOgretmenAtama(atamaId);
    return result;
  } catch (error) {
    console.error("❌ delete-sinif-ders-ogretmen-atama hatası:", error);
    return { success: false, message: error.message };
  }
});

// ESKI HANDLER (BACKWARD COMPATIBILITY)
ipcMain.handle("saveSinifDersOgretmenAtama", async (event, payload) => {
  console.log("⚠️ Eski handler çağrıldı, yeni handler'a yönlendiriliyor...");
  return await db.saveSinifDersOgretmenAtama(payload);
});

console.log("✅ Sınıf-Ders-Öğretmen Atama IPC handlers yüklendi");

// ==========================================
// 📊 GENEL SQL SORGU HANDLER
// ==========================================

ipcMain.handle("run-sql-query", async (event, sql) => {
  try {
    const schoolDB = db.getActiveSchoolDB();
    const stmt = schoolDB.prepare(sql);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return { success: true, data: results };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

console.log("✅ Main.js Bölüm 4 yüklendi");
// ==========================================
// 🚀 ALGORİTMA ENTEGRASYONU IPC HANDLERS
// ==========================================

ipcMain.handle("save-algorithm-config", async (event, programId, config) => {
  try {
    console.log("⚙️ IPC: save-algorithm-config çağrıldı");

    const result = await db.saveAlgorithmConfig(programId, config);
    return result;
  } catch (error) {
    console.error("❌ save-algorithm-config hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-algorithm-config", async (event, programId) => {
  try {
    console.log("📋 IPC: get-algorithm-config çağrıldı");

    const result = db.getAlgorithmConfig(programId);
    return result;
  } catch (error) {
    console.error("❌ get-algorithm-config hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "save-solution-variant",
  async (event, programId, variantName, solution, metadata) => {
    try {
      console.log("💾 IPC: save-solution-variant çağrıldı");

      const result = await db.saveSolutionVariant(
        programId,
        variantName,
        solution,
        metadata
      );
      return result;
    } catch (error) {
      console.error("❌ save-solution-variant hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("get-all-solution-variants", async (event, programId) => {
  try {
    console.log("📋 IPC: get-all-solution-variants çağrıldı");

    const result = db.getAllSolutionVariants(programId);
    return result;
  } catch (error) {
    console.error("❌ get-all-solution-variants hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-solution-variant", async (event, variantId) => {
  try {
    console.log("📋 IPC: get-solution-variant çağrıldı");

    const result = db.getSolutionVariant(variantId);
    return result;
  } catch (error) {
    console.error("❌ get-solution-variant hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("delete-solution-variant", async (event, variantId) => {
  try {
    console.log("🗑️ IPC: delete-solution-variant çağrıldı");

    const result = db.deleteSolutionVariant(variantId);
    return result;
  } catch (error) {
    console.error("❌ delete-solution-variant hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("mark-variant-as-best", async (event, programId, variantId) => {
  try {
    console.log("⭐ IPC: mark-variant-as-best çağrıldı");

    const result = db.markVariantAsBest(programId, variantId);
    return result;
  } catch (error) {
    console.error("❌ mark-variant-as-best hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "save-performance-metrics",
  async (event, programId, sessionName, metrics) => {
    try {
      console.log("📊 IPC: save-performance-metrics çağrıldı");

      const result = await db.savePerformanceMetrics(
        programId,
        sessionName,
        metrics
      );
      return result;
    } catch (error) {
      console.error("❌ save-performance-metrics hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("get-performance-history", async (event, programId, limit) => {
  try {
    console.log("📋 IPC: get-performance-history çağrıldı");

    const result = db.getPerformanceHistory(programId, limit);
    return result;
  } catch (error) {
    console.error("❌ get-performance-history hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-performance-stats", async (event, programId) => {
  try {
    console.log("📊 IPC: get-performance-stats çağrıldı");

    const result = db.getPerformanceStats(programId);
    return result;
  } catch (error) {
    console.error("❌ get-performance-stats hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "run-schedule-algorithm",
  async (event, programId, algorithmType, options) => {
    try {
      console.log("🚀 IPC: run-schedule-algorithm çağrıldı");

      const result = await db.runScheduleAlgorithm(
        programId,
        algorithmType,
        options
      );
      return result;
    } catch (error) {
      console.error("❌ run-schedule-algorithm hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("stop-schedule-algorithm", async (event, programId) => {
  try {
    console.log("⏹️ IPC: stop-schedule-algorithm çağrıldı");

    const result = db.stopScheduleAlgorithm(programId);
    return result;
  } catch (error) {
    console.error("❌ stop-schedule-algorithm hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("compare-solutions", async (event, programId, variantIds) => {
  try {
    console.log("⚖️ IPC: compare-solutions çağrıldı");

    const result = db.compareSolutions(programId, variantIds);
    return result;
  } catch (error) {
    console.error("❌ compare-solutions hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "optimize-program",
  async (event, programId, optimizationType) => {
    try {
      console.log("⚡ IPC: optimize-program çağrıldı");

      const result = db.optimizeProgram(programId, optimizationType);
      return result;
    } catch (error) {
      console.error("❌ optimize-program hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("analyze-schedule-quality", async (event, programId) => {
  try {
    console.log("🔍 IPC: analyze-schedule-quality çağrıldı");

    const result = db.analyzeScheduleQuality(programId);
    return result;
  } catch (error) {
    console.error("❌ analyze-schedule-quality hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Algoritma Entegrasyonu IPC handlers yüklendi");

// ==========================================
// 📈 İSTATİSTİK VE ANALİTİK IPC HANDLERS
// ==========================================

ipcMain.handle("get-system-stats", async () => {
  try {
    console.log("📊 IPC: get-system-stats çağrıldı");

    const result = db.getSystemStats();
    return result;
  } catch (error) {
    console.error("❌ get-system-stats hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-schedule-stats", async (event, programId) => {
  try {
    console.log("📊 IPC: get-schedule-stats çağrıldı");

    const result = db.getScheduleStats(programId);
    return result;
  } catch (error) {
    console.error("❌ get-schedule-stats hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-teacher-workload", async (event, ogretmenId, programId) => {
  try {
    console.log("📊 IPC: get-teacher-workload çağrıldı");

    const result = db.getTeacherWorkload(ogretmenId, programId);
    return result;
  } catch (error) {
    console.error("❌ get-teacher-workload hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "get-class-schedule-analysis",
  async (event, sinifId, programId) => {
    try {
      console.log("📊 IPC: get-class-schedule-analysis çağrıldı");

      const result = db.getClassScheduleAnalysis(sinifId, programId);
      return result;
    } catch (error) {
      console.error("❌ get-class-schedule-analysis hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

console.log("✅ İstatistik ve Analitik IPC handlers yüklendi");

// ==========================================
// 📄 PDF OLUŞTUR - PUPPETEER MANAGER (GÜNCELLENDİ)
// ==========================================

ipcMain.handle("create-pdf", async (event, options) => {
  try {
    console.log("📄 PDF oluşturuluyor...");

    const { html, fileName } = options;
    const downloadPath = path.join(os.homedir(), "Downloads", fileName);

    // 🆕 Puppeteer Manager kullan (otomatik Chrome bulma/indirme)
    const result = await puppeteerManager.createPDF(html, downloadPath);

    if (result.success) {
      console.log("✅ PDF başarıyla oluşturuldu:", downloadPath);
      return {
        success: true,
        message: "PDF başarıyla oluşturuldu",
        path: downloadPath,
      };
    } else {
      console.error("❌ PDF oluşturma hatası:", result.error);
      return {
        success: false,
        message: result.error,
      };
    }
  } catch (error) {
    console.error("❌ PDF handler hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

console.log("✅ PDF IPC handler yüklendi (Puppeteer Manager ile)");

// ==========================================
// 🧹 MANUEL CACHE TEMİZLEME (YENİ)
// ==========================================

ipcMain.handle("clear-cache-manual", async (event) => {
  try {
    console.log("🧹 Manuel cache temizleme başlatıldı...");

    // Event'ten window'u al (daha güvenli)
    const senderWindow = BrowserWindow.fromWebContents(event.sender);

    const result = await cacheManager.manualClearCache(senderWindow);

    if (result) {
      console.log("✅ Cache temizlendi");
      return {
        success: true,
        message: "Cache başarıyla temizlendi! Sayfa yenileniyor...",
      };
    } else {
      return {
        success: false,
        message: "Cache temizlenemedi!",
      };
    }
  } catch (error) {
    console.error("❌ Manuel cache temizleme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Cache boyutunu getir
ipcMain.handle("get-cache-size", async () => {
  try {
    const sizeMB = await cacheManager.getCacheSize();
    return {
      success: true,
      size: sizeMB,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
});

console.log("✅ Cache Yönetimi IPC handlers yüklendi");

// ==========================================
// 📊 EXCEL OLUŞTUR - XLSX (KORUNDU)
// ==========================================

ipcMain.handle("create-excel", async (event, options) => {
  try {
    console.log("📊 Excel oluşturuluyor...");

    const XLSX = require("xlsx");
    const { data, fileName } = options;

    const downloadPath = path.join(os.homedir(), "Downloads", fileName);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws["!cols"] = [
      { wch: 8 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 35 },
      { wch: 12 },
    ];

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Rapor");
    XLSX.writeFile(wb, downloadPath);

    console.log("✅ Excel kaydedildi:", downloadPath);

    return {
      success: true,
      message: "Excel başarıyla oluşturuldu",
      path: downloadPath,
    };
  } catch (error) {
    console.error("❌ Excel hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

console.log("✅ Excel IPC handler yüklendi");

// ==========================================
// 🎨 EXPORT IPC HANDLERS
// ==========================================

ipcMain.handle("export-program-as-image", async (event, programId, format) => {
  try {
    console.log("🖼️ IPC: export-program-as-image çağrıldı");

    const result = db.exportProgramAsImage(programId, format);
    return result;
  } catch (error) {
    console.error("❌ export-program-as-image hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("export-program-as-pdf", async (event, programId, options) => {
  try {
    console.log("📄 IPC: export-program-as-pdf çağrıldı");

    const result = db.exportProgramAsPDF(programId, options);
    return result;
  } catch (error) {
    console.error("❌ export-program-as-pdf hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("export-program-as-excel", async (event, programId, options) => {
  try {
    console.log("📊 IPC: export-program-as-excel çağrıldı");

    const result = db.exportProgramAsExcel(programId, options);
    return result;
  } catch (error) {
    console.error("❌ export-program-as-excel hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Export IPC handlers yüklendi");

// ==========================================
// 🔔 BİLDİRİM SİSTEMİ IPC HANDLERS
// ==========================================

ipcMain.handle("show-notification", async (event, title, body, options) => {
  try {
    console.log("🔔 IPC: show-notification çağrıldı");

    // Electron Notification API kullanabilirsiniz
    if (mainWindow) {
      mainWindow.webContents.send("show-system-notification", {
        title,
        body,
        options,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("❌ show-notification hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Bildirim Sistemi IPC handlers yüklendi");

// ==========================================
// 💾 PROGRAM ÇÖZÜMÜ KAYDETME IPC HANDLERS (ÇOKLU ÇÖZÜM DESTEĞİ) - DEBUG EDİLMİŞ VERSİYON
// ==========================================
// @debug: Ek null check'ler, tablo varlığı sorguları, FK enable, detaylı log'lar eklendi
// @date: 30.11.2025

// FK'leri etkinleştir (global olarak, her handler başında)
global.currentSchoolDb?.exec("PRAGMA foreign_keys = ON;");

ipcMain.handle(
  "save-program-solution",
  async (event, programId, solutionName, solutionData, metadata = {}) => {
    try {
      console.log("💾 IPC: save-program-solution çağrıldı");
      console.log(`   • Program ID: ${programId} (TİP: ${typeof programId})`);
      console.log(`   • Çözüm Adı: ${solutionName}`);
      console.log(`   • Metadata Keys: ${Object.keys(metadata)}`);

      // DEBUG: Null/Invalid programId check – Erken patla
      if (!programId || isNaN(programId) || programId <= 0) {
        console.error(
          "❌ HATA: programId null/undefined/geçersiz! Değer:",
          programId
        );
        throw new Error(
          `Program ID zorunlu ve pozitif integer olmalı! Alınan: ${programId}`
        );
      }

      // activeSchoolDB yerine global.currentSchoolDb kullan
      const db = global.currentSchoolDb;
      if (!db || typeof db.exec !== "function") {
        console.error("❌ Aktif okul veritabanı yok! (Login yapın)");
        return {
          success: false,
          message: "Veritabanı bağlantısı yok - Lütfen giriş yapın",
        };
      }

      // DEBUG: programlar tablosu var mı? Sorgula
      const tableCheck = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='programlar';"
      );
      const tables = tableCheck[0]?.result?.rows || [];
      if (tables.length === 0) {
        console.error(
          "❌ KRİTİK HATA: 'programlar' tablosu yok! Migration çalıştırın."
        );
        throw new Error(
          "programlar tablosu bulunamadı - Lütfen migration'ları çalıştırın (runMigrations)."
        );
      }
      console.log("✅ DEBUG: programlar tablosu mevcut.");

      // DEBUG: Program ID var mı? Kontrol et (FK violation önle)
      const programCheckStmt = db.prepare(
        "SELECT id FROM programlar WHERE id = ?;"
      );
      const existingProgram = programCheckStmt.get(programId);
      if (!existingProgram) {
        console.error(
          `❌ HATA: Program ID ${programId} veritabanında yok! Önce program oluşturun.`
        );
        throw new Error(
          `Program ${programId} bulunamadı - Önce ders programı oluşturun.`
        );
      }
      console.log(`✅ DEBUG: Program ${programId} mevcut.`);

      // Veritabanında program_cozumleri tablosu yoksa oluştur (güvenlik için)
      db.exec(`
        CREATE TABLE IF NOT EXISTS program_cozumleri (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id INTEGER NOT NULL,
          cozum_adi TEXT NOT NULL,
          cozum_data TEXT NOT NULL,
          metadata TEXT,
          aktif INTEGER DEFAULT 0,
          olusturma_tarihi TEXT NOT NULL,
          guncelleme_tarihi TEXT NOT NULL,
          FOREIGN KEY (program_id) REFERENCES programlar(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ DEBUG: program_cozumleri tablosu hazırlandı.");

      // JSON string'e çevir
      const jsonData = JSON.stringify(solutionData);
      const jsonMetadata = JSON.stringify(metadata);
      console.log(`   • JSON Veri Boyutu: ${jsonData.length} chars`);
      console.log(`   • JSON Metadata Boyutu: ${jsonMetadata.length} chars`);

      // Veritabanına kaydet
      const stmt = db.prepare(`
        INSERT INTO program_cozumleri 
        (program_id, cozum_adi, cozum_data, metadata, olusturma_tarihi, guncelleme_tarihi)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      // DEBUG: Parametreleri log'la (güvenlik için hassas veri gizle)
      console.log(
        `   • Bind Edilecek Parametreler: [${programId}, "${solutionName?.substring(
          0,
          50
        )}...", ${jsonData.length} chars, ${jsonMetadata.length} chars]`
      );

      const result = stmt.run(programId, solutionName, jsonData, jsonMetadata);

      console.log(`✅ Çözüm kaydedildi, ID: ${result.lastInsertRowid}`);
      console.log(`   • Changes: ${result.changes}`);

      // DEBUG: Kaydedilen kaydı doğrula (SELECT ile)
      const verifyStmt = db.prepare(
        "SELECT * FROM program_cozumleri WHERE id = ?;"
      );
      const saved = verifyStmt.get(result.lastInsertRowid);
      console.log(
        "✅ DEBUG: Doğrulama - Kaydedilen program_id:",
        saved?.program_id
      );

      return {
        success: true,
        id: result.lastInsertRowid,
        message: "Çözüm başarıyla kaydedildi",
      };
    } catch (error) {
      console.error("❌ save-program-solution hatası:", error);
      console.error("   • Stack Trace:", error.stack); // DEBUG: Tam stack ekle
      return { success: false, message: error.message };
    }
  }
);

// Diğer handler'lar (debug eklenmemiş, ama tablo check eklendi – kısa tutmak için)
ipcMain.handle("get-all-program-solutions", async (event, programId) => {
  try {
    console.log("📋 IPC: get-all-program-solutions çağrıldı");
    console.log(`   • Program ID: ${programId}`);

    const db = global.currentSchoolDb;
    if (!db || typeof db.prepare !== "function") {
      console.error("❌ Aktif okul veritabanı yok! (Login yapın)");
      return {
        success: false,
        message: "Veritabanı bağlantısı yok - Lütfen giriş yapın",
        solutions: [],
      };
    }

    // DEBUG: programlar tablosu check (kısa)
    const tables =
      db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='programlar';"
      )[0]?.result?.rows || [];
    if (tables.length === 0) {
      console.error("❌ 'programlar' tablosu yok!");
      return {
        success: false,
        message: "programlar tablosu yok - Migration çalıştırın",
        solutions: [],
      };
    }

    // Tablo yoksa oluştur
    db.exec(`
      CREATE TABLE IF NOT EXISTS program_cozumleri (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id INTEGER NOT NULL,
        cozum_adi TEXT NOT NULL,
        cozum_data TEXT NOT NULL,
        metadata TEXT,
        aktif INTEGER DEFAULT 0,
        olusturma_tarihi TEXT NOT NULL,
        guncelleme_tarihi TEXT NOT NULL,
        FOREIGN KEY (program_id) REFERENCES programlar(id) ON DELETE CASCADE
      )
    `);

    const stmt = db.prepare(`
      SELECT 
        id,
        program_id,
        cozum_adi,
        cozum_data,
        metadata,
        aktif,
        olusturma_tarihi,
        guncelleme_tarihi
      FROM program_cozumleri
      WHERE program_id = ?
      ORDER BY olusturma_tarihi DESC
    `);

    const solutions = stmt.all(programId);

    // JSON parse et
    const parsedSolutions = solutions.map((sol) => ({
      ...sol,
      cozum_data: JSON.parse(sol.cozum_data),
      metadata: sol.metadata ? JSON.parse(sol.metadata) : {},
      aktif: sol.aktif === 1,
    }));

    console.log(`✅ ${parsedSolutions.length} çözüm bulundu`);

    return {
      success: true,
      solutions: parsedSolutions,
    };
  } catch (error) {
    console.error("❌ get-all-program-solutions hatası:", error);
    return { success: false, message: error.message, solutions: [] };
  }
});

// Diğer handler'lar aynı (get-program-solution, delete-program-solution, update-program-solution, set-active-solution, get-active-solution) – debug için tablo check ekledim, ama kod uzun olmasın diye kısalttım. Tam kod istersen söyle.
ipcMain.handle("get-program-solution", async (event, solutionId) => {
  try {
    console.log("📋 IPC: get-program-solution çağrıldı");
    console.log(`   • Çözüm ID: ${solutionId}`);

    const db = global.currentSchoolDb;
    if (!db || typeof db.prepare !== "function") {
      return {
        success: false,
        message: "Veritabanı bağlantısı yok - Lütfen giriş yapın",
      };
    }

    // DEBUG: Kısa tablo check
    const tables =
      db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='program_cozumleri';"
      )[0]?.result?.rows || [];
    if (tables.length === 0) {
      return {
        success: false,
        message: "program_cozumleri tablosu yok - Migration çalıştırın",
      };
    }

    const stmt = db.prepare(`
      SELECT 
        id,
        program_id,
        cozum_adi,
        cozum_data,
        metadata,
        aktif,
        olusturma_tarihi,
        guncelleme_tarihi
      FROM program_cozumleri
      WHERE id = ?
    `);

    const solution = stmt.get(solutionId);

    if (!solution) {
      return { success: false, message: "Çözüm bulunamadı" };
    }

    // JSON parse et
    const parsedSolution = {
      ...solution,
      cozum_data: JSON.parse(solution.cozum_data),
      metadata: solution.metadata ? JSON.parse(solution.metadata) : {},
      aktif: solution.aktif === 1,
    };

    console.log(`✅ Çözüm bulundu: ${parsedSolution.cozum_adi}`);

    return {
      success: true,
      solution: parsedSolution,
    };
  } catch (error) {
    console.error("❌ get-program-solution hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("delete-program-solution", async (event, solutionId) => {
  try {
    console.log("🗑️ IPC: delete-program-solution çağrıldı");
    console.log(`   • Çözüm ID: ${solutionId}`);

    const db = global.currentSchoolDb;
    if (!db || typeof db.prepare !== "function") {
      return {
        success: false,
        message: "Veritabanı bağlantısı yok - Lütfen giriş yapın",
      };
    }

    // DEBUG: Tablo check
    const tables =
      db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='program_cozumleri';"
      )[0]?.result?.rows || [];
    if (tables.length === 0) {
      return { success: false, message: "program_cozumleri tablosu yok" };
    }

    const stmt = db.prepare(`
      DELETE FROM program_cozumleri
      WHERE id = ?
    `);

    const result = stmt.run(solutionId);

    if (result.changes === 0) {
      return { success: false, message: "Çözüm bulunamadı" };
    }

    console.log(`✅ Çözüm silindi`);

    return {
      success: true,
      message: "Çözüm başarıyla silindi",
    };
  } catch (error) {
    console.error("❌ delete-program-solution hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "update-program-solution",
  async (event, solutionId, updates) => {
    try {
      console.log("✏️ IPC: update-program-solution çağrıldı");
      console.log(`   • Çözüm ID: ${solutionId}`);

      const db = global.currentSchoolDb;
      if (!db || typeof db.prepare !== "function") {
        return {
          success: false,
          message: "Veritabanı bağlantısı yok - Lütfen giriş yapın",
        };
      }

      // DEBUG: Tablo check
      const tables =
        db.exec(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='program_cozumleri';"
        )[0]?.result?.rows || [];
      if (tables.length === 0) {
        return { success: false, message: "program_cozumleri tablosu yok" };
      }

      const { cozum_adi, cozum_data, metadata } = updates;

      let sql =
        "UPDATE program_cozumleri SET guncelleme_tarihi = datetime('now')";
      const params = [];

      if (cozum_adi) {
        sql += ", cozum_adi = ?";
        params.push(cozum_adi);
      }

      if (cozum_data) {
        sql += ", cozum_data = ?";
        params.push(JSON.stringify(cozum_data));
      }

      if (metadata) {
        sql += ", metadata = ?";
        params.push(JSON.stringify(metadata));
      }

      sql += " WHERE id = ?";
      params.push(solutionId);

      const stmt = db.prepare(sql);
      const result = stmt.run(...params);

      if (result.changes === 0) {
        return { success: false, message: "Çözüm bulunamadı" };
      }

      console.log(`✅ Çözüm güncellendi`);

      return {
        success: true,
        message: "Çözüm başarıyla güncellendi",
      };
    } catch (error) {
      console.error("❌ update-program-solution hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("set-active-solution", async (event, programId, solutionId) => {
  try {
    console.log("⭐ IPC: set-active-solution çağrıldı");
    console.log(`   • Program ID: ${programId}`);
    console.log(`   • Çözüm ID: ${solutionId}`);

    const db = global.currentSchoolDb;
    if (!db || typeof db.prepare !== "function") {
      return {
        success: false,
        message: "Veritabanı bağlantısı yok - Lütfen giriş yapın",
      };
    }

    // DEBUG: Tablo check
    const tables =
      db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='program_cozumleri';"
      )[0]?.result?.rows || [];
    if (tables.length === 0) {
      return { success: false, message: "program_cozumleri tablosu yok" };
    }

    // Önce programdaki tüm çözümleri pasif yap
    const deactivateStmt = db.prepare(`
      UPDATE program_cozumleri
      SET aktif = 0
      WHERE program_id = ?
    `);
    deactivateStmt.run(programId);

    // Seçilen çözümü aktif yap
    const activateStmt = db.prepare(`
      UPDATE program_cozumleri
      SET aktif = 1, guncelleme_tarihi = datetime('now')
      WHERE id = ? AND program_id = ?
    `);
    const result = activateStmt.run(solutionId, programId);

    if (result.changes === 0) {
      return { success: false, message: "Çözüm bulunamadı" };
    }

    console.log(`✅ Çözüm aktif olarak işaretlendi`);

    return {
      success: true,
      message: "Çözüm aktif olarak işaretlendi",
    };
  } catch (error) {
    console.error("❌ set-active-solution hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-active-solution", async (event, programId) => {
  try {
    console.log("📋 IPC: get-active-solution çağrıldı");
    console.log(`   • Program ID: ${programId}`);

    const db = global.currentSchoolDb;
    if (!db || typeof db.prepare !== "function") {
      return {
        success: false,
        message: "Veritabanı bağlantısı yok - Lütfen giriş yapın",
      };
    }

    // DEBUG: Tablo check
    const tables =
      db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='program_cozumleri';"
      )[0]?.result?.rows || [];
    if (tables.length === 0) {
      return { success: false, message: "program_cozumleri tablosu yok" };
    }

    const stmt = db.prepare(`
      SELECT 
        id,
        program_id,
        cozum_adi,
        cozum_data,
        metadata,
        aktif,
        olusturma_tarihi,
        guncelleme_tarihi
      FROM program_cozumleri
      WHERE program_id = ? AND aktif = 1
      LIMIT 1
    `);

    const solution = stmt.get(programId);

    if (!solution) {
      return { success: false, message: "Aktif çözüm bulunamadı" };
    }

    // JSON parse et
    const parsedSolution = {
      ...solution,
      cozum_data: JSON.parse(solution.cozum_data),
      metadata: solution.metadata ? JSON.parse(solution.metadata) : {},
      aktif: solution.aktif === 1,
    };

    console.log(`✅ Aktif çözüm bulundu: ${parsedSolution.cozum_adi}`);

    return {
      success: true,
      solution: parsedSolution,
    };
  } catch (error) {
    console.error("❌ get-active-solution hatası:", error);
    return { success: false, message: error.message };
  }
});

console.log("✅ Program Çözümü Kaydetme IPC handlers yüklendi (DEBUG MODE)");
console.log(
  "   • saveProgramSolution: Yeni çözüm kaydet (ekstra check'ler aktif)"
);
console.log("   • getAllProgramSolutions: Tüm çözümleri listele");
console.log("   • getProgramSolution: Tek çözüm getir");
console.log("   • deleteProgramSolution: Çözüm sil");
console.log("   • updateProgramSolution: Çözüm güncelle");
console.log("   • setActiveSolution: Aktif çözümü işaretle");
console.log("   • getActiveSolution: Aktif çözümü getir");
console.log("🔍 DEBUG: FK'ler etkin (PRAGMA foreign_keys=ON)");

// ==========================================
// MEBBİS ENTEGRASYON - IPC HANDLERS (KORUNDU)
// ==========================================

ipcMain.handle("open-mebbis-window", async () => {
  try {
    mebbisEntegrasyon.openMebbisWindow();
    return { success: true };
  } catch (error) {
    console.error("❌ MEBBİS penceresi açma hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("mebbis-save-students", async (event, students) => {
  try {
    const result = await db.importStudentsFromExcel(students);
    return result;
  } catch (error) {
    console.error("❌ Öğrenci kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("mebbis-save-photos", async (event, photos) => {
  console.log("📸 E-Okul fotoğraf aktarımı başladı:", photos.length);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "backend-log",
      `📸 Backend: ${photos.length} fotoğraf alındı`
    );
  }

  function normalizeTurkish(str) {
    if (!str) return "";

    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return str
      .toUpperCase()
      .replace(/İ/gi, "I")
      .replace(/I/g, "I")
      .replace(/Ş/gi, "S")
      .replace(/Ğ/gi, "G")
      .replace(/Ü/gi, "U")
      .replace(/Ö/gi, "O")
      .replace(/Ç/gi, "C")
      .replace(/\s+/g, "")
      .trim();
  }

  try {
    const photoDir = path.join(db.veritabaniKlasoru, "..", "Fotograflar");
    if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

    const schoolDB = db.getActiveSchoolDB();
    if (!schoolDB)
      return { success: false, message: "Aktif veritabanı bulunamadı!" };

    const stmt = schoolDB.prepare(
      "SELECT id, okul_no, ad_soyad FROM ogrenciler WHERE durum = 1"
    );
    const allStudents = [];
    while (stmt.step()) {
      const s = stmt.getAsObject();
      s.normalized = normalizeTurkish(s.ad_soyad);
      allStudents.push(s);
    }
    stmt.free();

    console.log("📋 Toplam öğrenci:", allStudents.length);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "backend-log",
        `📋 Veritabanında ${allStudents.length} öğrenci var`
      );
    }

    let savedCount = 0;
    const notFound = [];

    for (const photo of photos) {
      const ad_soyad = photo.ad_soyad || "";
      const normalizedName = normalizeTurkish(ad_soyad);

      const foundStudent = allStudents.find(
        (s) => s.normalized === normalizedName
      );

      if (foundStudent) {
        const base64Data = photo.base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `${foundStudent.okul_no}.jpg`;
        const filePath = path.join(photoDir, fileName);

        fs.writeFileSync(filePath, buffer);
        schoolDB.run("UPDATE ogrenciler SET fotograf_path = ? WHERE id = ?", [
          filePath,
          foundStudent.id,
        ]);

        savedCount++;
        console.log(`✅ ${foundStudent.okul_no} - ${foundStudent.ad_soyad}`);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(
            "backend-log",
            `✅ ${foundStudent.ad_soyad}`
          );
        }
      } else {
        console.warn(
          `⚠️ Bulunamadı: ${ad_soyad} (normalized: ${normalizedName})`
        );
        notFound.push(ad_soyad);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(
            "backend-log",
            `⚠️ Bulunamadı: ${ad_soyad}`
          );
        }
      }
    }

    db.saveActiveSchoolDB();

    console.log(`📦 ${savedCount} kayıt, ${notFound.length} bulunamadı`);

    return {
      success: true,
      message: `${savedCount} fotoğraf kaydedildi${
        notFound.length > 0 ? `, ${notFound.length} bulunamadı` : ""
      }`,
      data: { saved: savedCount, errors: notFound.length, notFound },
    };
  } catch (err) {
    console.error("❌ Genel hata:", err);
    return { success: false, message: err.message };
  }
});

console.log("✅ MEBBİS IPC Handler'ları yüklendi");

// ==========================================
// MEBBİS BUTON EVENTLERİ (KORUNDU)
// ==========================================

ipcMain.on("cek-ogrenci", async (event) => {
  console.log("🎯 Öğrenci çekme başlatıldı");

  try {
    const result = await mebbisEntegrasyon.parseStudentTable();

    if (result.success) {
      console.log(`✅ ${result.data.length} öğrenci bulundu`);

      const mainWindow = BrowserWindow.getAllWindows().find(
        (win) => !win.title.includes("MEBBİS")
      );

      if (mainWindow) {
        mainWindow.webContents.send("mebbis-students-parsed", result.data);
      }

      const mebbisWin = mebbisEntegrasyon.getMebbisWindow();
      if (mebbisWin) {
        mebbisWin.webContents.send("sonuc", {
          success: true,
          type: "öğrenci",
          count: result.data.length,
        });
      }
    } else {
      console.error("❌ Öğrenci çekilemedi:", result.message);

      const mebbisWin = mebbisEntegrasyon.getMebbisWindow();
      if (mebbisWin) {
        mebbisWin.webContents.send("sonuc", {
          success: false,
          message: result.message || "Öğrenci tablosu bulunamadı!",
        });
      }
    }
  } catch (error) {
    console.error("❌ Hata:", error);

    const mebbisWin = mebbisEntegrasyon.getMebbisWindow();
    if (mebbisWin) {
      mebbisWin.webContents.send("sonuc", {
        success: false,
        message: "Bir hata oluştu: " + error.message,
      });
    }
  }
});

ipcMain.on("cek-fotograf", async (event) => {
  console.log("📸 Fotoğraf çekme başlatıldı");

  try {
    const result = await mebbisEntegrasyon.parsePhotos();

    if (result.success) {
      console.log(`✅ ${result.data.length} fotoğraf bulundu`);

      const mainWindow = BrowserWindow.getAllWindows().find(
        (win) => !win.title.includes("MEBBİS")
      );

      if (mainWindow) {
        mainWindow.webContents.send("mebbis-photos-parsed", result.data);
      }

      const mebbisWin = mebbisEntegrasyon.getMebbisWindow();
      if (mebbisWin) {
        mebbisWin.webContents.send("sonuc", {
          success: true,
          type: "fotoğraf",
          count: result.data.length,
        });
      }
    } else {
      const mebbisWin = mebbisEntegrasyon.getMebbisWindow();
      if (mebbisWin) {
        mebbisWin.webContents.send("sonuc", {
          success: false,
          message: result.message || "Fotoğraf bulunamadı!",
        });
      }
    }
  } catch (error) {
    console.error("❌ Hata:", error);

    const mebbisWin = mebbisEntegrasyon.getMebbisWindow();
    if (mebbisWin) {
      mebbisWin.webContents.send("sonuc", {
        success: false,
        message: "Bir hata oluştu: " + error.message,
      });
    }
  }
});

// ==========================================
// AUTO EXCEL IMPORT HANDLER (GÜNCELLENDİ - İ HARFİ + DETAYLI LOG)
// ==========================================

ipcMain.handle("process-auto-excel", async (event, filePath) => {
  try {
    logger.info("📂 Excel dosyası işleniyor", {
      filePath: filePath,
      module: "excel-import",
    });
    console.log("📂 Excel dosyası işleniyor:", filePath);

    const XLSX = require("xlsx");

    if (!fs.existsSync(filePath)) {
      logger.error("Excel dosyası bulunamadı", {
        filePath: filePath,
        module: "excel-import",
      });
      return { success: false, message: "Dosya bulunamadı!" };
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    logger.info("📊 Excel dosyası okundu", {
      sheetName: sheetName,
      rowCount: range.e.r + 1,
      module: "excel-import",
    });
    console.log("📊 Toplam satır:", range.e.r + 1);

    const ogrenciler = [];
    const mevcutTCler = new Set();

    const schoolDB = db.getActiveSchoolDB();
    if (schoolDB) {
      const stmt = schoolDB.prepare(
        "SELECT tc_no FROM ogrenciler WHERE durum = 1"
      );
      while (stmt.step()) {
        const row = stmt.getAsObject();
        if (row.tc_no) mevcutTCler.add(row.tc_no);
      }
      stmt.free();
    }

    let sinif = "";

    // ✅ SINIF BULMA (İ HARFİ DESTEĞİ)
    for (let R = 0; R < 10; R++) {
      for (let C = 0; C < 16; C++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const text = String(cell.v);

          // ✅ İ harfi dahil tüm harfler için regex
          const sinifMatch = text.match(
            /AL\s*-\s*(\d+)\.\s*Sınıf\s*\/\s*([A-ZÇĞİÖŞÜ]+)\s*Şubesi/i
          );

          if (sinifMatch) {
            const sinifNo = sinifMatch[1];
            const sube = sinifMatch[2].toUpperCase(); // ✅ İ → İ olarak kalır

            sinif = `${sinifNo}-${sube}`;

            logger.success("✅ Sınıf bulundu", {
              row: R + 1,
              col: C + 1,
              sinif: sinif,
              rawText: text,
              module: "excel-import",
            });

            console.log(`✅ Sınıf bulundu (Satır ${R + 1}):`, sinif);
            console.log(`   Raw Text: "${text}"`);
            console.log(`   Sınıf No: ${sinifNo}, Şube: ${sube}`);
            break;
          }
        }
      }
      if (sinif) break;
    }

    if (!sinif) {
      logger.error("Sınıf bilgisi bulunamadı", {
        message: "Excel'de sınıf formatı bulunamadı",
        module: "excel-import",
      });
      return { success: false, message: "Sınıf bilgisi bulunamadı!" };
    }

    const keyCol = 4;
    const valueCol = 7;

    for (let R = 6; R < range.e.r; R++) {
      try {
        const keyAddr = XLSX.utils.encode_cell({ r: R, c: keyCol });
        const keyCell = worksheet[keyAddr];

        if (!keyCell || !keyCell.v) continue;

        const keyText = String(keyCell.v).trim();

        if (!keyText.includes("Öğrenci Numarası")) continue;

        let ogrNo = "";
        let tcNo = "";
        let adSoyad = "";
        let babaAdi = "";
        let anneAdi = "";
        let cinsiyet = "";
        let dogumTarihi = "";

        const ogrNoAddr = XLSX.utils.encode_cell({ r: R, c: valueCol });
        const ogrNoCell = worksheet[ogrNoAddr];
        if (ogrNoCell && ogrNoCell.v) {
          ogrNo = String(ogrNoCell.v).trim();
        }

        console.log(`\n🔍 ÖĞRENCİ BAŞLADI - Satır ${R + 1}, Okul No: ${ogrNo}`);
        logger.info("🔍 Öğrenci işleniyor", {
          row: R + 1,
          okulNo: ogrNo,
          module: "excel-import",
        });

        for (let i = R; i < Math.min(R + 25, range.e.r); i++) {
          const kAddr = XLSX.utils.encode_cell({ r: i, c: keyCol });
          const kCell = worksheet[kAddr];

          if (!kCell || !kCell.v) continue;

          const key = String(kCell.v).trim();

          const vAddr = XLSX.utils.encode_cell({ r: i, c: valueCol });
          const vCell = worksheet[vAddr];
          const value = vCell && vCell.v ? String(vCell.v).trim() : "";

          if (key.includes("T.C. Kimlik No")) {
            if (!tcNo || tcNo.length !== 11) {
              tcNo = value.replace(/\D/g, "");
              console.log(
                `  📋 TC bulundu: Satır ${
                  i + 1
                }, Value="${value}", TC="${tcNo}"`
              );
            }
          } else if (key.includes("Adı Soyadı")) {
            adSoyad = value;
            console.log(`  👤 İsim bulundu: Satır ${i + 1}, "${adSoyad}"`);
          } else if (key.includes("Baba Adı")) {
            babaAdi = value;
          } else if (key.includes("Anne Adı")) {
            anneAdi = value;
          } else if (key.includes("Cinsiyeti")) {
            cinsiyet = value;
          } else if (key.includes("Doğum Tarihi")) {
            if (vCell && vCell.w) {
              dogumTarihi = vCell.w;
            } else {
              dogumTarihi = value;
            }
          }
        }

        console.log(`  ✅ SONUÇ: ${adSoyad} → TC: ${tcNo}`);

        if (!tcNo || tcNo.length !== 11) {
          console.log(`  ❌ TC geçersiz, atlanıyor`);
          logger.warn("TC geçersiz, öğrenci atlandı", {
            adSoyad: adSoyad,
            tc: tcNo,
            module: "excel-import",
          });
          R += 20;
          continue;
        }
        if (!adSoyad || adSoyad.length < 3) {
          console.log(`  ❌ İsim geçersiz, atlanıyor`);
          logger.warn("İsim geçersiz, öğrenci atlandı", {
            adSoyad: adSoyad,
            module: "excel-import",
          });
          R += 20;
          continue;
        }
        if (mevcutTCler.has(tcNo)) {
          console.log("  ⚠️ Zaten var:", adSoyad, tcNo);
          logger.info("Öğrenci zaten var", {
            adSoyad: adSoyad,
            tc: tcNo,
            module: "excel-import",
          });
          R += 20;
          continue;
        }

        const parcalar = adSoyad.split(" ");
        const soyad = parcalar.pop() || "";
        const ad = parcalar.join(" ") || "";

        let dogumFormatli = null;
        if (dogumTarihi) {
          if (dogumTarihi.includes("/")) {
            const [gun, ay, yil] = dogumTarihi.split("/");
            if (gun && ay && yil) {
              dogumFormatli = `${yil}-${ay.padStart(2, "0")}-${gun.padStart(
                2,
                "0"
              )}`;
            }
          }
        }

        const ogrenci = {
          tc_no: tcNo,
          ad: ad
            .split(" ")
            .map((k) => k.charAt(0).toUpperCase() + k.slice(1).toLowerCase())
            .join(" "),
          soyad: soyad.charAt(0).toUpperCase() + soyad.slice(1).toLowerCase(),
          ad_soyad: adSoyad
            .split(" ")
            .map((k) => k.charAt(0).toUpperCase() + k.slice(1).toLowerCase())
            .join(" "),
          okul_no: ogrNo || null,
          sinif: sinif,
          cinsiyet:
            cinsiyet === "Kız" ? "K" : cinsiyet === "Erkek" ? "E" : null,
          baba_ad_soyad: babaAdi
            ? babaAdi.charAt(0).toUpperCase() + babaAdi.slice(1).toLowerCase()
            : null,
          anne_ad_soyad: anneAdi
            ? anneAdi.charAt(0).toUpperCase() + anneAdi.slice(1).toLowerCase()
            : null,
          dogum_tarihi: dogumFormatli,
        };

        ogrenciler.push(ogrenci);
        mevcutTCler.add(tcNo);

        console.log(
          "  ✅ ÖĞRENCİ EKLENDİ:",
          ogrenci.ad_soyad,
          "TC:",
          ogrenci.tc_no
        );

        logger.success("Öğrenci eklendi", {
          adSoyad: ogrenci.ad_soyad,
          tc: ogrenci.tc_no,
          sinif: ogrenci.sinif,
          module: "excel-import",
        });

        R += 20;
      } catch (satirHata) {
        console.warn("⚠️ Satır hatası:", satirHata);
        logger.warn("Satır işleme hatası", {
          error: satirHata.message,
          module: "excel-import",
        });
      }
    }

    console.log("\n✅✅✅ TOPLAM OKUNAN ÖĞRENCİ:", ogrenciler.length);
    console.log("📚 SINIF:", sinif);

    logger.success("Excel işleme tamamlandı", {
      ogrenciSayisi: ogrenciler.length,
      sinif: sinif,
      module: "excel-import",
    });

    if (ogrenciler.length === 0) {
      logger.error("Öğrenci bulunamadı", {
        message: "Excel'de öğrenci verisi yok",
        module: "excel-import",
      });
      return { success: false, message: "Öğrenci bulunamadı!" };
    }

    const result = await db.importStudentsFromExcel(ogrenciler);

    return result;
  } catch (error) {
    console.error("❌ Auto Excel işleme hatası:", error);
    logger.error("Auto Excel işleme hatası", {
      error: error.message,
      stack: error.stack,
      module: "excel-import",
    });
    return { success: false, message: error.message };
  }
});

logger.success("Auto Excel Import Handler yüklendi", {
  module: "excel-import",
});
console.log("✅ Auto Excel Import Handler yüklendi");
// ==========================================
// E-OKUL FOTOĞRAF SAYFASI (GLOBAL EVENT LISTENER)
// ==========================================

// ✅ GLOBAL DEĞİŞKEN
let eOkulPhotoMainWindow = null;

// ✅ GLOBAL EVENT LISTENER (TEK SEFER TANIMLA)
let eOkulListenerActive = false;

if (!eOkulListenerActive) {
  app.on("browser-window-created", (event, newWindow) => {
    console.log("🆕 Yeni pencere tespit edildi!");
    logger.info("Yeni browser penceresi oluşturuldu", {
      windowId: newWindow.id,
      module: "eokul-photo",
    });

    setTimeout(() => {
      if (newWindow.isDestroyed()) return;

      const url = newWindow.webContents.getURL();
      console.log("🔍 Yeni pencere URL:", url);

      if (url.includes("e-okul.meb.gov.tr")) {
        console.log("✅ E-OKUL PENCERESİ BULUNDU!");
        logger.success("E-Okul penceresi tespit edildi", {
          url: url,
          windowId: newWindow.id,
          module: "eokul-photo",
        });

        injectButton(newWindow, eOkulPhotoMainWindow);

        newWindow.webContents.on("did-finish-load", () => {
          const currentUrl = newWindow.webContents.getURL();
          console.log("🔄 did-finish-load:", currentUrl);

          if (currentUrl.includes("e-okul.meb.gov.tr")) {
            setTimeout(() => {
              if (!newWindow.isDestroyed()) {
                console.log("🔄 Buton enjekte ediliyor...");
                injectButton(newWindow, eOkulPhotoMainWindow);
              }
            }, 1000);
          }
        });

        newWindow.webContents.on("did-navigate", (event, navUrl) => {
          console.log("🔄 did-navigate:", navUrl);

          if (navUrl.includes("e-okul.meb.gov.tr")) {
            setTimeout(() => {
              if (!newWindow.isDestroyed()) {
                console.log("🔄 Navigasyon, buton...");
                injectButton(newWindow, eOkulPhotoMainWindow);
              }
            }, 1000);
          }
        });

        newWindow.webContents.on("did-navigate-in-page", (event, navUrl) => {
          console.log("🔄 did-navigate-in-page:", navUrl);

          if (navUrl.includes("e-okul.meb.gov.tr")) {
            setTimeout(() => {
              if (!newWindow.isDestroyed()) {
                console.log("🔄 Sayfa içi, buton...");
                injectButton(newWindow, eOkulPhotoMainWindow);
              }
            }, 1000);
          }
        });

        newWindow.webContents.on("dom-ready", () => {
          const currentUrl = newWindow.webContents.getURL();
          console.log("🔄 dom-ready:", currentUrl);

          if (currentUrl.includes("e-okul.meb.gov.tr")) {
            setTimeout(() => {
              if (!newWindow.isDestroyed()) {
                console.log("🔄 DOM hazır, buton...");
                injectButton(newWindow, eOkulPhotoMainWindow);
              }
            }, 500);
          }
        });
      }
    }, 500);
  });

  eOkulListenerActive = true;
  console.log("✅ Global E-Okul event listener aktif");
}

ipcMain.handle("open-eokul-photo-page", async () => {
  logger.info("E-Okul fotoğraf penceresi açılıyor", {
    module: "eokul-photo",
  });

  const eOkulWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "E-Okul Fotoğraf Çekme",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
  });

  global.currentEOkulWindow = eOkulWindow;
  console.log("🌐 E-Okul penceresi oluşturuldu");
  logger.success("E-Okul penceresi oluşturuldu", {
    windowId: eOkulWindow.id,
    module: "eokul-photo",
  });

  eOkulWindow.loadURL("https://mebbis.meb.gov.tr/");
  eOkulWindow.webContents.openDevTools({ mode: "detach" });

  // ✅ MAIN WINDOW'U KAYDET
  eOkulPhotoMainWindow = BrowserWindow.getAllWindows().find(
    (win) => !win.title.includes("E-Okul") && !win.title.includes("MEBBİS")
  );

  eOkulWindow.webContents.on("did-finish-load", () => {
    const url = eOkulWindow.webContents.getURL();
    console.log("🌐 did-finish-load:", url);

    if (url.includes("mebbis.meb.gov.tr") && !url.includes("e-okul")) {
      eOkulWindow.webContents.executeJavaScript(`
        (function() {
          if (document.getElementById('bilgi-kutusu')) return;
          var box = document.createElement('div');
          box.id = 'bilgi-kutusu';
          box.innerHTML = '<div style="position:fixed;top:20px;right:20px;z-index:999999;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;border-radius:12px;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,0.3);font-family:system-ui"><h3 style="margin:0 0 15px">📸 E-Okul Fotoğraf</h3><ol style="margin:0;padding-left:20px;line-height:1.8;font-size:14px"><li>MEBBİS giriş yap</li><li>E-Okul linkine tıkla</li><li>Kurum İşlemleri → Fotoğraf İşlemleri</li><li>Sınıf seç → Hızlı Fotoğraf Ekle</li></ol><button onclick="this.parentElement.remove()" style="margin-top:15px;padding:8px 20px;background:white;color:#667eea;border:none;border-radius:6px;cursor:pointer;width:100%">Anladım</button></div>';
          document.body.appendChild(box);
        })();
      `);
    }
  });

  const injectedWindows = new Set();

  const checkAllWindows = () => {
    const allWindows = BrowserWindow.getAllWindows();

    allWindows.forEach((win) => {
      if (win.isDestroyed()) return;

      const url = win.webContents.getURL();

      if (url.includes("e-okul.meb.gov.tr")) {
        const winId = win.id;

        if (!injectedWindows.has(winId)) {
          console.log("🎯 E-Okul penceresi bulundu (ID:", winId, ")");
          injectedWindows.add(winId);

          setTimeout(() => {
            if (!win.isDestroyed()) {
              injectButton(win, eOkulPhotoMainWindow);
            }
          }, 1500);
        }
      }
    });
  };

  const checkInterval = setInterval(checkAllWindows, 1500);

  eOkulWindow.on("closed", () => {
    clearInterval(checkInterval);
    injectedWindows.clear();
    delete global.currentEOkulWindow;
    eOkulPhotoMainWindow = null;
    console.log("🛑 Tüm kontroller durduruldu");
  });

  return { success: true };
});

function injectButton(targetWindow, mainWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    console.error("❌ Hedef pencere yok!");
    return;
  }

  const url = targetWindow.webContents.getURL();
  console.log("⏳ BUTON ENJEKSİYONU:", url);

  const injectionScript = `
    (function() {
      console.log("🔧 Script:", window.location.href);

      const createButton = () => {
        if (document.getElementById("chatgptFotoTopla")) {
          console.log("⚠️ Buton var");
          return false;
        }

        console.log("🆕 Buton...");

        const btn = document.createElement("button");
        btn.id = "chatgptFotoTopla";
        btn.textContent = "📸 Fotoğrafları Topla";
        btn.style.cssText = "position:fixed;top:20px;right:20px;z-index:9999999;padding:15px 25px;background:linear-gradient(135deg,#ff1744,#d50000);color:white;border:none;border-radius:8px;cursor:pointer;font-size:18px;font-weight:bold;box-shadow:0 4px 20px rgba(255,23,68,0.6);transition:all 0.3s;";

        btn.onmouseenter = () => btn.style.transform = "scale(1.1)";
        btn.onmouseleave = () => btn.style.transform = "scale(1)";

        btn.onclick = function() {
          try {
            console.log("📸 TIKLANDI!");
            
            let imgs = Array.from(document.querySelectorAll('img[src^="data:image"]'));
            console.log("🔍 Ana:", imgs.length);

            const iframes = document.querySelectorAll('iframe');
            console.log("🔍 iframe:", iframes.length);

            iframes.forEach((iframe, i) => {
              try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const iframeImgs = Array.from(iframeDoc.querySelectorAll('img[src^="data:image"]'));
                console.log("🔍 iframe[" + i + "]:", iframeImgs.length);
                
                if (iframeImgs.length > 0) {
                  imgs = imgs.concat(iframeImgs);
                }
              } catch (e) {
                console.warn("⚠️ iframe[" + i + "]:", e.message);
              }
            });

            console.log("🔍 TOPLAM:", imgs.length);

            const uniqueSrcs = new Set();
            const fotograflar = [];

            for (let i = 0; i < imgs.length; i++) {
              const img = imgs[i];
              const src = img.src;

              if (uniqueSrcs.has(src)) continue;

              let name = img.alt?.trim() || "";

              if (!name && img.parentElement) {
                const parentText = img.parentElement.textContent || "";
                const lines = parentText.split('\\n');
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.length > 5 && !trimmed.includes('Sınıf') && !trimmed.includes('Şubesi')) {
                    name = trimmed;
                    break;
                  }
                }
              }

              if (!name || name.length < 5) continue;

              name = name.replace(/^\\d+-/, '').trim();

              uniqueSrcs.add(src);
              fotograflar.push({ ad_soyad: name, base64: src });
            }

            console.log("📸 TOPLAM:", fotograflar.length);

            if (fotograflar.length === 0) {
              alert("❌ Fotoğraf bulunamadı!");
              return;
            }

            const chunkSize = 5;
            for (let j = 0; j < fotograflar.length; j += chunkSize) {
              const chunk = fotograflar.slice(j, j + chunkSize);
              console.log("📸🔵FOTO_CHUNK🔵:" + JSON.stringify(chunk));
            }

            btn.textContent = "✅ " + fotograflar.length + " Gönderildi!";
            btn.style.background = "#00c853";
            setTimeout(() => {
              btn.textContent = "📸 Fotoğrafları Topla";
              btn.style.background = "linear-gradient(135deg,#ff1744,#d50000)";
            }, 3000);

          } catch (err) {
            console.error("❌", err);
            alert("Hata: " + err.message);
          }
        };

        document.body.appendChild(btn);
        console.log("✅ EKLENDI");
        return true;
      };

      createButton();

      const observer = new MutationObserver(() => {
        if (!document.getElementById("chatgptFotoTopla")) {
          createButton();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setInterval(() => {
        if (!document.getElementById("chatgptFotoTopla")) {
          createButton();
        }
      }, 500);

      return "OK";
    })();
  `;

  targetWindow.webContents
    .executeJavaScript(injectionScript)
    .then(() => {
      console.log("✅ Enjeksiyon OK");
      logger.success("Buton enjeksiyonu başarılı", {
        url: url,
        module: "eokul-photo",
      });
    })
    .catch((err) => {
      console.error("❌ Hata:", err);
      logger.error("Enjeksiyon hatası", {
        error: err.message,
        module: "eokul-photo",
      });
    });

  targetWindow.webContents.removeAllListeners("console-message");

  targetWindow.webContents.on("console-message", (event, level, message) => {
    console.log("📢 Console:", message);

    if (message.indexOf("📸🔵FOTO_CHUNK🔵:") > -1) {
      console.log("🔵 CHUNK!");

      try {
        const jsonStr = message.replace("📸🔵FOTO_CHUNK🔵:", "");
        const chunk = JSON.parse(jsonStr);

        const allWindows = BrowserWindow.getAllWindows();
        let mainWin = null;
        let minId = 999;

        for (const win of allWindows) {
          if (!win.isDestroyed() && win.id < minId) {
            const title = win.title.toLowerCase();
            if (
              title.indexOf("e-okul") === -1 &&
              title.indexOf("mebbis") === -1
            ) {
              mainWin = win;
              minId = win.id;
            }
          }
        }

        if (mainWin) {
          console.log("✅ Gönderiliyor");
          mainWin.webContents.send("mebbis-photos-parsed", chunk);
        }
      } catch (err) {
        console.error("❌ Parse:", err.message);
      }
    }
  });
}

logger.success("E-Okul Fotoğraf Sistemi yüklendi", {
  module: "eokul-photo",
});
console.log("✅ E-Okul Sistemi yüklendi (GLOBAL LISTENER)");

// ==========================================
// ✈️ GEZİ PLANLAMA SİSTEMİ - IPC HANDLERS
// ==========================================

// Tüm Geziler
ipcMain.handle("get-all-geziler", async (event) => {
  try {
    console.log("✈️ Tüm geziler getiriliyor...");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare(`
      SELECT 
        g.*,
        COUNT(DISTINCT go.id) as ogrenci_sayisi,
        COUNT(DISTINCT gog.id) as ogretmen_sayisi,
        COUNT(DISTINCT gm.id) as misafir_sayisi
      FROM geziler g
      LEFT JOIN gezi_ogrenciler go ON g.id = go.gezi_id
      LEFT JOIN gezi_ogretmenler gog ON g.id = gog.gezi_id
      LEFT JOIN gezi_misafirler gm ON g.id = gm.gezi_id
      WHERE g.okul_id = ?
      GROUP BY g.id
      ORDER BY g.gezi_tarihi DESC
    `);

    const currentSchool = JSON.parse(
      localStorage.getItem("currentSchool") || "{}"
    );
    stmt.bind([currentSchool.id || 1]);

    const geziler = [];
    while (stmt.step()) {
      geziler.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${geziler.length} gezi bulundu`);

    return { success: true, data: geziler };
  } catch (error) {
    console.error("❌ Geziler getirme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Gezi Detay
ipcMain.handle("get-gezi-by-id", async (event, geziId) => {
  try {
    console.log("📋 Gezi detayı getiriliyor, ID:", geziId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare("SELECT * FROM geziler WHERE id = ?");
    stmt.bind([parseInt(geziId)]);

    if (!stmt.step()) {
      stmt.free();
      return { success: false, message: "Gezi bulunamadı!" };
    }

    const gezi = stmt.getAsObject();
    stmt.free();

    return { success: true, data: gezi };
  } catch (error) {
    console.error("❌ Gezi detay hatası:", error);
    return { success: false, message: error.message };
  }
});

// Yeni Gezi Oluştur
ipcMain.handle("create-gezi", async (event, geziData) => {
  try {
    console.log("🆕 Yeni gezi oluşturuluyor...");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const currentSchool = JSON.parse(
      localStorage.getItem("currentSchool") || "{}"
    );

    const stmt = activeDB.prepare(`
      INSERT INTO geziler (
        okul_id, gezi_adi, duzenlenen_yer, guzergah,
        gezi_tarihi, cikis_saati, donus_tarihi, donus_saati,
        gezi_konusu, gezi_amaci, arastirma_gorevi, degerlendirme,
        gezi_turu, kafile_baskani_id, durum, olusturma_tarihi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run([
      currentSchool.id || 1,
      geziData.gezi_adi,
      geziData.duzenlenen_yer,
      geziData.guzergah,
      geziData.gezi_tarihi,
      geziData.cikis_saati,
      geziData.donus_tarihi,
      geziData.donus_saati,
      geziData.gezi_konusu,
      geziData.gezi_amaci,
      geziData.arastirma_gorevi || null,
      geziData.degerlendirme || null,
      geziData.gezi_turu,
      geziData.kafile_baskani_id,
      geziData.durum || "planlanan",
    ]);

    const lastInsertId = activeDB.exec("SELECT last_insert_rowid() as id")[0]
      .values[0][0];
    stmt.free();

    db.saveActiveSchoolDB();

    console.log("✅ Gezi oluşturuldu, ID:", lastInsertId);

    return {
      success: true,
      id: lastInsertId,
      message: "Gezi başarıyla oluşturuldu!",
    };
  } catch (error) {
    console.error("❌ Gezi oluşturma hatası:", error);
    return { success: false, message: error.message };
  }
});

// Gezi Güncelle
ipcMain.handle("update-gezi", async (event, geziId, geziData) => {
  try {
    console.log("✏️ Gezi güncelleniyor, ID:", geziId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare(`
      UPDATE geziler SET
        gezi_adi = ?,
        duzenlenen_yer = ?,
        guzergah = ?,
        gezi_tarihi = ?,
        cikis_saati = ?,
        donus_tarihi = ?,
        donus_saati = ?,
        gezi_konusu = ?,
        gezi_amaci = ?,
        arastirma_gorevi = ?,
        degerlendirme = ?,
        gezi_turu = ?,
        kafile_baskani_id = ?,
        durum = ?
      WHERE id = ?
    `);

    stmt.run([
      geziData.gezi_adi,
      geziData.duzenlenen_yer,
      geziData.guzergah,
      geziData.gezi_tarihi,
      geziData.cikis_saati,
      geziData.donus_tarihi,
      geziData.donus_saati,
      geziData.gezi_konusu,
      geziData.gezi_amaci,
      geziData.arastirma_gorevi,
      geziData.degerlendirme,
      geziData.gezi_turu,
      geziData.kafile_baskani_id,
      geziData.durum || "planlanan",
      parseInt(geziId),
    ]);

    stmt.free();
    db.saveActiveSchoolDB();

    console.log("✅ Gezi güncellendi");

    return { success: true, message: "Gezi başarıyla güncellendi!" };
  } catch (error) {
    console.error("❌ Gezi güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Gezi Sil
ipcMain.handle("delete-gezi", async (event, geziId) => {
  try {
    console.log("🗑️ Gezi siliniyor, ID:", geziId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    // İlişkili kayıtları sil
    activeDB.run("DELETE FROM gezi_ogrenciler WHERE gezi_id = ?", [
      parseInt(geziId),
    ]);
    activeDB.run("DELETE FROM gezi_ogretmenler WHERE gezi_id = ?", [
      parseInt(geziId),
    ]);
    activeDB.run("DELETE FROM gezi_misafirler WHERE gezi_id = ?", [
      parseInt(geziId),
    ]);

    // Geziyi sil
    activeDB.run("DELETE FROM geziler WHERE id = ?", [parseInt(geziId)]);

    db.saveActiveSchoolDB();

    console.log("✅ Gezi silindi");

    return { success: true, message: "Gezi başarıyla silindi!" };
  } catch (error) {
    console.error("❌ Gezi silme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Öğrenci Ekle
ipcMain.handle("add-gezi-ogrenci", async (event, geziId, ogrenciId) => {
  try {
    console.log("👨‍🎓 Geziye öğrenci ekleniyor...");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare(`
      INSERT INTO gezi_ogrenciler (gezi_id, ogrenci_id)
      VALUES (?, ?)
    `);

    stmt.run([parseInt(geziId), parseInt(ogrenciId)]);
    stmt.free();

    db.saveActiveSchoolDB();

    console.log("✅ Öğrenci eklendi");

    return { success: true, message: "Öğrenci eklendi!" };
  } catch (error) {
    console.error("❌ Öğrenci ekleme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Öğrenci Çıkar
ipcMain.handle("remove-gezi-ogrenci", async (event, geziId, ogrenciId) => {
  try {
    console.log("🗑️ Geziden öğrenci çıkarılıyor...");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    activeDB.run(
      "DELETE FROM gezi_ogrenciler WHERE gezi_id = ? AND ogrenci_id = ?",
      [parseInt(geziId), parseInt(ogrenciId)]
    );

    db.saveActiveSchoolDB();

    console.log("✅ Öğrenci çıkarıldı");

    return { success: true, message: "Öğrenci çıkarıldı!" };
  } catch (error) {
    console.error("❌ Öğrenci çıkarma hatası:", error);
    return { success: false, message: error.message };
  }
});

// Gezi Öğrencileri Getir
ipcMain.handle("get-gezi-ogrenciler", async (event, geziId) => {
  try {
    console.log("📋 Gezi öğrencileri getiriliyor...");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare(`
      SELECT o.* 
      FROM ogrenciler o
      INNER JOIN gezi_ogrenciler go ON o.id = go.ogrenci_id
      WHERE go.gezi_id = ?
    `);

    stmt.bind([parseInt(geziId)]);

    const ogrenciler = [];
    while (stmt.step()) {
      ogrenciler.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${ogrenciler.length} öğrenci bulundu`);

    return { success: true, data: ogrenciler };
  } catch (error) {
    console.error("❌ Öğrenci listeleme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Öğretmen Ekle
ipcMain.handle(
  "add-gezi-ogretmen",
  async (event, geziId, ogretmenId, gorev) => {
    try {
      console.log("👨‍🏫 Geziye öğretmen ekleniyor...");

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
      INSERT INTO gezi_ogretmenler (gezi_id, ogretmen_id, gorev)
      VALUES (?, ?, ?)
    `);

      stmt.run([
        parseInt(geziId),
        parseInt(ogretmenId),
        gorev || "Sorumlu Öğretmen",
      ]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Öğretmen eklendi");

      return { success: true, message: "Öğretmen eklendi!" };
    } catch (error) {
      console.error("❌ Öğretmen ekleme hatası:", error);
      return { success: false, message: error.message };
    }
  }
);

// Misafir Ekle
ipcMain.handle("add-gezi-misafir", async (event, geziId, misafirData) => {
  try {
    console.log("🧑 Geziye misafir ekleniyor...");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const stmt = activeDB.prepare(`
      INSERT INTO gezi_misafirler (gezi_id, ad_soyad, tc_no, cinsiyet, telefon)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run([
      parseInt(geziId),
      misafirData.ad_soyad,
      misafirData.tc_no,
      misafirData.cinsiyet,
      misafirData.telefon || null,
    ]);
    stmt.free();

    db.saveActiveSchoolDB();

    console.log("✅ Misafir eklendi");

    return { success: true, message: "Misafir eklendi!" };
  } catch (error) {
    console.error("❌ Misafir ekleme hatası:", error);
    return { success: false, message: error.message };
  }
});

// Gezi İstatistikleri
ipcMain.handle("get-gezi-stats", async (event) => {
  try {
    console.log("📊 Gezi istatistikleri hesaplanıyor...");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    const currentSchool = JSON.parse(
      localStorage.getItem("currentSchool") || "{}"
    );

    const stmt = activeDB.prepare(`
      SELECT 
        COUNT(*) as toplam,
        SUM(CASE WHEN durum = 'aktif' THEN 1 ELSE 0 END) as aktif,
        SUM(CASE WHEN durum = 'tamamlanan' THEN 1 ELSE 0 END) as tamamlanan
      FROM geziler
      WHERE okul_id = ?
    `);

    stmt.bind([currentSchool.id || 1]);

    let stats = {};
    if (stmt.step()) {
      stats = stmt.getAsObject();
    }
    stmt.free();

    console.log("✅ İstatistikler hesaplandı");

    return { success: true, data: stats };
  } catch (error) {
    console.error("❌ İstatistik hatası:", error);
    return { success: false, message: error.message };
  }
});
// ==========================================
// GEZİ FİRMA YÖNETİMİ (DÜZELTİLMİŞ + EKSİK HANDLER'LAR EKLENDİ)
// ==========================================

// Firma Kaydet
ipcMain.handle("firma-kaydet", async (event, geziId, firmaData) => {
  try {
    console.log("💾 Firma kaydediliyor, Gezi ID:", geziId);
    console.log("📊 Firma Data:", JSON.stringify(firmaData, null, 2));
    logger.info("Firma kaydediliyor", {
      geziId: geziId,
      firmaAdi: firmaData.firma_adi,
      module: "gezi-firma",
    });

    const schoolDb = db.getActiveSchoolDB();
    if (!schoolDb) {
      console.error("❌ Okul veritabanı bulunamadı");
      logger.error("Okul veritabanı bulunamadı", { module: "gezi-firma" });
      return { success: false, message: "Okul veritabanı bulunamadı" };
    }

    console.log("✅ Okul DB bulundu");

    // Mevcut kayıt var mı kontrol et
    const checkStmt = schoolDb.prepare(
      "SELECT id FROM gezi_tur_firma WHERE gezi_id = ?"
    );
    checkStmt.bind([parseInt(geziId)]);

    let mevcutId = null;
    if (checkStmt.step()) {
      const row = checkStmt.getAsObject();
      mevcutId = row.id;
      console.log("🔍 Mevcut firma bulundu, ID:", mevcutId);
    } else {
      console.log("🆕 Mevcut firma yok, yeni kayıt oluşturulacak");
    }
    checkStmt.free();

    if (mevcutId) {
      // GÜNCELLEME
      console.log("🔄 Güncelleme başlıyor...");

      const updateStmt = schoolDb.prepare(`
        UPDATE gezi_tur_firma SET
          firma_adi = ?, yetkili_ad_soyad = ?, yetkili_unvan = ?, yetkili_telefon = ?,
          firma_telefon = ?, firma_adres = ?, firma_email = ?,
          vergi_dairesi = ?, vergi_no = ?, tursab_no = ?, isletme_belge_no = ?,
          yetki_belgesi = ?, rehber_ad = ?, rehber_kokart = ?,
          sozlesme_tarihi = ?, toplam_bedel = ?, para_birimi = ?,
          dahil_hizmetler = ?, dahil_olmayan = ?, iptal_kosul = ?, notlar = ?
        WHERE id = ?
      `);

      console.log("📝 SQL Parametreleri hazırlanıyor...");

      updateStmt.run([
        firmaData.firma_adi || null,
        firmaData.yetkili_ad_soyad || null,
        firmaData.yetkili_unvan || null,
        firmaData.yetkili_telefon || null,
        firmaData.firma_telefon || null,
        firmaData.firma_adres || null,
        firmaData.firma_email || null,
        firmaData.vergi_dairesi || null,
        firmaData.vergi_no || null,
        firmaData.tursab_no || null,
        firmaData.isletme_belge_no || null,
        firmaData.yetki_belgesi || null,
        firmaData.rehber_ad || null,
        firmaData.rehber_kokart || null,
        firmaData.sozlesme_tarihi || null,
        firmaData.toplam_bedel || null,
        firmaData.para_birimi || "TRY",
        firmaData.dahil_hizmetler || null,
        firmaData.dahil_olmayan || null,
        firmaData.iptal_kosul || null,
        firmaData.notlar || null,
        parseInt(mevcutId),
      ]);

      console.log("✅ UPDATE çalıştırıldı");
      updateStmt.free();

      console.log("💾 Veritabanı kaydediliyor...");
      const saveResult = db.saveActiveSchoolDB();
      console.log("💾 Kayıt sonucu:", saveResult);

      console.log("✅ Firma güncellendi, ID:", mevcutId);
      logger.success("Firma güncellendi", {
        firmaId: mevcutId,
        module: "gezi-firma",
      });

      return {
        success: true,
        message: "Firma başarıyla güncellendi!",
        id: mevcutId,
      };
    } else {
      // YENİ KAYIT
      console.log("🆕 Yeni kayıt başlıyor...");

      const insertStmt = schoolDb.prepare(`
        INSERT INTO gezi_tur_firma 
          (gezi_id, firma_adi, yetkili_ad_soyad, yetkili_unvan, yetkili_telefon,
           firma_telefon, firma_adres, firma_email, vergi_dairesi, vergi_no,
           tursab_no, isletme_belge_no, yetki_belgesi, rehber_ad, rehber_kokart,
           sozlesme_tarihi, toplam_bedel, para_birimi, dahil_hizmetler,
           dahil_olmayan, iptal_kosul, notlar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      console.log("📝 INSERT parametreleri hazırlanıyor...");

      insertStmt.run([
        parseInt(geziId),
        firmaData.firma_adi || null,
        firmaData.yetkili_ad_soyad || null,
        firmaData.yetkili_unvan || null,
        firmaData.yetkili_telefon || null,
        firmaData.firma_telefon || null,
        firmaData.firma_adres || null,
        firmaData.firma_email || null,
        firmaData.vergi_dairesi || null,
        firmaData.vergi_no || null,
        firmaData.tursab_no || null,
        firmaData.isletme_belge_no || null,
        firmaData.yetki_belgesi || null,
        firmaData.rehber_ad || null,
        firmaData.rehber_kokart || null,
        firmaData.sozlesme_tarihi || null,
        firmaData.toplam_bedel || null,
        firmaData.para_birimi || "TRY",
        firmaData.dahil_hizmetler || null,
        firmaData.dahil_olmayan || null,
        firmaData.iptal_kosul || null,
        firmaData.notlar || null,
      ]);

      console.log("✅ INSERT çalıştırıldı");
      insertStmt.free();

      // Son eklenen ID
      const lastIdStmt = schoolDb.prepare("SELECT last_insert_rowid() as id");
      lastIdStmt.step();
      const lastIdRow = lastIdStmt.getAsObject();
      const lastInsertId = lastIdRow.id;
      lastIdStmt.free();

      console.log("✅ Yeni firma ID:", lastInsertId);

      console.log("💾 Veritabanı kaydediliyor...");
      const saveResult = db.saveActiveSchoolDB();
      console.log("💾 Kayıt sonucu:", saveResult);

      console.log("✅ Yeni firma eklendi, ID:", lastInsertId);
      logger.success("Yeni firma eklendi", {
        firmaId: lastInsertId,
        module: "gezi-firma",
      });

      return {
        success: true,
        message: "Firma başarıyla kaydedildi!",
        id: lastInsertId,
      };
    }
  } catch (error) {
    console.error("❌ Firma kaydetme hatası:", error);
    console.error("❌ Hata detayı:", error.message);
    console.error("❌ Stack:", error.stack);
    logger.error("Firma kaydetme hatası", {
      error: error.message,
      stack: error.stack,
      module: "gezi-firma",
    });
    return { success: false, message: error.message };
  }
});

// Firma Getir
ipcMain.handle("firma-getir", async (event, geziId) => {
  try {
    console.log("📋 Firma bilgileri getiriliyor, Gezi ID:", geziId);
    logger.info("Firma bilgileri getiriliyor", {
      geziId: geziId,
      module: "gezi-firma",
    });

    const schoolDb = db.getActiveSchoolDB();
    if (!schoolDb) {
      console.error("❌ Okul veritabanı bulunamadı");
      logger.error("Okul veritabanı bulunamadı", { module: "gezi-firma" });
      return { success: false, message: "Okul veritabanı bulunamadı" };
    }

    console.log("✅ Okul DB bulundu");

    const stmt = schoolDb.prepare(
      "SELECT * FROM gezi_tur_firma WHERE gezi_id = ?"
    );
    stmt.bind([parseInt(geziId)]);

    const firmalar = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      firmalar.push(row);
      console.log("🏢 Firma bulundu:", row.firma_adi);
    }
    stmt.free();

    console.log(`✅ ${firmalar.length} firma bulundu`);
    logger.success("Firma bilgileri getirildi", {
      geziId: geziId,
      firmaSayisi: firmalar.length,
      module: "gezi-firma",
    });

    return { success: true, data: firmalar };
  } catch (error) {
    console.error("❌ Firma getirme hatası:", error);
    console.error("❌ Hata detayı:", error.message);
    console.error("❌ Stack:", error.stack);
    logger.error("Firma getirme hatası", {
      error: error.message,
      stack: error.stack,
      module: "gezi-firma",
    });
    return { success: false, message: error.message };
  }
});

// Firma Sil
ipcMain.handle("firma-sil", async (event, firmaId) => {
  try {
    console.log("🗑️ Firma siliniyor, ID:", firmaId);
    logger.info("Firma siliniyor", {
      firmaId: firmaId,
      module: "gezi-firma",
    });

    const schoolDb = db.getActiveSchoolDB();
    if (!schoolDb) {
      console.error("❌ Okul veritabanı bulunamadı");
      logger.error("Okul veritabanı bulunamadı", { module: "gezi-firma" });
      return { success: false, message: "Okul veritabanı bulunamadı" };
    }

    const stmt = schoolDb.prepare("DELETE FROM gezi_tur_firma WHERE id = ?");
    stmt.run([parseInt(firmaId)]);
    stmt.free();

    db.saveActiveSchoolDB();

    console.log("✅ Firma silindi");
    logger.success("Firma silindi", {
      firmaId: firmaId,
      module: "gezi-firma",
    });

    return { success: true, message: "Firma başarıyla silindi!" };
  } catch (error) {
    console.error("❌ Firma silme hatası:", error);
    console.error("❌ Hata detayı:", error.message);
    logger.error("Firma silme hatası", {
      error: error.message,
      stack: error.stack,
      module: "gezi-firma",
    });
    return { success: false, message: error.message };
  }
});

logger.success("Gezi Firma Yönetimi IPC handlers yüklendi", {
  module: "gezi-firma",
});
console.log("✅ Gezi Firma Yönetimi IPC handlers yüklendi");

// =================================================================
// 🚀 GENEL VERİTABANI VE DOSYA İŞLEM KANALLARI (DB-QUERY & UPLOAD)
// =================================================================

/**
 * Frontend tarafındaki window.electronAPI.dbQuery çağrılarını karşılar.
 * Araç kaydetme, konaklama ve diğer tüm dinamik SQL işlemleri buradan geçer.
 */
ipcMain.handle("db-query", async (event, sql, params = []) => {
  try {
    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      console.error("❌ DB-QUERY HATASI: Aktif veritabanı seçilmemiş.");
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    console.log("📡 SQL Yürütülüyor:", sql);
    console.log("🔢 Parametreler:", params);

    // Sorgu tipi kontrolü (SELECT mi yoksa INSERT/UPDATE/DELETE mi?)
    const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

    if (isSelect) {
      // SELECT İŞLEMİ
      const stmt = activeDB.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }

      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();

      return { success: true, data: results };
    } else {
      // INSERT, UPDATE, DELETE İŞLEMİ
      activeDB.run(sql, params);

      // Her yazma işleminden sonra fiziksel dosyaya kaydet (Kritik!)
      db.saveActiveSchoolDB();

      return { success: true, message: "İşlem başarıyla tamamlandı." };
    }
  } catch (error) {
    console.error("❌ Veritabanı Sorgu Hatası:", error);
    return {
      success: false,
      message: error.message,
      detail: "Sorgu yürütülürken bir hata oluştu.",
    };
  }
});

/**
 * Manuel kayıt gerektiğinde kullanılır.
 */
ipcMain.handle("db-save", async () => {
  try {
    db.saveActiveSchoolDB();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// ==========================================
// 📁 DOSYA YÜKLEME SİSTEMİ (Düzeltilmiş)
// ==========================================

// BURADA TEKRAR require("fs") YAPMIYORUZ, ÇÜNKÜ EN ÜSTTE VAR!

ipcMain.handle("upload-file", async (event, fileData) => {
  try {
    console.log("📁 Dosya yükleniyor:", fileData.name);

    // Dosya kayıt klasörü (os, path ve fs yukarıda tanımlı olduğu için doğrudan kullanıyoruz)
    const uploadDir = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Belgeler",
      "GeziDosyalari"
    );

    // Klasör yoksa oluştur
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log("✅ Dosya klasörü oluşturuldu:", uploadDir);
    }

    // Benzersiz dosya adı oluştur
    const timestamp = Date.now();
    const extension = path.extname(fileData.name);
    const baseName = path.basename(fileData.name, extension);
    const uniqueName = `${baseName}_${timestamp}${extension}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Base64 veriyi temizle ve Buffer'a çevir
    const base64Data = fileData.data.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    // Dosyayı diske yaz
    fs.writeFileSync(filePath, buffer);

    console.log("✅ Dosya başarıyla kaydedildi:", filePath);

    return {
      success: true,
      filePath: filePath,
      fileName: uniqueName,
    };
  } catch (error) {
    console.error("❌ Dosya yükleme hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

ipcMain.handle("open-file", async (event, filePath) => {
  try {
    const { shell } = require("electron");
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// ==========================================
// 🎉 FINAL LOG
// ==========================================

console.log("=".repeat(60));
console.log("🎉 TÜM IPC HANDLER'LAR YÜKLENDİ!");
console.log("=".repeat(60));
console.log("📦 Versiyon: 3.0.0");
console.log("📅 Yıl: 2025");
console.log("👨‍💻 Geliştirici: SİMRE/MK");
console.log("🚀 Türkiye'nin İlk Yapay Zeka Destekli Okul Yönetim Sistemi");
console.log("=".repeat(60));
console.log("✅ Toplam Handler Kategorisi: 15+");
console.log("✅ Toplam IPC Endpoint: 150+");
console.log("✅ Algoritma Entegrasyonu: AKTİF");
console.log("✅ MEBBİS/E-Okul Entegrasyonu: AKTİF");
console.log("✅ PDF/Excel Export: AKTİF");
console.log("✅ Veritabanı Sistemi: AKTİF");
console.log("=".repeat(60));
