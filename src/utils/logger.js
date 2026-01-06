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

// Winston logger
const logger = winston.createLogger({
  level: "info",
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

module.exports = logger;
