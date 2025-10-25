// ==========================================
// OKUL YÖNETİM SİSTEMİ - ANASAYFA
// ==========================================

const { ipcRenderer } = require("electron");

// Kullanıcı bilgileri
let currentUser = null;
let userType = null;
let schoolInfo = null;

// DOM Elemanları
const pageTitle = document.getElementById("pageTitle");
const breadcrumb = document.getElementById("breadcrumb");
const moduleGrid = document.getElementById("moduleGrid");
const sidebarMenu = document.getElementById("sidebarMenu");
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userInitials = document.getElementById("userInitials");
const okulAdi = document.getElementById("okulAdi");
const licenseBadge = document.getElementById("licenseBadge");
const licenseText = document.getElementById("licenseText");
const notificationBtn = document.getElementById("notificationBtn");
const notificationPanel = document.getElementById("notificationPanel");
const notificationCount = document.getElementById("notificationCount");
const closeNotifications = document.getElementById("closeNotifications");
const userMenu = document.getElementById("userMenu");
const userDropdown = document.getElementById("userDropdown");
const logoutBtn = document.getElementById("logoutBtn");
const logoutDropdownBtn = document.getElementById("logoutDropdownBtn");

// ==========================================
// MODÜL TANIMLARI
// ==========================================

const MODULES = {
  super_admin: {
    sidebar: [
      { id: "okullar", title: "Okul Yönetimi", icon: "🏫", color: "#00D9FF" },
      {
        id: "lisanslar",
        title: "Lisans Yönetimi",
        icon: "🔑",
        color: "#7B2FFF",
      },
      {
        id: "kullanicilar",
        title: "Sistem Kullanıcıları",
        icon: "👥",
        color: "#FF6B9D",
      },
      {
        id: "genel-raporlar",
        title: "Genel Raporlar",
        icon: "📊",
        color: "#00F5A0",
      },
      { id: "yedekleme", title: "Yedekleme", icon: "💾", color: "#FFD93D" },
      { id: "loglar", title: "Sistem Logları", icon: "📝", color: "#FF6B6B" },
      { id: "guvenlik", title: "Güvenlik", icon: "🔒", color: "#00D9FF" },
      {
        id: "istatistikler",
        title: "İstatistikler",
        icon: "📈",
        color: "#7B2FFF",
      },
      { id: "ayarlar", title: "Sistem Ayarları", icon: "⚙️", color: "#FF6B9D" },
      {
        id: "bildirimler",
        title: "Bildirim Yönetimi",
        icon: "🔔",
        color: "#00F5A0",
      },
      { id: "destek", title: "Destek", icon: "💬", color: "#FFD93D" },
      {
        id: "guncellemeler",
        title: "Güncellemeler",
        icon: "🔄",
        color: "#FF6B6B",
      },
      { id: "api", title: "API Yönetimi", icon: "🔌", color: "#00D9FF" },
      { id: "tema", title: "Tema Ayarları", icon: "🎨", color: "#7B2FFF" },
      { id: "email", title: "E-posta Ayarları", icon: "📧", color: "#FF6B9D" },
    ],
    main: [
      {
        id: "dashboard",
        title: "Kontrol Paneli",
        icon: "📊",
        desc: "Genel bakış",
        color: "#00D9FF",
      },
      {
        id: "yeni-okul",
        title: "Yeni Okul Ekle",
        icon: "➕",
        desc: "Okul kaydı",
        color: "#00F5A0",
      },
      {
        id: "okul-listesi",
        title: "Okul Listesi",
        icon: "📋",
        desc: "Tüm okullar",
        color: "#7B2FFF",
      },
      {
        id: "lisans-takip",
        title: "Lisans Takibi",
        icon: "⏰",
        desc: "Süreler",
        color: "#FFD93D",
      },
      {
        id: "finansal",
        title: "Finansal",
        icon: "💰",
        desc: "Gelir-gider",
        color: "#00D9FF",
      },
      {
        id: "istatistik",
        title: "İstatistikler",
        icon: "📈",
        desc: "Grafikler",
        color: "#FF6B9D",
      },
      {
        id: "kullanici-yonetimi",
        title: "Kullanıcılar",
        icon: "👤",
        desc: "Yönetim",
        color: "#7B2FFF",
      },
      {
        id: "sistem-saglik",
        title: "Sistem Sağlığı",
        icon: "❤️",
        desc: "Performans",
        color: "#00F5A0",
      },
      {
        id: "veritabani",
        title: "Veritabanı",
        icon: "🗄️",
        desc: "Yönetim",
        color: "#FFD93D",
      },
      {
        id: "yedek-al",
        title: "Yedek Al",
        icon: "💾",
        desc: "Otomatik/Manuel",
        color: "#FF6B6B",
      },
      {
        id: "yedek-yukle",
        title: "Yedek Yükle",
        icon: "📥",
        desc: "Geri yükle",
        color: "#00D9FF",
      },
      {
        id: "log-goruntuleyici",
        title: "Log Görüntüleyici",
        icon: "📜",
        desc: "İşlem geçmişi",
        color: "#7B2FFF",
      },
      {
        id: "guvenlik-rapor",
        title: "Güvenlik Raporu",
        icon: "🛡️",
        desc: "Tehdit analizi",
        color: "#FF6B9D",
      },
      {
        id: "api-anahtar",
        title: "API Anahtarları",
        icon: "🔑",
        desc: "Token yönetimi",
        color: "#00F5A0",
      },
      {
        id: "mail-sablonlari",
        title: "Mail Şablonları",
        icon: "📧",
        desc: "Otomatik mailler",
        color: "#FFD93D",
      },
      {
        id: "bildirim-ayarlari",
        title: "Bildirimler",
        icon: "🔔",
        desc: "Uyarı sistemi",
        color: "#FF6B6B",
      },
      {
        id: "tema-editor",
        title: "Tema Editörü",
        icon: "🎨",
        desc: "Özelleştirme",
        color: "#00D9FF",
      },
      {
        id: "dil-ayarlari",
        title: "Dil Ayarları",
        icon: "🌐",
        desc: "Çoklu dil",
        color: "#7B2FFF",
      },
      {
        id: "sms-entegrasyon",
        title: "SMS Entegrasyonu",
        icon: "📱",
        desc: "Toplu SMS",
        color: "#FF6B9D",
      },
      {
        id: "excel-export",
        title: "Excel Export",
        icon: "📊",
        desc: "Toplu dışa aktar",
        color: "#00F5A0",
      },
      {
        id: "pdf-export",
        title: "PDF Export",
        icon: "📄",
        desc: "Raporlar",
        color: "#FFD93D",
      },
      {
        id: "toplu-islem",
        title: "Toplu İşlemler",
        icon: "⚡",
        desc: "Hızlı işlem",
        color: "#FF6B6B",
      },
      {
        id: "onay-bekleyen",
        title: "Onay Bekleyenler",
        icon: "⏳",
        desc: "Pending",
        color: "#00D9FF",
      },
      {
        id: "sikca-sorulan",
        title: "SSS Yönetimi",
        icon: "❓",
        desc: "Sorular",
        color: "#7B2FFF",
      },
      {
        id: "destek-talep",
        title: "Destek Talepleri",
        icon: "🎫",
        desc: "Ticket sistemi",
        color: "#FF6B9D",
      },
    ],
  },
  school_user: {
    okul_admin: {
      sidebar: [
        {
          id: "ogretmenler",
          title: "Öğretmenler",
          icon: "👨‍🏫",
          color: "#00D9FF",
        },
        { id: "ogrenciler", title: "Öğrenciler", icon: "👨‍🎓", color: "#7B2FFF" },
        { id: "siniflar", title: "Sınıflar", icon: "🏛️", color: "#FF6B9D" },
        { id: "dersler", title: "Dersler", icon: "📚", color: "#00F5A0" },
        {
          id: "ders-programi",
          title: "Ders Programı",
          icon: "📅",
          color: "#FFD93D",
        },
        {
          id: "devamsizlik",
          title: "Devamsızlık",
          icon: "📋",
          color: "#FF6B6B",
        },
        { id: "notlar", title: "Notlar", icon: "📝", color: "#00D9FF" },
        { id: "raporlar", title: "Raporlar", icon: "📊", color: "#7B2FFF" },
        { id: "veliler", title: "Veliler", icon: "👨‍👩‍👧", color: "#FF6B9D" },
        { id: "personel", title: "Personel", icon: "👔", color: "#00F5A0" },
        { id: "muhasebe", title: "Muhasebe", icon: "💰", color: "#FFD93D" },
        { id: "stok", title: "Stok Yönetimi", icon: "📦", color: "#FF6B6B" },
        { id: "kütüphane", title: "Kütüphane", icon: "📖", color: "#00D9FF" },
        { id: "kantin", title: "Kantin", icon: "🍔", color: "#7B2FFF" },
        { id: "ayarlar", title: "Ayarlar", icon: "⚙️", color: "#FF6B9D" },
      ],
      main: [
        {
          id: "dashboard",
          title: "Kontrol Paneli",
          icon: "📊",
          desc: "Özet bilgiler",
          color: "#00D9FF",
        },
        {
          id: "ogretmen-ekle",
          title: "Öğretmen Ekle",
          icon: "➕",
          desc: "Yeni kayıt",
          color: "#00F5A0",
        },
        {
          id: "ogrenci-ekle",
          title: "Öğrenci Ekle",
          icon: "➕",
          desc: "Yeni kayıt",
          color: "#7B2FFF",
        },
        {
          id: "sinif-olustur",
          title: "Sınıf Oluştur",
          icon: "🏛️",
          desc: "Yeni sınıf",
          color: "#FF6B9D",
        },
        {
          id: "ders-ekle",
          title: "Ders Ekle",
          icon: "📚",
          desc: "Müfredat",
          color: "#FFD93D",
        },
        {
          id: "program-olustur",
          title: "Program Oluştur",
          icon: "📅",
          desc: "Ders saatleri",
          color: "#FF6B6B",
        },
        {
          id: "yoklama",
          title: "Yoklama Al",
          icon: "✅",
          desc: "Devamsızlık",
          color: "#00D9FF",
        },
        {
          id: "not-giris",
          title: "Not Girişi",
          icon: "📝",
          desc: "Sınav notları",
          color: "#7B2FFF",
        },
        {
          id: "basari-rapor",
          title: "Başarı Raporu",
          icon: "📈",
          desc: "Analiz",
          color: "#FF6B9D",
        },
        {
          id: "devamsizlik-rapor",
          title: "Devamsızlık Raporu",
          icon: "📋",
          desc: "İstatistik",
          color: "#00F5A0",
        },
        {
          id: "veli-toplanti",
          title: "Veli Toplantısı",
          icon: "👨‍👩‍👧",
          desc: "Planlama",
          color: "#FFD93D",
        },
        {
          id: "personel-maas",
          title: "Personel Maaş",
          icon: "💰",
          desc: "Bordro",
          color: "#FF6B6B",
        },
        {
          id: "gelir-gider",
          title: "Gelir-Gider",
          icon: "💸",
          desc: "Muhasebe",
          color: "#00D9FF",
        },
        {
          id: "stok-takip",
          title: "Stok Takibi",
          icon: "📦",
          desc: "Envanter",
          color: "#7B2FFF",
        },
        {
          id: "kitap-kayit",
          title: "Kitap Kaydı",
          icon: "📖",
          desc: "Kütüphane",
          color: "#FF6B9D",
        },
        {
          id: "kantin-satis",
          title: "Kantin Satış",
          icon: "🍔",
          desc: "POS sistemi",
          color: "#00F5A0",
        },
        {
          id: "duyuru-yap",
          title: "Duyuru Yap",
          icon: "📢",
          desc: "Toplu bilgilendirme",
          color: "#FFD93D",
        },
        {
          id: "etkinlik",
          title: "Etkinlik Planla",
          icon: "🎉",
          desc: "Sosyal aktivite",
          color: "#FF6B6B",
        },
        {
          id: "servis-takip",
          title: "Servis Takibi",
          icon: "🚌",
          desc: "Ulaşım",
          color: "#00D9FF",
        },
        {
          id: "yemek-menu",
          title: "Yemek Menüsü",
          icon: "🍽️",
          desc: "Haftalık",
          color: "#7B2FFF",
        },
        {
          id: "aidat-takip",
          title: "Aidat Takibi",
          icon: "💳",
          desc: "Ödemeler",
          color: "#FF6B9D",
        },
        {
          id: "sms-gonder",
          title: "SMS Gönder",
          icon: "📱",
          desc: "Toplu mesaj",
          color: "#00F5A0",
        },
        {
          id: "email-gonder",
          title: "E-posta Gönder",
          icon: "📧",
          desc: "Mail sistemi",
          color: "#FFD93D",
        },
        {
          id: "dosya-arsiv",
          title: "Dosya Arşivi",
          icon: "🗂️",
          desc: "Belgeler",
          color: "#FF6B6B",
        },
        {
          id: "okul-ayarlari",
          title: "Okul Ayarları",
          icon: "⚙️",
          desc: "Konfigürasyon",
          color: "#00D9FF",
        },
      ],
    },
    ogretmen: {
      sidebar: [
        { id: "siniflarim", title: "Sınıflarım", icon: "🏛️", color: "#00D9FF" },
        { id: "derslerim", title: "Derslerim", icon: "📚", color: "#7B2FFF" },
        { id: "yoklama", title: "Yoklama", icon: "✅", color: "#FF6B9D" },
        { id: "notlar", title: "Not Girişi", icon: "📝", color: "#00F5A0" },
        { id: "odevler", title: "Ödevler", icon: "📋", color: "#FFD93D" },
        { id: "sinavlar", title: "Sınavlar", icon: "📄", color: "#FF6B6B" },
        { id: "mesajlar", title: "Mesajlar", icon: "💬", color: "#00D9FF" },
        {
          id: "program",
          title: "Ders Programım",
          icon: "📅",
          color: "#7B2FFF",
        },
      ],
      main: [
        {
          id: "dashboard",
          title: "Kontrol Paneli",
          icon: "📊",
          desc: "Genel bakış",
          color: "#00D9FF",
        },
        {
          id: "sinif-listesi",
          title: "Sınıf Listesi",
          icon: "👥",
          desc: "Öğrencilerim",
          color: "#7B2FFF",
        },
        {
          id: "yoklama-al",
          title: "Yoklama Al",
          icon: "✅",
          desc: "Bugünkü yoklama",
          color: "#00F5A0",
        },
        {
          id: "not-gir",
          title: "Not Gir",
          icon: "📝",
          desc: "Sınav notları",
          color: "#FF6B9D",
        },
        {
          id: "odev-ver",
          title: "Ödev Ver",
          icon: "📋",
          desc: "Yeni ödev",
          color: "#FFD93D",
        },
        {
          id: "sinav-olustur",
          title: "Sınav Oluştur",
          icon: "📄",
          desc: "Yeni sınav",
          color: "#FF6B6B",
        },
        {
          id: "veli-gorusme",
          title: "Veli Görüşmesi",
          icon: "👨‍👩‍👧",
          desc: "Randevu",
          color: "#00D9FF",
        },
        {
          id: "davranis-notu",
          title: "Davranış Notu",
          icon: "⭐",
          desc: "Değerlendirme",
          color: "#7B2FFF",
        },
      ],
    },
  },
};

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Anasayfa yüklendi");

  // Kullanıcı bilgilerini al
  loadUserInfo();

  // Modülleri yükle
  loadModules();

  // Event listener'ları ekle
  initEventListeners();

  // Lisans kontrolü
  checkLicense();

  // Bildirim kontrolü
  loadNotifications();

  // Güncelleme kontrolü
  checkForUpdates();

  // Animasyonları başlat
  startAnimations();
});

