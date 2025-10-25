// ==========================================
// ÖĞRENCİ YÖNETİMİ SAYFASI
// ==========================================

console.log("🔍 ogrenciler.js BAŞLADI!");

let ipcRenderer;
try {
  const electron = require("electron");
  ipcRenderer = electron.ipcRenderer;
  console.log("✅ ipcRenderer başarıyla yüklendi");

  // Global scope'a ekle
  window.ipcRenderer = ipcRenderer;
  window.testIPC = () => {
    console.log("🧪 testIPC çağrıldı");
    console.log("ipcRenderer:", ipcRenderer);
    return ipcRenderer;
  };

  console.log("✅ window.ipcRenderer eklendi");
  console.log(
    "✅ window.testIPC() fonksiyonu eklendi - console'da test etmek için kullan"
  );
} catch (error) {
  console.error("❌ ipcRenderer yüklenemedi:", error);
}

// Global değişkenler
let currentUser = null;
let userType = null;
let schoolInfo = null;
let allStudents = [];
let filteredStudents = [];
let currentStep = 1;
const totalSteps = 4;

// Sayfalama
let currentPage = 1;
const itemsPerPage = 10;

// Fotoğraf
let selectedPhoto = null;

// MEBBİS
let mebbisStudents = [];
let mebbisPhotos = [];

// DOM elemanları
const btnYeniOgrenci = document.getElementById("btnYeniOgrenci");
const btnExcelIceAktar = document.getElementById("btnExcelIceAktar");
const modalYeniOgrenci = document.getElementById("modalYeniOgrenci");
const formYeniOgrenci = document.getElementById("formYeniOgrenci");
const ogrencilerTbody = document.getElementById("ogrencilerTbody");
const searchInput = document.getElementById("searchInput");
const filterSinif = document.getElementById("filterSinif");
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
  console.log("✅ Öğrenci yönetimi sayfası yüklendi");

  loadUserInfo();
  await loadStudents();
  initEventListeners();
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

  if (schoolInfo) {
    document.getElementById("okulAdi").textContent = schoolInfo.okul_adi;
  }

  // Super admin öğrenci sayfasına erişemez
  if (userType === "super_admin") {
    Bildirim.error("Bu sayfaya erişim yetkiniz yok!");
    setTimeout(() => {
      window.location.href = "anasayfa.html";
    }, 2000);
  }
}

function getRoleName(rol) {
  const roles = {
    okul_admin: "Okul Yöneticisi",
    ogretmen: "Öğretmen",
  };
  return roles[rol] || rol;
}

// ==========================================
// ÖĞRENCİLERİ YÜKLE
// ==========================================

