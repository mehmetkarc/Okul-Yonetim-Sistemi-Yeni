/**
 * LOG GÖRÜNTÜLEYİCİ - FRONTEND MANTIĞI
 * Backend'deki IPC Handler'lar ile tam uyumlu çalışır.
 */

let allLogs = [];
let autoRefreshInterval = null;

// Sayfa yüklendiğinde başlat
document.addEventListener("DOMContentLoaded", () => {
  loadLogs();
  setupEventListeners();

  // Kullanıcı baş harflerini ayarla
  const userName = "Sistem Admin";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const avatarEl = document.getElementById("userInitials");
  if (avatarEl) avatarEl.innerHTML = `<span>${initials}</span>`;
});

// Event Listener'ları kur
function setupEventListeners() {
  // Arama kutusu (Canlı filtreleme)
  document.getElementById("searchInput").addEventListener("input", filterLogs);

  // Seviye filtresi
  document.getElementById("levelFilter").addEventListener("change", () => {
    loadLogs(); // Seviye filtresi backend'de olduğu için yeniden yükleme yapıyoruz
  });

  // Tarih filtresi
  document.getElementById("dateFilter").addEventListener("change", filterLogs);

  // Otomatik yenileme toggle
  const autoRefreshCheck = document.getElementById("autoRefreshCheckbox");
  if (autoRefreshCheck) {
    autoRefreshCheck.addEventListener("change", (e) => {
      if (e.target.checked) {
        autoRefreshInterval = setInterval(loadLogs, 5000);
        if (typeof showNotification === "function") {
          showNotification("Otomatik yenileme aktif", "info");
        }
      } else {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
    });
  }
}

// Logları Yükle (Main process 'get-all-logs' handler'ını çağırır)
async function loadLogs() {
  try {
    const levelFilter = document.getElementById("levelFilter").value;

    // Backend'deki ipcMain.handle("get-all-logs", ...) fonksiyonuna gider
    const response = await window.electronAPI.ipcRenderer.invoke(
      "get-all-logs",
      {
        level: levelFilter,
        limit: 200, // Maksimum 200 log getir
      }
    );

    if (response.success) {
      allLogs = response.data;
      updateStats();
      filterLogs(); // Arama kutusundaki değere göre son filtreyi yap
    } else {
      console.error("Loglar yüklenemedi:", response.message);
    }
  } catch (err) {
    console.error("Log yükleme hatası:", err);
  }
}

// İstatistikleri Güncelle (Mini kartlar)
function updateStats() {
  const stats = {
    info: allLogs.filter((l) => l.level === "info").length,
    success: allLogs.filter((l) => l.level === "success").length,
    warn: allLogs.filter((l) => l.level === "warn" || l.level === "warning")
      .length,
    error: allLogs.filter((l) => l.level === "error").length,
    total: allLogs.length,
  };

  if (document.getElementById("infoCount"))
    document.getElementById("infoCount").innerText = stats.info;
  if (document.getElementById("successCount"))
    document.getElementById("successCount").innerText = stats.success;
  if (document.getElementById("warningCount"))
    document.getElementById("warningCount").innerText = stats.warn;
  if (document.getElementById("errorCount"))
    document.getElementById("errorCount").innerText = stats.error;
  if (document.getElementById("totalCount"))
    document.getElementById("totalCount").innerText = stats.total;
}

// Filtreleme Uygula ve Tabloyu Çiz
function filterLogs() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const dateFilter = document.getElementById("dateFilter").value;

  const filtered = allLogs.filter((log) => {
    // Arama kontrolü (mesaj veya meta içinde)
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm) ||
      (log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchTerm));

    // Tarih kontrolü (Basit günlük filtreleme)
    let matchesDate = true;
    if (dateFilter !== "all") {
      const logDate = new Date(log.timestamp).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString();

      if (dateFilter === "today") matchesDate = logDate === today;
      if (dateFilter === "yesterday") matchesDate = logDate === yesterdayStr;
    }

    return matchesSearch && matchesDate;
  });

  renderTable(filtered);
}