// ==========================================
// KULLANICI BİLGİLERİ
// ==========================================

function loadUserInfo() {
  const userDataStr = sessionStorage.getItem("currentUser");

  if (!userDataStr) {
    console.error("❌ Kullanıcı bilgisi bulunamadı!");
    window.location.href = "giris.html";
    return;
  }

  const userData = JSON.parse(userDataStr);
  currentUser = userData.user;
  userType = userData.userType;
  schoolInfo = userData.school;

  console.log("👤 Kullanıcı:", currentUser);
  console.log("🏫 Tip:", userType);

  // Kullanıcı bilgilerini göster
  userName.textContent = currentUser.ad_soyad;
  userRole.textContent = getRoleName(currentUser.rol);

  // İnisiyaller
  const initials = currentUser.ad_soyad
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
  userInitials.textContent = initials;

  // Okul adı
  if (schoolInfo) {
    okulAdi.textContent = schoolInfo.okul_adi;
    pageTitle.textContent = `Hoş Geldiniz, ${currentUser.ad_soyad}`;
  } else {
    okulAdi.textContent = "Super Admin";
    pageTitle.textContent = "Sistem Yönetimi";
  }
}

function getRoleName(rol) {
  const roles = {
    super_admin: "Sistem Yöneticisi",
    okul_admin: "Okul Yöneticisi",
    ogretmen: "Öğretmen",
    ogrenci: "Öğrenci",
    veli: "Veli",
  };
  return roles[rol] || rol;
}

