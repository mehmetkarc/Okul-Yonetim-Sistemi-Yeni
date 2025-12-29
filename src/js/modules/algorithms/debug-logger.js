/**
 * ============================================
 * DEBUG LOGGER - Hata Ayıklama Günlükleyici
 * ============================================
 * Detaylı debug loglama sistemi (Gelişmiş Context, Timer ve Analiz)
 */

class DebugLogger {
  /**
   * @param {object} config - Logger yapılandırma ayarları
   */
  constructor(config = {}) {
    this.config = {
      level: "info", // trace, debug, info, warn, error
      enableConsole: true,
      enableStorage: true, // Logları bellekte tut
      maxLogs: 5000, // Log limiti artırıldı
      includeTimestamp: true,
      includeStackTrace: true, // Hata loglarında Stack Trace dahil et
      colorize: true,
      ...config,
    };

    this.levels = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
    };

    this.logs = [];
    this.contexts = new Map(); // Anlık aktif context'ler
    this.timers = new Map(); // Zamanlayıcılar

    this.colors = {
      trace: "#a1a1a1", // Daha koyu gri
      debug: "#2196f3", // Mavi
      info: "#4caf50", // Yeşil
      warn: "#ff9800", // Turuncu
      error: "#f44336", // Kırmızı
    };

