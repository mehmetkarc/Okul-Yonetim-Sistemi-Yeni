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
      { id: "yedek-al", title: "Yedekleme", icon: "💾", color: "#FFD93D" },
      {
        id: "sistem-saglik",
        title: "Sistem Sağlığı",
        icon: "❤️",
        color: "#FF6B6B",
      },
      { id: "veritabani", title: "Veritabanı", icon: "🗄️", color: "#7B2FFF" },
      { id: "loglar", title: "Sistem Logları", icon: "📝", color: "#00D9FF" },
      { id: "guvenlik", title: "Güvenlik", icon: "🔒", color: "#FF6B9D" },
      {
        id: "istatistikler",
        title: "İstatistikler",
        icon: "📈",
        color: "#00F5A0",
      },
      { id: "ayarlar", title: "Sistem Ayarları", icon: "⚙️", color: "#FFD93D" },
      {
        id: "bildirimler",
        title: "Bildirim Yönetimi",
        icon: "🔔",
        color: "#FF6B6B",
      },
      { id: "destek", title: "Destek", icon: "💬", color: "#00D9FF" },
      {
        id: "guncellemeler",
        title: "Güncellemeler",
        icon: "🔄",
        color: "#7B2FFF",
      },
      { id: "api", title: "API Yönetimi", icon: "🔌", color: "#FF6B9D" },
      { id: "tema", title: "Tema Ayarları", icon: "🎨", color: "#00F5A0" },
      { id: "email", title: "E-posta Ayarları", icon: "📧", color: "#FFD93D" },
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
        desc: "Performans izleme", // ✅ DESC EKLENDI
        color: "#00F5A0",
      },
      {
        id: "veritabani",
        title: "Veritabanı",
        icon: "🗄️",
        desc: "DB yönetimi", // ✅ DESC EKLENDI
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
          id: "kullanici-yonetimi", // ✅ YENİ EKLENDI
          title: "Kullanıcı Yönetimi",
          icon: "👥",
          color: "#7B2FFF",
        },
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
          id: "kullanici-yonetimi", // ✅ YENİ EKLENDI
          title: "Kullanıcı Yönetimi",
          icon: "👥",
          desc: "Kullanıcılar ve yetkiler",
          color: "#7B2FFF",
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
// KULLANICI BİLGİLERİ (SÜPER ADMİN DESTEKLİ GÜNCEL)
// ==========================================

