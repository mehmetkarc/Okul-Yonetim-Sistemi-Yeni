const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const net = require("net");
const downloadsWatcher = require("./src/downloads-watcher");
const mebbisEntegrasyon = require("./mebbis-entegrasyon");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const db = require("./src/veritabani/veritabani"); // ✅ EN BAŞA TAŞINDI
const puppeteer = require("puppeteer");
const os = require("os");

let mainWindow;
let updateAvailable = false;

// ==========================================
// NATIVE MESSAGING TCP SERVER
// ==========================================

let tcpServer = null;

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

// Uygulama yolu (exe için düzeltme)
const isDev = !app.isPackaged;
const appPath = isDev ? __dirname : path.dirname(app.getPath("exe"));

console.log("📁 Uygulama Yolu:", appPath);
console.log("🔧 Geliştirme Modu:", isDev);

// Ana pencere oluştur
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
    },
    show: false,
    backgroundColor: "#ffffff",
  });

  mainWindow.loadFile("src/sayfalar/giris.html");

  // Pencere hazır olunca göster
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize();

    // Güncelleme kontrolü (5 saniye sonra)
    setTimeout(() => {
      checkForUpdates();
    }, 5000);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Geliştirme modunda DevTools aç
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }
}

// Uygulama hazır
app.whenReady().then(async () => {
  // Native Messaging sunucusunu başlat
  startNativeMessagingServer();

  // Önce veritabanını başlat
  const dbReady = await db.initDatabase();
  if (!dbReady) {
    dialog.showErrorBox(
      "Veritabanı Hatası",
      "Veritabanı başlatılamadı! Uygulama kapatılıyor."
    );
    app.quit();
    return;
  }

  // Downloads klasörünü izlemeye başla
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
});

// Tüm pencereler kapalı
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Uygulama kapanırken TCP sunucusunu kapat
app.on("will-quit", () => {
  if (tcpServer) {
    tcpServer.close();
    console.log("✅ TCP Server kapatıldı");
  }

  // Downloads watcher'ı durdur
  downloadsWatcher.stopWatching();
});

// ============================================
// OTOMATIK GÜNCELLEME SİSTEMİ
// ============================================

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Güncelleme kontrolü
function checkForUpdates() {
  if (isDev) {
    console.log("⚠️ Geliştirme modunda, güncelleme kontrolü yapılmıyor");
    return;
  }

  console.log("🔍 Güncelleme kontrol ediliyor...");
  autoUpdater.checkForUpdates();
}

