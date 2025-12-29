// ==========================================
// OKUL YÖNETİMİ SAYFASI
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let currentUser = null;
let userType = null;
let schoolInfo = null;
let allSchools = [];
let filteredSchools = [];

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

    // Kullanıcı bilgilerini güncelle
    document.getElementById("userName").textContent = currentUser.ad_soyad;
    document.getElementById("userRole").textContent = getRoleName(
      currentUser.rol
    );

    const initials = currentUser.ad_soyad
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
    document.getElementById("userInitials").textContent = initials;

    // Okul adı
    if (schoolInfo) {
      document.getElementById("okulAdi").textContent = schoolInfo.okul_adi;
    } else {
      document.getElementById("okulAdi").textContent = "Super Admin";
    }

    // Yetki kontrolü - Sadece super admin okullar sayfasına erişebilir
    if (userType !== "super_admin") {
      Bildirim.error("Bu sayfaya erişim yetkiniz yok!");
      setTimeout(() => {
        window.location.href = "anasayfa.html";
      }, 2000);
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
  };
  return roles[rol] || rol;
}

// ==========================================
// OKULLARI YÜKLE - SONSUZ DÖNGÜ KORONMESİ İLE
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
                    <span class="license-badge ${lisansClass}">
                        ${lisansBadge}
                    </span>
                    <br>
                    <small style="color: var(--text-muted); font-size: 11px;">
                        ${new Date(okul.lisans_bitis).toLocaleDateString(
                          "tr-TR"
                        )}
                    </small>
                </td>
                <td>
                    <div class="action-buttons">
  <button class="btn-action edit" onclick="duzenleOkul(${
    okul.id
  })" title="Düzenle">
    ✏️
  </button>
  <button class="btn-action" onclick="sifreGoster(${
    okul.id
  })" title="Şifre Göster" style="background: rgba(0, 217, 255, 0.2); color: #00d9ff;">
    👁️
  </button>
  <button class="btn-action license" onclick="lisansYenile(${
    okul.id
  })" title="Lisans Yenile">
    🔑
  </button>
  <button class="btn-action delete" onclick="silOkul(${okul.id}, '${
      okul.okul_adi
    }')" title="Sil">
    🗑️
  </button>
</div>
                </td>
            </tr>
        `;
  });

  okullarTbody.innerHTML = html;
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
// OKUL ŞİFRESİNİ GÖSTER
// ==========================================

async function sifreGoster(okulId) {
  try {
    console.log("🔑 Okul şifre görüntüleme:", okulId);

    const result = await ipcRenderer.invoke("get-school-password", okulId);

    if (result.success) {
      const { okul_kodu, okul_adi, okul_sifre, admin_sifre } = result.data;

      await Bildirim.confirm(
        `🏫 **${okul_adi}**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `**📌 Okul Girişi İçin:**\n` +
          `Okul Kodu: **${okul_kodu}**\n` +
          `Kullanıcı Adı: **admin**\n` +
          `Şifre: **${admin_sifre}**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `*(Okul Şifresi: ${okul_sifre})*\n\n` +
          `⚠️ Bu bilgileri okul yetkilisine iletin ve güvenli bir şekilde saklayın!`,
        "Okul Giriş Bilgileri",
        {
          icon: "🔑",
          confirmText: "Tamam",
          cancelText: null,
          type: "info",
        }
      );
    } else {
      Bildirim.error(result.message || "Şifre görüntülenemedi!");
    }
  } catch (error) {
    console.error("❌ Şifre görüntüleme hatası:", error);
    Bildirim.error("Şifre görüntülenemedi: " + error.message);
  }
}

console.log("✅ Okul yönetimi scripti yüklendi");