function loadUserInfo() {
  console.log("=".repeat(60));
  console.log("🔍 ANASAYFA - KULLANICI BİLGİSİ YÜKLEME");
  console.log("=".repeat(60));

  const currentUserStr = localStorage.getItem("currentUser");

  console.log("📦 localStorage'dan okunan currentUser:");
  console.log(currentUserStr ? currentUserStr : "❌ BOŞ / NULL!");

  if (!currentUserStr) {
    console.error("❌ HATA: Kullanıcı bilgisi bulunamadı!");
    alert(
      "Kullanıcı bilgisi bulunamadı! Giriş sayfasına yönlendiriliyorsunuz."
    );
    localStorage.clear();
    window.location.href = "giris.html";
    return;
  }

  try {
    console.log("🔍 JSON parse ediliyor...");
    currentUser = JSON.parse(currentUserStr);
    console.log("✅ currentUser parse edildi:", currentUser);

    // ==========================================
    // 👑 KRİTİK: userType BELİRLEME MANTIĞI
    // ==========================================
    // Kurum kodu '000000' ise veya rol 'super_admin' ise modül sistemini super_admin yap
    if (
      currentUser.okul_kodu === "000000" ||
      currentUser.role === "super_admin"
    ) {
      userType = "super_admin";
      console.log("👑 YETKİ: Süper Admin Modu Aktif");
    } else {
      userType = "school_user";
      console.log("🏢 YETKİ: Okul Kullanıcısı Modu Aktif");
    }

    // UI Güncellemeleri
    const displayName = currentUser.kullanici_adi || "Kullanıcı";
    userName.textContent = displayName;

    // Profil İnisiyalleri (Profil resmindeki harfler)
    const initials = displayName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
    userInitials.textContent = initials;

    // ==========================================
    // 🎨 ROL VE BAŞLIK GÜNCELLEMELERİ
    // ==========================================
    if (userType === "super_admin") {
      // Süper Admin arayüz ayarları
      userRole.textContent = "Sistem Yöneticisi";
      okulAdi.textContent = "Yönetim Merkezi";
      pageTitle.textContent = "Sistem Kontrol Paneli";

      // Süper admin için breadcrumb düzenle
      if (breadcrumb) {
        breadcrumb.innerHTML =
          '<li class="breadcrumb-item active">Sistem Yönetimi</li>';
      }

      // Süper admin için lisans badge'ini gizle (İhtiyacı yok)
      if (licenseBadge) licenseBadge.style.display = "none";

      // schoolInfo'yu boş bırakma, super_admin verisiyle doldur
      schoolInfo = {
        okul_kodu: "000000",
        okul_adi: "Sistem Yönetim Merkezi",
        kullanici_adi: displayName,
        lisans_bitis: "2099-12-31",
        moduller: currentUser.moduller || [],
      };
    } else {
      // Normal Okul Kullanıcısı ayarları
      const displayRole = currentUser.okul_adi || "Okul Yönetimi";
      userRole.textContent = displayRole;
      okulAdi.textContent = currentUser.okul_adi;
      pageTitle.textContent = `Hoş Geldiniz, ${displayName}`;

      // schoolInfo nesnesini normal okul verisiyle doldur
      schoolInfo = {
        okul_kodu: currentUser.okul_kodu,
        okul_adi: currentUser.okul_adi,
        kullanici_adi: currentUser.kullanici_adi,
        lisans_bitis: currentUser.gecerlilik || currentUser.lisans_bitis,
        moduller: currentUser.moduller || [],
      };

      console.log("✅ schoolInfo Hazırlandı:", schoolInfo);
    }

    // Global erişim için window nesnesine bağla
    window.currentUser = currentUser;
    window.schoolInfo = schoolInfo;
    window.userType = userType; // Modüllerin çekilmesi için kritik

    console.log("=".repeat(60));
    console.log("✅ loadUserInfo TAMAMLANDI - AKTİF MOD: " + userType);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ PARSE HATASI:", error);
    alert("Kullanıcı bilgisi okunamadı! Tekrar giriş yapın.");
    localStorage.clear();
    window.location.href = "giris.html";
  }
}
// ==========================================
// 🛡️ YETKİ KONTROLÜ (SÜPER ADMİN SINIRSIZ ERİŞİM)
// ==========================================

function checkModuleAccess(moduleId) {
  // 👑 KRİTİK: Süper Admin ise sorgusuz sualsiz HER ŞEYE erişebilir
  if (
    userType === "super_admin" ||
    (currentUser && currentUser.okul_kodu === "000000")
  ) {
    console.log(
      `👑 SÜPER ADMİN: [${moduleId}] modülüne sınırsız erişim izni verildi.`
    );
    return true;
  }

  // Normal kullanıcılar için mevcut modül listesini kontrol et
  if (schoolInfo && schoolInfo.moduller) {
    return schoolInfo.moduller.includes(moduleId);
  }

  return false;
}

