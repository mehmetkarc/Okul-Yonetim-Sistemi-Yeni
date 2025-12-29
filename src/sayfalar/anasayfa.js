// ==========================================
// OKUL YÖNETİM SİSTEMİ - ANASAYFA V2.0
// + GÜNCELLEME SİSTEMİ ENTEGRE
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
          id: "ogretmen-nobet",
          title: "Öğretmen Nöbet",
          icon: "🛡️",
          desc: "Nöbet çizelgesi",
          color: "#9c27b0",
        },
        {
          id: "gezi-planla",
          title: "Gezi Planla",
          icon: "✈️",
          desc: "Okul gezisi",
          color: "#00D9FF",
        },
        {
          id: "ortak-sinav",
          title: "Ortak Sınav",
          icon: "📝",
          desc: "Genel sınavlar",
          color: "#7B2FFF",
        },
        {
          id: "sorumluluk-sinav",
          title: "Sorumluluk Sınavı",
          icon: "⚡",
          desc: "Ek sınav",
          color: "#FF6B9D",
        },
        {
          id: "rehberlik",
          title: "Rehberlik",
          icon: "🎯",
          desc: "Öğrenci desteği",
          color: "#00F5A0",
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

  // 🆕 Cache boyutunu güncelle
  updateCacheSize();

  // 🆕 GÜNCELLEME SİSTEMİ BAŞLAT
  initUpdateSystem();

  // Animasyonları başlat
  startAnimations();
});

// ==========================================
// KULLANICI BİLGİLERİ
// ==========================================

