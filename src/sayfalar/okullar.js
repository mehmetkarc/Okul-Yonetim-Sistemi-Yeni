// ==========================================
// OKUL YÖNETİMİ SAYFASI V2.0 (DÜZELTİLMİŞ)
// Lisans oluşturma create-license.js ile %100 uyumlu
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let currentUser = null;
let userType = null;
let schoolInfo = null;
let allSchools = [];
let filteredSchools = [];

// ⚠️ LİSANS ÜRETİM AYARLARI (Crypto-JS Gerektirir)
const MASTER_KEY = "OYS-2025-SUPER-SECRET-KEY-XYZ123-MEHMET-KARC";

// ==========================================
// 🔐 LİSANS DOSYASI OLUŞTUR VE İNDİR (DÜZELTİLMİŞ)
// create-license.js ile %100 uyumlu
// ==========================================

function lisansDosyasiIndir(okulVerisi) {
  try {
    console.log("🔐 === LİSANS OLUŞTURMA BAŞLADI ===");
    console.log("📦 Gelen okul verisi:", okulVerisi);

    // ✅ ŞİFRE KONTROLÜ (Tüm olası property isimleri)
    const adminSifre =
      okulVerisi.adminSifre ||
      okulVerisi.admin_sifre ||
      okulVerisi.sifre ||
      okulVerisi.okul_sifre ||
      "";

    console.log(
      "🔒 Bulunan şifre:",
      adminSifre ? `✅ ${adminSifre}` : "❌ BOŞ!"
    );

    if (!adminSifre) {
      console.error("❌ ŞİFRE BULUNAMADI!");
      console.log("📋 Okul verisi detay:", JSON.stringify(okulVerisi, null, 2));

      Bildirim.error(
        "Okul şifresi bulunamadı!\n\n" +
          "Lütfen:\n" +
          "1. Sayfayı yenileyin (F5)\n" +
          "2. Okul listesini tekrar yükleyin\n" +
          "3. Sorun devam ederse okulu düzenleyip kaydedin"
      );
      return;
    }

    // Tarihi formatla
    const bitisTarihi = okulVerisi.lisansBitis
      ? new Date(okulVerisi.lisansBitis).toISOString().split("T")[0]
      : "2026-12-30";

    // ✅ TÜM MODÜLLER
    const tumModuller = [
      "ogretmenler",
      "ogrenciler",
      "siniflar",
      "dersler",
      "ders-programi",
      "devamsizlik",
      "notlar",
      "raporlar",
      "veliler",
      "personel",
      "muhasebe",
      "stok",
      "kütüphane",
      "kantin",
      "ayarlar",
      "dashboard",
      "ogretmen-ekle",
      "ogrenci-ekle",
      "sinif-olustur",
      "ders-ekle",
      "program-olustur",
      "yoklama",
      "not-giris",
      "basari-rapor",
      "devamsizlik-rapor",
      "veli-toplanti",
      "personel-maas",
      "gelir-gider",
      "stok-takip",
      "kitap-kayit",
      "kantin-satis",
      "duyuru-yap",
      "etkinlik",
      "servis-takip",
      "yemek-menu",
      "ogretmen-nobet",
      "gezi-planla",
      "ortak-sinav",
      "sorumluluk-sinav",
      "rehberlik",
      "aidat-takip",
      "sms-gonder",
      "email-gonder",
      "dosya-arsiv",
      "okul-ayarlari",
    ];

    // 1. Veri Yapısını Hazırla
    const license = {
      okul_kodu: String(okulVerisi.okulKodu),
      okul_adi: String(okulVerisi.okulAdi),
      kullanici_adi: "admin",
      sifre: String(adminSifre), // ✅ DÜZELTME
      moduller: tumModuller,
      aktif: true,
      gecerlilik: bitisTarihi,
      olusturma_tarihi: new Date().toISOString(),
    };

    console.log("📋 Lisans verisi hazırlandı:");
    console.log("   • Okul Kodu:", license.okul_kodu);
    console.log("   • Okul Adı:", license.okul_adi);
    console.log("   • Şifre:", license.sifre);
    console.log("   • Modül Sayısı:", license.moduller.length);
    console.log("   • Geçerlilik:", license.gecerlilik);

    // 2. İmza Oluştur
    const rawDataForSignature =
      license.okul_kodu +
      license.okul_adi +
      license.kullanici_adi +
      license.sifre +
      license.gecerlilik +
      MASTER_KEY;

    license.imza = CryptoJS.SHA256(rawDataForSignature).toString();
    console.log("🔐 İmza oluşturuldu:", license.imza.substring(0, 16) + "...");

    // 3. Şifrele
    const jsonData = JSON.stringify(license);
    const encrypted = CryptoJS.AES.encrypt(jsonData, MASTER_KEY).toString();
    console.log("🔒 Lisans şifrelendi:", encrypted.length, "karakter");

    // 4. İndir
    const blob = new Blob([encrypted], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lisans_${license.okul_kodu}.lic`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);

    // Bildirim
    if (typeof Bildirim !== "undefined" && Bildirim.success) {
      Bildirim.success(
        `✅ Lisans dosyası oluşturuldu!\n\n` +
          `🏫 Okul: ${license.okul_adi}\n` +
          `🔑 Okul Kodu: ${license.okul_kodu}\n` +
          `👤 Kullanıcı: admin\n` +
          `🔒 Şifre: ${license.sifre}\n` +
          `📅 Geçerlilik: ${bitisTarihi}\n\n` +
          `Dosya indirildi: lisans_${license.okul_kodu}.lic`,
        "Lisans Oluşturuldu",
        10000
      );
    }

    console.log("✅ === LİSANS OLUŞTURMA TAMAMLANDI ===");
  } catch (error) {
    console.error("❌ Lisans üretim hatası:", error);
    if (typeof Bildirim !== "undefined" && Bildirim.error) {
      Bildirim.error("Lisans oluşturulurken bir hata oluştu!");
    }
  }
}

// DOM elemanları
const btnYeniOkul = document.getElementById("btnYeniOkul");
const modalYeniOkul = document.getElementById("modalYeniOkul");
const formYeniOkul = document.getElementById("formYeniOkul");
const okullarTbody = document.getElementById("okullarTbody");
const searchInput = document.getElementById("searchInput");
const filterIl = document.getElementById("filterIl");
const filterLisans = document.getElementById("filterLisans");
const btnFiltrele = document.getElementById("btnFiltrele");
const logoutBtn = document.getElementById("logoutBtn");

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Okul yönetimi sayfası yüklendi");

  // Kullanıcı bilgilerini yükle
  loadUserInfo();

  // Okulları yükle
  await loadSchools();

  // Event listener'ları ekle
  initEventListeners();

  // İlk şifre oluştur
  generatePassword();
});

// ==========================================
// KULLANICI BİLGİLERİ (GÜNCELLENMİŞ VE TAM SÜRÜM)
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

    // 👑 KRİTİK DÜZELTME: Hem 'role' hem 'rol' kontrolü + Okul Kodu Bypass
    const actualRole = currentUser.role || currentUser.rol;

    if (
      actualRole === "super_admin" ||
      currentUser.okul_kodu === "000000" ||
      currentUser.kullanici_adi === "superadmin"
    ) {
      userType = "super_admin";
    } else {
      userType = "school_user";
    }

    // Arayüz elemanlarını güncelle (Hata almamak için varlık kontrolü yapıldı)
    const userNameElem = document.getElementById("userName");
    const userRoleElem = document.getElementById("userRole");
    const userInitialsElem = document.getElementById("userInitials");
    const okulAdiElem = document.getElementById("okulAdi");

    if (userNameElem) {
      userNameElem.textContent =
        currentUser.ad_soyad || currentUser.kullanici_adi || "Kullanıcı";
    }

    if (userRoleElem) {
      userRoleElem.textContent = getRoleName(actualRole);
    }

    if (userInitialsElem) {
      const nameParts = (
        currentUser.ad_soyad ||
        currentUser.kullanici_adi ||
        "SA"
      ).split(" ");
      const initials =
        nameParts.length > 1
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();
      userInitialsElem.textContent = initials;
    }

    // Okul adı gösterimi
    if (okulAdiElem) {
      if (userType === "super_admin") {
        okulAdiElem.textContent = "Sistem Yönetim Merkezi";
      } else if (schoolInfo) {
        okulAdiElem.textContent = schoolInfo.okul_adi;
      } else {
        okulAdiElem.textContent = "Okul Kullanıcısı";
      }
    }

    // 🛡️ YETKİ KONTROLÜ - Sadece super admin okullar sayfasına erişebilir
    if (userType !== "super_admin") {
      console.warn("❌ Yetkisiz Giriş Denemesi: Kullanıcı Süper Admin değil.");

      if (
        typeof Bildirim !== "undefined" &&
        typeof Bildirim.error === "function"
      ) {
        Bildirim.error("Bu sayfaya erişim yetkiniz bulunmamaktadır!");
      } else {
        alert("Bu sayfaya erişim yetkiniz bulunmamaktadır!");
      }

      setTimeout(() => {
        window.location.href = "anasayfa.html";
      }, 2000);
    } else {
      console.log("✅ Yetki Onaylandı: Süper Admin girişi başarılı.");
    }
  } catch (error) {
    console.error("❌ Kullanıcı bilgisi parse hatası:", error);
    localStorage.clear();
    window.location.href = "giris.html";
  }
}

// ==========================================
// ROL İSMİ DÖNDÜR (GÜNCELLENMİŞ)
// ==========================================

function getRoleName(rol) {
  // Hem İngilizce hem Türkçe veritabanı değerlerini destekler
  const roles = {
    super_admin: "Sistem Yöneticisi",
    okul_admin: "Okul Yöneticisi",
    ogretmen: "Öğretmen",
    admin: "Yönetici",
  };
  return roles[rol] || rol || "Tanımsız Rol";
}

// ==========================================
// OKULLARI YÜKLE - SONSUZ DÖNGÜ KORUNMASI İLE
// ==========================================

async function loadSchools() {
  console.log("📋 === LOAD SCHOOLS BAŞLADI ===");

  // EĞER ZATEN YÜKLEME VARSA, DURDUR (Sonsuz döngü koruması)
  if (window.isLoadingSchools) {
    console.warn("⚠️ Zaten yükleme var, atlanıyor...");
    return;
  }

  window.isLoadingSchools = true;

  try {
    console.log("🔄 Backend'e istek gönderiliyor...");

    const result = await ipcRenderer.invoke("get-all-schools");

    console.log("📨 Backend cevabı:", result);

    if (result.success) {
      allSchools = result.data;
      filteredSchools = [...allSchools];

      console.log(`✅ ${allSchools.length} okul yüklendi`);

      renderSchools();
      updateStats();
      updateFilters();

      console.log("✅ Render tamamlandı");

      // İlk yüklemeden sonra bildirim göster
      if (window.schoolsLoadedOnce && allSchools.length > 0) {
        Bildirim.success(`${allSchools.length} okul yüklendi`, null, 2000);
      }
      window.schoolsLoadedOnce = true;
    } else {
      console.error("❌ Okul yükleme başarısız:", result.message);
      Bildirim.error(result.message || "Okullar yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ HATA:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  } finally {
    window.isLoadingSchools = false;
    console.log("🏁 === LOAD SCHOOLS BİTTİ ===");
  }
}

// ==========================================
// OKULLARI GÖSTER
// ==========================================

function renderSchools() {
  if (filteredSchools.length === 0) {
    okullarTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 60px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
            Okul bulunamadı
          </div>
          <div style="font-size: 14px; color: var(--text-secondary);">
            Arama kriterlerinizi değiştirmeyi deneyin
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = "";

  filteredSchools.forEach((okul, index) => {
    // Lisans durumu
    let lisansBadge = "";
    let lisansClass = "";

    if (okul.lisans_durumu === "aktif") {
      lisansClass = "aktif";
      lisansBadge = `✓ Aktif (${okul.lisans_kalan_gun} gün)`;
    } else if (okul.lisans_durumu === "uyari") {
      lisansClass = "uyari";
      lisansBadge = `⚠ ${okul.lisans_kalan_gun} gün kaldı`;
    } else {
      lisansClass = "bitmis";
      lisansBadge = `✕ Süresi Dolmuş`;
    }

    html += `
      <tr style="animation: fadeIn 0.5s ease ${index * 0.05}s both;">
        <td>${index + 1}</td>
        <td><strong style="color: var(--primary);">${
          okul.okul_kodu
        }</strong></td>
        <td><strong>${okul.okul_adi}</strong></td>
        <td>${okul.il} / ${okul.ilce}</td>
        <td>${okul.yetkili_ad || "-"}</td>
        <td>${okul.yetkili_unvan || "-"}</td>
        <td>
          <span class="license-badge ${lisansClass}">${lisansBadge}</span>
          <br>
          <small style="color: var(--text-muted); font-size: 11px;">
            ${new Date(okul.lisans_bitis).toLocaleDateString("tr-TR")}
          </small>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-action edit" onclick="duzenleOkul(${
              okul.id
            })" title="Düzenle">✏️</button>
            <button class="btn-action" onclick="sifreGoster(${
              okul.id
            })" title="Şifre Göster" style="background: rgba(0, 217, 255, 0.2); color: #00d9ff;">👁️</button>
            <button class="btn-action license" onclick="lisansDosyasiIndirById(${
              okul.id
            })" title="Lisans Dosyası Oluştur ve İndir">🔑</button>
            <button class="btn-action delete" onclick="silOkul(${
              okul.id
            }, '${okul.okul_adi.replace(/'/g, "\\'")}')" title="Sil">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });

  okullarTbody.innerHTML = html;
}

