// ============================================
// VERİ YÖNETİCİSİ TEST & BAŞLANGIC
// ============================================

// Global hata yakalama
window.addEventListener("error", function (e) {
  console.error("🔥 GLOBAL ERROR:", e.message);
  console.error("📍 Dosya:", e.filename);
  console.error("📍 Satır:", e.lineno);
  console.error("📍 Sütun:", e.colno);
  console.error("📍 Stack:", e.error);
});

window.addEventListener("unhandledrejection", function (e) {
  console.error("🔥 UNHANDLED PROMISE REJECTION:", e.reason);
});

console.log(
  "%c🚀 PROGRAM OLUŞTUR - DEBUG MODE AÇIK",
  "color: #00ff00; font-size: 20px; font-weight: bold;"
);

// ==========================================
// PROGRAM OLUŞTUR - ANA JAVASCRIPT
// ==========================================

const { ipcRenderer } = require("electron");

// ⚡ PROGRAM ID - localStorage'dan yükle veya son programı bul
let currentProgramId = null;

// ==========================================
// GLOBAL DEĞİŞKENLER
// ==========================================

// Kullanıcı ve okul bilgileri
let currentUser = null;
let schoolInfo = null;
let userType = null;

// Veri listeleri
let allDersler = [];
let allOgretmenler = [];
let allSiniflar = [];

// Program yapılandırması
let programConfig = {
  haftaGunu: 5,
  gunlukDers: { type: "sabit", sabit: 8, farkli: {} },
  dersBaslangic: "08:00",
  dersSuresi: 40,
  teneffusSuresi: 10,
  ogleArasi: { var: false, dersSonrasi: 4, sure: 60 },
};

// Asistan adımları
let currentAsistanStep = 1;
const totalAsistanSteps = 4;

// Program verisi
let undoStack = [];
let programData = {}; // {gun: {saat: {sinif_id, ders_id, ogretmen_id}}}

// YENİ: Tercih modal değişkenleri
let currentTercihOgretmenId = null;
let kapaliSaatler = {};

// YENİ: Gelişmiş modül referansları
let liveScheduler = null;
let swapEngine = null;
let undoRedoManager = null;
let lockManager = null;
let distributionAnalyzer = null;

// DOM Elemanları
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userInitials = document.getElementById("userInitials");
const okulAdi = document.getElementById("okulAdi");
const logoutBtn = document.getElementById("logoutBtn");

const btnAkilliAsistan = document.getElementById("btnAkilliAsistan");
const btnOtomatikDagit = document.getElementById("btnOtomatikDagit");
const btnKaydet = document.getElementById("btnKaydet");
const btnUndo = document.getElementById("btnUndo");

const derslerList = document.getElementById("derslerList");
const ogretmenlerList = document.getElementById("ogretmenlerList");
const logList = document.getElementById("logList");
const tabloContainer = document.getElementById("tabloContainer");
const alternatifList = document.getElementById("alternatifList");
const oneriList = document.getElementById("oneriList");
const kisitList = document.getElementById("kisitList");

const statYerlesen = document.getElementById("statYerlesen");
const statCakisma = document.getElementById("statCakisma");
const statBosluk = document.getElementById("statBosluk");

// Modal elementleri
const modalAsistan = document.getElementById("modalAsistan");
const formAsistan = document.getElementById("formAsistan");
const btnAsistanGeri = document.getElementById("btnAsistanGeri");
const btnAsistanIleri = document.getElementById("btnAsistanIleri");
const btnAsistanTamamla = document.getElementById("btnAsistanTamamla");
const btnAsistanIptal = document.getElementById("btnAsistanIptal");

// ============================================
// MODERN BİLDİRİM SİSTEMİ
// ============================================

const ModernBildirim = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }
  },

  show(type, title, message, duration = 5000) {
    this.init();

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons = {
      success:
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      error:
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      warning:
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
      info: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add("closing");
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  },

  success(title, message, duration) {
    return this.show("success", title, message, duration);
  },

  error(title, message, duration) {
    return this.show("error", title, message, duration);
  },

  warning(title, message, duration) {
    return this.show("warning", title, message, duration);
  },

  info(title, message, duration) {
    return this.show("info", title, message, duration);
  },
};
document.addEventListener("DOMContentLoaded", async function () {
  console.log("📄 ============================================");
  console.log("📄 PROGRAM OLUŞTUR SAYFASI YÜKLENİYOR");
  console.log("📄 ============================================");

  // ✅ FİX: Tüm modalları kapat (sayfa yüklendiğinde)
  const kisitModal = document.getElementById("kisitModal");
  const modalAsistan = document.getElementById("modalAsistan");
  const tercihModal = document.getElementById("tercihModal");
  const atamaModal = document.getElementById("atamaModal");

  if (kisitModal) kisitModal.style.display = "none";
  if (modalAsistan) modalAsistan.style.display = "none";
  if (tercihModal) tercihModal.style.display = "none";
  if (atamaModal) atamaModal.style.display = "none";

  console.log("✅ Tüm modaller kapatıldı (otomatik açılma engellendi)");

  try {
    // 🔥 1. Program ID'yi kontrol et
    currentProgramId = parseInt(localStorage.getItem("currentProgramId"));

    console.log("🔍 localStorage'dan okunan program_id:", currentProgramId);

    if (!currentProgramId || isNaN(currentProgramId)) {
      console.warn("⚠️ currentProgramId bulunamadı veya geçersiz!");
      console.log("🔍 Veritabanından son program aranıyor...");

      // Son programı bul
      try {
        const result = await window.electronAPI.dbQuery(
          "SELECT id, program_adi FROM ders_programlari ORDER BY olusturma_tarihi DESC LIMIT 1",
          []
        );

        if (result.success && result.data.length > 0) {
          currentProgramId = result.data[0].id;
          localStorage.setItem("currentProgramId", currentProgramId);
          console.log("✅ Son program bulundu:", {
            id: currentProgramId,
            ad: result.data[0].program_adi,
          });
        } else {
          console.error("❌ Veritabanında hiç program yok!");
          console.log("📝 Yeni program oluşturulacak...");

          // Yeni program oluştur
          const yeniProgram = await window.electronAPI.dbQuery(
            `INSERT INTO ders_programlari (program_adi, ogretim_yili, donem, durum, olusturma_tarihi) 
             VALUES (?, ?, ?, ?, datetime('now'))`,
            ["Yeni Program", "2024-2025", "Güz", 1]
          );

          if (yeniProgram.success) {
            currentProgramId = yeniProgram.lastID;
            localStorage.setItem("currentProgramId", currentProgramId);
            console.log("✅ Yeni program oluşturuldu, ID:", currentProgramId);

            if (typeof Bildirim !== "undefined") {
              Bildirim.goster(
                "success",
                "Yeni program oluşturuldu: Program " + currentProgramId
              );
            }
          } else {
            console.error("❌ Yeni program oluşturulamadı!");
            if (typeof Bildirim !== "undefined") {
              Bildirim.goster(
                "error",
                "Program oluşturulamadı! Lütfen manuel oluşturun."
              );
            }
            return;
          }
        }
      } catch (error) {
        console.error("❌ Program ID sorgu hatası:", error);
        if (typeof Bildirim !== "undefined") {
          Bildirim.goster("error", "Veritabanı bağlantı hatası!");
        }
        return;
      }
    } else {
      console.log("✅ Program ID localStorage'da mevcut:", currentProgramId);

      // 🔥 Program ID'nin veritabanında olduğunu doğrula
      try {
        const checkResult = await window.electronAPI.dbQuery(
          "SELECT id, program_adi FROM ders_programlari WHERE id = ?",
          [currentProgramId]
        );

        if (checkResult.success && checkResult.data.length > 0) {
          console.log("✅ Program veritabanında doğrulandı:", {
            id: currentProgramId,
            ad: checkResult.data[0].program_adi,
          });
        } else {
          console.warn(
            "⚠️ Program ID veritabanında bulunamadı, son program alınıyor..."
          );

          const lastProgram = await window.electronAPI.dbQuery(
            "SELECT id FROM ders_programlari ORDER BY olusturma_tarihi DESC LIMIT 1",
            []
          );

          if (lastProgram.success && lastProgram.data.length > 0) {
            currentProgramId = lastProgram.data[0].id;
            localStorage.setItem("currentProgramId", currentProgramId);
            console.log("✅ Son program ID alındı:", currentProgramId);
          }
        }
      } catch (error) {
        console.warn("⚠️ Program doğrulama hatası:", error);
      }
    }

    // 🔥 2. Kullanıcı kontrolü
    const currentUserStr = localStorage.getItem("currentUser");
    const currentSchoolStr = localStorage.getItem("currentSchool");

    if (!currentUserStr) {
      console.error("Kullanıcı bilgisi bulunamadı!");
      localStorage.clear();
      window.location.href = "giris.html";
      return;
    }

    currentUser = JSON.parse(currentUserStr);
    schoolInfo = currentSchoolStr ? JSON.parse(currentSchoolStr) : null;
    userType =
      currentUser.rol === "super_admin" ? "super_admin" : "school_user";

    console.log("Kullanıcı:", currentUser);
    console.log("Okul:", schoolInfo);

    // Kullanıcı bilgilerini göster
    loadUserInfo();

    // 🔥 3. Atamaları yükle (program_id ile)
    console.log("📦 Atamalar yükleniyor (program_id:", currentProgramId, ")");
    await atanalariYukle();

    // 🔥 4. Verileri yükle
    console.log("📊 Program verileri yükleniyor...");
    await loadAllData();

    // Event listener'ları başlat
    initEventListeners();

    // Accordion sistemini başlat
    initAccordion();

    // Kayıtlı program config var mı kontrol et
    checkSavedConfig();

    // Sürükle-bırak sistemini başlat
    if (window.scheduleDragDrop) {
      window.scheduleDragDrop.init();
      console.log("Sürükle-bırak sistemi başlatıldı");
    } else {
      console.warn("scheduleDragDrop modülü bulunamadı!");
    }

    // YENİ: Gelişmiş modülleri başlat
    initializeAdvancedModules();

    // 🔥 5. UI güncellemelerini yap
    if (typeof updateStats === "function") {
      updateStats();
    }

    console.log("📄 ============================================");
    console.log("✅ SAYFA YÜKLEME TAMAMLANDI");
    console.log("📄 ============================================");

    console.log("Sistem hazır");
  } catch (error) {
    console.error("❌ Sayfa yükleme hatası:", error);
    if (typeof Bildirim !== "undefined") {
      Bildirim.goster("error", "Sayfa yüklenirken hata oluştu!");
    }
  }
});

// ==========================================
// YENİ: GELİŞMİŞ MODÜLLERI BAŞLAT
// ==========================================

function initializeAdvancedModules() {
  console.log("🔧 Gelişmiş modüller başlatılıyor...");

  try {
    // Live Scheduler
    if (window.LiveScheduler && !window.liveScheduler) {
      window.liveScheduler = new LiveScheduler();
      console.log("✅ LiveScheduler hazır");
    }

    // Swap Engine
    if (window.SwapEngine && !window.swapEngine) {
      window.swapEngine = new SwapEngine();
      console.log("✅ SwapEngine hazır");
    }

    // Undo/Redo Manager
    if (window.UndoRedoManager && !window.undoRedoManager) {
      window.undoRedoManager = new UndoRedoManager(50);
      window.undoRedoManager.loadFromStorage();
      console.log("✅ UndoRedoManager hazır");

      // Event listener
      window.addEventListener("undoRedo:stateChanged", function (e) {
        updateUndoRedoButtons();
      });
    }

    // Lock Manager
    if (window.LockManager && !window.lockManager) {
      window.lockManager = new LockManager();
      console.log("✅ LockManager hazır");
    }

    // Distribution Analyzer
    if (window.DistributionAnalyzer && !window.distributionAnalyzer) {
      window.distributionAnalyzer = new DistributionAnalyzer();
      console.log("✅ DistributionAnalyzer hazır");
    }

    console.log("✅ Tüm gelişmiş modüller hazır");
  } catch (error) {
    console.error("❌ Modül başlatma hatası:", error);
  }
}

// ==========================================
// KULLANICI BİLGİLERİNİ GÖSTER
// ==========================================

function loadUserInfo() {
  try {
    if (userName) userName.textContent = currentUser.ad_soyad;
    if (userRole) userRole.textContent = getRoleName(currentUser.rol);

    if (userInitials) {
      const initials = currentUser.ad_soyad
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
      userInitials.textContent = initials;
    }

    if (schoolInfo && okulAdi) {
      okulAdi.textContent = schoolInfo.okul_adi;
    }
  } catch (error) {
    console.error("❌ Kullanıcı bilgisi gösterme hatası:", error);
  }
}

function getRoleName(rol) {
  const roles = {
    super_admin: "Sistem Yöneticisi",
    okul_admin: "Okul Yöneticisi",
    ogretmen: "Öğretmen",
  };
  return roles[rol] || rol;
}

// ==========================================
// VERİ YÜKLEME
// ==========================================

async function loadAllData() {
  try {
    console.log("📦 Veriler yükleniyor...");

    // DERSLER
    const dersResult = await window.electronAPI.getAllDersler();
    if (dersResult.success) {
      allDersler = dersResult.data.filter((d) => d.durum === 1);
      console.log(`✅ ${allDersler.length} ders yüklendi`);
      renderDersler(allDersler);
    }

    // ÖĞRETMENLER
    const ogretmenResult = await window.electronAPI.getAllTeachers();
    if (ogretmenResult.success) {
      allOgretmenler = ogretmenResult.data.filter((o) => o.durum === 1);
      console.log(`✅ ${allOgretmenler.length} öğretmen yüklendi`);
      renderOgretmenler(allOgretmenler);
    }

    // SINIFLAR
    const sinifResult = await window.electronAPI.getAllClasses();
    if (sinifResult.success) {
      allSiniflar = sinifResult.data.filter((s) => s.durum === 1);
      console.log(`✅ ${allSiniflar.length} sınıf yüklendi`);
      renderSiniflar(allSiniflar);
    }

    updateStats();
    renderLogs();
  } catch (error) {
    console.error("❌ Veri yükleme hatası:", error);
    Bildirim.error("Veriler yüklenirken hata oluştu!");
  }
}

// ============================================
// VERİ YÖNETİCİSİ KONTROLÜ
// ============================================

console.log("ScheduleDataManager kontrolü...");

if (window.ScheduleDataManager) {
  console.log("DataManager hazır!");
  const istatistikler = window.ScheduleDataManager.getIstatistikler();
  console.log("Mevcut İstatistikler:", istatistikler);

  if (istatistikler.toplamOgretmen === 0) {
    console.log("Hiç öğretmen yok! Lütfen öğretmen ekleyin.");
  }
} else {
  console.error("ScheduleDataManager yüklenemedi!");
  console.error(
    "Lütfen schedule-data-manager.js dosyasının yüklendiğinden emin olun"
  );
}
// ============================================
// DERSLER VE ÖĞRETMENLER LİSTESİ (MODERN)
// ============================================

function renderDersler(dersListesi = []) {
  const container = document.getElementById("derslerList");
  if (!container) return;

  container.innerHTML = "";

  if (dersListesi.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </div>
        <div class="empty-state-title">Henüz Ders Yok</div>
        <div class="empty-state-text">Ders eklemek için<br>"Ders Yönetimi" sayfasına gidin</div>
      </div>
    `;
    return;
  }

  dersListesi.forEach((ders, index) => {
    const toplamSaat = ders.haftalik_ders_saati || 0;
    const dersKodu = ders.ders_kodu || "—";
    const dersAdi = ders.ders_adi || "İsimsiz Ders";
    const dersIcon = dersAdi.substring(0, 2).toUpperCase();
    const renk =
      ders.ders_rengi || "linear-gradient(135deg, #4ecdc4 0%, #3ba89d 100%)";

    const item = document.createElement("div");
    item.className = "ders-card";
    item.setAttribute("draggable", "true");
    item.dataset.type = "ders";
    item.dataset.id = ders.id;
    item.style.animationDelay = `${index * 0.05}s`;

    item.innerHTML = `
      <div class="ders-card-icon" style="background:${renk};">${dersIcon}</div>
      <div class="ders-card-info">
        <div class="ders-card-name">${dersAdi}</div>
        <div class="ders-card-kod">${dersKodu}</div>
      </div>
      <div class="ders-card-saat">${toplamSaat}s</div>
    `;

    container.appendChild(item);
  });

  initDragEvents();
}

// ==========================================
// ÖĞRETMEN RENDER FONKSİYONU - DÜZELTİLDİ
// ==========================================

function renderOgretmenler(ogretmenListesi = []) {
  const container = document.getElementById("ogretmenlerList");
  if (!container) {
    console.error("❌ ogretmenlerList container bulunamadı!");
    return;
  }

  container.innerHTML = "";

  if (ogretmenListesi.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
        <div class="empty-state-title">Henüz Öğretmen Yok</div>
        <div class="empty-state-text">Öğretmen eklemek için<br>"Öğretmen Yönetimi" sayfasına gidin</div>
      </div>
    `;
    return;
  }

  ogretmenListesi.forEach((ogretmen, index) => {
    const adSoyad = ogretmen.ad_soyad || "İsimsiz";
    const brans = ogretmen.brans || "Branş belirtilmemiş";
    const ogretmenKodu =
      ogretmen.ogretmen_kodu || ogretmen.kod || `OGR${ogretmen.id}`;
    const initials = getKisaAd(adSoyad);

    const item = document.createElement("div");
    item.className = "ogretmen-card draggable-item";

    item.setAttribute("draggable", "true");
    item.dataset.type = "ogretmen";
    item.dataset.id = ogretmen.id;
    item.dataset.kod = ogretmenKodu;
    item.dataset.ad = adSoyad;
    item.style.animationDelay = `${index * 0.05}s`;

    item.innerHTML = `
      <div class="ogretmen-card-icon">${initials}</div>
      <div class="ogretmen-card-info">
        <div class="ogretmen-card-name">${adSoyad}</div>
        <div class="ogretmen-card-brans">${brans}</div>
        <div class="ogretmen-card-yuklenme">0/40 saat</div>
      </div>
    `;

    container.appendChild(item);
  });

  console.log(`✅ ${ogretmenListesi.length} öğretmen kartı oluşturuldu`);

  initDragEvents();

  if (window.scheduleDragDrop) {
    console.log("🔄 ScheduleDragDrop'a öğretmen kartları bildirildi");
  }
}