// Güncelleme bulundu
autoUpdater.on("update-available", (info) => {
  console.log("✅ Yeni güncelleme bulundu:", info.version);
  updateAvailable = true;

  if (mainWindow) {
    mainWindow.webContents.send("update-available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  }
});

// Güncelleme yok
autoUpdater.on("update-not-available", () => {
  console.log("✅ Uygulama güncel");
  updateAvailable = false;
});

// Güncelleme indiriliyor
autoUpdater.on("download-progress", (progress) => {
  console.log(`📥 İndiriliyor: ${Math.floor(progress.percent)}%`);

  if (mainWindow) {
    mainWindow.webContents.send("update-progress", {
      percent: Math.floor(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  }
});

// Güncelleme indirildi
autoUpdater.on("update-downloaded", (info) => {
  console.log("✅ Güncelleme indirildi, yükleniyor...");

  if (mainWindow) {
    mainWindow.webContents.send("update-downloaded", info);
  }

  // 3 saniye sonra kur ve yeniden başlat
  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true);
  }, 3000);
});

// Güncelleme hatası
autoUpdater.on("error", (error) => {
  console.error("❌ Güncelleme hatası:", error);

  if (mainWindow) {
    mainWindow.webContents.send("update-error", error.message);
  }
});

// Manuel güncelleme başlat
ipcMain.handle("start-update-download", async () => {
  if (updateAvailable) {
    console.log("📥 Güncelleme indirmeye başlanıyor...");
    autoUpdater.downloadUpdate();
    return { success: true };
  } else {
    return { success: false, message: "Yeni güncelleme bulunamadı" };
  }
});

// Manuel güncelleme kontrolü
ipcMain.handle("check-for-updates", async () => {
  checkForUpdates();
  return { success: true };
});

// ============================================
// VERİTABANI VE DİĞER IPC HANDLER'LAR
// ============================================

// Uygulama yolunu frontend'e gönder
ipcMain.handle("get-app-path", () => {
  return appPath;
});

// Uygulama versiyonunu gönder
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("debug-student-names", async () => {
  try {
    const schoolDB = db.getActiveSchoolDB();
    // ✅ LIMIT KALDIRILDI - TÜM ÖĞRENCİLER
    const stmt = schoolDB.prepare(
      "SELECT okul_no, ad_soyad FROM ogrenciler WHERE durum = 1"
    );
    const students = [];
    while (stmt.step()) {
      const s = stmt.getAsObject();

      // ✅ AYNI NORMALİZASYON FONKSİYONU
      const normalized = s.ad_soyad
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
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

      students.push({
        okul_no: s.okul_no,
        original: s.ad_soyad,
        normalized: normalized,
      });
    }
    stmt.free();
    return students;
  } catch (err) {
    return { error: err.message };
  }
});

console.log("🚀 Okul Yönetim Sistemi başlatıldı");
console.log("📦 Versiyon:", app.getVersion());

// ============================================
// VERİTABANI IPC HANDLER'LARI
// ============================================

// Giriş işlemi
ipcMain.handle("login", async (event, okulKodu, kullaniciAdi, sifre) => {
  try {
    console.log("🔐 Giriş isteği:", okulKodu, kullaniciAdi);

    if (!okulKodu || !kullaniciAdi || !sifre) {
      return {
        success: false,
        message: "Tüm alanları doldurunuz!",
      };
    }

    const result = await db.loginSchool(okulKodu, kullaniciAdi, sifre);
    return result;
  } catch (error) {
    console.error("❌ Giriş handler hatası:", error);
    return {
      success: false,
      message: "Giriş sırasında bir hata oluştu!",
    };
  }
});

// Yeni okul oluştur (sadece super admin)
ipcMain.handle("create-school", async (event, okulBilgileri) => {
  try {
    console.log("🏫 Yeni okul oluşturma isteği");

    // Zorunlu alanlar kontrolü
    if (!okulBilgileri.okul_kodu || !okulBilgileri.okul_adi) {
      return {
        success: false,
        message: "Okul kodu ve okul adı zorunludur!",
      };
    }

    const result = await db.createSchool(okulBilgileri);
    return result;
  } catch (error) {
    console.error("❌ Okul oluşturma handler hatası:", error);
    return {
      success: false,
      message: "Okul oluşturulurken bir hata oluştu!",
    };
  }
});

// Tüm okulları getir (sadece super admin)
ipcMain.handle("get-all-schools", async () => {
  try {
    const result = db.getAllSchools();
    return result;
  } catch (error) {
    console.error("❌ Okul listesi handler hatası:", error);
    return {
      success: false,
      message: "Okul listesi alınırken hata oluştu!",
    };
  }
});

ipcMain.handle("execute-sql", async (event, sql) => {
  try {
    const schoolDB = db.getActiveSchoolDB();
    const stmt = schoolDB.prepare(sql);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    return { error: err.message };
  }
});

// Genel SQL sorgusu (dikkatli kullan)
ipcMain.handle("db-query", async (event, sql, params = []) => {
  try {
    const activeDB = db.getActiveSchoolDB();

    if (!activeDB) {
      return {
        success: false,
        message: "Aktif veritabanı yok!",
      };
    }

    const stmt = activeDB.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return { success: true, data: results };
  } catch (error) {
    console.error("❌ SQL sorgu hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// SQL çalıştır (INSERT, UPDATE, DELETE)
ipcMain.handle("db-exec", async (event, sql, params = []) => {
  try {
    const activeDB = db.getActiveSchoolDB();

    if (!activeDB) {
      return {
        success: false,
        message: "Aktif veritabanı yok!",
      };
    }

    if (params.length > 0) {
      const stmt = activeDB.prepare(sql);
      stmt.run(params);
      stmt.free();
    } else {
      activeDB.run(sql);
    }

    db.saveActiveSchoolDB();

    return { success: true, message: "İşlem başarılı" };
  } catch (error) {
    console.error("❌ SQL exec hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

// Veritabanı yollarını getir
ipcMain.handle("get-db-paths", () => {
  return {
    veritabaniKlasoru: db.veritabaniKlasoru,
    yedekKlasoru: db.yedekKlasoru,
  };
});

// Okul güncelle
ipcMain.handle("update-school", async (event, okulId, guncelBilgiler) => {
  try {
    console.log("✏️ Okul güncelleme isteği:", okulId);
    console.log("📝 Güncel bilgiler:", guncelBilgiler);

    const masterDB = db.getMasterDB();
    if (!masterDB) {
      return { success: false, message: "Veritabanı bulunamadı!" };
    }

    // Okul var mı kontrol et
    const checkStmt = masterDB.prepare("SELECT id FROM okullar WHERE id = ?");
    checkStmt.bind([parseInt(okulId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Okul bulunamadı!" };
    }
    checkStmt.free();

    // Güncelleme SQL'i oluştur
    const updateFields = [];
    const values = [];

    if (guncelBilgiler.okul_adi !== undefined) {
      updateFields.push("okul_adi = ?");
      values.push(guncelBilgiler.okul_adi);
    }
    if (guncelBilgiler.il !== undefined) {
      updateFields.push("il = ?");
      values.push(guncelBilgiler.il);
    }
    if (guncelBilgiler.ilce !== undefined) {
      updateFields.push("ilce = ?");
      values.push(guncelBilgiler.ilce);
    }
    if (guncelBilgiler.yetkili_ad !== undefined) {
      updateFields.push("yetkili_ad = ?");
      values.push(guncelBilgiler.yetkili_ad);
    }
    if (guncelBilgiler.yetkili_unvan !== undefined) {
      updateFields.push("yetkili_unvan = ?");
      values.push(guncelBilgiler.yetkili_unvan);
    }
    if (guncelBilgiler.adres !== undefined) {
      updateFields.push("adres = ?");
      values.push(guncelBilgiler.adres);
      console.log("📍 Adres güncelleniyor:", guncelBilgiler.adres);
    }
    if (guncelBilgiler.telefon !== undefined) {
      updateFields.push("telefon = ?");
      values.push(guncelBilgiler.telefon);
    }
    if (guncelBilgiler.email !== undefined) {
      updateFields.push("email = ?");
      values.push(guncelBilgiler.email);
    }

    // Güncelleme tarihi ekle
    updateFields.push("guncelleme_tarihi = ?");
    values.push(new Date().toISOString());

    values.push(parseInt(okulId));

    const sql = `UPDATE okullar SET ${updateFields.join(", ")} WHERE id = ?`;

    console.log("🔧 SQL:", sql);
    console.log("📦 Values:", values);

    const stmt = masterDB.prepare(sql);
    stmt.run(values);
    stmt.free();

    db.saveMasterDB();

    console.log("✅ Okul başarıyla güncellendi");

    return {
      success: true,
      message: "Okul başarıyla güncellendi!",
    };
  } catch (error) {
    console.error("❌ Okul güncelleme hatası:", error);
    return {
      success: false,
      message: "Güncelleme sırasında hata oluştu: " + error.message,
    };
  }
});

// Okul sil
ipcMain.handle("delete-school", async (event, okulId) => {
  try {
    console.log("🗑️ Okul silme isteği:", okulId);

    const masterDB = db.getMasterDB();
    if (!masterDB) {
      return { success: false, message: "Veritabanı bulunamadı!" };
    }

    // Okul var mı ve veritabanı dosyası adını al
    const checkStmt = masterDB.prepare(
      "SELECT veritabani_dosyasi, okul_adi FROM okullar WHERE id = ?"
    );
    checkStmt.bind([parseInt(okulId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Okul bulunamadı!" };
    }

    const row = checkStmt.getAsObject();
    const dbFileName = row.veritabani_dosyasi;
    const okulAdi = row.okul_adi;
    checkStmt.free();

    console.log(`🔍 Silinecek okul: ${okulAdi} (${dbFileName})`);

    // Master DB'den okulu sil (soft delete)
    const deleteStmt = masterDB.prepare(
      "UPDATE okullar SET durum = 0, guncelleme_tarihi = ? WHERE id = ?"
    );
    deleteStmt.run([new Date().toISOString(), parseInt(okulId)]);
    deleteStmt.free();

    db.saveMasterDB();

    console.log("✅ Okul silindi (soft delete - durum=0)");
    console.log("📊 Artık getAllSchools() bu okulu getirmeyecek");

    // Okul veritabanı dosyasını sil (opsiyonel - yorum satırında bırakıyorum)
    // const dbPath = path.join(db.veritabaniKlasoru, dbFileName);
    // if (fs.existsSync(dbPath)) {
    //   fs.unlinkSync(dbPath);
    //   console.log("🗑️ Veritabanı dosyası da silindi:", dbFileName);
    // }

    return {
      success: true,
      message: "Okul başarıyla silindi!",
    };
  } catch (error) {
    console.error("❌ Okul silme hatası:", error);
    return {
      success: false,
      message: "Silme sırasında hata oluştu: " + error.message,
    };
  }
});

// Lisans yenile
ipcMain.handle("renew-license", async (event, okulId, yilSayisi) => {
  try {
    console.log("🔑 Lisans yenileme isteği:", okulId, yilSayisi);

    const masterDB = db.getMasterDB();
    if (!masterDB) {
      return { success: false, message: "Veritabanı bulunamadı!" };
    }

    // Mevcut lisans bitiş tarihini al
    const getStmt = masterDB.prepare(
      "SELECT lisans_bitis FROM okullar WHERE id = ?"
    );
    getStmt.bind([parseInt(okulId)]);

    if (!getStmt.step()) {
      getStmt.free();
      return { success: false, message: "Okul bulunamadı!" };
    }

    const row = getStmt.getAsObject();
    const mevcutBitis = new Date(row.lisans_bitis);
    getStmt.free();

    // Yeni bitiş tarihini hesapla
    const yeniBitis = new Date(mevcutBitis);
    yeniBitis.setFullYear(yeniBitis.getFullYear() + parseInt(yilSayisi));

    // Güncelle
    const updateStmt = masterDB.prepare(
      "UPDATE okullar SET lisans_bitis = ?, guncelleme_tarihi = ? WHERE id = ?"
    );
    updateStmt.run([
      yeniBitis.toISOString(),
      new Date().toISOString(),
      parseInt(okulId),
    ]);
    updateStmt.free();

    db.saveMasterDB();

    console.log("✅ Lisans yenilendi:", yeniBitis.toLocaleDateString("tr-TR"));

    return {
      success: true,
      message: "Lisans başarıyla yenilendi!",
      yeni_bitis: yeniBitis.toLocaleDateString("tr-TR"),
    };
  } catch (error) {
    console.error("❌ Lisans yenileme hatası:", error);
    return {
      success: false,
      message: "Yenileme sırasında hata oluştu: " + error.message,
    };
  }
});

// Okul şifresini göster (sadece super admin)
ipcMain.handle("get-school-password", async (event, okulId) => {
  try {
    console.log("🔑 Okul şifre görüntüleme isteği:", okulId);

    const masterDB = db.getMasterDB();
    if (!masterDB) {
      return { success: false, message: "Veritabanı bulunamadı!" };
    }

    // Okul bilgilerini al
    const stmt = masterDB.prepare(
      "SELECT okul_kodu, okul_adi, sifre, veritabani_dosyasi FROM okullar WHERE id = ?"
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
    const okulSifre = row.sifre;
    const dbFileName = row.veritabani_dosyasi;

    console.log("📁 Okul DB dosyası:", dbFileName);

    // Okul veritabanını aç ve admin şifresini al
    const dbPath = path.join(db.veritabaniKlasoru, dbFileName);

    let adminSifre = "Bulunamadı";

    if (fs.existsSync(dbPath)) {
      try {
        console.log("📂 Okul DB yolu:", dbPath);

        const initSqlJs = require("sql.js");
        const SQL = await initSqlJs();

        const dbData = fs.readFileSync(dbPath);
        const schoolDB = new SQL.Database(dbData);

        console.log("🔍 Admin kullanıcısı aranıyor...");

        const adminStmt = schoolDB.prepare(
          "SELECT sifre FROM kullanicilar WHERE kullanici_adi = 'admin' LIMIT 1"
        );

        if (adminStmt.step()) {
          const adminRow = adminStmt.getAsObject();
          adminSifre = adminRow.sifre;
          console.log("✅ Admin şifresi bulundu:", adminSifre);
        } else {
          console.log("⚠️ Admin kullanıcısı bulunamadı");

          // Tüm kullanıcıları listele (debug)
          const allUsersStmt = schoolDB.prepare("SELECT * FROM kullanicilar");
          console.log("📋 Veritabanındaki tüm kullanıcılar:");
          while (allUsersStmt.step()) {
            const user = allUsersStmt.getAsObject();
            console.log("  -", user);
          }
          allUsersStmt.free();
        }

        adminStmt.free();
        schoolDB.close();
      } catch (err) {
        console.error("❌ Admin şifre okuma hatası:", err);
        adminSifre = "Hata: " + err.message;
      }
    } else {
      console.error("❌ Okul veritabanı dosyası bulunamadı:", dbPath);
      adminSifre = "DB dosyası yok";
    }

    console.log("✅ Okul bilgileri alındı");

    return {
      success: true,
      data: {
        okul_kodu: okulKodu,
        okul_adi: okulAdi,
        okul_sifre: okulSifre,
        admin_sifre: adminSifre,
      },
    };
  } catch (error) {
    console.error("❌ Okul şifre görüntüleme hatası:", error);
    return {
      success: false,
      message: "Şifre görüntülenemedi: " + error.message,
    };
  }
});

// ============================================
// ÖĞRETMEN YÖNETİMİ IPC HANDLER'LARI
// ============================================

// Yeni öğretmen ekle
ipcMain.handle("create-teacher", async (event, ogretmenBilgileri) => {
  try {
    console.log("👨‍🏫 Yeni öğretmen ekleme isteği");

    // Zorunlu alanlar kontrolü
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

// Tüm öğretmenleri getir
ipcMain.handle("get-all-teachers", async () => {
  try {
    console.log("📋 Öğretmen listesi isteği");

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return {
        success: false,
        message: "Aktif veritabanı bulunamadı!",
        data: [],
      };
    }

    const stmt = activeDB.prepare(`
      SELECT * FROM ogretmenler 
      WHERE durum = 1 
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
    console.error("❌ Öğretmen listesi handler hatası:", error);
    return {
      success: false,
      message: "Öğretmen listesi alınırken hata oluştu!",
      data: [],
    };
  }
});

// Öğretmen güncelle
ipcMain.handle("update-teacher", async (event, ogretmenId, guncelBilgiler) => {
  try {
    console.log("✏️ Öğretmen güncelleme isteği:", ogretmenId);
    console.log("📝 Güncel bilgiler:", guncelBilgiler);

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

// Öğretmen sil
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

// Öğretmen şifresini göster
ipcMain.handle("get-teacher-password", async (event, ogretmenId) => {
  try {
    console.log("🔑 Öğretmen şifre görüntüleme isteği:", ogretmenId);

    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    // Öğretmen bilgilerini al
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

// Öğretmen şifresi sıfırla
ipcMain.handle("reset-teacher-password", async (event, ogretmenId) => {
  try {
    console.log("🔑 Öğretmen şifre sıfırlama isteği:", ogretmenId);

    // Veritabanından öğretmeni al
    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Aktif veritabanı bulunamadı!" };
    }

    // Öğretmenin kullanıcı ID'sini al
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

    // Yeni şifre oluştur
    const yeniSifre = generateRandomPassword();

    // Şifreyi güncelle
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

// Öğretmen detaylarını getir
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
      message: "Öğretmen bilgileri alınamadı: " + error.message,
    };
  }
});

// Yardımcı fonksiyon: Rastgele şifre oluştur
function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";

  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

console.log("✅ Öğretmen IPC Handler'ları yüklendi");

// ============================================
// ÖĞRENCİ YÖNETİMİ IPC HANDLER'LARI
// ============================================

// Yeni öğrenci ekle (Sadece Admin)
ipcMain.handle("create-student", async (event, ogrenciBilgileri) => {
  try {
    console.log("👨‍🎓 Yeni öğrenci ekleme isteği");

    // Zorunlu alanlar kontrolü
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

// Tüm öğrencileri getir (Admin: Tümü, Öğretmen: Sadece kendi sınıfı)
ipcMain.handle("get-all-students", async (event, kullaniciRol, ogretmenId) => {
  try {
    console.log("📋 Öğrenci listesi isteği - Rol:", kullaniciRol);

    const result = db.getAllStudents();

    if (!result.success) {
      return result;
    }

    // Eğer öğretmen ise, sadece kendi sınıflarını getir
    if (kullaniciRol === "ogretmen" && ogretmenId) {
      // Öğretmenin Rehberlik dersi verdiği sınıfları bul
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

      // Sadece bu sınıflardaki öğrencileri filtrele
      const filteredStudents = result.data.filter((ogrenci) =>
        sinifIds.includes(ogrenci.sinif_id)
      );

      console.log(
        `✅ Öğretmen için ${filteredStudents.length} öğrenci filtrelendi`
      );

      return { success: true, data: filteredStudents };
    }

    // Admin ise tümünü döndür
    return result;
  } catch (error) {
    console.error("❌ Öğrenci listesi handler hatası:", error);
    return {
      success: false,
      message: "Öğrenci listesi alınırken hata oluştu!",
    };
  }
});

// ✅ Diğer handler'lar

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

// ==========================================
// 📊 EXCEL OLUŞTUR - XLSX
// ==========================================
ipcMain.handle("create-excel", async (event, options) => {
  try {
    console.log("📊 Excel oluşturuluyor...");

    const XLSX = require("xlsx");
    const { data, fileName } = options;

    const downloadPath = path.join(os.homedir(), "Downloads", fileName);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Sütun genişliklerini ayarla
    ws["!cols"] = [
      { wch: 8 }, // S.N.
      { wch: 10 }, // Sınıfı
      { wch: 12 }, // Okul No
      { wch: 15 }, // TC Kimlik No
      { wch: 35 }, // Adı Soyadı
      { wch: 12 }, // Cinsiyeti
    ];

    // Başlık satırlarını birleştir (A1:F1, A2:F2, vb.)
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // T.C.
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Kaymakamlık
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Okul adı
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // Rapor başlığı
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

// ==========================================
// 📄 PDF OLUŞTUR - PUPPETEER
// ==========================================
ipcMain.handle("create-pdf", async (event, options) => {
  let browser = null;
  try {
    console.log("📄 PDF oluşturuluyor...");

    const { html, fileName } = options;

    // İndirilenler klasörü
    const downloadPath = path.join(os.homedir(), "Downloads", fileName);

    // Puppeteer başlat
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // HTML yükle
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // PDF oluştur
    await page.pdf({
      path: downloadPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    console.log("✅ PDF kaydedildi:", downloadPath);

    return {
      success: true,
      message: "PDF başarıyla oluşturuldu",
      path: downloadPath,
    };
  } catch (error) {
    console.error("❌ PDF hatası:", error);
    return {
      success: false,
      message: error.message,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Öğrenci güncelle (Admin: Tümü, Öğretmen: Sadece kendi sınıfı)
ipcMain.handle(
  "update-student",
  async (event, ogrenciId, guncelBilgiler, kullaniciRol, ogretmenId) => {
    try {
      console.log("✏️ Öğrenci güncelleme isteği:", ogrenciId);

      // Öğretmen ise yetki kontrolü
      if (kullaniciRol === "ogretmen" && ogretmenId) {
        const activeDB = db.getActiveSchoolDB();

        // Öğrencinin sınıfını al
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

        // Öğretmen bu sınıfta Rehberlik dersi veriyor mu?
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

// Öğrenci sil (Sadece Admin)
ipcMain.handle("delete-student", async (event, ogrenciId, kullaniciRol) => {
  try {
    console.log("🗑️ Öğrenci silme isteği:", ogrenciId);

    // Sadece admin silebilir
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

// Excel'den öğrenci içe aktar (Sadece Admin)
ipcMain.handle("import-students", async (event, ogrenciListesi) => {
  try {
    console.log("📥 Excel'den öğrenci içe aktarma isteği");

    const result = await db.importStudentsFromExcel(ogrenciListesi);
    return result;
  } catch (error) {
    console.error("❌ Öğrenci içe aktarma hatası:", error);
    return {
      success: false,
      message: "İçe aktarma sırasında hata oluştu: " + error.message,
    };
  }
});

// Öğrenci detaylarını getir
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

// Öğrenci şifresi oluştur/güncelle (Admin: Tümü, Öğretmen: Kendi sınıfı)
ipcMain.handle(
  "create-student-password",
  async (event, ogrenciId, kullaniciRol, ogretmenId) => {
    try {
      console.log("🔑 Öğrenci şifre oluşturma isteği:", ogrenciId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      // Öğretmen ise yetki kontrolü
      if (kullaniciRol === "ogretmen" && ogretmenId) {
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
            message: "Bu öğrenci için şifre oluşturma yetkiniz yok!",
          };
        }
      }

      // Öğrenci bilgilerini al
      const getStmt = activeDB.prepare(
        "SELECT tc_no, ad_soyad, okul_no FROM ogrenciler WHERE id = ?"
      );
      getStmt.bind([parseInt(ogrenciId)]);

      if (!getStmt.step()) {
        getStmt.free();
        return { success: false, message: "Öğrenci bulunamadı!" };
      }

      const ogrenci = getStmt.getAsObject();
      getStmt.free();

      // Otomatik şifre oluştur (Okul No'nun son 4 hanesi)
      const otomatikSifre = ogrenci.okul_no.slice(-4);

      // Kullanıcı hesabı var mı kontrol et
      const checkUserStmt = activeDB.prepare(
        "SELECT id FROM kullanicilar WHERE tc_no = ? OR kullanici_adi = ?"
      );
      checkUserStmt.bind([ogrenci.tc_no, ogrenci.okul_no]);

      if (checkUserStmt.step()) {
        // Var, şifreyi güncelle
        const userId = checkUserStmt.getAsObject().id;
        checkUserStmt.free();

        const updateStmt = activeDB.prepare(
          "UPDATE kullanicilar SET sifre = ? WHERE id = ?"
        );
        updateStmt.run([otomatikSifre, userId]);
        updateStmt.free();
      } else {
        // Yok, yeni kullanıcı oluştur
        checkUserStmt.free();

        const createUserStmt = activeDB.prepare(`
          INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, tc_no, rol, durum)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        createUserStmt.run([
          ogrenci.okul_no,
          otomatikSifre,
          ogrenci.ad_soyad,
          ogrenci.tc_no,
          "ogrenci",
          1,
        ]);
        createUserStmt.free();
      }

      db.saveActiveSchoolDB();

      console.log("✅ Öğrenci şifresi oluşturuldu:", otomatikSifre);

      return {
        success: true,
        message: "Öğrenci şifresi oluşturuldu!",
        data: {
          kullanici_adi: ogrenci.okul_no,
          sifre: otomatikSifre,
        },
      };
    } catch (error) {
      console.error("❌ Öğrenci şifre oluşturma hatası:", error);
      return {
        success: false,
        message: "Şifre oluşturulamadı: " + error.message,
      };
    }
  }
);

// Öğrenci şifresini göster (Admin: Tümü, Öğretmen: Kendi sınıfı)
ipcMain.handle(
  "get-student-password",
  async (event, ogrenciId, kullaniciRol, ogretmenId) => {
    try {
      console.log("👁️ Öğrenci şifre görüntüleme isteği:", ogrenciId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      // Yetki kontrolü (öğretmen için)
      if (kullaniciRol === "ogretmen" && ogretmenId) {
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
            message: "Bu öğrencinin şifresini görüntüleme yetkiniz yok!",
          };
        }
      }

      // Öğrenci şifresini al
      const stmt = activeDB.prepare(`
        SELECT o.okul_no, o.ad_soyad, k.sifre 
        FROM ogrenciler o
        LEFT JOIN kullanicilar k ON o.okul_no = k.kullanici_adi
        WHERE o.id = ?
      `);
      stmt.bind([parseInt(ogrenciId)]);

      if (!stmt.step()) {
        stmt.free();
        return { success: false, message: "Öğrenci bulunamadı!" };
      }

      const row = stmt.getAsObject();
      stmt.free();

      return {
        success: true,
        data: {
          okul_no: row.okul_no,
          ad_soyad: row.ad_soyad,
          sifre: row.sifre || "Şifre henüz oluşturulmamış",
        },
      };
    } catch (error) {
      console.error("❌ Öğrenci şifre görüntüleme hatası:", error);
      return {
        success: false,
        message: "Şifre görüntülenemedi: " + error.message,
      };
    }
  }
);

// ==========================================
// MEBBİS ENTEGRASYON - IPC HANDLERS
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

  // ✅ Frontend'e log gönder
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "backend-log",
      `📸 Backend: ${photos.length} fotoğraf alındı`
    );
  }

  function normalizeTurkish(str) {
    if (!str) return "";

    // ✅ Unicode normalization - combining characters'ı kaldır
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

    // ✅ Frontend'e gönder
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

        // ✅ Frontend'e gönder
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

        // ✅ Frontend'e gönder
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
// MEBBİS BUTON EVENTLERİ (YENİ MİMARİ)
// ==========================================

ipcMain.on("cek-ogrenci", async (event) => {
  console.log("🎯 Öğrenci çekme başlatıldı");

  try {
    const result = await mebbisEntegrasyon.parseStudentTable();

    if (result.success) {
      console.log(`✅ ${result.data.length} öğrenci bulundu`);

      // Ana pencereye gönder (modal aç)
      const mainWindow = BrowserWindow.getAllWindows().find(
        (win) => !win.title.includes("MEBBİS")
      );

      if (mainWindow) {
        mainWindow.webContents.send("mebbis-students-parsed", result.data);
      }

      // Panel penceresine bilgi gönder
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
// AUTO EXCEL IMPORT HANDLER (DÜZELTİLMİŞ)
// ==========================================

ipcMain.handle("process-auto-excel", async (event, filePath) => {
  try {
    console.log("📂 Excel dosyası işleniyor:", filePath);

    const XLSX = require("xlsx");
    const fs = require("fs");

    if (!fs.existsSync(filePath)) {
      return { success: false, message: "Dosya bulunamadı!" };
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    console.log("📊 Toplam satır:", range.e.r + 1);

    const ogrenciler = [];
    const mevcutTCler = new Set();

    // Mevcut öğrencileri al
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

    // Sınıf bilgisini bul (İLK 10 SATIRI KOMPLE TARA)
    let sinif = "";

    for (let R = 0; R < 10; R++) {
      for (let C = 0; C < 16; C++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const text = String(cell.v);
          const sinifMatch = text.match(
            /AL\s*-\s*(\d+)\.\s*Sınıf\s*\/\s*(\w+)\s*Şubesi/i
          );
          if (sinifMatch) {
            sinif = `${sinifMatch[1]}-${sinifMatch[2]}`;
            console.log(`✅ Sınıf bulundu (Satır ${R + 1}):`, sinif);
            break;
          }
        }
      }
      if (sinif) break;
    }

    if (!sinif) {
      return { success: false, message: "Sınıf bilgisi bulunamadı!" };
    }

    // ANAHTAR SÜTUN: 4 (E), DEĞER SÜTUN: 7 (H)
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

        for (let i = R; i < Math.min(R + 25, range.e.r); i++) {
          const kAddr = XLSX.utils.encode_cell({ r: i, c: keyCol });
          const kCell = worksheet[kAddr];

          if (!kCell || !kCell.v) continue;

          const key = String(kCell.v).trim();

          const vAddr = XLSX.utils.encode_cell({ r: i, c: valueCol });
          const vCell = worksheet[vAddr];
          const value = vCell && vCell.v ? String(vCell.v).trim() : "";

          if (key.includes("T.C. Kimlik No")) {
            // ✅ SADECE İLK BULUNAN TC'Yİ AL
            if (!tcNo || tcNo.length !== 11) {
              tcNo = value.replace(/\D/g, "");
              console.log(
                `  📋 TC bulundu: Satır ${
                  i + 1
                }, Key="${key}", Value="${value}", TC="${tcNo}"`
              );
            } else {
              console.log(
                `  ⚠️ TC zaten var, atlanıyor: Satır ${i + 1}, Value="${value}"`
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
          R += 20;
          continue;
        }
        if (!adSoyad || adSoyad.length < 3) {
          console.log(`  ❌ İsim geçersiz, atlanıyor`);
          R += 20;
          continue;
        }
        if (mevcutTCler.has(tcNo)) {
          console.log("  ⚠️ Zaten var:", adSoyad, tcNo);
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

        R += 20;
      } catch (satirHata) {
        console.warn("⚠️ Satır hatası:", satirHata);
      }
    }

    console.log("\n✅✅✅ TOPLAM OKUNAN ÖĞRENCİ:", ogrenciler.length);
    console.log("📚 SINIF:", sinif);

    if (ogrenciler.length === 0) {
      return { success: false, message: "Öğrenci bulunamadı!" };
    }

    const result = await db.importStudentsFromExcel(ogrenciler);

    return result;
  } catch (error) {
    console.error("❌ Auto Excel işleme hatası:", error);
    return { success: false, message: error.message };
  }
});

// ==========================================
// E-OKUL FOTOĞRAF SAYFASI
// ==========================================

ipcMain.handle("open-eokul-photo-page", async () => {
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

  eOkulWindow.loadURL("https://mebbis.meb.gov.tr/");
  eOkulWindow.webContents.openDevTools({ mode: "detach" });

  const mainWindow = BrowserWindow.getAllWindows().find(
    (win) => !win.title.includes("E-Okul") && !win.title.includes("MEBBİS")
  );

  // MEBBİS'e bilgi kutusu
  eOkulWindow.webContents.on("did-finish-load", () => {
    const url = eOkulWindow.webContents.getURL();
    console.log("🌐 did-finish-load:", url);

    if (url.includes("mebbis.meb.gov.tr") && !url.includes("e-okul")) {
      eOkulWindow.webContents.executeJavaScript(`
        (function() {
          if (document.getElementById('bilgi-kutusu')) return;
          var box = document.createElement('div');
          box.id = 'bilgi-kutusu';
          box.innerHTML = '<div style="position:fixed;top:20px;right:20px;z-index:999999;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;border-radius:12px;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,0.3);font-family:system-ui"><h3 style="margin:0 0 15px">📸 E-Okul Fotoğraf</h3><ol style="margin:0;padding-left:20px;line-height:1.8;font-size:14px"><li>MEBBİS giriş yap</li><li>E-Okul linkine tıkla</li><li>Kurum İşlemleri → Fotoğraf İşlemleri</li><li>Sınıf seç</li></ol><button onclick="this.parentElement.remove()" style="margin-top:15px;padding:8px 20px;background:white;color:#667eea;border:none;border-radius:6px;cursor:pointer;width:100%">Anladım</button></div>';
          document.body.appendChild(box);
          console.log("✅ Bilgi kutusu eklendi");
        })();
      `);
    }
  });

  // YENİ PENCERE AÇILINCA TESPİT ET
  app.on("browser-window-created", (event, newWindow) => {
    console.log("🆕 Yeni pencere tespit edildi!");

    // Küçük delay ile URL kontrol et
    setTimeout(() => {
      if (newWindow.isDestroyed()) return;

      const url = newWindow.webContents.getURL();
      console.log("🔍 Yeni pencere URL:", url);

      if (url.includes("e-okul.meb.gov.tr")) {
        console.log("✅ E-OKUL PENCERESİ BULUNDU!");

        // DevTools aç (opsiyonel - yorum satırı yapabilirsin)
        // newWindow.webContents.openDevTools({ mode: "detach" });

        // İlk butonu ekle
        setTimeout(() => {
          injectButton(newWindow, mainWindow);
        }, 2000);

        // ✅ MANUEL URL POLLİNG: Her 1 saniyede URL kontrol et
        let lastUrl = url;
        const urlCheckInterval = setInterval(() => {
          if (newWindow.isDestroyed()) {
            clearInterval(urlCheckInterval);
            console.log("🛑 E-Okul penceresi kapandı, polling durduruldu");
            return;
          }

          const currentUrl = newWindow.webContents.getURL();

          // URL değişti mi?
          if (
            currentUrl !== lastUrl &&
            currentUrl.includes("e-okul.meb.gov.tr")
          ) {
            console.log("🔄 URL DEĞİŞTİ!");
            console.log("   Eski:", lastUrl);
            console.log("   Yeni:", currentUrl);

            lastUrl = currentUrl;

            // Yeni sayfada buton ekle
            setTimeout(() => {
              if (!newWindow.isDestroyed()) {
                console.log("🔄 Yeni URL'de buton enjekte ediliyor...");
                injectButton(newWindow, mainWindow);
              }
            }, 1500);
          }
        }, 1000); // Her 1 saniyede kontrol

        // Pencere kapanınca interval'ı temizle
        newWindow.on("closed", () => {
          clearInterval(urlCheckInterval);
          console.log("🛑 URL polling durduruldu");
        });
      }
    }, 500);
  });

  // FALLBACK: Tüm pencereleri sürekli kontrol et
  const injectedWindows = new Set();

  const checkAllWindows = () => {
    const allWindows = BrowserWindow.getAllWindows();

    allWindows.forEach((win) => {
      if (win.isDestroyed()) return;

      const url = win.webContents.getURL();

      if (url.includes("e-okul.meb.gov.tr")) {
        const winId = win.id;

        if (!injectedWindows.has(winId)) {
          console.log("🎯 E-Okul penceresi bulundu (ID:", winId, "):", url);
          injectedWindows.add(winId);

          setTimeout(() => {
            if (!win.isDestroyed()) {
              injectButton(win, mainWindow);
            }
          }, 1500);
        }
      }
    });
  };

  // Her 2 saniyede kontrol et
  const checkInterval = setInterval(checkAllWindows, 2000);

  eOkulWindow.on("closed", () => {
    clearInterval(checkInterval);
    injectedWindows.clear();
    delete global.currentEOkulWindow;
    console.log("🛑 E-Okul penceresi ve tüm kontroller durduruldu");
  });

  return { success: true };
});

// ==========================================
// BUTON ENJEKSİYONU
// ==========================================

function injectButton(targetWindow, mainWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    console.error("❌ Hedef pencere yok!");
    return;
  }

  const url = targetWindow.webContents.getURL();
  console.log("⏳ Buton enjekte ediliyor:", url);

  targetWindow.webContents
    .executeJavaScript(
      `
    (function() {
      if (document.getElementById("chatgptFotoTopla")) {
        console.log("⚠️ Buton zaten var");
        return "ZATEN_VAR";
      }
      
      var btn = document.createElement("button");
      btn.id = "chatgptFotoTopla";
      btn.textContent = "📸 Fotoğrafları Topla";
      btn.style.cssText = "position:fixed;top:20px;right:20px;z-index:9999999;padding:15px 25px;background:linear-gradient(135deg,#ff1744,#d50000);color:white;border:none;border-radius:8px;cursor:pointer;font-size:18px;font-weight:bold;box-shadow:0 4px 20px rgba(255,23,68,0.6);transition:all 0.3s";
      
      btn.onmouseenter = function() { btn.style.transform = "scale(1.1)"; };
      btn.onmouseleave = function() { btn.style.transform = "scale(1)"; };

      btn.onclick = function() {
        try {
          var imgs = document.querySelectorAll('img[src^="data:image"]');
          console.log("🔍 Bulunan data:image sayısı:", imgs.length);
          
          var uniqueSrcs = new Set();
          var fotograflar = [];

          for (var i = 0; i < imgs.length; i++) {
            var img = imgs[i];
            var src = img.src;
            
            if (uniqueSrcs.has(src)) {
              continue;
            }
            
            var name = "";
            
            // Alt attribute
            if (img.alt && img.alt.trim().length > 5) {
              name = img.alt.trim();
            }
            
            // Parent text
            if (!name && img.parentElement) {
              var parentText = img.parentElement.textContent || "";
              var lines = parentText.split('\\n');
              for (var j = 0; j < lines.length; j++) {
                var line = lines[j].trim();
                if (line.length > 5 && line.indexOf('Sınıf') === -1 && line.indexOf('Şubesi') === -1) {
                  name = line;
                  break;
                }
              }
            }
            
            if (!name || name.length < 5) {
              continue;
            }
            
            // ✅ TEMİZLEME (SADECE BUNLAR)
            name = name.replace(/^\\d+-/, '');  // "5000-" çıkar
            name = name.replace(/\\s+/g, ' ');   // Çift boşlukları tek yap
            name = name.trim();                  // Baş/son boşlukları sil
            
            if (name.indexOf("Sınıf") > -1 || name.indexOf("Şubesi") > -1) {
              continue;
            }
            
            uniqueSrcs.add(src);
            console.log("📸 Fotoğraf bulundu:", name);
            
            fotograflar.push({ 
              ad_soyad: name, 
              base64: src 
            });
          }

          console.log("📸 Toplam fotoğraf:", fotograflar.length);

          if (fotograflar.length === 0) {
            alert("❌ Fotoğraf bulunamadı!");
            return;
          }

          var chunkSize = 5;
          for (var j = 0; j < fotograflar.length; j += chunkSize) {
            var chunk = fotograflar.slice(j, j + chunkSize);
            console.log("📸🔵FOTO_CHUNK🔵:" + JSON.stringify(chunk));
          }

          btn.textContent = "✅ " + fotograflar.length + " Gönderildi!";
          btn.style.background = "#00c853";

          setTimeout(function() {
            btn.textContent = "📸 Fotoğrafları Topla";
            btn.style.background = "linear-gradient(135deg,#ff1744,#d50000)";
          }, 3000);

        } catch (err) {
          console.error("❌ Hata:", err);
          alert("Hata: " + err.message);
        }
      };

      document.body.appendChild(btn);
      console.log("✅ Buton eklendi");
      return "BASARILI";
    })();
  `
    )
    .then((result) => {
      console.log("✅ Enjeksiyon sonucu:", result);
    })
    .catch((err) => {
      console.error("❌ Enjeksiyon hatası:", err);
    });

  console.log("🎧 Console handler bağlanıyor, Window ID:", targetWindow.id);

  targetWindow.webContents.removeAllListeners("console-message");

  targetWindow.webContents.on("console-message", (event, level, message) => {
    if (message.indexOf("📸") > -1) {
      console.log("📢 E-Okul Console:", message.substring(0, 100));
    }

    if (message.indexOf("📸🔵FOTO_CHUNK🔵:") > -1) {
      console.log("🔵 CHUNK TESPİT EDİLDİ!");

      try {
        var jsonStr = message.replace("📸🔵FOTO_CHUNK🔵:", "");
        var chunk = JSON.parse(jsonStr);
        console.log("📦", chunk.length, "fotoğraf parse edildi");

        var allWindows = BrowserWindow.getAllWindows();

        var mainWin = null;
        var minId = 999;

        for (var i = 0; i < allWindows.length; i++) {
          var win = allWindows[i];
          if (!win.isDestroyed() && win.id < minId) {
            var title = win.title.toLowerCase();

            if (
              title.indexOf("e-okul") === -1 &&
              title.indexOf("mebbis") === -1 &&
              title.indexOf("meb.gov.tr") === -1
            ) {
              mainWin = win;
              minId = win.id;
            }
          }
        }

        if (mainWin) {
          console.log("✅ Ana pencere bulundu, gönderiliyor...");
          mainWin.webContents.send("mebbis-photos-parsed", chunk);
        } else {
          console.error("❌ Ana pencere yok!");
        }
      } catch (err) {
        console.error("❌ Parse hatası:", err.message);
      }
    }
  });

  console.log("✅ Listener aktif (Window ID:", targetWindow.id, ")");
}

// ==========================================
// ÖĞRENCİ İŞLEMLERİ - IPC HANDLERS
// ==========================================

ipcMain.handle("get-students", async () => {
  try {
    // db zaten üstte tanımlı, tekrar require etmeye gerek yok
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

// Öğrenci bilgilerini getir
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

// Tüm öğrencileri sil
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

console.log("✅ MEBBİS IPC Handler'ları yüklendi");

console.log("✅ Öğrenci IPC Handler'ları yüklendi");

console.log("✅ IPC Handler'lar yüklendi");
