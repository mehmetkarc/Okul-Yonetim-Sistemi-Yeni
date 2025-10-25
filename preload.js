// ==========================================
// ✅ PRELOAD.JS — 2025.10 GÜNCELLENMİŞ SÜRÜM
// ==========================================
const { contextBridge, ipcRenderer } = require("electron");

try {
  contextBridge.exposeInMainWorld("electronAPI", {
    // ------------------------------
    // 📦 Uygulama Bilgileri
    // ------------------------------
    getAppPath: () => ipcRenderer.invoke("get-app-path"),
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),

    // ------------------------------
    // 🔄 Güncelleme Sistemi
    // ------------------------------
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    startUpdateDownload: () => ipcRenderer.invoke("start-update-download"),
    onUpdateAvailable: (callback) =>
      ipcRenderer.on("update-available", (event, data) => callback(data)),
    onUpdateProgress: (callback) =>
      ipcRenderer.on("update-progress", (event, data) => callback(data)),
    onUpdateDownloaded: (callback) =>
      ipcRenderer.on("update-downloaded", (event, data) => callback(data)),
    onUpdateError: (callback) =>
      ipcRenderer.on("update-error", (event, message) => callback(message)),

    // ------------------------------
    // 🧠 Veritabanı İşlemleri
    // ------------------------------
    dbQuery: (sql, params) => ipcRenderer.invoke("db-query", sql, params),
    dbExec: (sql, params) => ipcRenderer.invoke("db-exec", sql, params),

    // ------------------------------
    // 💾 Yedekleme Sistemi
    // ------------------------------
    createBackup: (type) => ipcRenderer.invoke("create-backup", type),
    restoreBackup: (filePath) => ipcRenderer.invoke("restore-backup", filePath),
    getBackupList: () => ipcRenderer.invoke("get-backup-list"),

    // ------------------------------
    // 📁 Dosya İşlemleri
    // ------------------------------
    selectFile: (options) => ipcRenderer.invoke("select-file", options),
    saveFile: (options, data) => ipcRenderer.invoke("save-file", options, data),

    // ------------------------------
    // 📸 FOTOĞRAF İŞLEMLERİ - YENİ
    // ------------------------------
    sendPhotos: (photos) => {
      console.log("🚀 Preload: sendPhotos çağrıldı, gönderiliyor...");
      ipcRenderer.send("photos-parsed", photos);
    },

    // ✅ YENİ: mebbis-save-photos invoke
    saveMebbisPhotos: (photos) => {
      console.log("💾 Preload: saveMebbisPhotos invoke ediliyor...");
      return ipcRenderer.invoke("mebbis-save-photos", photos);
    },

    // ✅ YENİ: Listener kurma fonksiyonu
    onMebbisPhotosParsed: (callback) => {
      console.log("📌 Preload: mebbis-photos-parsed listener kuruluyor...");
      ipcRenderer.on("mebbis-photos-parsed", (event, data) => {
        console.log("🎯 Preload: mebbis-photos-parsed event alındı!");
        callback(data);
      });
    },

    // ✅ YENİ: Listener kaldırma
    removePhotosParsedListener: () => {
      ipcRenderer.removeAllListeners("mebbis-photos-parsed");
      console.log("🧹 Preload: mebbis-photos-parsed listener'ları temizlendi");
    },

    // ------------------------------
    // 🪄 Geliştirici Log Kanalı
    // ------------------------------
    logToMain: (msg) => ipcRenderer.send("log-message", msg),

    // ------------------------------
    // 📊 RAPORLAR İÇİN - YENİ
    // ------------------------------
    getAllStudents: (rol, userId) => {
      console.log("📋 Preload: getAllStudents çağrıldı");
      return ipcRenderer.invoke("get-all-students", rol, userId);
    },

    // ------------------------------
    // 📚 TÜM ÖĞRETMENLERİ GETİR
    // ------------------------------
    getAllTeachers: () => {
      console.log("📚 Preload: getAllTeachers çağrıldı");
      return ipcRenderer.invoke("get-all-teachers");
    },

    // ------------------------------
    // 📄 PDF OLUŞTUR - YENİ
    // ------------------------------
    createPDF: (options) => {
      console.log("📄 Preload: createPDF çağrıldı");
      return ipcRenderer.invoke("create-pdf", options);
    },

    // ------------------------------
    // 📊 EXCEL OLUŞTUR - YENİ
    // ------------------------------
    createExcel: (options) => {
      console.log("📊 Preload: createExcel çağrıldı");
      return ipcRenderer.invoke("create-excel", options);
    },
  });

  console.log("✅ Preload başarıyla yüklendi ve electronAPI expose edildi.");
} catch (error) {
  console.error("❌ Preload: contextBridge hatası:", error);
}
