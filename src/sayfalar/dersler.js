// ==========================================
// DERSLER YÖNETİMİ - PART 1: TEMEL DEĞİŞKENLER VE BAŞLATMA
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let allDersler = [];
let filteredDersler = [];
let allTeachers = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentStep = 1;
const totalSteps = 4;
let selectedTeachers = [];

// 20 Hazır Gradient Renk Paleti
const gradientColors = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Mor-Mavi
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", // Pembe-Kırmızı
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", // Açık Mavi
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Yeşil-Turkuaz
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Pembe-Sarı
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)", // Turkuaz-Mor
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", // Pastel Turkuaz-Pembe
  "linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)", // Turuncu-Pembe
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", // Krem-Turuncu
  "linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)", // Kırmızı-Mavi
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)", // Lila-Mavi
  "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", // Sarı-Turuncu
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)", // Pembe-Mavi
  "linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)", // Pembe-Gri
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)", // Mavi-Açık Mavi
  "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)", // Mor-Sarı
  "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)", // Turkuaz-Mavi
  "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)", // Sarı-Açık Mavi
  "linear-gradient(135deg, #9890e3 0%, #b1f4cf 100%)", // Mor-Yeşil
  "linear-gradient(135deg, #ebc0fd 0%, #d9ded8 100%)", // Pembe-Gri
];

// Ders adı -> Branş eşleştirmesi
const dersBransMap = {
  Matematik: "Matematik",
  "Türk Dili ve Edebiyatı": "Türk Dili ve Edebiyatı",
  Fizik: "Fizik",
  Kimya: "Kimya",
  Biyoloji: "Biyoloji",
  Tarih: "Tarih",
  Coğrafya: "Coğrafya",
  Felsefe: "Felsefe",
  "Din Kültürü ve Ahlak Bilgisi": "Din Kültürü",
  "Birinci Yabancı Dil": "Yabancı Dil",
  "Beden Eğitimi ve Spor": "Beden Eğitimi",
  "Görsel Sanatlar": "Görsel Sanatlar",
  Müzik: "Müzik",
  "T.C. İnkılap Tarihi ve Atatürkçülük": "Tarih",
  "Sağlık Bilgisi ve Trafik Kültürü": "Rehberlik",
  "Rehberlik ve Yönlendirme": "Rehberlik",
  "Seçmeli Matematik": "Matematik",
  "Seçmeli Fizik": "Fizik",
  "Seçmeli Kimya": "Kimya",
  "Seçmeli Biyoloji": "Biyoloji",
  "Temel Matematik": "Matematik",
  "Seçmeli Tarih": "Tarih",
  "Seçmeli Coğrafya": "Coğrafya",
  "Seçmeli Türk Dili ve Edebiyatı": "Türk Dili ve Edebiyatı",
  "Matematik Uygulamaları": "Matematik",
  "Fen Bilimleri Uygulamaları": "Fen Bilimleri",
  "Sosyal Bilim Çalışmaları": "Sosyal Bilimler",
  "Astronomi ve Uzay Bilimleri": "Fen Bilimleri",
  "Kuran-ı Kerim": "Din Kültürü",
  "Temel Dini Bilgiler": "Din Kültürü",
  "Peygamberimizin Hayatı": "Din Kültürü",
  "Spor Eğitimi": "Beden Eğitimi",
  "Sanat Eğitimi": "Görsel Sanatlar",
  "Osmanlı Türkçesi": "Türk Dili ve Edebiyatı",
};

// Ders adı -> Kısa kod eşleştirmesi
const dersKodMap = {
  Matematik: "MAT",
  "Türk Dili ve Edebiyatı": "TDE",
  Fizik: "FIZ",
  Kimya: "KIM",
  Biyoloji: "BIO",
  Tarih: "TAR",
  Coğrafya: "COG",
  Felsefe: "FEL",
  "Din Kültürü ve Ahlak Bilgisi": "DIN",
  "Birinci Yabancı Dil": "YDL",
  "Beden Eğitimi ve Spor": "BED",
  "Görsel Sanatlar": "GOR",
  Müzik: "MUZ",
  "T.C. İnkılap Tarihi ve Atatürkçülük": "INK",
  "Sağlık Bilgisi ve Trafik Kültürü": "SBT",
  "Rehberlik ve Yönlendirme": "REH",
  "Seçmeli Matematik": "SMT",
  "Seçmeli Fizik": "SFZ",
  "Seçmeli Kimya": "SKM",
  "Seçmeli Biyoloji": "SBI",
  "Temel Matematik": "TMT",
  "Seçmeli Tarih": "STR",
  "Seçmeli Coğrafya": "SCG",
  "Seçmeli Türk Dili ve Edebiyatı": "STE",
  "Matematik Uygulamaları": "MAU",
  "Fen Bilimleri Uygulamaları": "FBU",
  "Sosyal Bilim Çalışmaları": "SBC",
  "Astronomi ve Uzay Bilimleri": "AUB",
  "Kuran-ı Kerim": "KUR",
  "Temel Dini Bilgiler": "TDB",
  "Peygamberimizin Hayatı": "PGH",
  "Spor Eğitimi": "SPE",
  "Sanat Eğitimi": "SNE",
  "Osmanlı Türkçesi": "OSM",
};

// DOM elementleri
const derslerGrid = document.getElementById("derslerGrid");
const emptyState = document.getElementById("emptyState");
const formYeniDers = document.getElementById("formYeniDers");
const btnYeniDers = document.getElementById("btnYeniDers");
const searchInput = document.getElementById("searchInput");
const sinifFiltre = document.getElementById("filterSinif");
const bransFiltre = document.getElementById("filterBrans");
const turFiltre = document.getElementById("filterTur");
const durumFiltre = document.getElementById("filterDurum");
const siralamaFiltre = document.getElementById("filterSiralama");

// Sayfa yüklendiğinde
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Ders yönetimi sayfası yüklendi");

  // Kullanıcı kontrolü
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const currentSchool = JSON.parse(localStorage.getItem("currentSchool"));

  console.log("👤 Kullanıcı:", currentUser);
  console.log("🏫 Okul:", currentSchool);

  if (!currentUser || !currentSchool) {
    console.warn("⚠️ Kullanıcı bilgisi bulunamadı");
    window.location.href = "./giris.html";
    return;
  }

  // Kullanıcı bilgilerini göster
  loadUserInfo();

  // Başlangıç fonksiyonları
  await loadTeachers();
  await loadDersler();
  initEventListeners();
  initColorPalette();
});

// ==========================================
// KULLANICI BİLGİLERİNİ GÖSTER
// ==========================================