function getKisaAd(adSoyad) {
  if (!adSoyad) return "—";
  const parts = adSoyad.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return parts
    .map((p) => p[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

// ============================================
// LOG PANELİ YÖNETİMİ
// ============================================

function renderLogs() {
  const container = document.getElementById("logList");
  if (!container) return;

  if (!window.ScheduleDataManager) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-text">Log sistemi yükleniyor...</div>
      </div>
    `;
    return;
  }

  const logs = window.ScheduleDataManager.loglariGetir(10);

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-text">Henüz işlem yapılmadı</div>
      </div>
    `;
    return;
  }

  container.innerHTML = logs
    .map((log) => {
      let logType = "";
      if (log.mesaj.includes("eklendi") || log.mesaj.includes("başarı")) {
        logType = "success";
      } else if (log.mesaj.includes("silindi") || log.mesaj.includes("hata")) {
        logType = "error";
      } else if (log.mesaj.includes("güncellendi")) {
        logType = "warning";
      }

      const tarih = new Date(log.tarih);
      const zamanStr = tarih.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      return `
        <div class="log-item ${logType}">
          ${log.mesaj}
          <span class="log-item-time">${zamanStr}</span>
        </div>
      `;
    })
    .join("");
}

function addLog(mesaj) {
  if (window.ScheduleDataManager) {
    window.ScheduleDataManager.logEkle(mesaj);
    renderLogs();
  }
}

// ==========================================
// SINIFLARI RENDER ETME
// ==========================================

function renderSiniflar() {
  const siniflarList = document.getElementById("siniflarList");
  if (!siniflarList) return;

  if (allSiniflar.length === 0) {
    siniflarList.innerHTML =
      '<div class="empty-message">Sınıf bulunamadı</div>';
    return;
  }

  let html = "";
  allSiniflar.forEach((sinif, index) => {
    const renk = "linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)";
    html += `
      <div class="draggable-item" draggable="true" data-type="sinif" data-id="${
        sinif.id
      }" style="animation-delay: ${index * 0.05}s;">
        <div class="draggable-icon" style="background: ${renk};">
          ${sinif.sinif_kodu || sinif.sinif_adi.substring(0, 2)}
        </div>
        <div class="draggable-info">
          <div class="draggable-title">${sinif.sinif_adi}</div>
          <div class="draggable-meta">${sinif.ogrenci_sayisi || 0} öğrenci</div>
        </div>
      </div>
    `;
  });

  siniflarList.innerHTML = html;
  initDragEvents();
}

// ==========================================
// DRAG & DROP SİSTEMİ - YENİ VERSİYON
// ==========================================

let draggedElement = null;

function initDragEvents() {
  console.log("🎯 Drag event'leri başlatılıyor...");

  const draggables = document.querySelectorAll(
    '.draggable-item[draggable="true"]'
  );

  console.log(`📦 ${draggables.length} sürüklenebilir öğe bulundu`);

  draggables.forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      draggedElement = {
        type: item.dataset.type,
        id: parseInt(item.dataset.id),
        kod: item.dataset.kod,
        ad: item.dataset.ad,
        renk: item.dataset.renk,
      };

      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify(draggedElement)
      );

      console.log("🎯 Sürükleme başladı:", draggedElement);
    });

    item.addEventListener("dragend", (e) => {
      item.classList.remove("dragging");
      draggedElement = null;
      console.log("🎯 Sürükleme bitti");
    });
  });

  initDropZones();

  console.log("✅ Drag event'leri hazır");
}

function initDropZones() {
  const cells = document.querySelectorAll(".cell-content:not(.disabled)");

  cells.forEach((cell) => {
    cell.addEventListener("dragover", (e) => {
      if (draggedElement) {
        e.preventDefault();
        cell.classList.add("drop-hover");
      }
    });

    cell.addEventListener("dragleave", (e) => {
      cell.classList.remove("drop-hover");
    });

    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      cell.classList.remove("drop-hover");

      if (draggedElement) {
        const gun = cell.dataset.gun;
        const saat = cell.dataset.saat;
        handleDrop(gun, saat, draggedElement);
      }
    });
  });
}

// ==========================================
// DROP İŞLEME & HÜCRE DOLDURMA
// ==========================================

function handleDrop(gun, saat, element) {
  console.log(`📦 Drop işleniyor: Gün ${gun}, Saat ${saat}`, element);

  if (element.type === "ders") {
    const ders = allDersler.find((d) => d.id === element.id);
    if (ders) {
      assignDersToCell(gun, saat, ders);
      addLog(`✅ ${ders.ders_adi} → ${gun}. gün ${saat}. saat`);
      updateStats();
    } else {
      console.warn("⚠️ Ders bulunamadı! ID:", element.id);
      Bildirim.error("Ders bulunamadı!");
    }
  } else if (element.type === "ogretmen") {
    const ogretmen = allOgretmenler.find((o) => o.id === element.id);
    if (ogretmen) {
      assignOgretmenToCell(gun, saat, ogretmen);
      addLog(`✅ ${ogretmen.ad_soyad} → ${gun}. gün ${saat}. saat`);
      updateStats();
    } else {
      console.warn("⚠️ Öğretmen bulunamadı! ID:", element.id);
      Bildirim.error("Öğretmen bulunamadı!");
    }
  }
}

function assignDersToCell(gun, saat, ders) {
  const cellContent = document.querySelector(
    `.cell-content[data-gun="${gun}"][data-saat="${saat}"]`
  );
  if (!cellContent) {
    console.warn(`⚠️ Hücre bulunamadı: Gün ${gun}, Saat ${saat}`);
    return;
  }

  const renk =
    ders.ders_rengi || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  const sinif = ders.sinif || "";
  const sube = ders.sube || "";

  cellContent.classList.remove("empty");
  cellContent.classList.add("filled");
  cellContent.style.background = renk;

  cellContent.innerHTML = `
    <div class="cell-ders" style="cursor: pointer;">
      <strong>${ders.ders_adi}</strong>
      <br><small>${sinif} ${sube}</small>
    </div>
    <div class="cell-ogretmen">—</div>
  `;

  if (!programData[gun]) programData[gun] = {};
  if (!programData[gun][saat]) programData[gun][saat] = {};
  programData[gun][saat].ders_id = ders.id;
  programData[gun][saat].ders_adi = ders.ders_adi;
  programData[gun][saat].ders_kodu = ders.ders_kodu || ders.kod;
  programData[gun][saat].sinif = sinif;
  programData[gun][saat].sube = sube;
  programData[gun][saat].renk = renk;

  cellContent.onclick = () => {
    if (confirm(`${ders.ders_adi} silinsin mi?`)) {
      delete programData[gun][saat];
      cellContent.classList.remove("filled");
      cellContent.classList.add("empty");
      cellContent.style.background = "";
      cellContent.innerHTML = '<div class="cell-placeholder">BOŞ</div>';
      cellContent.onclick = null;
      addLog(`🗑️ ${ders.ders_adi} silindi (Gün ${gun}, Saat ${saat})`);
      updateStats();
    }
  };

  console.log(
    "✅ HÜCRE DOLDURULDU:",
    ders.ders_adi,
    `Gün ${gun}, Saat ${saat}`
  );
  updateStats();
}

function assignOgretmenToCell(gun, saat, ogretmen) {
  const cellContent = document.querySelector(
    `.cell-content[data-gun="${gun}"][data-saat="${saat}"]`
  );
  if (!cellContent) {
    console.warn(`⚠️ Hücre bulunamadı: Gün ${gun}, Saat ${saat}`);
    return;
  }

  if (
    !programData[gun] ||
    !programData[gun][saat] ||
    !programData[gun][saat].ders_id
  ) {
    Bildirim.warning("Önce bu hücreye bir ders yerleştirmelisiniz!");
    return;
  }

  const ogretmenDiv = cellContent.querySelector(".cell-ogretmen");
  if (ogretmenDiv) {
    const ogretmenAd = ogretmen.ad_soyad || `${ogretmen.ad} ${ogretmen.soyad}`;
    ogretmenDiv.textContent = ogretmenAd;

    programData[gun][saat].ogretmen_id = ogretmen.id;
    programData[gun][saat].ogretmen_kod =
      ogretmen.ogretmen_kodu || ogretmen.kod;
    programData[gun][saat].ogretmen_adi = ogretmenAd;

    console.log("✅ ÖĞRETMEN ATANDI:", ogretmenAd, `Gün ${gun}, Saat ${saat}`);

    Bildirim.success(`${ogretmenAd} öğretmen atandı!`);
  }
}
// ==========================================
// İSTATİSTİKLER VE LOG - YENİ VERSİYON
// ==========================================

function updateStats() {
  console.log("📊 İstatistikler güncelleniyor...");

  let yerlesen = 0;
  let toplam = 0;

  Object.values(programData).forEach((gun) => {
    Object.values(gun).forEach((saat) => {
      if (saat.ders_id) yerlesen++;
    });
  });

  const cells = document.querySelectorAll(".cell-content:not(.disabled)");
  toplam = cells.length;

  if (statYerlesen) {
    statYerlesen.textContent = `${yerlesen}/${toplam}`;
  }

  const cakismalar = hesaplaCakisma();
  if (statCakisma) {
    statCakisma.textContent = cakismalar.length;
    statCakisma.style.color = cakismalar.length > 0 ? "#f44336" : "#4caf50";
  }

  const boslukOrani = hesaplaBoslukOrani();
  if (statBosluk) {
    statBosluk.textContent = boslukOrani;
  }

  console.log("✅ İstatistikler güncellendi:", {
    yerlesen,
    toplam,
    cakisma: cakismalar.length,
    bosluk: boslukOrani,
  });
}

function hesaplaCakisma() {
  const cakismalar = [];
  const ogretmenProgrami = {};

  Object.entries(programData).forEach(([gun, saatler]) => {
    Object.entries(saatler).forEach(([saat, data]) => {
      if (!data.ogretmen_id) return;

      const ogretmenId = data.ogretmen_id;
      if (!ogretmenProgrami[ogretmenId]) {
        ogretmenProgrami[ogretmenId] = {};
      }
      if (!ogretmenProgrami[ogretmenId][gun]) {
        ogretmenProgrami[ogretmenId][gun] = {};
      }

      if (ogretmenProgrami[ogretmenId][gun][saat]) {
        cakismalar.push({
          gun,
          saat,
          ogretmen: ogretmenId,
          ders1: ogretmenProgrami[ogretmenId][gun][saat],
          ders2: data.ders_id,
        });
        console.warn("⚠️ ÇAKIŞMA TESPİT EDİLDİ:", {
          gun,
          saat,
          ogretmen: ogretmenId,
        });
      } else {
        ogretmenProgrami[ogretmenId][gun][saat] = data.ders_id;
      }
    });
  });

  return cakismalar;
}

function hesaplaBoslukOrani() {
  if (!window.ScheduleDataManager) {
    console.warn("⚠️ ScheduleDataManager bulunamadı");
    return "—";
  }

  let toplamBosluk = 0;
  let toplamOgretmen = 0;

  try {
    const ogretmenler = window.ScheduleDataManager.getOgretmenler();

    if (!ogretmenler || ogretmenler.length === 0) {
      return "—";
    }

    ogretmenler.forEach((ogretmen) => {
      const programi = getOgretmenProgramFromTable(ogretmen.id);
      const bosluklar = hesaplaKarniyarik(programi);
      toplamBosluk += bosluklar;
      toplamOgretmen++;
    });

    if (toplamOgretmen === 0) return "—";

    const ortalama = (toplamBosluk / toplamOgretmen).toFixed(1);
    return `${ortalama}`;
  } catch (error) {
    console.error("❌ Boşluk hesaplama hatası:", error);
    return "—";
  }
}

function getOgretmenProgramFromTable(ogretmenId) {
  const program = {};

  Object.entries(programData).forEach(([gun, saatler]) => {
    program[gun] = {};
    Object.entries(saatler).forEach(([saat, data]) => {
      if (data.ogretmen_id === ogretmenId) {
        program[gun][saat] = data;
      }
    });
  });

  return program;
}

function hesaplaKarniyarik(programi) {
  let bosluklar = 0;
  const gunler = ["pazartesi", "sali", "carsamba", "persembe", "cuma"];

  gunler.forEach((gun) => {
    if (!programi[gun]) return;

    const saatler = Object.keys(programi[gun])
      .map((s) => parseInt(s))
      .sort((a, b) => a - b);

    if (saatler.length < 2) return;

    const ilk = saatler[0];
    const son = saatler[saatler.length - 1];

    for (let i = ilk; i <= son; i++) {
      if (!programi[gun][i]) {
        bosluklar++;
      }
    }
  });

  return bosluklar;
}

// ==========================================
// ESKİ AKILLI ASİSTAN (TABLO OLUŞTURAN)
// ==========================================

function openAsistan() {
  console.log("📋 ESKİ Akıllı Asistan açılıyor - TABLO OLUŞTURMA");
  addLog("Tablo Oluşturma Asistanı açıldı");
  ModernBildirim.info("Tablo Asistanı", "Wizard açılıyor...");

  if (!modalAsistan) {
    console.error("❌ modalAsistan bulunamadı!");
    return;
  }

  modalAsistan.style.display = "flex";
  currentAsistanStep = 1;
  goToAsistanStep(1);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
  }
}

function goToAsistanStep(step) {
  if (step < 1 || step > totalAsistanSteps) return;

  console.log(`📍 Asistan adım: ${step}/${totalAsistanSteps}`);

  const contents = document.querySelectorAll(".asistan-content");
  contents.forEach((c) => c.classList.remove("active"));

  const targetContent = document.querySelector(
    `.asistan-content[data-step="${step}"]`
  );
  if (targetContent) {
    targetContent.classList.add("active");
  }

  const steps = document.querySelectorAll(".asistan-step");
  steps.forEach((s) => {
    const stepNum = parseInt(s.dataset.step);
    s.classList.remove("active", "completed");

    if (stepNum < step) {
      s.classList.add("completed");
    } else if (stepNum === step) {
      s.classList.add("active");
    }
  });

  if (btnAsistanGeri) {
    btnAsistanGeri.style.display = step === 1 ? "none" : "inline-flex";
  }

  if (btnAsistanIleri) {
    btnAsistanIleri.style.display =
      step === totalAsistanSteps ? "none" : "inline-flex";
  }

  if (btnAsistanTamamla) {
    btnAsistanTamamla.style.display =
      step === totalAsistanSteps ? "inline-flex" : "none";
  }

  if (btnAsistanIptal) {
    btnAsistanIptal.style.display =
      step === totalAsistanSteps ? "none" : "inline-flex";
  }

  currentAsistanStep = step;
}

function validateAsistanStep(step) {
  if (step === 2) {
    const haftaGunu = document.querySelector('input[name="haftaGunu"]:checked');
    if (!haftaGunu) {
      Bildirim.error("Lütfen hafta günü seçin!");
      return false;
    }

    const gunlukDers = document.querySelector(
      'input[name="gunlukDers"]:checked'
    );
    if (!gunlukDers) {
      Bildirim.error("Lütfen günlük ders dağılımı seçin!");
      return false;
    }

    if (gunlukDers.value === "sabit") {
      const sabitDers = document.getElementById("sabitDersSayisi");
      if (!sabitDers || sabitDers.value < 4 || sabitDers.value > 10) {
        Bildirim.error("Günlük ders sayısı 4-10 arasında olmalıdır!");
        return false;
      }
    }
  }

  if (step === 3) {
    const baslangic = document.getElementById("dersBaslangic");
    const sure = document.getElementById("dersSuresi");
    const teneffus = document.getElementById("teneffusSuresi");

    if (!baslangic.value || !sure.value || !teneffus.value) {
      Bildirim.error("Lütfen tüm alanları doldurun!");
      return false;
    }

    if (sure.value < 30 || sure.value > 60) {
      Bildirim.error("Ders süresi 30-60 dakika arasında olmalıdır!");
      return false;
    }

    if (teneffus.value < 5 || teneffus.value > 20) {
      Bildirim.error("Teneffüs süresi 5-20 dakika arasında olmalıdır!");
      return false;
    }
  }

  return true;
}

async function saveAsistanConfig() {
  try {
    console.log("💾 saveAsistanConfig başladı");

    const haftaGunu = parseInt(
      document.querySelector('input[name="haftaGunu"]:checked').value
    );
    const gunlukDersTip = document.querySelector(
      'input[name="gunlukDers"]:checked'
    ).value;

    programConfig.haftaGunu = haftaGunu;
    programConfig.gunlukDers.type = gunlukDersTip;

    if (gunlukDersTip === "sabit") {
      programConfig.gunlukDers.sabit = parseInt(
        document.getElementById("sabitDersSayisi").value
      );
    } else {
      programConfig.gunlukDers.farkli = {
        1: parseInt(document.getElementById("pazartesiDers").value),
        2: parseInt(document.getElementById("saliDers").value),
        3: parseInt(document.getElementById("carsambaDers").value),
        4: parseInt(document.getElementById("persembeDers").value),
        5: parseInt(document.getElementById("cumaDers").value),
      };
      if (haftaGunu === 6) {
        programConfig.gunlukDers.farkli[6] = parseInt(
          document.getElementById("cumartesiDers").value
        );
      }
    }

    programConfig.dersBaslangic =
      document.getElementById("dersBaslangic").value;
    programConfig.dersSuresi = parseInt(
      document.getElementById("dersSuresi").value
    );
    programConfig.teneffusSuresi = parseInt(
      document.getElementById("teneffusSuresi").value
    );

    const ogleArasiVar = document.getElementById("ogleArasi").value === "1";
    programConfig.ogleArasi.var = ogleArasiVar;

    if (ogleArasiVar) {
      programConfig.ogleArasi.dersSonrasi = parseInt(
        document.getElementById("ogleArasiDers").value
      );
      programConfig.ogleArasi.sure = parseInt(
        document.getElementById("ogleArasiSure").value
      );
    }

    console.log("🔄 Program veritabanında oluşturuluyor...");

    let sinifId = 1;
    if (allSiniflar && allSiniflar.length > 0) {
      sinifId = allSiniflar[0].id;
    }

    const programData = {
      sinif_id: sinifId,
      program_adi: `Program ${new Date().toLocaleDateString("tr-TR")}`,
      hafta_gunu: haftaGunu,
      gunluk_ders_sayisi:
        programConfig.gunlukDers.type === "sabit"
          ? programConfig.gunlukDers.sabit
          : Math.max(...Object.values(programConfig.gunlukDers.farkli)),
      ders_suresi: programConfig.dersSuresi,
      teneffus_suresi: programConfig.teneffusSuresi,
      baslangic_saati: programConfig.dersBaslangic,
      ogle_arasi_var: programConfig.ogleArasi.var ? 1 : 0,
      ogle_arasi_ders_sonrasi: programConfig.ogleArasi.dersSonrasi,
      ogle_arasi_suresi: programConfig.ogleArasi.sure,
      olusturan_kullanici_id: currentUser ? currentUser.id : null,
      notlar: "Akıllı Asistan ile oluşturuldu",
    };

    console.log("📤 Program data gönderiliyor:", programData);

    const result = await window.electronAPI.createDersProgram(programData);

    console.log("📥 Sonuç alındı:", result);

    if (!result.success) {
      console.error("❌ Program oluşturulamadı:", result.message);
      Bildirim.goster("error", result.message || "Program oluşturulamadı!");
      return;
    }

    const programId = result.programId;
    console.log("✅ Program oluşturuldu, ID:", programId);

    localStorage.setItem("currentProgramId", programId.toString());
    console.log(
      "💾 localStorage'a kaydedildi:",
      localStorage.getItem("currentProgramId")
    );

    currentProgramId = programId;
    console.log("🔄 Global değişkene atandı:", currentProgramId);

    localStorage.setItem("programConfig", JSON.stringify(programConfig));

    await onProgramCreated(programId);

    console.log("✅ Program config kaydedildi");

    setTimeout(() => {
      console.log("🔍 FINAL KONTROL:");
      console.log("  - currentProgramId:", currentProgramId);
      console.log(
        "  - localStorage:",
        localStorage.getItem("currentProgramId")
      );
      console.log("  - typeof:", typeof currentProgramId);
    }, 100);

    generateSummary();

    setTimeout(() => {
      createProgramTable();

      // ✅ FİX: Modal kapatma düzeltildi
      const modal = document.getElementById("modalAsistan");
      if (modal) {
        modal.style.display = "none";
      }

      addLog("Program yapılandırması kaydedildi");
      ModernBildirim.success("Başarılı!", "Program oluşturuldu!");

      Bildirim.goster("success", "Program tablosu oluşturuldu!");
      addLog("Program tablosu oluşturuldu");
    }, 1500);
  } catch (error) {
    console.error("❌ Config kaydetme hatası:", error);
    Bildirim.goster("error", "Program oluşturulurken hata oluştu!");
  }
}

