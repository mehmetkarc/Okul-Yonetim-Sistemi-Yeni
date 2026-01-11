// ==========================================
// 🎯 HANDLER YÖNETİM MERKEZİ
// ==========================================

const registerOrtakSinavHandlers = require("./ortak-sinav");

/**
 * Tüm handler'ları yükle
 * @param {Object} db - Veritabanı modülü
 */
function registerAllHandlers(db) {
  console.log("🚀 Handler'lar yükleniyor...");

  // Ortak Sınav Handler'larını yükle
  registerOrtakSinavHandlers(db);

  // TODO: Diğer handler'lar buraya eklenecek
  // registerOkulHandlers(db);
  // registerOgrenciHandlers(db);
  // registerOgretmenHandlers(db);
  // ...

  console.log("✅ Tüm Handler'lar yüklendi!");
}

module.exports = registerAllHandlers;
