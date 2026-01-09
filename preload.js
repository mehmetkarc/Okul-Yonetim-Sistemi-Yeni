// ==========================================
// ✅ PRELOAD.JS — Ultra Enhanced Version V3.1
// ==========================================
// Türkiye'nin İlk Yapay Zeka Destekli Okul Yönetim Sistemi
// Preload Layer - Electron IPC Bridge
//
// @author SİMRE/MK
// @version 3.1.0
// @date 2025
//
// contextIsolation: false için optimize edilmiş
// + GÜNCELLEME SİSTEMİ ENTEGRASYONİ
// ==========================================

const { ipcRenderer } = require("electron");

console.log("🔧 Preload scripti başlatılıyor...");
console.log("👨‍💻 Geliştirici: SİMRE/MK");
console.log("📦 Version: 3.1.0");
console.log("🔄 Güncelleme Sistemi: AKTİF");

// contextIsolation: false olduğu için window'a direk ekle
window.electronAPI = {
  // ==========================================
  // 📦 UYGULAMA BİLGİLERİ
  // ==========================================
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),

  // ==========================================
  // 🔄 GÜNCELLEME SİSTEMİ (KOMPLE YENİ)
  // ==========================================
  checkForUpdates: () => {
    console.log("🔍 Preload: checkForUpdates çağrıldı");
    return ipcRenderer.invoke("check-for-updates");
  },

  startUpdateDownload: () => {
    console.log("📥 Preload: startUpdateDownload çağrıldı");
    return ipcRenderer.invoke("start-update-download");
  },

  quitAndInstall: () => {
    console.log("🔄 Preload: quitAndInstall çağrıldı");
    return ipcRenderer.invoke("quit-and-install");
  },

  onUpdateAvailable: (callback) => {
    console.log("📡 Preload: onUpdateAvailable listener kuruluyor");
    ipcRenderer.on("update-available", (event, data) => {
      console.log("🎉 Preload: Yeni güncelleme mevcut!", data);
      callback(data);
    });
  },

  onUpdateProgress: (callback) => {
    console.log("📡 Preload: onUpdateProgress listener kuruluyor");
    ipcRenderer.on("update-progress", (event, data) => {
      console.log(`📥 Preload: İndirme ilerlemesi: ${data.percent}%`);
      callback(data);
    });
  },

  onUpdateDownloaded: (callback) => {
    console.log("📡 Preload: onUpdateDownloaded listener kuruluyor");
    ipcRenderer.on("update-downloaded", (event, data) => {
      console.log("✅ Preload: Güncelleme indirildi!", data);
      callback(data);
    });
  },

  onUpdateError: (callback) => {
    console.log("📡 Preload: onUpdateError listener kuruluyor");
    ipcRenderer.on("update-error", (event, data) => {
      console.error("❌ Preload: Güncelleme hatası!", {
        message: data?.message || data,
        code: data?.code,
        stack: data?.stack,
        fullError: data,
      });
      callback(data);
    });
  },

  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners("update-available");
    ipcRenderer.removeAllListeners("update-progress");
    ipcRenderer.removeAllListeners("update-downloaded");
    ipcRenderer.removeAllListeners("update-error");
    console.log("🧹 Preload: Güncelleme listener'ları temizlendi");
  },

  // ==========================================
  // 🧠 VERİTABANI İŞLEMLERİ
  // ==========================================
  dbQuery: (sql, params) => ipcRenderer.invoke("db-query", sql, params),
  dbExec: (sql, params) => ipcRenderer.invoke("db-exec", sql, params),

  // ⚡ Migration kontrolü
  getDatabaseVersion: () => ipcRenderer.invoke("get-database-version"),
  runMigrations: () => ipcRenderer.invoke("run-migrations"),
  backupDatabase: (schoolCode) =>
    ipcRenderer.invoke("backup-database", schoolCode),
  verifyDatabaseIntegrity: () =>
    ipcRenderer.invoke("verify-database-integrity"),

  // ==========================================
  // 💾 YEDEKLEME SİSTEMİ
  // ==========================================
  createBackup: (type) => ipcRenderer.invoke("create-backup", type),
  restoreBackup: (filePath) => ipcRenderer.invoke("restore-backup", filePath),
  getBackupList: () => ipcRenderer.invoke("get-backup-list"),
  deleteBackup: (fileName) => ipcRenderer.invoke("delete-backup", fileName),
  exportBackupToExternal: (fileName) =>
    ipcRenderer.invoke("export-backup-to-external", fileName),

  // ==========================================
  // 📁 DOSYA İŞLEMLERİ
  // ==========================================
  selectFile: (options) => ipcRenderer.invoke("select-file", options),
  saveFile: (options, data) => ipcRenderer.invoke("save-file", options, data),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),
  deleteFile: (filePath) => ipcRenderer.invoke("delete-file", filePath),
  checkFileExists: (filePath) =>
    ipcRenderer.invoke("check-file-exists", filePath),

  // ==========================================
  // 📸 FOTOĞRAF İŞLEMLERİ
  // ==========================================
  sendPhotos: (photos) => {
    console.log("🚀 Preload: sendPhotos çağrıldı, gönderiliyor...");
    ipcRenderer.send("photos-parsed", photos);
  },
  saveMebbisPhotos: (photos) => {
    console.log("💾 Preload: saveMebbisPhotos invoke ediliyor...");
    return ipcRenderer.invoke("mebbis-save-photos", photos);
  },
  onMebbisPhotosParsed: (callback) => {
    console.log("📌 Preload: mebbis-photos-parsed listener kuruluyor...");
    ipcRenderer.on("mebbis-photos-parsed", (event, data) => {
      console.log("🎯 Preload: mebbis-photos-parsed event alındı!");
      callback(data);
    });
  },
  removePhotosParsedListener: () => {
    ipcRenderer.removeAllListeners("mebbis-photos-parsed");
    console.log("🧹 Preload: mebbis-photos-parsed listener'ları temizlendi");
  },
  compressImage: (imagePath, quality = 80) => {
    console.log("🖼️ Preload: compressImage çağrıldı");
    return ipcRenderer.invoke("compress-image", imagePath, quality);
  },

  // ==========================================
  // 🪄 GELİŞTİRİCİ ARAÇLARI
  // ==========================================
  logToMain: (msg) => ipcRenderer.send("log-message", msg),
  openDevTools: () => ipcRenderer.invoke("open-dev-tools"),
  reloadApp: () => ipcRenderer.invoke("reload-app"),
  clearCache: () => ipcRenderer.invoke("clear-cache-manual"),
  getCacheSize: () => ipcRenderer.invoke("get-cache-size"),

  // ==========================================
  // 📊 RAPORLAR
  // ==========================================
  getAllStudents: (rol, userId) => {
    console.log("📋 Preload: getAllStudents çağrıldı");
    return ipcRenderer.invoke("get-all-students", rol, userId);
  },
  getAllTeachers: () => {
    console.log("📚 Preload: getAllTeachers çağrıldı");
    return ipcRenderer.invoke("get-all-teachers");
  },
  createPDF: (options) => {
    console.log("📄 Preload: createPDF çağrıldı");
    return ipcRenderer.invoke("create-pdf", options);
  },
  createExcel: (options) => {
    console.log("📊 Preload: createExcel çağrıldı");
    return ipcRenderer.invoke("create-excel", options);
  },

  // ==========================================
  // 🏫 SINIF İŞLEMLERİ
  // ==========================================
  createClass: (sinifBilgileri) => {
    console.log("🆕 Preload: createClass çağrıldı", sinifBilgileri);
    return ipcRenderer.invoke("create-class", sinifBilgileri);
  },
  getAllClasses: () => {
    console.log("📋 Preload: getAllClasses çağrıldı");
    return ipcRenderer.invoke("get-all-classes");
  },
  updateClass: (sinifId, guncelBilgiler) => {
    console.log("✏️ Preload: updateClass çağrıldı", sinifId, guncelBilgiler);
    return ipcRenderer.invoke("update-class", sinifId, guncelBilgiler);
  },
  deleteClass: (sinifId) => {
    console.log("🗑️ Preload: deleteClass çağrıldı", sinifId);
    return ipcRenderer.invoke("delete-class", sinifId);
  },
  getStatsForClass: (sinifAdi) => {
    console.log("📊 Preload: getStatsForClass çağrıldı", sinifAdi);
    return ipcRenderer.invoke("get-stats-for-class", sinifAdi);
  },

  // ==========================================
  // 🏫 OKUL İŞLEMLERİ
  // ==========================================
  getAllSchools: () => {
    console.log("🏫 Preload: getAllSchools çağrıldı");
    return ipcRenderer.invoke("get-all-schools");
  },
  createSchool: (okulBilgileri) => {
    console.log("🆕 Preload: createSchool çağrıldı");
    return ipcRenderer.invoke("create-school", okulBilgileri);
  },
  updateSchool: (okulId, guncelBilgiler) => {
    console.log("✏️ Preload: updateSchool çağrıldı");
    return ipcRenderer.invoke("update-school", okulId, guncelBilgiler);
  },
  deleteSchool: (okulId) => {
    console.log("🗑️ Preload: deleteSchool çağrıldı");
    return ipcRenderer.invoke("delete-school", okulId);
  },

  // ==========================================
  // 👨‍🏫 ÖĞRETMEN İŞLEMLERİ
  // ==========================================
  createTeacher: (ogretmenBilgileri) => {
    console.log("🆕 Preload: createTeacher çağrıldı");
    return ipcRenderer.invoke("create-teacher", ogretmenBilgileri);
  },
  updateTeacher: (ogretmenId, guncelBilgiler) => {
    console.log("✏️ Preload: updateTeacher çağrıldı");
    return ipcRenderer.invoke("update-teacher", ogretmenId, guncelBilgiler);
  },
  deleteTeacher: (ogretmenId) => {
    console.log("🗑️ Preload: deleteTeacher çağrıldı");
    return ipcRenderer.invoke("delete-teacher", ogretmenId);
  },

  // ==========================================
  // 👨‍🎓 ÖĞRENCİ İŞLEMLERİ
  // ==========================================
  createStudent: (ogrenciBilgileri) => {
    console.log("🆕 Preload: createStudent çağrıldı");
    return ipcRenderer.invoke("create-student", ogrenciBilgileri);
  },
  updateStudent: (ogrenciId, guncelBilgiler) => {
    console.log("✏️ Preload: updateStudent çağrıldı");
    return ipcRenderer.invoke("update-student", ogrenciId, guncelBilgiler);
  },
  deleteStudent: (ogrenciId) => {
    console.log("🗑️ Preload: deleteStudent çağrıldı");
    return ipcRenderer.invoke("delete-student", ogrenciId);
  },
  importStudentsFromExcel: (excelData) => {
    console.log("📥 Preload: importStudentsFromExcel çağrıldı");
    return ipcRenderer.invoke("import-students-from-excel", excelData);
  },

  // ==========================================
  // 📚 DERSLER API
  // ==========================================
  getAllDersler: () => {
    console.log("📚 Preload: getAllDersler çağrıldı");
    return ipcRenderer.invoke("get-all-dersler");
  },
  addDers: (dersData) => {
    console.log("🆕 Preload: addDers çağrıldı");
    return ipcRenderer.invoke("add-ders", dersData);
  },
  updateDers: (dersData) => {
    console.log("✏️ Preload: updateDers çağrıldı");
    return ipcRenderer.invoke("update-ders", dersData);
  },
  deleteDers: (dersId) => {
    console.log("🗑️ Preload: deleteDers çağrıldı");
    return ipcRenderer.invoke("delete-ders", dersId);
  },

  // ==========================================
  // 📅 DERS PROGRAMI API (BLOK DESTEĞİYLE)
  // ==========================================

  // Program CRUD
  createDersProgram: (programBilgileri, hucreVerileri = []) => {
    console.log("📅 Preload: createDersProgram çağrıldı (BLOK DESTEĞİYLE)");
    return ipcRenderer.invoke(
      "create-ders-program",
      programBilgileri,
      hucreVerileri
    );
  },

  getDersProgram: (programId) => {
    console.log("📋 Preload: getDersProgram çağrıldı, ID:", programId);
    return ipcRenderer.invoke("get-ders-program", programId);
  },

  getDersProgramBySinif: (sinifId) => {
    console.log(
      "📋 Preload: getDersProgramBySinif çağrıldı, Sınıf ID:",
      sinifId
    );
    return ipcRenderer.invoke("get-ders-program-by-sinif", sinifId);
  },

  getAllDersProgramlari: (sadeceDurumAktif = false) => {
    console.log("📋 Preload: getAllDersProgramlari çağrıldı");
    return ipcRenderer.invoke("get-all-ders-programlari", sadeceDurumAktif);
  },

  updateDersProgram: (programId, guncelBilgiler, yeniHucreler = null) => {
    console.log(
      "✏️ Preload: updateDersProgram çağrıldı (BLOK DESTEĞİYLE), ID:",
      programId
    );
    return ipcRenderer.invoke(
      "update-ders-program",
      programId,
      guncelBilgiler,
      yeniHucreler
    );
  },

  deleteDersProgram: (programId) => {
    console.log("🗑️ Preload: deleteDersProgram çağrıldı, ID:", programId);
    return ipcRenderer.invoke("delete-ders-program", programId);
  },

  restoreDersProgram: (programId) => {
    console.log("♻️ Preload: restoreDersProgram çağrıldı, ID:", programId);
    return ipcRenderer.invoke("restore-ders-program", programId);
  },

  hardDeleteDersProgram: (programId) => {
    console.log("💥 Preload: hardDeleteDersProgram çağrıldı, ID:", programId);
    return ipcRenderer.invoke("hard-delete-ders-program", programId);
  },

  // Çakışma kontrolü
  checkCakisma: (ogretmenId, gun, saat, haricProgramId = null) => {
    console.log("🔍 Preload: checkCakisma çağrıldı");
    return ipcRenderer.invoke(
      "check-cakisma",
      ogretmenId,
      gun,
      saat,
      haricProgramId
    );
  },

  // ==========================================
  // 🎯 KISITLAR API
  // ==========================================

  saveGenelKisitlar: (programId, kisitlar) => {
    console.log("🎯 Preload: saveGenelKisitlar çağrıldı");
    return ipcRenderer.invoke("save-genel-kisitlar", programId, kisitlar);
  },

  saveOgretmenKisit: (programId, ogretmenId, kisitlar) => {
    console.log("👨‍🏫 Preload: saveOgretmenKisit çağrıldı");
    return ipcRenderer.invoke(
      "save-ogretmen-kisit",
      programId,
      ogretmenId,
      kisitlar
    );
  },

  getKisitlar: (programId) => {
    console.log("📋 Preload: getKisitlar çağrıldı");
    return ipcRenderer.invoke("get-kisitlar", programId);
  },

  deleteOgretmenKisit: (programId, ogretmenId) => {
    console.log("🗑️ Preload: deleteOgretmenKisit çağrıldı");
    return ipcRenderer.invoke("delete-ogretmen-kisit", programId, ogretmenId);
  },

  getDefaultKisitlar: () => {
    console.log("⚙️ Preload: getDefaultKisitlar çağrıldı");
    return ipcRenderer.invoke("get-default-kisitlar");
  },

  // ==========================================
  // 👨‍🏫 ÖĞRETMEN TERCİHLERİ API
  // ==========================================

  saveOgretmenTercihi: (programId, ogretmenId, tercihler) => {
    console.log("💾 Preload: saveOgretmenTercihi çağrıldı");
    return ipcRenderer.invoke(
      "save-ogretmen-tercihi",
      programId,
      ogretmenId,
      tercihler
    );
  },

  getOgretmenTercihi: (programId, ogretmenId) => {
    console.log("📋 Preload: getOgretmenTercihi çağrıldı");
    return ipcRenderer.invoke("get-ogretmen-tercihi", programId, ogretmenId);
  },

  getAllOgretmenTercihleri: (programId) => {
    console.log("📋 Preload: getAllOgretmenTercihleri çağrıldı");
    return ipcRenderer.invoke("get-all-ogretmen-tercihleri", programId);
  },

  deleteOgretmenTercihi: (programId, ogretmenId) => {
    console.log("🗑️ Preload: deleteOgretmenTercihi çağrıldı");
    return ipcRenderer.invoke("delete-ogretmen-tercihi", programId, ogretmenId);
  },

  // ==========================================
  // 🤖 YAPAY ZEKA UYARI SİSTEMİ
  // ==========================================

  checkBosGunCakismasi: (programId, bosGun) => {
    console.log("🔍 Preload: checkBosGunCakismasi çağrıldı");
    return ipcRenderer.invoke("check-bos-gun-cakismasi", programId, bosGun);
  },

  getAktifUyarilar: (programId) => {
    console.log("📋 Preload: getAktifUyarilar çağrıldı");
    return ipcRenderer.invoke("get-aktif-uyarilar", programId);
  },

  resolveUyari: (uyariId) => {
    console.log("✅ Preload: resolveUyari çağrıldı");
    return ipcRenderer.invoke("resolve-uyari", uyariId);
  },

  validateKisitlarVeTercihler: (programId) => {
    console.log("🔍 Preload: validateKisitlarVeTercihler çağrıldı");
    return ipcRenderer.invoke("validate-kisitlar-tercihler", programId);
  },

  saveKisitUyarisi: (programId, uyari) => {
    console.log("⚠️ Preload: saveKisitUyarisi çağrıldı");
    return ipcRenderer.invoke("save-kisit-uyarisi", programId, uyari);
  },

  // ==========================================
  // 📊 DETAYLI VERİ GETIRME API (BLOK DESTEĞİYLE)
  // ==========================================

  getAllDerslerWithBlocks: () => {
    console.log("📚 Preload: getAllDerslerWithBlocks çağrıldı");
    return ipcRenderer.invoke("get-all-dersler-with-blocks");
  },

  getAllTeachersWithLoad: (programId = null) => {
    console.log("👨‍🏫 Preload: getAllTeachersWithLoad çağrıldı");
    return ipcRenderer.invoke("get-all-teachers-with-load", programId);
  },

  getAllClassesWithLoad: () => {
    console.log("🏛️ Preload: getAllClassesWithLoad çağrıldı");
    return ipcRenderer.invoke("get-all-classes-with-load");
  },

  getProgramDashboardData: (programId, sinifId = null) => {
    console.log("📊 Preload: getProgramDashboardData çağrıldı");
    return ipcRenderer.invoke("get-program-dashboard-data", programId, sinifId);
  },

  parseBlokBilgisi: (blokString, haftalikSaat) => {
    console.log("🧩 Preload: parseBlokBilgisi çağrıldı");
    return ipcRenderer.invoke("parse-blok-bilgisi", blokString, haftalikSaat);
  },

  // ==========================================
  // 🚀 ALGORİTMA ENTEGRASYONU API
  // ==========================================

  // Algorithm Config
  saveAlgorithmConfig: (programId, config) => {
    console.log("⚙️ Preload: saveAlgorithmConfig çağrıldı");
    return ipcRenderer.invoke("save-algorithm-config", programId, config);
  },

  getAlgorithmConfig: (programId) => {
    console.log("📋 Preload: getAlgorithmConfig çağrıldı");
    return ipcRenderer.invoke("get-algorithm-config", programId);
  },

  // Solution Variants
  saveSolutionVariant: (programId, variantName, solution, metadata = {}) => {
    console.log("💾 Preload: saveSolutionVariant çağrıldı");
    return ipcRenderer.invoke(
      "save-solution-variant",
      programId,
      variantName,
      solution,
      metadata
    );
  },

  getAllSolutionVariants: (programId) => {
    console.log("📋 Preload: getAllSolutionVariants çağrıldı");
    return ipcRenderer.invoke("get-all-solution-variants", programId);
  },

  getSolutionVariant: (variantId) => {
    console.log("📋 Preload: getSolutionVariant çağrıldı");
    return ipcRenderer.invoke("get-solution-variant", variantId);
  },

  deleteSolutionVariant: (variantId) => {
    console.log("🗑️ Preload: deleteSolutionVariant çağrıldı");
    return ipcRenderer.invoke("delete-solution-variant", variantId);
  },

  markVariantAsBest: (programId, variantId) => {
    console.log("⭐ Preload: markVariantAsBest çağrıldı");
    return ipcRenderer.invoke("mark-variant-as-best", programId, variantId);
  },

  // Performance Metrics
  savePerformanceMetrics: (programId, sessionName, metrics) => {
    console.log("📊 Preload: savePerformanceMetrics çağrıldı");
    return ipcRenderer.invoke(
      "save-performance-metrics",
      programId,
      sessionName,
      metrics
    );
  },

  getPerformanceHistory: (programId, limit = 50) => {
    console.log("📋 Preload: getPerformanceHistory çağrıldı");
    return ipcRenderer.invoke("get-performance-history", programId, limit);
  },

  getPerformanceStats: (programId) => {
    console.log("📊 Preload: getPerformanceStats çağrıldı");
    return ipcRenderer.invoke("get-performance-stats", programId);
  },

  // ==========================================
  // 🎮 ALGORİTMA ÇALIŞTIRMA API
  // ==========================================

  runScheduleAlgorithm: (programId, algorithmType = "v2", options = {}) => {
    console.log("🚀 Preload: runScheduleAlgorithm çağrıldı");
    return ipcRenderer.invoke(
      "run-schedule-algorithm",
      programId,
      algorithmType,
      options
    );
  },

  stopScheduleAlgorithm: (programId) => {
    console.log("⏹️ Preload: stopScheduleAlgorithm çağrıldı");
    return ipcRenderer.invoke("stop-schedule-algorithm", programId);
  },

  // Real-time algorithm progress
  onAlgorithmProgress: (callback) => {
    console.log("📡 Preload: onAlgorithmProgress listener kuruluyor");
    ipcRenderer.on("algorithm-progress", (event, data) => callback(data));
  },

  onAlgorithmComplete: (callback) => {
    console.log("📡 Preload: onAlgorithmComplete listener kuruluyor");
    ipcRenderer.on("algorithm-complete", (event, data) => callback(data));
  },

  onAlgorithmError: (callback) => {
    console.log("📡 Preload: onAlgorithmError listener kuruluyor");
    ipcRenderer.on("algorithm-error", (event, data) => callback(data));
  },

  removeAlgorithmListeners: () => {
    ipcRenderer.removeAllListeners("algorithm-progress");
    ipcRenderer.removeAllListeners("algorithm-complete");
    ipcRenderer.removeAllListeners("algorithm-error");
    console.log("🧹 Preload: Algorithm listener'ları temizlendi");
  },

  // ==========================================
  // 🔄 PROGRAM KARŞILAŞTIRMA VE OPTİMİZASYON
  // ==========================================

  compareSolutions: (programId, variantIds = []) => {
    console.log("⚖️ Preload: compareSolutions çağrıldı");
    return ipcRenderer.invoke("compare-solutions", programId, variantIds);
  },

  optimizeProgram: (programId, optimizationType = "auto") => {
    console.log("⚡ Preload: optimizeProgram çağrıldı");
    return ipcRenderer.invoke("optimize-program", programId, optimizationType);
  },

  analyzeScheduleQuality: (programId) => {
    console.log("🔍 Preload: analyzeScheduleQuality çağrıldı");
    return ipcRenderer.invoke("analyze-schedule-quality", programId);
  },

  // ==========================================
  // 💾 DERS-SINIF-ÖĞRETMEN ATAMA
  // ==========================================

  saveSinifDersOgretmenAtama: (payload) => {
    console.log("💾 Preload: saveSinifDersOgretmenAtama çağrıldı", payload);
    return ipcRenderer.invoke("save-sinif-ders-ogretmen-atama", payload);
  },

  getSinifDersOgretmenAtama: (sinifId) => {
    console.log("📋 Preload: getSinifDersOgretmenAtama çağrıldı");
    return ipcRenderer.invoke("get-sinif-ders-ogretmen-atama", sinifId);
  },

  deleteSinifDersOgretmenAtama: (atamaId) => {
    console.log("🗑️ Preload: deleteSinifDersOgretmenAtama çağrıldı");
    return ipcRenderer.invoke("delete-sinif-ders-ogretmen-atama", atamaId);
  },

  // ==========================================
  // 🔐 GİRİŞ İŞLEMLERİ
  // ==========================================
  login: (okulKodu, kullaniciAdi, sifre) => {
    console.log("🔐 Preload: login çağrıldı");
    return ipcRenderer.invoke("login", okulKodu, kullaniciAdi, sifre);
  },

  logout: () => {
    console.log("🚪 Preload: logout çağrıldı");
    return ipcRenderer.invoke("logout");
  },

  getCurrentUser: () => {
    console.log("👤 Preload: getCurrentUser çağrıldı");
    return ipcRenderer.invoke("get-current-user");
  },

  // 🔐 Superadmin Şifre Yönetimi
  setupAdminPassword: (password) => {
    console.log("🔐 Preload: setupAdminPassword çağrıldı");
    return ipcRenderer.invoke("setup-admin-password", password);
  },

  verifyAdminPassword: (password) => {
    console.log("🔍 Preload: verifyAdminPassword çağrıldı");
    return ipcRenderer.invoke("verify-admin-password", password);
  },

  isFirstSetup: () => {
    console.log("❓ Preload: isFirstSetup çağrıldı");
    return ipcRenderer.invoke("is-first-setup");
  },

  // ==========================================
  // 📈 İSTATİSTİKLER VE ANALİTİK
  // ==========================================

  getSystemStats: () => {
    console.log("📊 Preload: getSystemStats çağrıldı");
    return ipcRenderer.invoke("get-system-stats");
  },

  getScheduleStats: (programId) => {
    console.log("📊 Preload: getScheduleStats çağrıldı");
    return ipcRenderer.invoke("get-schedule-stats", programId);
  },

  getTeacherWorkload: (ogretmenId, programId = null) => {
    console.log("📊 Preload: getTeacherWorkload çağrıldı");
    return ipcRenderer.invoke("get-teacher-workload", ogretmenId, programId);
  },

  getClassScheduleAnalysis: (sinifId, programId) => {
    console.log("📊 Preload: getClassScheduleAnalysis çağrıldı");
    return ipcRenderer.invoke(
      "get-class-schedule-analysis",
      sinifId,
      programId
    );
  },

  // ==========================================
  // 🎨 PROGRAM GÖRSELLEŞTIRME
  // ==========================================

  exportProgramAsImage: (programId, format = "png") => {
    console.log("🖼️ Preload: exportProgramAsImage çağrıldı");
    return ipcRenderer.invoke("export-program-as-image", programId, format);
  },

  exportProgramAsPDF: (programId, options = {}) => {
    console.log("📄 Preload: exportProgramAsPDF çağrıldı");
    return ipcRenderer.invoke("export-program-as-pdf", programId, options);
  },

  exportProgramAsExcel: (programId, options = {}) => {
    console.log("📊 Preload: exportProgramAsExcel çağrıldı");
    return ipcRenderer.invoke("export-program-as-excel", programId, options);
  },

  // ==========================================
  // 💾 PROGRAM ÇÖZÜMÜ KAYDETME (ÇOKLU ÇÖZÜM DESTEĞİ)
  // ==========================================

  saveProgramSolution: (
    programId,
    solutionName,
    solutionData,
    metadata = {}
  ) => {
    console.log("💾 Preload: saveProgramSolution çağrıldı");
    console.log(`   • Program ID: ${programId}`);
    console.log(`   • Çözüm Adı: ${solutionName}`);
    console.log(`   • Metadata:`, metadata);
    return ipcRenderer.invoke(
      "save-program-solution",
      programId,
      solutionName,
      solutionData,
      metadata
    );
  },

  getAllProgramSolutions: (programId) => {
    console.log("📋 Preload: getAllProgramSolutions çağrıldı");
    return ipcRenderer.invoke("get-all-program-solutions", programId);
  },

  getProgramSolution: (solutionId) => {
    console.log("📋 Preload: getProgramSolution çağrıldı, ID:", solutionId);
    return ipcRenderer.invoke("get-program-solution", solutionId);
  },

  deleteProgramSolution: (solutionId) => {
    console.log("🗑️ Preload: deleteProgramSolution çağrıldı, ID:", solutionId);
    return ipcRenderer.invoke("delete-program-solution", solutionId);
  },

  updateProgramSolution: (solutionId, updates) => {
    console.log("✏️ Preload: updateProgramSolution çağrıldı, ID:", solutionId);
    return ipcRenderer.invoke("update-program-solution", solutionId, updates);
  },

  setActiveSolution: (programId, solutionId) => {
    console.log("⭐ Preload: setActiveSolution çağrıldı");
    console.log(`   • Program ID: ${programId}`);
    console.log(`   • Çözüm ID: ${solutionId}`);
    return ipcRenderer.invoke("set-active-solution", programId, solutionId);
  },

  getActiveSolution: (programId) => {
    console.log(
      "📋 Preload: getActiveSolution çağrıldı, Program ID:",
      programId
    );
    return ipcRenderer.invoke("get-active-solution", programId);
  },
  // ==========================================
  // ✈️ GEZİ PLANLAMA SİSTEMİ API
  // ==========================================

  // Gezi CRUD
  getAllGeziler: () => {
    console.log("✈️ Preload: getAllGeziler çağrıldı");
    return ipcRenderer.invoke("get-all-geziler");
  },

  getGeziById: (geziId) => {
    console.log("📋 Preload: getGeziById çağrıldı, ID:", geziId);
    return ipcRenderer.invoke("get-gezi-by-id", geziId);
  },

  createGezi: (geziData) => {
    console.log("🆕 Preload: createGezi çağrıldı");
    return ipcRenderer.invoke("create-gezi", geziData);
  },

  updateGezi: (geziId, geziData) => {
    console.log("✏️ Preload: updateGezi çağrıldı, ID:", geziId);
    return ipcRenderer.invoke("update-gezi", geziId, geziData);
  },

  deleteGezi: (geziId) => {
    console.log("🗑️ Preload: deleteGezi çağrıldı, ID:", geziId);
    return ipcRenderer.invoke("delete-gezi", geziId);
  },

  // Gezi Öğrenciler
  addGeziOgrenci: (geziId, ogrenciId) => {
    console.log("👨‍🎓 Preload: addGeziOgrenci çağrıldı");
    return ipcRenderer.invoke("add-gezi-ogrenci", geziId, ogrenciId);
  },

  removeGeziOgrenci: (geziId, ogrenciId) => {
    console.log("🗑️ Preload: removeGeziOgrenci çağrıldı");
    return ipcRenderer.invoke("remove-gezi-ogrenci", geziId, ogrenciId);
  },

  getGeziOgrenciler: (geziId) => {
    console.log("📋 Preload: getGeziOgrenciler çağrıldı");
    return ipcRenderer.invoke("get-gezi-ogrenciler", geziId);
  },

  // Gezi Öğretmenler
  addGeziOgretmen: (geziId, ogretmenId, gorev) => {
    console.log("👨‍🏫 Preload: addGeziOgretmen çağrıldı");
    return ipcRenderer.invoke("add-gezi-ogretmen", geziId, ogretmenId, gorev);
  },

  removeGeziOgretmen: (geziId, ogretmenId) => {
    console.log("🗑️ Preload: removeGeziOgretmen çağrıldı");
    return ipcRenderer.invoke("remove-gezi-ogretmen", geziId, ogretmenId);
  },

  getGeziOgretmenler: (geziId) => {
    console.log("📋 Preload: getGeziOgretmenler çağrıldı");
    return ipcRenderer.invoke("get-gezi-ogretmenler", geziId);
  },

  // Gezi Misafirler
  addGeziMisafir: (geziId, misafirData) => {
    console.log("🧑 Preload: addGeziMisafir çağrıldı");
    return ipcRenderer.invoke("add-gezi-misafir", geziId, misafirData);
  },

  removeGeziMisafir: (misafirId) => {
    console.log("🗑️ Preload: removeGeziMisafir çağrıldı");
    return ipcRenderer.invoke("remove-gezi-misafir", misafirId);
  },

  getGeziMisafirler: (geziId) => {
    console.log("📋 Preload: getGeziMisafirler çağrıldı");
    return ipcRenderer.invoke("get-gezi-misafirler", geziId);
  },

  // Gezi İstatistikleri
  getGeziStats: () => {
    console.log("📊 Preload: getGeziStats çağrıldı");
    return ipcRenderer.invoke("get-gezi-stats");
  },

  // ==========================================
  // 🏢 FİRMA YÖNETİMİ API
  // ==========================================

  firmaKaydet: (geziId, firmaData) => {
    console.log("🏢 Preload: firmaKaydet çağrıldı, Gezi ID:", geziId);
    return ipcRenderer.invoke("firma-kaydet", geziId, firmaData);
  },

  firmaGetir: (geziId) => {
    console.log("📋 Preload: firmaGetir çağrıldı, Gezi ID:", geziId);
    return ipcRenderer.invoke("firma-getir", geziId);
  },

  firmaSil: (firmaId) => {
    console.log("🗑️ Preload: firmaSil çağrıldı, Firma ID:", firmaId);
    return ipcRenderer.invoke("firma-sil", firmaId);
  },
  // ==========================================
  // 📝 ORTAK SINAV (KELEBEK) SİSTEMİ API
  // ==========================================

  // ========== OTURMA PLANLARI ==========
  getAllSinavPlanlar: () => {
    console.log("📋 Preload: getAllSinavPlanlar çağrıldı");
    return ipcRenderer.invoke("get-all-sinav-planlar");
  },

  addSinavPlan: (planData) => {
    console.log("🆕 Preload: addSinavPlan çağrıldı");
    return ipcRenderer.invoke("add-sinav-plan", planData);
  },

  updateSinavPlan: (planId, planData) => {
    console.log("✏️ Preload: updateSinavPlan çağrıldı, ID:", planId);
    return ipcRenderer.invoke("update-sinav-plan", planId, planData);
  },

  deleteSinavPlan: (planId) => {
    console.log("🗑️ Preload: deleteSinavPlan çağrıldı, ID:", planId);
    return ipcRenderer.invoke("delete-sinav-plan", planId);
  },

  // ========== SALONLAR ==========
  getAllSinavSalonlar: () => {
    console.log("📋 Preload: getAllSinavSalonlar çağrıldı");
    return ipcRenderer.invoke("get-all-sinav-salonlar");
  },

  addSinavSalon: (salonData) => {
    console.log("🆕 Preload: addSinavSalon çağrıldı");
    return ipcRenderer.invoke("add-sinav-salon", salonData);
  },

  updateSinavSalon: (salonId, salonData) => {
    console.log("✏️ Preload: updateSinavSalon çağrıldı, ID:", salonId);
    return ipcRenderer.invoke("update-sinav-salon", salonId, salonData);
  },

  deleteSinavSalon: (salonId) => {
    console.log("🗑️ Preload: deleteSinavSalon çağrıldı, ID:", salonId);
    return ipcRenderer.invoke("delete-sinav-salon", salonId);
  },

  // ========== SINAVLAR ==========
  getAllOrtakSinavlar: () => {
    console.log("📋 Preload: getAllOrtakSinavlar çağrıldı");
    return ipcRenderer.invoke("get-all-ortak-sinavlar");
  },

  addOrtakSinav: (sinavData) => {
    console.log("🆕 Preload: addOrtakSinav çağrıldı");
    return ipcRenderer.invoke("add-ortak-sinav", sinavData);
  },

  updateOrtakSinav: (sinavId, sinavData) => {
    console.log("✏️ Preload: updateOrtakSinav çağrıldı, ID:", sinavId);
    return ipcRenderer.invoke("update-ortak-sinav", sinavId, sinavData);
  },

  deleteOrtakSinav: (sinavId) => {
    console.log("🗑️ Preload: deleteOrtakSinav çağrıldı, ID:", sinavId);
    return ipcRenderer.invoke("delete-ortak-sinav", sinavId);
  },

  toggleSinavLock: (sinavId) => {
    console.log("🔒 Preload: toggleSinavLock çağrıldı, ID:", sinavId);
    return ipcRenderer.invoke("toggle-sinav-lock", sinavId);
  },

  // ========== KELEBEK İÇİN EKSİK API'LER EKLENDİ (HATA ÇÖZÜLDÜ) ==========
  getKelebekOgrenciler: () => {
    console.log("📋 Preload: getKelebekOgrenciler çağrıldı");
    return ipcRenderer.invoke("get-kelebek-ogrenciler");
  },

  getKelebekSalonlar: () => {
    console.log("📋 Preload: getKelebekSalonlar çağrıldı");
    return ipcRenderer.invoke("get-kelebek-salonlar");
  },

  // ========== DAĞITIM (KELEBEK) ==========
  kelebekDagitimiYap: (sinavId, salonIds, ogrenciIds, sabitlenenler) => {
    console.log("🦋 Preload: kelebekDagitimiYap çağrıldı");
    console.log(`   • Sınav ID: ${sinavId}`);
    console.log(`   • Salon Sayısı: ${salonIds.length}`);
    console.log(`   • Öğrenci Sayısı: ${ogrenciIds.length}`);
    return ipcRenderer.invoke(
      "kelebek-dagitimi-yap",
      sinavId,
      salonIds,
      ogrenciIds,
      sabitlenenler
    );
  },

  getSinavDagitim: (sinavId) => {
    console.log("📋 Preload: getSinavDagitim çağrıldı, ID:", sinavId);
    return ipcRenderer.invoke("get-sinav-dagitim", sinavId);
  },

  toggleOgrenciSabitle: (dagitimId) => {
    console.log("📌 Preload: toggleOgrenciSabitle çağrıldı, ID:", dagitimId);
    return ipcRenderer.invoke("toggle-ogrenci-sabitle", dagitimId);
  },

  // ========== GÖZETMEN ATAMA ==========
  addSinavGozetmen: (sinavId, ogretmenId, salonId, gorevTuru) => {
    console.log("👨‍🏫 Preload: addSinavGozetmen çağrıldı");
    return ipcRenderer.invoke(
      "add-sinav-gozetmen",
      sinavId,
      ogretmenId,
      salonId,
      gorevTuru
    );
  },

  getSinavGozetmenler: (sinavId) => {
    console.log("📋 Preload: getSinavGozetmenler çağrıldı, ID:", sinavId);
    return ipcRenderer.invoke("get-sinav-gozetmenler", sinavId);
  },

  deleteSinavGozetmen: (gozetmenId) => {
    console.log("🗑️ Preload: deleteSinavGozetmen çağrıldı, ID:", gozetmenId);
    return ipcRenderer.invoke("delete-sinav-gozetmen", gozetmenId);
  },

  // ========== AÇIKLAMALAR ==========
  getAllSinavAciklamalar: () => {
    console.log("📋 Preload: getAllSinavAciklamalar çağrıldı");
    return ipcRenderer.invoke("get-all-sinav-aciklamalar");
  },

  addSinavAciklama: (aciklama, sira) => {
    console.log("🆕 Preload: addSinavAciklama çağrıldı");
    return ipcRenderer.invoke("add-sinav-aciklama", aciklama, sira);
  },

  updateSinavAciklama: (aciklamaId, aciklama, sira) => {
    console.log("✏️ Preload: updateSinavAciklama çağrıldı, ID:", aciklamaId);
    return ipcRenderer.invoke(
      "update-sinav-aciklama",
      aciklamaId,
      aciklama,
      sira
    );
  },

  deleteSinavAciklama: (aciklamaId) => {
    console.log("🗑️ Preload: deleteSinavAciklama çağrıldı, ID:", aciklamaId);
    return ipcRenderer.invoke("delete-sinav-aciklama", aciklamaId);
  },

  // ==========================================
  // 🆕 AKILLI GÖZETMEN DAĞITIM SİSTEMİ
  // ==========================================

  akillilGozetmenDagit: (sinavId, salonId) => {
    console.log("🤖 Preload: akillilGozetmenDagit çağrıldı");
    console.log(`   • Sınav ID: ${sinavId}`);
    console.log(`   • Salon ID: ${salonId}`);
    return ipcRenderer.invoke("akilli-gozetmen-dagit", sinavId, salonId);
  },

  getOgretmenGorevPuanlari: (donem) => {
    console.log("📊 Preload: getOgretmenGorevPuanlari çağrıldı");
    return ipcRenderer.invoke("get-ogretmen-gorev-puanlari", donem);
  },

  // ==========================================
  // 🆕 QR KOD SİSTEMİ
  // ==========================================

  generateQrKod: (sinavId, qrTuru, hedefId) => {
    console.log("📱 Preload: generateQrKod çağrıldı");
    console.log(`   • Sınav ID: ${sinavId}`);
    console.log(`   • QR Türü: ${qrTuru}`);
    console.log(`   • Hedef ID: ${hedefId}`);
    return ipcRenderer.invoke("generate-qr-kod", sinavId, qrTuru, hedefId);
  },

  verifyQrKod: (qrHash) => {
    console.log("🔍 Preload: verifyQrKod çağrıldı");
    return ipcRenderer.invoke("verify-qr-kod", qrHash);
  },

  // ==========================================
  // 🆕 DİJİTAL YOKLAMA VE DİSİPLİN SİSTEMİ
  // ==========================================

  kaydetYoklama: (yoklamaData) => {
    console.log("📝 Preload: kaydetYoklama çağrıldı");
    console.log(`   • Öğrenci ID: ${yoklamaData.ogrenci_id}`);
    console.log(`   • Durum: ${yoklamaData.yoklama_durumu}`);
    return ipcRenderer.invoke("kaydet-yoklama", yoklamaData);
  },

  kaydetDisiplin: (disiplinData) => {
    console.log("⚠️ Preload: kaydetDisiplin çağrıldı");
    console.log(`   • Öğrenci ID: ${disiplinData.ogrenci_id}`);
    console.log(`   • Disiplin Türü: ${disiplinData.disiplin_turu}`);
    return ipcRenderer.invoke("kaydet-disiplin", disiplinData);
  },

  getSalonYoklama: (sinavId, salonId) => {
    console.log("📋 Preload: getSalonYoklama çağrıldı");
    console.log(`   • Sınav ID: ${sinavId}`);
    console.log(`   • Salon ID: ${salonId}`);
    return ipcRenderer.invoke("get-salon-yoklama", sinavId, salonId);
  },

  // ==========================================
  // 🆕 SINAV KONTROL PANELİ
  // ==========================================

  validateSinav: (sinavData) => {
    console.log("🔍 Preload: validateSinav çağrıldı");
    return ipcRenderer.invoke("validate-sinav", sinavData);
  },

  getSinavUyarilari: (sinavId) => {
    console.log("📋 Preload: getSinavUyarilari çağrıldı");
    return ipcRenderer.invoke("get-sinav-uyarilari", sinavId);
  },

  // ==========================================
  // 🆕 FOTOĞRAF YÜKLEME (DİSİPLİN İÇİN)
  // ==========================================

  uploadDisiplinKanit: (fileData) => {
    console.log("📷 Preload: uploadDisiplinKanit çağrıldı");
    return ipcRenderer.invoke("upload-disiplin-kanit", fileData);
  },

  // ==========================================
  // 📁 DOSYA YÖNETİMİ
  // ==========================================

  uploadFile: (fileData) => ipcRenderer.invoke("upload-file", fileData),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),

  // ==========================================
  // 🔔 BİLDİRİM SİSTEMİ
  // ==========================================

  showNotification: (title, body, options = {}) => {
    console.log("🔔 Preload: showNotification çağrıldı");
    return ipcRenderer.invoke("show-notification", title, body, options);
  },

  onNotificationClick: (callback) => {
    ipcRenderer.on("notification-click", (event, data) => callback(data));
  },
};

