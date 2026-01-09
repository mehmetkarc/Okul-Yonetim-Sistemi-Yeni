// ==========================================
// LOG SİSTEMİ - WINSTON LOGGER
// ==========================================

const winston = require("winston");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Log klasörü
const logDir = path.join(
  os.homedir(),
  "Documents",
  "OkulYonetimSistemi",
  "Logs"
);

// Klasör yoksa oluştur
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ✅ CUSTOM LEVELS (SUCCESS EKLENDI)
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
  },
  colors: {
    error: "red",
    warn: "yellow",
    success: "green",
    info: "blue",
  },
};

winston.addColors(customLevels.colors);

// Winston logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Tüm loglar
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Sadece hatalar
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

// Geliştirme modunda console'a da yazdır
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// ✅ TEST LOGLARI (İLK AÇILIŞTA)
logger.info("Logger başlatıldı", {
  logDir: logDir,
  module: "logger-init",
});

logger.success("Logger sistemi aktif", {
  timestamp: new Date().toISOString(),
  module: "logger-init",
});

module.exports = logger;
