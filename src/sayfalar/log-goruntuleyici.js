// ==========================================
// LOG GÖRÜNTÜLEYİCİ - JAVASCRIPT
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let allLogs = [];
let filteredLogs = [];
let autoRefreshInterval = null;

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Log Görüntüleyici sayfası yüklendi");

  // Kullanıcı bilgilerini yükle
  loadUserInfo();

  // Logları yükle
  loadLogs();

  // Event listener'ları ekle
  initEventListeners();
});

// ==========================================
// SAYFA KAPATILINCA DURDUR
// ==========================================

window.addEventListener("beforeunload", () => {
  stopAutoRefresh();
});

// ==========================================
// KULLANICI BİLGİLERİ
// ==========================================

function loadUserInfo() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  if (currentUser.kullanici_adi) {
    const initials = currentUser.kullanici_adi
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    document.getElementById("userInitials").textContent = initials;
  }
}

// ==========================================
// EVENT LISTENER'LAR
// ==========================================

function initEventListeners() {
  // Arama
  document.getElementById("searchInput").addEventListener("input", (e) => {
    filterLogs();
  });

  // Seviye filtresi
  document.getElementById("levelFilter").addEventListener("change", () => {
    filterLogs();
  });

  // Tarih filtresi
  document.getElementById("dateFilter").addEventListener("change", () => {
    filterLogs();
  });

  // Otomatik yenileme
  document
    .getElementById("autoRefreshCheckbox")
    .addEventListener("change", (e) => {
      if (e.target.checked) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
}

// ==========================================
// LOGLARI YÜKLE
// ==========================================

async function loadLogs() {
  try {
    console.log("📜 Loglar yükleniyor...");

    const result = await ipcRenderer.invoke("get-all-logs", {
      limit: 500,
    });

    if (result.success) {
      allLogs = result.data;

      console.log(`✅ ${allLogs.length} log yüklendi`);

      // İstatistikleri güncelle
      updateStats();

      // Filtreleme uygula
      filterLogs();
    } else {
      Bildirim.error(result.message || "Loglar yüklenemedi!");
      renderEmptyState("Loglar yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Log yükleme hatası:", error);
    Bildirim.error("Loglar yüklenirken hata oluştu!");
    renderEmptyState("Loglar yüklenirken hata oluştu!");
  }
}

// ==========================================
// İSTATİSTİKLERİ GÜNCELLE
// ==========================================

function updateStats() {
  const infoCount = allLogs.filter((l) => l.level === "info").length;
  const successCount = allLogs.filter((l) => l.level === "success").length;
  const warningCount = allLogs.filter((l) => l.level === "warn").length;
  const errorCount = allLogs.filter((l) => l.level === "error").length;

  document.getElementById("infoCount").textContent = infoCount;
  document.getElementById("successCount").textContent = successCount;
  document.getElementById("warningCount").textContent = warningCount;
  document.getElementById("errorCount").textContent = errorCount;
  document.getElementById("totalCount").textContent = allLogs.length;
}

// ==========================================
// FİLTRELEME
// ==========================================

function filterLogs() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const levelFilter = document.getElementById("levelFilter").value;
  const dateFilter = document.getElementById("dateFilter").value;

  filteredLogs = allLogs.filter((log) => {
    // Arama filtresi
    const matchSearch =
      !searchTerm ||
      log.message.toLowerCase().includes(searchTerm) ||
      (log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchTerm));

    // Seviye filtresi
    const matchLevel = levelFilter === "all" || log.level === levelFilter;

    // Tarih filtresi
    let matchDate = true;
    if (dateFilter !== "all") {
      const logDate = new Date(log.timestamp);
      const now = new Date();

      switch (dateFilter) {
        case "today":
          matchDate = logDate.toDateString() === now.toDateString();
          break;
        case "yesterday":
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          matchDate = logDate.toDateString() === yesterday.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchDate = logDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchDate = logDate >= monthAgo;
          break;
      }
    }

    return matchSearch && matchLevel && matchDate;
  });

  renderTable();
}

// ==========================================
// TABLO RENDER
// ==========================================

function renderTable() {
  const tbody = document.getElementById("logTableBody");

  if (filteredLogs.length === 0) {
    renderEmptyState("Gösterilecek log bulunamadı");
    return;
  }

  tbody.innerHTML = filteredLogs
    .map((log, index) => {
      const levelBadge = getLevelBadge(log.level);
      const timestamp = new Date(log.timestamp).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const message =
        log.message.length > 100
          ? log.message.substring(0, 100) + "..."
          : log.message;

      return `
        <tr>
          <td>${levelBadge}</td>
          <td style="color: #888; font-size: 12px; font-family: monospace;">${timestamp}</td>
          <td style="color: #ddd;">${escapeHtml(message)}</td>
          <td>
            <button 
              class="btn-icon" 
              onclick="showLogDetail(${index})" 
              title="Detay"
              style="width: 32px; height: 32px; border: none; background: rgba(0, 217, 255, 0.1); 
                     color: #00d9ff; border-radius: 6px; cursor: pointer; font-size: 14px;
                     transition: all 0.2s;"
              onmouseover="this.style.background='rgba(0, 217, 255, 0.2)'"
              onmouseout="this.style.background='rgba(0, 217, 255, 0.1)'"
            >
              🔍
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  // Bilgi güncelle
  document.getElementById(
    "showingInfo"
  ).textContent = `Gösteriliyor: ${filteredLogs.length} / ${allLogs.length} log`;
}

// ==========================================
// BOŞ DURUM
// ==========================================

function renderEmptyState(message) {
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; padding: 60px 20px; color: #888;">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;

  document.getElementById("showingInfo").textContent = "Gösteriliyor: 0 log";
}

// ==========================================
// SEVİYE BADGE
// ==========================================

function getLevelBadge(level) {
  const badges = {
    info: { icon: "ℹ️", text: "Info", class: "level-info" },
    success: { icon: "✅", text: "Success", class: "level-success" },
    warn: { icon: "⚠️", text: "Warning", class: "level-warn" },
    error: { icon: "❌", text: "Error", class: "level-error" },
  };

  const badge = badges[level] || badges.info;

  return `<span class="level-badge ${badge.class}">${badge.icon} ${badge.text}</span>`;
}

// ==========================================
// LOG DETAY GÖSTER
// ==========================================

function showLogDetail(index) {
  const log = filteredLogs[index];

  if (!log) return;

  // Icon'u güncelle
  const iconMap = {
    info: "ℹ️",
    success: "✅",
    warn: "⚠️",
    error: "❌",
  };

  document.getElementById("detailIcon").textContent =
    iconMap[log.level] || "📜";

  // Timestamp
  const timestamp = new Date(log.timestamp).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  document.getElementById("detailTimestamp").textContent = timestamp;

  // Seviye
  document.getElementById("detailLevel").innerHTML = getLevelBadge(log.level);

  // Mesaj
  document.getElementById("detailMessage").textContent = log.message;

  // Meta
  if (log.meta && Object.keys(log.meta).length > 0) {
    document.getElementById("detailMetaSection").style.display = "block";
    document.getElementById("detailMeta").textContent = JSON.stringify(
      log.meta,
      null,
      2
    );
  } else {
    document.getElementById("detailMetaSection").style.display = "none";
  }

  // Stack trace
  if (log.stack) {
    document.getElementById("detailStackSection").style.display = "block";
    document.getElementById("detailStack").textContent = log.stack;
  } else {
    document.getElementById("detailStackSection").style.display = "none";
  }

  // Modal'ı aç
  document.getElementById("modalLogDetail").style.display = "flex";
}

// ==========================================
// EXPORT
// ==========================================

async function exportLogs(format) {
  try {
    Bildirim.info(
      `Loglar ${format.toUpperCase()} formatında export ediliyor...`
    );

    const result = await ipcRenderer.invoke("export-logs", format);

    if (result.success) {
      Bildirim.success("Loglar başarıyla export edildi!");
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Export hatası:", error);
    Bildirim.error("Export sırasında hata oluştu!");
  }
}

// ==========================================
// KLASÖR AÇ
// ==========================================

async function openLogFolder() {
  try {
    await ipcRenderer.invoke("open-log-folder");
  } catch (error) {
    console.error("❌ Klasör açma hatası:", error);
  }
}

// ==========================================
// LOGLARI TEMİZLE
// ==========================================

async function clearLogs() {
  const confirm = await Bildirim.confirm(
    "**⚠️ DİKKAT!**\n\n" +
      "Tüm loglar kalıcı olarak silinecek. Bu işlem geri alınamaz!\n\n" +
      "Devam etmek istiyor musunuz?",
    "Logları Temizle",
    {
      icon: "🗑️",
      confirmText: "Evet, Temizle",
      cancelText: "Hayır",
      type: "danger",
    }
  );

  if (confirm !== true) return;

  try {
    Bildirim.info("Loglar temizleniyor...");

    const result = await ipcRenderer.invoke("clear-logs", "all");

    if (result.success) {
      Bildirim.success("Loglar başarıyla temizlendi!");
      allLogs = [];
      filteredLogs = [];
      updateStats();
      renderEmptyState("Loglar temizlendi");
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Log temizleme hatası:", error);
    Bildirim.error("Loglar temizlenirken hata oluştu!");
  }
}

// ==========================================
// OTOMATİK YENİLEME
// ==========================================

function startAutoRefresh() {
  // Önceki interval'i temizle
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  // 5 saniyede bir yenile
  autoRefreshInterval = setInterval(() => {
    loadLogs();
  }, 5000);

  console.log("🔄 Otomatik yenileme başlatıldı (5 saniye)");
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log("⏸️ Otomatik yenileme durduruldu");
  }
}

// ==========================================
// MODAL KAPAT
// ==========================================

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

console.log("✅ Log Görüntüleyici scripti yüklendi");
