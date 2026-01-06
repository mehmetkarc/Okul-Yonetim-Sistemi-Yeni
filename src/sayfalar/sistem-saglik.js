// ==========================================
// SİSTEM SAĞLIĞI - JAVASCRIPT
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let cpuChart = null;
let memoryChart = null;
let updateInterval = null;
let cpuHistory = [];
let memoryHistory = [];
const MAX_HISTORY = 10;

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Sistem Sağlığı sayfası yüklendi");

  // Kullanıcı bilgilerini yükle
  loadUserInfo();

  // Grafikleri oluştur
  initCharts();

  // İlk veriyi yükle
  loadSystemHealth();

  // Otomatik yenilemeyi başlat (5 saniye)
  startAutoRefresh();
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
// GRAFİKLERİ OLUŞTUR
// ==========================================

function initCharts() {
  const cpuCtx = document.getElementById("cpuChart").getContext("2d");
  const memoryCtx = document.getElementById("memoryChart").getContext("2d");

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#888",
          callback: function (value) {
            return value + "%";
          },
        },
      },
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#888",
        },
      },
    },
  };

  cpuChart = new Chart(cpuCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "CPU Kullanımı",
          data: [],
          borderColor: "#00d9ff",
          backgroundColor: "rgba(0, 217, 255, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: chartOptions,
  });

  memoryChart = new Chart(memoryCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "RAM Kullanımı",
          data: [],
          borderColor: "#7b2fff",
          backgroundColor: "rgba(123, 47, 255, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: chartOptions,
  });

  console.log("✅ Grafikler oluşturuldu");
}

// ==========================================
// SİSTEM SAĞLIK BİLGİLERİNİ YÜKLE
// ==========================================

async function loadSystemHealth() {
  try {
    const result = await ipcRenderer.invoke("get-system-health");

    if (result.success) {
      const data = result.data;

      // CPU
      document.getElementById("cpuValue").textContent = data.cpu.usage + "%";
      document.getElementById("cpuCores").textContent =
        data.cpu.cores + " Çekirdek";
      document.getElementById("cpuTemp").textContent =
        data.cpu.temp.toFixed(1) + "°C";

      // Memory
      const memUsedGB = (data.memory.used / (1024 * 1024 * 1024)).toFixed(2);
      const memTotalGB = (data.memory.total / (1024 * 1024 * 1024)).toFixed(2);
      document.getElementById("memoryValue").textContent =
        data.memory.usagePercent + "%";
      document.getElementById("memoryUsed").textContent = memUsedGB + " GB";
      document.getElementById("memoryTotal").textContent = memTotalGB + " GB";

      // Disk
      const diskUsedGB = (data.disk.used / (1024 * 1024 * 1024)).toFixed(2);
      const diskTotalGB = (data.disk.total / (1024 * 1024 * 1024)).toFixed(2);
      document.getElementById("diskValue").textContent =
        data.disk.usagePercent + "%";
      document.getElementById("diskUsed").textContent = diskUsedGB + " GB";
      document.getElementById("diskTotal").textContent = diskTotalGB + " GB";

      // Database
      document.getElementById("dbSize").textContent =
        data.database.sizeInMB + " MB";
      document.getElementById("activeSchools").textContent =
        data.system.activeSchools + " Aktif Okul";

      // System Info
      document.getElementById("systemUptime").textContent = formatUptime(
        data.system.uptime
      );
      document.getElementById("platform").textContent = getPlatformName(
        data.system.platform
      );
      document.getElementById("hostname").textContent = data.system.hostname;

      if (data.system.lastBackup) {
        const lastBackupDate = new Date(data.system.lastBackup);
        document.getElementById("lastBackup").textContent =
          lastBackupDate.toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
      } else {
        document.getElementById("lastBackup").textContent = "Yedek yok";
      }

      // Grafikleri güncelle
      updateCharts(data.cpu.usage, data.memory.usagePercent);
    } else {
      console.error("❌ Sistem sağlık verisi alınamadı:", result.message);
    }
  } catch (error) {
    console.error("❌ Sistem sağlık yükleme hatası:", error);
  }
}

// ==========================================
// GRAFİKLERİ GÜNCELLE
// ==========================================

function updateCharts(cpuValue, memoryValue) {
  const now = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // CPU geçmişi
  cpuHistory.push(cpuValue);
  if (cpuHistory.length > MAX_HISTORY) {
    cpuHistory.shift();
  }

  // Memory geçmişi
  memoryHistory.push(memoryValue);
  if (memoryHistory.length > MAX_HISTORY) {
    memoryHistory.shift();
  }

  // Label'ları oluştur
  const labels = cpuHistory.map((_, index) => {
    if (index === cpuHistory.length - 1) return now;
    return "";
  });

  // CPU grafiğini güncelle
  cpuChart.data.labels = labels;
  cpuChart.data.datasets[0].data = cpuHistory;
  cpuChart.update("none"); // Animasyon olmadan güncelle (performans)

  // Memory grafiğini güncelle
  memoryChart.data.labels = labels;
  memoryChart.data.datasets[0].data = memoryHistory;
  memoryChart.update("none");
}

// ==========================================
// OTOMATİK YENİLEME
// ==========================================

function startAutoRefresh() {
  // ⚠️ ÖNCEKİ INTERVAL'İ TEMİZLE
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  // 5 saniyede bir yenile
  updateInterval = setInterval(() => {
    loadSystemHealth();
  }, 5000);

  console.log("🔄 Otomatik yenileme başlatıldı (5 saniye)");
}

function stopAutoRefresh() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    console.log("⏸️ Otomatik yenileme durduruldu");
  }
}

// ==========================================
// MANUEL YENİLEME
// ==========================================

function refreshData() {
  loadSystemHealth();
  Bildirim.success("Veriler yenilendi!");
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} gün ${hours} saat`;
  } else if (hours > 0) {
    return `${hours} saat ${minutes} dakika`;
  } else {
    return `${minutes} dakika`;
  }
}

function getPlatformName(platform) {
  const platforms = {
    win32: "Windows",
    darwin: "macOS",
    linux: "Linux",
  };
  return platforms[platform] || platform;
}

console.log("✅ Sistem Sağlığı scripti yüklendi");
