// ==========================================
// YEDEKLEME YÖNETİMİ - JAVASCRIPT
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let allBackups = [];
let autoBackupSettings = {};

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Yedekleme Yönetimi sayfası yüklendi");

  // Kullanıcı bilgilerini yükle
  loadUserInfo();

  // Yedekleri yükle
  loadBackups();

  // Otomatik yedekleme ayarlarını yükle
  loadAutoBackupSettings();

  // Event listener'ları ekle
  initEventListeners();
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
  // Otomatik yedekleme checkbox
  const autoBackupCheckbox = document.getElementById("autoBackupEnabled");
  autoBackupCheckbox.addEventListener("change", (e) => {
    const options = document.getElementById("autoBackupOptions");
    options.style.display = e.target.checked ? "block" : "none";
  });

  // Form submit
  document
    .getElementById("formAutoBackup")
    .addEventListener("submit", handleSaveAutoBackupSettings);
}

// ==========================================
// YEDEKLERİ YÜKLE
// ==========================================

async function loadBackups() {
  try {
    console.log("📋 Yedekler yükleniyor...");

    const result = await ipcRenderer.invoke("get-all-backups");

    if (result.success) {
      allBackups = result.data;

      console.log(`✅ ${allBackups.length} yedek yüklendi`);

      // İstatistikleri güncelle
      updateStats();

      // Tabloyu render et
      renderTable();
    } else {
      Bildirim.error(result.message || "Yedekler yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Yedek yükleme hatası:", error);
    Bildirim.error("Yedekler yüklenirken hata oluştu!");
  }
}

// ==========================================
// İSTATİSTİKLERİ GÜNCELLE
// ==========================================

function updateStats() {
  const total = allBackups.length;
  const totalSizeMB = allBackups
    .reduce((sum, b) => sum + parseFloat(b.sizeInMB), 0)
    .toFixed(2);
  const autoCount = allBackups.filter((b) => b.type !== "manuel").length;

  let lastBackupDate = "-";
  if (allBackups.length > 0) {
    const lastBackup = allBackups[0];
    lastBackupDate = new Date(lastBackup.created_at).toLocaleDateString(
      "tr-TR",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  document.getElementById("totalBackups").textContent = total;
  document.getElementById("totalSize").textContent = totalSizeMB + " MB";
  document.getElementById("lastBackup").textContent = lastBackupDate;
  document.getElementById("autoBackupCount").textContent = autoCount;
}

// ==========================================
// TABLO RENDER
// ==========================================

function renderTable() {
  const tbody = document.getElementById("backupTableBody");

  if (allBackups.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 60px 20px; color: #888;">
          Henüz yedek bulunamadı
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allBackups
    .map((backup) => {
      const date = new Date(backup.created_at).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const typeBadge = getTypeBadge(backup.type);

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">💾</span>
              <span style="font-family: monospace; font-size: 13px; color: #ddd;">${
                backup.filename
              }</span>
            </div>
          </td>
          <td>${typeBadge}</td>
          <td><span style="color: #00d9ff; font-weight: 600;">${
            backup.sizeInMB
          } MB</span></td>
          <td style="color: #888; font-size: 13px;">${date}</td>
          <td>
            <div class="action-btns">
              <button class="btn-icon restore" onclick="restoreBackup('${backup.path.replace(
                /\\/g,
                "\\\\"
              )}')" title="Geri Yükle">
                📥
              </button>
              <button class="btn-icon download" onclick="openBackupFolder()" title="Klasörü Aç">
                📁
              </button>
              <button class="btn-icon delete" onclick="deleteBackup('${backup.path.replace(
                /\\/g,
                "\\\\"
              )}')" title="Sil">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ==========================================
// TIP BADGE
// ==========================================

function getTypeBadge(type) {
  const typeMap = {
    manuel: { icon: "👤", text: "Manuel", class: "type-manuel" },
    otomatik: { icon: "🤖", text: "Otomatik", class: "type-otomatik" },
    günlük: { icon: "📆", text: "Günlük", class: "type-gunluk" },
    haftalık: { icon: "📅", text: "Haftalık", class: "type-haftalik" },
    aylık: { icon: "🗓️", text: "Aylık", class: "type-aylik" },
  };

  const t = typeMap[type] || typeMap.manuel;

  return `<span class="type-badge ${t.class}">${t.icon} ${t.text}</span>`;
}

// ==========================================
// MANUEL YEDEK AL
// ==========================================

async function createManualBackup() {
  try {
    Bildirim.info("💾 Yedekleme başlatılıyor...");

    const result = await ipcRenderer.invoke("create-backup", "manuel");

    if (result.success) {
      Bildirim.success(
        `Yedek başarıyla oluşturuldu! (${result.data.sizeInMB} MB)`
      );
      loadBackups();
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Yedekleme hatası:", error);
    Bildirim.error("Yedekleme sırasında hata oluştu!");
  }
}

// ==========================================
// YEDEK GERİ YÜKLE
// ==========================================

async function restoreBackup(backupPath) {
  const confirm = await Bildirim.confirm(
    "**⚠️ DİKKAT!**\n\n" +
      "Yedek geri yüklenecek. Bu işlem:\n\n" +
      "• Mevcut veritabanını yedekleyecek\n" +
      "• Seçili yedeği geri yükleyecek\n" +
      "• Program yeniden başlatılmalı\n\n" +
      "Devam etmek istiyor musunuz?",
    "Yedek Geri Yükle",
    {
      icon: "⚠️",
      confirmText: "Evet, Geri Yükle",
      cancelText: "Hayır",
      type: "warning",
    }
  );

  if (confirm !== true) return;

  try {
    Bildirim.info("📥 Yedek geri yükleniyor...");

    const result = await ipcRenderer.invoke("restore-backup", backupPath);

    if (result.success) {
      await Bildirim.confirm(
        "**✅ Yedek Başarıyla Geri Yüklendi!**\n\n" +
          "Değişikliklerin geçerli olması için programı **yeniden başlatın**.",
        "Geri Yükleme Tamamlandı",
        {
          icon: "✅",
          confirmText: "Programı Kapat",
          cancelText: null,
          type: "success",
        }
      );

      // Programı kapat
      window.close();
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Geri yükleme hatası:", error);
    Bildirim.error("Geri yükleme sırasında hata oluştu!");
  }
}

// ==========================================
// YEDEK SİL
// ==========================================

async function deleteBackup(backupPath) {
  const confirm = await Bildirim.confirm(
    "Bu yedek dosyası kalıcı olarak silinecek. Onaylıyor musunuz?",
    "Yedek Sil",
    {
      icon: "🗑️",
      confirmText: "Evet, Sil",
      cancelText: "Hayır",
      type: "danger",
    }
  );

  if (confirm !== true) return;

  try {
    const result = await ipcRenderer.invoke("delete-backup", backupPath);

    if (result.success) {
      Bildirim.success("Yedek başarıyla silindi!");
      loadBackups();
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Yedek silme hatası:", error);
    Bildirim.error("Yedek silinirken hata oluştu!");
  }
}

// ==========================================
// KLASÖRÜ AÇ
// ==========================================

async function openBackupFolder() {
  try {
    await ipcRenderer.invoke("open-backup-folder");
  } catch (error) {
    console.error("❌ Klasör açma hatası:", error);
  }
}

// ==========================================
// OTOMATİK YEDEKLEME MODAL AÇ
// ==========================================

function openAutoBackupModal() {
  document.getElementById("modalAutoBackup").style.display = "flex";

  // Mevcut ayarları doldur
  document.getElementById("autoBackupEnabled").checked =
    autoBackupSettings.enabled || false;
  document.getElementById("backupFrequency").value =
    autoBackupSettings.frequency || "gunluk";
  document.getElementById("backupTime").value =
    autoBackupSettings.time || "02:00";
  document.getElementById("keepDays").value = autoBackupSettings.keepDays || 30;

  // Options'ı göster/gizle
  const options = document.getElementById("autoBackupOptions");
  options.style.display = autoBackupSettings.enabled ? "block" : "none";
}

// ==========================================
// OTOMATİK YEDEKLEME AYARLARI YÜKLE
// ==========================================

async function loadAutoBackupSettings() {
  try {
    const result = await ipcRenderer.invoke("load-backup-settings");

    if (result.success) {
      autoBackupSettings = result.data;

      // Durum metnini güncelle
      const statusText = autoBackupSettings.enabled
        ? `✅ Aktif (${autoBackupSettings.frequency})`
        : "❌ Kapalı";

      document.getElementById("autoBackupStatus").textContent = statusText;
    }
  } catch (error) {
    console.error("❌ Ayar yükleme hatası:", error);
  }
}

// ==========================================
// OTOMATİK YEDEKLEME AYARLARI KAYDET
// ==========================================

async function handleSaveAutoBackupSettings(e) {
  e.preventDefault();

  const settings = {
    enabled: document.getElementById("autoBackupEnabled").checked,
    frequency: document.getElementById("backupFrequency").value,
    time: document.getElementById("backupTime").value,
    keepDays: parseInt(document.getElementById("keepDays").value),
  };

  try {
    const result = await ipcRenderer.invoke("save-backup-settings", settings);

    if (result.success) {
      autoBackupSettings = settings;
      Bildirim.success("Ayarlar başarıyla kaydedildi!");
      closeModal("modalAutoBackup");
      loadAutoBackupSettings();
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Ayar kaydetme hatası:", error);
    Bildirim.error("Ayarlar kaydedilemedi!");
  }
}

// ==========================================
// MODAL KAPAT
// ==========================================

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

console.log("✅ Yedekleme Yönetimi scripti yüklendi");