// ==========================================
// ✅ BAŞLATMA KONTROLÜ
// ==========================================

console.log("✅ Preload başarıyla yüklendi - electronAPI window'a eklendi");
console.log("✅ Ders Programı API'leri yüklendi - 100+ endpoint hazır");
console.log("✅ 🚀 Algoritma Entegrasyon API'leri aktif");
console.log("✅ 📊 Performance Tracking API'leri aktif");
console.log("✅ 💾 Solution Variants API'leri aktif");
console.log("✅ 🎯 Kısıtlar ve Tercihler API'leri aktif");
console.log("✅ 🤖 Yapay Zeka Uyarı Sistemi aktif");
console.log("✅ 📈 İstatistik ve Analitik API'leri aktif");
console.log("✅ 🎨 Export API'leri aktif (PDF, Excel, Image)");
console.log("✅ 🔔 Bildirim Sistemi aktif");
console.log("✅ 📝 Ortak Sınav (Kelebek) Sistemi API'leri aktif (23 endpoint)");
console.log("✅ 🔄 Güncelleme Sistemi API'leri aktif (7 endpoint)"); // ← YENİ
console.log("=".repeat(60));
console.log("🎉 TÜM SİSTEMLER HAZIR!");
console.log("=".repeat(60));

// Version check
if (window.electronAPI) {
  console.log(
    "✅ electronAPI.getStatsForClass:",
    typeof window.electronAPI.getStatsForClass
  );
  console.log(
    "✅ electronAPI.saveSinifDersOgretmenAtama:",
    typeof window.electronAPI.saveSinifDersOgretmenAtama
  );
  console.log(
    "✅ electronAPI.getAllDerslerWithBlocks:",
    typeof window.electronAPI.getAllDerslerWithBlocks
  );
  console.log(
    "✅ electronAPI.saveAlgorithmConfig:",
    typeof window.electronAPI.saveAlgorithmConfig
  );
  console.log(
    "✅ electronAPI.runScheduleAlgorithm:",
    typeof window.electronAPI.runScheduleAlgorithm
  );
  console.log(
    "✅ electronAPI.saveSolutionVariant:",
    typeof window.electronAPI.saveSolutionVariant
  );
  console.log(
    "✅ electronAPI.getPerformanceHistory:",
    typeof window.electronAPI.getPerformanceHistory
  );
  console.log(
    "✅ electronAPI.checkForUpdates:",
    typeof window.electronAPI.checkForUpdates
  );
  console.log(
    "✅ electronAPI.quitAndInstall:",
    typeof window.electronAPI.quitAndInstall
  );
}

console.log("✅ 🤖 Akıllı Gözetmen Dağıtım API'leri aktif");
console.log("✅ 📱 QR Kod Sistemi API'leri aktif");
console.log("✅ 📝 Dijital Yoklama & Disiplin API'leri aktif");
console.log("✅ 🔍 Sınav Kontrol Paneli API'leri aktif");