function generateSummary() {
  const summary = document.getElementById("successSummary");
  if (!summary) return;

  const gunler =
    programConfig.haftaGunu === 5 ? "Pazartesi-Cuma" : "Pazartesi-Cumartesi";
  const dersSayisi =
    programConfig.gunlukDers.type === "sabit"
      ? `${programConfig.gunlukDers.sabit} ders/gün`
      : "Günlere göre farklı";

  summary.innerHTML = `
    <div class="success-item">
      <strong>📅 Hafta:</strong> ${gunler} (${programConfig.haftaGunu} gün)
    </div>
    <div class="success-item">
      <strong>📚 Günlük Ders:</strong> ${dersSayisi}
    </div>
    <div class="success-item">
      <strong>⏰ Başlangıç:</strong> ${programConfig.dersBaslangic}
    </div>
    <div class="success-item">
      <strong>⏱️ Ders Süresi:</strong> ${programConfig.dersSuresi} dakika
    </div>
    <div class="success-item">
      <strong>🔔 Teneffüs:</strong> ${programConfig.teneffusSuresi} dakika
    </div>
    ${
      programConfig.ogleArasi.var
        ? `
    <div class="success-item">
      <strong>🍽️ Öğle Arası:</strong> ${programConfig.ogleArasi.sure} dakika (${programConfig.ogleArasi.dersSonrasi}. ders sonrası)
    </div>
    `
        : ""
    }
  `;
}

// ==========================================
// PROGRAM TABLOSU OLUŞTURMA
// ==========================================

function createProgramTable() {
  const viewerSelectorHTML =
    document.getElementById("viewerSelector")?.outerHTML;
  const programViewTableHTML =
    document.getElementById("programViewTable")?.outerHTML;

  const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
  if (programConfig.haftaGunu === 6) {
    gunler.push("Cumartesi");
  }

  const maxSaat =
    programConfig.gunlukDers.type === "sabit"
      ? programConfig.gunlukDers.sabit
      : Math.max(...Object.values(programConfig.gunlukDers.farkli));

  let html = `
    <table class="program-table">
      <thead>
        <tr>
          <th class="saat-column">SAAT</th>
          ${gunler.map((gun) => `<th>${gun.toUpperCase()}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  for (let saat = 1; saat <= maxSaat; saat++) {
    html += "<tr>";
    html += `<td class="saat-column">${saat}. DERS</td>`;

    gunler.forEach((gun, gunIndex) => {
      const gunNo = gunIndex + 1;
      let saatVar = true;
      if (programConfig.gunlukDers.type === "farkli") {
        saatVar = saat <= programConfig.gunlukDers.farkli[gunNo];
      }

      if (saatVar) {
        html += `
          <td class="ders-cell" data-gun="${gunNo}" data-saat="${saat}">
            <div class="cell-content empty" data-gun="${gunNo}" data-saat="${saat}">
              <div class="cell-placeholder">BOŞ</div>
            </div>
          </td>
        `;
      } else {
        html +=
          '<td class="ders-cell disabled"><div class="cell-content">—</div></td>';
      }
    });
    html += "</tr>";
  }

  html += `</tbody></table>`;

  const existingTable = tabloContainer.querySelector(".program-table");
  if (existingTable) {
    existingTable.outerHTML = html;
  } else {
    tabloContainer.innerHTML = html;
  }

  console.log(`Tablo oluşturuldu: ${maxSaat} ders/gün, ${gunler.length} gün`);

  if (viewerSelectorHTML && !document.getElementById("viewerSelector")) {
    tabloContainer.insertAdjacentHTML("afterbegin", viewerSelectorHTML);
    console.log("✅ viewerSelector geri eklendi");
  }

  if (programViewTableHTML && !document.getElementById("programViewTable")) {
    const tableElement = tabloContainer.querySelector(".program-table");
    if (tableElement) {
      tableElement.insertAdjacentHTML("beforebegin", programViewTableHTML);
    } else {
      tabloContainer.insertAdjacentHTML("afterbegin", programViewTableHTML);
    }
    console.log("✅ programViewTable geri eklendi");
  }

  setTimeout(() => {
    if (typeof initViewer === "function") {
      initViewer();
      console.log("✅ initViewer tekrar çağrıldı");
    }
  }, 100);

  setTimeout(() => {
    console.log("Drop zones ve drag events başlatılıyor...");
    initDropZones();
    initDragEvents();
    updateStats();
  }, 200);

  updateTableInfo();
  showTableButtons();
}

function updateTableInfo() {
  const tabloBaslik = document.getElementById("tabloBaslik");
  const tabloMeta = document.getElementById("tabloMeta");

  if (tabloBaslik) {
    tabloBaslik.textContent = "Program Tablosu";
  }

  if (tabloMeta) {
    const gunSayisi = programConfig.haftaGunu;
    const dersSayisi =
      programConfig.gunlukDers.type === "sabit"
        ? programConfig.gunlukDers.sabit
        : "Değişken";
    tabloMeta.textContent = `${gunSayisi} Gün - ${dersSayisi} Ders/Gün`;
  }
}

function showTableButtons() {
  const btnYenile = document.getElementById("btnYenile");
  const btnSil = document.getElementById("btnSil");
  const btnSinifSec = document.getElementById("btnSinifSec");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");

  if (btnYenile) btnYenile.style.display = "flex";
  if (btnSil) btnSil.style.display = "flex";
  if (btnSinifSec) btnSinifSec.style.display = "flex";
  if (btnZoomIn) btnZoomIn.style.display = "flex";
  if (btnZoomOut) btnZoomOut.style.display = "flex";
}

function hideTableButtons() {
  const btnYenile = document.getElementById("btnYenile");
  const btnSil = document.getElementById("btnSil");
  const btnSinifSec = document.getElementById("btnSinifSec");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");

  if (btnYenile) btnYenile.style.display = "none";
  if (btnSil) btnSil.style.display = "none";
  if (btnSinifSec) btnSinifSec.style.display = "none";
  if (btnZoomIn) btnZoomIn.style.display = "none";
  if (btnZoomOut) btnZoomOut.style.display = "none";
}

// ==========================================
// KAYITLI CONFIG KONTROLÜ
// ==========================================

function checkSavedConfig() {
  const savedConfig = localStorage.getItem("programConfig");

  if (savedConfig) {
    try {
      const parsedConfig = JSON.parse(savedConfig);
      console.log("✅ Kayıtlı config bulundu:", parsedConfig);

      // ✅ VALİDASYON: Gerekli alanlar var mı kontrol et
      if (!parsedConfig.gunlukDers) {
        console.warn("⚠️ gunlukDers eksik, varsayılan değerler kullanılıyor");
        parsedConfig.gunlukDers = { type: "sabit", sabit: 8, farkli: {} };
      }

      if (!parsedConfig.gunlukDers.type) {
        console.warn(
          "⚠️ gunlukDers.type eksik, varsayılan 'sabit' kullanılıyor"
        );
        parsedConfig.gunlukDers.type = "sabit";
      }

      if (
        parsedConfig.gunlukDers.type === "sabit" &&
        !parsedConfig.gunlukDers.sabit
      ) {
        console.warn("⚠️ gunlukDers.sabit eksik, varsayılan 8 kullanılıyor");
        parsedConfig.gunlukDers.sabit = 8;
      }

      if (
        parsedConfig.gunlukDers.type === "farkli" &&
        !parsedConfig.gunlukDers.farkli
      ) {
        console.warn(
          "⚠️ gunlukDers.farkli eksik, varsayılan değerler kullanılıyor"
        );
        parsedConfig.gunlukDers.farkli = { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 };
      }

      // ✅ Diğer eksik alanları da kontrol et
      if (!parsedConfig.haftaGunu) {
        parsedConfig.haftaGunu = 5;
      }

      if (!parsedConfig.dersBaslangic) {
        parsedConfig.dersBaslangic = "08:00";
      }

      if (!parsedConfig.dersSuresi) {
        parsedConfig.dersSuresi = 40;
      }

      if (!parsedConfig.teneffusSuresi) {
        parsedConfig.teneffusSuresi = 10;
      }

      if (!parsedConfig.ogleArasi) {
        parsedConfig.ogleArasi = { var: false, dersSonrasi: 4, sure: 60 };
      }

      // ✅ Global programConfig'e ata
      programConfig = parsedConfig;

      // ✅ Düzeltilmiş config'i tekrar kaydet
      localStorage.setItem("programConfig", JSON.stringify(programConfig));

      console.log("✅ Düzeltilmiş programConfig:", programConfig);

      // ✅ FİX: MODAL AÇMADAN SADECE TABLO OLUŞTUR
      console.log(
        "📋 Kayıtlı config yüklendi, tablo oluşturuluyor (modal AÇILMADAN)"
      );

      // Modal açmadan direkt tablo oluştur
      createProgramTable();
      addLog("Kayıtlı program yüklendi");

      if (typeof ModernBildirim !== "undefined") {
        ModernBildirim.info("Bilgi", "Kayıtlı program yapılandırması yüklendi");
      }
    } catch (error) {
      console.error("❌ Config parse hatası:", error);

      // ✅ HATA DURUMUNDA: LocalStorage'ı temizle ve varsayılan değerleri kullan
      console.warn(
        "⚠️ Bozuk config temizleniyor, varsayılan değerler kullanılacak"
      );

      localStorage.removeItem("programConfig");

      // Varsayılan config'i yükle
      programConfig = {
        haftaGunu: 5,
        gunlukDers: { type: "sabit", sabit: 8, farkli: {} },
        dersBaslangic: "08:00",
        dersSuresi: 40,
        teneffusSuresi: 10,
        ogleArasi: { var: false, dersSonrasi: 4, sure: 60 },
      };

      if (typeof ModernBildirim !== "undefined") {
        ModernBildirim.warning(
          "Uyarı",
          "Kayıtlı config bozuk, varsayılan değerler kullanılıyor"
        );
      }
    }
  } else {
    console.log("📋 Kayıtlı config yok, varsayılan değerler kullanılıyor");
  }
}

// ==========================================
// ACCORDION SİSTEMİ
// ==========================================

function initAccordion() {
  const derslerAccordion = document.getElementById("derslerAccordion");
  const derslerContent = document.getElementById("derslerContent");

  const ogretmenlerAccordion = document.getElementById("ogretmenlerAccordion");
  const ogretmenlerContent = document.getElementById("ogretmenlerContent");

  const siniflarAccordion = document.getElementById("siniflarAccordion");
  const siniflarContent = document.getElementById("siniflarContent");

  if (derslerAccordion && derslerContent) {
    derslerAccordion.addEventListener("click", () => {
      derslerAccordion.classList.toggle("active");
      derslerContent.classList.toggle("active");
    });
  }

  if (ogretmenlerAccordion && ogretmenlerContent) {
    ogretmenlerAccordion.addEventListener("click", () => {
      ogretmenlerAccordion.classList.toggle("active");
      ogretmenlerContent.classList.toggle("active");
    });
  }

  if (siniflarAccordion && siniflarContent) {
    siniflarAccordion.addEventListener("click", () => {
      siniflarAccordion.classList.toggle("active");
      siniflarContent.classList.toggle("active");
    });
  }

  console.log("✅ Accordion sistemi başlatıldı");
}

// Animasyon CSS'i
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);
// ==========================================
// YENİ AKILLI ASİSTAN (ANALİZ YAPAN)
// ==========================================

function openYeniAkilliAsistan() {
  console.log("🤖 YENİ Akıllı Asistan açılıyor - ANALİZ VE OPTİMİZASYON");

  const modal = document.createElement("div");
  modal.id = "yeniAkilliAsistanModal";
  modal.className = "modal";
  modal.style.display = "flex";

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <h2 style="color: white;">🤖 Akıllı Asistan</h2>
        <button class="btn-close" onclick="closeYeniAkilliAsistan()" style="background: rgba(255,255,255,0.2); color: white;">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="asistan-card" style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <h3 style="font-size: 16px; margin-bottom: 12px;">📊 Program Analizi</h3>
          <p style="color: #666; font-size: 14px; margin-bottom: 12px;">
            Mevcut programınızı analiz edelim ve iyileştirme önerileri sunalım
          </p>
          <button class="btn btn-primary btn-block" onclick="analizYap()" style="width: 100%; background: #667eea; color: #fff; font-weight: 600;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Analiz Başlat
          </button>
        </div>

        <div class="asistan-card" style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <h3 style="font-size: 16px; margin-bottom: 12px;">🔄 Ders Değişimi</h3>
          <p style="color: #666; font-size: 14px; margin-bottom: 12px;">
            İki öğretmen arasında akıllı ders değişimi yapın
          </p>
          <button class="btn btn-primary btn-block" onclick="openDersDegisTirModal()" style="width: 100%; background: #667eea; color: #fff; font-weight: 600;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 014-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
            Ders Değiştir
          </button>
        </div>

        <div class="asistan-card" style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px;">
          <h3 style="font-size: 16px; margin-bottom: 12px;">↩️ Geri Al / İleri Al</h3>
          <p style="color: #666; font-size: 14px; margin-bottom: 12px;">
            Son değişikliklerinizi geri alın veya ileri alın
          </p>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-ghost" onclick="undoAction()" id="btnUndoModal" style="flex: 1; color: #000;" disabled>
              ↩️ Geri Al
            </button>
            <button class="btn btn-ghost" onclick="redoAction()" id="btnRedoModal" style="flex: 1; color: #000;" disabled>
              ↪️ İleri Al
            </button>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeYeniAkilliAsistan()" style="color: #000 !important;">Kapat</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  updateUndoRedoButtons();
}

function closeYeniAkilliAsistan() {
  const modal = document.getElementById("yeniAkilliAsistanModal");
  if (modal) {
    modal.remove();
  }
}

function analizYap() {
  console.log("📊 Analiz yapılıyor...");

  // ÖNCE TABLO VAR MI KONTROL ET
  const tablo = document.querySelector(".program-table");
  if (!tablo) {
    Bildirim.goster(
      "warning",
      "Önce 'Tablo Oluştur' ile program tablosu oluşturun!"
    );
    return;
  }

  // DOLU HÜCRE VAR MI KONTROL ET
  const doluHucreler = document.querySelectorAll(".cell-content:not(.empty)");
  if (doluHucreler.length === 0) {
    Bildirim.goster(
      "warning",
      "Program tablosuna ders yerleştirin, sonra analiz yapın!"
    );
    return;
  }

  // DistributionAnalyzer kontrolü
  if (!window.distributionAnalyzer) {
    Bildirim.goster("error", "Analiz modülü yüklenmemiş!");
    return;
  }

  // programData kontrolü
  if (!window.programData || Object.keys(window.programData).length === 0) {
    Bildirim.goster(
      "warning",
      "Analiz edilecek veri bulunamadı! Önce dersleri yerleştirin."
    );
    return;
  }

  try {
    const analysis = window.distributionAnalyzer.analyzeDistribution(
      window.programData
    );

    // Konsola detaylı rapor
    window.distributionAnalyzer.printReport(analysis);

    // Kullanıcıya özet
    showAnalysisResults(analysis);
  } catch (error) {
    console.error("❌ Analiz hatası:", error);
    Bildirim.goster("error", "Analiz yapılamadı: " + error.message);
  }
}

