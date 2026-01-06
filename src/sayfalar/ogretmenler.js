// ==========================================
// ÖĞRETMEN YÖNETİMİ SAYFASI
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let currentUser = null;
let userType = null;
let schoolInfo = null;
let allTeachers = [];
let filteredTeachers = [];
let currentStep = 1;
const totalSteps = 6;

// Sayfalama
let currentPage = 1;
const itemsPerPage = 10;

// DOM elemanları
const btnYeniOgretmen = document.getElementById("btnYeniOgretmen");
const modalYeniOgretmen = document.getElementById("modalYeniOgretmen");
const formYeniOgretmen = document.getElementById("formYeniOgretmen");
const ogretmenlerTbody = document.getElementById("ogretmenlerTbody");
const searchInput = document.getElementById("searchInput");
const filterUnvan = document.getElementById("filterUnvan");
const filterDurum = document.getElementById("filterDurum");
const filterSiralama = document.getElementById("filterSiralama");
const btnFiltrele = document.getElementById("btnFiltrele");
const logoutBtn = document.getElementById("logoutBtn");

// Step butonları
const btnPrevStep = document.getElementById("btnPrevStep");
const btnNextStep = document.getElementById("btnNextStep");
const btnKaydet = document.getElementById("btnKaydet");

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Öğretmen yönetimi sayfası yüklendi");

  // Kullanıcı bilgilerini yükle
  loadUserInfo();

  // Öğretmenleri yükle
  await loadTeachers();

  // Event listener'ları ekle
  initEventListeners();

  // Görev yeri otomatik doldur
  if (schoolInfo) {
    document.getElementById("gorevYeri").value = schoolInfo.okul_adi;
  }
});

// ==========================================
// KULLANICI BİLGİLERİ (GÜNCELLENMİŞ & TAMİR EDİLMİŞ)
// ==========================================

/**
 * Rol ismini kullanıcı dostu metne çevirir
 */
function getRoleName(rol) {
  const roles = {
    super_admin: "Sistem Yöneticisi",
    okul_admin: "Okul Yöneticisi",
    ogretmen: "Öğretmen",
  };
  return roles[rol] || rol;
}

/**
 * Oturum bilgilerini yükler ve UI elemanlarını doldurur
 */
function loadUserInfo() {
  console.log("🔍 OGRETMENLER SAYFASI - OTURUM KONTROLÜ BAŞLADI");

  const currentUserStr = localStorage.getItem("currentUser");
  const currentSchoolStr = localStorage.getItem("currentSchool");

  // Konsolda verileri doğrula
  console.log("📦 CurrentUser Verisi:", currentUserStr);
  console.log("🏫 CurrentSchool Verisi:", currentSchoolStr);

  if (!currentUserStr) {
    console.error("❌ HATA: currentUserStr bulunamadı!");
    window.location.href = "giris.html";
    return;
  }

  try {
    currentUser = JSON.parse(currentUserStr);

    // Anasayfadan gelen tamir edilmiş veriyi kullan veya currentUser'a güven
    schoolInfo = currentSchoolStr ? JSON.parse(currentSchoolStr) : currentUser;

    // Eksik alanları manuel tamamla (Hata almamak için)
    if (!currentUser.ad_soyad) {
      currentUser.ad_soyad = currentUser.kullanici_adi || "Yönetici";
    }

    if (!schoolInfo.okul_adi) {
      schoolInfo.okul_adi = "Okul Belirtilmemiş";
    }

    // Kullanıcı tipi belirle
    userType =
      currentUser.rol === "super_admin" ? "super_admin" : "school_user";

    console.log("👤 UserType:", userType);
    console.log("✅ Veri Hazır. UI güncelleniyor...");

    // DOM Elemanlarını Güncelle
    const userNameEl = document.getElementById("userName");
    const userRoleEl = document.getElementById("userRole");
    const userInitialsEl = document.getElementById("userInitials");
    const okulAdiEl = document.getElementById("okulAdi");

    // İsim bilgisi
    if (userNameEl) {
      userNameEl.textContent = currentUser.ad_soyad;
    }

    // Rol bilgisi (getRoleName artık burada tanımlı olduğu için hata vermez)
    if (userRoleEl) {
      userRoleEl.textContent = getRoleName(currentUser.rol);
    }

    // İnisiyaller (Profil resmi yerine harfler)
    if (userInitialsEl && currentUser.ad_soyad) {
      const initials = currentUser.ad_soyad
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
      userInitialsEl.textContent = initials;
    }

    // Okul adı bilgisi
    if (okulAdiEl && schoolInfo) {
      okulAdiEl.textContent = schoolInfo.okul_adi;
    }

    console.log("✨ UI Güncelleme Tamamlandı.");
  } catch (error) {
    console.error("❌ KRİTİK HATA (Parse veya UI):", error);
    // Hata mesajını konsola yazıyoruz ama kullanıcıyı her seferinde dışarı atmıyoruz
  }
}

// ==========================================
// ÖĞRETMENLERİ YÜKLE
// ==========================================