// ==========================================
// LİSANS İNDİR - OKUL DB'DEN ŞİFRE AL
// ==========================================

async function lisansDosyasiIndirById(okulId) {
  console.log("🔐 === LİSANS İNDİR (Okul DB'den şifre) ===");
  console.log("🔍 Okul ID:", okulId);

  const okul = allSchools.find((o) => o.id === okulId);

  if (!okul) {
    console.error("❌ Okul bulunamadı!");
    Bildirim.error("Okul bulunamadı!");
    return;
  }

  console.log("📋 Okul bulundu:", okul.okul_adi);

  try {
    // ✅ OKUL DB'DEN ADMIN ŞİFRESİNİ AL
    Bildirim.showLoading("Okul şifresi alınıyor...");

    const result = await ipcRenderer.invoke("get-school-password", okulId);

    Bildirim.hideLoading();

    if (!result.success) {
      console.error("❌ Şifre alınamadı:", result.message);
      Bildirim.error("Okul şifresi alınamadı!");
      return;
    }

    const adminSifre = result.data.admin_sifre;

    console.log("✅ Okul DB'den alınan şifre:", adminSifre);

    if (!adminSifre || adminSifre === "Bulunamadı") {
      console.error("❌ Şifre geçersiz!");
      Bildirim.error("Okul şifresi geçersiz!");
      return;
    }

    // Lisans verisini hazırla
    const okulVerisi = {
      okulKodu: okul.okul_kodu,
      okulAdi: okul.okul_adi,
      adminSifre: adminSifre, // ✅ DB'DEN ALINAN ŞİFRE
      lisansBitis: okul.lisans_bitis,
    };

    console.log("✅ Lisans verisi hazırlandı:", {
      ...okulVerisi,
      adminSifre: "***", // Güvenlik için gizle
    });

    // Lisans oluştur
    lisansDosyasiIndir(okulVerisi);
  } catch (error) {
    console.error("❌ Hata:", error);
    Bildirim.error("Lisans oluşturulamadı: " + error.message);
  }
}