function showAnalysisResults(analysis) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "flex";

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>📊 Analiz Sonuçları</h2>
        <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
      </div>
      
      <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
        <!-- Genel Kalite -->
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">GENEL KALİTE SKORU</div>
          <div style="font-size: 48px; font-weight: 900;">${analysis.quality.overall.toFixed(
            0
          )}</div>
          <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; margin-top: 12px; overflow: hidden;">
            <div style="width: ${
              analysis.quality.overall
            }%; height: 100%; background: white;"></div>
          </div>
        </div>

        <!-- Metrikler -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
          <div class="stat-card" style="border: 2px solid #e0e0e0; padding: 16px; border-radius: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Boşluk Skoru</div>
            <div style="font-size: 28px; font-weight: 900; color: ${
              analysis.quality.metrics.gapScore > 70 ? "#4caf50" : "#ff9800"
            };">
              ${analysis.quality.metrics.gapScore.toFixed(0)}
            </div>
          </div>
          
          <div class="stat-card" style="border: 2px solid #e0e0e0; padding: 16px; border-radius: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Denge Skoru</div>
            <div style="font-size: 28px; font-weight: 900; color: ${
              analysis.quality.metrics.balanceScore > 70 ? "#4caf50" : "#ff9800"
            };">
              ${analysis.quality.metrics.balanceScore.toFixed(0)}
            </div>
          </div>
          
          <div class="stat-card" style="border: 2px solid #e0e0e0; padding: 16px; border-radius: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Tercih Skoru</div>
            <div style="font-size: 28px; font-weight: 900; color: ${
              analysis.quality.metrics.preferenceScore > 70
                ? "#4caf50"
                : "#ff9800"
            };">
              ${analysis.quality.metrics.preferenceScore.toFixed(0)}
            </div>
          </div>
          
          <div class="stat-card" style="border: 2px solid #e0e0e0; padding: 16px; border-radius: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Çakışma Skoru</div>
            <div style="font-size: 28px; font-weight: 900; color: ${
              analysis.quality.metrics.conflictScore === 100
                ? "#4caf50"
                : "#f44336"
            };">
              ${analysis.quality.metrics.conflictScore.toFixed(0)}
            </div>
          </div>
        </div>

        <!-- Güçlü Yönler -->
        ${
          analysis.quality.strengths.length > 0
            ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 16px; color: #4caf50; margin-bottom: 12px;">✅ Güçlü Yönler</h3>
          <ul style="margin-left: 20px;">
            ${analysis.quality.strengths
              .map(
                (s) => `<li style="margin-bottom: 8px; color: #666;">${s}</li>`
              )
              .join("")}
          </ul>
        </div>
        `
            : ""
        }

        <!-- Sorunlar -->
        ${
          analysis.quality.issues.length > 0
            ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 16px; color: #ff9800; margin-bottom: 12px;">⚠️ İyileştirilebilir</h3>
          <ul style="margin-left: 20px;">
            ${analysis.quality.issues
              .map(
                (i) => `<li style="margin-bottom: 8px; color: #666;">${i}</li>`
              )
              .join("")}
          </ul>
        </div>
        `
            : ""
        }

        <!-- Öneriler -->
        ${
          analysis.recommendations.length > 0
            ? `
        <div>
          <h3 style="font-size: 16px; color: #2196f3; margin-bottom: 12px;">💡 Öneriler</h3>
          ${analysis.recommendations
            .slice(0, 5)
            .map(
              (rec, i) => `
            <div style="border-left: 3px solid ${
              rec.priority === "critical"
                ? "#f44336"
                : rec.priority === "high"
                ? "#ff9800"
                : "#2196f3"
            }; padding: 12px; margin-bottom: 8px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-weight: 700; margin-bottom: 4px;">${i + 1}. ${
                rec.message
              }</div>
              <div style="font-size: 13px; color: #666;">${
                rec.action || ""
              }</div>
            </div>
          `
            )
            .join("")}
        </div>
        `
            : ""
        }
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">Kapat</button>
        <button class="btn btn-primary" onclick="exportAnalysisReport()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Raporu İndir
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function exportAnalysisReport() {
  if (!distributionAnalyzer || !window.programData) return;

  const analysis = distributionAnalyzer.analyzeDistribution(window.programData);

  const reportData = {
    timestamp: new Date().toISOString(),
    analysis: analysis,
  };

  const blob = new Blob([JSON.stringify(reportData, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analiz-raporu-${Date.now()}.json`;
  a.click();

  Bildirim.goster("success", "Rapor indirildi!");
}

function openDersDegisTirModal() {
  Bildirim.goster("info", "Ders değiştir özelliği yakında aktif olacak!");
}

function updateUndoRedoButtons() {
  if (!window.undoRedoManager) return;

  const btnUndo = document.getElementById("btnUndo");
  const btnRedo = document.getElementById("btnRedo");
  const btnUndoModal = document.getElementById("btnUndoModal");
  const btnRedoModal = document.getElementById("btnRedoModal");

  if (btnUndo) {
    btnUndo.disabled = !window.undoRedoManager.canUndo();
  }

  if (btnRedo) {
    btnRedo.disabled = !window.undoRedoManager.canRedo();
  }

  if (btnUndoModal) {
    btnUndoModal.disabled = !window.undoRedoManager.canUndo();
  }

  if (btnRedoModal) {
    btnRedoModal.disabled = !window.undoRedoManager.canRedo();
  }
}

function undoAction() {
  if (!window.undoRedoManager) return;

  const previousState = window.undoRedoManager.undo();

  if (previousState) {
    window.programData = previousState;

    if (window.updateProgramTable) {
      window.updateProgramTable();
    }

    Bildirim.goster("success", "↩️ Geri alındı");
    updateUndoRedoButtons();
  }
}

function redoAction() {
  if (!window.undoRedoManager) return;

  const nextState = window.undoRedoManager.redo();

  if (nextState) {
    window.programData = nextState;

    if (window.updateProgramTable) {
      window.updateProgramTable();
    }

    Bildirim.goster("success", "↪️ İleri alındı");
    updateUndoRedoButtons();
  }
}
// ==========================================
// 🎯 KISIT YÖNETİMİ MODALI - DÜZELTİLMİŞ SİSTEM
// ==========================================

let allOgretmenlerForKisit = [];
let kayitliKisitlar = [];
let selectedOgretmenIdForKisit = null;

function openKisitModal() {
  console.log("📂 Kısıt modalı açılıyor, Program ID:", currentProgramId);
  const modal = document.getElementById("kisitModal");
  if (modal) {
    modal.style.display = "flex";
    loadKisitModalData();

    setTimeout(() => {
      initKisitTabs();
    }, 100);
  }
}

function closeKisitModal() {
  const modal = document.getElementById("kisitModal");
  if (modal) {
    modal.style.display = "none";
    clearOgretmenSelection();
  }
}

// ✅ DÜZELTİLMİŞ: TEK FONKSİYONDA TÜM VERİLERİ YÜK
async function loadKisitModalData() {
  try {
    console.log("📊 Kısıt modal verileri yükleniyor...");

    // 1. Öğretmenleri yükle
    const ogretmenResult = await window.electronAPI.getAllTeachers();
    allOgretmenlerForKisit = ogretmenResult.success
      ? ogretmenResult.data.filter((o) => o.durum === 1)
      : [];

    console.log(`✅ ${allOgretmenlerForKisit.length} öğretmen yüklendi`);

    // 2. Program ID varsa kısıtları yükle
    if (currentProgramId) {
      const kisitResult = await window.electronAPI.getKisitlar(
        currentProgramId
      );

      if (kisitResult.success) {
        // Genel kısıtları form'a yükle
        const genel = kisitResult.data.genel;
        if (genel) {
          loadGenelKisitlarToForm(genel);
        }

        // Öğretmen bazlı kısıtları yükle
        kayitliKisitlar = kisitResult.data.ogretmenler || [];
        console.log(`✅ ${kayitliKisitlar.length} kısıt yüklendi`);
      }
    } else {
      console.warn("⚠️ Program ID yok, kısıtlar yüklenemedi");
      kayitliKisitlar = [];
    }

    // 3. UI'ı render et
    renderOgretmenCards();
    renderKisitListesi();

    console.log("✅ Kısıt modal verileri yüklendi");
  } catch (error) {
    console.error("❌ Kısıt modal yükleme hatası:", error);
    Bildirim.goster("error", "Kısıt veriler yüklenemedi!");
  }
}

// ✅ Genel kısıtları form'a yükle
function loadGenelKisitlarToForm(genel) {
  const chkTumOgretmenlere = document.getElementById("chkTumOgretmenlere");
  const selectMinGunlukDers = document.getElementById("selectMinGunlukDers");
  const selectMaxGunlukDers = document.getElementById("selectMaxGunlukDers");
  const selectMaxBosPencere = document.getElementById("selectMaxBosPencere");
  const chkAyniGunYasak = document.getElementById("chkAyniGunYasak");
  const chkBlokFarkliGun = document.getElementById("chkBlokFarkliGun");

  if (chkTumOgretmenlere)
    chkTumOgretmenlere.checked = genel.tum_ogretmenlere_uygula === 1;
  if (selectMinGunlukDers)
    selectMinGunlukDers.value = genel.min_gunluk_ders || 2;
  if (selectMaxGunlukDers)
    selectMaxGunlukDers.value = genel.max_gunluk_ders || 8;
  if (selectMaxBosPencere)
    selectMaxBosPencere.value = genel.max_bos_pencere || 2;
  if (chkAyniGunYasak)
    chkAyniGunYasak.checked = genel.ayni_gun_ayni_sinif === 1;
  if (chkBlokFarkliGun) chkBlokFarkliGun.checked = genel.blok_farkli_gun === 1;
}

// ✅ DÜZELTİLMİŞ: Öğretmen kartlarını render et
function renderOgretmenCards() {
  console.log("🎨 Öğretmen kartları render ediliyor...");
  console.log("📊 Toplam öğretmen:", allOgretmenlerForKisit.length);
  console.log("📊 Kayıtlı kısıt:", kayitliKisitlar.length);

  const container = document.getElementById("ogretmenCardList");
  if (!container) {
    console.error("❌ ogretmenCardList container bulunamadı!");
    return;
  }

  container.innerHTML = "";

  if (allOgretmenlerForKisit.length === 0) {
    container.innerHTML =
      '<div class="empty-message">Öğretmen bulunamadı</div>';
    return;
  }

  allOgretmenlerForKisit.forEach((ogretmen) => {
    const card = document.createElement("div");
    card.className = "ogretmen-card";
    card.dataset.ogretmenId = ogretmen.id;
    card.onclick = () => selectOgretmenForKisit(ogretmen.id, ogretmen.ad_soyad);

    const mevcutKisit = kayitliKisitlar.find(
      (k) => k.ogretmen_id === ogretmen.id
    );

    console.log(`🔍 ${ogretmen.ad_soyad} → Kısıt var mı:`, !!mevcutKisit);

    const kisitBadge = mevcutKisit
      ? '<div class="ogretmen-card-badge kisitli">✅ Kısıtlı</div>'
      : '<div class="ogretmen-card-badge">— Kısıt Yok</div>';

    card.innerHTML = `
      <div class="ogretmen-card-name">${ogretmen.ad_soyad}</div>
      <div class="ogretmen-card-brans">${ogretmen.brans || "Branş Yok"}</div>
      ${kisitBadge}
    `;

    container.appendChild(card);
  });

  console.log(`✅ ${allOgretmenlerForKisit.length} öğretmen kartı oluşturuldu`);
}

// ✅ Öğretmen seç
function selectOgretmenForKisit(ogretmenId, ogretmenAd) {
  console.log("✅ Öğretmen seçildi:", ogretmenId, ogretmenAd);

  selectedOgretmenIdForKisit = ogretmenId;

  // Seçilen öğretmenin mevcut kısıtını yükle
  const mevcutKisit = kayitliKisitlar.find((k) => k.ogretmen_id === ogretmenId);

  // Form'u göster ve doldur
  document.getElementById("secilenOgretmenInfo").style.display = "block";
  document.getElementById("secilenOgretmenAd").textContent = ogretmenAd;
  document.getElementById("kisitAyarlari").style.display = "flex";
  document.getElementById("kisitButtons").style.display = "flex";

  // Mevcut kısıt varsa form'u doldur
  if (mevcutKisit) {
    document.getElementById("selectOgretmenMin").value =
      mevcutKisit.min_gunluk_ders || 2;
    document.getElementById("selectOgretmenMax").value =
      mevcutKisit.max_gunluk_ders || 8;
    document.getElementById("selectOgretmenBos").value =
      mevcutKisit.max_bos_pencere || 2;
    console.log("📝 Mevcut kısıt yüklendi:", mevcutKisit);
  } else {
    // Varsayılan değerler
    document.getElementById("selectOgretmenMin").value = "2";
    document.getElementById("selectOgretmenMax").value = "8";
    document.getElementById("selectOgretmenBos").value = "2";
  }

  // Kartları güncelle
  document.querySelectorAll(".ogretmen-card").forEach((card) => {
    if (parseInt(card.dataset.ogretmenId) === ogretmenId) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

// ✅ Seçimi temizle
function clearOgretmenSelection() {
  selectedOgretmenIdForKisit = null;

  document.getElementById("secilenOgretmenInfo").style.display = "none";
  document.getElementById("kisitAyarlari").style.display = "none";
  document.getElementById("kisitButtons").style.display = "none";

  document.getElementById("selectOgretmenMin").value = "2";
  document.getElementById("selectOgretmenMax").value = "8";
  document.getElementById("selectOgretmenBos").value = "2";

  document.querySelectorAll(".ogretmen-card").forEach((card) => {
    card.classList.remove("selected");
  });

  console.log("🧹 Öğretmen seçimi temizlendi");
}

// ✅ DÜZELTİLMİŞ: Kısıt ekle/güncelle
async function addOgretmenKisit() {
  console.log("🎯 Öğretmen kısıtı ekleniyor/güncelleniyor...");

  const ogretmenId = selectedOgretmenIdForKisit;

  if (!ogretmenId) {
    console.warn("⚠️ Öğretmen seçilmedi!");
    Bildirim.goster("error", "Lütfen bir öğretmen kartına tıklayarak seçin!");
    return;
  }

  if (!currentProgramId) {
    console.warn("⚠️ Program ID yok!");
    Bildirim.goster("error", "Önce Akıllı Asistan ile program oluşturun!");
    return;
  }

  const minDersValue = document.getElementById("selectOgretmenMin").value;
  const maxDersValue = document.getElementById("selectOgretmenMax").value;
  const bosPencereValue = document.getElementById("selectOgretmenBos").value;

  if (!minDersValue || !maxDersValue || !bosPencereValue) {
    Bildirim.goster("error", "Lütfen tüm kısıt değerlerini seçin!");
    return;
  }

  const minDers = parseInt(minDersValue);
  const maxDers = parseInt(maxDersValue);
  const bosPencere = parseInt(bosPencereValue);

  if (minDers > maxDers) {
    Bildirim.goster(
      "error",
      "En az ders sayısı, en çok ders sayısından büyük olamaz!"
    );
    return;
  }

  console.log("📊 Kısıt değerleri:", {
    programId: currentProgramId,
    ogretmenId,
    minDers,
    maxDers,
    bosPencere,
  });

  try {
    const result = await window.electronAPI.saveOgretmenKisit(
      currentProgramId,
      parseInt(ogretmenId),
      {
        min_gunluk_ders: minDers,
        max_gunluk_ders: maxDers,
        max_bos_pencere: bosPencere,
      }
    );

    console.log("📥 Sonuç:", result);

    if (result.success) {
      Bildirim.goster("success", "Öğretmen kısıtı kaydedildi!");

      // Verileri yeniden yükle
      await loadKisitModalData();

      // Seçimi temizle
      clearOgretmenSelection();

      console.log("✅ Kısıt eklendi ve liste yenilendi");
    } else {
      console.error("❌ Kısıt eklenemedi:", result.message);
      Bildirim.goster("error", result.message || "Kısıt eklenemedi!");
    }
  } catch (error) {
    console.error("❌ Kısıt ekleme hatası:", error);
    Bildirim.goster("error", "Kısıt eklenirken hata oluştu!");
  }
}

// ✅ Kısıt sil
async function deleteOgretmenKisitItem(ogretmenId) {
  if (!confirm("Bu kısıtı silmek istediğinize emin misiniz?")) {
    return;
  }

  if (!currentProgramId) {
    Bildirim.goster("error", "Program ID bulunamadı!");
    return;
  }

  try {
    const result = await window.electronAPI.deleteOgretmenKisit(
      currentProgramId,
      parseInt(ogretmenId)
    );

    if (result.success) {
      Bildirim.goster("success", "Kısıt silindi!");
      await loadKisitModalData();
    } else {
      Bildirim.goster("error", result.message || "Kısıt silinemedi!");
    }
  } catch (error) {
    console.error("❌ Kısıt silme hatası:", error);
    Bildirim.goster("error", "Kısıt silinirken hata oluştu!");
  }
}

// ✅ Kısıt listesini render et
function renderKisitListesi() {
  const container = document.getElementById("kisitListesi");
  if (!container) return;

  if (kayitliKisitlar.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <p>Henüz öğretmen kısıtı eklenmedi</p>
      </div>
    `;
    return;
  }

  let html = "";
  kayitliKisitlar.forEach((kisit) => {
    html += `
      <div class="kisit-item">
        <div class="kisit-item-info">
          <div class="kisit-item-name">${kisit.ad_soyad || "Bilinmeyen"}</div>
          <div class="kisit-item-details">
            ${kisit.min_gunluk_ders || 2}-${kisit.max_gunluk_ders || 8} saat, 
            ${kisit.max_bos_pencere || 2} boş pencere
          </div>
        </div>
        <div class="kisit-item-actions">
          <button class="btn-icon" onclick="deleteOgretmenKisitItem(${
            kisit.ogretmen_id
          })" title="Sil">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ✅ Varsayılana sıfırla
function resetToDefaultKisitlar() {
  if (
    !confirm("Tüm kısıtlar varsayılan değerlere döndürülecek. Emin misiniz?")
  ) {
    return;
  }

  const chkTumOgretmenlere = document.getElementById("chkTumOgretmenlere");
  const selectMinGunlukDers = document.getElementById("selectMinGunlukDers");
  const selectMaxGunlukDers = document.getElementById("selectMaxGunlukDers");
  const selectMaxBosPencere = document.getElementById("selectMaxBosPencere");
  const chkAyniGunYasak = document.getElementById("chkAyniGunYasak");
  const chkBlokFarkliGun = document.getElementById("chkBlokFarkliGun");

  if (chkTumOgretmenlere) chkTumOgretmenlere.checked = true;
  if (selectMinGunlukDers) selectMinGunlukDers.value = "2";
  if (selectMaxGunlukDers) selectMaxGunlukDers.value = "8";
  if (selectMaxBosPencere) selectMaxBosPencere.value = "2";
  if (chkAyniGunYasak) chkAyniGunYasak.checked = true;
  if (chkBlokFarkliGun) chkBlokFarkliGun.checked = true;

  Bildirim.goster("success", "Varsayılan ayarlara döndürüldü");
}

// ✅ Genel kısıtları kaydet
async function saveKisitlar() {
  if (!currentProgramId) {
    Bildirim.goster("error", "Program ID bulunamadı!");
    return;
  }

  try {
    const selectMinGunlukDers = document.getElementById("selectMinGunlukDers");
    const selectMaxGunlukDers = document.getElementById("selectMaxGunlukDers");
    const selectMaxBosPencere = document.getElementById("selectMaxBosPencere");
    const chkAyniGunYasak = document.getElementById("chkAyniGunYasak");
    const chkBlokFarkliGun = document.getElementById("chkBlokFarkliGun");
    const chkTumOgretmenlere = document.getElementById("chkTumOgretmenlere");

    const genelKisitlar = {
      min_gunluk_ders: selectMinGunlukDers
        ? parseInt(selectMinGunlukDers.value)
        : 2,
      max_gunluk_ders: selectMaxGunlukDers
        ? parseInt(selectMaxGunlukDers.value)
        : 8,
      max_bos_pencere: selectMaxBosPencere
        ? parseInt(selectMaxBosPencere.value)
        : 2,
      ayni_gun_ayni_sinif: chkAyniGunYasak
        ? chkAyniGunYasak.checked
          ? 1
          : 0
        : 1,
      blok_farkli_gun: chkBlokFarkliGun
        ? chkBlokFarkliGun.checked
          ? 1
          : 0
        : 1,
      tek_saat_yasak: 1,
      tum_ogretmenlere_uygula: chkTumOgretmenlere
        ? chkTumOgretmenlere.checked
          ? 1
          : 0
        : 1,
    };

    const result = await window.electronAPI.saveGenelKisitlar(
      currentProgramId,
      genelKisitlar
    );

    if (result.success) {
      Bildirim.goster("success", "Kısıtlar başarıyla kaydedildi!");
      closeKisitModal();
    } else {
      Bildirim.goster("error", result.message || "Kısıtlar kaydedilemedi!");
    }
  } catch (error) {
    console.error("❌ Kısıt kaydetme hatası:", error);
    Bildirim.goster("error", "Kısıtlar kaydedilirken hata oluştu!");
  }
}

// ✅ Program ID ayarla
function setProgramId(programId) {
  currentProgramId = programId;
  console.log("✅ Program ID ayarlandı:", currentProgramId);
}

// ✅ Program oluşturulduğunda
async function onProgramCreated(programId) {
  setProgramId(programId);
  await saveDefaultKisitlar(programId);
}

// ✅ Varsayılan kısıtları kaydet
async function saveDefaultKisitlar(programId) {
  try {
    const defaultKisitlar = {
      min_gunluk_ders: 2,
      max_gunluk_ders: 8,
      max_bos_pencere: 2,
      ayni_gun_ayni_sinif: 1,
      blok_farkli_gun: 1,
      tek_saat_yasak: 1,
      tum_ogretmenlere_uygula: 1,
    };

    await window.electronAPI.saveGenelKisitlar(programId, defaultKisitlar);
    console.log("✅ Varsayılan kısıtlar kaydedildi");
  } catch (error) {
    console.error("❌ Varsayılan kısıt kaydetme hatası:", error);
  }
}

// ============================================
// TAB SİSTEMİ - KISIT MODALI
// ============================================

let activeTab = "genel";

function initKisitTabs() {
  const tabs = document.querySelectorAll(".modal-tab");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(`tab-${targetTab}`).classList.add("active");

      activeTab = targetTab;
      console.log(`✅ Tab değişti: ${targetTab}`);

      if (targetTab === "onizleme") {
        renderOnizlemePanel();
      }
    });
  });

  console.log("✅ Tab sistemi başlatıldı");
}

function renderOnizlemePanel() {
  const container = document.getElementById("onizlemeContent");
  if (!container) return;

  const genelKisitSayisi = document.querySelectorAll(
    '#tab-genel input[type="checkbox"]:checked'
  ).length;
  const ogretmenKisitSayisi = kayitliKisitlar.length;
  const toplamKisit = genelKisitSayisi + ogretmenKisitSayisi;

  let kisitListesi = "";

  const chkTumOgretmenlere = document.getElementById("chkTumOgretmenlere");
  const selectMinGunlukDers = document.getElementById("selectMinGunlukDers");
  const selectMaxGunlukDers = document.getElementById("selectMaxGunlukDers");
  const chkAyniGunYasak = document.getElementById("chkAyniGunYasak");
  const chkBlokFarkliGun = document.getElementById("chkBlokFarkliGun");

  if (chkTumOgretmenlere?.checked) {
    kisitListesi += `
      <div class="onizleme-item">
        <div class="onizleme-item-title">✅ Genel: Tüm Öğretmenlere Uygulanıyor</div>
        <div class="onizleme-item-text">Günlük ${
          selectMinGunlukDers?.value || 2
        }-${selectMaxGunlukDers?.value || 8} saat</div>
      </div>
    `;
  }

  if (chkAyniGunYasak?.checked) {
    kisitListesi += `
      <div class="onizleme-item">
        <div class="onizleme-item-title">✅ Aynı Gün Aynı Sınıf Yasak</div>
        <div class="onizleme-item-text">Öğretmen aynı gün aynı sınıfa arka arkaya giremez</div>
      </div>
    `;
  }

  if (chkBlokFarkliGun?.checked) {
    kisitListesi += `
      <div class="onizleme-item">
        <div class="onizleme-item-title">✅ Bloklar Farklı Günlere Dağıtılacak</div>
        <div class="onizleme-item-text">4 saatlik ders → 2+2 şeklinde farklı günlere</div>
      </div>
    `;
  }

  kayitliKisitlar.forEach((kisit) => {
    const uyariSeviyesi =
      kisit.max_gunluk_ders < 6
        ? "warning"
        : kisit.max_gunluk_ders < 4
        ? "error"
        : "";

    kisitListesi += `
      <div class="onizleme-item ${uyariSeviyesi}">
        <div class="onizleme-item-title">👨‍🏫 ${
          kisit.ad_soyad || "Bilinmeyen"
        }</div>
        <div class="onizleme-item-text">Günlük: ${kisit.min_gunluk_ders}-${
      kisit.max_gunluk_ders
    } saat, Max boş pencere: ${kisit.max_bos_pencere}</div>
      </div>
    `;
  });

  if (kisitListesi === "") {
    kisitListesi = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <p>Henüz kısıt tanımlanmadı</p>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="onizleme-panel">
      <div class="onizleme-header">
        <h3>📊 Kısıt Önizlemesi</h3>
        <span class="kisit-badge">${toplamKisit} Aktif Kısıt</span>
      </div>

      <div class="onizleme-stats">
        <div class="stat-box">
          <div class="stat-value">${genelKisitSayisi}</div>
          <div class="stat-label">Genel Kısıt</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${ogretmenKisitSayisi}</div>
          <div class="stat-label">Öğretmen Kısıtı</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${toplamKisit}</div>
          <div class="stat-label">Toplam</div>
        </div>
      </div>

      <div class="onizleme-list">
        ${kisitListesi}
      </div>
    </div>
  `;

  console.log("✅ Önizleme paneli güncellendi");
}
// ==========================================
// 👨‍🏫 TERCİH MODAL FONKSİYONLARI (DÜZELTİLMİŞ)
// ==========================================

function onOgretmenTercihSelected() {
  const select = document.getElementById("selectOgretmenTercih");
  const ogretmenId = select?.value;

  console.log("👨‍🏫 Öğretmen seçildi:", ogretmenId);

  if (!ogretmenId) {
    currentTercihOgretmenId = null;
    clearTercihForm();
    return;
  }

  currentTercihOgretmenId = parseInt(ogretmenId);
  loadOgretmenTercihi(currentTercihOgretmenId);
}

function loadOgretmenTercihi(ogretmenId) {
  if (!window.PreferenceManager) {
    console.error("❌ PreferenceManager bulunamadı!");
    return;
  }

  const tercih = window.PreferenceManager.tercihGetir(ogretmenId);

  if (tercih) {
    const radios = document.querySelectorAll('input[name="bosGun"]');
    radios.forEach((radio) => {
      radio.checked = radio.value === String(tercih.bosGun || 0);
    });

    kapaliSaatler = tercih.kapaliSaatler || {};
    renderSaatGrid();

    console.log("✅ Tercih yüklendi:", tercih);
  } else {
    clearTercihForm();
  }

  attachSaatCellListeners();
}

function attachSaatCellListeners() {
  const cells = document.querySelectorAll("#saatGrid .saat-cell");

  cells.forEach((cell) => {
    cell.replaceWith(cell.cloneNode(true));
  });

  const newCells = document.querySelectorAll("#saatGrid .saat-cell");

  newCells.forEach((cell) => {
    cell.addEventListener("click", function () {
      const row = this.closest("tr");
      const gun = row.dataset.gun;
      const saat = this.dataset.saat;

      console.log(`🖱️ Tıklama: Gün ${gun}, Saat ${saat}`);
      toggleSaatCell(gun, saat);
    });
  });

  console.log(`✅ ${newCells.length} saat hücresine listener eklendi`);
}

function saveTercihler() {
  console.log("💾 Tercihler kaydediliyor...");

  if (!currentTercihOgretmenId) {
    Bildirim.goster("error", "Lütfen öğretmen seçin!");
    return;
  }

  if (!window.PreferenceManager) {
    Bildirim.goster("error", "Tercih sistemi yüklenemedi!");
    return;
  }

  try {
    const bosGunRadio = document.querySelector('input[name="bosGun"]:checked');
    const bosGun = bosGunRadio ? parseInt(bosGunRadio.value) : 0;

    if (bosGun > 0) {
      const cakisma = window.PreferenceManager.cakismaUyarisi(bosGun);
      if (cakisma.uyari) {
        if (
          !confirm(cakisma.mesaj + "\n\nYine de kaydetmek istiyor musunuz?")
        ) {
          return;
        }
      }
    }

    const basarili = window.PreferenceManager.tercihKaydet(
      currentTercihOgretmenId,
      {
        bosGun: bosGun > 0 ? bosGun : null,
        kapaliSaatler: kapaliSaatler,
      }
    );

    if (basarili) {
      Bildirim.goster("success", "Tercihler başarıyla kaydedildi!");
      if (typeof addLog === "function") {
        addLog(`✅ Öğretmen tercihleri kaydedildi`);
      }
      closeTercihModal();
    }
  } catch (error) {
    console.error("❌ Tercih kaydetme hatası:", error);
    Bildirim.goster("error", "Tercihler kaydedilemedi!");
  }
}

function deleteTercihler() {
  if (!currentTercihOgretmenId) {
    Bildirim.goster("error", "Lütfen öğretmen seçin!");
    return;
  }

  if (
    !confirm("Bu öğretmenin tercihlerini silmek istediğinize emin misiniz?")
  ) {
    return;
  }

  const basarili = window.PreferenceManager.tercihSil(currentTercihOgretmenId);

  if (basarili) {
    Bildirim.goster("success", "Tercihler silindi!");
    clearTercihForm();
  }
}

function renderSaatGrid() {
  const rows = document.querySelectorAll("#saatGrid tbody tr");

  rows.forEach((row) => {
    const gun = row.getAttribute("data-gun");
    const cells = row.querySelectorAll(".saat-cell");

    cells.forEach((cell) => {
      const saat = cell.getAttribute("data-saat");
      const kapaliMi =
        kapaliSaatler[gun] && kapaliSaatler[gun].includes(parseInt(saat));

      if (kapaliMi) {
        cell.classList.add("kapali");
        cell.innerHTML = "✖";
      } else {
        cell.classList.remove("kapali");
        cell.innerHTML = "";
      }
    });
  });
}

function toggleSaatCell(gun, saat) {
  if (!kapaliSaatler[gun]) {
    kapaliSaatler[gun] = [];
  }

  const saatInt = parseInt(saat);
  const index = kapaliSaatler[gun].indexOf(saatInt);

  if (index > -1) {
    kapaliSaatler[gun].splice(index, 1);
  } else {
    kapaliSaatler[gun].push(saatInt);
  }

  if (kapaliSaatler[gun].length === 0) {
    delete kapaliSaatler[gun];
  }

  renderSaatGrid();
}

function selectAllSaatler() {
  kapaliSaatler = {
    1: [1, 2, 3, 4, 5, 6, 7, 8],
    2: [1, 2, 3, 4, 5, 6, 7, 8],
    3: [1, 2, 3, 4, 5, 6, 7, 8],
    4: [1, 2, 3, 4, 5, 6, 7, 8],
    5: [1, 2, 3, 4, 5, 6, 7, 8],
  };
  renderSaatGrid();
}

function clearAllSaatler() {
  kapaliSaatler = {};
  renderSaatGrid();
}

function clearTercihForm() {
  kapaliSaatler = {};

  const radios = document.querySelectorAll('input[name="bosGun"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === "0";
  });

  renderSaatGrid();
  attachSaatCellListeners();
}

function openTercihModal() {
  const modal = document.getElementById("tercihModal");
  if (modal) {
    modal.style.display = "flex";
    loadOgretmenlerForTercih();
    clearTercihForm();
  }
}

function closeTercihModal() {
  const modal = document.getElementById("tercihModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentTercihOgretmenId = null;
}

// ✅ DÜZELTİLMİŞ: API'DEN DOĞRUDAN ÖĞRETMEN VERİSİ ÇEK
async function loadOgretmenlerForTercih() {
  try {
    console.log("📋 Tercih için öğretmenler yükleniyor...");

    // ✅ API'den öğretmenleri çek
    const result = await window.electronAPI.getAllTeachers();

    if (!result.success || !result.data) {
      console.error("❌ Öğretmenler yüklenemedi!");
      return;
    }

    const ogretmenler = result.data.filter((o) => o.durum === 1);
    const select = document.getElementById("selectOgretmenTercih");

    if (!select) {
      console.error("❌ selectOgretmenTercih elementi bulunamadı!");
      return;
    }

    console.log(`📋 ${ogretmenler.length} öğretmen alındı`);

    select.innerHTML = '<option value="">-- Öğretmen Seçin --</option>';

    if (ogretmenler.length === 0) {
      console.warn("⚠️ Öğretmen bulunamadı!");
      const option = document.createElement("option");
      option.disabled = true;
      option.textContent = "Önce öğretmen ekleyin";
      select.appendChild(option);
      return;
    }

    ogretmenler.forEach((ogr) => {
      const option = document.createElement("option");
      option.value = ogr.id;
      // ✅ ad_soyad kullan (veritabanı sütunu)
      option.textContent = `${ogr.ad_soyad || "İsimsiz"} (${
        ogr.brans || "Branş Yok"
      })`;
      select.appendChild(option);
      console.log(`  ✅ ${ogr.ad_soyad} - ${ogr.brans || "Branş Yok"}`);
    });

    console.log(`✅ ${ogretmenler.length} öğretmen tercih modalına yüklendi`);
    select.addEventListener("change", onOgretmenTercihSelected);
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
    Bildirim.goster("error", "Öğretmenler yüklenemedi!");
  }
}

// ============================================
// ZOOM FONKSİYONLARI
// ============================================

let currentZoom = 100;

function zoomIn() {
  const programViewTable = document.getElementById("programViewTable");
  if (!programViewTable || programViewTable.style.display === "none") {
    Bildirim.goster("warning", "Önce bir program görüntüleyin!");
    return;
  }

  if (currentZoom < 150) {
    currentZoom += 10;
    applyZoom();
    console.log("🔍 Zoom In:", currentZoom + "%");
  } else {
    Bildirim.goster("info", "Maksimum yakınlaştırma seviyesine ulaşıldı");
  }
}

function zoomOut() {
  const programViewTable = document.getElementById("programViewTable");
  if (!programViewTable || programViewTable.style.display === "none") {
    Bildirim.goster("warning", "Önce bir program görüntüleyin!");
    return;
  }

  if (currentZoom > 50) {
    currentZoom -= 10;
    applyZoom();
    console.log("🔍 Zoom Out:", currentZoom + "%");
  } else {
    Bildirim.goster("info", "Minimum uzaklaştırma seviyesine ulaşıldı");
  }
}

function applyZoom() {
  const programViewTable = document.getElementById("programViewTable");
  if (programViewTable) {
    programViewTable.style.transform = "scale(" + currentZoom / 100 + ")";
    programViewTable.style.transformOrigin = "top center";
    programViewTable.style.transition = "transform 0.3s ease";

    if (window.Bildirim) {
      Bildirim.goster("info", "Zoom: " + currentZoom + "%");
    }
  }
}

// ==========================================
// 📦 ATAMALARI YÜKLE - FİX: SİLİNME SORUNU
// ==========================================
async function atanalariYukle() {
  try {
    console.log("📦 ============================================");
    console.log("📦 ATAMALAR YÜKLENİYOR");
    console.log("📦 ============================================");

    if (!currentProgramId) {
      console.error("❌ currentProgramId tanımlı değil!");
      renderAtamaListesi([]);
      return;
    }

    console.log("📋 Program ID:", currentProgramId);

    // 🔥 VERİTABANINDAN ATAMALARI ÇEK
    const result = await window.electronAPI.dbQuery(
      `SELECT 
        sdo.*,
        d.ders_adi,
        o.ad_soyad as ogretmen_adi,
        s.sinif_adi
       FROM sinif_ders_ogretmen sdo
       LEFT JOIN dersler d ON sdo.ders_id = d.id
       LEFT JOIN ogretmenler o ON sdo.ogretmen_id = o.id
       LEFT JOIN siniflar s ON sdo.sinif_id = s.id
       WHERE sdo.program_id = ?
       ORDER BY s.sinif_adi, d.ders_adi`,
      [currentProgramId]
    );

    if (!result.success) {
      console.error("❌ Sorgu başarısız:", result.message);
      renderAtamaListesi([]);
      return;
    }

    console.log(`📊 Veritabanından ${result.data.length} kayıt bulundu`);

    // 🔥 EĞER 0 İSE LOCALSTORAGE'DAN YÜKLE (FALLBACK)
    if (result.data.length === 0) {
      console.warn(
        "⚠️ Veritabanında atama yok, localStorage kontrol ediliyor..."
      );

      const localStorageKey = `sinifDersAtamalari_${currentProgramId}`;
      const localData = JSON.parse(
        localStorage.getItem(localStorageKey) || "[]"
      );

      console.log(`📦 LocalStorage'da ${localData.length} kayıt bulundu`);

      if (localData.length > 0) {
        console.log("📤 LocalStorage verileri veritabanına aktarılıyor...");

        let transferCount = 0;

        for (const atama of localData) {
          try {
            await window.electronAPI.dbQuery(
              `INSERT INTO sinif_ders_ogretmen 
               (program_id, sinif_id, ders_id, ogretmen_id, haftalik_ders_saati) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                atama.program_id,
                atama.sinif_id,
                atama.ders_id,
                atama.ogretmen_id,
                atama.haftalik_ders_saati || 0,
              ]
            );
            transferCount++;
            console.log(`  ✅ ${transferCount}. Atama aktarıldı`);
          } catch (error) {
            console.error("  ❌ Aktarma hatası:", error);
          }
        }

        console.log(`✅ ${transferCount} atama veritabanına aktarıldı`);

        if (typeof Bildirim !== "undefined") {
          Bildirim.goster(
            "success",
            `${transferCount} atama veritabanına aktarıldı!`
          );
        }

        // Tekrar yükle
        await atanalariYukle();
        return;
      } else {
        console.log("📭 LocalStorage'da da atama yok");
        renderAtamaListesi([]);
        return;
      }
    }

    // 🔥 JavaScript'te grupla
    const sinifMap = new Map();

    result.data.forEach((atama) => {
      const sinifId = atama.sinif_id;

      if (!sinifMap.has(sinifId)) {
        sinifMap.set(sinifId, {
          sinif_id: sinifId,
          sinif_adi: atama.sinif_adi,
          dersler: new Set(),
          ogretmenler: new Set(),
          ders_saatleri: new Map(),
          atama_sayisi: 0,
        });
      }

      const sinif = sinifMap.get(sinifId);

      sinif.dersler.add(atama.ders_id);
      sinif.ogretmenler.add(atama.ogretmen_id);
      sinif.atama_sayisi++;

      if (!sinif.ders_saatleri.has(atama.ders_id)) {
        sinif.ders_saatleri.set(atama.ders_id, atama.haftalik_ders_saati || 0);
      }
    });

    const atamalar = Array.from(sinifMap.values()).map((sinif) => ({
      sinif_id: sinif.sinif_id,
      sinif_adi: sinif.sinif_adi,
      ders_sayisi: sinif.dersler.size,
      ogretmen_sayisi: sinif.ogretmenler.size,
      atama_sayisi: sinif.atama_sayisi,
      toplam_saat: Array.from(sinif.ders_saatleri.values()).reduce(
        (sum, s) => sum + s,
        0
      ),
    }));

    console.log(`✅ ${atamalar.length} sınıf ataması gruplandırıldı`);

    atamalar.forEach((atama) => {
      console.log(
        `📋 ${atama.sinif_adi}: ${atama.ders_sayisi} ders, ${atama.ogretmen_sayisi} öğretmen, ${atama.atama_sayisi} atama, ${atama.toplam_saat} saat`
      );
    });

    renderAtamaListesi(atamalar);

    console.log("📦 ============================================");
    console.log("✅ ATAMA YÜKLEME TAMAMLANDI");
    console.log("📦 ============================================");
  } catch (error) {
    console.error("❌ Atama yükleme hatası:", error);
    renderAtamaListesi([]);
  }
}
// ==========================================
// SINIF-DERS-ÖĞRETMEN ATAMA SİSTEMİ (v7 - LOCALSTORAGE + DB SYNC)
// ==========================================

let currentAtamaStep = 1;
let atamaData = {
  haftalikSaat: 0,
  secilenSinif: null,
  secilenSinifAd: "",
  atananDersler: [],
  ogretmenAtamalari: {},
};

let allSiniflarForAtama = [];
let allDerslerForAtama = [];
let allOgretmenlerForAtama = [];

// Modal aç
function openAtamaModal() {
  currentAtamaStep = 1;
  atamaData = {
    haftalikSaat: 0,
    secilenSinif: null,
    secilenSinifAd: "",
    atananDersler: [],
    ogretmenAtamalari: {},
  };

  const modal = document.getElementById("atamaModal");
  if (modal) {
    modal.style.display = "flex";
    updateAtamaStep();
  }
}

// Modal kapat
function closeAtamaModal() {
  const modal = document.getElementById("atamaModal");
  if (modal) modal.style.display = "none";
}

// Step güncelle
function updateAtamaStep() {
  document.querySelectorAll(".atama-step").forEach((step) => {
    const stepNum = parseInt(step.dataset.step);
    step.classList.toggle("active", stepNum === currentAtamaStep);
    step.classList.toggle("completed", stepNum < currentAtamaStep);
  });

  document.querySelectorAll(".atama-content").forEach((content) => {
    content.classList.toggle(
      "active",
      parseInt(content.dataset.step) === currentAtamaStep
    );
  });

  const btnGeri = document.getElementById("btnAtamaGeri");
  const btnIleri = document.getElementById("btnAtamaIleri");

  if (btnGeri)
    btnGeri.style.display = currentAtamaStep === 1 ? "none" : "inline-flex";

  if (btnIleri) {
    btnIleri.innerHTML =
      currentAtamaStep === 5
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <polyline points="20 6 9 17 4 12"/>
         </svg> Tamamla`
        : `İleri
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <line x1="5" y1="12" x2="19" y2="12"/>
           <polyline points="12 5 19 12 12 19"/>
         </svg>`;
  }

  if (currentAtamaStep === 2) updateIleriButonDurum();
}

// İleri git
async function atamaIleriGit() {
  if (currentAtamaStep === 1) {
    const saat = parseInt(document.getElementById("inputHaftalikSaat").value);
    if (!saat || saat < 1 || saat > 50) {
      Bildirim.goster("error", "Geçerli bir haftalık saat giriniz (1-50)!");
      return;
    }
    atamaData.haftalikSaat = saat;
    await loadSiniflarForAtama();
  }

  if (currentAtamaStep === 2) {
    if (!atamaData.secilenSinif) {
      Bildirim.goster("error", "Lütfen bir sınıf seçiniz!");
      return;
    }
    await loadDerslerForAtama();
  }

  if (currentAtamaStep === 3) {
    const toplam = atamaData.atananDersler.reduce((s, d) => s + d.saat, 0);
    if (toplam !== atamaData.haftalikSaat) {
      Bildirim.goster(
        "error",
        `Toplam ${atamaData.haftalikSaat} saat olmalı! (Şu an: ${toplam})`
      );
      return;
    }
    await loadOgretmenAtamaScreen();
  }

  if (currentAtamaStep === 4) {
    const eksik = atamaData.atananDersler.filter(
      (d) =>
        !atamaData.ogretmenAtamalari[d.dersId] ||
        atamaData.ogretmenAtamalari[d.dersId].length === 0
    );
    if (eksik.length > 0) {
      Bildirim.goster("error", `${eksik.length} dersin öğretmeni eksik!`);
      return;
    }
    loadAtamaOzetScreen();
  }

  if (currentAtamaStep === 5) {
    await saveAtamalar();
    return;
  }

  currentAtamaStep++;
  updateAtamaStep();
}

// Geri git
function atamaGeriGit() {
  if (currentAtamaStep > 1) {
    currentAtamaStep--;
    updateAtamaStep();
  }
}

// Sınıfları yükle
async function loadSiniflarForAtama() {
  try {
    const result = await window.electronAPI.getAllClasses();
    if (result.success) {
      allSiniflarForAtama = result.data.filter((s) => s.durum === 1);
      renderSinifCards();
      loadKopyalanacakSiniflar();
    }
  } catch (error) {
    Bildirim.goster("error", "Sınıflar yüklenemedi!");
  }
}

function renderSinifCards() {
  const container = document.getElementById("sinifCardGrid");
  container.innerHTML =
    allSiniflarForAtama.length === 0
      ? '<div class="empty-message">Sınıf yok</div>'
      : allSiniflarForAtama
          .map(
            (sinif) => `
      <div class="sinif-card-atama" data-sinif-id="${
        sinif.id
      }" onclick="selectSinifForAtama(${sinif.id}, '${sinif.sinif_adi}')">
        <div class="sinif-card-icon">${sinif.sinif_adi[0]}</div>
        <div class="sinif-card-name">${sinif.sinif_adi}</div>
        <div class="sinif-card-info">${
          sinif.sinif_duzey || sinif.seviye || "?"
        }. Düzey</div>
      </div>
    `
          )
          .join("");

  updateIleriButonDurum();
}

function selectSinifForAtama(sinifId, sinifAd) {
  atamaData.secilenSinif = sinifId;
  atamaData.secilenSinifAd = sinifAd;
  document
    .querySelectorAll(".sinif-card-atama")
    .forEach((c) =>
      c.classList.toggle("selected", parseInt(c.dataset.sinifId) === sinifId)
    );
  Bildirim.goster("success", `${sinifAd} seçildi`);
  updateIleriButonDurum();
}

function updateIleriButonDurum() {
  const btn = document.getElementById("btnAtamaIleri");
  if (currentAtamaStep === 2 && btn) {
    btn.disabled = !atamaData.secilenSinif;
  } else {
    btn.disabled = false;
  }
}

function loadKopyalanacakSiniflar() {
  const select = document.getElementById("selectKopyalaSinif");
  select.innerHTML =
    `<option value="">-- Kopyalanacak Sınıf --</option>` +
    allSiniflarForAtama
      .map((s) => `<option value="${s.id}">${s.sinif_adi}</option>`)
      .join("");
}

// Dersleri yükle
async function loadDerslerForAtama() {
  try {
    const result = await window.electronAPI.getAllDerslerWithBlocks();
    if (result.success) {
      allDerslerForAtama = result.data || [];
      renderDersListesi();
      updateSecilenSinifInfo();
    }
  } catch (error) {
    Bildirim.goster("error", "Dersler yüklenemedi!");
  }
}

function updateSecilenSinifInfo() {
  document.getElementById("secilenSinifAd").textContent =
    atamaData.secilenSinifAd || "-";
  document.getElementById("secilenHaftalikSaat").textContent =
    atamaData.haftalikSaat;
  document.getElementById("hedefToplamSaat").textContent =
    atamaData.haftalikSaat;
}

function renderDersListesi() {
  const container = document.getElementById("dersListesi");

  const secilenSinifSeviye = atamaData.secilenSinifAd
    ? parseInt(
        atamaData.secilenSinifAd.split("/")[0] ||
          atamaData.secilenSinifAd.split("-")[0]
      )
    : null;

  console.log(
    `📚 Dersler filtreleniyor - Sınıf seviyesi: ${secilenSinifSeviye}`
  );

  const baslik = document.getElementById("dersListesiBaslik");
  if (baslik && secilenSinifSeviye) {
    baslik.innerHTML = `📚 ${secilenSinifSeviye}. Sınıf Dersleri`;
  }

  const filtreliDersler = allDerslerForAtama.filter((ders) => {
    if (!secilenSinifSeviye) return true;

    const dersKodu = ders.ders_kodu || "";
    const dersSeviyeMatch = dersKodu.match(/^(\d+)/);
    const dersSeviye = dersSeviyeMatch ? parseInt(dersSeviyeMatch[1]) : null;

    return dersSeviye === secilenSinifSeviye;
  });

  console.log(
    `✅ ${filtreliDersler.length} ders filtrelendi (Toplam: ${allDerslerForAtama.length})`
  );

  if (filtreliDersler.length === 0) {
    container.innerHTML = `
      <div class="empty-message" style="padding: 40px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
        <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
          ${
            secilenSinifSeviye
              ? `${secilenSinifSeviye}. sınıf için ders bulunamadı!`
              : "Ders yok"
          }
        </p>
        <p style="color: #999; font-size: 14px;">
          Lütfen önce ders ekleyin veya ders kodlarını kontrol edin.
        </p>
        <p style="color: #f44336; font-size: 13px; margin-top: 12px; font-weight: 600;">
          ⚠️ Ders kodları "${secilenSinifSeviye}." ile başlamalı!
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML =
    `
    <div style="background: #e8f5e9; border: 2px solid #4caf50; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
      <strong style="color: #2e7d32;">✅ Filtreleme Aktif:</strong>
      <span style="color: #388e3c;">${filtreliDersler.length} ders listelendi (${secilenSinifSeviye}. sınıf dersleri)</span>
    </div>
  ` +
    filtreliDersler
      .map((ders) => {
        const blok = ders.ders_blogu
          ? `${ders.ders_blogu} | ${ders.haftalik_saat} saat`
          : `${ders.haftalik_saat} saat`;
        return `
      <div class="ders-card-atama modern-card" style="background:#ffffff; border:1px solid #e0e0e0; color:#1a1a1a;">
        <div class="ders-card-content">
          <div class="ders-card-header">
            <div class="ders-card-name" style="color:#1a1a1a; font-weight:700;">${
              ders.ders_adi
            }</div>
            <div class="ders-card-kod" style="color:#666; font-size:13px;">Kod: ${
              ders.ders_kodu || "Yok"
            }</div>
            <div class="ders-card-info" style="color:#444; font-size:13px;">${blok}</div>
          </div>
          <button class="btn-modern" onclick="dersiEkle(${ders.id}, '${
          ders.ders_adi
        }', '${ders.ders_kodu || ""}', '${ders.ders_blogu || ""}', ${
          ders.haftalik_saat
        })" style="background:#2196f3; color:white;">
            <span class="btn-icon">+</span> EKLE
          </button>
        </div>
      </div>
    `;
      })
      .join("");
}

function dersiEkle(dersId, dersAdi, dersKodu, blok, saat) {
  const toplam = atamaData.atananDersler.reduce((s, d) => s + d.saat, 0) + saat;
  if (toplam > atamaData.haftalikSaat) {
    Bildirim.goster(
      "error",
      `Saat aşıldı: ${toplam}/${atamaData.haftalikSaat}`
    );
    return;
  }
  if (atamaData.atananDersler.some((d) => d.dersId === dersId)) {
    Bildirim.goster("warning", `${dersAdi} zaten eklendi`);
    return;
  }
  atamaData.atananDersler.push({ dersId, dersAdi, dersKodu, blok, saat });
  renderAtananDersler();
  Bildirim.goster("success", `${dersAdi} eklendi`);
}

function renderAtananDersler() {
  const container = document.getElementById("atananDersList");
  const toplamSpan = document.getElementById("atananToplamSaat");
  const progress = document.getElementById("progressFill");
  const toplam = atamaData.atananDersler.reduce((s, d) => s + d.saat, 0);
  const yuzde =
    atamaData.haftalikSaat > 0 ? (toplam / atamaData.haftalikSaat) * 100 : 0;

  toplamSpan.textContent = toplam;
  progress.style.width = `${Math.min(yuzde, 100)}%`;

  container.innerHTML =
    atamaData.atananDersler.length === 0
      ? '<div class="empty-message">Ders eklenmedi</div>'
      : atamaData.atananDersler
          .map(
            (d, i) => `
        <div class="atanan-ders-item modern-list-item" style="background:#fff8f0; border:2px solid #ff8a65; color:#d84315;">
          <div class="atanan-ders-info">
            <div class="atanan-ders-name" style="color:#d84315; font-weight:700;">${
              d.dersAdi
            }</div>
            <div class="atanan-ders-detay" style="color:#e65100; font-size:13px;">Kod: ${
              d.dersKodu || "Yok"
            } | ${d.blok ? d.blok + " | " : ""}${d.saat} saat</div>
          </div>
          <button class="btn-remove" onclick="dersiCikar(${i})" title="Dersi çıkar" style="background:#f44336; color:white; border-radius:50%; width:32px; height:32px;">X</button>
        </div>
      `
          )
          .join("");
}

function dersiCikar(index) {
  const ders = atamaData.atananDersler[index];
  atamaData.atananDersler.splice(index, 1);
  renderAtananDersler();
  Bildirim.goster("info", `${ders.dersAdi} çıkarıldı`);
}

// Öğretmen ekranı
async function loadOgretmenAtamaScreen() {
  try {
    const result = await window.electronAPI.getAllTeachers();
    if (result.success) {
      allOgretmenlerForAtama = result.data.filter((o) => o.durum === 1);
      renderOgretmenAtamaList();
    }
  } catch (error) {
    Bildirim.goster("error", "Öğretmenler yüklenemedi!");
  }
}

function renderOgretmenAtamaList() {
  const container = document.getElementById("ogretmenAtamaList");
  if (!container) return;

  if (atamaData.atananDersler.length === 0) {
    container.innerHTML =
      '<div class="empty-message">Henüz ders eklenmedi</div>';
    return;
  }

  container.innerHTML = atamaData.atananDersler
    .map((ders) => {
      const atananlar = atamaData.ogretmenAtamalari[ders.dersId] || [];
      let chipHTML = "";

      if (atananlar.length === 0) {
        chipHTML =
          '<span class="chip-placeholder" style="color:#999; font-style:italic;">Henüz öğretmen atanmadı</span>';
      } else if (atananlar.length === 1) {
        const o = allOgretmenlerForAtama.find((x) => x.id === atananlar[0]);
        const ad = o?.ad_soyad || "Bilinmeyen";
        const brans = o?.brans ? ` (${o.brans})` : "";
        chipHTML = `<span class="ogretmen-chip single" style="background:#fff3e0; color:#ef6c00; border:2px solid #ff8a65; font-weight:600;">${ad}${brans}</span>`;
      } else {
        const first =
          allOgretmenlerForAtama
            .find((x) => x.id === atananlar[0])
            ?.ad_soyad.split(" ")[0] || "Öğr.";
        const last =
          allOgretmenlerForAtama
            .find((x) => x.id === atananlar[atananlar.length - 1])
            ?.ad_soyad.split(" ")[0] || "Öğr.";
        const count = atananlar.length;
        chipHTML = `
        <span class="ogretmen-chip multiple" style="background:#ffe0b2; color:#ef6c00; border:2px solid #ff8a65; font-weight:600;">
          <span class="chip-text">${first} ... +${count - 1} ${last}</span>
          <span class="chip-count-badge" style="background:#ef6c00; color:white; padding:2px 8px; border-radius:12px; font-size:11px;">${count}</span>
        </span>`;
      }

      return `
      <div class="ogretmen-atama-card modern-card" style="background:#ffffff; border:2px solid #ffccbc; border-radius:12px;">
        <div class="ogretmen-atama-header" style="color:#d84315; padding-bottom:8px; border-bottom:1px dashed #ffccbc;">
          <div class="ders-baslik">
            <h4 class="ders-adi" style="margin:0; font-weight:700;">${
              ders.dersAdi
            }</h4>
            <span class="ders-kodu" style="color:#e65100; font-size:13px;">${
              ders.dersKodu || "Kod yok"
            }</span>
          </div>
          <div class="ders-saat-badge" style="background:#ff8a65; color:white; padding:4px 10px; border-radius:20px; font-size:13px;">${
            ders.saat
          } saat</div>
        </div>
        <div class="ogretmen-atama-body" style="padding-top:12px;">
          <div class="ogretmen-chips-container" style="margin-bottom:12px; min-height:40px;">
            ${chipHTML}
          </div>
          <div class="ogretmen-ekle-wrapper">
            <select class="form-select ogretmen-select" onchange="ogretmenSec(${
              ders.dersId
            }, this.value); this.value=''" style="border:2px solid #ff8a65; background:#fff8f0; color:#d84315; font-weight:600;">
              <option value="">+ Öğretmen Ekle</option>
              ${allOgretmenlerForAtama
                .map(
                  (o) =>
                    `<option value="${o.id}">${o.ad_soyad} ${
                      o.brans ? "(" + o.brans + ")" : ""
                    }</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function ogretmenSec(dersId, ogretmenId) {
  if (!ogretmenId) return;
  const id = parseInt(ogretmenId);
  if (!atamaData.ogretmenAtamalari[dersId])
    atamaData.ogretmenAtamalari[dersId] = [];
  if (!atamaData.ogretmenAtamalari[dersId].includes(id)) {
    atamaData.ogretmenAtamalari[dersId].push(id);
    renderOgretmenAtamaList();
    const o = allOgretmenlerForAtama.find((x) => x.id === id);
    Bildirim.goster("success", `${o?.ad_soyad} atandı`);
  } else {
    Bildirim.goster("warning", "Bu öğretmen zaten atandı");
  }
}

function loadAtamaOzetScreen() {
  const container = document.getElementById("atamaOzet");
  let html = `
    <div class="ozet-section" style="background:#fff3e0; padding:20px; border-radius:16px; border:2px solid #ff8a65; margin-bottom:20px;">
      <h4 style="margin:0 0 16px 0; color:#d84315; font-weight:800;">Sınıf Bilgileri</h4>
      <div class="ozet-item" style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:16px;">
        <span style="color:#e65100;">Sınıf:</span>
        <span style="font-weight:700; color:#d84315;">${atamaData.secilenSinifAd}</span>
      </div>
      <div class="ozet-item" style="display:flex; justify-content:space-between; font-size:16px;">
        <span style="color:#e65100;">Haftalık Saat:</span>
        <span style="font-weight:700; color:#d84315;">${atamaData.haftalikSaat} saat</span>
      </div>
    </div>

    <div class="ozet-section" style="background:#ffffff; padding:20px; border-radius:16px; border:2px solid #ff8a65;">
      <h4 style="margin:0 0 20px 0; color:#d84315; font-weight:800;">Atanan Dersler ve Öğretmenler</h4>`;

  atamaData.atananDersler.forEach((d) => {
    const ogrIds = atamaData.ogretmenAtamalari[d.dersId] || [];
    const ogrAdlari =
      ogrIds.length === 0
        ? "Atanmadı"
        : ogrIds.length === 1
        ? allOgretmenlerForAtama.find((o) => o.id === ogrIds[0])?.ad_soyad ||
          "Bilinmeyen"
        : `${ogrIds.length} öğretmen`;

    html += `
      <div class="ozet-ders-item" style="background:#fff8f0; padding:14px; border-radius:12px; margin-bottom:14px; border:2px solid #ff8a65;">
        <div class="ozet-ders-name" style="font-weight:700; color:#d84315; margin-bottom:6px; font-size:16px;">${
          d.dersAdi
        }</div>
        <div class="ozet-ders-detay" style="font-size:14px; color:#e65100;">
          Kod: ${d.dersKodu || "Yok"} • ${
      d.saat
    } saat • Öğretmen: <strong>${ogrAdlari}</strong>
        </div>
      </div>`;
  });

  html += `</div>
    <div class="ozet-onay" style="text-align:center; margin-top:30px;">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ef6c00" stroke-width="3">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <h3 style="color:#ef6c00; margin:16px 0 10px 0; font-size:24px; font-weight:800;">Tüm bilgiler doğru mu?</h3>
      <p style="color:#e65100; font-size:16px;">Onayladığınızda atamalar kalıcı olarak kaydedilecektir.</p>
    </div>`;

  container.innerHTML = html;
}

// ==========================================
// ✅ VERİTABANI + LOCALSTORAGE KAYIT (SİLİNME SORUNU FİX)
// ==========================================

async function saveAtamalar() {
  if (!atamaData.secilenSinif || atamaData.atananDersler.length === 0) {
    Bildirim.goster("error", "Eksik bilgi var!");
    return;
  }
  const eksik = atamaData.atananDersler.filter(
    (d) => !atamaData.ogretmenAtamalari[d.dersId]?.length
  );
  if (eksik.length > 0) {
    Bildirim.goster("error", `${eksik.length} dersin öğretmeni eksik!`);
    return;
  }

  try {
    console.log("💾 ============================================");
    console.log("💾 VERİTABANINA + LOCALSTORAGE'A KAYDETME BAŞLADI");
    console.log("💾 ============================================");

    Bildirim.goster("info", "Kaydediliyor, lütfen bekleyin...");

    // 🔥 1. Program ID'yi al veya bul
    let programId = parseInt(localStorage.getItem("currentProgramId"));

    if (!programId || isNaN(programId)) {
      console.warn("⚠️ currentProgramId bulunamadı, son program alınıyor...");

      const result = await window.electronAPI.dbQuery(
        "SELECT id FROM ders_programlari ORDER BY olusturma_tarihi DESC LIMIT 1",
        []
      );

      if (result.success && result.data.length > 0) {
        programId = result.data[0].id;
        localStorage.setItem("currentProgramId", programId);
        console.log("✅ Program ID fallback ile bulundu:", programId);
      } else {
        console.error("❌ Program ID bulunamadı!");
        Bildirim.goster(
          "error",
          "Program ID bulunamadı! Lütfen önce program oluşturun."
        );
        return;
      }
    }

    console.log(`📋 Program ID: ${programId}`);
    console.log(`🏫 Sınıf ID: ${atamaData.secilenSinif}`);
    console.log(`📚 Toplam ${atamaData.atananDersler.length} ders`);

    // 🔥 2. Önce bu sınıfın eski atamalarını sil (VERİTABANI)
    console.log(
      `🗑️ ${atamaData.secilenSinif} numaralı sınıfın eski atamaları siliniyor (VERİTABANI)...`
    );

    try {
      await window.electronAPI.dbQuery(
        "DELETE FROM sinif_ders_ogretmen WHERE program_id = ? AND sinif_id = ?",
        [programId, atamaData.secilenSinif]
      );
      console.log("✅ Eski atamalar silindi (VERİTABANI)");
    } catch (error) {
      console.warn("⚠️ Eski atama silme hatası (devam ediliyor):", error);
    }

    // 🔥 3. Yeni atamaları kaydet (VERİTABANI)
    let savedCount = 0;
    let errorCount = 0;

    console.log("📤 Yeni atamalar kaydediliyor (VERİTABANI)...");

    for (const ders of atamaData.atananDersler) {
      const ogretmenler = atamaData.ogretmenAtamalari[ders.dersId] || [];

      // Her ders için her öğretmeni kaydet
      for (const ogretmenId of ogretmenler) {
        try {
          await window.electronAPI.dbQuery(
            `INSERT INTO sinif_ders_ogretmen 
             (program_id, sinif_id, ders_id, ogretmen_id, haftalik_ders_saati) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              programId,
              atamaData.secilenSinif,
              ders.dersId,
              ogretmenId,
              ders.saat,
            ]
          );

          savedCount++;
          console.log(`  ✅ ${savedCount}. Atama kaydedildi (VERİTABANI):`, {
            ders: ders.dersAdi,
            ogretmen: ogretmenId,
            saat: ders.saat,
          });
        } catch (error) {
          errorCount++;
          console.error(`  ❌ ${errorCount}. Atama kaydetme hatası:`, error);
        }
      }
    }

    console.log("💾 ============================================");
    console.log(
      `✅ VERİTABANI KAYIT TAMAMLANDI: ${savedCount} atama kaydedildi`
    );
    if (errorCount > 0) {
      console.warn(`⚠️ ${errorCount} atama kaydedilemedi`);
    }
    console.log("💾 ============================================");

    // 🔥 4. LocalStorage'a da kaydet (YEDEK + SİLİNME SORUNU FİX)
    console.log("💾 LocalStorage'a kaydediliyor (YEDEK)...");

    const localStorageKey = `sinifDersAtamalari_${programId}`;
    const mevcutAtamalar = JSON.parse(
      localStorage.getItem(localStorageKey) || "[]"
    );

    // Bu sınıfın eski atamalarını sil
    const filteredAtamalar = mevcutAtamalar.filter(
      (a) => a.sinif_id !== atamaData.secilenSinif
    );

    // Yeni atamaları ekle
    atamaData.atananDersler.forEach((ders) => {
      const ogretmenler = atamaData.ogretmenAtamalari[ders.dersId] || [];
      ogretmenler.forEach((ogretmenId) => {
        const ogretmen = allOgretmenlerForAtama.find(
          (o) => o.id === ogretmenId
        );
        filteredAtamalar.push({
          program_id: programId,
          sinif_id: atamaData.secilenSinif,
          ders_id: ders.dersId,
          ders_adi: ders.dersAdi,
          ogretmen_id: ogretmenId,
          ogretmen_adi: ogretmen?.ad_soyad || "Bilinmeyen",
          haftalik_ders_saati: ders.saat,
        });
      });
    });

    localStorage.setItem(localStorageKey, JSON.stringify(filteredAtamalar));
    console.log(
      `💾 LocalStorage'a kaydedildi - KEY: ${localStorageKey}, Toplam: ${filteredAtamalar.length}`
    );

    // 🔥 5. Program ID'yi tekrar localStorage'a kaydet (SİLİNME SORUNU FİX)
    localStorage.setItem("currentProgramId", programId);
    console.log("💾 Program ID tekrar localStorage'a kaydedildi:", programId);

    // 🔥 6. Sonuç bildirimi
    if (savedCount > 0) {
      Bildirim.goster(
        "success",
        `${savedCount} atama veritabanına ve LocalStorage'a kaydedildi!`
      );

      // 🔥 7. Modal kapat ve sayfayı güncelle
      setTimeout(() => {
        closeAtamaModal();

        // Atamaları yeniden yükle
        if (typeof atanalariYukle === "function") {
          atanalariYukle();
        }

        // İstatistikleri güncelle
        if (typeof updateStats === "function") {
          updateStats();
        }

        // Canlı dağıtım başlat
        if (
          window.canliDagitimMain &&
          typeof window.canliDagitimMain.baslat === "function"
        ) {
          console.log("Canlı Dağıtım başlatılıyor...");
          window.canliDagitimMain.baslat();
        }

        console.log("✅ KAYIT SÜRECİ TAMAMLANDI");
      }, 800);
    } else {
      Bildirim.goster("error", "Hiçbir atama kaydedilemedi!");
    }
  } catch (error) {
    console.error("❌ Kaydetme hatası:", error);
    Bildirim.goster("error", "Bağlantı hatası: " + error.message);
  }
}

// ==========================================
// ATAMA GÖRÜNTÜLEME, DÜZENLEME, SİLME
// ==========================================

async function sinifAtamasiniGoruntule(sinifId) {
  try {
    console.log("👁️ Sınıf ataması görüntüleniyor:", sinifId);

    const programId = parseInt(localStorage.getItem("currentProgramId"));

    const result = await window.electronAPI.dbQuery(
      `SELECT 
        sdo.id,
        sdo.ders_id,
        sdo.ogretmen_id,
        sdo.haftalik_ders_saati,
        d.ders_adi,
        d.ders_kodu,
        d.ders_rengi,
        o.ad_soyad as ogretmen_adi,
        o.kisa_ad as ogretmen_kodu,
        s.sinif_adi
       FROM sinif_ders_ogretmen sdo
       LEFT JOIN dersler d ON sdo.ders_id = d.id
       LEFT JOIN ogretmenler o ON sdo.ogretmen_id = o.id
       LEFT JOIN siniflar s ON sdo.sinif_id = s.id
       WHERE sdo.sinif_id = ? AND sdo.program_id = ?
       ORDER BY d.ders_adi`,
      [sinifId, programId]
    );

    if (!result.success || !result.data) {
      Bildirim.goster("error", "Atamalar getirilemedi!");
      return;
    }

    const atamalar = result.data;
    const sinif = allSiniflar.find((s) => s.id === sinifId);
    const sinifAdi = sinif?.sinif_adi || `Sınıf ${sinifId}`;

    // Gruplama: Ders bazında grupla
    const dersMap = new Map();

    atamalar.forEach((atama) => {
      const dersId = atama.ders_id;

      if (!dersMap.has(dersId)) {
        dersMap.set(dersId, {
          ders_id: dersId,
          ders_adi: atama.ders_adi,
          ders_kodu: atama.ders_kodu,
          ders_rengi: atama.ders_rengi,
          ogretmenler: new Set(),
          ogretmen_adlar: [],
          toplam_saat: 0,
        });
      }

      const ders = dersMap.get(dersId);

      if (!ders.ogretmenler.has(atama.ogretmen_id)) {
        ders.ogretmenler.add(atama.ogretmen_id);
        ders.ogretmen_adlar.push({
          id: atama.ogretmen_id,
          ad: atama.ogretmen_adi,
          kod: atama.ogretmen_kodu,
        });
      }

      if (ders.toplam_saat === 0) {
        ders.toplam_saat = atama.haftalik_ders_saati || 0;
      }
    });

    const dersler = Array.from(dersMap.values());

    const toplamDers = dersler.length;
    const toplamOgretmen = new Set(
      dersler.flatMap((d) => Array.from(d.ogretmenler))
    ).size;
    const toplamAtama = atamalar.length;
    const toplamSaat = dersler.reduce((sum, d) => sum + d.toplam_saat, 0);

    // Modal içeriği
    const modalContent = `
      <div class="atama-detay-modal">
        <div class="atama-detay-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 700;">${sinifAdi} - Ders Atamaları</h2>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
            ${toplamDers} ders • ${toplamOgretmen} öğretmen • ${toplamAtama} atama • ${toplamSaat} saat
          </p>
        </div>

        <div class="atama-detay-body" style="padding: 20px; max-height: 500px; overflow-y: auto; background: #f8f9fa;">
          ${dersler
            .map((ders) => {
              const ogretmenListesi = ders.ogretmen_adlar
                .map((og) => `<strong>${og.ad}</strong> (${og.kod})`)
                .join(", ");

              const ogretmenSayisi = ders.ogretmenler.size;

              return `
                <div class="ders-card" style="background: white; border-left: 4px solid ${
                  ders.ders_rengi || "#999"
                }; padding: 16px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 700; font-size: 16px; color: #1a1a1a; margin-bottom: 4px;">
                        ${ders.ders_adi}
                      </div>
                      <div style="font-size: 13px; color: #666; font-family: 'Courier New', monospace;">
                        ${ders.ders_kodu}
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="background: ${
                        ders.ders_rengi || "#999"
                      }; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; display: inline-block;">
                        ${ders.toplam_saat} saat
                      </div>
                    </div>
                  </div>

                  <div style="padding-top: 12px; border-top: 1px dashed #e0e0e0;">
                    <div style="color: #555; font-size: 14px; margin-bottom: 6px;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <span style="font-weight: 600;">${ogretmenSayisi} öğretmen</span>
                    </div>
                    <div style="color: #333; font-size: 14px; line-height: 1.6; padding-left: 28px;">
                      ${ogretmenListesi}
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>

        <div class="atama-detay-footer" style="padding: 16px 20px; background: #f0f0f0; border-radius: 0 0 12px 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #666; font-size: 14px;">
            📊 <strong>Toplam Haftalık Saat:</strong> ${toplamSaat} saat
          </div>
          <button onclick="document.getElementById('atama-detay-modal').style.display='none'" 
                  style="background: #667eea; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                  onmouseover="this.style.background='#5568d3'"
                  onmouseout="this.style.background='#667eea'">
            Kapat
          </button>
        </div>
      </div>
    `;

    // Modal oluştur
    let modal = document.getElementById("atama-detay-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "atama-detay-modal";
      modal.style.cssText = `
        display: none;
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
      `;
      modal.innerHTML = `
        <div style="position: relative; margin: 5% auto; max-width: 900px; animation: slideDown 0.3s ease-out;">
          <div id="atama-detay-content"></div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      });
    }

    document.getElementById("atama-detay-content").innerHTML = modalContent;
    modal.style.display = "block";
  } catch (error) {
    console.error("❌ Görüntüleme hatası:", error);
    Bildirim.goster("error", "Atama görüntülenemedi!");
  }
}