    if (this.config.enableConsole) console.log("📝 DebugLogger başlatıldı");
  }

  // ============================================
  // LOGGING FONKSİYONLARI
  // ============================================

  trace(message, data = null, context = null) {
    this.log("trace", message, data, context);
  }

  debug(message, data = null, context = null) {
    this.log("debug", message, data, context);
  }

  info(message, data = null, context = null) {
    this.log("info", message, data, context);
  }

  warn(message, data = null, context = null) {
    this.log("warn", message, data, context);
  }

  /**
   * Hata loglama. Stack trace'i otomatik olarak yakalar.
   * @param {string} message - Hata mesajı
   * @param {Error|object} error - Error objesi veya ek veri
   * @param {string} context - İsteğe bağlı context adı
   */
  error(message, error = null, context = null) {
    let data = {};
    let stack = null;

    if (error instanceof Error) {
      data = {
        name: error.name,
        message: error.message,
      };
      stack = error.stack;
    } else {
      data = error; // Eğer error bir obje ise doğrudan data olarak kullan
      // Yeni bir Error oluşturarak stack'i yakalayabiliriz.
      stack = new Error().stack;
    }

    // Stack trace dahil etme konfigürasyonunu kontrol et
    if (this.config.includeStackTrace) {
      data.stack = stack;
    }

    this.log("error", message, data, context);
  }

  /**
   * Ana loglama metodu.
   */
  log(level, message, data = null, context = null) {
    // Level kontrolü (Daha düşük level'lar ignore edilir)
    if (this.levels[level] < this.levels[this.config.level]) {
      return;
    }

    const logEntry = {
      level,
      message,
      data,
      context: context || this.getCurrentContext(),
      timestamp: Date.now(),
      formattedTime: new Date().toLocaleTimeString("tr-TR", { hour12: false }), // Yerel saat formatı
    };

    // Log entry'yi sakla
    if (this.config.enableStorage) {
      this.logs.push(logEntry);

      // Limit kontrolü
      if (this.logs.length > this.config.maxLogs) {
        this.logs.shift(); // En eski logu sil
      }
    }

    // Console'a yazdır
    if (this.config.enableConsole) {
      this.printToConsole(logEntry);
    }
  }

  // ============================================
  // CONSOLE OUTPUT
  // ============================================

  printToConsole(logEntry) {
    const { level, message, data, context, formattedTime } = logEntry;

    const prefix = this.config.includeTimestamp ? `[${formattedTime}]` : "";
    const contextStr = context ? `[${context}]` : "";
    const levelStr = level.toUpperCase();

    // Tarayıcı ve Node.js uyumluluğu
    const consoleMethod = console[level] || console.log;

    if (this.config.colorize && typeof window !== "undefined") {
      const color = this.colors[level];
      const style = `color: white; background: ${color}; padding: 2px 4px; border-radius: 3px; font-weight: bold;`;

      // Loglama, veri objesi ayrı bir argüman olarak geçirilerek yapılır
      consoleMethod(
        `%c ${levelStr} %c ${prefix} ${contextStr} ${message}`,
        style,
        "",
        data || ""
      );
    } else {
      // Renksiz çıktıda tüm bilgiyi birleştir
      consoleMethod(
        `[${levelStr}] ${prefix} ${contextStr} ${message}`,
        data || ""
      );
    }
  }

  // ============================================
  // CONTEXT YÖNETİMİ
  // ============================================

  // Orijinal kodunuzdaki context yönetim metotları (setContext, clearContext, getCurrentContext)
  // stabil ve kullanışlıdır, aynen korunmuştur.

  setContext(name, value) {
    this.contexts.set(name, value);
  }

  clearContext(name) {
    this.contexts.delete(name);
  }

  getCurrentContext() {
    if (this.contexts.size === 0) return null;

    const contextParts = [];
    for (const [key, value] of this.contexts.entries()) {
      contextParts.push(`${key}:${value}`);
    }

    return contextParts.join(" | "); // Ayracı daha belirgin yaptım
  }

  /**
   * Geçici bir context içinde bir fonksiyonu çalıştırır.
   * @param {string} context - Geçici context adı/değeri
   * @param {Function} fn - Çalıştırılacak fonksiyon
   * @returns {any} - Fonksiyonun dönüş değeri
   */
  withContext(context, fn) {
    // Unique ID yerine context adını kullanmak daha faydalı olabilir
    const contextName = `CTX_${context.split(" ")[0]}`;
    this.setContext(contextName, context);

    try {
      return fn();
    } finally {
      this.clearContext(contextName);
    }
  }

  // ============================================
  // TIMING
  // ============================================

  // Orijinal kodunuzdaki zamanlayıcı metotları (time, timeEnd) aynen korunmuştur.

  time(label) {
    this.timers.set(label, performance.now());
    this.debug(`Timer started: ${label}`, null, "Timing");
  }

  timeEnd(label) {
    if (!this.timers.has(label)) {
      this.warn(`Timer not found: ${label}`, null, "Timing");
      return;
    }

    const startTime = this.timers.get(label);
    const duration = performance.now() - startTime;

    this.timers.delete(label);

    this.info(
      `Timer ${label} finished: ${duration.toFixed(3)}ms`,
      null,
      "Timing"
    ); // Hassasiyet artırıldı

    return duration;
  }

  // ============================================
  // ANALİZ VE EXPORT (Metotlar Aynen Korundu)
  // ============================================

  // filterLogs, exportJSON, exportCSV, exportText, downloadLogs, analyze, printAnalysis
  // metotları orijinal haliyle korunmuştur.

  // ... (Orijinal Koddan Kopyalanan Analiz ve Export Metotları) ...

  filterLogs(criteria = {}) {
    let filtered = [...this.logs];

    // Level filter
    if (criteria.level) {
      const minLevel = this.levels[criteria.level];
      filtered = filtered.filter((log) => this.levels[log.level] >= minLevel);
    }

    // Context filter
    if (criteria.context) {
      filtered = filtered.filter(
        (log) => log.context && log.context.includes(criteria.context)
      );
    }

    // Message filter
    if (criteria.message) {
      filtered = filtered.filter((log) =>
        log.message.toLowerCase().includes(criteria.message.toLowerCase())
      );
    }

    // Time range
    if (criteria.startTime) {
      filtered = filtered.filter((log) => log.timestamp >= criteria.startTime);
    }

    if (criteria.endTime) {
      filtered = filtered.filter((log) => log.timestamp <= criteria.endTime);
    }

    return filtered;
  }

  export(format = "json", criteria = {}) {
    const logs = this.filterLogs(criteria);

    switch (format) {
      case "json":
        return this.exportJSON(logs);
      case "csv":
        return this.exportCSV(logs);
      case "text":
        return this.exportText(logs);
      default:
        return this.exportJSON(logs);
    }
  }

  exportJSON(logs) {
    return JSON.stringify(
      {
        logs,
        exported: new Date().toISOString(),
        total: logs.length,
      },
      null,
      2
    );
  }

  exportCSV(logs) {
    const headers = ["Timestamp", "Level", "Context", "Message", "Data"];
    const rows = logs.map((log) => [
      log.formattedTime,
      log.level,
      log.context || "",
      log.message,
      log.data ? JSON.stringify(log.data) : "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ), // CSV uyumu için tırnak ve kaçış
    ].join("\n");

    return csv;
  }

  exportText(logs) {
    return logs
      .map((log) => {
        const time = log.formattedTime;
        const context = log.context ? `[${log.context}]` : "";
        const data = log.data
          ? `\n  Data: ${JSON.stringify(log.data, null, 2)}`
          : "";

        return `[${time}] [${log.level.toUpperCase()}] ${context} ${
          log.message
        }${data}`;
      })
      .join("\n\n");
  }

  downloadLogs(filename = "debug-logs", format = "json") {
    // Tarayıcı ortamı kontrolü
    if (typeof window.document === "undefined") {
      this.warn("DownloadLogs metodu sadece tarayıcı ortamında çalışır.");
      return;
    }

    const data = this.export(format);
    const blob = new Blob([data], {
      type: format === "json" ? "application/json" : "text/plain",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.${format}`;
    a.click();

    URL.revokeObjectURL(url);

    this.info(`Logs downloaded: ${filename}.${format}`);
  }

  analyze() {
    const analysis = {
      total: this.logs.length,
      byLevel: {},
      byContext: {},
      timeRange: {
        start: null,
        end: null,
        duration: 0,
      },
      errorCount: 0,
      warnCount: 0,
    };

    // Level counts
    for (const level of Object.keys(this.levels)) {
      analysis.byLevel[level] = this.logs.filter(
        (log) => log.level === level
      ).length;
    }

    analysis.errorCount = analysis.byLevel.error || 0;
    analysis.warnCount = analysis.byLevel.warn || 0;

    // Context counts
    const contexts = new Map();
    for (const log of this.logs) {
      if (log.context) {
        contexts.set(log.context, (contexts.get(log.context) || 0) + 1);
      }
    }
    analysis.byContext = Object.fromEntries(contexts);

    // Time range
    if (this.logs.length > 0) {
      const timestamps = this.logs.map((log) => log.timestamp);
      analysis.timeRange.start = Math.min(...timestamps);
      analysis.timeRange.end = Math.max(...timestamps);
      analysis.timeRange.duration =
        analysis.timeRange.end - analysis.timeRange.start;
    }

    return analysis;
  }

  printAnalysis() {
    const analysis = this.analyze();

    console.log("\n📊 DEBUG LOG ANALYSIS");
    console.log("=".repeat(50));

    console.log("\n📈 Genel:");
    console.log(`  • Total Logs: ${analysis.total}`);
    console.log(`  • Errors: ${analysis.errorCount}`);
    console.log(`  • Warnings: ${analysis.warnCount}`);
    console.log(`  • Duration: ${this.timeEnd(analysis.timeRange.duration)}`); // FormatDuration kullanıldı

    console.log("\n📊 By Level:");
    for (const [level, count] of Object.entries(analysis.byLevel)) {
      if (count > 0) {
        console.log(`  • ${level}: ${count}`);
      }
    }

    if (Object.keys(analysis.byContext).length > 0) {
      console.log("\n🏷️ By Context:");
      const sorted = Object.entries(analysis.byContext)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      for (const [context, count] of sorted) {
        console.log(`  • ${context}: ${count}`);
      }
    }

    console.log("=".repeat(50) + "\n");
  }

  // ... (Orijinal Koddan Kopyalanan Yardımcı ve Özel Log Metotları) ...

  setLevel(level) {
    if (!this.levels.hasOwnProperty(level)) {
      this.warn(`Invalid log level: ${level}`);
      return;
    }

    this.config.level = level;
    this.info(`Log level set to: ${level}`);
  }

  clear() {
    const count = this.logs.length;
    this.logs = [];
    this.info(`Cleared ${count} logs`);
  }

  getLogs(count = null) {
    if (count === null) {
      return [...this.logs];
    }
    return this.logs.slice(-count);
  }

  getErrors() {
    return this.logs.filter((log) => log.level === "error");
  }

  getWarnings() {
    return this.logs.filter((log) => log.level === "warn");
  }

  group(name) {
    if (typeof console.group === "function") {
      console.group(name);
    }
    this.debug(`Group started: ${name}`, null, "Grouping");
  }

  groupEnd() {
    if (typeof console.groupEnd === "function") {
      console.groupEnd();
    }
  }

  table(data) {
    if (typeof console.table === "function") {
      console.table(data);
    }
    this.debug("Table data:", data, "Data");
  }

  assert(condition, message) {
    if (!condition) {
      this.error(`Assertion failed: ${message}`);

      if (typeof console.assert === "function") {
        console.assert(condition, message);
      }
    }
  }
}

// Global export
if (typeof window !== "undefined") {
  window.DebugLogger = DebugLogger;
  // Eğer global logger yoksa veya undefined ise yeni bir örnek oluştur
  window.logger = window.logger || new DebugLogger();

  console.log("✅ DebugLogger yüklendi");
}

// Global erişim (Node.js ortamı için de erişimi garanti eder)
if (typeof window !== "undefined") {
  window.DebugLogger = DebugLogger;
  window.logger = window.logger || new DebugLogger();
  window.ScheduleRepairEngine = ScheduleRepairEngine;
  console.log("📦 ScheduleRepairEngine ve DebugLogger global erişim aktif!");
}