// ==========================================
// İSTATİSTİKLERİ GÜNCELLE
// ==========================================

function updateStats() {
  const toplamOkul = allSchools.length;
  const aktifLisans = allSchools.filter(
    (o) => o.lisans_durumu === "aktif"
  ).length;
  const yakindaBiten = allSchools.filter(
    (o) => o.lisans_durumu === "uyari"
  ).length;
  const suresiDolmus = allSchools.filter(
    (o) => o.lisans_durumu === "bitmis"
  ).length;

  document.getElementById("statToplamOkul").textContent = toplamOkul;
  document.getElementById("statAktifLisans").textContent = aktifLisans;
  document.getElementById("statYakindaBiten").textContent = yakindaBiten;
  document.getElementById("statSuresiDolmus").textContent = suresiDolmus;
}

// ==========================================
// FİLTRELERİ GÜNCELLE
// ==========================================

function updateFilters() {
  // İl listesi
  const iller = [...new Set(allSchools.map((o) => o.il))].sort();

  filterIl.innerHTML = '<option value="">Tüm İller</option>';
  iller.forEach((il) => {
    filterIl.innerHTML += `<option value="${il}">${il}</option>`;
  });
}

// ==========================================
// FİLTRELE
// ==========================================

function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedIl = filterIl.value;
  const selectedLisans = filterLisans.value;

  filteredSchools = allSchools.filter((okul) => {
    // Arama
    const matchesSearch =
      !searchTerm ||
      okul.okul_adi.toLowerCase().includes(searchTerm) ||
      okul.okul_kodu.includes(searchTerm);

    // İl filtresi
    const matchesIl = !selectedIl || okul.il === selectedIl;

    // Lisans filtresi
    const matchesLisans =
      !selectedLisans || okul.lisans_durumu === selectedLisans;

    return matchesSearch && matchesIl && matchesLisans;
  });

  renderSchools();

  if (searchTerm || selectedIl || selectedLisans) {
    Bildirim.info(`${filteredSchools.length} okul bulundu`);
  }
}