async function loadTeachers() {
  try {
    console.log("📋 Öğretmenler yükleniyor...");

    const result = await ipcRenderer.invoke("get-all-teachers");

    if (result.success) {
      allTeachers = result.data;
      filteredTeachers = [...allTeachers];

      console.log(`✅ ${allTeachers.length} öğretmen yüklendi`);

      renderTeachers();
      updateStats();
      updateFilters();

      if (window.teachersLoadedOnce) {
        Bildirim.success(
          `${allTeachers.length} öğretmen yüklendi!`,
          null,
          2000
        );
      }
      window.teachersLoadedOnce = true;
    } else {
      Bildirim.error(result.message || "Öğretmenler yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  }
}

// ==========================================
// ÖĞRETMENLERİ GÖSTER
// ==========================================

function renderTeachers() {
  if (filteredTeachers.length === 0) {
    ogretmenlerTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 60px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
            Öğretmen bulunamadı
          </div>
          <div style="font-size: 14px; color: var(--text-secondary);">
            Arama kriterlerinizi değiştirmeyi deneyin
          </div>
        </td>
      </tr>
    `;
    document.getElementById("pagination").style.display = "none";
    return;
  }

  // Sayfalama hesapla
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex);

  let html = "";

  paginatedTeachers.forEach((ogretmen, index) => {
    const durumBadge =
      ogretmen.durum === 1
        ? '<span class="license-badge aktif">✓ Aktif</span>'
        : '<span class="license-badge bitmis">✕ Pasif</span>';

    html += `
      <tr style="animation: fadeIn 0.5s ease ${index * 0.05}s both;">
        <td>${startIndex + index + 1}</td>
        <td><strong style="color: var(--primary); font-family: monospace;">${
          ogretmen.tc_no
        }</strong></td>
        <td><strong>${ogretmen.ad_soyad}</strong></td>
        <td><span style="background: rgba(123, 47, 255, 0.2); color: #7b2fff; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${
          ogretmen.kisa_ad
        }</span></td>
        <td>${ogretmen.unvan || "-"}</td>
        <td>${ogretmen.gorev || "-"}</td>
        <td>${durumBadge}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action edit" onclick="duzenleOgretmen(${
              ogretmen.id
            })" title="Düzenle">
              ✏️
            </button>
            <button class="btn-action" onclick="sifreGoster(${ogretmen.id}, '${
      ogretmen.ad_soyad
    }')" title="Şifre Göster" style="background: rgba(0, 217, 255, 0.2); color: #00d9ff;">
              👁️
            </button>
            <button class="btn-action license" onclick="sifreSifirla(${
              ogretmen.id
            }, '${ogretmen.ad_soyad}')" title="Şifre Sıfırla">
              🔑
            </button>
            <button class="btn-action delete" onclick="silOgretmen(${
              ogretmen.id
            }, '${ogretmen.ad_soyad}')" title="Sil">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  ogretmenlerTbody.innerHTML = html;

  // Sayfalama göster
  updatePagination();
}

// ==========================================
// İSTATİSTİKLERİ GÜNCELLE
// ==========================================

function updateStats() {
  const toplam = allTeachers.length;
  const aktif = allTeachers.filter((o) => o.durum === 1).length;
  const pasif = allTeachers.filter((o) => o.durum === 0).length;

  document.getElementById("statToplam").textContent = toplam;
  document.getElementById("statAktif").textContent = aktif;
  document.getElementById("statPasif").textContent = pasif;
}

// ==========================================
// FİLTRELERİ GÜNCELLE
// ==========================================

function updateFilters() {
  // Ünvan listesi
  const unvanlar = [...new Set(allTeachers.map((o) => o.unvan))].sort();

  filterUnvan.innerHTML = '<option value="">Tüm Ünvanlar</option>';
  unvanlar.forEach((unvan) => {
    if (unvan) {
      filterUnvan.innerHTML += `<option value="${unvan}">${unvan}</option>`;
    }
  });
}

// ==========================================
// FİLTRELE
// ==========================================

function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedUnvan = filterUnvan.value;
  const selectedDurum = filterDurum.value;
  const siralama = filterSiralama.value;

  filteredTeachers = allTeachers.filter((ogretmen) => {
    const matchesSearch =
      !searchTerm ||
      ogretmen.ad_soyad.toLowerCase().includes(searchTerm) ||
      ogretmen.tc_no.includes(searchTerm);

    const matchesUnvan = !selectedUnvan || ogretmen.unvan === selectedUnvan;
    const matchesDurum =
      !selectedDurum || ogretmen.durum === parseInt(selectedDurum);

    return matchesSearch && matchesUnvan && matchesDurum;
  });

  // Sıralama
  filteredTeachers.sort((a, b) => {
    if (siralama === "ad_soyad") {
      return a.ad_soyad.localeCompare(b.ad_soyad, "tr");
    } else if (siralama === "tc_no") {
      return a.tc_no.localeCompare(b.tc_no);
    } else if (siralama === "unvan") {
      return (a.unvan || "").localeCompare(b.unvan || "", "tr");
    }
    return 0;
  });

  currentPage = 1; // Filtreleme sonrası ilk sayfaya dön
  renderTeachers();

  if (searchTerm || selectedUnvan || selectedDurum) {
    Bildirim.info(`${filteredTeachers.length} öğretmen bulundu`);
  }
}