// Modül tıklama olayını yöneten fonksiyon (DÜZELTİLDİ: Obje desteği ve Yönlendirme eklendi)
function handleModuleClick(moduleData) {
  // Eğer parametre bir objeyse içinden ID'yi al, değilse kendisini kullan
  const moduleId = typeof moduleData === "object" ? moduleData.id : moduleData;
  const moduleTitle =
    typeof moduleData === "object" ? moduleData.title : moduleId;

  if (checkModuleAccess(moduleId)) {
    console.log(`✅ Yetki Onaylandı: ${moduleTitle} açılıyor...`);

    // 🚀 YÖNLENDİRME: Modül ID'si ile aynı isimli HTML dosyasına gider
    window.location.href = `${moduleId}.html`;
  } else {
    console.error(`❌ YETKİ HATASI: ${moduleId} modülüne erişiminiz yok!`);
    if (typeof showNotification === "function") {
      showNotification("error", "Bu sayfaya erişim yetkiniz bulunmamaktadır!");
    } else {
      alert("Bu sayfaya erişim yetkiniz bulunmamaktadır!");
    }
  }
}

// ==========================================
// MODÜL YÜKLEME (FİLTRELEME KAPALI - TÜM MODÜLLER)
// ==========================================

function loadModules() {
  console.log("=".repeat(60));
  console.log("📦 MODÜLLER YÜKLENİYOR");
  console.log("=".repeat(60));

  // userType ve currentUser global değişkenlerinin tanımlı olduğundan emin oluyoruz
  const currentType = window.userType || userType;

  let sidebarModules = [];
  let mainModules = [];

  if (currentType === "super_admin") {
    console.log("👑 Super Admin modülleri yükleniyor...");
    sidebarModules = MODULES.super_admin.sidebar;
    mainModules = MODULES.super_admin.main;
  } else {
    console.log("🏫 Okul kullanıcısı modülleri yükleniyor...");
    sidebarModules = MODULES.school_user.okul_admin.sidebar;
    mainModules = MODULES.school_user.okul_admin.main;
  }

  // Menüleri çiz
  renderSidebarMenu(sidebarModules);
  renderMainModules(mainModules);

  console.log("✅ Tüm modüller başarıyla render edildi!");
  console.log("=".repeat(60));
}

// ==========================================
// SİDEBAR MENÜ RENDER
// ==========================================