// ==========================================
// ŞİFRE OLUŞTUR
// ==========================================

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&*";
  let password = "";

  // En az: 1 büyük, 1 küçük, 1 rakam, 1 özel karakter
  password += "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)];
  password += "abcdefghjkmnpqrstuvwxyz"[Math.floor(Math.random() * 23)];
  password += "23456789"[Math.floor(Math.random() * 8)];
  password += "@#$%&*"[Math.floor(Math.random() * 6)];

  // Kalan 8 karakter
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // Karıştır
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  document.getElementById("adminSifre").value = password;
  document.getElementById("passwordStrength").textContent =
    "✓ Güçlü şifre (12 karakter, karışık)";

  return password;
}

// ==========================================
// YENİ OKUL EKLE - AYRI FONKSİYON
// ==========================================

async function handleFormSubmit(e) {
  e.preventDefault();

  console.log("📝 Form submit tetiklendi");

  // Form elemanlarını direkt al
  const form = e.target;
  const formData = new FormData(form);

  // Değerleri al
  const okulKodu = form.querySelector("#okulKodu")?.value.trim() || "";
  const okulAdi = form.querySelector("#okulAdi")?.value.trim() || "";
  const il = form.querySelector("#il")?.value.trim() || "";
  const ilce = form.querySelector("#ilce")?.value.trim() || "";
  const yetkiliAd = form.querySelector("#yetkiliAd")?.value.trim() || "";
  const yetkiliUnvan = form.querySelector("#yetkiliUnvan")?.value || "";
  const adres = form.querySelector("#adres")?.value.trim() || "";
  const telefon = form.querySelector("#telefon")?.value.trim() || "";
  const email = form.querySelector("#email")?.value.trim() || "";
  const adminSifre = form.querySelector("#adminSifre")?.value || "";

  console.log("🔍 Form değerleri:", { okulKodu, okulAdi, il, ilce });

  // Modül yetkileri
  const modulCheckboxes = form.querySelectorAll('input[name="modul"]:checked');
  const modulYetkileri = Array.from(modulCheckboxes)
    .map((cb) => cb.value)
    .join(",");

  // Validasyon
  if (!/^\d{4,10}$/.test(okulKodu)) {
    Bildirim.error("Okul kodu 4-10 haneli rakamlardan oluşmalıdır!");
    return;
  }

  if (!okulAdi) {
    Bildirim.error("Okul adını giriniz!");
    console.error("❌ Okul adı boş!");
    return;
  }

  if (!il || !ilce || !yetkiliAd || !yetkiliUnvan) {
    Bildirim.error("Zorunlu alanları doldurunuz!");
    return;
  }

  if (modulYetkileri.length === 0) {
    Bildirim.error("En az bir modül seçmelisiniz!");
    return;
  }

  // Okul bilgileri
  const okulBilgileri = {
    okul_kodu: okulKodu,
    okul_adi: okulAdi,
    okul_sifre: okulKodu,
    admin_sifre: adminSifre,
    il: il,
    ilce: ilce,
    yetkili_ad: yetkiliAd,
    yetkili_unvan: yetkiliUnvan,
    adres: adres,
    telefon: telefon,
    email: email,
    modul_yetkileri: modulYetkileri,
  };

  console.log("📝 Okul kaydediliyor:", okulBilgileri);

  // Kaydet butonu devre dışı
  const btnKaydet = document.getElementById("btnKaydet");
  btnKaydet.disabled = true;
  btnKaydet.textContent = "Kaydediliyor...";

  try {
    const result = await ipcRenderer.invoke("create-school", okulBilgileri);

    console.log("📨 Backend cevabı:", result);

    if (result.success) {
      Bildirim.success(
        `🎉 ${okulAdi} başarıyla kaydedildi!\n\n` +
          `🔑 Okul Kodu: ${okulKodu}\n` +
          `👤 Kullanıcı Adı: admin\n` +
          `🔒 Şifre: ${adminSifre}\n\n` +
          `Bu bilgileri okula iletin!`,
        "Okul Eklendi",
        10000
      );

      closeModal("modalYeniOkul");
      form.reset();
      generatePassword();
      await loadSchools();
    } else {
      Bildirim.error(result.message || "Okul eklenemedi!");
    }
  } catch (error) {
    console.error("❌ Okul ekleme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  } finally {
    btnKaydet.disabled = false;
    btnKaydet.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Okulu Kaydet
    `;
  }
}

// ==========================================
// OKUL DÜZENLE - İYİLEŞTİRİLMİŞ
// ==========================================

async function duzenleOkul(okulId) {
  console.log("✏️ Okul düzenleme:", okulId);

  const okul = allSchools.find((o) => o.id === okulId);

  if (!okul) {
    Bildirim.error("Okul bulunamadı!");
    return;
  }

  console.log("📋 Okul bulundu:", okul);

  // Form alanlarını doldur
  document.getElementById("editOkulId").value = okul.id;
  document.getElementById("editOkulKodu").value = okul.okul_kodu;
  document.getElementById("editOkulAdi").value = okul.okul_adi;
  document.getElementById("editIl").value = okul.il;
  document.getElementById("editIlce").value = okul.ilce;
  document.getElementById("editYetkiliAd").value = okul.yetkili_ad || "";
  document.getElementById("editYetkiliUnvan").value = okul.yetkili_unvan || "";
  document.getElementById("editAdres").value = okul.adres || "";
  document.getElementById("editTelefon").value = okul.telefon || "";
  document.getElementById("editEmail").value = okul.email || "";

  console.log("✅ Form alanları dolduruldu");
  console.log("📍 Adres değeri:", okul.adres);

  // Modalı aç
  openModal("modalDuzenleOkul");
}

// ==========================================
// LİSANS YENİLE - MODERN BİLDİRİM İLE
// ==========================================

async function lisansYenile(okulId) {
  const okul = allSchools.find((o) => o.id === okulId);

  if (!okul) {
    Bildirim.error("Okul bulunamadı!");
    return;
  }

  try {
    const onay = await Bildirim.confirm(
      `${okul.okul_adi} okulunun lisansını 1 yıl uzatmak istiyor musunuz?\n\n` +
        `📅 Mevcut bitiş: ${new Date(okul.lisans_bitis).toLocaleDateString(
          "tr-TR"
        )}\n` +
        `📅 Yeni bitiş: ${new Date(
          new Date(okul.lisans_bitis).setFullYear(
            new Date(okul.lisans_bitis).getFullYear() + 1
          )
        ).toLocaleDateString("tr-TR")}`,
      "Lisans Yenileme",
      {
        icon: "🔑",
        confirmText: "1 Yıl Uzat",
        cancelText: "İptal",
        type: "info",
      }
    );

    if (!onay) {
      console.log("❌ Kullanıcı lisans yenilemeyi iptal etti");
      return;
    }

    const result = await ipcRenderer.invoke("renew-license", okulId, 1);

    if (result.success) {
      Bildirim.success(
        `✓ ${okul.okul_adi} lisansı 1 yıl uzatıldı!\n\n` +
          `📅 Yeni bitiş tarihi: ${result.yeni_bitis}`,
        "Lisans Yenilendi",
        5000
      );
      await loadSchools();
    } else {
      Bildirim.error(result.message || "Lisans yenilenemedi!");
    }
  } catch (error) {
    console.error("❌ Lisans yenileme hatası:", error);
    Bildirim.error("Lisans yenilenemedi: " + error.message);
  }
}

// ==========================================
// OKUL SİL - MODERN BİLDİRİM VERSİYONU
// ==========================================

async function silOkul(okulId, okulAdi) {
  console.log("🗑️ === OKUL SİLME BAŞLADI ===");
  console.log("📋 Okul ID:", okulId);
  console.log("📋 Okul Adı:", okulAdi);

  try {
    // MODERN CONFIRM KULLAN
    const onay = await Bildirim.confirm(
      `"${okulAdi}" okulunu silmek istediğinize emin misiniz?\n\n` +
        `⚠️ Bu işlem geri alınamaz!\n` +
        `Okulun tüm verileri silinecektir.`,
      "Okul Silme Onayı",
      {
        icon: "🗑️",
        confirmText: "Evet, Sil",
        cancelText: "İptal",
        type: "danger",
      }
    );

    console.log("✅ Kullanıcı onayı:", onay);

    if (!onay) {
      console.log("❌ Kullanıcı iptal etti, çıkılıyor...");
      return;
    }

    console.log("🔄 Backend'e istek gönderiliyor...");

    const result = await ipcRenderer.invoke("delete-school", okulId);

    console.log("📨 Backend cevabı:", result);

    if (result.success) {
      console.log("✅ Okul başarıyla silindi");

      Bildirim.success(`✓ ${okulAdi} başarıyla silindi!`, "Başarılı", 3000);

      // LİSTEYİ YENİLE
      console.log("🔄 Liste yenileniyor...");
      await loadSchools();
      console.log("✅ Liste yenilendi");
    } else {
      console.error("❌ Silme başarısız:", result.message);
      Bildirim.error(result.message || "Okul silinemedi!");
    }
  } catch (error) {
    console.error("❌ HATA:", error);
    Bildirim.error("Okul silinemedi: " + error.message);
  }

  console.log("🏁 === OKUL SİLME BİTTİ ===");
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function initEventListeners() {
  // Yeni okul butonu
  btnYeniOkul.addEventListener("click", () => {
    openModal("modalYeniOkul");
  });

  // Yeni okul formu
  const formElement = document.getElementById("formYeniOkul");
  if (formElement) {
    formElement.addEventListener("submit", handleFormSubmit);
  }

  // DÜZENLEME FORMU - YENİ EKLENEN ↓
  const formDuzenleElement = document.getElementById("formDuzenleOkul");
  if (formDuzenleElement) {
    formDuzenleElement.addEventListener("submit", handleEditFormSubmit);
  }

  // Arama
  searchInput.addEventListener("input", applyFilters);

  // Filtre butonu
  btnFiltrele.addEventListener("click", applyFilters);

  // Filtre değişikliği
  filterIl.addEventListener("change", applyFilters);
  filterLisans.addEventListener("change", applyFilters);

  // Çıkış
  logoutBtn.addEventListener("click", handleLogout);

  // Okul kodu - sadece rakam
  document.getElementById("okulKodu").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  });

  // Telefon formatla
  document.getElementById("telefon").addEventListener("input", formatPhone);
}

// ==========================================
// MODAL FONKSİYONLARI
// ==========================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.opacity = "0";

  setTimeout(() => {
    modal.style.display = "none";
    modal.style.opacity = "1";
    document.body.style.overflow = "auto";
  }, 300);
}

// Modal dışına tıklayınca kapat
document.querySelectorAll(".modal-overlay").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal(modal.id);
    }
  });
});

// ESC ile kapat
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      if (modal.style.display === "flex") {
        closeModal(modal.id);
      }
    });
  }
});

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

function formatPhone(e) {
  let value = e.target.value.replace(/\D/g, "");
  if (value.length > 0) {
    value = value.match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
    e.target.value = !value[2]
      ? value[1]
      : value[1] +
        " (" +
        value[2] +
        ") " +
        value[3] +
        (value[4] ? " " + value[4] : "") +
        (value[5] ? " " + value[5] : "");
  }
}

function handleLogout() {
  const confirmed = confirm("Çıkış yapmak istediğinize emin misiniz?");
  if (confirmed) {
    sessionStorage.clear();
    window.location.href = "giris.html";
  }
}

// ==========================================
// OKUL DÜZENLEME FORM SUBMIT - İYİLEŞTİRİLMİŞ
// ==========================================

async function handleEditFormSubmit(e) {
  e.preventDefault();

  console.log("📝 Düzenleme form submit");

  const form = e.target;

  const okulId = form.querySelector("#editOkulId")?.value;
  const okulAdi = form.querySelector("#editOkulAdi")?.value.trim();
  const il = form.querySelector("#editIl")?.value.trim();
  const ilce = form.querySelector("#editIlce")?.value.trim();
  const yetkiliAd = form.querySelector("#editYetkiliAd")?.value.trim();
  const yetkiliUnvan = form.querySelector("#editYetkiliUnvan")?.value;
  const adres = form.querySelector("#editAdres")?.value.trim();
  const telefon = form.querySelector("#editTelefon")?.value.trim();
  const email = form.querySelector("#editEmail")?.value.trim();

  console.log("📦 Form değerleri:", {
    okulId,
    okulAdi,
    il,
    ilce,
    yetkiliAd,
    yetkiliUnvan,
    adres,
    telefon,
    email,
  });

  if (!okulAdi || !il || !ilce || !yetkiliAd || !yetkiliUnvan) {
    Bildirim.error("Zorunlu alanları doldurunuz!");
    return;
  }

  const guncelBilgiler = {
    okul_adi: okulAdi,
    il: il,
    ilce: ilce,
    yetkili_ad: yetkiliAd,
    yetkili_unvan: yetkiliUnvan,
    adres: adres,
    telefon: telefon,
    email: email,
  };

  console.log("📝 Backend'e gönderiliyor:", okulId, guncelBilgiler);

  const btnGuncelle = document.getElementById("btnGuncelle");
  btnGuncelle.disabled = true;
  btnGuncelle.textContent = "Güncelleniyor...";

  try {
    Bildirim.showLoading("Güncelleniyor...");

    const result = await ipcRenderer.invoke(
      "update-school",
      okulId,
      guncelBilgiler
    );

    console.log("📨 Güncelleme cevabı:", result);

    if (result.success) {
      console.log("✅ Güncelleme başarılı");
      Bildirim.success(`✓ ${okulAdi} başarıyla güncellendi!`);
      closeModal("modalDuzenleOkul");

      // Listeyi yenile
      console.log("🔄 Liste yenileniyor...");
      await loadSchools();
    } else {
      console.error("❌ Güncelleme başarısız:", result.message);
      Bildirim.error(result.message || "Güncelleme başarısız!");
    }
  } catch (error) {
    console.error("❌ Güncelleme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  } finally {
    Bildirim.hideLoading();
    btnGuncelle.disabled = false;
    btnGuncelle.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Değişiklikleri Kaydet
    `;
  }
}

// ==========================================
// OKUL ŞİFRESİNİ GÖSTER (HASH DESTEKLİ + ŞİFRE SIFIRLAMA)
// ==========================================

async function sifreGoster(okulId) {
  try {
    console.log("🔑 Okul şifre görüntüleme:", okulId);

    const result = await ipcRenderer.invoke("get-school-password", okulId);

    if (!result.success) {
      Bildirim.error(result.message || "Şifre görüntülenemedi!");
      return;
    }

    const { okul_kodu, okul_adi, okul_sifre, admin_sifre, is_hashed } =
      result.data;
    const isHashed = is_hashed || false;

    // ✅ HASH'Lİ VE DÜZ ŞİFRE İÇİN FARKLI GÖSTERIM
    await Bildirim.confirm(
      `🏫 **${okul_adi}**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**📌 Okul Girişi İçin:**\n` +
        `Okul Kodu: **${okul_kodu}**\n` +
        `Kullanıcı Adı: **admin**\n\n` +
        (isHashed
          ? `**🔒 Admin Şifresi: HASH'LENMİŞ (GÜVENLİ)**\n\n` +
            `⚠️ Şifre güvenlik için hash'lenmiştir.\n` +
            `Hash değeri: \`${admin_sifre.substring(0, 40)}...\`\n\n` +
            `⚠️ **Hash'lenmiş şifre okunamaz!**\n` +
            `Şifreyi unuttuysanız **"Şifre Sıfırla"** butonuna tıklayın.\n\n`
          : `Şifre: **${admin_sifre}**\n\n`) +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*(Okul Şifresi: ${okul_sifre})*\n\n` +
        `⚠️ Bu bilgileri okul yetkilisine iletin ve güvenli bir şekilde saklayın!`,
      "Okul Giriş Bilgileri",
      {
        icon: "🔑",
        confirmText: "Tamam",
        cancelText: isHashed ? "🔄 Şifre Sıfırla" : "Kopyala",
        type: "info",
      }
    ).then(async (action) => {
      if (action === "cancel") {
        if (isHashed) {
          // ✅ ŞİFRE SIFIRLAMA
          await sifreSifirla(okulId, okul_adi, okul_kodu);
        } else {
          // KOPYALAMA
          const copyText = `Okul Kodu: ${okul_kodu}\nKullanıcı: admin\nŞifre: ${admin_sifre}`;
          navigator.clipboard.writeText(copyText);
          Bildirim.success("Giriş bilgileri kopyalandı!");
        }
      }
    });
  } catch (error) {
    console.error("❌ Şifre görüntüleme hatası:", error);
    Bildirim.error("Şifre görüntülenemedi: " + error.message);
  }
}

// ==========================================
// 🔄 ŞİFRE SIFIRLAMA FONKSİYONU (YENİ!)
// ==========================================

async function sifreSifirla(okulId, okulAdi, okulKodu) {
  try {
    // 1. YENİ ŞİFRE İSTE
    const yeniSifre = await Bildirim.prompt(
      `**🏫 Okul:** ${okulAdi}\n` +
        `**🔢 Okul Kodu:** ${okulKodu}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**🔒 Yeni Şifre Girin:**\n\n` +
        `⚠️ **Güçlü şifre kullanın:**\n` +
        `• En az 8 karakter\n` +
        `• Büyük/küçük harf, rakam ve özel karakter\n` +
        `• Şifreyi güvenli bir yerde saklayın`,
      "🔄 Şifre Sıfırla",
      {
        icon: "⚠️",
        confirmText: "✅ Sıfırla",
        cancelText: "İptal",
        type: "warning",
        placeholder: "Yeni şifre girin...",
      }
    );

    if (!yeniSifre || yeniSifre.trim() === "") {
      Bildirim.info("Şifre sıfırlama iptal edildi.");
      return;
    }

    if (yeniSifre.length < 4) {
      Bildirim.error("Şifre en az 4 karakter olmalıdır!");
      return;
    }

    console.log("🔄 Şifre sıfırlanıyor...");

    // 2. ŞİFREYİ SIFIRLA
    const result = await ipcRenderer.invoke(
      "reset-school-password",
      okulId,
      yeniSifre
    );

    if (result.success) {
      // 3. BAŞARILI MESAJI
      await Bildirim.confirm(
        `**✅ Şifre Başarıyla Sıfırlandı!**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🏫 **Okul:** ${result.okul_adi}\n` +
          `🔢 **Okul Kodu:** ${result.okul_kodu}\n\n` +
          `🔒 **Yeni Şifre:**\n` +
          `**\`${result.yeni_sifre}\`**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ **ÖNEMLİ:**\n` +
          `• Bu şifreyi güvenli bir yerde saklayın!\n` +
          `• Şifre hash'lenerek veritabanına kaydedildi.\n` +
          `• Bir daha görüntülenemez!`,
        "Şifre Sıfırlandı",
        {
          icon: "✅",
          confirmText: "Tamam",
          cancelText: "📋 Kopyala",
          type: "success",
        }
      ).then((action) => {
        if (action === "cancel") {
          // KOPYALA
          navigator.clipboard.writeText(result.yeni_sifre);
          Bildirim.success("Yeni şifre kopyalandı!");
        }
      });

      // 4. LİSTEYİ YENİLE
      okullariYukle();
    } else {
      Bildirim.error(result.message || "Şifre sıfırlanamadı!");
    }
  } catch (error) {
    console.error("❌ Şifre sıfırlama hatası:", error);
    Bildirim.error("Şifre sıfırlanırken hata oluştu: " + error.message);
  }
}

console.log("✅ Okul yönetimi scripti yüklendi");