async function sinifAtamasiniDuzenle(sinifId) {
  // Düzenleme fonksiyonu (mevcut kodda var)
  console.log("✏️ Sınıf ataması düzenleniyor:", sinifId);
  Bildirim.goster("info", "Düzenleme özelliği yakında aktif olacak!");
}

async function sinifAtamasiniSil(sinifId) {
  if (
    !confirm(
      "Bu sınıfın tüm ders-öğretmen atamalarını silmek istediğinize emin misiniz?"
    )
  ) {
    return;
  }

  try {
    console.log("🗑️ Sınıf ataması siliniyor:", sinifId);

    const programId = parseInt(localStorage.getItem("currentProgramId"));

    // VERİTABANINDAN SİL
    await window.electronAPI.dbQuery(
      "DELETE FROM sinif_ders_ogretmen WHERE program_id = ? AND sinif_id = ?",
      [programId, sinifId]
    );

    // LOCALSTORAGE'DAN SİL
    const localKey = `sinifDersAtamalari_${programId}`;
    const mevcutAtamalar = JSON.parse(localStorage.getItem(localKey) || "[]");
    const filteredAtamalar = mevcutAtamalar.filter(
      (a) => a.sinif_id !== sinifId
    );
    localStorage.setItem(localKey, JSON.stringify(filteredAtamalar));

    Bildirim.goster("success", "Atamalar başarıyla silindi!");

    // Listeyi yenile
    await atanalariYukle();
  } catch (error) {
    console.error("❌ Silme hatası:", error);
    Bildirim.goster("error", "Atamalar silinemedi!");
  }
}