function renderSidebarMenu(modules) {
  if (!sidebarMenu) {
    console.error("❌ sidebarMenu DOM elementi bulunamadı!");
    return;
  }

  sidebarMenu.innerHTML = "";

  if (!modules || modules.length === 0) {
    sidebarMenu.innerHTML =
      '<div style="padding: 20px; color: #999; text-align: center;">Modül bulunamadı</div>';
    return;
  }

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

// ==========================================
// ANA MODÜLLER RENDER
// ==========================================

function renderMainModules(modules) {
  if (!moduleGrid) {
    console.error("❌ moduleGrid DOM elementi bulunamadı!");
    return;
  }

  moduleGrid.innerHTML = "";

  if (!modules || modules.length === 0) {
    moduleGrid.innerHTML = `<div style="padding: 40px; text-align: center; grid-column: 1/-1;">Modül Bulunamadı</div>`;
    return;
  }

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
// MODÜL TIKLAMA (DEBUG + TAMİR SÜRÜMÜ)
// ==========================================

function handleModuleClick(module) {
  // Gelen veriyi kontrol et (Obje değilse bile hata vermemesi için)
  const moduleId = typeof module === "object" ? module.id : module;
  const moduleTitle = typeof module === "object" ? module.title : "Modül";

  console.log("=".repeat(60));
  console.log("🎯 MODÜL TIKLANDI:", moduleTitle);
  console.log("=".repeat(60));

  // 1. MEVCUT VERİYİ LOCALSTORAGE'DAN ÇEK
  const currentUserStr = localStorage.getItem("currentUser");

  if (!currentUserStr) {
    console.error("❌ HATA: localStorage'da currentUser bulunamadı!");
    if (typeof showNotification === "function") {
      showNotification("error", "Oturum verisi bulunamadı!");
    }
    setTimeout(() => {
      window.location.href = "giris.html";
    }, 1000);
    return;
  }

  // 2. VERİYİ PARSE ET VE DİĞER SAYFALARIN BEKLEDİĞİ FORMATI OLUŞTUR
  try {
    const userObj = JSON.parse(currentUserStr);

    // Diğer sayfaların (ogretmenler.js vb.) beklediği eksik alanları tamamla
    const repairData = {
      ...userObj,
      ad_soyad: userObj.kullanici_adi || userObj.ad_soyad || "Yönetici",
      rol:
        userObj.okul_kodu && userObj.okul_kodu !== "000000"
          ? "okul_admin"
          : "super_admin",
      okul_adi: userObj.okul_adi || "Belirtilmemiş Okul",
    };

    // Kritik: Diğer sayfaların aradığı "currentSchool" anahtarını doldur
    localStorage.setItem("currentSchool", JSON.stringify(repairData));
    // Mevcut kullanıcıyı da güncel (tamir edilmiş) haliyle sakla
    localStorage.setItem("currentUser", JSON.stringify(repairData));

    console.log("🚀 Veriler tamir edildi ve hazırlandı:", repairData);
  } catch (e) {
    console.error("❌ JSON Parse Hatası:", e);
    window.location.href = "giris.html";
    return;
  }

  // 3. SAYFA ROTALARI (GÜNCEL)
  const pageRoutes = {
    okullar: "okullar.html",
    "yeni-okul": "okullar.html",
    "okul-listesi": "okullar.html",
    lisanslar: "lisanslar.html",
    "lisans-takip": "lisanslar.html",
    finans: "finans.html",
    finansal: "finans.html",
    ogretmenler: "ogretmenler.html",
    "ogretmen-ekle": "ogretmenler.html",
    ogrenciler: "ogrenciler.html",
    "ogrenci-ekle": "ogrenciler.html",
    siniflar: "siniflar.html",
    "sinif-olustur": "siniflar.html",
    dersler: "dersler.html",
    "ders-ekle": "dersler.html",
    "program-olustur": "program-olustur.html",
    "ders-programi": "program-olustur.html",
    "gezi-planla": "gezi-planla.html",
    "ogretmen-nobet": "nobet.html",
    "ortak-sinav": "ortak-sinav.html",
    notlar: "notlar.html",
    devamsizlik: "devamsizlik.html",
    raporlar: "raporlar.html",
    dashboard: "anasayfa.html",
    "kullanici-yonetimi": "kullanici-yonetimi.html",
    "yedek-al": "yedek-yonetimi.html",
    "yedek-yukle": "yedek-yonetimi.html",
    "sistem-saglik": "sistem-saglik.html", // ✅ YENİ
    veritabani: "veritabani.html", // ✅ YENİ (İleride yapılacak)
    "log-goruntuleyici": "log-goruntuleyici.html", // ✅ YENİ (İleride yapılacak)
    "guvenlik-rapor": "guvenlik-rapor.html", // ✅ YENİ (İleride yapılacak)
  };

  // 4. YÖNLENDİRME
  if (pageRoutes[moduleId]) {
    console.log("✅ Hedef Sayfa:", pageRoutes[moduleId]);

    if (typeof showNotification === "function") {
      showNotification("success", `${moduleTitle} açılıyor...`);
    }

    // 500ms bekle ki veriler localStorage'a tam yazılsın
    setTimeout(() => {
      window.location.href = pageRoutes[moduleId];
    }, 500);
  } else {
    console.warn("⚠️ Rota bulunamadı:", moduleId);
    if (typeof showNotification === "function") {
      showNotification("info", "Modül yapım aşamasında.");
    }
  }
  console.log("=".repeat(60));
}
// ==========================================
// LİSANS KONTROLÜ
// ==========================================

// ==========================================
// LİSANS KONTROLÜ (SÜPER ADMİN DESTEKLİ)
// ==========================================

async function checkLicense() {
  // 👑 KRİTİK DÜZENLEME: Süper Admin veya 000000 kodlu girişlerde lisans kontrolünü tamamen atla
  if (
    userType === "super_admin" ||
    (currentUser && currentUser.okul_kodu === "000000")
  ) {
    console.log(
      "👑 SÜPER ADMİN: Lisans kontrolü bypass edildi, sınırsız erişim sağlandı."
    );

    // UI üzerindeki lisans elemanlarını gizle veya "Sınırsız" yap
    if (licenseBadge) {
      licenseBadge.style.display = "none";
    }
    if (licenseText) {
      licenseText.textContent = "Sınırsız";
    }
    return; // Fonksiyondan çık, aşağıdaki kontrollere girme
  }

  // Okul kullanıcısı değilse veya bilgi yoksa kontrolü durdur
  if (userType !== "school_user" || !schoolInfo) {
    if (licenseBadge) licenseBadge.style.display = "none";
    return;
  }

  try {
    // Lisans bitiş tarihi bilgisi yoksa gizle
    if (!schoolInfo.lisans_bitis) {
      console.warn("⚠️ Lisans bilgisi bulunamadı");
      if (licenseBadge) licenseBadge.style.display = "none";
      return;
    }

    const bitisTarihi = new Date(schoolInfo.lisans_bitis);
    const bugun = new Date();

    // Tarih geçerli mi kontrol et
    if (isNaN(bitisTarihi.getTime())) {
      console.error("❌ Geçersiz lisans tarihi:", schoolInfo.lisans_bitis);
      if (licenseText) licenseText.textContent = "Hata!";
      if (licenseBadge) {
        licenseBadge.classList.add("danger");
        licenseBadge.style.display = "flex";
      }
      return;
    }

    const kalanGun = Math.ceil((bitisTarihi - bugun) / (1000 * 60 * 60 * 24));

    console.log(`📅 Lisans kontrolü: ${kalanGun} gün kaldı`);

    // Badge'i göster
    if (licenseBadge) licenseBadge.style.display = "flex";

    if (kalanGun <= 0) {
      if (licenseText) licenseText.textContent = "Bitti!";
      if (licenseBadge) {
        licenseBadge.classList.remove("warning");
        licenseBadge.classList.add("danger");
      }
      if (typeof showNotification === "function") {
        showNotification(
          "error",
          "❌ Lisansınız sona erdi! Lütfen yöneticinizle iletişime geçin."
        );
      }
    } else if (kalanGun <= 30) {
      if (licenseText) licenseText.textContent = `${kalanGun} gün`;
      if (licenseBadge) {
        licenseBadge.classList.remove("danger");
        licenseBadge.classList.add("warning");
      }
      if (typeof showNotification === "function") {
        showNotification(
          "warning",
          `⚠️ Lisansınız ${kalanGun} gün içinde sona erecek!`
        );
      }
    } else {
      if (licenseText) licenseText.textContent = `${kalanGun} gün`;
      if (licenseBadge) licenseBadge.classList.remove("danger", "warning");
    }
  } catch (error) {
    console.error("❌ Lisans kontrolü hatası:", error);
    if (licenseText) licenseText.textContent = "Hata!";
    if (licenseBadge) {
      licenseBadge.classList.add("danger");
      licenseBadge.style.display = "flex";
    }
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
    window.electronAPI.onUpdateError((error) => {
      console.error("❌ Güncelleme hatası detayı:", {
        message: error?.message || error,
        code: error?.code,
        stack: error?.stack,
        fullError: error,
      });

      const errorMsg = error?.message || JSON.stringify(error);
      showNotification("error", "❌ Güncelleme hatası: " + errorMsg);
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
    console.log("🚪 Çıkış işlemi başlatılıyor...");

    // ✅ localStorage'ı temizle (sessionStorage değil!)
    localStorage.clear();

    showNotification("success", "Çıkış yapılıyor...");

    setTimeout(() => {
      console.log("🔄 Giriş sayfasına yönlendiriliyor...");
      window.location.href = "giris.html";
    }, 1000);
  } else {
    console.log("❌ Çıkış iptal edildi");
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