// ==========================================
// MODÜL YÜKLEME
// ==========================================

function loadModules() {
  let sidebarModules = [];
  let mainModules = [];

  if (userType === "super_admin") {
    sidebarModules = MODULES.super_admin.sidebar;
    mainModules = MODULES.super_admin.main;
  } else if (userType === "school_user") {
    const role = currentUser.rol;
    if (MODULES.school_user[role]) {
      sidebarModules = MODULES.school_user[role].sidebar;
      mainModules = MODULES.school_user[role].main;
    }
  }

  // Sol menüyü doldur
  renderSidebarMenu(sidebarModules);

  // Ana kartları doldur
  renderMainModules(mainModules);
}

function renderSidebarMenu(modules) {
  sidebarMenu.innerHTML = "";

  modules.forEach((module, index) => {
    const menuItem = document.createElement("a");
    menuItem.href = "#";
    menuItem.className = "menu-item";
    menuItem.dataset.moduleId = module.id;
    menuItem.style.animationDelay = `${index * 0.05}s`;
    menuItem.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="color: ${module.color}">
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="16">${module.icon}</text>
            </svg>
            <span>${module.title}</span>
        `;

    menuItem.addEventListener("click", (e) => {
      e.preventDefault();
      handleModuleClick(module);
    });

    sidebarMenu.appendChild(menuItem);
  });
}

function renderMainModules(modules) {
  moduleGrid.innerHTML = "";

  modules.forEach((module, index) => {
    const card = document.createElement("div");
    card.className = "module-card";
    card.dataset.moduleId = module.id;
    card.style.animation = `fadeIn 0.5s ease ${index * 0.05}s both`;
    card.innerHTML = `
            <div class="module-icon" style="border-color: ${module.color}">
                ${module.icon}
            </div>
            <div class="module-title">${module.title}</div>
            <div class="module-description">${module.desc}</div>
        `;

    card.addEventListener("click", () => {
      handleModuleClick(module);
    });

    moduleGrid.appendChild(card);
  });
}

// ==========================================
// MODÜL TIKLAMA
// ==========================================

function handleModuleClick(module) {
  console.log("🎯 Modül tıklandı:", module.title);

  // Sayfa yönlendirmeleri
  const pageRoutes = {
    // Super Admin Sayfaları
    okullar: "okullar.html",
    "yeni-okul": "okullar.html",
    "okul-listesi": "okullar.html",

    // Okul Admin - Öğretmen Modülleri
    ogretmenler: "ogretmenler.html",
    "ogretmen-ekle": "ogretmenler.html",

    // Okul Admin - Öğrenci Modülleri
    ogrenciler: "ogrenciler.html",
    "ogrenci-ekle": "ogrenciler.html",

    // Diğer modüller için (henüz yok)
    dashboard: "anasayfa.html",
  };

  // Eğer sayfa varsa yönlendir
  if (pageRoutes[module.id]) {
    showNotification("success", `${module.title} modülü açılıyor...`);

    setTimeout(() => {
      window.location.href = pageRoutes[module.id];
    }, 500);
  } else {
    // Henüz hazır değilse bildirim göster
    showNotification("info", `${module.title} modülü yakında eklenecek!`);
  }
}

// ==========================================
// LİSANS KONTROLÜ
// ==========================================

async function checkLicense() {
  if (userType !== "school_user" || !schoolInfo) {
    licenseBadge.style.display = "none";
    return;
  }

  try {
    const bitisTarihi = new Date(schoolInfo.lisans_bitis);
    const bugun = new Date();
    const kalanGun = Math.ceil((bitisTarihi - bugun) / (1000 * 60 * 60 * 24));

    if (kalanGun <= 0) {
      licenseText.textContent = "Bitti!";
      licenseBadge.classList.add("danger");
      showNotification(
        "error",
        "❌ Lisansınız sona erdi! Lütfen yöneticinizle iletişime geçin."
      );
    } else if (kalanGun <= 30) {
      licenseText.textContent = `${kalanGun} gün`;
      licenseBadge.classList.add("warning");
      showNotification(
        "warning",
        `⚠️ Lisansınız ${kalanGun} gün içinde sona erecek!`
      );
    } else {
      licenseText.textContent = `${kalanGun} gün`;
    }
  } catch (error) {
    console.error("❌ Lisans kontrolü hatası:", error);
  }
}

// ==========================================
// BİLDİRİMLER
// ==========================================

function loadNotifications() {
  // Örnek bildirimler (gerçek veriler veritabanından gelecek)
  const notifications = [
    {
      type: "success",
      title: "Hoş Geldiniz!",
      message: "Sisteme başarıyla giriş yaptınız.",
      time: "Şimdi",
    },
    {
      type: "info",
      title: "Yeni Güncelleme",
      message: "Sistem güncellemesi mevcut.",
      time: "2 saat önce",
    },
  ];

  updateNotificationCount(notifications.length);
  renderNotifications(notifications);
}

function updateNotificationCount(count) {
  notificationCount.textContent = count;
  notificationCount.style.display = count > 0 ? "flex" : "none";
}

function renderNotifications(notifications) {
  const notificationList = document.getElementById("notificationList");
  notificationList.innerHTML = "";

  if (notifications.length === 0) {
    notificationList.innerHTML =
      '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Bildirim yok</div>';
    return;
  }

  notifications.forEach((notif) => {
    // Bildirim-sistemi.js'den fonksiyon çağrılacak
  });
}

// ==========================================
// GÜNCELLEME KONTROLÜ
// ==========================================

async function checkForUpdates() {
  // Electron updater ile güncelleme kontrolü
  console.log("🔍 Güncelleme kontrol ediliyor...");

  // Güncelleme event listener'ları
  if (window.electronAPI) {
    window.electronAPI.onUpdateAvailable((data) => {
      document.getElementById("updateBtn").style.display = "flex";
      showNotification("info", `🎉 Yeni sürüm mevcut: v${data.version}`);
    });

    window.electronAPI.onUpdateProgress((data) => {
      showNotification("info", `📥 İndiriliyor: %${data.percent}`);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      showNotification(
        "success",
        "✅ Güncelleme indirildi! Yeniden başlatılıyor..."
      );
    });
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function initEventListeners() {
  // Bildirim paneli
  notificationBtn.addEventListener("click", () => {
    notificationPanel.classList.toggle("active");
  });

  closeNotifications.addEventListener("click", () => {
    notificationPanel.classList.remove("active");
  });

  // Kullanıcı menüsü
  userMenu.addEventListener("click", () => {
    userDropdown.classList.toggle("active");
    userMenu.classList.toggle("active");
  });

  // Dışarı tıklayınca kapat
  document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.remove("active");
      userMenu.classList.remove("active");
    }

    if (
      !notificationBtn.contains(e.target) &&
      !notificationPanel.contains(e.target)
    ) {
      notificationPanel.classList.remove("active");
    }
  });

  // Çıkış butonları
  logoutBtn.addEventListener("click", handleLogout);
  logoutDropdownBtn.addEventListener("click", handleLogout);

  // Arama (Ctrl+K)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("searchInput").focus();
    }
  });
}

// ==========================================
// ÇIKIŞ
// ==========================================

function handleLogout() {
  const confirmed = confirm("Çıkış yapmak istediğinize emin misiniz?");

  if (confirmed) {
    sessionStorage.clear();
    showNotification("success", "Çıkış yapılıyor...");

    setTimeout(() => {
      window.location.href = "giris.html";
    }, 1000);
  }
}

// ==========================================
// ANİMASYONLAR
// ==========================================

function startAnimations() {
  // Kart hover 3D efekti
  const cards = document.querySelectorAll(".module-card");

  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;

      card.style.transform = `
                perspective(1000px)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
                translateZ(10px)
                scale(1.05)
            `;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform =
        "perspective(1000px) rotateX(0) rotateY(0) translateZ(0) scale(1)";
    });
  });

  // Menü item animasyonları
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item, index) => {
    item.style.opacity = "0";
    item.style.transform = "translateX(-20px)";

    setTimeout(() => {
      item.style.transition = "all 0.3s ease";
      item.style.opacity = "1";
      item.style.transform = "translateX(0)";
    }, index * 50);
  });
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

// Modern bildirim göster (bildirim-sistemi.js'den çağrılacak)
function showNotification(type, message) {
  if (typeof Bildirim !== "undefined") {
    Bildirim.goster(type, message);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Tarih formatlama
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Sayı formatlama
function formatNumber(number) {
  return new Intl.NumberFormat("tr-TR").format(number);
}

// Para formatı
function formatCurrency(amount) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

// Scroll yumuşak kaydırma
function smoothScrollTo(element) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// Loading durumu göster
function showLoading(show = true) {
  // Loading overlay'i göster/gizle
  // Bu fonksiyon loading componenti eklendiğinde kullanılacak
  console.log(show ? "Loading..." : "Loaded");
}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

document.addEventListener("keydown", (e) => {
  // ESC ile panelleri kapat
  if (e.key === "Escape") {
    notificationPanel.classList.remove("active");
    userDropdown.classList.remove("active");
    userMenu.classList.remove("active");
  }

  // Alt+H ile anasayfa
  if (e.altKey && e.key === "h") {
    e.preventDefault();
    window.location.href = "anasayfa.html";
  }

  // Alt+L ile çıkış
  if (e.altKey && e.key === "l") {
    e.preventDefault();
    handleLogout();
  }
});

// ==========================================
// SAYFA ÇIKIŞINDA
// ==========================================

window.addEventListener("beforeunload", (e) => {
  // Kaydedilmemiş değişiklikler varsa uyar
  // Bu fonksiyon form sayfalarında kullanılacak
});

// ==========================================
// HATA YAKALAMA
// ==========================================

window.addEventListener("error", (e) => {
  console.error("❌ Global hata:", e.error);
  showNotification("error", "Bir hata oluştu! Lütfen sayfayı yenileyin.");
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("❌ Promise hatası:", e.reason);
  showNotification("error", "Bir işlem başarısız oldu!");
});

// ==========================================
// DEBUG MOD
// ==========================================

if (localStorage.getItem("debug_mode") === "true") {
  console.log("🐛 Debug modu aktif");
  console.log("👤 Kullanıcı:", currentUser);
  console.log("🏫 Okul:", schoolInfo);
  console.log("📊 Tip:", userType);
}

console.log("✅ Anasayfa scripti yüklendi");
console.log("🎨 Modüller render edildi");
console.log("🎯 Event listener'lar eklendi");