async function tumAtamalariSil() {
  if (
    !confirm(
      "⚠️ TÜM ATAMALARI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!"
    )
  ) {
    return;
  }

  if (
    !confirm("⚠️ SON UYARI!\n\nTüm sınıfların tüm ders atamaları silinecek!")
  ) {
    return;
  }

  try {
    console.log("🗑️ Tüm atamalar siliniyor...");

    const programId = parseInt(localStorage.getItem("currentProgramId"));

    if (!programId) {
      Bildirim.goster("error", "Program ID bulunamadı!");
      return;
    }

    // VERİTABANINDAN SİL
    await window.electronAPI.dbQuery(
      "DELETE FROM sinif_ders_ogretmen WHERE program_id = ?",
      [programId]
    );

    // LOCALSTORAGE'DAN SİL
    const localKey = `sinifDersAtamalari_${programId}`;
    localStorage.removeItem(localKey);

    // Listeyi yenile
    await atanalariYukle();

    Bildirim.goster("success", "Tüm atamalar başarıyla silindi!");
  } catch (error) {
    console.error("❌ Silme hatası:", error);
    Bildirim.goster("error", "Atamalar silinemedi: " + error.message);
  }
}
// ==========================================
// ATAMA LİSTESİ RENDER (SİMETRİK BUTONLAR)
// ==========================================
function renderAtamaListesi(atamalar) {
  console.log("🎨 renderAtamaListesi çağrıldı, atama sayısı:", atamalar.length);

  const modal = document.getElementById("atamaModal");
  if (modal) modal.style.display = "none";

  const container = document.getElementById("atamaListesiContainer");
  if (!container) {
    console.warn("⚠️ atamaListesiContainer bulunamadı!");
    return;
  }

  if (atamalar.length === 0) {
    console.log("📭 Hiç atama yok");
    container.innerHTML =
      '<div class="empty-message">Henüz atama yapılmadı</div>';
    return;
  }

  console.log("✅ Atamalar render ediliyor (akordiyonlu)...");

  // Her sınıf için akordiyonlu kart
  container.innerHTML = atamalar
    .map((atama, index) => {
      const isOpen = index < 3; // İLK 3 AÇIK
      return `
        <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08); margin-bottom: 10px;">
          
          <!-- Sınıf Başlık (Tıklanabilir) -->
          <div onclick="toggleAtamaAccordion(${index})" 
               style="padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: white; transition: all 0.2s;"
               onmouseover="this.style.background='#f8f9ff'"
               onmouseout="this.style.background='white'">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <svg id="icon-${index}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5" style="transition: transform 0.3s; transform: rotate(${
        isOpen ? "90deg" : "0deg"
      });">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <div style="font-weight: 700; color: #1a1a1a; font-size: 14px;">${
                  atama.sinif_adi
                }</div>
              </div>
              <div style="color: #666; font-size: 11px; margin-left: 22px;">
                ${atama.ders_sayisi} ders • ${
        atama.ogretmen_sayisi
      } öğretmen • ${atama.toplam_saat} saat
              </div>
            </div>
          </div>

          <!-- İçerik (Butonlar - SİMETRİK) -->
          <div id="content-${index}" style="display: ${
        isOpen ? "block" : "none"
      }; padding: 12px; background: #f8f9ff; border-top: 1px solid #e3e8ff;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              
              <!-- ÜST SATIR: DETAY + DÜZENLE (AYNI GENİŞLİK) -->
              <button onclick="event.stopPropagation(); sinifAtamasiniGoruntule(${
                atama.sinif_id
              })" title="Detay Görüntüle" 
                      style="background: #9c27b0; border: none; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; color: white; font-size: 12px; font-weight: 600;"
                      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(156,39,176,0.3)'"
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Detay
              </button>

              <button onclick="event.stopPropagation(); duzenleAtamaModal(${
                atama.sinif_id
              })" title="Atamayı Düzenle" 
                      style="background: #2196f3; border: none; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; color: white; font-size: 12px; font-weight: 600;"
                      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(33,150,243,0.3)'"
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Düzenle
              </button>

              <!-- ALT SATIR: GÖR + SİL (AYNI GENİŞLİK) -->
              <button onclick="event.stopPropagation(); goruntuleProgramTablosu(${
                atama.sinif_id
              })" title="Program Görüntüle" 
                      style="background: #4caf50; border: none; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; color: white; font-size: 12px; font-weight: 600;"
                      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(76,175,80,0.3)'"
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Gör
              </button>

              <button onclick="event.stopPropagation(); sinifAtamasiniSil(${
                atama.sinif_id
              })" title="Atamayı Sil" 
                      style="background: #f44336; border: none; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; color: white; font-size: 12px; font-weight: 600;"
                      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(244,67,54,0.3)'"
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                </svg>
                Sil
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  console.log("✅ Render tamamlandı (ilk 3 açık)");
}

// ==========================================
// GÖR BUTONU FONKSİYONU (PROGRAM TABLOSU GÖSTER)
// ==========================================
function goruntuleProgramTablosu(sinifId) {
  console.log("👁️ Program tablosu görüntüleniyor, Sınıf ID:", sinifId);

  // Sınıf seçici açık mı kontrol et
  const viewerSelector = document.getElementById("viewerSelector");
  const selectViewSinif = document.getElementById("selectViewSinif");
  const btnGoruntule = document.getElementById("btnGoruntule");

  if (!viewerSelector || !selectViewSinif || !btnGoruntule) {
    if (typeof ModernBildirim !== "undefined") {
      ModernBildirim.warning(
        "Uyarı",
        "Program tablosu görüntüleyici bulunamadı!"
      );
    } else {
      alert("Program tablosu görüntüleyici bulunamadı!");
    }
    return;
  }

  // Sınıf seçiciyi göster
  viewerSelector.style.display = "block";

  // Sınıf radiosunu seç
  const radioViewSinif = document.getElementById("radioViewSinif");
  if (radioViewSinif) {
    radioViewSinif.checked = true;
  }

  // Sınıfı seç
  selectViewSinif.value = sinifId;

  // Görüntüle butonuna tıkla
  setTimeout(() => {
    btnGoruntule.click();
  }, 100);

  if (typeof ModernBildirim !== "undefined") {
    ModernBildirim.info("Görüntüleme", "Program tablosu yükleniyor...");
  }
}

// ==========================================
// AKORDİYON AÇ/KAPA
// ==========================================
function toggleAtamaAccordion(index) {
  const content = document.getElementById(`content-${index}`);
  const icon = document.getElementById(`icon-${index}`);

  if (!content || !icon) return;

  const isOpen = content.style.display === "block";

  if (isOpen) {
    content.style.display = "none";
    icon.style.transform = "rotate(0deg)";
  } else {
    content.style.display = "block";
    icon.style.transform = "rotate(90deg)";
  }
}

// ==========================================
// DÜZENLE BUTONU FONKSİYONU (ÇALIŞIR)
// ==========================================
async function duzenleAtamaModal(sinifId) {
  console.log("🔧 Düzenleme başlatılıyor, Sınıf ID:", sinifId);

  try {
    const programId = parseInt(localStorage.getItem("currentProgramId"));
    if (!programId) {
      if (typeof ModernBildirim !== "undefined") {
        ModernBildirim.error("Hata", "Program ID bulunamadı!");
      } else {
        alert("Program ID bulunamadı!");
      }
      return;
    }

    // LocalStorage'dan atamaları al
    const localKey = `sinifDersAtamalari_${programId}`;
    const tumAtamalar = JSON.parse(localStorage.getItem(localKey) || "[]");
    const sinifAtamalari = tumAtamalar.filter((a) => a.sinif_id === sinifId);

    if (sinifAtamalari.length === 0) {
      if (typeof ModernBildirim !== "undefined") {
        ModernBildirim.warning("Uyarı", "Bu sınıfa ait atama bulunamadı!");
      } else {
        alert("Bu sınıfa ait atama bulunamadı!");
      }
      return;
    }

    console.log("📋 Sınıf atamaları yüklendi:", sinifAtamalari);

    // Modal aç
    const modal = document.getElementById("atamaModal");
    if (modal) modal.style.display = "flex";

    // State hazırla
    if (!window.atamaModalState) window.atamaModalState = {};
    window.atamaModalState.selectedSinifId = sinifId;

    const toplamSaat = sinifAtamalari.reduce(
      (sum, a) => sum + (a.haftalik_ders_saati || 0),
      0
    );
    window.atamaModalState.haftalikSaat = toplamSaat;

    window.atamaModalState.atananDersler = sinifAtamalari.map((atama) => ({
      dersId: atama.ders_id,
      dersAd: atama.ders_adi,
      haftalikSaat: atama.haftalik_ders_saati,
      ogretmenId: atama.ogretmen_id,
      ogretmenAd: atama.ogretmen_adi,
    }));

    console.log("📚 State hazırlandı:", window.atamaModalState);

    // STEP 3'e git
    if (
      typeof currentAtamaStep !== "undefined" &&
      typeof updateAtamaStepUI === "function"
    ) {
      currentAtamaStep = 3;
      updateAtamaStepUI();
    }

    if (typeof ModernBildirim !== "undefined") {
      ModernBildirim.info(
        "Düzenleme Modu",
        "Atamalar düzenleme modunda açıldı"
      );
    }
  } catch (error) {
    console.error("❌ Düzenleme hatası:", error);
    if (typeof ModernBildirim !== "undefined") {
      ModernBildirim.error("Hata", "Düzenleme başlatılamadı: " + error.message);
    } else {
      alert("Düzenleme başlatılamadı: " + error.message);
    }
  }
}

// ==========================================
// ANA AKORDİYON KONTROLÜ (YAPILAN ATAMALAR BAŞLIĞI)
// ==========================================
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const accordionHeader = document.getElementById("atamaListesiAccordion");
    const accordionContent = document.getElementById("atamaListesiContent");
    const accordionIcon = accordionHeader?.querySelector(".accordion-icon");

    if (accordionHeader && accordionContent) {
      accordionHeader.addEventListener("click", function () {
        const isActive = accordionContent.classList.contains("active");

        if (isActive) {
          accordionContent.classList.remove("active");
          accordionHeader.classList.remove("active");
          if (accordionIcon) accordionIcon.style.transform = "rotate(0deg)";
        } else {
          accordionContent.classList.add("active");
          accordionHeader.classList.add("active");
          if (accordionIcon) accordionIcon.style.transform = "rotate(90deg)";
        }
      });

      // Başlangıçta KAPALI
      accordionContent.classList.remove("active");
      accordionHeader.classList.remove("active");
      if (accordionIcon) accordionIcon.style.transform = "rotate(0deg)";
    }

    console.log("✅ Atama listesi akordiyonu hazır");
  });
})();

// ==========================================
// EVENT LISTENERS - FİNAL
// ==========================================

function initEventListeners() {
  // ESKİ Akıllı Asistan (Tablo Oluşturan)
  if (btnAkilliAsistan) {
    btnAkilliAsistan.addEventListener("click", openAsistan);
  }

  // YENİ Akıllı Asistan butonu
  const btnYeniAkilliAsistan = document.getElementById("btnYeniAkilliAsistan");
  if (btnYeniAkilliAsistan) {
    btnYeniAkilliAsistan.addEventListener("click", async function () {
      console.log("New Smart Assistant opening");
      if (window.akilliAsistanKontrol) {
        await window.akilliAsistanKontrol.ac();
      } else {
        alert("Akıllı Asistan sistemi yüklenmedi!");
      }
    });
  }

  // OTOMATİK DAĞIT BUTONU
  if (btnOtomatikDagit) {
    btnOtomatikDagit.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      console.log("🤖 Otomatik Dağıt butonuna tıklandı");

      const programId = localStorage.getItem("currentProgramId");

      if (!programId) {
        if (typeof ModernBildirim !== "undefined") {
          ModernBildirim.warning(
            "Dikkat!",
            'Önce "Tablo Oluştur" ile program oluşturmalısınız!'
          );
        } else {
          alert('Önce "Tablo Oluştur" ile program oluşturmalısınız!');
        }
        return;
      }

      console.log("📤 Otomatik dağıtım sayfası açılıyor...");

      if (typeof ModernBildirim !== "undefined") {
        ModernBildirim.info(
          "Yönlendiriliyor",
          "Otomatik dağıtım sayfası açılıyor..."
        );
      }

      setTimeout(function () {
        const yeniPencere = window.open(
          "otomatik-dagitim.html",
          "_blank",
          "width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes"
        );

        if (!yeniPencere) {
          if (typeof ModernBildirim !== "undefined") {
            ModernBildirim.error(
              "Hata",
              "Pop-up engelleyici aktif! Lütfen tarayıcı ayarlarından pop-up'lara izin verin."
            );
          } else {
            alert(
              "Pop-up engelleyici aktif! Lütfen tarayıcı ayarlarından pop-up'lara izin verin."
            );
          }
        } else {
          console.log("✅ Otomatik dağıtım sayfası açıldı");
        }
      }, 500);
    });

    console.log("✅ Otomatik Dağıt butonu event listener bağlandı");
  }

  // KISIT MODAL BUTONLARI
  const btnKisitAc = document.getElementById("btnKisitAc");
  const btnKisitKapat = document.getElementById("btnKisitKapat");
  const btnKisitIptal = document.getElementById("btnKisitIptal");
  const btnKisitKaydet = document.getElementById("btnKisitKaydet");
  const btnKisitVarsayilan = document.getElementById("btnKisitVarsayilan");
  const btnKisitEkle = document.getElementById("btnKisitEkle");
  const btnKisitTemizle = document.getElementById("btnKisitTemizle");

  if (btnKisitAc) btnKisitAc.addEventListener("click", openKisitModal);
  if (btnKisitKapat) btnKisitKapat.addEventListener("click", closeKisitModal);
  if (btnKisitIptal) btnKisitIptal.addEventListener("click", closeKisitModal);
  if (btnKisitKaydet) btnKisitKaydet.addEventListener("click", saveKisitlar);
  if (btnKisitVarsayilan)
    btnKisitVarsayilan.addEventListener("click", resetToDefaultKisitlar);
  if (btnKisitEkle) btnKisitEkle.addEventListener("click", addOgretmenKisit);
  if (btnKisitTemizle)
    btnKisitTemizle.addEventListener("click", clearOgretmenSelection);

  // TERCİH MODAL BUTONLARI
  const btnTercihAc = document.getElementById("btnTercihAc");
  const btnTercihKapat = document.getElementById("btnTercihKapat");
  const btnTercihIptal = document.getElementById("btnTercihIptal");
  const btnTercihKaydet = document.getElementById("btnTercihKaydet");
  const btnTercihSil = document.getElementById("btnTercihSil");

  if (btnTercihAc) btnTercihAc.addEventListener("click", openTercihModal);
  if (btnTercihKapat)
    btnTercihKapat.addEventListener("click", closeTercihModal);
  if (btnTercihIptal)
    btnTercihIptal.addEventListener("click", closeTercihModal);
  if (btnTercihKaydet) btnTercihKaydet.addEventListener("click", saveTercihler);
  if (btnTercihSil) btnTercihSil.addEventListener("click", deleteTercihler);

  console.log("✅ Tüm event listener'lar başlatıldı");
}

// ==========================================
// SCHEDULE ALGORITHM INIT
// ==========================================

(function initScheduleAlgorithm() {
  console.log("🔧 ScheduleAlgorithmV3 initialize ediliyor...");

  if (!window.ScheduleDataManager) {
    console.error("❌ ScheduleDataManager bulunamadı!");
    return;
  }

  if (typeof window.ScheduleAlgorithmV3 !== "function") {
    console.error("❌ ScheduleAlgorithmV3 class bulunamadı!");
    return;
  }

  try {
    console.log("✅ ScheduleDataManager bulundu");
    const algorithmInstance = new window.ScheduleAlgorithmV3(
      window.ScheduleDataManager
    );

    console.log("✅ ScheduleAlgorithmV3 instance oluşturuldu");

    const OriginalClass = window.ScheduleAlgorithmV3;

    window.ScheduleAlgorithmV3 = {
      solve: algorithmInstance.solve.bind(algorithmInstance),
      initialize: algorithmInstance.initialize?.bind(algorithmInstance),
      reset: algorithmInstance.reset?.bind(algorithmInstance),
      _instance: algorithmInstance,
      _class: OriginalClass,
      createNew: (dataManager) => new OriginalClass(dataManager),
    };

    console.log("✅ ScheduleAlgorithmV3 başarıyla initialize edildi");
  } catch (error) {
    console.error("❌ ScheduleAlgorithmV3 initialize hatası:", error);
  }
})();

console.log("🔍 === ScheduleAlgorithmV3 Final Check ===");
console.log("ScheduleDataManager:", !!window.ScheduleDataManager);
console.log("ScheduleAlgorithmV3:", typeof window.ScheduleAlgorithmV3);
console.log(
  "ScheduleAlgorithmV3.solve:",
  typeof window.ScheduleAlgorithmV3?.solve
);

// ==========================================
// GLOBAL FUNKSIYON ATAMALARI
// ==========================================

window.openKisitModal = openKisitModal;
window.closeKisitModal = closeKisitModal;
window.openTercihModal = openTercihModal;
window.closeTercihModal = closeTercihModal;
window.deleteOgretmenKisitItem = deleteOgretmenKisitItem;
window.setProgramId = setProgramId;
window.onProgramCreated = onProgramCreated;
window.openYeniAkilliAsistan = openYeniAkilliAsistan;
window.closeYeniAkilliAsistan = closeYeniAkilliAsistan;
window.analizYap = analizYap;
window.openDersDegisTirModal = openDersDegisTirModal;
window.undoAction = undoAction;
window.redoAction = redoAction;
window.updateUndoRedoButtons = updateUndoRedoButtons;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.exportAnalysisReport = exportAnalysisReport;
window.openAtamaModal = openAtamaModal;
window.closeAtamaModal = closeAtamaModal;
window.atamaIleriGit = atamaIleriGit;
window.atamaGeriGit = atamaGeriGit;
window.selectSinifForAtama = selectSinifForAtama;
window.dersiEkle = dersiEkle;
window.dersiCikar = dersiCikar;
window.ogretmenSec = ogretmenSec;
window.sinifAtamasiniGoruntule = sinifAtamasiniGoruntule;
window.sinifAtamasiniDuzenle = sinifAtamasiniDuzenle;
window.sinifAtamasiniSil = sinifAtamasiniSil;
window.tumAtamalariSil = tumAtamalariSil;
window.toggleAtamaAccordion = toggleAtamaAccordion;

console.log("✅✅✅ PROGRAM-OLUSTUR.JS TAM YÜKLEME TAMAMLANDI ✅✅✅");
console.log("📊 Tüm fonksiyonlar hazır ve çalışır durumda!");
console.log("🎯 ESKİ Akıllı Asistan: Tablo oluşturma");
console.log("🤖 YENİ Akıllı Asistan: Analiz ve optimizasyon");
console.log("🚀 ScheduleAlgorithmV3: Instance oluşturuldu ve hazır");
console.log("💾 ATAMA SİLİNME SORUNU FİX EDİLDİ: DB + LocalStorage Sync");