// Tabloyu DOM'a Yaz
function renderTable(logs) {
  const tbody = document.getElementById("logTableBody");
  if (document.getElementById("showingInfo")) {
    document.getElementById(
      "showingInfo"
    ).innerText = `Gösteriliyor: ${logs.length} log`;
  }

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:60px; color:#888;">Log kaydı bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs
    .map((log) => {
      const logDataStr = encodeURIComponent(JSON.stringify(log));
      return `
            <tr onclick="showLogDetail('${logDataStr}')" style="cursor:pointer">
                <td><span class="log-level-${
                  log.level
                }">${log.level.toUpperCase()}</span></td>
                <td style="color: #aaa; font-family: 'Consolas', monospace; font-size: 12px;">
                    ${
                      log.timestamp
                        ? log.timestamp.replace("T", " ").split(".")[0]
                        : "-"
                    }
                </td>
                <td style="max-width: 500px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${log.message}
                </td>
                <td>
                    <button class="btn-action" style="padding: 4px 10px; font-size: 12px;">İncele</button>
                </td>
            </tr>
        `;
    })
    .join("");
}

// Log Detay Modalını Aç
function showLogDetail(encodedLog) {
  try {
    const log = JSON.parse(decodeURIComponent(encodedLog));
    const modal = document.getElementById("modalLogDetail");

    document.getElementById("detailTimestamp").innerText = log.timestamp || "-";
    document.getElementById(
      "detailLevel"
    ).innerHTML = `<span class="log-level-${
      log.level
    }">${log.level.toUpperCase()}</span>`;
    document.getElementById("detailMessage").innerText = log.message;

    // Meta bilgileri
    const metaSection = document.getElementById("detailMetaSection");
    const metaPre = document.getElementById("detailMeta");

    if (log.meta && Object.keys(log.meta).length > 0) {
      metaSection.style.display = "block";
      metaPre.innerText = JSON.stringify(log.meta, null, 2);
    } else {
      metaSection.style.display = "none";
    }

    // Stack Trace (Hata logları için)
    const stackSection = document.getElementById("detailStackSection");
    if (log.stack) {
      stackSection.style.display = "block";
      document.getElementById("detailStack").innerText = log.stack;
    } else {
      stackSection.style.display = "none";
    }

    modal.style.display = "flex";
  } catch (e) {
    console.error("Detay açma hatası:", e);
  }
}

// Modalı Kapat
function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

// Logları Temizle (Backend 'clear-logs' çağrısı)
async function clearLogs() {
  // SweetAlert2 kullanımı (HTML dosyasında scripti olmalı)
  const result = await Swal.fire({
    title: "Emin misiniz?",
    text: "Tüm sistem logları kalıcı olarak temizlenecek!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#7b2fff",
    cancelButtonColor: "#ff6b6b",
    confirmButtonText: "Evet, Temizle",
    cancelButtonText: "Vazgeç",
  });

  if (result.isConfirmed) {
    const res = await window.electronAPI.ipcRenderer.invoke(
      "clear-logs",
      "all"
    );
    if (res.success) {
      Swal.fire("Başarılı!", res.message, "success");
      loadLogs();
    }
  }
}

// Dışa Aktar (Backend 'export-logs' çağrısı)
async function exportLogs(format) {
  const res = await window.electronAPI.ipcRenderer.invoke(
    "export-logs",
    format
  );
  if (res.success) {
    Swal.fire({
      title: "Dışa Aktarıldı",
      text: `Dosya oluşturuldu: ${res.path}`,
      icon: "success",
    });
  } else {
    Swal.fire("Hata", res.message, "error");
  }
}

// Klasörü Aç (Backend 'open-log-folder' çağrısı)
function openLogFolder() {
  window.electronAPI.ipcRenderer.invoke("open-log-folder");
}