async function loadStudents() {
  try {
    console.log("📋 Öğrenciler yükleniyor...");

    const result = await ipcRenderer.invoke(
      "get-all-students",
      currentUser.rol,
      currentUser.id
    );

    if (result.success) {
      allStudents = result.data;
      filteredStudents = [...allStudents];

      console.log(`✅ ${allStudents.length} öğrenci yüklendi`);

      renderStudents();
      updateStats();
      updateFilters();

      if (window.studentsLoadedOnce) {
        Bildirim.success(`${allStudents.length} öğrenci yüklendi!`, null, 2000);
      }
      window.studentsLoadedOnce = true;
    } else {
      Bildirim.error(result.message || "Öğrenciler yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Öğrenci yükleme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  }
}

// ==========================================
// ÖĞRENCİLERİ GÖSTER
// ==========================================

function renderStudents() {
  if (filteredStudents.length === 0) {
    ogrencilerTbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 60px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Öğrenci bulunamadı</div>
          <div style="font-size: 14px; color: var(--text-secondary);">Arama kriterlerinizi değiştirmeyi deneyin</div>
        </td>
      </tr>
    `;
    document.getElementById("pagination").style.display = "none";
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  let html = "";

  paginatedStudents.forEach((ogrenci, index) => {
    const durumBadge =
      ogrenci.durum === 1
        ? '<span class="license-badge aktif">✓ Aktif</span>'
        : '<span class="license-badge bitmis">✕ Pasif</span>';

    // Fotoğraf
    const fotoSrc = ogrenci.fotograf_path || "";
    const fotoHtml = fotoSrc
      ? `<img src="file:///${fotoSrc.replace(/\\/g, "/")}" alt="${
          ogrenci.ad_soyad
        }" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(123, 47, 255, 0.2); display: none; align-items: center; justify-content: center; font-size: 18px;">👤</div>`
      : `<div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(123, 47, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 18px;">👤</div>`;

    // Veli telefon
    const veliTel = ogrenci.anne_telefon || ogrenci.baba_telefon || "-";

    html += `
      <tr style="animation: fadeIn 0.5s ease ${index * 0.05}s both;">
        <td>${startIndex + index + 1}</td>
        <td>${fotoHtml}</td>
        <td><strong style="color: var(--primary); font-family: monospace;">${
          ogrenci.okul_no
        }</strong></td>
        <td><strong>${ogrenci.ad_soyad}</strong></td>
        <td><span style="background: rgba(123, 47, 255, 0.2); color: #7b2fff; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${
          ogrenci.sinif
        }</span></td>
        <td>${ogrenci.cinsiyet || "-"}</td>
        <td>${veliTel}</td>
        <td>${durumBadge}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action edit" onclick="duzenleOgrenci(${
              ogrenci.id
            })" title="Düzenle">✏️</button>
            <button class="btn-action" onclick="sifreGoster(${
              ogrenci.id
            })" title="Şifre Göster/Oluştur" style="background: rgba(0, 217, 255, 0.2); color: #00d9ff;">👁️</button>
            <button class="btn-action delete" onclick="silOgrenci(${
              ogrenci.id
            }, '${ogrenci.ad_soyad}')" title="Sil">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });

  ogrencilerTbody.innerHTML = html;
  updatePagination();
}

// ==========================================
// İSTATİSTİKLERİ GÜNCELLE
// ==========================================

function updateStats() {
  const toplam = allStudents.length;
  const aktif = allStudents.filter((o) => o.durum === 1).length;
  const pasif = allStudents.filter((o) => o.durum === 0).length;
  const kaynastirma = allStudents.filter((o) => o.kaynastirma === 1).length;

  document.getElementById("statToplam").textContent = toplam;
  document.getElementById("statAktif").textContent = aktif;
  document.getElementById("statPasif").textContent = pasif;
  document.getElementById("statKaynastirma").textContent = kaynastirma;
}

// ==========================================
// FİLTRELERİ GÜNCELLE
// ==========================================

function updateFilters() {
  const siniflar = [...new Set(allStudents.map((o) => o.sinif))].sort();

  filterSinif.innerHTML = '<option value="">Tüm Sınıflar</option>';
  siniflar.forEach((sinif) => {
    if (sinif) {
      filterSinif.innerHTML += `<option value="${sinif}">${sinif}</option>`;
    }
  });
}

// ==========================================
// FİLTRELE
// ==========================================

function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedSinif = filterSinif.value;
  const selectedDurum = filterDurum.value;
  const siralama = filterSiralama.value;

  filteredStudents = allStudents.filter((ogrenci) => {
    const matchesSearch =
      !searchTerm ||
      ogrenci.ad_soyad.toLowerCase().includes(searchTerm) ||
      (ogrenci.tc_no && ogrenci.tc_no.includes(searchTerm)) ||
      ogrenci.okul_no.includes(searchTerm);

    const matchesSinif = !selectedSinif || ogrenci.sinif === selectedSinif;
    const matchesDurum =
      !selectedDurum || ogrenci.durum === parseInt(selectedDurum);

    return matchesSearch && matchesSinif && matchesDurum;
  });

  // Sıralama
  filteredStudents.sort((a, b) => {
    if (siralama === "sinif") {
      return (a.sinif || "").localeCompare(b.sinif || "", "tr");
    } else if (siralama === "ad_soyad") {
      return a.ad_soyad.localeCompare(b.ad_soyad, "tr");
    } else if (siralama === "okul_no") {
      return a.okul_no.localeCompare(b.okul_no);
    }
    return 0;
  });

  currentPage = 1;
  renderStudents();

  if (searchTerm || selectedSinif || selectedDurum) {
    Bildirim.info(`${filteredStudents.length} öğrenci bulundu`);
  }
}

// ==========================================
// SAYFALAMA
// ==========================================

function updatePagination() {
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
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
    filteredStudents.length
  );

  paginationInfo.textContent = `${startIndex}-${endIndex} / ${filteredStudents.length}`;

  btnPrevPage.disabled = currentPage === 1;
  btnNextPage.disabled = currentPage === totalPages;
}

// ==========================================
// MULTI-STEP FORM
// ==========================================

function goToStep(step) {
  if (step < 1 || step > totalSteps) return;

  currentStep = step;

  document.querySelectorAll(".form-step-content").forEach((content) => {
    content.classList.remove("active");
  });

  document
    .querySelector(`.form-step-content[data-step="${step}"]`)
    .classList.add("active");

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

    if (input.id === "tcNo" && input.value && !/^\d{11}$/.test(input.value)) {
      input.focus();
      Bildirim.error("TC Kimlik No 11 haneli rakamlardan oluşmalıdır!");
      return false;
    }
  }

  return true;
}

console.log("✅ Öğrenci yönetimi scripti yüklendi (Part 1)");

// ==========================================
// FOTOĞRAF YÜKLEME
// ==========================================

document.getElementById("fotografInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Dosya boyutu kontrolü (2 MB)
  if (file.size > 2 * 1024 * 1024) {
    Bildirim.error("Fotoğraf boyutu 2 MB'dan küçük olmalıdır!");
    e.target.value = "";
    return;
  }

  // Dosya tipi kontrolü
  if (!file.type.startsWith("image/")) {
    Bildirim.error("Sadece resim dosyası yükleyebilirsiniz!");
    e.target.value = "";
    return;
  }

  // Önizleme göster
  const reader = new FileReader();
  reader.onload = (event) => {
    selectedPhoto = event.target.result;
    const fotoOnizleme = document.getElementById("fotoOnizleme");
    const fotoPlaceholder = document.getElementById("fotoPlaceholder");

    if (fotoOnizleme) {
      fotoOnizleme.src = selectedPhoto;
      fotoOnizleme.style.display = "block";
    }
    if (fotoPlaceholder) {
      fotoPlaceholder.style.display = "none";
    }
  };
  reader.readAsDataURL(file);
});

// ==========================================
// YENİ ÖĞRENCİ EKLE / DÜZENLE - FORM SUBMIT
// ==========================================

async function handleFormSubmit(e) {
  e.preventDefault();

  console.log("📝 Form submit tetiklendi");

  if (!validateCurrentStep()) {
    return;
  }

  const form = e.target;

  // Düzenleme modunda mı?
  const isEditMode = form.dataset.editMode === "true";
  const editId = form.dataset.editId;

  // Sporcu lisansı seçilenleri al
  const sporcuLisansSecimler = Array.from(
    form.querySelector("#sporcuLisansTuru")?.selectedOptions || []
  ).map((opt) => opt.value);

  // Kaynaştırma tanı seçilenleri al
  const kaynastirmaTaniSecimler = Array.from(
    form.querySelector("#kaynastirmaTani")?.selectedOptions || []
  ).map((opt) => opt.value);

  // ✅ Ad Soyad'ı ayır (Excel formatıyla uyumlu)
  const adSoyad = form.querySelector("#adSoyad")?.value.trim() || "";
  const parcalar = adSoyad.split(" ").filter((p) => p.length > 0);
  const soyad = parcalar.length > 0 ? parcalar[parcalar.length - 1] : "";
  const ad =
    parcalar.length > 1 ? parcalar.slice(0, -1).join(" ") : parcalar[0] || "";

  const ogrenciBilgileri = {
    tc_no: form.querySelector("#tcNo")?.value.trim() || null,
    okul_no: form.querySelector("#okulNo")?.value.trim() || "",
    ad: ad, // ✅ EKLENDI
    soyad: soyad, // ✅ EKLENDI
    ad_soyad: adSoyad, // ✅ DEĞİŞTİRİLDİ
    sinif: form.querySelector("#sinif")?.value || "",
    cinsiyet: form.querySelector("#cinsiyet")?.value || null,
    alan: form.querySelector("#alan")?.value || null,
    dal: form.querySelector("#dal")?.value.trim() || null,
    durum: parseInt(form.querySelector("#durum")?.value) || 1,
    dogum_tarihi: form.querySelector("#dogumTarihi")?.value || null,
    dogum_yeri: form.querySelector("#dogumYeri")?.value.trim() || null,
    fotograf_path: selectedPhoto || null,

    // Anne
    anne_ad_soyad: form.querySelector("#anneAdSoyad")?.value.trim() || null,
    anne_telefon: form.querySelector("#anneTelefon")?.value.trim() || null,
    anne_durum: form.querySelector("#anneDurum")?.value || null,
    anne_birlikte: form.querySelector("#anneBirlikte")?.value || null,
    anne_iliski: form.querySelector("#anneIliski")?.value || null,
    anne_meslek: form.querySelector("#anneMeslek")?.value.trim() || null,

    // Baba
    baba_ad_soyad: form.querySelector("#babaAdSoyad")?.value.trim() || null,
    baba_telefon: form.querySelector("#babaTelefon")?.value.trim() || null,
    baba_durum: form.querySelector("#babaDurum")?.value || null,
    baba_birlikte: form.querySelector("#babaBirlikte")?.value || null,
    baba_iliski: form.querySelector("#babaIliski")?.value || null,
    baba_meslek: form.querySelector("#babaMeslek")?.value.trim() || null,

    // Özel Durumlar
    burslu: form.querySelector("#burslu")?.checked ? 1 : 0,
    sehit_cocugu: form.querySelector("#sehitCocugu")?.checked ? 1 : 0,
    gazi_cocugu: form.querySelector("#gaziCocugu")?.checked ? 1 : 0,
    destek_egitim: form.querySelector("#destekEgitim")?.checked ? 1 : 0,
    evde_egitim: form.querySelector("#evdeEgitim")?.checked ? 1 : 0,
    sporcu_lisansi:
      sporcuLisansSecimler.length > 0 ? sporcuLisansSecimler.join(",") : null,
    kaynastirma: form.querySelector("#kaynastirma")?.checked ? 1 : 0,
    kaynastirma_tani:
      kaynastirmaTaniSecimler.length > 0
        ? kaynastirmaTaniSecimler.join(",")
        : null,
  };

  console.log(
    isEditMode ? "✏️ Öğrenci güncelleniyor:" : "📝 Öğrenci kaydediliyor:",
    ogrenciBilgileri
  );

  const btnKaydet = document.getElementById("btnKaydet");
  btnKaydet.disabled = true;
  btnKaydet.textContent = isEditMode ? "Güncelleniyor..." : "Kaydediliyor...";

  try {
    let result;

    if (isEditMode) {
      // Güncelle
      result = await ipcRenderer.invoke(
        "update-student",
        editId,
        ogrenciBilgileri
      );
    } else {
      // Yeni ekle
      result = await ipcRenderer.invoke("create-student", ogrenciBilgileri);
    }

    console.log("📨 Backend cevabı:", result);

    if (result.success) {
      Bildirim.success(
        isEditMode
          ? `✅ ${ogrenciBilgileri.ad_soyad} güncellendi!`
          : `🎉 ${result.data.ad_soyad} başarıyla eklendi!`,
        isEditMode ? "Öğrenci Güncellendi" : "Öğrenci Eklendi",
        5000
      );

      closeModal("modalYeniOgrenci");
      form.reset();
      selectedPhoto = null;

      const fotoOnizleme = document.getElementById("fotoOnizleme");
      const fotoPlaceholder = document.getElementById("fotoPlaceholder");
      if (fotoOnizleme) fotoOnizleme.style.display = "none";
      if (fotoPlaceholder) fotoPlaceholder.style.display = "block";

      // Düzenleme modunu kapat
      delete form.dataset.editMode;
      delete form.dataset.editId;
      document.querySelector("#modalYeniOgrenci h2").textContent =
        "Yeni Öğrenci Ekle";

      goToStep(1);
      await loadStudents();
    } else {
      Bildirim.error(result.message || "İşlem başarısız!");
    }
  } catch (error) {
    console.error("❌ İşlem hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  } finally {
    btnKaydet.disabled = false;
    btnKaydet.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      ${isEditMode ? "Güncelle" : "Öğrenciyi Kaydet"}
    `;
  }
}

// ==========================================
// ÖĞRENCİ DÜZENLE
// ==========================================

async function duzenleOgrenci(ogrenciId) {
  console.log("📝 Öğrenci düzenleniyor:", ogrenciId);

  // Öğrenci bilgilerini getir
  const result = await ipcRenderer.invoke("get-student-by-id", ogrenciId);

  if (!result.success) {
    Bildirim.error("Öğrenci bulunamadı!");
    return;
  }

  const ogrenci = result.data;

  // Formu doldur - TÜM ALANLAR
  document.getElementById("tcNo").value = ogrenci.tc_no || "";
  document.getElementById("okulNo").value = ogrenci.okul_no || "";
  document.getElementById("adSoyad").value = ogrenci.ad_soyad || "";
  document.getElementById("sinif").value = ogrenci.sinif || "";
  document.getElementById("cinsiyet").value = ogrenci.cinsiyet || "";
  document.getElementById("alan").value = ogrenci.alan || "";
  document.getElementById("dal").value = ogrenci.dal || "";
  document.getElementById("durum").value = ogrenci.durum || 1;
  document.getElementById("dogumTarihi").value = ogrenci.dogum_tarihi || "";
  document.getElementById("dogumYeri").value = ogrenci.dogum_yeri || "";

  // Anne bilgileri
  document.getElementById("anneAdSoyad").value = ogrenci.anne_ad_soyad || "";
  document.getElementById("anneTelefon").value = ogrenci.anne_telefon || "";
  document.getElementById("anneDurum").value = ogrenci.anne_durum || "";
  document.getElementById("anneBirlikte").value = ogrenci.anne_birlikte || "";
  document.getElementById("anneIliski").value = ogrenci.anne_iliski || "";
  document.getElementById("anneMeslek").value = ogrenci.anne_meslek || "";

  // Baba bilgileri
  document.getElementById("babaAdSoyad").value = ogrenci.baba_ad_soyad || "";
  document.getElementById("babaTelefon").value = ogrenci.baba_telefon || "";
  document.getElementById("babaDurum").value = ogrenci.baba_durum || "";
  document.getElementById("babaBirlikte").value = ogrenci.baba_birlikte || "";
  document.getElementById("babaIliski").value = ogrenci.baba_iliski || "";
  document.getElementById("babaMeslek").value = ogrenci.baba_meslek || "";

  // Checkbox'lar
  document.getElementById("burslu").checked = ogrenci.burslu == 1;
  document.getElementById("sehitCocugu").checked = ogrenci.sehit_cocugu == 1;
  document.getElementById("gaziCocugu").checked = ogrenci.gazi_cocugu == 1;
  document.getElementById("destekEgitim").checked = ogrenci.destek_egitim == 1;
  document.getElementById("evdeEgitim").checked = ogrenci.evde_egitim == 1;
  document.getElementById("kaynastirma").checked = ogrenci.kaynastirma == 1;

  // Sporcu lisansı (multi-select)
  if (ogrenci.sporcu_lisansi) {
    const secimler = ogrenci.sporcu_lisansi.split(",");
    const select = document.getElementById("sporcuLisansTuru");
    if (select) {
      Array.from(select.options).forEach((opt) => {
        opt.selected = secimler.includes(opt.value);
      });
    }
  }

  // Kaynaştırma tanı (multi-select)
  if (ogrenci.kaynastirma_tani) {
    const secimler = ogrenci.kaynastirma_tani.split(",");
    const select = document.getElementById("kaynastirmaTani");
    if (select) {
      Array.from(select.options).forEach((opt) => {
        opt.selected = secimler.includes(opt.value);
      });
    }
  }

  // ✅ FOTOĞRAF GÖSTER - DOSYA YOLU FİX
  const fotoOnizleme = document.getElementById("fotoOnizleme");
  const fotoPlaceholder = document.getElementById("fotoPlaceholder");

  if (ogrenci.fotograf_path && fotoOnizleme) {
    selectedPhoto = ogrenci.fotograf_path;

    // Fotoğraf önizleme img etiketi
    fotoOnizleme.src = `file:///${ogrenci.fotograf_path.replace(/\\/g, "/")}`;
    fotoOnizleme.onerror = function () {
      console.warn("⚠️ Fotoğraf yüklenemedi:", ogrenci.fotograf_path);
      fotoOnizleme.style.display = "none";
      if (fotoPlaceholder) fotoPlaceholder.style.display = "block";
    };

    fotoOnizleme.style.display = "block";
    if (fotoPlaceholder) fotoPlaceholder.style.display = "none";
  } else {
    selectedPhoto = null;
    if (fotoOnizleme) fotoOnizleme.style.display = "none";
    if (fotoPlaceholder) fotoPlaceholder.style.display = "block";
  }

  // Form başlığını değiştir
  document.querySelector("#modalYeniOgrenci h2").textContent =
    "Öğrenci Düzenle";

  // Düzenleme modunda olduğumuzu belirt
  formYeniOgrenci.dataset.editMode = "true";
  formYeniOgrenci.dataset.editId = ogrenciId;

  // Modal'ı aç
  openModal("modalYeniOgrenci");
  goToStep(1);
}

console.log("✅ Öğrenci yönetimi scripti yüklendi (Part 2)");

// ==========================================
// ÖĞRENCİ SİL
// ==========================================

async function silOgrenci(ogrenciId, adSoyad) {
  try {
    const onay = await Bildirim.confirm(
      `"${adSoyad}" öğrencisini silmek istediğinize emin misiniz?\n\n⚠️ Bu işlem öğrenciyi pasif duruma alacaktır.`,
      "Öğrenci Silme Onayı",
      {
        icon: "🗑️",
        confirmText: "Evet, Sil",
        cancelText: "İptal",
        type: "danger",
      }
    );

    if (!onay) return;

    const result = await ipcRenderer.invoke(
      "delete-student",
      ogrenciId,
      currentUser.rol
    );

    if (result.success) {
      Bildirim.success(`✓ ${adSoyad} başarıyla silindi!`);
      await loadStudents();
    } else {
      Bildirim.error(result.message || "Öğrenci silinemedi!");
    }
  } catch (error) {
    console.error("❌ Öğrenci silme hatası:", error);
    Bildirim.error("Öğrenci silinemedi: " + error.message);
  }
}

// ==========================================
// ŞİFRE GÖSTER/OLUŞTUR
// ==========================================

async function sifreGoster(ogrenciId) {
  try {
    // Önce şifre var mı kontrol et
    const getResult = await ipcRenderer.invoke(
      "get-student-password",
      ogrenciId,
      currentUser.rol,
      currentUser.id
    );

    if (
      getResult.success &&
      getResult.data.sifre &&
      getResult.data.sifre !== "Şifre henüz oluşturulmamış"
    ) {
      // Şifre var, göster
      showPasswordModal(
        getResult.data.okul_no,
        getResult.data.sifre,
        getResult.data.ad_soyad
      );
    } else {
      // Şifre yok, oluştur
      const onay = await Bildirim.confirm(
        "Bu öğrenci için henüz şifre oluşturulmamış.\n\nOtomatik şifre oluşturulsun mu?",
        "Şifre Oluştur",
        {
          icon: "🔑",
          confirmText: "Oluştur",
          cancelText: "İptal",
          type: "info",
        }
      );

      if (!onay) return;

      const createResult = await ipcRenderer.invoke(
        "create-student-password",
        ogrenciId,
        currentUser.rol,
        currentUser.id
      );

      if (createResult.success) {
        showPasswordModal(
          createResult.data.kullanici_adi,
          createResult.data.sifre,
          getResult.data.ad_soyad
        );
        Bildirim.success("Şifre başarıyla oluşturuldu!");
      } else {
        Bildirim.error(createResult.message || "Şifre oluşturulamadı!");
      }
    }
  } catch (error) {
    console.error("❌ Şifre görüntüleme hatası:", error);
    Bildirim.error("Şifre görüntülenemedi: " + error.message);
  }
}

function showPasswordModal(okulNo, sifre, adSoyad) {
  document.getElementById("sifreModalOkulNo").textContent = okulNo;
  document.getElementById("sifreModalSifre").textContent = sifre;

  openModal("modalSifreGoster");

  setTimeout(() => {
    closeModal("modalSifreGoster");
  }, 10000);
}

// ==========================================
// MEBBİS'TEN ÖĞRENCİ ÇEK
// ==========================================

async function mebbistenOgrenciCek() {
  try {
    // Önce rehber modalı göster
    openModal("modalMebbisRehber");

    // 3 saniye sonra MEBBİS penceresini aç
    setTimeout(async () => {
      closeModal("modalMebbisRehber");

      Bildirim.info("MEBBİS penceresi açılıyor...");

      const result = await ipcRenderer.invoke("open-mebbis-window");

      if (result.success) {
        Bildirim.success(
          "✅ MEBBİS penceresi açıldı!\n\n📖 Giriş yapın ve öğrenci listesini görüntüleyin.\n\n⌨️ Ctrl+Shift+M ile öğrencileri çekebilirsiniz.",
          "MEBBİS Hazır",
          8000
        );
      } else {
        Bildirim.error(result.message || "MEBBİS penceresi açılamadı!");
      }
    }, 3000);
  } catch (error) {
    console.error("❌ MEBBİS açma hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  }
}

async function mebbisOgrencileriCek() {
  try {
    Bildirim.showLoading("Öğrenciler çekiliyor...");

    const result = await ipcRenderer.invoke("mebbis-parse-students");

    Bildirim.hideLoading();

    if (result.success && result.data.length > 0) {
      mebbisStudents = result.data;
      showMebbisPreview(mebbisStudents);
    } else if (result.success && result.data.length === 0) {
      Bildirim.warning(
        "Öğrenci bulunamadı!\n\nLütfen MEBBİS'te öğrenci listesinin görüntülendiğinden emin olun."
      );
    } else {
      Bildirim.error(result.message || "Öğrenciler çekilemedi!");
    }
  } catch (error) {
    Bildirim.hideLoading();
    console.error("❌ Öğrenci çekme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  }
}

function showMebbisPreview(students) {
  document.getElementById("mebbisOgrenciSayisi").textContent = students.length;

  const tbody = document.getElementById("mebbisOnizlemeTbody");
  tbody.innerHTML = "";

  students.forEach((ogrenci) => {
    const row = `
      <tr>
        <td style="font-family: monospace;">${ogrenci.tc_no}</td>
        <td><strong>${ogrenci.ad_soyad}</strong></td>
        <td><span style="background: rgba(123, 47, 255, 0.2); color: #7b2fff; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${ogrenci.sinif}</span></td>
        <td>${ogrenci.yabanci_dil}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  openModal("modalMebbisOnizleme");
}

async function mebbisOgrencileriKaydet() {
  try {
    if (mebbisStudents.length === 0) {
      Bildirim.warning("Kaydedilecek öğrenci yok!");
      return;
    }

    const btnKaydet = document.getElementById("btnMebbisKaydet");
    btnKaydet.disabled = true;
    btnKaydet.textContent = "Kaydediliyor...";

    Bildirim.showLoading(`${mebbisStudents.length} öğrenci kaydediliyor...`);

    const result = await ipcRenderer.invoke(
      "mebbis-save-students",
      mebbisStudents
    );

    Bildirim.hideLoading();

    if (result.success) {
      Bildirim.success(
        `✅ ${result.data.eklenen} öğrenci eklendi!\n${result.data.guncellenen} öğrenci güncellendi!`,
        "Başarılı",
        5000
      );

      if (result.data.hatalar && result.data.hatalar.length > 0) {
        console.warn("⚠️ Hatalar:", result.data.hatalar);
      }

      closeModal("modalMebbisOnizleme");
      mebbisStudents = [];
      await loadStudents();
    } else {
      Bildirim.error(result.message || "Öğrenciler kaydedilemedi!");
    }
  } catch (error) {
    Bildirim.hideLoading();
    console.error("❌ Kaydetme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  } finally {
    const btnKaydet = document.getElementById("btnMebbisKaydet");
    btnKaydet.disabled = false;
    btnKaydet.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      </svg>
      Kaydet
    `;
  }
}

// ==========================================
// FOTOĞRAF ÇEK
// ==========================================

async function mebbistenFotografCek() {
  try {
    Bildirim.showLoading("Fotoğraflar çekiliyor...");

    const result = await ipcRenderer.invoke("mebbis-parse-photos");

    Bildirim.hideLoading();

    if (result.success && result.data.length > 0) {
      mebbisPhotos = result.data;
      showPhotoPreview(mebbisPhotos);
    } else if (result.success && result.data.length === 0) {
      Bildirim.warning(
        "Fotoğraf bulunamadı!\n\nLütfen MEBBİS'te fotoğraf sayfasının açık olduğundan emin olun."
      );
    } else {
      Bildirim.error(result.message || "Fotoğraflar çekilemedi!");
    }
  } catch (error) {
    Bildirim.hideLoading();
    console.error("❌ Fotoğraf çekme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  }
}

function showPhotoPreview(photos) {
  document.getElementById("fotografSayisi").textContent = photos.length;

  const grid = document.getElementById("fotografOnizlemeGrid");
  grid.innerHTML = "";

  photos.forEach((photo) => {
    const card = `
      <div style="text-align: center; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary);">
        <img src="${photo.base64}" style="width: 120px; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
        <div style="font-size: 12px; font-weight: 600; word-wrap: break-word;">${photo.ad_soyad}</div>
      </div>
    `;
    grid.innerHTML += card;
  });

  openModal("modalFotografOnizleme");
}

async function mebbisFotograflariKaydet() {
  try {
    if (mebbisPhotos.length === 0) {
      Bildirim.warning("Kaydedilecek fotoğraf yok!");
      return;
    }

    const btnKaydet = document.getElementById("btnFotografKaydet");
    btnKaydet.disabled = true;
    btnKaydet.textContent = "Kaydediliyor...";

    Bildirim.showLoading(`${mebbisPhotos.length} fotoğraf kaydediliyor...`);

    const result = await ipcRenderer.invoke("mebbis-save-photos", mebbisPhotos);

    Bildirim.hideLoading();

    if (result.success) {
      Bildirim.success(
        `✅ ${result.data.saved} fotoğraf kaydedildi!${
          result.data.errors > 0 ? `\n⚠️ ${result.data.errors} hata` : ""
        }`,
        "Başarılı",
        5000
      );

      closeModal("modalFotografOnizleme");
      mebbisPhotos = [];
      await loadStudents();
    } else {
      Bildirim.error(result.message || "Fotoğraflar kaydedilemedi!");
    }
  } catch (error) {
    Bildirim.hideLoading();
    console.error("❌ Fotoğraf kaydetme hatası:", error);
    Bildirim.error("Bir hata oluştu: " + error.message);
  } finally {
    const btnKaydet = document.getElementById("btnFotografKaydet");
    btnKaydet.disabled = false;
    btnKaydet.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      </svg>
      Kaydet
    `;
  }
}

// ==========================================
// EXCEL'DEN ÖĞRENCİ OKU FONKSİYONU
// ==========================================

function excelAkilliOku() {
  document.getElementById("excelFileInput").click();
}

// ==========================================
// EXCEL DİKEY FORMAT OKUMA (E-OKUL RAPORU)
// ==========================================

document
  .getElementById("excelFileInput")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Bildirim.showLoading("Excel dosyası okunuyor...");

    try {
      const XLSX = require("xlsx");
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Ham veriyi al (tüm hücreler)
          const range = XLSX.utils.decode_range(worksheet["!ref"]);
          const rows = [];

          for (let R = range.s.r; R <= range.e.r; R++) {
            const row = [];
            for (let C = range.s.c; C <= range.e.c; C++) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = worksheet[cellAddress];
              row.push(cell ? String(cell.v || "").trim() : "");
            }
            rows.push(row);
          }

          console.log("📊 Toplam satır:", rows.length);
          console.log("📋 İlk 30 satır:", rows.slice(0, 30));

          // Mevcut öğrencilerin TC'lerini al
          const mevcutTCler = new Set();
          const mevcutOgrenciler = await ipcRenderer.invoke("get-students");
          if (mevcutOgrenciler.success && mevcutOgrenciler.data) {
            mevcutOgrenciler.data.forEach((ogr) => {
              if (ogr.tc_no) mevcutTCler.add(ogr.tc_no);
            });
          }

          console.log("📋 Mevcut öğrenci sayısı:", mevcutTCler.size);

          const ogrenciler = [];

          // Başlık satırını bul (AL - 9. Sınıf)
          let baslaIndex = -1;
          for (let i = 0; i < Math.min(20, rows.length); i++) {
            const satirStr = rows[i].join(" ").toLowerCase();
            if (satirStr.includes("al -") && satirStr.includes("sınıf")) {
              baslaIndex = i;
              break;
            }
          }

          if (baslaIndex === -1) {
            Bildirim.hideLoading();
            Bildirim.error("Sınıf bilgisi bulunamadı!");
            return;
          }

          // Sınıf bilgisini al
          const sinifSatiri = rows[baslaIndex].join(" ");
          const sinifMatch = sinifSatiri.match(
            /(\d+)\.\s*Sınıf\s*\/\s*(\w+)\s*Şubesi/i
          );
          const sinif = sinifMatch ? `${sinifMatch[1]}-${sinifMatch[2]}` : "";

          console.log("✅ Sınıf:", sinif);
          console.log("✅ Veri başlangıcı:", baslaIndex);

          // Her öğrenciyi oku (fotoğraf satırlarından başla)
          for (let i = baslaIndex + 1; i < rows.length; i++) {
            try {
              // Öğrenci Numarası satırını bul
              const ogrNoStr = rows[i].join("|");
              if (!ogrNoStr.includes("Öğrenci Numarası")) continue;

              // Verileri topla
              let tcNo = "";
              let adSoyad = "";
              let babaAdi = "";
              let anneAdi = "";
              let cinsiyet = "";
              let dogumTarihi = "";

              // Sonraki 20 satırı tara
              for (let j = i; j < Math.min(i + 20, rows.length); j++) {
                const satir = rows[j];
                const anahtar = satir[0] || "";
                const deger = satir[1] || satir[2] || satir[3] || "";

                if (anahtar.includes("T.C. Kimlik No")) {
                  tcNo = deger.replace(/\D/g, "");
                } else if (anahtar.includes("Adı Soyadı")) {
                  adSoyad = deger;
                } else if (anahtar.includes("Baba Adı")) {
                  babaAdi = deger;
                } else if (anahtar.includes("Anne Adı")) {
                  anneAdi = deger;
                } else if (anahtar.includes("Cinsiyeti")) {
                  cinsiyet = deger;
                } else if (anahtar.includes("Doğum Tarihi")) {
                  dogumTarihi = deger;
                }
              }

              // Validasyon
              if (!tcNo || tcNo.length !== 11) continue;
              if (!adSoyad || adSoyad.length < 3) continue;
              if (mevcutTCler.has(tcNo)) {
                console.log("⚠️ Zaten var:", adSoyad, tcNo);
                continue;
              }

              // Ad soyad ayır
              const parcalar = adSoyad.split(" ");
              const soyad = parcalar.pop() || "";
              const ad = parcalar.join(" ") || "";

              // Doğum tarihi formatla
              let dogumFormatli = null;
              if (dogumTarihi && dogumTarihi.includes("/")) {
                const [gun, ay, yil] = dogumTarihi.split("/");
                if (gun && ay && yil) {
                  dogumFormatli = `${yil}-${ay.padStart(2, "0")}-${gun.padStart(
                    2,
                    "0"
                  )}`;
                }
              }

              const ogrenci = {
                tc_no: tcNo,
                ad: ad
                  .split(" ")
                  .map(
                    (k) => k.charAt(0).toUpperCase() + k.slice(1).toLowerCase()
                  )
                  .join(" "),
                soyad:
                  soyad.charAt(0).toUpperCase() + soyad.slice(1).toLowerCase(),
                ad_soyad: adSoyad
                  .split(" ")
                  .map(
                    (k) => k.charAt(0).toUpperCase() + k.slice(1).toLowerCase()
                  )
                  .join(" "),
                okul_no: null,
                sinif: sinif,
                cinsiyet:
                  cinsiyet === "Kız" ? "K" : cinsiyet === "Erkek" ? "E" : null,
                baba_ad_soyad: babaAdi
                  ? babaAdi.charAt(0).toUpperCase() +
                    babaAdi.slice(1).toLowerCase()
                  : null,
                anne_ad_soyad: anneAdi
                  ? anneAdi.charAt(0).toUpperCase() +
                    anneAdi.slice(1).toLowerCase()
                  : null,
                dogum_tarihi: dogumFormatli,
              };

              ogrenciler.push(ogrenci);
              mevcutTCler.add(tcNo);

              // 15 satır atla (bir sonraki öğrenciye geç)
              i += 15;
            } catch (satirHata) {
              console.warn("⚠️ Satır hatası:", satirHata);
            }
          }

          console.log("✅ Okunan yeni öğrenci sayısı:", ogrenciler.length);
          console.log("📋 İlk 3 öğrenci:", ogrenciler.slice(0, 3));

          Bildirim.hideLoading();

          if (ogrenciler.length === 0) {
            Bildirim.warning(
              "Tüm öğrenciler zaten kayıtlı veya yeni öğrenci bulunamadı!"
            );
            return;
          }

          // Kaydet
          Bildirim.showLoading(`${ogrenciler.length} öğrenci kaydediliyor...`);

          const result = await ipcRenderer.invoke(
            "import-students",
            ogrenciler
          );

          Bildirim.hideLoading();

          if (result.success) {
            Bildirim.success(
              `✅ ${result.data.eklenen} yeni öğrenci eklendi!`,
              "Başarılı",
              5000
            );
            await loadStudents();
          } else {
            Bildirim.error(result.message || "Öğrenciler kaydedilemedi!");
          }
        } catch (parseError) {
          Bildirim.hideLoading();
          console.error("❌ Excel işleme hatası:", parseError);
          Bildirim.error("Excel dosyası işlenirken hata oluştu!");
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      Bildirim.hideLoading();
      console.error("❌ Dosya okuma hatası:", error);
      Bildirim.error("Dosya okunamadı!");
    }

    e.target.value = "";
  });

// ==========================================
// EVENT LISTENERS
// ==========================================

function initEventListeners() {
  console.log("🎧 Event listeners kuruluyor...");

  // ÖNCE ESKİ LİSTENER'LARI TEMİZLE
  ipcRenderer.removeAllListeners("mebbis-photos-parsed");
  ipcRenderer.removeAllListeners("mebbis-students-parsed");
  console.log("🧹 Eski listener'lar temizlendi");

  btnYeniOgrenci.addEventListener("click", () => {
    openModal("modalYeniOgrenci");
    goToStep(1);
  });

  formYeniOgrenci.addEventListener("submit", handleFormSubmit);

  btnNextStep.addEventListener("click", nextStep);
  btnPrevStep.addEventListener("click", prevStep);

  searchInput.addEventListener("input", applyFilters);
  btnFiltrele.addEventListener("click", applyFilters);
  filterSinif.addEventListener("change", applyFilters);
  filterDurum.addEventListener("change", applyFilters);
  filterSiralama.addEventListener("change", applyFilters);

  // Auto Excel detection
  ipcRenderer.on("excel-auto-detected", async (event, filePath) => {
    console.log("📥 Yeni Excel dosyası tespit edildi:", filePath);

    Bildirim.showLoading("Excel dosyası otomatik işleniyor...");

    const result = await ipcRenderer.invoke("process-auto-excel", filePath);

    Bildirim.hideLoading();

    if (result.success) {
      Bildirim.success(
        `✅ ${result.data.eklenen} öğrenci otomatik eklendi!`,
        "Otomatik Import",
        5000
      );
      await loadStudents();
    } else {
      Bildirim.error(`❌ ${result.message}`);
    }
  });

  // Excel'den Öğrenci Oku (E-OKUL FORMATI)
  document
    .getElementById("btnExcelOku")
    ?.addEventListener("click", excelAkilliOku);

  // Excel İçe Aktar (AYNI FONKSİYON)
  btnExcelIceAktar?.addEventListener("click", excelAkilliOku);

  // MEBBİS Fotoğraf Çek
  document
    .getElementById("btnFotografCek")
    ?.addEventListener("click", mebbistenFotografCek);

  // MEBBİS Modal Butonları
  document
    .getElementById("btnMebbisKaydet")
    ?.addEventListener("click", mebbisOgrencileriKaydet);
  document
    .getElementById("btnFotografKaydet")
    ?.addEventListener("click", mebbisFotograflariKaydet);

  // MEBBİS Klavye Kısayolları
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "M") {
      e.preventDefault();
      if (typeof mebbisOgrencileriCek === "function") {
        mebbisOgrencileriCek();
      }
    }
    if (e.ctrlKey && e.shiftKey && e.key === "F") {
      e.preventDefault();
      mebbistenFotografCek();
    }
  });

  // Sayfalama
  document.getElementById("btnPrevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderStudents();
    }
  });

  document.getElementById("btnNextPage")?.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderStudents();
    }
  });

  logoutBtn.addEventListener("click", handleLogout);

  // MEBBİS'ten gelen verileri dinle
  console.log("📌 MEBBİS event listener'ları kuruluyor...");

  ipcRenderer.removeAllListeners("mebbis-photos-parsed");
  ipcRenderer.removeAllListeners("mebbis-students-parsed");

  ipcRenderer.on("mebbis-students-parsed", (event, students) => {
    console.log("✅ MEBBİS'ten öğrenciler alındı:", students.length);
    mebbisStudents = students;
    showMebbisPreview(students);
  });

  ipcRenderer.on("mebbis-photos-parsed", async (event, photos) => {
    console.log("🎯 FRONTEND: mebbis-photos-parsed event alındı!");
    console.log("📦 Gelen fotoğraf sayısı:", photos.length);

    if (!photos || photos.length === 0) {
      console.warn("⚠️ Boş fotoğraf verisi");
      return;
    }

    console.log(
      "📋 İlk 3 ad:",
      photos.slice(0, 3).map((p) => p.ad_soyad)
    );

    try {
      console.log("💾 Backend'e kaydetme isteği gönderiliyor...");

      const result = await ipcRenderer.invoke("mebbis-save-photos", photos);

      console.log("📨 Backend cevabı:", result);

      if (result.success) {
        const savedCount = result.data ? result.data.saved : 0;
        const errorCount = result.data ? result.data.errors : 0;

        Bildirim.success(
          `✅ ${savedCount} fotoğraf kaydedildi!${
            errorCount > 0 ? `\n⚠️ ${errorCount} hata` : ""
          }`,
          "Fotoğraflar Aktarıldı",
          5000
        );

        if (result.data && result.data.errors > 0) {
          Bildirim.warning(`⚠️ ${errorCount} fotoğraf kaydedilemedi!`);
        }

        await loadStudents();
        console.log("✅ Öğrenci listesi yenilendi");
      } else {
        Bildirim.error(result.message || "Fotoğraflar kaydedilemedi!");
      }
    } catch (error) {
      console.error("❌ Frontend kaydetme hatası:", error);
      Bildirim.error("Bir hata oluştu: " + error.message);
    }
  });

  // Backend log'larını dinle
  ipcRenderer.on("backend-log", (event, message) => {
    console.log("🔵 BACKEND:", message);
  });

  // TC No - sadece rakam
  document.getElementById("tcNo")?.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  });

  // Telefon formatla
  document
    .getElementById("anneTelefon")
    ?.addEventListener("input", formatPhone);
  document
    .getElementById("babaTelefon")
    ?.addEventListener("input", formatPhone);

  // Sporcu checkbox
  document.getElementById("sporcuLisansi")?.addEventListener("change", (e) => {
    const detayGroup = document.getElementById("sporcuDetayGroup");
    if (detayGroup) {
      detayGroup.style.display = e.target.checked ? "block" : "none";
    }
  });

  // Kaynaştırma checkbox
  document.getElementById("kaynastirma")?.addEventListener("change", (e) => {
    const detayGroup = document.getElementById("kaynastirmaDetayGroup");
    if (detayGroup) {
      detayGroup.style.display = e.target.checked ? "block" : "none";
    }
  });

  console.log("✅ Tüm event listeners kuruldu");
}

// ==========================================
// MODAL FONKSİYONLARI
// ==========================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.opacity = "0";

    setTimeout(() => {
      modal.style.display = "none";
      modal.style.opacity = "1";
      document.body.style.overflow = "auto";
    }, 300);
  }
}

document.querySelectorAll(".modal-overlay").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal(modal.id);
    }
  });
});

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

// Yardım sayfasını aç
function yardimAc() {
  window.open("yardim.html", "Yardım", "width=900,height=700");
}

function handleLogout() {
  const confirmed = confirm("Çıkış yapmak istediğinize emin misiniz?");
  if (confirmed) {
    sessionStorage.clear();
    window.location.href = "giris.html";
  }
}

function handleLogout() {
  const confirmed = confirm("Çıkış yapmak istediğinize emin misiniz?");
  if (confirmed) {
    sessionStorage.clear();
    window.location.href = "giris.html";
  }
}

// Fotoğraf sayfasını aç
async function fotografSayfasiAc() {
  Bildirim.info("E-Okul fotoğraf sayfası açılıyor...");
  await ipcRenderer.invoke("open-eokul-photo-page");
}

// Fotoğraflar kaydedildiğinde
ipcRenderer.on("photos-saved", (event, data) => {
  Bildirim.success(
    `✅ ${data.kaydedilen} fotoğraf kaydedildi!`,
    "Fotoğraflar Aktarıldı",
    5000
  );

  if (data.bulunamayan.length > 0) {
    Bildirim.warning(
      `⚠️ ${data.bulunamayan.length} öğrenci bulunamadı: ${data.bulunamayan
        .slice(0, 5)
        .join(", ")}...`
    );
  }

  loadStudents();
});

// ==========================================
// RAPORLAR SAYFASI AÇ
// ==========================================
function raporlarSayfasiAc() {
  console.log("📊 Raporlar sayfası açılıyor...");
  window.location.href = "raporlar/raporlar.html";
}

console.log("✅ Öğrenci yönetimi scripti yüklendi (Part 2)");