// ==========================================
// SAYFALAMA
// ==========================================

function updatePagination() {
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const pagination = document.getElementById("pagination");
  const paginationInfo = document.getElementById("paginationInfo");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  if (totalPages <= 1) {
    pagination.style.display = "none";
    return;
  }

  pagination.style.display = "flex";

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(
    currentPage * itemsPerPage,
    filteredTeachers.length
  );

  paginationInfo.textContent = `${startIndex}-${endIndex} / ${filteredTeachers.length}`;

  btnPrevPage.disabled = currentPage === 1;
  btnNextPage.disabled = currentPage === totalPages;
}

// ==========================================
// MULTI-STEP FORM
// ==========================================

function goToStep(step) {
  if (step < 1 || step > totalSteps) return;

  currentStep = step;

  // Tüm step içeriklerini gizle
  document.querySelectorAll(".form-step-content").forEach((content) => {
    content.classList.remove("active");
  });

  // İlgili step'i göster
  document
    .querySelector(`.form-step-content[data-step="${step}"]`)
    .classList.add("active");

  // Step indicator güncelle
  document.querySelectorAll(".form-step").forEach((stepEl) => {
    const stepNum = parseInt(stepEl.dataset.step);
    if (stepNum < step) {
      stepEl.classList.add("completed");
      stepEl.classList.remove("active");
    } else if (stepNum === step) {
      stepEl.classList.add("active");
      stepEl.classList.remove("completed");
    } else {
      stepEl.classList.remove("active", "completed");
    }
  });

  // Buton görünürlüğü
  btnPrevStep.style.display = step === 1 ? "none" : "inline-flex";
  btnNextStep.style.display = step === totalSteps ? "none" : "inline-flex";
  btnKaydet.style.display = step === totalSteps ? "inline-flex" : "none";
}

function nextStep() {
  if (validateCurrentStep()) {
    goToStep(currentStep + 1);
  }
}

function prevStep() {
  goToStep(currentStep - 1);
}

function validateCurrentStep() {
  const currentContent = document.querySelector(
    `.form-step-content[data-step="${currentStep}"]`
  );
  const requiredInputs = currentContent.querySelectorAll("[required]");

  for (let input of requiredInputs) {
    if (!input.value.trim()) {
      input.focus();
      Bildirim.error(
        `Lütfen "${input.previousElementSibling.textContent}" alanını doldurun!`
      );
      return false;
    }

    // TC No validasyonu
    if (input.id === "tcNo" && !/^\d{11}$/.test(input.value)) {
      input.focus();
      Bildirim.error("TC Kimlik No 11 haneli rakamlardan oluşmalıdır!");
      return false;
    }
  }

  return true;
}

// ==========================================
// KISA AD OTOMATİK OLUŞTUR
// ==========================================

document.getElementById("adSoyad").addEventListener("input", (e) => {
  const adSoyad = e.target.value.trim().toUpperCase();
  const parts = adSoyad.split(" ");

  if (parts.length >= 2) {
    const ad = parts[0];
    const soyad = parts[parts.length - 1];
    const kisaAd = `${ad.charAt(0)}.${soyad.substring(0, 3)}`;
    document.getElementById("kisaAd").value = kisaAd;
  } else {
    document.getElementById("kisaAd").value = "";
  }
});

// ==========================================
// AİLE DURUMU DEĞİŞİNCE ÇOCUK ALANLARI
// ==========================================

document.getElementById("aileDurumu").addEventListener("change", (e) => {
  const cocuk0_6Group = document.getElementById("cocuk0_6Group");
  const cocuk6UstuGroup = document.getElementById("cocuk6UstuGroup");

  if (e.target.value === "Evli") {
    cocuk0_6Group.style.display = "block";
    cocuk6UstuGroup.style.display = "block";
  } else {
    cocuk0_6Group.style.display = "none";
    cocuk6UstuGroup.style.display = "none";
    document.getElementById("cocuk0_6").value = "0";
    document.getElementById("cocuk6Ustu").value = "0";
  }
});

// ==========================================
// AYRILMA TARİHİ GİRİLİNCE
// ==========================================

document.getElementById("ayrilmaTarihi").addEventListener("change", (e) => {
  const ayrilisNedeni = document.getElementById("ayrilisNedeni");
  const durum = document.getElementById("durum");

  if (e.target.value) {
    ayrilisNedeni.disabled = false;
    ayrilisNedeni.required = true;
    durum.value = "0"; // Otomatik pasif yap

    Bildirim.warning(
      "⚠️ Ayrılma tarihi girildiği için öğretmen pasif duruma alınacaktır!"
    );
  } else {
    ayrilisNedeni.disabled = true;
    ayrilisNedeni.required = false;
    ayrilisNedeni.value = "";
  }
});