function loadUserInfo() {
  const currentUserStr = localStorage.getItem("currentUser");
  const currentSchoolStr = localStorage.getItem("currentSchool");

  if (!currentUserStr) {
    console.error("❌ Kullanıcı bilgisi bulunamadı!");
    return;
  }

  try {
    const currentUser = JSON.parse(currentUserStr);
    const schoolInfo = currentSchoolStr ? JSON.parse(currentSchoolStr) : null;

    // Kullanıcı bilgilerini göster
    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    const userInitials = document.getElementById("userInitials");
    const okulAdi = document.getElementById("okulAdi");

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
    console.error("❌ Kullanıcı bilgisi parse hatası:", error);
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
// ÖĞRETMEN YÖNETİMİ
// ==========================================

async function loadTeachers() {
  try {
    console.log("👨‍🏫 Öğretmenler yükleniyor...");

    const result = await window.electronAPI.getAllTeachers();

    if (result.success) {
      allTeachers = result.data.filter((t) => t.durum === 1);
      console.log(`✅ ${allTeachers.length} öğretmen yüklendi`);

      // Branş filtresini doldur
      populateBransFilter();
    } else {
      console.error("❌ Öğretmen yükleme hatası:", result.message);
      Bildirim.error("Öğretmenler yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
    Bildirim.error("Öğretmenler yüklenirken hata oluştu!");
  }
}

function populateBransFilter() {
  if (!bransFiltre) return;

  // Benzersiz branşları al
  const branslar = [
    ...new Set(allTeachers.map((t) => t.brans).filter((b) => b)),
  ];
  branslar.sort();

  bransFiltre.innerHTML = '<option value="">Tüm Branşlar</option>';

  branslar.forEach((brans) => {
    const option = document.createElement("option");
    option.value = brans;
    option.textContent = brans;
    bransFiltre.appendChild(option);
  });

  console.log(`✅ ${branslar.length} branş filtreye eklendi`);
}

// ==========================================
// DERS YÖNETİMİ
// ==========================================

async function loadDersler() {
  try {
    console.log("📚 Dersler yükleniyor...");

    const result = await window.electronAPI.getAllDersler();

    if (result.success) {
      allDersler = result.data;
      filteredDersler = [...allDersler];
      console.log(`✅ ${allDersler.length} ders yüklendi`);

      renderDersler();
      updateStats();

      Bildirim.success(`${allDersler.length} ders yüklendi!`, null, 2000);
    } else {
      console.error("❌ Ders yükleme hatası:", result.message);
      Bildirim.error("Dersler yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Ders yükleme hatası:", error);
    Bildirim.error("Dersler yüklenirken hata oluştu!");
  }
}

function renderDersler() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageDersler = filteredDersler.slice(startIndex, endIndex);

  // Boş durum kontrolü
  if (filteredDersler.length === 0) {
    derslerGrid.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 64px; margin-bottom: 16px">Dersler</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
          ${
            allDersler.length === 0
              ? "Henüz ders kaydı yok"
              : "Arama kriterlerine uygun ders bulunamadı"
          }
        </div>
        <div style="font-size: 14px; color: var(--text-secondary)">
          ${
            allDersler.length === 0
              ? '"Yeni Ders Ekle" butonuna tıklayarak ilk kaydı oluşturun'
              : "Farklı filtreler deneyebilirsiniz"
          }
        </div>
      </div>
    `;
    const pagination = document.getElementById("pagination");
    if (pagination) pagination.style.display = "none";
    return;
  }

  // Ders kartlarını oluştur
  let html = "";

  pageDersler.forEach((ders, index) => {
    const sinifSeviyeleri = ders.sinif_seviyeleri
      ? ders.sinif_seviyeleri.split(",").join(", ")
      : "-";
    const ogretmenler = ders.ogretmenler || [];
    const ogretmenText =
      ogretmenler.length > 0
        ? ogretmenler.map((o) => o.ad_soyad).join(", ")
        : "Atanmamış";

    const durumBadge =
      ders.durum === 1
        ? '<span class="badge badge-success">Aktif</span>'
        : '<span class="badge badge-danger">Pasif</span>';

    const turBadge =
      ders.ders_turu === "Ortak"
        ? '<span class="badge badge-primary">Ortak</span>'
        : '<span class="badge badge-warning">Seçmeli</span>';

    html += `
      <div class="ders-card" style="animation: fadeIn 0.5s ease ${
        index * 0.05
      }s both;">
        <div class="ders-card-header" style="background: ${
          ders.ders_rengi || gradientColors[0]
        };">
          <div class="ders-card-code">${ders.ders_kodu}</div>
          <div class="ders-card-badges">
            ${turBadge}
            ${durumBadge}
          </div>
        </div>
        <div class="ders-card-body">
          <h3 class="ders-card-title">${ders.ders_adi}</h3>
          <div class="ders-card-info">
            <div class="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span>${sinifSeviyeleri}. Sınıf</span>
            </div>
            <div class="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>${ders.haftalik_saat} saat/hafta</span>
            </div>
            <div class="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>${ders.ders_blogu}</span>
            </div>
            <div class="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>${ogretmenText}</span>
            </div>
            ${
              ders.brans
                ? `
            <div class="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>${ders.brans}</span>
            </div>
            `
                : ""
            }
          </div>
        </div>
        <div class="ders-card-footer">
  <button class="btn-icon btn-info" data-id="${
    ders.id
  }" data-action="detay" title="Detay">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  </button>
  <button class="btn-icon btn-primary" data-id="${
    ders.id
  }" data-action="duzenle" title="Düzenle">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  </button>
  <button class="btn-icon btn-danger" data-id="${
    ders.id
  }" data-action="sil" title="Sil">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  </button>
</div>
      </div>
    `;
  });

  derslerGrid.innerHTML = html;

  // Event listener'ları bağla (1 KEZ!)
  document.querySelectorAll(".ders-card-footer button").forEach((btn) => {
    // Önceki listener'ları temizle
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = newBtn.dataset.id;
      const action = newBtn.dataset.action;

      if (action === "detay") dersDetay(id);
      else if (action === "duzenle") duzenleDers(id);
      else if (action === "sil") silDers(id);
    });
  });

  renderPagination();
}

// ==========================================
// İSTATİSTİKLERİ GÜNCELLE
// ==========================================

function updateStats() {
  const toplamDers = allDersler.length;
  const aktifDers = allDersler.filter((d) => d.durum === 1).length;
  const ortakDers = allDersler.filter((d) => d.ders_turu === "Ortak").length;
  const secmeliDers = allDersler.filter(
    (d) => d.ders_turu === "Seçmeli"
  ).length;
  const ogretmenliDers = allDersler.filter(
    (d) => d.ogretmenler && d.ogretmenler.length > 0
  ).length;
  const toplamSaat = allDersler.reduce(
    (sum, d) => sum + (parseInt(d.haftalik_saat) || 0),
    0
  );

  const statToplam = document.getElementById("statToplam");
  const statAktif = document.getElementById("statAktif");
  const statOrtak = document.getElementById("statOrtak");
  const statSecmeli = document.getElementById("statSecmeli");
  const statOgretmenli = document.getElementById("statOgretmenli");
  const statToplamSaat = document.getElementById("statToplamSaat");

  if (statToplam) statToplam.textContent = toplamDers;
  if (statAktif) statAktif.textContent = aktifDers;
  if (statOrtak) statOrtak.textContent = ortakDers;
  if (statSecmeli) statSecmeli.textContent = secmeliDers;
  if (statOgretmenli)
    statOgretmenli.textContent = `${ogretmenliDers}/${toplamDers}`;
  if (statToplamSaat) statToplamSaat.textContent = toplamSaat;
}

// ==========================================
// PAGINATION
// ==========================================

function renderPagination() {
  const totalPages = Math.ceil(filteredDersler.length / itemsPerPage);
  const paginationDiv = document.getElementById("pagination");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");
  const paginationInfo = document.getElementById("paginationInfo");

  if (!paginationDiv) return;

  // 1 sayfa veya daha azsa pagination'ı gizle
  if (totalPages <= 1 || filteredDersler.length === 0) {
    paginationDiv.style.display = "none";
    return;
  }

  paginationDiv.style.display = "flex";

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredDersler.length);

  if (paginationInfo) {
    paginationInfo.textContent = `${startIndex}-${endIndex} / ${filteredDersler.length}`;
  }

  if (btnPrevPage) {
    btnPrevPage.disabled = currentPage === 1;
    btnPrevPage.style.opacity = currentPage === 1 ? "0.5" : "1";
    btnPrevPage.style.cursor = currentPage === 1 ? "not-allowed" : "pointer";
  }

  if (btnNextPage) {
    btnNextPage.disabled = currentPage === totalPages;
    btnNextPage.style.opacity = currentPage === totalPages ? "0.5" : "1";
    btnNextPage.style.cursor =
      currentPage === totalPages ? "not-allowed" : "pointer";
  }

  console.log(`📄 Pagination: Sayfa ${currentPage}/${totalPages}`);
}

function changePage(page) {
  const totalPages = Math.ceil(filteredDersler.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  renderDersler();
  console.log(`📄 Sayfa değiştirildi: ${currentPage}/${totalPages}`);
}

// ==========================================
// FİLTRELEME VE ARAMA
// ==========================================

function handleFilter() {
  const sinif = sinifFiltre.value;
  const brans = bransFiltre.value;
  const tur = turFiltre.value;
  const durum = durumFiltre.value;
  const searchTerm = searchInput.value.toLowerCase();
  const siralama = siralamaFiltre.value;

  filteredDersler = allDersler.filter((ders) => {
    // Sınıf filtresi
    const matchesSinif =
      !sinif ||
      (ders.sinif_seviyeleri && ders.sinif_seviyeleri.includes(sinif));

    // Branş filtresi
    const matchesBrans = !brans || ders.brans === brans;

    // Tür filtresi
    const matchesTur = !tur || ders.ders_turu === tur;

    // Durum filtresi
    const matchesDurum = !durum || ders.durum === parseInt(durum);

    // Arama filtresi
    const matchesSearch =
      !searchTerm ||
      ders.ders_adi.toLowerCase().includes(searchTerm) ||
      ders.ders_kodu.toLowerCase().includes(searchTerm) ||
      (ders.brans && ders.brans.toLowerCase().includes(searchTerm));

    return (
      matchesSinif &&
      matchesBrans &&
      matchesTur &&
      matchesDurum &&
      matchesSearch
    );
  });

  // Sıralama
  if (siralama) {
    filteredDersler.sort((a, b) => {
      if (siralama === "haftalik_saat") {
        return b.haftalik_saat - a.haftalik_saat;
      }
      return String(a[siralama]).localeCompare(String(b[siralama]), "tr");
    });
  }

  currentPage = 1;
  renderDersler();
}

function handleSearch() {
  handleFilter();
}

// ==========================================
// PART 2: MODAL YÖNETİMİ VE AKILLI SİSTEMLER
// ==========================================

// ==========================================
// MODAL YÖNETİMİ
// ==========================================

function openModal(modalId, callback) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
    modal.style.zIndex = "9999";
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      if (callback && typeof callback === "function") {
        callback();
      }
    });
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
    document.body.style.overflow = "";

    if (modalId === "modalYeniDers") {
      formYeniDers.reset();
      delete formYeniDers.dataset.editId;
      document.getElementById("modalBaslikText").textContent =
        "Yeni Ders Kaydı";
      goToStep(1);
      selectedTeachers = [];
    }
  }
}

// ==========================================
// STEP NAVIGATION
// ==========================================

function goToStep(step) {
  if (step < 1 || step > totalSteps) {
    console.warn(`⚠️ Geçersiz step: ${step}`);
    return;
  }

  console.log(`📍 Step değiştiriliyor: ${step}/${totalSteps}`);

  // Tüm step içeriklerini gizle
  const formSteps = document.querySelectorAll(".form-step-content");
  formSteps.forEach((s) => {
    s.classList.remove("active");
  });

  // Seçili step'i göster
  const targetStep = document.querySelector(
    `.form-step-content[data-step="${step}"]`
  );
  if (targetStep) {
    targetStep.classList.add("active");
  }

  // Step indicator'ları güncelle
  const stepIndicators = document.querySelectorAll(".form-step[data-step]");
  stepIndicators.forEach((stepEl) => {
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

  // Butonları güncelle
  const btnPrevStep = document.getElementById("btnPrevStep");
  const btnNextStep = document.getElementById("btnNextStep");
  const btnKaydet = document.getElementById("btnKaydet");

  if (btnPrevStep) {
    btnPrevStep.style.display = step === 1 ? "none" : "inline-flex";
    btnPrevStep.onclick = () => goToStep(step - 1);
  }

  if (btnNextStep) {
    btnNextStep.style.display = step === totalSteps ? "none" : "inline-flex";
    btnNextStep.onclick = () => {
      if (validateStep(step)) {
        goToStep(step + 1);
      }
    };
  }

  if (btnKaydet) {
    btnKaydet.style.display = step === totalSteps ? "inline-flex" : "none";
  }

  // Step 3'e geçildiğinde öğretmen listelerini doldur
  if (step === 3) {
    populateTeacherLists();
  }

  currentStep = step;
  console.log(`✅ Step ${step} aktif`);
}

// ==========================================
// STEP VALİDASYONU
// ==========================================

function validateStep(step) {
  if (step === 1) {
    // Ders adı kontrolü
    const dersAdi = document.getElementById("dersAdi");
    const manuelDersAdi = document.getElementById("manuelDersAdi");

    let finalDersAdi = dersAdi.value;
    if (dersAdi.value === "manuel") {
      finalDersAdi = manuelDersAdi.value.trim();
      if (!finalDersAdi) {
        Bildirim.error("Lütfen ders adını girin!");
        manuelDersAdi.focus();
        return false;
      }
    } else if (!finalDersAdi) {
      Bildirim.error("Lütfen ders seçin!");
      dersAdi.focus();
      return false;
    }

    // Sınıf seviyesi kontrolü
    const sinifCheckboxes = document.querySelectorAll(
      'input[name="sinifSeviyesi"]:checked'
    );
    if (sinifCheckboxes.length === 0) {
      Bildirim.error("Lütfen en az bir sınıf seviyesi seçin!");
      return false;
    }

    // Ders kodu kontrolü
    const dersKodu = document.getElementById("dersKodu");
    if (!dersKodu.value.trim()) {
      Bildirim.error("Ders kodu otomatik oluşturulamadı!");
      return false;
    }

    // Branş kontrolü
    const brans = document.getElementById("brans");
    if (!brans.value) {
      Bildirim.error("Lütfen branş seçin!");
      brans.focus();
      return false;
    }

    // Seçmeli ders ise grup kontrolü
    const dersTuru = document.querySelector(
      'input[name="dersTuru"]:checked'
    ).value;
    if (dersTuru === "Seçmeli") {
      const secmeliGrup = document.getElementById("secmeliGrup");
      if (!secmeliGrup.value) {
        Bildirim.error("Seçmeli dersler için grup seçimi zorunludur!");
        secmeliGrup.focus();
        return false;
      }
    }
  }

  if (step === 2) {
    // Haftalık saat kontrolü
    const haftalikSaat = document.getElementById("haftalikSaat");
    const saat = parseInt(haftalikSaat.value);
    if (!saat || saat < 1 || saat > 10) {
      Bildirim.error("Haftalık ders saati 1-10 arası olmalıdır!");
      haftalikSaat.focus();
      return false;
    }

    // Ders bloğu kontrolü
    const dersBogu = document.getElementById("dersBogu");
    if (!dersBogu.value.trim()) {
      Bildirim.error("Lütfen ders bloğunu girin!");
      dersBogu.focus();
      return false;
    }

    // Blok toplamı kontrolü
    const blokToplamı = dersBogu.value
      .split("-")
      .reduce((sum, val) => sum + parseInt(val || 0), 0);
    if (blokToplamı !== saat) {
      Bildirim.error(
        `Blok toplamı (${blokToplamı}) haftalık saat (${saat}) ile eşleşmiyor!`
      );
      dersBogu.focus();
      return false;
    }
  }

  if (step === 4) {
    // Renk kontrolü
    const dersRengi = document.getElementById("dersRengi");
    if (!dersRengi.value) {
      Bildirim.error("Lütfen bir renk seçin!");
      return false;
    }
  }

  return true;
}

// ==========================================
// AKILLI DERS KODU OLUŞTURMA
// ==========================================

function generateDersKodu() {
  const dersAdiSelect = document.getElementById("dersAdi");
  const manuelDersAdi = document.getElementById("manuelDersAdi");
  const dersKoduInput = document.getElementById("dersKodu");
  const dersKoduHint = document.getElementById("dersKoduHint");
  const dersTuru =
    document.querySelector('input[name="dersTuru"]:checked')?.value || "Ortak";

  // Seçili sınıfları al
  const sinifCheckboxes = document.querySelectorAll(
    'input[name="sinifSeviyesi"]:checked'
  );
  if (sinifCheckboxes.length === 0) {
    dersKoduInput.value = "";
    dersKoduHint.textContent = "Önce sınıf seviyesi seçin";
    dersKoduHint.style.color = "#f97316";
    return;
  }

  // İlk seçili sınıfı al
  const ilkSinif = sinifCheckboxes[0].value;

  // Ders adını al
  let dersAdi = dersAdiSelect.value;
  if (dersAdi === "manuel") {
    dersAdi = manuelDersAdi.value.trim();
  }

  if (!dersAdi) {
    dersKoduInput.value = "";
    dersKoduHint.textContent = "Önce ders adı seçin veya girin";
    dersKoduHint.style.color = "#f97316";
    return;
  }

  // Ders kodunu oluştur
  let kisaKod = dersKodMap[dersAdi];

  if (!kisaKod) {
    // Manuel ders için ilk 3 harfi al
    kisaKod = dersAdi
      .toUpperCase()
      .replace(/[^A-ZÇĞİÖŞÜ]/g, "")
      .substring(0, 3);
  }

  // Seçmeli ders ise S ekle
  const secmeliPrefix = dersTuru === "Seçmeli" ? "S" : "";
  let dersKodu = `${ilkSinif}${secmeliPrefix}.${kisaKod}`;

  // Çakışma kontrolü
  let counter = 1;
  let originalKod = dersKodu;

  while (isDersKoduExists(dersKodu)) {
    // Son 2 harfi değiştir
    const kodParts = originalKod.split(".");
    const basePart = kodParts[0]; // 9 veya 9S
    const kodPart = kodParts[1]; // MAT

    if (kodPart.length >= 2) {
      // Son karakteri değiştir
      const newKod =
        kodPart.substring(0, kodPart.length - 1) +
        String.fromCharCode(65 + counter);
      dersKodu = `${basePart}.${newKod}`;
    } else {
      // Sayı ekle
      dersKodu = `${basePart}.${kodPart}${counter}`;
    }

    counter++;

    if (counter > 10) {
      Bildirim.warning(
        "Çok fazla benzer ders kodu var! Lütfen manuel düzenleyin."
      );
      break;
    }
  }

  dersKoduInput.value = dersKodu;

  // Hint mesajı
  if (sinifCheckboxes.length > 1) {
    const siniflar = Array.from(sinifCheckboxes)
      .map((cb) => cb.value)
      .join(", ");
    dersKoduHint.textContent = `Bu ders ${siniflar}. sınıflar için kaydedilecek`;
    dersKoduHint.style.color = "#00d9ff";
  } else {
    dersKoduHint.textContent = `Ders kodu: ${dersKodu}`;
    dersKoduHint.style.color = "#00f5a0";
  }
}

function isDersKoduExists(kod) {
  // Düzenleme modunda mevcut dersin kodunu hariç tut
  const editId = formYeniDers.dataset.editId;

  return allDersler.some((ders) => {
    if (editId && ders.id === parseInt(editId)) {
      return false;
    }
    return ders.ders_kodu === kod;
  });
}

// ==========================================
// AKILLI BLOK ÖNERİSİ (Genişletilmiş)
// ==========================================

function generateBlokOnerileri(haftalikSaat) {
  const saat = parseInt(haftalikSaat);
  if (!saat || saat < 1 || saat > 12) return [];

  const oneriler = [];

  // 🔹 Tek saatlik ders
  if (saat === 1) {
    oneriler.push("1");
  }

  // 🔹 2 saatlik ders (tam blok veya tek gün)
  if (saat === 2) {
    oneriler.push("2", "1-1");
  }

  // 🔹 3 saatlik ders
  if (saat === 3) {
    oneriler.push("3", "2-1", "1-2", "1-1-1");
  }

  // 🔹 4 saatlik ders
  if (saat === 4) {
    oneriler.push("4", "2-2", "3-1", "1-3", "2-1-1", "1-2-1", "1-1-2");
  }

  // 🔹 5 saatlik ders
  if (saat === 5) {
    oneriler.push("2-3", "3-2", "2-2-1", "1-2-2", "1-1-1-2", "1-1-1-1-1");
  }

  // 🔹 6 saatlik ders
  if (saat === 6) {
    oneriler.push("3-3", "2-2-2", "4-2", "2-4", "1-2-3", "1-3-2");
  }

  // 🔹 7 saatlik ders
  if (saat === 7) {
    oneriler.push("2-2-3", "3-2-2", "2-3-2", "4-3", "3-4", "1-2-2-2");
  }

  // 🔹 8 saatlik ders
  if (saat === 8) {
    oneriler.push("2-3-3", "3-3-2", "2-2-2-2", "4-4", "3-2-3", "2-4-2");
  }

  // 🔹 9 saatlik ders
  if (saat === 9) {
    oneriler.push("3-3-3", "4-3-2", "2-4-3", "3-4-2", "2-2-2-3");
  }

  // 🔹 10 saatlik ders
  if (saat === 10) {
    oneriler.push("4-4-2", "2-2-2-2-2", "3-3-4", "4-3-3", "5-5");
  }

  // 🔹 11 saatlik ders (az rastlanır ama destekli)
  if (saat === 11) {
    oneriler.push("3-4-4", "4-4-3", "2-3-3-3", "2-2-2-2-3");
  }

  // 🔹 12 saatlik ders
  if (saat === 12) {
    oneriler.push("4-4-4", "4-4-2-2", "3-3-3-3", "2-2-2-2-2-2");
  }

  // 🔹 Dengeli dağılımlar (otomatik)
  if (saat % 2 === 0 && saat >= 4 && saat <= 10) {
    const gunlukSaat = saat / 2;
    oneriler.push(`${gunlukSaat}-${gunlukSaat}`);
  }
  if (saat % 3 === 0 && saat >= 6 && saat <= 9) {
    const gunlukSaat = saat / 3;
    oneriler.push(`${gunlukSaat}-${gunlukSaat}-${gunlukSaat}`);
  }

  // 🔹 Her gün 1 saat (haftada 5 güne kadar)
  if (saat <= 5) {
    oneriler.push(Array(saat).fill("1").join("-"));
  }

  // 🔹 Benzersiz önerileri döndür
  return [...new Set(oneriler)];
}

function showBlokOnerileri(haftalikSaat) {
  const blokOneriGroup = document.getElementById("blokOneriGroup");
  const blokOneriGrid = document.getElementById("blokOneriGrid");

  if (!haftalikSaat || haftalikSaat < 1) {
    blokOneriGroup.style.display = "none";
    return;
  }

  const oneriler = generateBlokOnerileri(haftalikSaat);

  if (oneriler.length === 0) {
    blokOneriGroup.style.display = "none";
    return;
  }

  let html = "";
  oneriler.forEach((oneri) => {
    html += `
      <button type="button" class="blok-oneri-btn" onclick="selectBlok('${oneri}')">
        <span class="blok-text">${oneri}</span>
        <span class="blok-days">${oneri.split("-").length} gün</span>
      </button>
    `;
  });

  blokOneriGrid.innerHTML = html;
  blokOneriGroup.style.display = "block";
}

function selectBlok(blok) {
  const dersBogu = document.getElementById("dersBogu");
  dersBogu.value = blok;

  // 🔹 Öneri butonlarını vurgula
  const buttons = document.querySelectorAll(".blok-oneri-btn");
  buttons.forEach((btn) => {
    btn.classList.remove("selected");
    if (btn.querySelector(".blok-text").textContent === blok) {
      btn.classList.add("selected");
    }
  });

  Bildirim.success(`Blok seçildi: ${blok}`, null, 1500);
}

// ==========================================
// ÖĞRETMEN LİSTELEME VE SEÇİM
// ==========================================

function populateTeacherLists() {
  const brans = document.getElementById("brans").value;
  const bransOgretmenList = document.getElementById("bransOgretmenList");
  const tumOgretmenList = document.getElementById("tumOgretmenList");

  console.log("🔄 populateTeacherLists çağrıldı");
  console.log("📚 Seçili branş:", brans);
  console.log("👨‍🏫 Toplam öğretmen sayısı:", allTeachers.length);

  if (!bransOgretmenList || !tumOgretmenList) {
    console.error("❌ Öğretmen list elementleri bulunamadı!");
    return;
  }

  if (allTeachers.length === 0) {
    const emptyMessage = `
      <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 12px; opacity: 0.5;">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p>Sistemde aktif öğretmen bulunamadı</p>
      </div>
    `;
    bransOgretmenList.innerHTML = emptyMessage;
    tumOgretmenList.innerHTML = emptyMessage;
    return;
  }

  // Branşa uygun öğretmenler
  if (brans) {
    const bransOgretmenleri = allTeachers.filter((t) => t.brans === brans);

    console.log(`✅ ${bransOgretmenleri.length} branş eşleşen öğretmen`);

    if (bransOgretmenleri.length > 0) {
      let html = "";
      bransOgretmenleri.forEach((ogretmen) => {
        const isSelected = selectedTeachers.includes(ogretmen.id);
        html += `
          <label class="ogretmen-card ${isSelected ? "selected" : ""}">
            <input 
              type="checkbox" 
              value="${ogretmen.id}" 
              ${isSelected ? "checked" : ""}
              onchange="toggleTeacher(${ogretmen.id})"
            />
            <div class="ogretmen-info">
              <div class="ogretmen-name">${ogretmen.ad_soyad}</div>
              <div class="ogretmen-meta">${
                ogretmen.brans || "Branş belirtilmemiş"
              }</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="check-icon">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </label>
        `;
      });
      bransOgretmenList.innerHTML = html;
      console.log("✅ Branşa uygun öğretmenler listelendi");
    } else {
      bransOgretmenList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 12px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>Bu branşta öğretmen bulunamadı</p>
        </div>
      `;
    }
  } else {
    bransOgretmenList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 12px; opacity: 0.5;">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p>Branş seçildiğinde öğretmenler listelenecek</p>
      </div>
    `;
  }

  // Tüm öğretmenler
  let tumHtml = "";
  allTeachers.forEach((ogretmen) => {
    const isSelected = selectedTeachers.includes(ogretmen.id);
    tumHtml += `
      <label class="ogretmen-card ${isSelected ? "selected" : ""}">
        <input 
          type="checkbox" 
          value="${ogretmen.id}" 
          ${isSelected ? "checked" : ""}
          onchange="toggleTeacher(${ogretmen.id})"
        />
        <div class="ogretmen-info">
          <div class="ogretmen-name">${ogretmen.ad_soyad}</div>
          <div class="ogretmen-meta">${
            ogretmen.brans || "Branş belirtilmemiş"
          }</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="check-icon">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </label>
    `;
  });
  tumOgretmenList.innerHTML = tumHtml;
  console.log("✅ Tüm öğretmenler listelendi:", allTeachers.length);
}

function toggleTeacher(teacherId) {
  const index = selectedTeachers.indexOf(teacherId);

  if (index > -1) {
    selectedTeachers.splice(index, 1);
  } else {
    selectedTeachers.push(teacherId);
  }

  // Kartları güncelle
  const cards = document.querySelectorAll(`input[value="${teacherId}"]`);
  cards.forEach((input) => {
    const card = input.closest(".ogretmen-card");
    if (card) {
      if (selectedTeachers.includes(teacherId)) {
        card.classList.add("selected");
        input.checked = true;
      } else {
        card.classList.remove("selected");
        input.checked = false;
      }
    }
  });

  console.log("Seçili öğretmenler:", selectedTeachers);
}

// ==========================================
// RENK PALETİ
// ==========================================

function initColorPalette() {
  const colorGrid = document.getElementById("colorGrid");
  if (!colorGrid) return;

  let html = "";
  gradientColors.forEach((color, index) => {
    html += `
      <div class="color-option" onclick="selectColor('${color}', this)" style="background: ${color};" title="Renk ${
      index + 1
    }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="check-icon">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    `;
  });

  colorGrid.innerHTML = html;
}

function selectColor(color, element) {
  const dersRengi = document.getElementById("dersRengi");
  dersRengi.value = color;

  // Tüm seçimleri kaldır
  const colorOptions = document.querySelectorAll(".color-option");
  colorOptions.forEach((opt) => opt.classList.remove("selected"));

  // Seçili olanı işaretle
  element.classList.add("selected");

  console.log("Seçilen renk:", color);
}

// ==========================================
// PART 3: FORM İŞLEMLERİ VE EVENT LISTENERS
// ==========================================

// ==========================================
// FORM SUBMIT
// ==========================================

async function handleFormSubmit(e) {
  e.preventDefault();

  // Son step'i validate et
  if (!validateStep(currentStep)) {
    return;
  }

  // Ders adını al
  const dersAdiSelect = document.getElementById("dersAdi");
  const manuelDersAdi = document.getElementById("manuelDersAdi");
  let dersAdi = dersAdiSelect.value;
  if (dersAdi === "manuel") {
    dersAdi = manuelDersAdi.value.trim();
  }

  // Sınıf seviyelerini al
  const sinifCheckboxes = document.querySelectorAll(
    'input[name="sinifSeviyesi"]:checked'
  );
  const sinifSeviyeleri = Array.from(sinifCheckboxes)
    .map((cb) => cb.value)
    .join(",");

  // Ders türünü al
  const dersTuru = document.querySelector(
    'input[name="dersTuru"]:checked'
  ).value;

  // Seçmeli grup (sadece seçmeli derslerde)
  const secmeliGrup =
    dersTuru === "Seçmeli"
      ? document.getElementById("secmeliGrup").value
      : null;

  // Form verilerini topla
  const dersData = {
    ders_adi: dersAdi,
    ders_kodu: document.getElementById("dersKodu").value.trim(),
    sinif_seviyeleri: sinifSeviyeleri,
    alan: document.getElementById("alan").value || null,
    brans: document.getElementById("brans").value,
    ders_turu: dersTuru,
    secmeli_grup: secmeliGrup,
    haftalik_saat: parseInt(document.getElementById("haftalikSaat").value),
    ders_blogu: document.getElementById("dersBogu").value.trim(),
    ders_rengi: document.getElementById("dersRengi").value,
    notlar: document.getElementById("notlar").value.trim() || null,
    durum: parseInt(document.getElementById("durum").value),
    ogretmen_ids: selectedTeachers,
  };

  const editId = formYeniDers.dataset.editId;

  try {
    let result;

    if (editId) {
      console.log("✏️ Ders güncelleniyor:", editId, dersData);
      dersData.id = parseInt(editId);
      result = await window.electronAPI.updateDers(dersData);
    } else {
      console.log("➕ Yeni ders ekleniyor:", dersData);

      // Ders kodu çakışma kontrolü
      if (isDersKoduExists(dersData.ders_kodu)) {
        Bildirim.error(`${dersData.ders_kodu} ders kodu zaten kullanılıyor!`);
        goToStep(1);
        document.getElementById("dersKodu").focus();
        return;
      }

      result = await window.electronAPI.addDers(dersData);
    }

    if (result.success) {
      closeModal("modalYeniDers");
      formYeniDers.reset();
      delete formYeniDers.dataset.editId;
      selectedTeachers = [];
      goToStep(1);

      await loadDersler();

      Bildirim.success(
        editId
          ? "Ders başarıyla güncellendi!"
          : `🎉 ${dersData.ders_adi} (${dersData.ders_kodu}) başarıyla oluşturuldu!`
      );
    } else {
      Bildirim.error(result.message || "İşlem başarısız!");
    }
  } catch (error) {
    console.error("❌ Form submit hatası:", error);
    Bildirim.error("Bir hata oluştu!");
  }
}

// ==========================================
// DERS DÜZENLE - MODERN, ÇALIŞIR!
// ==========================================
async function duzenleDers(dersId) {
  const id = Number(dersId);
  let ders = allDersler.find((d) => d.id === id);
  if (!ders) ders = filteredDersler.find((d) => d.id === id);

  if (!ders) {
    Bildirim.error("Ders bulunamadı!");
    return;
  }

  console.log("Düzenlenen ders:", ders);

  // Modal başlığını değiştir
  const modalBaslikText = document.getElementById("modalBaslikText");
  if (modalBaslikText) modalBaslikText.textContent = "Ders Düzenle";

  // Edit ID
  const form = document.getElementById("formYeniDers");
  if (form) form.dataset.editId = dersId;

  // Öğretmenler
  selectedTeachers = ders.ogretmenler ? ders.ogretmenler.map((o) => o.id) : [];

  // Modal açıldıktan sonra doldur
  openModal("modalYeniDers", () => {
    // === STEP 1: Temel Bilgiler ===
    const dersAdiSelect = document.getElementById("dersAdi");
    const manuelDersGroup = document.getElementById("manuelDersGroup");
    const manuelDersAdi = document.getElementById("manuelDersAdi");

    const dersOption = Array.from(dersAdiSelect.options).find(
      (opt) => opt.value === ders.ders_adi
    );
    if (dersOption) {
      dersAdiSelect.value = ders.ders_adi;
      manuelDersGroup.style.display = "none";
    } else {
      dersAdiSelect.value = "manuel";
      manuelDersGroup.style.display = "block";
      manuelDersAdi.value = ders.ders_adi;
    }

    // Sınıf seviyeleri
    const sinifSeviyeleri = ders.sinif_seviyeleri
      ? ders.sinif_seviyeleri.split(",")
      : [];
    document.querySelectorAll('input[name="sinifSeviyesi"]').forEach((cb) => {
      cb.checked = sinifSeviyeleri.includes(cb.value);
    });

    // Diğer alanlar
    document.getElementById("dersKodu").value = ders.ders_kodu;
    document.getElementById("alan").value = ders.alan || "";
    document.getElementById("brans").value = ders.brans;

    // Ders türü
    document.querySelectorAll('input[name="dersTuru"]').forEach((radio) => {
      radio.checked = radio.value === ders.ders_turu;
    });

    // Seçmeli grup
    const secmeliGrupGroup = document.getElementById("secmeliGrupGroup");
    const secmeliGrup = document.getElementById("secmeliGrup");
    if (ders.ders_turu === "Seçmeli") {
      secmeliGrupGroup.style.display = "block";
      secmeliGrup.value = ders.secmeli_grup || "";
    } else {
      secmeliGrupGroup.style.display = "none";
    }

    // === STEP 2: Ders Detayları ===
    document.getElementById("haftalikSaat").value = ders.haftalik_saat;
    document.getElementById("dersBogu").value = ders.ders_blogu;
    showBlokOnerileri(ders.haftalik_saat);

    // === STEP 3: Öğretmenler ===
    populateTeacherLists();

    // === STEP 4: Renk ve Özet ===
    document.getElementById("dersRengi").value = ders.ders_rengi;
    document.getElementById("durum").value = ders.durum;
    document.getElementById("notlar").value = ders.notlar || "";

    // Renk vurgula
    document.querySelectorAll(".color-option").forEach((opt) => {
      opt.classList.toggle(
        "selected",
        opt.style.background === ders.ders_rengi
      );
    });

    // İlk adıma git
    goToStep(1);
  });
}

// ==========================================
// MODERN SİLME MODALI - %100 ÇALIŞIR!
// ==========================================

async function silDers(dersId) {
  // 1. ID'yi number yap (string geliyorsa)
  const id = Number(dersId);

  // 2. Hem allDersler hem filteredDersler'de ara
  let ders = allDersler.find((d) => d.id === id);
  if (!ders) {
    ders = filteredDersler.find((d) => d.id === id);
  }

  if (!ders) {
    console.error("Ders bulunamadı! ID:", id);
    console.log("allDersler:", allDersler);
    console.log("filteredDersler:", filteredDersler);
    Bildirim.error("Ders bulunamadı! Sayfa yenileniyor...");
    await loadDersler(); // Yeniden yükle
    return;
  }

  // 3. Modal oluştur
  const modalOverlay = document.createElement("div");
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.75); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    font-family: inherit;
  `;

  const modalBox = document.createElement("div");
  modalBox.style.cssText = `
    background: #1a1f3a; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; width: 90%; max-width: 440px;
    overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  `;

  modalBox.innerHTML = `
  <div style="text-align: center; padding: 32px 28px 20px;">
    <!-- ÇÖP KUTUSU İKONU -->
    <div style="
      width: 80px; height: 80px; margin: 0 auto 20px;
      background: linear-gradient(135deg, #ff3b30, #ff6b6b);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 36px; color: white;
      box-shadow: 0 8px 24px rgba(255, 59, 48, 0.4);
    ">Delete</div>
    <h3 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700;">Dersi Sil?</h3>
  </div>
  <div style="padding: 0 28px 24px; text-align: center; color: #ccc; line-height: 1.7; font-size: 15px;">
    <strong style="color: #fff;">"${ders.ders_adi}"</strong><br>
    <span style="color: #ff3b30; font-weight: 600; font-size: 14px;">(${ders.ders_kodu})</span><br><br>
    <span style="color: #ff5252; font-weight: 600;">Bu işlem <strong>geri alınamaz!</strong></span>
  </div>
  <div style="display: flex; gap: 14px; padding: 0 28px 28px;">
    <!-- VAZGEÇ BUTONU -->
    <button id="btnIptal" style="
      flex: 1; height: 48px; font-weight: 600; border-radius: 12px;
      background: rgba(255,255,255,0.08); color: #ccc;
      border: 1px solid rgba(255,255,255,0.15); cursor: pointer;
      transition: all 0.3s ease;
    ">Vazgeç</button>
    
    <!-- SİL BUTONU - DAHA CANLI RENK -->
    <button id="btnOnaySil" style="
      flex: 1; height: 48px; font-weight: 600; border-radius: 12px;
      background: linear-gradient(135deg, #ff3b30, #ff6b6b);
      color: white; border: none; cursor: pointer;
      transition: all 0.3s ease; box-shadow: 0 6px 16px rgba(255, 59, 48, 0.3);
    ">Evet, Sil!</button>
  </div>
`;

  // Modal DOM'a ekle
  modalOverlay.appendChild(modalBox);
  document.body.appendChild(modalOverlay);

  // 4. Butonlar
  const btnIptal = modalBox.querySelector("#btnIptal");
  const btnOnaySil = modalBox.querySelector("#btnOnaySil");

  btnIptal.onclick = () => document.body.removeChild(modalOverlay);

  btnOnaySil.onclick = async () => {
    btnOnaySil.disabled = true;
    btnOnaySil.innerHTML = "Siliniyor...";

    try {
      const result = await window.electronAPI.deleteDers(id);
      if (result.success) {
        document.body.removeChild(modalOverlay);

        // 5. Listeyi güncelle
        allDersler = allDersler.filter((d) => d.id !== id);
        filteredDersler = filteredDersler.filter((d) => d.id !== id);

        renderDersler();
        updateStats();

        Bildirim.success(`"${ders.ders_adi}" silindi!`);
      } else {
        btnOnaySil.disabled = false;
        btnOnaySil.innerHTML = "Evet, Sil!";
        Bildirim.error(result.message || "Silinemedi!");
      }
    } catch (err) {
      btnOnaySil.disabled = false;
      btnOnaySil.innerHTML = "Evet, Sil!";
      Bildirim.error("Bağlantı hatası!");
      console.error(err);
    }
  };
}