function loadUserInfo() {
  const currentUserStr = localStorage.getItem("currentUser");
  const currentSchoolStr = localStorage.getItem("currentSchool");

  if (!currentUserStr) {
    console.error("❌ Kullanıcı bilgisi bulunamadı!");
    localStorage.clear();
    window.location.href = "giris.html";
    return;
  }

  try {
    currentUser = JSON.parse(currentUserStr);
    schoolInfo = currentSchoolStr ? JSON.parse(currentSchoolStr) : null;
    userType =
      currentUser.rol === "super_admin" ? "super_admin" : "school_user";

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
  } catch (error) {
    console.error("❌ Kullanıcı bilgisi parse hatası:", error);
    localStorage.clear();
    window.location.href = "giris.html";
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

    // Okul Admin - Sınıf Modülleri
    siniflar: "siniflar.html",
    "sinif-olustur": "siniflar.html",
    "sinif-ekle": "siniflar.html",

    // Okul Admin - Dersler Modülleri
    dersler: "dersler.html",
    "ders-ekle": "dersler.html",
    "ders-tanimlama": "dersler.html",

    // Okul Admin - Program Oluştur
    "program-olustur": "program-olustur.html",

    // ✅ GEZİ MODÜLÜ
    "gezi-planla": "gezi-planla.html",

    // ✅ NÖBET MODÜLÜ
    "ogretmen-nobet": "nobet.html",
    "nobet-planla": "nobet.html",

    // ✅ ORTAK SINAV (KELEBEK) MODÜLÜ
    "ortak-sinav": "ortak-sinav.html",
    "sinav-olustur": "ortak-sinav.html",
    "kelebek-sistemi": "ortak-sinav.html",

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
    // Lisans bilgisi yoksa gizle
    if (!schoolInfo.lisans_bitis) {
      console.warn("⚠️ Lisans bilgisi bulunamadı");
      licenseBadge.style.display = "none";
      return;
    }

    const bitisTarihi = new Date(schoolInfo.lisans_bitis);
    const bugun = new Date();

    // Tarih geçerli mi kontrol et
    if (isNaN(bitisTarihi.getTime())) {
      console.error("❌ Geçersiz lisans tarihi:", schoolInfo.lisans_bitis);
      licenseText.textContent = "Hata!";
      licenseBadge.classList.add("danger");
      licenseBadge.style.display = "flex";
      return;
    }

    const kalanGun = Math.ceil((bitisTarihi - bugun) / (1000 * 60 * 60 * 24));

    console.log(`📅 Lisans kontrolü: ${kalanGun} gün kaldı`);

    // Badge'i göster
    licenseBadge.style.display = "flex";

    if (kalanGun <= 0) {
      licenseText.textContent = "Bitti!";
      licenseBadge.classList.remove("warning");
      licenseBadge.classList.add("danger");
      showNotification(
        "error",
        "❌ Lisansınız sona erdi! Lütfen yöneticinizle iletişime geçin."
      );
    } else if (kalanGun <= 30) {
      licenseText.textContent = `${kalanGun} gün`;
      licenseBadge.classList.remove("danger");
      licenseBadge.classList.add("warning");
      showNotification(
        "warning",
        `⚠️ Lisansınız ${kalanGun} gün içinde sona erecek!`
      );
    } else {
      licenseText.textContent = `${kalanGun} gün`;
      licenseBadge.classList.remove("danger", "warning");
    }
  } catch (error) {
    console.error("❌ Lisans kontrolü hatası:", error);
    licenseText.textContent = "Hata!";
    licenseBadge.classList.add("danger");
    licenseBadge.style.display = "flex";
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
}

function updateNotificationCount(count) {
  notificationCount.textContent = count;
  notificationCount.style.display = count > 0 ? "flex" : "none";
}

// ==========================================
// 🧹 CACHE YÖNETİMİ
// ==========================================

async function clearCacheManual() {
  try {
    console.log("🧹 Manuel cache temizleme başlatılıyor...");

    if (!window.electronAPI || !window.electronAPI.clearCache) {
      showNotification("error", "❌ Cache temizleme özelliği bulunamadı!");
      return;
    }

    // Butonu devre dışı bırak
    const btn = document.getElementById("clearCacheBtn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="spinning">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none"/>
        </svg>
      `;
    }

    // Cache'i temizle
    const result = await window.electronAPI.clearCache();

    if (result.success) {
      showNotification("success", "✅ " + result.message);

      // 2 saniye sonra sayfa yenilenecek
      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      showNotification("error", "❌ " + result.message);

      // Butonu tekrar aktif et
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M10 11v6m4-6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
      }
    }
  } catch (error) {
    console.error("❌ Cache temizleme hatası:", error);
    showNotification("error", "❌ Cache temizlenirken hata oluştu!");

    // Butonu tekrar aktif et
    const btn = document.getElementById("clearCacheBtn");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M10 11v6m4-6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
    }
  }
}

// Cache boyutunu göster
async function updateCacheSize() {
  try {
    if (!window.electronAPI || !window.electronAPI.getCacheSize) {
      return;
    }

    const result = await window.electronAPI.getCacheSize();

    if (result.success) {
      const sizeElement = document.getElementById("cacheSize");
      if (sizeElement) {
        sizeElement.textContent = `📊 Cache: ${result.size} MB`;
      }
    }
  } catch (error) {
    console.error("❌ Cache boyutu alma hatası:", error);
  }
}

// ==========================================
// 🔄 GÜNCELLEME SİSTEMİ
// ==========================================

/**
 * Güncelleme sistemini başlat
 */
function initUpdateSystem() {
  console.log("🔄 Güncelleme sistemi başlatılıyor...");

  if (!window.electronAPI) {
    console.warn("⚠️ electronAPI bulunamadı, güncelleme sistemi devre dışı");
    return;
  }

  // Güncelleme kontrol et
  checkForUpdates();

  // Event listener'lar
  setupUpdateListeners();
}

/**
 * Güncelleme kontrol et
 */
async function checkForUpdates() {
  try {
    console.log("🔍 Güncelleme kontrol ediliyor...");

    if (!window.electronAPI.checkForUpdates) {
      console.warn("⚠️ checkForUpdates fonksiyonu bulunamadı");
      return;
    }

    await window.electronAPI.checkForUpdates();
    console.log("✅ Güncelleme kontrolü başlatıldı");
  } catch (error) {
    console.error("❌ Güncelleme kontrol hatası:", error);
  }
}

/**
 * Güncelleme event listener'larını ayarla
 */
function setupUpdateListeners() {
  // Yeni versiyon mevcut
  if (window.electronAPI.onUpdateAvailable) {
    window.electronAPI.onUpdateAvailable((data) => {
      console.log("🎉 Yeni versiyon mevcut:", data.version);

      if (typeof Bildirim !== "undefined") {
        Bildirim.gosterGuncelleme(data.version, false);
      }
    });
  }

  // İndirme ilerlemesi
  if (window.electronAPI.onUpdateProgress) {
    window.electronAPI.onUpdateProgress((data) => {
      console.log(`📥 İndirme: ${data.percent.toFixed(0)}%`);

      const progressEl = document.getElementById("downloadProgress");
      if (progressEl) {
        const downloaded = (data.transferred / 1024 / 1024).toFixed(1);
        const total = (data.total / 1024 / 1024).toFixed(1);
        progressEl.textContent = `${data.percent.toFixed(
          0
        )}% indirildi (${downloaded} MB / ${total} MB)`;
      }
    });
  }

  // İndirme tamamlandı
  if (window.electronAPI.onUpdateDownloaded) {
    window.electronAPI.onUpdateDownloaded(() => {
      console.log("✅ Güncelleme indirildi!");

      if (typeof Bildirim !== "undefined") {
        Bildirim.gosterGuncelleme("", true);
      }
    });
  }

  // Güncelleme hatası
  if (window.electronAPI.onUpdateError) {
    window.electronAPI.onUpdateError((message) => {
      console.error("❌ Güncelleme hatası:", message);
      showNotification("error", "❌ Güncelleme hatası: " + message);
    });
  }
}

/**
 * Güncelleme indirmeyi başlat
 */
window.startUpdateDownload = async function () {
  try {
    console.log("📥 Güncelleme indiriliyor...");

    // Bildirimi güncelle
    const bildirim = document.getElementById("guncellemeBildirimi");
    if (bildirim) {
      bildirim.innerHTML = `
        <div class="update-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
        <div class="update-content">
          <div class="update-title">📥 İndiriliyor...</div>
          <div class="update-message" id="downloadProgress">
            Lütfen bekleyin
          </div>
        </div>
      `;
    }

    // İndirmeyi başlat
    if (window.electronAPI.startUpdateDownload) {
      await window.electronAPI.startUpdateDownload();
    } else {
      console.warn("⚠️ startUpdateDownload fonksiyonu bulunamadı");
    }
  } catch (error) {
    console.error("❌ İndirme hatası:", error);
    showNotification("error", "❌ Güncelleme indirilemedi!");
  }
};

/**
 * Uygulamayı yeniden başlat ve güncelle
 */
window.quitAndInstall = function () {
  console.log("🔄 Uygulama yeniden başlatılıyor...");

  if (window.electronAPI.quitAndInstall) {
    window.electronAPI.quitAndInstall();
  } else {
    console.warn("⚠️ quitAndInstall fonksiyonu bulunamadı");
  }
};

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

  // 🆕 Cache Temizleme Butonu
  const clearCacheBtn = document.getElementById("clearCacheBtn");
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener("click", clearCacheManual);
  }

  // 🆕 Cache Temizleme Dropdown
  const clearCacheDropdownBtn = document.getElementById(
    "clearCacheDropdownBtn"
  );
  if (clearCacheDropdownBtn) {
    clearCacheDropdownBtn.addEventListener("click", () => {
      userDropdown.classList.remove("active");
      userMenu.classList.remove("active");
      clearCacheManual();
    });
  }

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
      const searchInput = document.getElementById("searchInput");
      if (searchInput) searchInput.focus();
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
// 🎨 CSS ANIMATIONS (SPIN)
// ==========================================

const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .spinning {
    animation: spin 1s linear infinite;
  }
  
  #clearCacheBtn:hover {
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }
  
  #clearCacheBtn:active {
    transform: scale(0.95);
  }
  
  #clearCacheBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
document.head.appendChild(style);

console.log("✅ Anasayfa scripti yüklendi");
console.log("🎨 Modüller render edildi");
console.log("🎯 Event listener'lar eklendi");
console.log("🧹 Cache yönetimi aktif");
console.log("🔄 Güncelleme sistemi entegre");