console.log("✅ Öğretmen yönetimi scripti yüklendi (Part 1)");
// ==========================================
// YENİ ÖĞRETMEN EKLE - FORM SUBMIT
// (güncellendi: edit modu kontrolü ve update-teacher çağrısı)
// ==========================================
async function handleFormSubmit(e) {
  e.preventDefault();

  console.log("📝 Form submit tetiklendi");

  // Son adım validasyonu
  if (!validateCurrentStep()) {
    return;
  }

  const form = e.target;

  // Tüm form verilerini topla
  const ogretmenBilgileri = {
    // Kimlik
    tc_no: form.querySelector("#tcNo")?.value.trim() || "",
    ad_soyad: form.querySelector("#adSoyad")?.value.trim() || "",
    kisa_ad: form.querySelector("#kisaAd")?.value.trim() || "",
    brans: form.querySelector("#brans")?.value || "", // branş alanı (HTML'de olmalı)
    cinsiyet: form.querySelector("#cinsiyet")?.value || "",
    dogum_tarihi: form.querySelector("#dogumTarihi")?.value || null,
    dogum_yeri: form.querySelector("#dogumYeri")?.value.trim() || null,
    baba_adi: form.querySelector("#babaAdi")?.value.trim() || null,

    // Görev
    unvan: form.querySelector("#unvan")?.value || "",
    kariyer: form.querySelector("#kariyer")?.value || "",
    gorev: form.querySelector("#gorev")?.value || "",
    durum: parseInt(form.querySelector("#durum")?.value) || 1,
    gorev_yeri: form.querySelector("#gorevYeri")?.value.trim() || null,
    goreve_baslama: form.querySelector("#goreveBaslama")?.value || null,
    kurumda_baslama: form.querySelector("#kurumdaBaslama")?.value || null,

    // Akademik
    ogrenim_durumu: form.querySelector("#ogrenimDurumu")?.value || null,
    mezun_universite:
      form.querySelector("#mezunUniversite")?.value.trim() || null,
    derece: form.querySelector("#derece")?.value
      ? parseInt(form.querySelector("#derece").value)
      : null,
    kademe: form.querySelector("#kademe")?.value
      ? parseInt(form.querySelector("#kademe").value)
      : null,
    emekli_sicil_no: form.querySelector("#emekliSicilNo")?.value.trim() || null,
    kbs_personel_no: form.querySelector("#kbsPersonelNo")?.value.trim() || null,

    // Mali
    iban: form.querySelector("#iban")?.value.trim() || null,
    banka_subesi: form.querySelector("#bankaSubesi")?.value.trim() || null,
    yabanci_dil_tazminati:
      form.querySelector("#yabanciDilTazminati")?.value || null,
    ek_gosterge: form.querySelector("#ekGosterge")?.value.trim() || null,

    // Aile & İletişim
    aile_durumu: form.querySelector("#aileDurumu")?.value || null,
    cocuk_0_6: parseInt(form.querySelector("#cocuk0_6")?.value) || 0,
    cocuk_6_ustu: parseInt(form.querySelector("#cocuk6Ustu")?.value) || 0,
    bes: form.querySelector("#bes")?.value || null,
    telefon: form.querySelector("#telefon")?.value.trim() || null,
    email: form.querySelector("#email")?.value.trim() || null,
    adres: form.querySelector("#adres")?.value.trim() || null,

    // Ayrılma
    ayrilma_tarihi: form.querySelector("#ayrilmaTarihi")?.value || null,
    ayrilis_nedeni: form.querySelector("#ayrilisNedeni")?.value || null,
  };

  console.log("📝 Öğretmen kaydediliyor:", ogretmenBilgileri);

  // Kaydet butonu devre dışı
  const btnKaydet = document.getElementById("btnKaydet");
  btnKaydet.disabled = true;
  btnKaydet.textContent = "Kaydediliyor...";

  try {
    // Eğer form.dataset.editId varsa -> düzenleme modu
    const editId = form.dataset.editId ? parseInt(form.dataset.editId) : null;
    let result;

    if (editId) {
      console.log("🔁 Düzenleme modu: update-teacher çağrılıyor. ID:", editId);

      // update-teacher expects (id, fields) on backend
      result = await ipcRenderer.invoke(
        "update-teacher",
        editId,
        ogretmenBilgileri
      );

      console.log("📨 Backend (update) cevabı:", result);

      if (result.success) {
        Bildirim.success(
          `✓ ${ogretmenBilgileri.ad_soyad} başarıyla güncellendi!`
        );
        // temizle edit flag
        delete form.dataset.editId;
        closeModal("modalYeniOgretmen");
        form.reset();
        goToStep(1);
        await loadTeachers();
        return;
      } else {
        Bildirim.error(result.message || "Güncelleme başarısız!");
      }
    } else {
      console.log("➕ Yeni kayıt modu: create-teacher çağrılıyor.");
      result = await ipcRenderer.invoke("create-teacher", ogretmenBilgileri);

      console.log("📨 Backend (create) cevabı:", result);

      if (result.success) {
        // Şifre göster modal
        showPasswordModal(
          result.data.tc_no,
          result.data.otomatik_sifre,
          result.data.ad_soyad
        );

        closeModal("modalYeniOgretmen");
        form.reset();
        goToStep(1);
        await loadTeachers();

        Bildirim.success(
          `🎉 ${result.data.ad_soyad} başarıyla kaydedildi!`,
          "Öğretmen Eklendi",
          5000
        );
      } else {
        Bildirim.error(result.message || "Öğretmen eklenemedi!");
      }
    }
  } catch (error) {
    console.error("❌ Öğretmen ekleme/güncelleme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + (error.message || error));
  } finally {
    btnKaydet.disabled = false;
    btnKaydet.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Öğretmeni Kaydet
    `;
  }
}

// ==========================================
// ŞİFRE GÖSTER MODAL
// ==========================================
function showPasswordModal(tcNo, sifre, adSoyad) {
  document.getElementById("sifreModalTcNo").textContent = tcNo;
  document.getElementById("sifreModalSifre").textContent = sifre;

  openModal("modalSifreGoster");
  setTimeout(() => closeModal("modalSifreGoster"), 10000);
}

// ==========================================
// YENİ ÖĞRETMEN EKLE - FORM SUBMIT
// (güncellendi: edit modu kontrolü ve update-teacher çağrısı)
// ==========================================
async function handleFormSubmit(e) {
  e.preventDefault();

  console.log("📝 Form submit tetiklendi");

  // Son adım validasyonu
  if (!validateCurrentStep()) {
    return;
  }

  const form = e.target;

  // Tüm form verilerini topla
  const ogretmenBilgileri = {
    // Kimlik
    tc_no: form.querySelector("#tcNo")?.value.trim() || "",
    ad_soyad: form.querySelector("#adSoyad")?.value.trim() || "",
    kisa_ad: form.querySelector("#kisaAd")?.value.trim() || "",
    brans: form.querySelector("#brans")?.value || "", // branş alanı (HTML'de olmalı)
    cinsiyet: form.querySelector("#cinsiyet")?.value || "",
    dogum_tarihi: form.querySelector("#dogumTarihi")?.value || null,
    dogum_yeri: form.querySelector("#dogumYeri")?.value.trim() || null,
    baba_adi: form.querySelector("#babaAdi")?.value.trim() || null,

    // Görev
    unvan: form.querySelector("#unvan")?.value || "",
    kariyer: form.querySelector("#kariyer")?.value || "",
    gorev: form.querySelector("#gorev")?.value || "",
    durum: parseInt(form.querySelector("#durum")?.value) || 1,
    gorev_yeri: form.querySelector("#gorevYeri")?.value.trim() || null,
    goreve_baslama: form.querySelector("#goreveBaslama")?.value || null,
    kurumda_baslama: form.querySelector("#kurumdaBaslama")?.value || null,

    // Akademik
    ogrenim_durumu: form.querySelector("#ogrenimDurumu")?.value || null,
    mezun_universite:
      form.querySelector("#mezunUniversite")?.value.trim() || null,
    derece: form.querySelector("#derece")?.value
      ? parseInt(form.querySelector("#derece").value)
      : null,
    kademe: form.querySelector("#kademe")?.value
      ? parseInt(form.querySelector("#kademe").value)
      : null,
    emekli_sicil_no: form.querySelector("#emekliSicilNo")?.value.trim() || null,
    kbs_personel_no: form.querySelector("#kbsPersonelNo")?.value.trim() || null,

    // Mali
    iban: form.querySelector("#iban")?.value.trim() || null,
    banka_subesi: form.querySelector("#bankaSubesi")?.value.trim() || null,
    yabanci_dil_tazminati:
      form.querySelector("#yabanciDilTazminati")?.value || null,
    ek_gosterge: form.querySelector("#ekGosterge")?.value.trim() || null,

    // Aile & İletişim
    aile_durumu: form.querySelector("#aileDurumu")?.value || null,
    cocuk_0_6: parseInt(form.querySelector("#cocuk0_6")?.value) || 0,
    cocuk_6_ustu: parseInt(form.querySelector("#cocuk6Ustu")?.value) || 0,
    bes: form.querySelector("#bes")?.value || null,
    telefon: form.querySelector("#telefon")?.value.trim() || null,
    email: form.querySelector("#email")?.value.trim() || null,
    adres: form.querySelector("#adres")?.value.trim() || null,

    // Ayrılma
    ayrilma_tarihi: form.querySelector("#ayrilmaTarihi")?.value || null,
    ayrilis_nedeni: form.querySelector("#ayrilisNedeni")?.value || null,
  };

  console.log("📝 Öğretmen kaydediliyor:", ogretmenBilgileri);

  // Kaydet butonu devre dışı
  const btnKaydet = document.getElementById("btnKaydet");
  btnKaydet.disabled = true;
  btnKaydet.textContent = "Kaydediliyor...";

  try {
    // Eğer form.dataset.editId varsa -> düzenleme modu
    const editId = form.dataset.editId ? parseInt(form.dataset.editId) : null;
    let result;

    if (editId) {
      console.log("🔁 Düzenleme modu: update-teacher çağrılıyor. ID:", editId);

      // update-teacher expects (id, fields) on backend
      result = await ipcRenderer.invoke(
        "update-teacher",
        editId,
        ogretmenBilgileri
      );

      console.log("📨 Backend (update) cevabı:", result);

      if (result.success) {
        Bildirim.success(
          `✓ ${ogretmenBilgileri.ad_soyad} başarıyla güncellendi!`
        );
        // temizle edit flag
        delete form.dataset.editId;
        closeModal("modalYeniOgretmen");
        form.reset();
        goToStep(1);
        await loadTeachers();
        return;
      } else {
        Bildirim.error(result.message || "Güncelleme başarısız!");
      }
    } else {
      console.log("➕ Yeni kayıt modu: create-teacher çağrılıyor.");
      result = await ipcRenderer.invoke("create-teacher", ogretmenBilgileri);

      console.log("📨 Backend (create) cevabı:", result);

      if (result.success) {
        // Şifre göster modal
        showPasswordModal(
          result.data.tc_no,
          result.data.otomatik_sifre,
          result.data.ad_soyad
        );

        closeModal("modalYeniOgretmen");
        form.reset();
        goToStep(1);
        await loadTeachers();

        Bildirim.success(
          `🎉 ${result.data.ad_soyad} başarıyla kaydedildi!`,
          "Öğretmen Eklendi",
          5000
        );
      } else {
        Bildirim.error(result.message || "Öğretmen eklenemedi!");
      }
    }
  } catch (error) {
    console.error("❌ Öğretmen ekleme/güncelleme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + (error.message || error));
  } finally {
    btnKaydet.disabled = false;
    btnKaydet.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Öğretmeni Kaydet
    `;
  }
}

// ==========================================
// ÖĞRETMEN DÜZENLE
// (güncellendi: form dataset.editId ile edit modunu ayarla, tüm stepleri aç)
// ==========================================
async function duzenleOgretmen(ogretmenId) {
  console.log("✏️ Öğretmen düzenleme:", ogretmenId);

  const ogretmen = allTeachers.find((o) => o.id === ogretmenId);

  if (!ogretmen) {
    Bildirim.error("Öğretmen bulunamadı!");
    return;
  }

  // Referans: yeni öğretmen formu
  const form = document.getElementById("formYeniOgretmen");
  if (!form) {
    console.error("❌ formYeniOgretmen bulunamadı!");
    Bildirim.error("Edit formu bulunamadı!");
    return;
  }

  // Düzenleme modu olduğunu işaretle (dataset)
  form.dataset.editId = String(ogretmen.id);

  // Tüm step içeriklerini VISIBLE / active yap (kullanıcı tüm alanları görsün)
  document.querySelectorAll(".form-step-content").forEach((content) => {
    content.classList.add("active");
  });
  // Step göstergelerini de uygun hale getir (tümünü completed yapma, istersen 1. step üzerinde bırak)
  document.querySelectorAll(".form-step").forEach((stepEl) => {
    stepEl.classList.remove("completed");
    stepEl.classList.remove("active");
  });

  // İstersen düzenleme modunda direkt ilk step'i aktif bırakabiliriz:
  document
    .querySelector(`.form-step-content[data-step="1"]`)
    .classList.add("active");
  document.querySelectorAll(".form-step").forEach((stepEl) => {
    const stepNum = parseInt(stepEl.dataset.step);
    if (stepNum === 1) {
      stepEl.classList.add("active");
    }
  });

  // Form alanlarını doldur (form içindeki alanları kullanıyoruz)
  // Kimlik
  document.getElementById("tcNo").value = ogretmen.tc_no || "";
  document.getElementById("adSoyad").value = ogretmen.ad_soyad || "";
  document.getElementById("kisaAd").value = ogretmen.kisa_ad || "";
  if (document.getElementById("brans")) {
    document.getElementById("brans").value = ogretmen.brans || "";
  }
  document.getElementById("cinsiyet").value = ogretmen.cinsiyet || "";
  document.getElementById("dogumTarihi").value = ogretmen.dogum_tarihi || "";
  document.getElementById("dogumYeri").value = ogretmen.dogum_yeri || "";
  document.getElementById("babaAdi").value = ogretmen.baba_adi || "";

  // Görev
  document.getElementById("unvan").value = ogretmen.unvan || "";
  document.getElementById("kariyer").value = ogretmen.kariyer || "";
  document.getElementById("gorev").value = ogretmen.gorev || "";
  document.getElementById("durum").value =
    ogretmen.durum != null ? String(ogretmen.durum) : "1";
  document.getElementById("gorevYeri").value =
    ogretmen.gorev_yeri || (schoolInfo ? schoolInfo.okul_adi : "");
  document.getElementById("goreveBaslama").value =
    ogretmen.goreve_baslama || "";
  document.getElementById("kurumdaBaslama").value =
    ogretmen.kurumda_baslama || "";

  // Akademik
  document.getElementById("ogrenimDurumu").value =
    ogretmen.ogrenim_durumu || "";
  document.getElementById("mezunUniversite").value =
    ogretmen.mezun_universite || "";
  document.getElementById("derece").value =
    ogretmen.derece != null ? String(ogretmen.derece) : "";
  document.getElementById("kademe").value =
    ogretmen.kademe != null ? String(ogretmen.kademe) : "";
  document.getElementById("emekliSicilNo").value =
    ogretmen.emekli_sicil_no || "";
  document.getElementById("kbsPersonelNo").value =
    ogretmen.kbs_personel_no || "";

  // Mali
  document.getElementById("iban").value = ogretmen.iban || "";
  document.getElementById("bankaSubesi").value = ogretmen.banka_subesi || "";
  document.getElementById("yabanciDilTazminati").value =
    ogretmen.yabanci_dil_tazminati || "";
  document.getElementById("ekGosterge").value = ogretmen.ek_gosterge || "";

  // Aile & İletişim
  document.getElementById("aileDurumu").value = ogretmen.aile_durumu || "";
  document.getElementById("cocuk0_6").value =
    ogretmen.cocuk_0_6 != null ? String(ogretmen.cocuk_0_6) : "0";
  document.getElementById("cocuk6Ustu").value =
    ogretmen.cocuk_6_ustu != null ? String(ogretmen.cocuk_6_ustu) : "0";
  document.getElementById("bes").value = ogretmen.bes || "";
  document.getElementById("telefon").value = ogretmen.telefon || "";
  document.getElementById("email").value = ogretmen.email || "";
  document.getElementById("adres").value = ogretmen.adres || "";

  // Ayrılma
  document.getElementById("ayrilmaTarihi").value =
    ogretmen.ayrilma_tarihi || "";
  document.getElementById("ayrilisNedeni").value =
    ogretmen.ayrilis_nedeni || "";

  console.log("📋 Düzenleme formu dolduruldu:", ogretmen);

  // Modalı aç (aynı modal, multi-step)
  openModal("modalYeniOgretmen");

  // goToStep(1) ile first step'e git
  goToStep(1);
}

// ==========================================
// ÖĞRETMEN GÜNCELLE - FORM SUBMIT
// ==========================================

async function handleEditFormSubmit(e) {
  e.preventDefault();

  console.log("📝 Düzenleme form submit");

  const form = e.target;

  const ogretmenId = form.querySelector("#editOgretmenId")?.value;
  const adSoyad = form.querySelector("#editAdSoyad")?.value.trim();
  const unvan = form.querySelector("#editUnvan")?.value;
  const durum = form.querySelector("#editDurum")?.value;
  const telefon = form.querySelector("#editTelefon")?.value.trim();
  const email = form.querySelector("#editEmail")?.value.trim();

  if (!adSoyad || !unvan) {
    Bildirim.error("Zorunlu alanları doldurunuz!");
    return;
  }

  const guncelBilgiler = {
    ad_soyad: adSoyad,
    unvan: unvan,
    durum: parseInt(durum),
    telefon: telefon,
    email: email,
  };

  console.log("📝 Güncelleniyor:", ogretmenId, guncelBilgiler);

  const btnGuncelle = document.getElementById("btnGuncelle");
  btnGuncelle.disabled = true;
  btnGuncelle.textContent = "Güncelleniyor...";

  try {
    const result = await ipcRenderer.invoke(
      "update-teacher",
      ogretmenId,
      guncelBilgiler
    );

    if (result.success) {
      Bildirim.success(`✓ ${adSoyad} başarıyla güncellendi!`);
      closeModal("modalDuzenleOgretmen");
      await loadTeachers();
    } else {
      Bildirim.error(result.message || "Güncelleme başarısız!");
    }
  } catch (error) {
    console.error("❌ Güncelleme hatası:", error);
    Bildirim.error("Bir hata oluştu!");
  } finally {
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
// ÖĞRETMEN SİL
// ==========================================

async function silOgretmen(ogretmenId, adSoyad) {
  console.log("🗑️ === ÖĞRETMEN SİLME BAŞLADI ===");
  console.log("📋 Öğretmen ID:", ogretmenId);
  console.log("📋 Ad Soyad:", adSoyad);

  try {
    const onay = await Bildirim.confirm(
      `"${adSoyad}" öğretmenini silmek istediğinize emin misiniz?\n\n` +
        `⚠️ Bu işlem öğretmeni pasif duruma alacaktır.`,
      "Öğretmen Silme Onayı",
      {
        icon: "🗑️",
        confirmText: "Evet, Sil",
        cancelText: "İptal",
        type: "danger",
      }
    );

    console.log("✅ Kullanıcı onayı:", onay);

    if (!onay) {
      console.log("❌ Kullanıcı iptal etti");
      return;
    }

    console.log("🔄 Backend'e istek gönderiliyor...");

    const result = await ipcRenderer.invoke("delete-teacher", ogretmenId);

    console.log("📨 Backend cevabı:", result);

    if (result.success) {
      console.log("✅ Öğretmen başarıyla silindi");

      Bildirim.success(`✓ ${adSoyad} başarıyla silindi!`, "Başarılı", 3000);

      console.log("🔄 Liste yenileniyor...");
      await loadTeachers();
      console.log("✅ Liste yenilendi");
    } else {
      console.error("❌ Silme başarısız:", result.message);
      Bildirim.error(result.message || "Öğretmen silinemedi!");
    }
  } catch (error) {
    console.error("❌ HATA:", error);
    Bildirim.error("Öğretmen silinemedi: " + error.message);
  }

  console.log("🏁 === ÖĞRETMEN SİLME BİTTİ ===");
}

// ==========================================
// ÖĞRETMEN ŞİFRESİNİ GÖSTER
// ==========================================

async function sifreGoster(ogretmenId, adSoyad) {
  try {
    console.log("👁️ Öğretmen şifre görüntüleme:", ogretmenId);

    const result = await ipcRenderer.invoke("get-teacher-password", ogretmenId);

    if (result.success) {
      const { tc_no, ad_soyad, sifre } = result.data;

      await Bildirim.confirm(
        `👨‍🏫 **${ad_soyad}**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `**📌 Giriş Bilgileri:**\n\n` +
          `**Kullanıcı Adı (TC):** ${tc_no}\n` +
          `**Şifre:** ${sifre}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ Bu bilgileri öğretmene güvenli bir şekilde iletin!`,
        "Öğretmen Giriş Bilgileri",
        {
          icon: "👁️",
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

// ==========================================
// ŞİFRE SIFIRLA
// ==========================================

async function sifreSifirla(ogretmenId, adSoyad) {
  try {
    const onay = await Bildirim.confirm(
      `${adSoyad} öğretmeninin şifresini sıfırlamak istiyor musunuz?\n\n` +
        `🔑 Yeni şifre otomatik oluşturulacaktır.`,
      "Şifre Sıfırlama",
      {
        icon: "🔑",
        confirmText: "Şifreyi Sıfırla",
        cancelText: "İptal",
        type: "info",
      }
    );

    if (!onay) {
      return;
    }

    const result = await ipcRenderer.invoke(
      "reset-teacher-password",
      ogretmenId
    );

    if (result.success) {
      // Öğretmenin TC'sini bul
      const ogretmen = allTeachers.find((o) => o.id === ogretmenId);

      showPasswordModal(ogretmen.tc_no, result.yeni_sifre, adSoyad);

      Bildirim.success(
        `✓ ${adSoyad} öğretmeninin şifresi sıfırlandı!`,
        "Şifre Sıfırlandı",
        5000
      );
    } else {
      Bildirim.error(result.message || "Şifre sıfırlanamadı!");
    }
  } catch (error) {
    console.error("❌ Şifre sıfırlama hatası:", error);
    Bildirim.error("Şifre sıfırlanamadı: " + error.message);
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function initEventListeners() {
  // Yeni öğretmen butonu
  btnYeniOgretmen.addEventListener("click", () => {
    openModal("modalYeniOgretmen");
    goToStep(1);
  });

  // Form submit
  formYeniOgretmen.addEventListener("submit", handleFormSubmit);

  // Düzenleme form submit
  const formDuzenle = document.getElementById("formDuzenleOgretmen");
  if (formDuzenle) {
    formDuzenle.addEventListener("submit", handleEditFormSubmit);
  }

  // Step butonları
  btnNextStep.addEventListener("click", nextStep);
  btnPrevStep.addEventListener("click", prevStep);

  // Arama
  searchInput.addEventListener("input", applyFilters);

  // Filtre butonu
  btnFiltrele.addEventListener("click", applyFilters);

  // Filtre değişikliği
  filterUnvan.addEventListener("change", applyFilters);
  filterDurum.addEventListener("change", applyFilters);
  filterSiralama.addEventListener("change", applyFilters);

  // Sayfalama butonları
  document.getElementById("btnPrevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTeachers();
    }
  });

  document.getElementById("btnNextPage")?.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTeachers();
    }
  });

  // Çıkış
  logoutBtn.addEventListener("click", handleLogout);

  // TC No - sadece rakam
  document.getElementById("tcNo").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  });

  // Telefon formatla
  document.getElementById("telefon").addEventListener("input", formatPhone);
  document.getElementById("editTelefon").addEventListener("input", formatPhone);

  // IBAN formatla
  document.getElementById("iban").addEventListener("input", formatIBAN);
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

function formatIBAN(e) {
  let value = e.target.value.replace(/\s/g, "").toUpperCase();

  // TR ile başlamalı
  if (!value.startsWith("TR")) {
    value = "TR" + value.replace(/TR/g, "");
  }

  // Sadece TR ve rakam
  value = value.replace(/[^TR0-9]/g, "");

  // 4'lü gruplar halinde boşluk ekle
  value = value.match(/.{1,4}/g)?.join(" ") || value;

  e.target.value = value.substring(0, 32); // TR + 24 hane + boşluklar
}

function handleLogout() {
  const confirmed = confirm("Çıkış yapmak istediğinize emin misiniz?");
  if (confirmed) {
    sessionStorage.clear();
    window.location.href = "giris.html";
  }
}

// ==========================================
// ÖĞRETMEN RAPORLARI SAYFASI AÇ
// ==========================================
function ogretmenRaporlariAc() {
  console.log("📊 Öğretmen raporları sayfası açılıyor...");

  // Yol kontrolü
  const yol = "raporlar/ogretmen-raporlari.html";
  console.log("🔗 Açılacak sayfa:", yol);

  window.location.href = yol;
}

console.log("✅ Öğretmen yönetimi scripti yüklendi (Part 2)");