// ==========================================
// DERS DETAY - MODERN, ÇALIŞIR!
// ==========================================
function dersDetay(dersId) {
  const id = Number(dersId);
  let ders = allDersler.find((d) => d.id === id);
  if (!ders) ders = filteredDersler.find((d) => d.id === id);

  if (!ders) {
    Bildirim.error("Ders bulunamadı! Sayfa yenileniyor...");
    loadDersler();
    return;
  }

  const sinifSeviyeleri = ders.sinif_seviyeleri
    ? ders.sinif_seviyeleri.split(",").join(", ")
    : "-";
  const ogretmenler = ders.ogretmenler || [];
  const ogretmenText =
    ogretmenler.length > 0
      ? ogretmenler
          .map((o) => `• ${o.ad_soyad} (${o.brans || "Branş Yok"})`)
          .join("<br>")
      : "Öğretmen atanmamış";

  const modalOverlay = document.createElement("div");
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.75); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    font-family: inherit;
  `;

  const modalBox = document.createElement("div");
  modalBox.style.cssText = `
    background: #1a1f3a; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; width: 90%; max-width: 560px;
    overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  `;

  modalBox.innerHTML = `
    <!-- Başlık -->
    <div style="padding: 24px; background: linear-gradient(135deg, ${
      ders.ders_rengi || "#4361ee"
    }, #3f37c9); color: white; position: relative;">
      <button id="kapatDetay" style="position: absolute; top: 16px; right: 20px; background: none; border: none; color: white; font-size: 28px; cursor: pointer; line-height: 1;">&times;</button>
      <div style="text-align: center;">
        <div style="font-size: 13px; opacity: 0.9; font-family: monospace; margin-bottom: 6px;">${
          ders.ders_kodu
        }</div>
        <h3 style="margin: 0; font-size: 22px; font-weight: 700;">${
          ders.ders_adi
        }</h3>
      </div>
    </div>

    <!-- İçerik -->
    <div style="padding: 24px; color: #ddd; max-height: 70vh; overflow-y: auto;">
      <div style="display: grid; gap: 20px; font-size: 15px;">

        <!-- Genel Bilgiler -->
        <div style="background: rgba(67, 97, 238, 0.1); border-left: 4px solid #4361ee; padding: 16px; border-radius: 8px;">
          <h4 style="margin: 0 0 12px; color: #4361ee; font-size: 17px;">Genel Bilgiler</h4>
          <div style="display: grid; gap: 8px; line-height: 1.6;">
            <div><strong>Ders Türü:</strong> <span style="color: ${
              ders.ders_turu === "Ortak" ? "#4361ee" : "#ff9f1c"
            }">${ders.ders_turu}</span></div>
            ${
              ders.ders_turu === "Seçmeli" && ders.secmeli_grup
                ? `<div><strong>Seçmeli Grup:</strong> ${ders.secmeli_grup}</div>`
                : ""
            }
            <div><strong>Sınıf:</strong> ${sinifSeviyeleri}. Sınıf</div>
            <div><strong>Alan:</strong> ${ders.alan || "Tüm Alanlar"}</div>
            <div><strong>Branş:</strong> ${ders.brans}</div>
            <div><strong>Durum:</strong> <span style="color: ${
              ders.durum === 1 ? "#06ffa5" : "#ff6b6b"
            }">${ders.durum === 1 ? "Aktif" : "Pasif"}</span></div>
          </div>
        </div>

        <!-- Ders Planı -->
        <div style="background: rgba(0, 212, 255, 0.1); border-left: 4px solid #00d4ff; padding: 16px; border-radius: 8px;">
          <h4 style="margin: 0 0 12px; color: #00d4ff; font-size: 17px;">Ders Planı</h4>
          <div style="display: grid; gap: 8px; line-height: 1.6;">
            <div><strong>Haftalık Saat:</strong> ${
              ders.haftalik_saat
            } saat</div>
            <div><strong>Ders Bloğu:</strong> ${
              ders.ders_blogu
            } <small style="color: #aaa;">(${
    ders.ders_blogu.split("-").length
  } gün)</small></div>
          </div>
        </div>

        <!-- Öğretmenler -->
        <div style="background: rgba(6, 255, 165, 0.1); border-left: 4px solid #06ffa5; padding: 16px; border-radius: 8px;">
          <h4 style="margin: 0 0 12px; color: #06ffa5; font-size: 17px;">Atanmış Öğretmenler</h4>
          <div style="line-height: 1.8; color: #ccc;">
            ${ogretmenText}
          </div>
        </div>

        <!-- Notlar -->
        ${
          ders.notlar
            ? `
        <div style="background: rgba(255, 159, 28, 0.1); border-left: 4px solid #ff9f1c; padding: 16px; border-radius: 8px;">
          <h4 style="margin: 0 0 12px; color: #ff9f1c; font-size: 17px;">Notlar</h4>
          <div style="white-space: pre-wrap; color: #ddd;">${ders.notlar}</div>
        </div>
        `
            : ""
        }

        <!-- Oluşturma Tarihi -->
        ${
          ders.olusturma_tarihi
            ? `
        <div style="text-align: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 13px; color: #888;">
          <strong>Oluşturulma:</strong> ${new Date(
            ders.olusturma_tarihi
          ).toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        `
            : ""
        }
      </div>
    </div>
  `;

  modalOverlay.appendChild(modalBox);
  document.body.appendChild(modalOverlay);

  // Kapatma
  modalBox.querySelector("#kapatDetay").onclick = () =>
    document.body.removeChild(modalOverlay);
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) document.body.removeChild(modalOverlay);
  };
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function initEventListeners() {
  console.log("🎯 Event listener'lar başlatılıyor...");

  // Yeni ders butonu
  if (btnYeniDers) {
    btnYeniDers.addEventListener("click", () => {
      console.log("Yeni ders modalı açılıyor");

      formYeniDers.reset();
      delete formYeniDers.dataset.editId;
      selectedTeachers = [];

      document.getElementById("modalBaslikText").textContent =
        "Yeni Ders Kaydı";
      document.getElementById("manuelDersGroup").style.display = "none";
      document.getElementById("secmeliGrupGroup").style.display = "none";

      openModal("modalYeniDers", () => {
        goToStep(1);
      });
    });
  }

  // Ders adı değişimi
  const dersAdiSelect = document.getElementById("dersAdi");
  const manuelDersGroup = document.getElementById("manuelDersGroup");

  if (dersAdiSelect) {
    dersAdiSelect.addEventListener("change", function () {
      if (this.value === "manuel") {
        manuelDersGroup.style.display = "block";
        document.getElementById("manuelDersAdi").focus();
      } else {
        manuelDersGroup.style.display = "none";

        // Otomatik branş seçimi
        if (this.value && dersBransMap[this.value]) {
          document.getElementById("brans").value = dersBransMap[this.value];
        }

        // Ders kodu oluştur
        generateDersKodu();
      }
    });
  }

  // Manuel ders ekle butonu
  const btnManuelDers = document.getElementById("btnManuelDers");
  if (btnManuelDers) {
    btnManuelDers.addEventListener("click", () => {
      dersAdiSelect.value = "manuel";
      manuelDersGroup.style.display = "block";
      document.getElementById("manuelDersAdi").focus();
    });
  }

  // Manuel ders adı değişimi
  const manuelDersAdi = document.getElementById("manuelDersAdi");
  if (manuelDersAdi) {
    manuelDersAdi.addEventListener("input", function () {
      generateDersKodu();
    });
  }

  // Sınıf seviyeleri değişimi
  const sinifCheckboxes = document.querySelectorAll(
    'input[name="sinifSeviyesi"]'
  );
  sinifCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      generateDersKodu();
    });
  });

  // Ders türü değişimi
  const dersTuruRadios = document.querySelectorAll('input[name="dersTuru"]');
  dersTuruRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      const secmeliGrupGroup = document.getElementById("secmeliGrupGroup");
      if (this.value === "Seçmeli") {
        secmeliGrupGroup.style.display = "block";
      } else {
        secmeliGrupGroup.style.display = "none";
      }
      generateDersKodu();
    });
  });

  // Branş değişimi
  const bransSelect = document.getElementById("brans");
  if (bransSelect) {
    bransSelect.addEventListener("change", () => {
      if (currentStep === 3) {
        populateTeacherLists();
      }
    });
  }

  // Haftalık saat değişimi
  const haftalikSaat = document.getElementById("haftalikSaat");
  if (haftalikSaat) {
    haftalikSaat.addEventListener("input", function () {
      showBlokOnerileri(this.value);
    });
  }

  // Form submit
  if (formYeniDers) {
    formYeniDers.addEventListener("submit", handleFormSubmit);
  }

  // Filtreler
  if (sinifFiltre) sinifFiltre.addEventListener("change", handleFilter);
  if (bransFiltre) bransFiltre.addEventListener("change", handleFilter);
  if (turFiltre) turFiltre.addEventListener("change", handleFilter);
  if (durumFiltre) durumFiltre.addEventListener("change", handleFilter);
  if (searchInput) searchInput.addEventListener("input", handleSearch);

  // Filtreleme butonu
  const btnFiltrele = document.getElementById("btnFiltrele");
  if (btnFiltrele) {
    btnFiltrele.addEventListener("click", handleFilter);
  }

  // Sıralama
  if (siralamaFiltre) {
    siralamaFiltre.addEventListener("change", handleFilter);
  }

  // Pagination butonları
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        changePage(currentPage - 1);
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredDersler.length / itemsPerPage);
      if (currentPage < totalPages) {
        changePage(currentPage + 1);
      }
    });
  }

  // Çıkış butonu
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
        localStorage.clear();
        window.location.href = "giris.html";
      }
    });
  }

  // Modal kapatma butonları
  const closeButtons = document.querySelectorAll(".close-modal, .modal-close");
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const modal = this.closest(".modal-overlay");
      if (modal) {
        closeModal(modal.id);
      }
    });
  });

  // Modal dışına tıklama
  const modals = document.querySelectorAll(".modal-overlay");
  modals.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });

  // ESC tuşu ile modal kapatma
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModal = document.querySelector(
        ".modal-overlay[style*='display: block'], .modal-overlay[style*='display: flex']"
      );
      if (activeModal) {
        closeModal(activeModal.id);
      }
    }
  });

  console.log("✅ Event listener'lar başarıyla başlatıldı");
}

// ==========================================
// RAPORLAR SAYFASI
// ==========================================

function dersRaporlariAc() {
  console.log("📊 Ders raporları sayfası açılıyor...");
  window.location.href = "./raporlar/ders-raporlari.html";
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

// Animasyon için CSS
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

  .ders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .ders-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .ders-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    border-color: var(--primary);
  }

  .ders-card-header {
    padding: 20px;
    color: white;
    position: relative;
  }

  .ders-card-code {
    font-family: monospace;
    font-size: 12px;
    font-weight: 700;
    opacity: 0.9;
    margin-bottom: 8px;
  }

  .ders-card-badges {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    gap: 6px;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    backdrop-filter: blur(10px);
  }

  .badge-success {
    background: rgba(255, 255, 255, 0.3);
    color: white;
  }

  .badge-danger {
    background: rgba(255, 255, 255, 0.3);
    color: white;
  }

  .badge-primary {
    background: rgba(255, 255, 255, 0.3);
    color: white;
  }

  .badge-warning {
    background: rgba(255, 255, 255, 0.3);
    color: white;
  }

  .ders-card-body {
    padding: 20px;
  }

  .ders-card-title {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .ders-card-info {
    display: grid;
    gap: 10px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .info-item svg {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .ders-card-footer {
    padding: 12px 20px;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }

  .checkbox-card {
    position: relative;
    cursor: pointer;
  }

  .checkbox-card input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    cursor: pointer;
  }

  .checkbox-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .checkbox-card input[type="checkbox"]:checked ~ .checkbox-content {
    background: rgba(0, 217, 255, 0.1);
    border-color: #00d9ff;
  }

  .checkbox-icon {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .checkbox-label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .radio-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .radio-card {
    position: relative;
    cursor: pointer;
  }

  .radio-card input[type="radio"] {
    position: absolute;
    opacity: 0;
    cursor: pointer;
  }

  .radio-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .radio-card input[type="radio"]:checked ~ .radio-content {
    background: rgba(123, 47, 255, 0.1);
    border-color: #7b2fff;
  }

  .blok-oneri-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
  }

  .blok-oneri-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--text-primary);
  }

  .blok-oneri-btn:hover,
  .blok-oneri-btn.selected {
    background: rgba(0, 217, 255, 0.1);
    border-color: #00d9ff;
  }

  .blok-text {
    font-family: monospace;
    font-size: 16px;
    font-weight: 700;
  }

  .blok-days {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .ogretmen-list {
    max-height: 300px;
    overflow-y: auto;
    display: grid;
    gap: 8px;
    padding: 4px;
  }

  .ogretmen-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
  }

  .ogretmen-card:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .ogretmen-card.selected {
    background: rgba(0, 245, 160, 0.1);
    border-color: #00f5a0;
  }

  .ogretmen-card input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .ogretmen-info {
    flex: 1;
  }

  .ogretmen-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .ogretmen-meta {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .ogretmen-card .check-icon {
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .ogretmen-card.selected .check-icon {
    opacity: 1;
    color: #00f5a0;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 12px;
  }

  .color-option {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    border: 3px solid transparent;
  }

  .color-option:hover {
    transform: scale(1.1);
    border-color: white;
  }

  .color-option.selected {
    border-color: white;
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }

  .color-option .check-icon {
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .color-option.selected .check-icon {
    opacity: 1;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
  }
`;
document.head.appendChild(style);

console.log("✅ Ders yönetimi scripti yüklendi - Part 3 (TAMAMLANDI)!");
