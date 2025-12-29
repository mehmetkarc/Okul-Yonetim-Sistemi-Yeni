// ==========================================
// GEZİ PLANLAMA SİSTEMİ - JAVASCRIPT
// ==========================================

const { ipcRenderer } = require("electron");

// ==========================================
// GLOBAL DEĞİŞKENLER
// ==========================================

let currentUser = null;
let currentSchool = null;
let allGeziler = [];
let filteredGeziler = [];
let currentPage = 1;
const itemsPerPage = 10;

// Modal State
let editingGeziId = null;
let selectedKafileBaskan = null;
let selectedSorumluOgretmenler = [];
let selectedOgrenciler = [];
let selectedMisafirler = [];

// Ulaşım yönetimi için
let currentGeziIdForUlasim = null;
let currentGeziTuru = null;
let uploadedFiles = [];
let editingAracId = null;
let editingUcusId = null;

// ==========================================
// KOLTUK PLANI DEĞİŞKENLERİ
// ==========================================
let currentAracIdForKoltuk = null;
let currentAracPlakaForKoltuk = null;
let currentAracKapasiteForKoltuk = 54;
let koltukAtamalari = {}; // {koltukNo: {kisi_id, kisi_tipi, ad_soyad, cinsiyet}}
let allKatilimcilarForKoltuk = [];

// DOM Elemanları (let olarak, sonra atanacak)
let geziGrid;
let emptyState;
let geziModal;
let misafirModal;
let btnYeniGezi;
let searchInput;
let sortSelect;

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Gezi Planlama sayfası yüklendi");

  // DOM elemanlarını al (ÖNCE BU!)
  geziGrid = document.getElementById("geziGrid");
  emptyState = document.getElementById("emptyState");
  geziModal = document.getElementById("geziModal");
  misafirModal = document.getElementById("misafirModal");
  btnYeniGezi = document.getElementById("btnYeniGezi");
  searchInput = document.getElementById("searchInput");
  sortSelect = document.getElementById("sortSelect");

  // Kullanıcı bilgilerini al
  loadUserInfo();

  // Gezileri yükle
  await loadGeziler();

  // Event listener'ları ekle
  initEventListeners();

  // Filtreleri yükle
  updateFilterCounts();

  // İstatistikleri güncelle
  updateStats();
});

// ==========================================
// KULLANICI BİLGİLERİ
// ==========================================

function loadUserInfo() {
  const currentUserStr = localStorage.getItem("currentUser");
  const currentSchoolStr = localStorage.getItem("currentSchool");

  if (!currentUserStr) {
    console.error("❌ Kullanıcı bilgisi bulunamadı!");
    window.location.href = "giris.html";
    return;
  }

  currentUser = JSON.parse(currentUserStr);
  currentSchool = currentSchoolStr ? JSON.parse(currentSchoolStr) : null;

  console.log("👤 Kullanıcı:", currentUser);
  console.log("🏫 Okul:", currentSchool);
}

// ==========================================
// NAVİGASYON FONKSİYONLARI
// ==========================================

function geriDon() {
  window.history.back();
}

function anasayfayaDon() {
  window.location.href = "anasayfa.html";
}

// ==========================================
// GEZİLERİ YÜKLE
// ==========================================

async function loadGeziler() {
  try {
    console.log("📥 Geziler yükleniyor...");

    if (!currentSchool || !currentSchool.id) {
      console.warn("⚠️ Okul bilgisi bulunamadı");
      allGeziler = [];
      filteredGeziler = [];
      renderGeziler();
      return;
    }

    const result = await window.electronAPI.dbQuery(
      `SELECT 
        g.*,
        COUNT(DISTINCT go.id) as ogrenci_sayisi,
        COUNT(DISTINCT gog.id) as ogretmen_sayisi,
        COUNT(DISTINCT gm.id) as misafir_sayisi,
        kb.ad_soyad as kafile_baskani_adi
       FROM geziler g
       LEFT JOIN gezi_ogrenciler go ON g.id = go.gezi_id
       LEFT JOIN gezi_ogretmenler gog ON g.id = gog.gezi_id
       LEFT JOIN gezi_misafirler gm ON g.id = gm.gezi_id
       LEFT JOIN ogretmenler kb ON g.kafile_baskani_id = kb.id
       WHERE g.okul_id = ?
       GROUP BY g.id
       ORDER BY g.gezi_tarihi DESC`,
      [currentSchool.id]
    );

    if (result.success && result.data) {
      allGeziler = result.data;
      filteredGeziler = [...allGeziler];
      console.log(`✅ ${allGeziler.length} gezi yüklendi`);
    } else {
      allGeziler = [];
      filteredGeziler = [];
      console.warn("⚠️ Gezi bulunamadı");
    }

    renderGeziler();
    updateFilterCounts();
    updateStats();
  } catch (error) {
    console.error("❌ Gezi yükleme hatası:", error);
    Bildirim.goster("error", "Geziler yüklenirken hata oluştu!");
    allGeziler = [];
    filteredGeziler = [];
    renderGeziler();
  }
}
// ==========================================
// GEZİLERİ RENDER ET (ÜNVAN ÖNCELİKLİ)
// ==========================================

function renderGeziler() {
  // Boş durum kontrolü
  if (filteredGeziler.length === 0) {
    geziGrid.innerHTML = `
      <div class="empty-state">
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <h3>Gezi bulunamadı</h3>
        <p>Yeni bir gezi oluşturmak için yukarıdaki butona tıklayın</p>
      </div>
    `;
    return;
  }

  // Pagination hesaplama
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageGeziler = filteredGeziler.slice(startIndex, endIndex);

  // Kartları oluştur
  geziGrid.innerHTML = pageGeziler
    .map((gezi) => {
      // ✅ ÜNVAN ÖNCELİKLİ MANTIK: Önce ünvan, yoksa branş, o da yoksa "Öğretmen"
      const kafileBaskanUnvan =
        gezi.kafile_baskani_unvan || gezi.kafile_baskani_brans || "Öğretmen";

      return `
    <div class="gezi-card" data-id="${gezi.id}">
      <div class="gezi-card-header">
        <h3 class="gezi-card-title">${gezi.gezi_adi}</h3>
        <span class="gezi-card-badge badge-${gezi.gezi_turu.replace(
          "_",
          "-"
        )}">${getGeziTuruText(gezi.gezi_turu)}</span>
      </div>

      <div class="gezi-card-info">
        <div class="gezi-card-info-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>${formatDate(gezi.gezi_tarihi)} - ${formatDate(
        gezi.donus_tarihi
      )}</span>
        </div>

        <div class="gezi-card-info-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>${gezi.ogrenci_sayisi} Öğrenci • ${
        gezi.ogretmen_sayisi
      } Öğretmen</span>
        </div>

        <div class="gezi-card-info-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>${gezi.duzenlenen_yer}</span>
        </div>

        <div class="gezi-card-info-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
          </svg>
          <span><strong>${
            gezi.kafile_baskani_ad || "-"
          }</strong> • ${kafileBaskanUnvan}</span>
        </div>
      </div>

      <div class="gezi-card-status status-${gezi.durum}">${getDurumText(
        gezi.durum
      )}</div>

      <div class="gezi-card-actions">
        <button class="card-action-btn btn-detay" onclick="geziDetay(${
          gezi.id
        })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Detay
        </button>
        <button class="card-action-btn btn-duzenle" onclick="geziDuzenle(${
          gezi.id
        })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Düzenle
        </button>
        <button class="card-action-btn btn-ulasim" onclick="geziUlasim(${
          gezi.id
        })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          Ulaşım
        </button>
        <button class="card-action-btn btn-firma" onclick="geziFirma(${
          gezi.id
        })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Firma
        </button>
        <button class="card-action-btn btn-odeme" onclick="geziOdeme(${
          gezi.id
        })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          Ödeme
        </button>
        <button class="card-action-btn btn-pasaport" onclick="geziPasaport(${
          gezi.id
        })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="1" width="18" height="22" rx="2" ry="2"/>
            <circle cx="12" cy="10" r="3"/>
            <path d="M7 20a5 5 0 0 1 10 0"/>
          </svg>
          Pasaport
        </button>
        <button class="card-action-btn btn-raporlar" onclick="geziRaporlar(${
          gezi.id
        })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Raporlar
        </button>
        <button class="card-action-btn btn-sil" onclick="geziSil(${gezi.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
          Sil
        </button>
      </div>
    </div>
  `;
    })
    .join("");

  // Pagination güncelle
  updatePagination();
}
// ==========================================
// YENİ GEZİ MODAL (DÜZELTİLMİŞ)
// ==========================================

function openGeziModal() {
  editingGeziId = null;
  document.getElementById("modalTitle").textContent = "Yeni Gezi Oluştur";

  // Formu temizle
  clearGeziForm();

  // Modalı göster
  document.getElementById("geziModal").style.display = "flex";
}

function closeGeziModal() {
  // Modalı gizle
  document.getElementById("geziModal").style.display = "none";
  editingGeziId = null;
  clearGeziForm();
}

function clearGeziForm() {
  // Temel bilgiler
  document.getElementById("geziAdi").value = "";
  document.getElementById("duzenlenecekYer").value = "";
  document.getElementById("guzergah").value = "";
  document.getElementById("geziTarihi").value = "";
  document.getElementById("cikisSaati").value = "";
  document.getElementById("donusTarihi").value = "";
  document.getElementById("donusSaati").value = "";
  document.getElementById("geziKonusu").value = "";
  document.getElementById("geziAmaci").value = "";
  document.getElementById("arastirmaGorevi").value = "";
  document.getElementById("degerlendirme").value = "";

  // Gezi türü
  document
    .querySelectorAll('input[name="geziTuru"]')
    .forEach((radio) => (radio.checked = false));

  // Seçili listeler
  selectedKafileBaskan = null;
  selectedSorumluOgretmenler = [];
  selectedOgrenciler = [];
  selectedMisafirler = [];

  // UI temizle
  document.getElementById("selectedKafileBaskan").style.display = "none";
  document.getElementById("sorumluOgretmenList").innerHTML = "";
  document.getElementById("ogrenciList").innerHTML = "";
  document.getElementById("misafirList").innerHTML = "";
  document.getElementById("ogrenciCount").textContent = "0";
  document.getElementById("misafirCount").textContent = "0";
}
// ==========================================
// GEZİ KAYDET (GÜNCELLENMİŞ VERSİYON)
// ==========================================

async function geziKaydet() {
  console.log("🔵 geziKaydet FONKSİYONU ÇAĞRILDI!");

  try {
    console.log("🔵 ADIM 1: Validasyon başlıyor...");

    // Form değerlerini al
    const geziAdi = document.getElementById("geziAdi").value.trim();
    const duzenlenecekYer = document
      .getElementById("duzenlenecekYer")
      .value.trim();
    const guzergah = document.getElementById("guzergah").value.trim();
    const geziTarihi = document.getElementById("geziTarihi").value;
    const cikisSaati = document.getElementById("cikisSaati").value;
    const donusTarihi = document.getElementById("donusTarihi").value;
    const donusSaati = document.getElementById("donusSaati").value;
    const geziKonusu = document.getElementById("geziKonusu").value.trim();
    const geziAmaci = document.getElementById("geziAmaci").value.trim();
    const geziTuru = document.querySelector(
      'input[name="geziTuru"]:checked'
    )?.value;

    console.log("📊 Form Verileri:", {
      geziAdi,
      duzenlenecekYer,
      guzergah,
      geziTarihi,
      cikisSaati,
      donusTarihi,
      donusSaati,
      geziKonusu,
      geziAmaci,
      geziTuru,
      kafileBaskan: selectedKafileBaskan,
    });

    // Zorunlu alan kontrolleri
    if (!geziAdi) {
      console.log("❌ Gezi adı boş!");
      Bildirim.goster("warning", "Gezi adı boş olamaz!");
      return;
    }

    if (!duzenlenecekYer) {
      console.log("❌ Düzenlenecek yer boş!");
      Bildirim.goster("warning", "Düzenlenecek yer boş olamaz!");
      return;
    }

    if (!guzergah) {
      console.log("❌ Güzergah boş!");
      Bildirim.goster("warning", "Güzergah boş olamaz!");
      return;
    }

    if (!geziTarihi || !cikisSaati) {
      console.log("❌ Gezi tarihi/saati eksik!");
      Bildirim.goster("warning", "Gezi tarihi ve çıkış saati zorunludur!");
      return;
    }

    if (!donusTarihi || !donusSaati) {
      console.log("❌ Dönüş tarihi/saati eksik!");
      Bildirim.goster("warning", "Dönüş tarihi ve saati zorunludur!");
      return;
    }

    if (!geziKonusu) {
      console.log("❌ Gezi konusu boş!");
      Bildirim.goster("warning", "Gezi konusu boş olamaz!");
      return;
    }

    if (!geziAmaci) {
      console.log("❌ Gezi amacı boş!");
      Bildirim.goster("warning", "Gezi amacı boş olamaz!");
      return;
    }

    if (!geziTuru) {
      console.log("❌ Gezi türü seçilmemiş!");
      Bildirim.goster("warning", "Gezi türü seçmelisiniz!");
      return;
    }

    if (!selectedKafileBaskan) {
      console.log("❌ Kafile başkanı seçilmemiş!");
      Bildirim.goster("warning", "Kafile başkanı seçmelisiniz!");
      return;
    }

    console.log("✅ ADIM 1 TAMAMLANDI: Validasyon başarılı");
    console.log("🔵 ADIM 2: Gezi verisi hazırlanıyor...");

    // Gezi verisi
    const geziData = {
      gezi_adi: geziAdi,
      duzenlenen_yer: duzenlenecekYer,
      guzergah: guzergah,
      gezi_tarihi: geziTarihi,
      cikis_saati: cikisSaati,
      donus_tarihi: donusTarihi,
      donus_saati: donusSaati,
      gezi_konusu: geziKonusu,
      gezi_amaci: geziAmaci,
      arastirma_gorevi: document.getElementById("arastirmaGorevi").value.trim(),
      degerlendirme: document.getElementById("degerlendirme").value.trim(),
      gezi_turu: geziTuru,
      kafile_baskani_id: selectedKafileBaskan.id,
      durum: "planlanan",
    };

    console.log("📦 Hazırlanan Gezi Data:", geziData);
    console.log("✅ ADIM 2 TAMAMLANDI");

    let geziId;
    const kafileBaskanId = selectedKafileBaskan.id;

    if (editingGeziId) {
      console.log("🔵 ADIM 3: GÜNCELLEME MODU - ID:", editingGeziId);

      // Güncelleme
      const result = await window.electronAPI.dbQuery(
        `UPDATE geziler SET 
          gezi_adi = ?, duzenlenen_yer = ?, guzergah = ?,
          gezi_tarihi = ?, cikis_saati = ?, donus_tarihi = ?, donus_saati = ?,
          gezi_konusu = ?, gezi_amaci = ?, arastirma_gorevi = ?, degerlendirme = ?,
          gezi_turu = ?, kafile_baskani_id = ?, guncelleme_tarihi = datetime('now')
          WHERE id = ?`,
        [
          geziData.gezi_adi,
          geziData.duzenlenen_yer,
          geziData.guzergah,
          geziData.gezi_tarihi,
          geziData.cikis_saati,
          geziData.donus_tarihi,
          geziData.donus_saati,
          geziData.gezi_konusu,
          geziData.gezi_amaci,
          geziData.arastirma_gorevi,
          geziData.degerlendirme,
          geziData.gezi_turu,
          geziData.kafile_baskani_id,
          editingGeziId,
        ]
      );

      console.log("📊 Güncelleme Sonucu:", result);
      geziId = editingGeziId;

      if (result.success) {
        Bildirim.goster("success", "Gezi başarıyla güncellendi!");
        console.log("✅ GÜNCELLEME BAŞARILI");
      } else {
        console.log("❌ GÜNCELLEME HATASI:", result.message);
        throw new Error(result.message);
      }
    } else {
      console.log("🔵 ADIM 3: YENİ KAYIT MODU");

      // ✅ OKUL ID KONTROLÜ
      const okulId =
        currentSchool?.id || localStorage.getItem("currentSchoolId") || 1;
      console.log("📊 Kullanılacak Okul ID:", okulId);

      // Yeni kayıt
      const result = await window.electronAPI.dbQuery(
        `INSERT INTO geziler 
          (okul_id, gezi_adi, duzenlenen_yer, guzergah, gezi_tarihi, cikis_saati, 
           donus_tarihi, donus_saati, gezi_konusu, gezi_amaci, arastirma_gorevi, 
           degerlendirme, gezi_turu, kafile_baskani_id, durum, olusturma_tarihi) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          okulId,
          geziData.gezi_adi,
          geziData.duzenlenen_yer,
          geziData.guzergah,
          geziData.gezi_tarihi,
          geziData.cikis_saati,
          geziData.donus_tarihi,
          geziData.donus_saati,
          geziData.gezi_konusu,
          geziData.gezi_amaci,
          geziData.arastirma_gorevi,
          geziData.degerlendirme,
          geziData.gezi_turu,
          geziData.kafile_baskani_id,
          geziData.durum,
        ]
      );

      console.log("📊 Insert Sonucu:", result);

      if (result.success) {
        // Son eklenen ID'yi al
        const lastIdResult = await window.electronAPI.dbQuery(
          "SELECT last_insert_rowid() as id"
        );

        console.log("📊 Last ID Sonucu:", lastIdResult);

        if (
          lastIdResult.success &&
          lastIdResult.data &&
          lastIdResult.data.length > 0
        ) {
          geziId = lastIdResult.data[0].id;
          console.log("✅ Gezi ID alındı:", geziId);
        } else {
          console.log("❌ Gezi ID alınamadı!");
          throw new Error("Gezi ID alınamadı");
        }

        Bildirim.goster("success", "Gezi başarıyla oluşturuldu!");
        console.log("✅ YENİ KAYIT BAŞARILI");
      } else {
        console.log("❌ INSERT HATASI:", result.message);
        throw new Error(result.message || "Gezi kaydedilemedi");
      }
    }

    console.log("✅ ADIM 3 TAMAMLANDI");

    // ============================================
    // ADIM 3.5: KAFİLE BAŞKANINI TABLOYA EKLE
    // ============================================
    if (kafileBaskanId) {
      console.log("📊 Kafile başkanı tabloya ekleniyor:", kafileBaskanId);

      // Önce var mı kontrol et
      const mevcutKafile = await window.electronAPI.dbQuery(
        "SELECT id FROM gezi_kafile_baskanlari WHERE gezi_id = ? AND ogretmen_id = ?",
        [geziId, kafileBaskanId]
      );

      if (!mevcutKafile.data || mevcutKafile.data.length === 0) {
        // Yoksa ekle
        await window.electronAPI.dbQuery(
          `INSERT INTO gezi_kafile_baskanlari (gezi_id, ogretmen_id, gorev)
           VALUES (?, ?, 'Kafile Başkanı')`,
          [geziId, kafileBaskanId]
        );
        console.log("✅ Kafile başkanı tabloya eklendi");
      } else {
        console.log("ℹ️ Kafile başkanı zaten tabloda");
      }
    }

    console.log("🔵 ADIM 4: Sorumlu öğretmenler kaydediliyor...");

    // ============================================
    // GÜNCELLEME MODUNDAYSA ESKİ KAYITLARI SİL
    // ============================================
    if (editingGeziId) {
      console.log("🗑️ Eski kayıtlar siliniyor...");

      await window.electronAPI.dbQuery(
        "DELETE FROM gezi_ogretmenler WHERE gezi_id = ?",
        [geziId]
      );

      await window.electronAPI.dbQuery(
        "DELETE FROM gezi_ogrenciler WHERE gezi_id = ?",
        [geziId]
      );

      await window.electronAPI.dbQuery(
        "DELETE FROM gezi_misafirler WHERE gezi_id = ?",
        [geziId]
      );

      console.log("✅ Eski kayıtlar silindi");
    }

    // Sorumlu öğretmenleri kaydet
    if (selectedSorumluOgretmenler.length > 0) {
      console.log(
        `📊 ${selectedSorumluOgretmenler.length} sorumlu öğretmen kaydedilecek`
      );

      for (const ogretmen of selectedSorumluOgretmenler) {
        const result = await window.electronAPI.dbQuery(
          "INSERT INTO gezi_ogretmenler (gezi_id, ogretmen_id, gorev) VALUES (?, ?, ?)",
          [geziId, ogretmen.id, "Sorumlu Öğretmen"]
        );
        console.log(`✅ Öğretmen ${ogretmen.ad_soyad} eklendi:`, result);
      }
    } else {
      console.log("ℹ️ Sorumlu öğretmen yok");
    }

    console.log("✅ ADIM 4 TAMAMLANDI");
    console.log("🔵 ADIM 5: Öğrenciler kaydediliyor...");

    // Öğrencileri kaydet
    if (selectedOgrenciler.length > 0) {
      console.log(`📊 ${selectedOgrenciler.length} öğrenci kaydedilecek`);

      for (const ogrenci of selectedOgrenciler) {
        const result = await window.electronAPI.dbQuery(
          "INSERT INTO gezi_ogrenciler (gezi_id, ogrenci_id) VALUES (?, ?)",
          [geziId, ogrenci.id]
        );
        console.log(`✅ Öğrenci ${ogrenci.ad_soyad} eklendi:`, result);
      }
    } else {
      console.log("ℹ️ Öğrenci yok");
    }

    console.log("✅ ADIM 5 TAMAMLANDI");
    console.log("🔵 ADIM 6: Misafirler kaydediliyor...");

    // Misafirleri kaydet
    if (selectedMisafirler.length > 0) {
      console.log(`📊 ${selectedMisafirler.length} misafir kaydedilecek`);

      for (const misafir of selectedMisafirler) {
        const result = await window.electronAPI.dbQuery(
          "INSERT INTO gezi_misafirler (gezi_id, ad_soyad, tc_no, cinsiyet, telefon) VALUES (?, ?, ?, ?, ?)",
          [
            geziId,
            misafir.ad_soyad,
            misafir.tc_no,
            misafir.cinsiyet,
            misafir.telefon || null,
          ]
        );
        console.log(`✅ Misafir ${misafir.ad_soyad} eklendi:`, result);
      }
    } else {
      console.log("ℹ️ Misafir yok");
    }

    console.log("✅ ADIM 6 TAMAMLANDI");
    console.log("🔵 ADIM 7: Modal kapatılıyor ve liste yenileniyor...");

    // Modalı kapat
    closeGeziModal();
    console.log("✅ Modal kapatıldı");

    // Listeyi yenile
    await loadGeziler();
    console.log("✅ Liste yenilendi");

    console.log("🎉 TÜM İŞLEM BAŞARIYLA TAMAMLANDI!");
  } catch (error) {
    console.error("❌ GEZİ KAYDETME HATASI:", error);
    console.error("❌ Hata Detayı:", error.message);
    console.error("❌ Stack Trace:", error.stack);
    Bildirim.goster(
      "error",
      "Gezi kaydedilirken hata oluştu: " + error.message
    );
  }
}
// ==========================================
// TASLAK KAYDET (ÇALIŞAN VERSİYON)
// ==========================================

async function taslakKaydet() {
  console.log("🔵 taslakKaydet FONKSİYONU ÇAĞRILDI!");

  try {
    // Form değerlerini al (zorunlu alanlar olmadan)
    const geziAdi = document.getElementById("geziAdi").value.trim();
    const duzenlenecekYer = document
      .getElementById("duzenlenecekYer")
      .value.trim();
    const guzergah = document.getElementById("guzergah").value.trim();
    const geziTarihi = document.getElementById("geziTarihi").value;
    const cikisSaati = document.getElementById("cikisSaati").value;
    const donusTarihi = document.getElementById("donusTarihi").value;
    const donusSaati = document.getElementById("donusSaati").value;
    const geziKonusu = document.getElementById("geziKonusu").value.trim();
    const geziAmaci = document.getElementById("geziAmaci").value.trim();
    const geziTuru = document.querySelector(
      'input[name="geziTuru"]:checked'
    )?.value;

    // Minimum kontrol (sadece gezi adı)
    if (!geziAdi) {
      Bildirim.goster("warning", "En azından gezi adı girilmelidir!");
      return;
    }

    const okulId =
      currentSchool?.id || localStorage.getItem("currentSchoolId") || 1;

    // Taslak olarak kaydet
    const result = await window.electronAPI.dbQuery(
      `INSERT INTO geziler 
        (okul_id, gezi_adi, duzenlenen_yer, guzergah, gezi_tarihi, cikis_saati, 
         donus_tarihi, donus_saati, gezi_konusu, gezi_amaci, arastirma_gorevi, 
         degerlendirme, gezi_turu, kafile_baskani_id, durum, olusturma_tarihi) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planlanan', datetime('now'))`,
      [
        okulId,
        geziAdi,
        duzenlenecekYer || "Belirtilmedi",
        guzergah || "Belirtilmedi",
        geziTarihi || null,
        cikisSaati || null,
        donusTarihi || null,
        donusSaati || null,
        geziKonusu || "Belirtilmedi",
        geziAmaci || "Belirtilmedi",
        document.getElementById("arastirmaGorevi").value.trim() || null,
        document.getElementById("degerlendirme").value.trim() || null,
        geziTuru || "ilce_ici",
        selectedKafileBaskan?.id || null,
      ]
    );

    if (result.success) {
      Bildirim.goster("success", "📝 Taslak başarıyla kaydedildi!");
      closeGeziModal();
      await loadGeziler();
    } else {
      throw new Error(result.message || "Taslak kaydedilemedi");
    }
  } catch (error) {
    console.error("❌ Taslak kaydetme hatası:", error);
    Bildirim.goster("error", "Taslak kaydedilirken hata oluştu!");
  }
}

// ==========================================
// GEZİ DÜZENLE (ÇALIŞAN VERSİYON)
// ==========================================

async function geziDuzenle(geziId) {
  try {
    console.log("✏️ Gezi düzenleniyor, ID:", geziId);
    editingGeziId = geziId;

    // Gezi bilgilerini çek
    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM geziler WHERE id = ?",
      [geziId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      Bildirim.goster("error", "❌ Gezi bulunamadı!");
      return;
    }

    const gezi = result.data[0];
    console.log("📊 Gezi yüklendi:", gezi);

    // Formu doldur
    document.getElementById("geziAdi").value = gezi.gezi_adi;
    document.getElementById("duzenlenecekYer").value = gezi.duzenlenen_yer;
    document.getElementById("guzergah").value = gezi.guzergah;
    document.getElementById("geziTarihi").value = gezi.gezi_tarihi;
    document.getElementById("cikisSaati").value = gezi.cikis_saati;
    document.getElementById("donusTarihi").value = gezi.donus_tarihi;
    document.getElementById("donusSaati").value = gezi.donus_saati;
    document.getElementById("geziKonusu").value = gezi.gezi_konusu;
    document.getElementById("geziAmaci").value = gezi.gezi_amaci;
    document.getElementById("arastirmaGorevi").value =
      gezi.arastirma_gorevi || "";
    document.getElementById("degerlendirme").value = gezi.degerlendirme || "";

    // Gezi türü seç
    const geziTuruRadio = document.querySelector(
      `input[name="geziTuru"][value="${gezi.gezi_turu}"]`
    );
    if (geziTuruRadio) {
      geziTuruRadio.checked = true;
    }

    // Kafile başkanını yükle
    if (gezi.kafile_baskani_id) {
      const ogretmenResult = await window.electronAPI.dbQuery(
        "SELECT * FROM ogretmenler WHERE id = ?",
        [gezi.kafile_baskani_id]
      );
      if (ogretmenResult.success && ogretmenResult.data[0]) {
        selectedKafileBaskan = ogretmenResult.data[0];
        showSelectedKafileBaskan();
        console.log(
          "✅ Kafile başkanı yüklendi:",
          selectedKafileBaskan.ad_soyad
        );
      }
    }

    // Sorumlu öğretmenleri yükle
    const ogretmenlerResult = await window.electronAPI.dbQuery(
      `SELECT o.* FROM ogretmenler o
       INNER JOIN gezi_ogretmenler go ON o.id = go.ogretmen_id
       WHERE go.gezi_id = ?`,
      [geziId]
    );
    if (ogretmenlerResult.success && ogretmenlerResult.data) {
      selectedSorumluOgretmenler = ogretmenlerResult.data;
      renderSorumluOgretmenler();
      console.log(
        `✅ ${selectedSorumluOgretmenler.length} sorumlu öğretmen yüklendi`
      );
    }

    // Öğrencileri yükle
    const ogrencilerResult = await window.electronAPI.dbQuery(
      `SELECT o.* FROM ogrenciler o
       INNER JOIN gezi_ogrenciler go ON o.id = go.ogrenci_id
       WHERE go.gezi_id = ?`,
      [geziId]
    );
    if (ogrencilerResult.success && ogrencilerResult.data) {
      selectedOgrenciler = ogrencilerResult.data;
      renderOgrenciler();
      console.log(`✅ ${selectedOgrenciler.length} öğrenci yüklendi`);
    }

    // Misafirleri yükle
    const misafirlerResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_misafirler WHERE gezi_id = ?",
      [geziId]
    );
    if (misafirlerResult.success && misafirlerResult.data) {
      selectedMisafirler = misafirlerResult.data;
      renderMisafirler();
      console.log(`✅ ${selectedMisafirler.length} misafir yüklendi`);
    }

    // Modal başlığını değiştir
    document.getElementById("modalTitle").textContent = "✏️ Gezi Düzenle";

    // Modalı aç
    document.getElementById("geziModal").style.display = "flex";

    Bildirim.goster("info", "Gezi bilgileri yüklendi");
  } catch (error) {
    console.error("❌ Gezi düzenleme hatası:", error);
    Bildirim.goster("error", "Gezi yüklenirken hata oluştu: " + error.message);
  }
}

// ==========================================
// GEZİ SİL (MODERN UYARI İLE)
// ==========================================

async function geziSil(geziId) {
  console.log("🗑️ Gezi silme isteği, ID:", geziId);

  // Önce gezi bilgisini al
  const geziResult = await window.electronAPI.dbQuery(
    "SELECT gezi_adi FROM geziler WHERE id = ?",
    [geziId]
  );

  if (!geziResult.success || !geziResult.data || geziResult.data.length === 0) {
    Bildirim.goster("error", "Gezi bulunamadı!");
    return;
  }

  const geziAdi = geziResult.data[0].gezi_adi;

  // Modern onay modalı
  const confirmed = confirm(
    `⚠️ GEZİYİ SİLME ONAYI\n\n` +
      `"${geziAdi}" adlı geziyi silmek istediğinize emin misiniz?\n\n` +
      `❌ Bu işlem geri alınamaz!\n` +
      `📋 Tüm katılımcı bilgileri silinecektir.\n\n` +
      `Devam etmek için "Tamam" butonuna basın.`
  );

  if (!confirmed) {
    console.log("ℹ️ Silme işlemi iptal edildi");
    return;
  }

  try {
    console.log("🔄 Silme işlemi başlatıldı...");

    // İlişkili kayıtları sil
    await window.electronAPI.dbQuery(
      "DELETE FROM gezi_ogrenciler WHERE gezi_id = ?",
      [geziId]
    );
    console.log("✅ Öğrenciler silindi");

    await window.electronAPI.dbQuery(
      "DELETE FROM gezi_ogretmenler WHERE gezi_id = ?",
      [geziId]
    );
    console.log("✅ Öğretmenler silindi");

    await window.electronAPI.dbQuery(
      "DELETE FROM gezi_misafirler WHERE gezi_id = ?",
      [geziId]
    );
    console.log("✅ Misafirler silindi");

    // Geziyi sil
    const deleteResult = await window.electronAPI.dbQuery(
      "DELETE FROM geziler WHERE id = ?",
      [geziId]
    );

    if (deleteResult.success) {
      Bildirim.goster("success", `🗑️ "${geziAdi}" başarıyla silindi!`);
      console.log("✅ Gezi silindi");

      // Listeyi yenile
      await loadGeziler();
    } else {
      throw new Error("Gezi silinemedi");
    }
  } catch (error) {
    console.error("❌ Gezi silme hatası:", error);
    Bildirim.goster("error", "Gezi silinirken hata oluştu: " + error.message);
  }
}
// ==========================================
// GEZİ DETAY (MODERN MODAL)
// ==========================================

async function geziDetay(geziId) {
  try {
    console.log("📋 Gezi detayı gösteriliyor, ID:", geziId);

    // Gezi bilgilerini çek
    const result = await window.electronAPI.dbQuery(
      `SELECT 
        g.*,
        o.ad_soyad as kafile_baskani_ad,
        o.unvan as kafile_baskani_unvan,
        o.brans as kafile_baskani_brans,
        COUNT(DISTINCT go.id) as ogrenci_sayisi,
        COUNT(DISTINCT got.id) as ogretmen_sayisi,
        COUNT(DISTINCT gm.id) as misafir_sayisi
      FROM geziler g
      LEFT JOIN ogretmenler o ON g.kafile_baskani_id = o.id
      LEFT JOIN gezi_ogrenciler go ON g.id = go.gezi_id
      LEFT JOIN gezi_ogretmenler got ON g.id = got.gezi_id
      LEFT JOIN gezi_misafirler gm ON g.id = gm.gezi_id
      WHERE g.id = ?
      GROUP BY g.id`,
      [geziId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      Bildirim.goster("error", "Gezi bulunamadı!");
      return;
    }

    const gezi = result.data[0];

    // Modal içeriğini doldur
    document.getElementById("detayGeziAdi").textContent = gezi.gezi_adi;
    document.getElementById("detayDurumBadge").textContent = getDurumText(
      gezi.durum
    );
    document.getElementById(
      "detayDurumBadge"
    ).className = `gezi-card-status status-${gezi.durum}`;

    // Tarih & Saat
    document.getElementById("detayGeziTarihi").textContent = formatDate(
      gezi.gezi_tarihi
    );
    document.getElementById("detayCikisSaati").textContent = gezi.cikis_saati;
    document.getElementById("detayDonusTarihi").textContent = formatDate(
      gezi.donus_tarihi
    );
    document.getElementById("detayDonusSaati").textContent = gezi.donus_saati;

    // Yer Bilgileri
    document.getElementById("detayDuzenlenecekYer").textContent =
      gezi.duzenlenen_yer;
    document.getElementById("detayGuzergah").textContent = gezi.guzergah;
    document.getElementById("detayGeziTuru").textContent = getGeziTuruText(
      gezi.gezi_turu
    );

    // Katılımcılar
    document.getElementById("detayOgrenciSayisi").textContent =
      gezi.ogrenci_sayisi;
    document.getElementById("detayOgretmenSayisi").textContent =
      gezi.ogretmen_sayisi;
    document.getElementById("detayMisafirSayisi").textContent =
      gezi.misafir_sayisi;

    // Kafile Başkanı
    document.getElementById("detayKafileBaskan").textContent =
      gezi.kafile_baskani_ad || "-";
    const unvan =
      gezi.kafile_baskani_unvan || gezi.kafile_baskani_brans || "Öğretmen";
    document.getElementById("detayKafileBaskanUnvan").textContent = unvan;

    // Konu & Amaç
    document.getElementById("detayKonu").textContent = gezi.gezi_konusu;
    document.getElementById("detayAmac").textContent = gezi.gezi_amaci;

    // Araştırma & Değerlendirme (varsa göster)
    if (gezi.arastirma_gorevi) {
      document.getElementById("detayArastirmaBox").style.display = "block";
      document.getElementById("detayArastirma").textContent =
        gezi.arastirma_gorevi;
    } else {
      document.getElementById("detayArastirmaBox").style.display = "none";
    }

    if (gezi.degerlendirme) {
      document.getElementById("detayDegerlendirmeBox").style.display = "block";
      document.getElementById("detayDegerlendirme").textContent =
        gezi.degerlendirme;
    } else {
      document.getElementById("detayDegerlendirmeBox").style.display = "none";
    }

    // Modalı aç
    document.getElementById("geziDetayModal").style.display = "flex";

    console.log("✅ Detay modal açıldı");
  } catch (error) {
    console.error("❌ Detay gösterme hatası:", error);
    Bildirim.goster("error", "Detay yüklenirken hata oluştu: " + error.message);
  }
}

function closeDetayModal() {
  document.getElementById("geziDetayModal").style.display = "none";
}

// ESC tuşu ile kapat
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDetayModal();
  }
});
// ==========================================
// KAFİLE BAŞKANI ARAMA (DÜZELTİLMİŞ)
// ==========================================

async function araKafileBaskan() {
  const searchTerm = document.getElementById("kafileBaskanSearch").value.trim();

  console.log("🔍 Kafile Başkanı aranıyor:", searchTerm);

  if (!searchTerm) {
    Bildirim.goster("warning", "Arama terimi girin!");
    return;
  }

  try {
    // ✅ okul_id filtresini KALDIRDIK
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ogretmenler 
       WHERE durum = 1 AND (ad_soyad LIKE ? OR tc_no LIKE ?)
       LIMIT 10`,
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );

    console.log("📊 Kafile başkanı arama sonucu:", result);

    if (result.success && result.data && result.data.length > 0) {
      // İlk sonucu seç
      selectedKafileBaskan = result.data[0];
      showSelectedKafileBaskan();
      Bildirim.goster(
        "success",
        `Kafile başkanı seçildi: ${selectedKafileBaskan.ad_soyad}`
      );
      console.log("✅ Seçilen kafile başkanı:", selectedKafileBaskan);
    } else {
      Bildirim.goster("warning", "Öğretmen bulunamadı!");
      console.log("❌ Öğretmen bulunamadı");
    }
  } catch (error) {
    console.error("❌ Kafile başkanı arama hatası:", error);
    Bildirim.goster("error", "Arama yapılırken hata oluştu!");
  }
}

function showSelectedKafileBaskan() {
  const container = document.getElementById("selectedKafileBaskan");
  document.getElementById("kafileBaskanAd").textContent =
    selectedKafileBaskan.ad_soyad;

  // ✅ ÜNVAN ÖNCELİKLİ: Önce ünvan, yoksa branş, o da yoksa "Öğretmen"
  const unvanMetni =
    selectedKafileBaskan.unvan || selectedKafileBaskan.brans || "Öğretmen";
  document.getElementById("kafileBaskanUnvan").textContent = unvanMetni;

  container.style.display = "flex";
  console.log(
    "✅ Kafile başkanı gösteriliyor:",
    selectedKafileBaskan.ad_soyad,
    "-",
    unvanMetni
  );
}

function removeKafileBaskan() {
  console.log("🗑️ Kafile başkanı kaldırılıyor");
  selectedKafileBaskan = null;
  document.getElementById("selectedKafileBaskan").style.display = "none";
  document.getElementById("kafileBaskanSearch").value = "";
}

// ==========================================
// SORUMLU ÖĞRETMEN ARAMA (DÜZELTİLMİŞ)
// ==========================================

async function araSorumluOgretmen() {
  const searchTerm = document
    .getElementById("sorumluOgretmenSearch")
    .value.trim();

  console.log("🔍 Sorumlu öğretmen aranıyor:", searchTerm);

  if (!searchTerm) {
    Bildirim.goster("warning", "Arama terimi girin!");
    return;
  }

  try {
    // ✅ okul_id filtresini KALDIRDIK
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ogretmenler 
       WHERE durum = 1 AND (ad_soyad LIKE ? OR tc_no LIKE ?)
       LIMIT 10`,
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );

    console.log("📊 Sorumlu öğretmen arama sonucu:", result);

    if (result.success && result.data && result.data.length > 0) {
      const ogretmen = result.data[0];

      // Zaten eklenmişse kontrol et
      if (selectedSorumluOgretmenler.find((o) => o.id === ogretmen.id)) {
        Bildirim.goster("warning", "Bu öğretmen zaten eklenmiş!");
        console.log("⚠️ Öğretmen zaten listede");
        return;
      }

      selectedSorumluOgretmenler.push(ogretmen);
      renderSorumluOgretmenler();
      document.getElementById("sorumluOgretmenSearch").value = "";
      Bildirim.goster("success", `Öğretmen eklendi: ${ogretmen.ad_soyad}`);
      console.log("✅ Sorumlu öğretmen eklendi:", ogretmen);
    } else {
      Bildirim.goster("warning", "Öğretmen bulunamadı!");
      console.log("❌ Öğretmen bulunamadı");
    }
  } catch (error) {
    console.error("❌ Sorumlu öğretmen arama hatası:", error);
    Bildirim.goster("error", "Arama yapılırken hata oluştu!");
  }
}

function renderSorumluOgretmenler() {
  const container = document.getElementById("sorumluOgretmenList");

  if (selectedSorumluOgretmenler.length === 0) {
    container.innerHTML =
      '<p style="color: #6B7280; text-align: center; padding: 20px;">Henüz sorumlu öğretmen eklenmedi</p>';
    return;
  }

  container.innerHTML = selectedSorumluOgretmenler
    .map((ogretmen, index) => {
      // ✅ ÜNVAN ÖNCELİKLİ: Önce ünvan, yoksa branş, o da yoksa "Öğretmen"
      const unvanMetni = ogretmen.unvan || ogretmen.brans || "Öğretmen";

      return `
    <div class="selected-item">
      <div class="selected-info">
        <strong>${ogretmen.ad_soyad}</strong>
        <span>${unvanMetni}</span>
      </div>
      <button class="btn-modern btn-remove" onclick="removeSorumluOgretmen(${index})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
    })
    .join("");

  console.log(
    `✅ ${selectedSorumluOgretmenler.length} sorumlu öğretmen render edildi`
  );
}

function removeSorumluOgretmen(index) {
  console.log("🗑️ Sorumlu öğretmen kaldırılıyor, index:", index);
  const removed = selectedSorumluOgretmenler.splice(index, 1);
  console.log("Kaldırılan:", removed[0]?.ad_soyad);
  renderSorumluOgretmenler();
}

// ==========================================
// ÖĞRENCİ ARAMA (DÜZELTİLMİŞ)
// ==========================================

async function araOgrenci() {
  const searchTerm = document.getElementById("ogrenciSearch").value.trim();

  console.log("🔍 Öğrenci aranıyor:", searchTerm);

  if (!searchTerm) {
    Bildirim.goster("warning", "Arama terimi girin!");
    return;
  }

  try {
    // ✅ okul_id filtresini KALDIRDIK
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ogrenciler 
       WHERE durum = 1 AND (okul_no LIKE ? OR ad_soyad LIKE ? OR tc_no LIKE ?)
       LIMIT 10`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );

    console.log("📊 Öğrenci arama sonucu:", result);

    if (result.success && result.data && result.data.length > 0) {
      const ogrenci = result.data[0];

      // Zaten eklenmişse kontrol et
      if (selectedOgrenciler.find((o) => o.id === ogrenci.id)) {
        Bildirim.goster("warning", "Bu öğrenci zaten eklenmiş!");
        console.log("⚠️ Öğrenci zaten listede");
        return;
      }

      selectedOgrenciler.push(ogrenci);
      renderOgrenciler();
      document.getElementById("ogrenciSearch").value = "";
      Bildirim.goster("success", `Öğrenci eklendi: ${ogrenci.ad_soyad}`);
      console.log("✅ Öğrenci eklendi:", ogrenci);
    } else {
      Bildirim.goster("warning", "Öğrenci bulunamadı!");
      console.log("❌ Öğrenci bulunamadı");
    }
  } catch (error) {
    console.error("❌ Öğrenci arama hatası:", error);
    Bildirim.goster("error", "Arama yapılırken hata oluştu!");
  }
}

function renderOgrenciler() {
  const container = document.getElementById("ogrenciList");
  const countElement = document.getElementById("ogrenciCount");

  countElement.textContent = selectedOgrenciler.length;

  if (selectedOgrenciler.length === 0) {
    container.innerHTML =
      '<p style="color: #6B7280; text-align: center; padding: 20px;">Henüz öğrenci eklenmedi</p>';
    return;
  }

  container.innerHTML = selectedOgrenciler
    .map(
      (ogrenci, index) => `
    <div class="selected-item">
      <div class="selected-info">
        <strong>${ogrenci.ad_soyad}</strong>
        <span>${ogrenci.okul_no} - ${
        ogrenci.sinif || "Sınıf bilgisi yok"
      }</span>
      </div>
      <button class="btn-modern btn-remove" onclick="removeOgrenci(${index})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `
    )
    .join("");

  console.log(`✅ ${selectedOgrenciler.length} öğrenci render edildi`);
}

function removeOgrenci(index) {
  console.log("🗑️ Öğrenci kaldırılıyor, index:", index);
  const removed = selectedOgrenciler.splice(index, 1);
  console.log("Kaldırılan:", removed[0]?.ad_soyad);
  renderOgrenciler();
}

// ==========================================
// MİSAFİR EKLEME
// ==========================================

// MİSAFİR MODALINI AÇ
function openMisafirModal() {
  if (misafirModal) {
    misafirModal.style.display = "flex";
  } else {
    // Eğer DOM henüz yüklenmediyse değişkeni tekrar kontrol et
    document.getElementById("misafirModal").style.display = "flex";
  }
}

// MİSAFİR MODALINI KAPAT
function closeMisafirModal() {
  const modal = document.getElementById("misafirModal");
  modal.style.display = "none";
  // Formu temizle
  document.getElementById("misafirAdSoyad").value = "";
  document.getElementById("misafirTC").value = "";
  document.getElementById("misafirCinsiyet").value = "";
  document.getElementById("misafirTelefon").value = "";
}

function misafirEkle() {
  console.log("➕ Misafir ekleme fonksiyonu çağrıldı");

  const adSoyad = document.getElementById("misafirAdSoyad").value.trim();
  const tcNo = document.getElementById("misafirTC").value.trim();
  const cinsiyet = document.getElementById("misafirCinsiyet").value;
  const telefon = document.getElementById("misafirTelefon").value.trim();

  console.log("📊 Misafir bilgileri:", { adSoyad, tcNo, cinsiyet, telefon });

  // Validasyon
  if (!adSoyad) {
    Bildirim.goster("warning", "Ad Soyad zorunludur!");
    return;
  }

  if (!tcNo || tcNo.length !== 11) {
    Bildirim.goster("warning", "TC Kimlik No 11 haneli olmalıdır!");
    return;
  }

  if (!cinsiyet) {
    Bildirim.goster("warning", "Cinsiyet seçmelisiniz!");
    return;
  }

  // Misafir objesi oluştur
  const misafir = {
    id: Date.now(), // Geçici ID
    ad_soyad: adSoyad,
    tc_no: tcNo,
    cinsiyet: cinsiyet,
    telefon: telefon || null,
  };

  // Listeye ekle
  selectedMisafirler.push(misafir);
  renderMisafirler();

  // Modalı kapat
  closeMisafirModal();

  Bildirim.goster("success", `Misafir eklendi: ${adSoyad}`);
  console.log("✅ Misafir eklendi:", misafir);
}

function renderMisafirler() {
  const container = document.getElementById("misafirList");
  const countElement = document.getElementById("misafirCount");

  countElement.textContent = selectedMisafirler.length;

  if (selectedMisafirler.length === 0) {
    container.innerHTML =
      '<p style="color: #6B7280; text-align: center; padding: 20px;">Henüz misafir eklenmedi</p>';
    return;
  }

  container.innerHTML = selectedMisafirler
    .map(
      (misafir, index) => `
    <div class="selected-item">
      <div class="selected-info">
        <strong>${misafir.ad_soyad}</strong>
        <span>${misafir.tc_no} - ${misafir.cinsiyet}</span>
      </div>
      <button class="btn-modern btn-remove" onclick="removeMisafir(${index})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `
    )
    .join("");

  console.log(`✅ ${selectedMisafirler.length} misafir render edildi`);
}

function removeMisafir(index) {
  console.log("🗑️ Misafir kaldırılıyor, index:", index);
  const removed = selectedMisafirler.splice(index, 1);
  console.log("Kaldırılan:", removed[0]?.ad_soyad);
  renderMisafirler();
}

// ==========================================
// KATILIMCILARI KAYDET
// ==========================================

async function saveSorumluOgretmenler(geziId) {
  // Önce mevcut kayıtları sil
  await window.electronAPI.dbQuery(
    "DELETE FROM gezi_ogretmenler WHERE gezi_id = ?",
    [geziId]
  );

  // Yeni kayıtları ekle
  for (const ogretmen of selectedSorumluOgretmenler) {
    await window.electronAPI.dbQuery(
      "INSERT INTO gezi_ogretmenler (gezi_id, ogretmen_id, gorev) VALUES (?, ?, ?)",
      [geziId, ogretmen.id, "Sorumlu Öğretmen"]
    );
  }
}

async function saveOgrenciler(geziId) {
  // Önce mevcut kayıtları sil
  await window.electronAPI.dbQuery(
    "DELETE FROM gezi_ogrenciler WHERE gezi_id = ?",
    [geziId]
  );

  // Yeni kayıtları ekle
  for (const ogrenci of selectedOgrenciler) {
    await window.electronAPI.dbQuery(
      "INSERT INTO gezi_ogrenciler (gezi_id, ogrenci_id) VALUES (?, ?)",
      [geziId, ogrenci.id]
    );
  }
}

async function saveMisafirler(geziId) {
  // Önce mevcut kayıtları sil
  await window.electronAPI.dbQuery(
    "DELETE FROM gezi_misafirler WHERE gezi_id = ?",
    [geziId]
  );

  // Yeni kayıtları ekle
  for (const misafir of selectedMisafirler) {
    await window.electronAPI.dbQuery(
      "INSERT INTO gezi_misafirler (gezi_id, ad_soyad, tc_no, cinsiyet, telefon) VALUES (?, ?, ?, ?, ?)",
      [
        geziId,
        misafir.ad_soyad,
        misafir.tc_no,
        misafir.cinsiyet,
        misafir.telefon,
      ]
    );
  }
}

// ==========================================
// FİLTRELEME
// ==========================================

function applyFilters() {
  filteredGeziler = allGeziler.filter((gezi) => {
    // Durum filtresi
    const durumFilters = {
      planlanan: document.getElementById("filterPlanlanan").checked,
      aktif: document.getElementById("filterAktif").checked,
      tamamlanan: document.getElementById("filterTamamlanan").checked,
      iptal: document.getElementById("filterIptal").checked,
    };

    if (!durumFilters[gezi.durum]) return false;

    // Tür filtresi
    const turFilters = {
      ilce_ici: document.getElementById("filterIlceIci").checked,
      il_ici: document.getElementById("filterIlIci").checked,
      il_disi: document.getElementById("filterIlDisi").checked,
      yurt_disi: document.getElementById("filterYurtDisi").checked,
    };

    if (!turFilters[gezi.gezi_turu]) return false;

    // Arama filtresi
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
      const searchMatch =
        gezi.gezi_adi.toLowerCase().includes(searchTerm) ||
        gezi.duzenlenen_yer.toLowerCase().includes(searchTerm) ||
        gezi.guzergah.toLowerCase().includes(searchTerm);

      if (!searchMatch) return false;
    }

    return true;
  });

  // Sıralama
  applySorting();

  // Render
  currentPage = 1;
  renderGeziler();
  updateFilterCounts();
}

function applySorting() {
  const sortType = sortSelect.value;

  filteredGeziler.sort((a, b) => {
    switch (sortType) {
      case "tarih-yeni":
        return new Date(b.gezi_tarihi) - new Date(a.gezi_tarihi);
      case "tarih-eski":
        return new Date(a.gezi_tarihi) - new Date(b.gezi_tarihi);
      case "isim-az":
        return a.gezi_adi.localeCompare(b.gezi_adi);
      case "isim-za":
        return b.gezi_adi.localeCompare(a.gezi_adi);
      default:
        return 0;
    }
  });
}

function updateFilterCounts() {
  // Durum sayıları
  document.getElementById("countPlanlanan").textContent = allGeziler.filter(
    (g) => g.durum === "planlanan"
  ).length;
  document.getElementById("countAktif").textContent = allGeziler.filter(
    (g) => g.durum === "aktif"
  ).length;
  document.getElementById("countTamamlanan").textContent = allGeziler.filter(
    (g) => g.durum === "tamamlanan"
  ).length;
  document.getElementById("countIptal").textContent = allGeziler.filter(
    (g) => g.durum === "iptal"
  ).length;

  // Tür sayıları
  document.getElementById("countIlceIci").textContent = allGeziler.filter(
    (g) => g.gezi_turu === "ilce_ici"
  ).length;
  document.getElementById("countIlIci").textContent = allGeziler.filter(
    (g) => g.gezi_turu === "il_ici"
  ).length;
  document.getElementById("countIlDisi").textContent = allGeziler.filter(
    (g) => g.gezi_turu === "il_disi"
  ).length;
  document.getElementById("countYurtDisi").textContent = allGeziler.filter(
    (g) => g.gezi_turu === "yurt_disi"
  ).length;
}

// ==========================================
// İSTATİSTİKLER
// ==========================================

function updateStats() {
  document.getElementById("statToplam").textContent = allGeziler.length;
  document.getElementById("statAktif").textContent = allGeziler.filter(
    (g) => g.durum === "aktif"
  ).length;
  document.getElementById("statTamamlanan").textContent = allGeziler.filter(
    (g) => g.durum === "tamamlanan"
  ).length;

  const toplamKatilimci = allGeziler.reduce(
    (sum, g) =>
      sum +
      parseInt(g.ogrenci_sayisi || 0) +
      parseInt(g.ogretmen_sayisi || 0) +
      parseInt(g.misafir_sayisi || 0),
    0
  );
  document.getElementById("statKatilimci").textContent = toplamKatilimci;

  // En yakın gezi
  const upcomingGeziler = allGeziler
    .filter((g) => new Date(g.gezi_tarihi) >= new Date())
    .sort((a, b) => new Date(a.gezi_tarihi) - new Date(b.gezi_tarihi));

  if (upcomingGeziler.length > 0) {
    const upcoming = upcomingGeziler[0];
    document.getElementById("upcomingTrip").style.display = "block";
    document.getElementById("upcomingName").textContent = upcoming.gezi_adi;
    document.getElementById("upcomingDate").textContent = formatDate(
      upcoming.gezi_tarihi
    );

    const daysLeft = Math.ceil(
      (new Date(upcoming.gezi_tarihi) - new Date()) / (1000 * 60 * 60 * 24)
    );
    document.getElementById(
      "upcomingCountdown"
    ).textContent = `${daysLeft} gün kaldı`;
  } else {
    document.getElementById("upcomingTrip").style.display = "none";
  }
}

// ==========================================
// PAGİNATİON
// ==========================================

function updatePagination() {
  const totalPages = Math.ceil(filteredGeziler.length / itemsPerPage);
  const paginationDiv = document.getElementById("pagination");

  if (totalPages <= 1) {
    paginationDiv.style.display = "none";
    return;
  }

  paginationDiv.style.display = "flex";

  // Sayfa numaraları
  const pageNumbers = document.getElementById("pageNumbers");
  pageNumbers.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = "page-number" + (i === currentPage ? " active" : "");
    pageBtn.textContent = i;
    pageBtn.onclick = () => {
      currentPage = i;
      renderGeziler();
    };
    pageNumbers.appendChild(pageBtn);
  }

  // Önceki/Sonraki butonları
  document.getElementById("btnPrevPage").disabled = currentPage === 1;
  document.getElementById("btnNextPage").disabled = currentPage === totalPages;
}
// ==========================================
// EVENT LISTENERS (DÜZELTİLMİŞ)
// ==========================================

function initEventListeners() {
  // Yeni gezi butonu
  btnYeniGezi.addEventListener("click", openGeziModal);

  // Arama
  searchInput.addEventListener("input", applyFilters);

  // Sıralama
  sortSelect.addEventListener("change", () => {
    applySorting();
    renderGeziler();
  });

  // Filtre checkboxları
  const filterCheckboxes = document.querySelectorAll(
    '.filter-group input[type="checkbox"]'
  );
  filterCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", applyFilters);
  });

  // Tarih filtreleri
  document
    .getElementById("filterBaslangic")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filterBitis")
    .addEventListener("change", applyFilters);

  // Filtreleri temizle
  document
    .getElementById("btnFiltreleriTemizle")
    .addEventListener("click", () => {
      filterCheckboxes.forEach((cb) => (cb.checked = true));
      document.getElementById("filterBaslangic").value = "";
      document.getElementById("filterBitis").value = "";
      searchInput.value = "";
      applyFilters();
    });

  // Pagination
  document.getElementById("btnPrevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderGeziler();
    }
  });

  document.getElementById("btnNextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(filteredGeziler.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderGeziler();
    }
  });

  // Modal dışına tıklayınca kapat (DÜZELTİLMİŞ)
  document.getElementById("geziModal").addEventListener("click", (e) => {
    if (e.target.id === "geziModal") {
      closeGeziModal();
    }
  });

  document.getElementById("misafirModal").addEventListener("click", (e) => {
    if (e.target.id === "misafirModal") {
      closeMisafirModal();
    }
  });

  // ESC tuşu ile kapat
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeGeziModal();
      closeMisafirModal();
    }
  });
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getGeziTuruText(tur) {
  const turler = {
    ilce_ici: "İlçe İçi",
    il_ici: "İl İçi",
    il_disi: "İl Dışı",
    yurt_disi: "Yurt Dışı",
  };
  return turler[tur] || tur;
}

function getDurumText(durum) {
  const durumlar = {
    planlanan: "⏳ Planlanan",
    aktif: "✅ Aktif",
    tamamlanan: "🎯 Tamamlanan",
    iptal: "❌ İptal",
  };
  return durumlar[durum] || durum;
}

// ==========================================
// ULAŞIM YÖNETİMİ
// ==========================================

// Hiçbir let/const/var tanımı OLMAYACAK!
// ==========================================
// ULAŞIM MODAL AÇ
// ==========================================

async function geziUlasim(geziId) {
  try {
    console.log("🚗 Ulaşım yönetimi açılıyor, Gezi ID:", geziId);
    currentGeziIdForUlasim = geziId;

    const geziResult = await window.electronAPI.dbQuery(
      "SELECT gezi_adi, gezi_turu FROM geziler WHERE id = ?",
      [geziId]
    );

    if (
      !geziResult.success ||
      !geziResult.data ||
      geziResult.data.length === 0
    ) {
      Bildirim.goster("error", "Gezi bulunamadı!");
      return;
    }

    const gezi = geziResult.data[0];
    currentGeziTuru = gezi.gezi_turu;

    document.getElementById(
      "ulasimGeziAdi"
    ).textContent = `${gezi.gezi_adi} - Ulaşım`;

    // Yurt dışı ise uyarıyı göster ve tabları aktif et
    if (gezi.gezi_turu === "yurt_disi") {
      document.getElementById("ulasimTurUyari").style.display = "block";
      document.getElementById("tabUcak").style.display = "flex";
      document.getElementById("tabGemi").style.display = "flex";
      document.getElementById("tabTren").style.display = "flex";
      document.getElementById("tabKonaklama").style.display = "flex";
    } else {
      document.getElementById("ulasimTurUyari").style.display = "none";
      document.getElementById("tabUcak").style.display = "none";
      document.getElementById("tabGemi").style.display = "none";
      document.getElementById("tabTren").style.display = "none";
      document.getElementById("tabKonaklama").style.display = "flex"; // Her zaman göster
    }

    // Araçları yükle
    await loadAraclar(geziId);

    // Uçuş bilgilerini yükle
    await loadUcakBilgileri(geziId);

    // Konaklama bilgilerini yükle
    await loadKonaklamaBilgileri(geziId);

    // Modalı aç
    document.getElementById("ulasimModal").style.display = "flex";

    console.log("✅ Ulaşım modal açıldı");
  } catch (error) {
    console.error("❌ Ulaşım modal açma hatası:", error);
    Bildirim.goster("error", "Ulaşım yönetimi açılırken hata oluştu!");
  }
}

function closeUlasimModal() {
  document.getElementById("ulasimModal").style.display = "none";
  currentGeziIdForUlasim = null;
  currentGeziTuru = null;
}

// ==========================================
// TAB DEĞİŞTİRME
// ==========================================

function switchUlasimTab(tabName) {
  console.log("📑 Tab değiştiriliyor:", tabName);

  // Tüm tabları pasif yap
  document.querySelectorAll(".ulasim-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".ulasim-tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  // Seçili tabı aktif yap
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`tabContent_${tabName}`).classList.add("active");
}

// ==========================================
// ARAÇLARI YÜKLE
// ==========================================

async function loadAraclar(geziId) {
  try {
    console.log("🔄 Araçlar yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_araclar WHERE gezi_id = ? ORDER BY id DESC",
      [geziId]
    );

    const container = document.getElementById("aracListesi");

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>Henüz araç eklenmedi</p>
        </div>
      `;
      return;
    }

    // Her araç için şoförleri de çek
    const araclarHTML = [];
    for (const arac of result.data) {
      // Şoförleri getir
      const soforResult = await window.electronAPI.dbQuery(
        "SELECT * FROM gezi_arac_soforler WHERE arac_id = ? ORDER BY sofor_tipi",
        [arac.id]
      );

      // Belgeleri getir
      const belgeResult = await window.electronAPI.dbQuery(
        "SELECT * FROM gezi_arac_belgeler WHERE arac_id = ?",
        [arac.id]
      );

      araclarHTML.push(
        renderAracCard(arac, soforResult.data || [], belgeResult.data || [])
      );
    }

    container.innerHTML = araclarHTML.join("");
    console.log(`✅ ${result.data.length} araç yüklendi`);
  } catch (error) {
    console.error("❌ Araç yükleme hatası:", error);
  }
}

// ==========================================
// ARAÇ KART RENDER
// ==========================================

function renderAracCard(arac, soforler, belgeler) {
  return `
    <div class="arac-card">
      <div class="arac-card-header">
        <div class="arac-card-title">
          <div class="arac-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div class="arac-title-text">
            <h4>${arac.plaka}</h4>
            <p>${arac.arac_modeli || "Model belirtilmemiş"}</p>
          </div>
        </div>
        <div class="arac-actions">
  <button class="btn-modern btn-sm btn-primary" onclick="openKoltukPlaniModal(${
    arac.id
  }, '${arac.plaka}', ${arac.kapasite || 54})" title="Koltuk Planı">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="9"/>
      <rect x="14" y="3" width="7" height="9"/>
      <rect x="3" y="14" width="7" height="9"/>
      <rect x="14" y="14" width="7" height="9"/>
    </svg>
  </button>
  <button class="btn-modern btn-sm btn-warning" onclick="aracDuzenle(${
    arac.id
  })" title="Araç Düzenle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-modern btn-sm btn-danger" onclick="aracSil(${
            arac.id
          })" title="Araç Sil">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="arac-card-body">
        <div class="arac-info-item">
          <div class="arac-info-label">📅 Trafiğe Çıkış</div>
          <div class="arac-info-value">${
            arac.trafige_cikis_tarihi
              ? formatDate(arac.trafige_cikis_tarihi)
              : "-"
          }</div>
        </div>
        <div class="arac-info-item">
          <div class="arac-info-label">🔧 Son Muayene</div>
          <div class="arac-info-value">${
            arac.son_muayene_tarihi ? formatDate(arac.son_muayene_tarihi) : "-"
          }</div>
        </div>
        <div class="arac-info-item">
          <div class="arac-info-label">👥 Kapasite</div>
          <div class="arac-info-value">${arac.kapasite || "-"} Kişi</div>
        </div>
        <div class="arac-info-item">
          <div class="arac-info-label">📋 Mali Sorumluluk</div>
          <div class="arac-info-value">${
            arac.mali_sorumluluk_police_no || "-"
          }</div>
        </div>
        <div class="arac-info-item">
          <div class="arac-info-label">📅 Mali Sorumluluk Bitiş</div>
          <div class="arac-info-value">${
            arac.mali_sorumluluk_bitis_tarihi
              ? formatDate(arac.mali_sorumluluk_bitis_tarihi)
              : "-"
          }</div>
        </div>
        <div class="arac-info-item">
          <div class="arac-info-label">🛡️ Ferdi Kaza</div>
          <div class="arac-info-value">${arac.ferdi_kaza_police_no || "-"}</div>
        </div>
      </div>

      ${
        soforler.length > 0
          ? `
      <div class="soforler-section">
        <h5>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Şoförler (${soforler.length})
        </h5>
        <div class="sofor-list">
          ${soforler
            .map(
              (sofor, index) => `
            <div class="sofor-item">
              <div class="sofor-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="sofor-info">
                <div class="sofor-name">${sofor.ad_soyad}</div>
                <div class="sofor-details">TC: ${sofor.tc_no} ${
                sofor.telefon ? `• Tel: ${sofor.telefon}` : ""
              } ${
                sofor.src_belge_no ? `• SRC: ${sofor.src_belge_no}` : ""
              }</div>
              </div>
              <span class="sofor-badge ${
                sofor.sofor_tipi === "ikinci_sofor" ? "ikinci" : ""
              }">${index === 0 ? "Ana" : "2."} Şoför</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
      `
          : ""
      }

      ${
        belgeler.length > 0
          ? `
      <div class="belgeler-section">
        <h5>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Yüklenen Belgeler (${belgeler.length})
        </h5>
        <div class="belge-list">
          ${belgeler
            .map(
              (belge) => `
            <div class="belge-item" onclick="belgeyiAc('${belge.dosya_yolu}')">
              <div class="belge-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="belge-name">${belge.belge_adi}</div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
      `
          : ""
      }
    </div>
  `;
}

// ==========================================
// ARAÇ EKLEME MODAL
// ==========================================

function openAracEkleModal() {
  editingAracId = null;
  uploadedFiles = [];
  document.getElementById("aracModalTitle").textContent = "Yeni Araç Ekle";
  clearAracForm();
  document.getElementById("aracEkleModal").style.display = "flex";
  setupFileUpload();
}

function closeAracEkleModal() {
  document.getElementById("aracEkleModal").style.display = "none";
  editingAracId = null;
  uploadedFiles = [];
}

function clearAracForm() {
  document.getElementById("aracPlaka").value = "";
  document.getElementById("aracModel").value = "";
  document.getElementById("aracTrafigeCikis").value = "";
  document.getElementById("aracMuayene").value = "";
  document.getElementById("aracMaliPolice").value = "";
  document.getElementById("aracMaliBitis").value = "";
  document.getElementById("aracFerdiPolice").value = "";
  document.getElementById("aracFerdiBitis").value = "";
  document.getElementById("aracKapasite").value = "";
  document.getElementById("aracOzellikler").value = "";
  document.getElementById("sofor1TC").value = "";
  document.getElementById("sofor1Ad").value = "";
  document.getElementById("sofor1Tel").value = "";
  document.getElementById("sofor1SRC").value = "";
  document.getElementById("sofor1SRCTarih").value = "";
  document.getElementById("sofor2TC").value = "";
  document.getElementById("sofor2Ad").value = "";
  document.getElementById("sofor2Tel").value = "";
  document.getElementById("sofor2SRC").value = "";
  document.getElementById("sofor2SRCTarih").value = "";
  document.getElementById("uploadedFilesList").innerHTML = "";
}

// ==========================================
// DOSYA YÜKLEME SİSTEMİ
// ==========================================

function setupFileUpload() {
  const uploadArea = document.getElementById("fileUploadArea");
  const fileInput = document.getElementById("fileInput");

  // Tıklama ile dosya seç
  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // Dosya seçildiğinde
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  // Drag & Drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });
}

function handleFiles(files) {
  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  const maxSize = 10 * 1024 * 1024; // 10MB

  Array.from(files).forEach((file) => {
    // Tip kontrolü
    if (!allowedTypes.includes(file.type)) {
      Bildirim.goster("warning", `${file.name} - Desteklenmeyen dosya tipi!`);
      return;
    }

    // Boyut kontrolü
    if (file.size > maxSize) {
      Bildirim.goster("warning", `${file.name} - Dosya boyutu 10MB'dan büyük!`);
      return;
    }

    // Dosyayı ekle
    uploadedFiles.push(file);
    renderUploadedFiles();
  });

  console.log(`✅ ${uploadedFiles.length} dosya yüklendi`);
}

function renderUploadedFiles() {
  const container = document.getElementById("uploadedFilesList");

  container.innerHTML = uploadedFiles
    .map(
      (file, index) => `
    <div class="uploaded-file">
      <div class="uploaded-file-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="uploaded-file-info">
        <div class="uploaded-file-name">${file.name}</div>
        <div class="uploaded-file-size">${formatFileSize(file.size)}</div>
      </div>
      <button class="btn-file-remove" onclick="removeUploadedFile(${index})" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `
    )
    .join("");
}

function removeUploadedFile(index) {
  uploadedFiles.splice(index, 1);
  renderUploadedFiles();
  Bildirim.goster("info", "Dosya kaldırıldı");
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// ==========================================
// ARAÇ KAYDET (EKLEME + GÜNCELLEME)
// ==========================================

async function aracKaydet() {
  try {
    console.log("💾 Araç kaydediliyor...");

    // Validasyon
    const plaka = document.getElementById("aracPlaka").value.trim();
    const sofor1TC = document.getElementById("sofor1TC").value.trim();
    const sofor1Ad = document.getElementById("sofor1Ad").value.trim();

    if (!plaka) {
      Bildirim.goster("warning", "Araç plakası zorunludur!");
      return;
    }

    if (!sofor1TC || !sofor1Ad) {
      Bildirim.goster("warning", "En az 1 şoför bilgisi girilmelidir!");
      return;
    }

    if (sofor1TC.length !== 11) {
      Bildirim.goster("warning", "1. Şoför TC Kimlik No 11 haneli olmalıdır!");
      return;
    }

    // Araç verisi
    const aracData = {
      plaka: plaka.toUpperCase(),
      arac_modeli: document.getElementById("aracModel").value.trim() || null,
      trafige_cikis_tarihi:
        document.getElementById("aracTrafigeCikis").value || null,
      son_muayene_tarihi: document.getElementById("aracMuayene").value || null,
      mali_sorumluluk_police_no:
        document.getElementById("aracMaliPolice").value.trim() || null,
      mali_sorumluluk_bitis_tarihi:
        document.getElementById("aracMaliBitis").value || null,
      ferdi_kaza_police_no:
        document.getElementById("aracFerdiPolice").value.trim() || null,
      ferdi_kaza_bitis_tarihi:
        document.getElementById("aracFerdiBitis").value || null,
      kapasite: document.getElementById("aracKapasite").value || null,
      arac_ozellikleri:
        document.getElementById("aracOzellikler").value.trim() || null,
    };

    let aracId;

    if (editingAracId) {
      // GÜNCELLEME MODU
      console.log("🔄 Güncelleme modu, Araç ID:", editingAracId);

      await window.electronAPI.dbQuery(
        `UPDATE gezi_araclar SET
          plaka = ?, arac_modeli = ?, trafige_cikis_tarihi = ?, son_muayene_tarihi = ?,
          mali_sorumluluk_police_no = ?, mali_sorumluluk_bitis_tarihi = ?,
          ferdi_kaza_police_no = ?, ferdi_kaza_bitis_tarihi = ?, kapasite = ?, arac_ozellikleri = ?
          WHERE id = ?`,
        [
          aracData.plaka,
          aracData.arac_modeli,
          aracData.trafige_cikis_tarihi,
          aracData.son_muayene_tarihi,
          aracData.mali_sorumluluk_police_no,
          aracData.mali_sorumluluk_bitis_tarihi,
          aracData.ferdi_kaza_police_no,
          aracData.ferdi_kaza_bitis_tarihi,
          aracData.kapasite,
          aracData.arac_ozellikleri,
          editingAracId,
        ]
      );

      aracId = editingAracId;

      // Eski şoförleri sil
      await window.electronAPI.dbQuery(
        "DELETE FROM gezi_arac_soforler WHERE arac_id = ?",
        [aracId]
      );

      console.log("✅ Araç güncellendi");
      Bildirim.goster("success", "🚗 Araç başarıyla güncellendi!");
    } else {
      // YENİ EKLEME MODU
      console.log("➕ Yeni ekleme modu");

      const aracResult = await window.electronAPI.dbQuery(
        `INSERT INTO gezi_araclar 
          (gezi_id, plaka, arac_modeli, trafige_cikis_tarihi, son_muayene_tarihi,
           mali_sorumluluk_police_no, mali_sorumluluk_bitis_tarihi, 
           ferdi_kaza_police_no, ferdi_kaza_bitis_tarihi, kapasite, arac_ozellikleri)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          currentGeziIdForUlasim,
          aracData.plaka,
          aracData.arac_modeli,
          aracData.trafige_cikis_tarihi,
          aracData.son_muayene_tarihi,
          aracData.mali_sorumluluk_police_no,
          aracData.mali_sorumluluk_bitis_tarihi,
          aracData.ferdi_kaza_police_no,
          aracData.ferdi_kaza_bitis_tarihi,
          aracData.kapasite,
          aracData.arac_ozellikleri,
        ]
      );

      if (!aracResult.success) {
        throw new Error("Araç kaydedilemedi");
      }

      const aracIdResult = await window.electronAPI.dbQuery(
        "SELECT last_insert_rowid() as id"
      );
      aracId = aracIdResult.data[0].id;

      console.log("✅ Araç eklendi, ID:", aracId);
      Bildirim.goster("success", "🚗 Araç başarıyla eklendi!");
    }

    // 1. Şoför kaydet
    await window.electronAPI.dbQuery(
      `INSERT INTO gezi_arac_soforler 
        (arac_id, tc_no, ad_soyad, telefon, src_belge_no, src_belge_tarihi, sofor_tipi)
        VALUES (?, ?, ?, ?, ?, ?, 'ana_sofor')`,
      [
        aracId,
        sofor1TC,
        sofor1Ad,
        document.getElementById("sofor1Tel").value.trim() || null,
        document.getElementById("sofor1SRC").value.trim() || null,
        document.getElementById("sofor1SRCTarih").value || null,
      ]
    );

    console.log("✅ 1. Şoför kaydedildi");

    // 2. Şoför (opsiyonel)
    const sofor2TC = document.getElementById("sofor2TC").value.trim();
    const sofor2Ad = document.getElementById("sofor2Ad").value.trim();

    if (sofor2TC && sofor2Ad) {
      if (sofor2TC.length !== 11) {
        Bildirim.goster(
          "warning",
          "2. Şoför TC Kimlik No 11 haneli olmalıdır!"
        );
        return;
      }

      await window.electronAPI.dbQuery(
        `INSERT INTO gezi_arac_soforler 
          (arac_id, tc_no, ad_soyad, telefon, src_belge_no, src_belge_tarihi, sofor_tipi)
          VALUES (?, ?, ?, ?, ?, ?, 'ikinci_sofor')`,
        [
          aracId,
          sofor2TC,
          sofor2Ad,
          document.getElementById("sofor2Tel").value.trim() || null,
          document.getElementById("sofor2SRC").value.trim() || null,
          document.getElementById("sofor2SRCTarih").value || null,
        ]
      );

      console.log("✅ 2. Şoför kaydedildi");
    }

    // Belgeleri yükle ve kaydet
    if (uploadedFiles.length > 0) {
      console.log(`📁 ${uploadedFiles.length} belge yükleniyor...`);

      for (const file of uploadedFiles) {
        try {
          // Dosyayı base64'e çevir
          const reader = new FileReader();
          const base64Data = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Dosyayı sunucuya yükle
          const uploadResult = await window.electronAPI.uploadFile({
            name: file.name,
            data: base64Data,
            type: file.type,
          });

          if (uploadResult.success) {
            // Veritabanına kaydet
            await window.electronAPI.dbQuery(
              `INSERT INTO gezi_arac_belgeler 
                (arac_id, belge_tipi, belge_adi, dosya_yolu, dosya_uzantisi)
                VALUES (?, ?, ?, ?, ?)`,
              [
                aracId,
                "arac_belgesi",
                file.name,
                uploadResult.filePath,
                path.extname(file.name),
              ]
            );

            console.log(`✅ Belge yüklendi: ${file.name}`);
          }
        } catch (error) {
          console.error(`❌ ${file.name} yüklenemedi:`, error);
        }
      }

      console.log("✅ Tüm belgeler yüklendi");
    }

    closeAracEkleModal();
    await loadAraclar(currentGeziIdForUlasim);
  } catch (error) {
    console.error("❌ Araç kaydetme hatası:", error);
    Bildirim.goster(
      "error",
      "Araç kaydedilirken hata oluştu: " + error.message
    );
  }
}
// ==========================================
// KOLTUK PLANI MODAL - AÇ/KAPAT
// ==========================================

async function openKoltukPlaniModal(aracId, plaka, kapasite) {
  try {
    console.log("🚌 Koltuk planı açılıyor:", { aracId, plaka, kapasite });

    currentAracIdForKoltuk = aracId;
    currentAracPlakaForKoltuk = plaka;
    currentAracKapasiteForKoltuk = kapasite || 54;
    koltukAtamalari = {};

    document.getElementById(
      "koltukPlaniBaslik"
    ).textContent = `🚌 ${plaka} - Koltuk Planı`;
    document.getElementById("koltukKapasite").value =
      currentAracKapasiteForKoltuk;
    document.getElementById("koltukPlaniModal").style.display = "flex";

    await loadKatilimcilarForKoltuk();
    createOtobusPlani(currentAracKapasiteForKoltuk);

    console.log("✅ Koltuk planı modalı açıldı");
  } catch (error) {
    console.error("❌ Koltuk planı açma hatası:", error);
    Bildirim.goster("error", "Koltuk planı açılamadı!");
  }
}

function closeKoltukPlaniModal() {
  document.getElementById("koltukPlaniModal").style.display = "none";
  currentAracIdForKoltuk = null;
  koltukAtamalari = {};
  allKatilimcilarForKoltuk = [];
}

// ==========================================
// KATILIMCILARI YÜKLE
// ==========================================

async function loadKatilimcilarForKoltuk() {
  try {
    console.log("👥 Katılımcılar yükleniyor...");
    allKatilimcilarForKoltuk = [];

    // Gezi ID'sini al
    let geziId = currentGeziIdForUlasim;

    // Eğer yoksa, araç üzerinden bul
    if (!geziId) {
      const aracResult = await window.electronAPI.dbQuery(
        "SELECT gezi_id FROM gezi_araclar WHERE id = ?",
        [currentAracIdForKoltuk]
      );

      if (aracResult.success && aracResult.data && aracResult.data.length > 0) {
        geziId = aracResult.data[0].gezi_id;
        currentGeziIdForUlasim = geziId; // Cache'e al
        console.log("✅ Gezi ID araç üzerinden bulundu:", geziId);
      } else {
        Bildirim.goster("error", "Gezi bilgisi bulunamadı!");
        return;
      }
    }

    // Kafile Başkanı
    const kafileResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad_soyad, o.cinsiyet, 'kafile' as tipi
       FROM gezi_kafile_baskanlari gk
       INNER JOIN ogretmenler o ON gk.ogretmen_id = o.id
       WHERE gk.gezi_id = ?`,
      [geziId]
    );
    if (kafileResult.success && kafileResult.data) {
      allKatilimcilarForKoltuk.push(...kafileResult.data);
    }

    // Öğretmenler
    const ogretmenResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad_soyad, o.cinsiyet, 'ogretmen' as tipi
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       WHERE go.gezi_id = ?`,
      [geziId]
    );
    if (ogretmenResult.success && ogretmenResult.data) {
      allKatilimcilarForKoltuk.push(...ogretmenResult.data);
    }

    // Öğrenciler
    const ogrenciResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad_soyad, o.cinsiyet, 'ogrenci' as tipi
       FROM gezi_ogrenciler go
       INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
       WHERE go.gezi_id = ?`,
      [geziId]
    );
    if (ogrenciResult.success && ogrenciResult.data) {
      allKatilimcilarForKoltuk.push(...ogrenciResult.data);
    }

    // Misafirler
    const misafirResult = await window.electronAPI.dbQuery(
      `SELECT id, ad_soyad, cinsiyet, 'misafir' as tipi
       FROM gezi_misafirler
       WHERE gezi_id = ?`,
      [geziId]
    );
    if (misafirResult.success && misafirResult.data) {
      allKatilimcilarForKoltuk.push(...misafirResult.data);
    }

    console.log(`✅ ${allKatilimcilarForKoltuk.length} katılımcı yüklendi`);
    renderKatilimciListesiKoltuk();
  } catch (error) {
    console.error("❌ Katılımcı yükleme hatası:", error);
  }
}
function renderKatilimciListesiKoltuk() {
  const container = document.getElementById("katilimciListesiKoltuk");
  document.getElementById("katilimciSayisi").textContent =
    allKatilimcilarForKoltuk.length;

  if (allKatilimcilarForKoltuk.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #6b7280; padding: 20px;">Katılımcı bulunamadı</p>';
    return;
  }

  let html = "";

  allKatilimcilarForKoltuk.forEach((k) => {
    const isAtandi = Object.values(koltukAtamalari).some(
      (a) => !a.rezerve && a.kisi_id === k.id && a.kisi_tipi === k.tipi
    );
    const icon =
      k.tipi === "kafile"
        ? "👑"
        : k.tipi === "ogretmen"
        ? "👨‍🏫"
        : k.tipi === "ogrenci"
        ? "👨‍🎓"
        : "👥";

    html += `
      <div class="katilimci-kart-drag ${isAtandi ? "atandi" : ""}" 
           draggable="${!isAtandi}" 
           data-id="${k.id}" 
           data-tipi="${k.tipi}" 
           data-ad="${k.ad_soyad}"
           data-cinsiyet="${k.cinsiyet || "E"}">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">${icon}</span>
          <div style="flex: 1; font-size: 13px;">
            <div style="font-weight: 600;">${k.ad_soyad}</div>
            <div style="color: #6b7280; font-size: 11px;">${
              k.tipi === "kafile"
                ? "Kafile Başkanı"
                : k.tipi === "ogretmen"
                ? "Öğretmen"
                : k.tipi === "ogrenci"
                ? "Öğrenci"
                : "Misafir"
            }</div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // YENİ FONKSİYON İSİMLERİYLE DRAG EVENT'LERİNİ EKLE
  document.querySelectorAll(".katilimci-kart-drag").forEach((kart) => {
    kart.addEventListener("dragstart", handleKoltukDragStart);
    kart.addEventListener("dragend", (e) => {
      e.currentTarget.style.opacity = "1";
    });
  });
}

// ==========================================
// OTOBÜS KOLTUK PLANI OLUŞTUR
// ==========================================

function createOtobusPlani(kapasite) {
  console.log("🚌 Otobüs planı oluşturuluyor, kapasite:", kapasite);

  const container = document.getElementById("otobusKoltukPlani");
  const koltukSayisi = parseInt(kapasite);
  const satirSayisi = Math.ceil(koltukSayisi / 4);

  let html = '<div class="otobus-container">';
  html += '<div class="sofor-alan">🚗 ŞOFÖR</div>';

  let koltukNo = 1;

  for (let i = 0; i < satirSayisi; i++) {
    html += '<div class="koltuk-satir">';

    // Sol 2 koltuk
    for (let j = 0; j < 2; j++) {
      if (koltukNo <= koltukSayisi) {
        html += createKoltukHTML(koltukNo);
        koltukNo++;
      }
    }

    html += '<div class="koridor"></div>';

    // Sağ 2 koltuk
    for (let j = 0; j < 2; j++) {
      if (koltukNo <= koltukSayisi) {
        html += createKoltukHTML(koltukNo);
        koltukNo++;
      }
    }

    html += "</div>";
  }

  html += "</div>";
  container.innerHTML = html;

  setupDropEvents();
  updateKoltukStats();

  console.log("✅ Otobüs planı oluşturuldu");
}

function createKoltukHTML(koltukNo) {
  const atama = koltukAtamalari[koltukNo];

  if (atama) {
    if (atama.rezerve) {
      // Rezerve koltuk
      return `
        <div class="koltuk rezerve" data-koltuk="${koltukNo}">
          <div class="koltuk-no">${koltukNo}</div>
          <div class="koltuk-kisi">🔒 Rezerve</div>
        </div>
      `;
    } else {
      // Dolu koltuk
      const cinsiyetClass =
        atama.kisi_tipi === "ogretmen" || atama.kisi_tipi === "kafile"
          ? "ogretmen"
          : atama.cinsiyet === "K" || atama.cinsiyet === "Kız"
          ? "kiz"
          : "erkek";

      return `
        <div class="koltuk dolu ${cinsiyetClass}" data-koltuk="${koltukNo}">
          <div class="koltuk-no">${koltukNo}</div>
          <div class="koltuk-kisi">${atama.ad_soyad}</div>
        </div>
      `;
    }
  }

  return `
    <div class="koltuk" data-koltuk="${koltukNo}">
      <div class="koltuk-no">${koltukNo}</div>
      <div class="koltuk-kisi">Boş</div>
    </div>
  `;
}

function setupDropEvents() {
  document.querySelectorAll(".koltuk").forEach((koltuk) => {
    koltuk.addEventListener("dragover", handleKoltukDragOver);
    koltuk.addEventListener("dragleave", handleKoltukDragLeave);
    koltuk.addEventListener("drop", handleKoltukDrop);
    koltuk.addEventListener("click", handleKoltukClick);
  });
}
// ==========================================
// KOLTUK PLANI - DRAG & DROP EVENT HANDLERS
// ==========================================

function handleKoltukDragStart(e) {
  const kart = e.currentTarget;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("koltuk_kisi_id", kart.dataset.id);
  e.dataTransfer.setData("koltuk_kisi_tipi", kart.dataset.tipi);
  e.dataTransfer.setData("koltuk_ad_soyad", kart.dataset.ad);
  e.dataTransfer.setData("koltuk_cinsiyet", kart.dataset.cinsiyet);
  kart.style.opacity = "0.5";

  console.log("🚀 Drag başladı:", kart.dataset.ad);
}

function handleKoltukDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const koltuk = e.currentTarget;
  if (
    !koltuk.classList.contains("dolu") &&
    !koltuk.classList.contains("rezerve")
  ) {
    koltuk.classList.add("dragover");
  }
}

function handleKoltukDragLeave(e) {
  e.currentTarget.classList.remove("dragover");
}

function handleKoltukDrop(e) {
  e.preventDefault();
  const koltuk = e.currentTarget;
  koltuk.classList.remove("dragover");

  const koltukNo = parseInt(koltuk.dataset.koltuk);

  // Rezerve koltuksa iptal
  if (koltukAtamalari[koltukNo] && koltukAtamalari[koltukNo].rezerve) {
    Bildirim.goster("warning", "Bu koltuk rezerve!");
    return;
  }

  // Dolu koltuksa iptal
  if (koltuk.classList.contains("dolu")) {
    Bildirim.goster("warning", "Bu koltuk dolu!");
    return;
  }

  const kisiId = parseInt(e.dataTransfer.getData("koltuk_kisi_id"));
  const kisiTipi = e.dataTransfer.getData("koltuk_kisi_tipi");
  const adSoyad = e.dataTransfer.getData("koltuk_ad_soyad");
  const cinsiyet = e.dataTransfer.getData("koltuk_cinsiyet");

  // Veri kontrolü
  if (!kisiId || !kisiTipi || !adSoyad) {
    console.warn("❌ Geçersiz drag data");
    return;
  }

  // Atamayı yap
  koltukAtamalari[koltukNo] = {
    kisi_id: kisiId,
    kisi_tipi: kisiTipi,
    ad_soyad: adSoyad,
    cinsiyet: cinsiyet,
  };

  console.log(`✅ ${adSoyad} → Koltuk ${koltukNo}`);

  // Planı yenile
  createOtobusPlani(currentAracKapasiteForKoltuk);
  renderKatilimciListesiKoltuk();
}

function handleKoltukClick(e) {
  const koltuk = e.currentTarget;
  const koltukNo = parseInt(koltuk.dataset.koltuk);

  if (koltukAtamalari[koltukNo]) {
    if (koltukAtamalari[koltukNo].rezerve) {
      // Rezerve koltuksa, rezervasyonu kaldır
      if (
        confirm(`Koltuk ${koltukNo} rezervasyonunu kaldırmak ister misiniz?`)
      ) {
        delete koltukAtamalari[koltukNo];
        createOtobusPlani(currentAracKapasiteForKoltuk);
        renderKatilimciListesiKoltuk();
        Bildirim.goster("success", `Koltuk ${koltukNo} rezerve kaldırıldı`);
      }
    } else {
      // Normal koltuksa, boşalt veya rezerve et menüsü göster
      const menu = confirm(
        `Koltuk ${koltukNo} işlemi:\n\n✅ TAMAM = Koltuk boşalt\n❌ İPTAL = Koltuk rezerve et`
      );
      if (menu) {
        koltukBosalt(koltukNo);
      } else {
        koltukRezerveEt(koltukNo);
      }
    }
  } else {
    // Boş koltuksa, rezerve et
    if (confirm(`Koltuk ${koltukNo} rezerve edilsin mi?`)) {
      koltukRezerveEt(koltukNo);
    }
  }
}

function koltukRezerveEt(koltukNo) {
  koltukAtamalari[koltukNo] = {
    rezerve: true,
  };

  console.log(`🔒 Koltuk ${koltukNo} rezerve edildi`);
  createOtobusPlani(currentAracKapasiteForKoltuk);
  Bildirim.goster("info", `Koltuk ${koltukNo} rezerve edildi`);
}

function koltukBosalt(koltukNo) {
  if (!koltukAtamalari[koltukNo]) return;

  const kisi = koltukAtamalari[koltukNo];
  delete koltukAtamalari[koltukNo];

  console.log(
    `🗑️ Koltuk ${koltukNo} boşaltıldı (${kisi.ad_soyad || "Rezerve"})`
  );

  createOtobusPlani(currentAracKapasiteForKoltuk);
  renderKatilimciListesiKoltuk();
  Bildirim.goster("success", `Koltuk ${koltukNo} boşaltıldı`);
}

// ==========================================
// KOLTUK PLANI YARDIMCI FONKSİYONLAR
// ==========================================

function changeKoltukKapasite() {
  const yeniKapasite = parseInt(
    document.getElementById("koltukKapasite").value
  );
  currentAracKapasiteForKoltuk = yeniKapasite;

  // Kapasite küçülürse, taşan atamaları temizle
  Object.keys(koltukAtamalari).forEach((koltukNo) => {
    if (parseInt(koltukNo) > yeniKapasite) {
      delete koltukAtamalari[koltukNo];
    }
  });

  createOtobusPlani(yeniKapasite);
  renderKatilimciListesiKoltuk();
}

function tumKoltuklariTemizle() {
  if (Object.keys(koltukAtamalari).length === 0) return;

  const confirmed = confirm(
    "Tüm koltuk atamalarını temizlemek istediğinize emin misiniz?"
  );
  if (!confirmed) return;

  koltukAtamalari = {};
  createOtobusPlani(currentAracKapasiteForKoltuk);
  renderKatilimciListesiKoltuk();
  Bildirim.goster("success", "Tüm koltuklar temizlendi!");
}

function updateKoltukStats() {
  const toplam = currentAracKapasiteForKoltuk;
  const dolu = Object.keys(koltukAtamalari).length;
  const bos = toplam - dolu;

  document.getElementById("statToplamKoltuk").textContent = toplam;
  document.getElementById("statDoluKoltuk").textContent = dolu;
  document.getElementById("statBosKoltuk").textContent = bos;
}
function filterKatilimcilar() {
  const arama = document.getElementById("katilimciArama").value.toLowerCase();
  const checkboxes = document.querySelectorAll("[data-filter]");
  const aktifFiltreler = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.dataset.filter);

  const filtreliKatilimcilar = allKatilimcilarForKoltuk.filter((k) => {
    const aramaMatch = k.ad_soyad.toLowerCase().includes(arama);
    const filtreMatch = aktifFiltreler.includes(k.tipi);
    return aramaMatch && filtreMatch;
  });

  const container = document.getElementById("katilimciListesiKoltuk");
  let html = "";

  filtreliKatilimcilar.forEach((k) => {
    const isAtandi = Object.values(koltukAtamalari).some(
      (a) => !a.rezerve && a.kisi_id === k.id && a.kisi_tipi === k.tipi
    );
    const icon =
      k.tipi === "kafile"
        ? "👑"
        : k.tipi === "ogretmen"
        ? "👨‍🏫"
        : k.tipi === "ogrenci"
        ? "👨‍🎓"
        : "👥";

    html += `
      <div class="katilimci-kart-drag ${isAtandi ? "atandi" : ""}" 
           draggable="${!isAtandi}" 
           data-id="${k.id}" 
           data-tipi="${k.tipi}" 
           data-ad="${k.ad_soyad}"
           data-cinsiyet="${k.cinsiyet || "E"}">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">${icon}</span>
          <div style="flex: 1; font-size: 13px;">
            <div style="font-weight: 600;">${k.ad_soyad}</div>
            <div style="color: #6b7280; font-size: 11px;">${
              k.tipi === "kafile"
                ? "Kafile Başkanı"
                : k.tipi === "ogretmen"
                ? "Öğretmen"
                : k.tipi === "ogrenci"
                ? "Öğrenci"
                : "Misafir"
            }</div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // YENİ FONKSİYON İSİMLERİYLE DRAG EVENT'LERİNİ EKLE
  document.querySelectorAll(".katilimci-kart-drag").forEach((kart) => {
    kart.addEventListener("dragstart", handleKoltukDragStart);
    kart.addEventListener("dragend", (e) => {
      e.currentTarget.style.opacity = "1";
    });
  });
}

// ==========================================
// OTOMATİK KOLTUK ATAMA
// ==========================================

function otomatikKoltukAta() {
  if (allKatilimcilarForKoltuk.length === 0) {
    Bildirim.goster("warning", "Atanacak katılımcı bulunamadı!");
    return;
  }

  // Rezerve olmayan koltuk sayısını hesapla
  const rezerveKoltuklar = Object.values(koltukAtamalari).filter(
    (a) => a.rezerve
  ).length;
  const bosKoltukSayisi = currentAracKapasiteForKoltuk - rezerveKoltuklar;

  if (allKatilimcilarForKoltuk.length > bosKoltukSayisi) {
    Bildirim.goster(
      "warning",
      `Katılımcı sayısı (${allKatilimcilarForKoltuk.length}) boş koltuk sayısından (${bosKoltukSayisi}) fazla!\n\nRezerve koltuklar: ${rezerveKoltuklar}`
    );
    return;
  }

  const confirmed = confirm(
    `Otomatik atama mevcut atamaları silecektir (rezerveler korunur).\n\nDevam edilsin mi?`
  );
  if (!confirmed) return;

  // Rezerve olmayanları temizle
  Object.keys(koltukAtamalari).forEach((koltukNo) => {
    if (!koltukAtamalari[koltukNo].rezerve) {
      delete koltukAtamalari[koltukNo];
    }
  });

  // Öncelik sırası
  const siraliKatilimcilar = [
    ...allKatilimcilarForKoltuk.filter((k) => k.tipi === "kafile"),
    ...allKatilimcilarForKoltuk.filter((k) => k.tipi === "ogretmen"),
    ...allKatilimcilarForKoltuk.filter((k) => k.tipi === "ogrenci"),
    ...allKatilimcilarForKoltuk.filter((k) => k.tipi === "misafir"),
  ];

  let koltukNo = 1;
  let atananSayisi = 0;

  siraliKatilimcilar.forEach((k) => {
    // Boş koltuk bul (rezerve olmayanları atla)
    while (
      koltukNo <= currentAracKapasiteForKoltuk &&
      koltukAtamalari[koltukNo]
    ) {
      koltukNo++;
    }

    if (koltukNo <= currentAracKapasiteForKoltuk) {
      koltukAtamalari[koltukNo] = {
        kisi_id: k.id,
        kisi_tipi: k.tipi,
        ad_soyad: k.ad_soyad,
        cinsiyet: k.cinsiyet || "E",
      };
      atananSayisi++;
      koltukNo++;
    }
  });

  createOtobusPlani(currentAracKapasiteForKoltuk);
  renderKatilimciListesiKoltuk();
  Bildirim.goster("success", `${atananSayisi} kişi otomatik olarak atandı!`);
}
// ==========================================
// KOLTUK PLANI PDF İNDİR
// ==========================================

async function koltukPlaniPDFIndir() {
  if (Object.keys(koltukAtamalari).length === 0) {
    Bildirim.goster("warning", "Henüz koltuk ataması yapılmamış!");
    return;
  }

  try {
    Bildirim.goster("info", "📄 PDF oluşturuluyor...");

    // HTML rapor oluştur
    let html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Koltuk Planı - ${currentAracPlakaForKoltuk}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: "Times New Roman", Times, serif; 
      padding: 20mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { text-align: center; margin-bottom: 10px; font-size: 24px; }
    h2 { text-align: center; margin-bottom: 30px; font-size: 18px; color: #666; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0; 
    }
    th, td { 
      border: 2px solid #000; 
      padding: 12px 8px; 
      text-align: center;
      font-size: 14px;
    }
    th { 
      background: #e3f2fd; 
      font-weight: bold;
      font-size: 15px;
    }
    .erkek { background: #93c5fd !important; }
    .kiz { background: #fda4af !important; }
    .ogretmen { background: #fde68a !important; font-weight: bold; }
    .rezerve { background: #fbbf24 !important; font-weight: bold; }
    .ozet {
      margin-top: 30px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
    }
    .ozet span {
      display: inline-block;
      margin: 0 20px;
      padding: 10px 20px;
      background: #f0f9ff;
      border-radius: 8px;
    }
    @media print {
      body { padding: 10mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>🚌 ARAÇ KOLTUK PLANI</h1>
  <h2>${currentAracPlakaForKoltuk} - Kapasite: ${currentAracKapasiteForKoltuk} Kişi</h2>
  
  <table>
    <thead>
      <tr>
        <th width="10%">Koltuk No</th>
        <th width="40%">Ad Soyad</th>
        <th width="25%">Tipi</th>
        <th width="25%">Cinsiyet</th>
      </tr>
    </thead>
    <tbody>`;

    // Koltukları sırala
    const siraliKoltuklar = Object.keys(koltukAtamalari).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    siraliKoltuklar.forEach((koltukNo) => {
      const atama = koltukAtamalari[koltukNo];

      if (atama.rezerve) {
        html += `
          <tr class="rezerve">
            <td><strong>${koltukNo}</strong></td>
            <td colspan="3">🔒 REZERVE</td>
          </tr>
        `;
      } else {
        const cinsiyetClass =
          atama.kisi_tipi === "ogretmen" || atama.kisi_tipi === "kafile"
            ? "ogretmen"
            : atama.cinsiyet === "K" ||
              atama.cinsiyet === "Kız" ||
              atama.cinsiyet === "Kadın"
            ? "kiz"
            : "erkek";
        const tipiText =
          atama.kisi_tipi === "kafile"
            ? "👑 Kafile Başkanı"
            : atama.kisi_tipi === "ogretmen"
            ? "👨‍🏫 Öğretmen"
            : atama.kisi_tipi === "ogrenci"
            ? "👨‍🎓 Öğrenci"
            : "👥 Misafir";
        const cinsiyetText =
          atama.cinsiyet === "K" ||
          atama.cinsiyet === "Kız" ||
          atama.cinsiyet === "Kadın"
            ? "Kadın"
            : "Erkek";

        html += `
          <tr class="${cinsiyetClass}">
            <td><strong>${koltukNo}</strong></td>
            <td>${atama.ad_soyad}</td>
            <td>${tipiText}</td>
            <td>${cinsiyetText}</td>
          </tr>
        `;
      }
    });

    html += `
    </tbody>
  </table>
  
  <div class="ozet">
    <span>📊 Toplam Dolu: ${
      Object.keys(koltukAtamalari).length
    } / ${currentAracKapasiteForKoltuk}</span>
    <span>✅ Boş Koltuk: ${
      currentAracKapasiteForKoltuk - Object.keys(koltukAtamalari).length
    }</span>
  </div>
  
  <div style="margin-top: 40px; text-align: center; color: #999; font-size: 12px;">
    Oluşturma Tarihi: ${new Date().toLocaleDateString(
      "tr-TR"
    )} ${new Date().toLocaleTimeString("tr-TR")}
  </div>
</body>
</html>`;

    // Yeni pencerede aç
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) {
      Bildirim.goster(
        "error",
        "Pop-up engellenmiş olabilir! Tarayıcı ayarlarından izin verin."
      );
      return;
    }

    pdfWindow.document.write(html);
    pdfWindow.document.close();

    // 500ms bekle, sonra yazdırma dialogunu aç
    setTimeout(() => {
      pdfWindow.print();
    }, 500);

    Bildirim.goster(
      "success",
      "✅ PDF önizleme hazır! Yazdır penceresinden kaydedebilirsiniz."
    );
  } catch (error) {
    console.error("❌ PDF oluşturma hatası:", error);
    Bildirim.goster("error", "PDF oluşturulamadı: " + error.message);
  }
}

// ==========================================
// ARAÇ SİL
// ==========================================

async function aracSil(aracId) {
  const confirmed = confirm(
    "⚠️ Bu aracı silmek istediğinize emin misiniz?\n\nŞoför ve belge bilgileri de silinecektir!"
  );

  if (!confirmed) return;

  try {
    console.log("🗑️ Araç siliniyor, ID:", aracId);

    // İlişkili kayıtları sil
    await window.electronAPI.dbQuery(
      "DELETE FROM gezi_arac_belgeler WHERE arac_id = ?",
      [aracId]
    );
    await window.electronAPI.dbQuery(
      "DELETE FROM gezi_arac_soforler WHERE arac_id = ?",
      [aracId]
    );
    await window.electronAPI.dbQuery("DELETE FROM gezi_araclar WHERE id = ?", [
      aracId,
    ]);

    Bildirim.goster("success", "Araç başarıyla silindi!");
    await loadAraclar(currentGeziIdForUlasim);
  } catch (error) {
    console.error("❌ Araç silme hatası:", error);
    Bildirim.goster("error", "Araç silinirken hata oluştu!");
  }
}

// ==========================================
// ARAÇ DÜZENLE
// ==========================================

async function aracDuzenle(aracId) {
  try {
    console.log("✏️ Araç düzenleniyor, ID:", aracId);
    editingAracId = aracId;

    // Araç bilgilerini çek
    const aracResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_araclar WHERE id = ?",
      [aracId]
    );

    if (
      !aracResult.success ||
      !aracResult.data ||
      aracResult.data.length === 0
    ) {
      Bildirim.goster("error", "Araç bulunamadı!");
      return;
    }

    const arac = aracResult.data[0];

    // Şoförleri çek
    const soforResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_arac_soforler WHERE arac_id = ? ORDER BY sofor_tipi",
      [aracId]
    );

    const soforler = soforResult.data || [];
    const anasofor =
      soforler.find((s) => s.sofor_tipi === "ana_sofor") || soforler[0];
    const ikinciSofor =
      soforler.find((s) => s.sofor_tipi === "ikinci_sofor") || soforler[1];

    // Belgeleri çek
    const belgeResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_arac_belgeler WHERE arac_id = ?",
      [aracId]
    );

    // Formu doldur
    document.getElementById("aracPlaka").value = arac.plaka;
    document.getElementById("aracModel").value = arac.arac_modeli || "";
    document.getElementById("aracTrafigeCikis").value =
      arac.trafige_cikis_tarihi || "";
    document.getElementById("aracMuayene").value =
      arac.son_muayene_tarihi || "";
    document.getElementById("aracMaliPolice").value =
      arac.mali_sorumluluk_police_no || "";
    document.getElementById("aracMaliBitis").value =
      arac.mali_sorumluluk_bitis_tarihi || "";
    document.getElementById("aracFerdiPolice").value =
      arac.ferdi_kaza_police_no || "";
    document.getElementById("aracFerdiBitis").value =
      arac.ferdi_kaza_bitis_tarihi || "";
    document.getElementById("aracKapasite").value = arac.kapasite || "";
    document.getElementById("aracOzellikler").value =
      arac.arac_ozellikleri || "";

    // Ana şoför
    if (anasofor) {
      document.getElementById("sofor1TC").value = anasofor.tc_no;
      document.getElementById("sofor1Ad").value = anasofor.ad_soyad;
      document.getElementById("sofor1Tel").value = anasofor.telefon || "";
      document.getElementById("sofor1SRC").value = anasofor.src_belge_no || "";
      document.getElementById("sofor1SRCTarih").value =
        anasofor.src_belge_tarihi || "";
    }

    // 2. Şoför
    if (ikinciSofor) {
      document.getElementById("sofor2TC").value = ikinciSofor.tc_no;
      document.getElementById("sofor2Ad").value = ikinciSofor.ad_soyad;
      document.getElementById("sofor2Tel").value = ikinciSofor.telefon || "";
      document.getElementById("sofor2SRC").value =
        ikinciSofor.src_belge_no || "";
      document.getElementById("sofor2SRCTarih").value =
        ikinciSofor.src_belge_tarihi || "";
    }

    // Modal başlığını değiştir
    document.getElementById("aracModalTitle").textContent = "Araç Düzenle";

    // Modalı aç
    document.getElementById("aracEkleModal").style.display = "flex";
    setupFileUpload();

    Bildirim.goster("info", "Araç bilgileri yüklendi");
    console.log("✅ Araç düzenleme formu dolduruldu");
  } catch (error) {
    console.error("❌ Araç düzenleme hatası:", error);
    Bildirim.goster("error", "Araç yüklenirken hata oluştu!");
  }
}

// ==========================================
// BELGE AÇ
// ==========================================

async function belgeyiAc(dosyaYolu) {
  try {
    console.log("📂 Belge açılıyor:", dosyaYolu);

    const result = await window.electronAPI.openFile(dosyaYolu);

    if (result.success) {
      console.log("✅ Belge açıldı");
    } else {
      Bildirim.goster("error", "Belge açılamadı!");
    }
  } catch (error) {
    console.error("❌ Belge açma hatası:", error);
    Bildirim.goster("error", "Belge açılırken hata oluştu!");
  }
}

// ==========================================
// UÇUŞ BİLGİLERİNİ YÜKLE VE RENDER
// ==========================================

async function loadUcakBilgileri(geziId) {
  try {
    console.log("🔄 Uçuş bilgileri yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_ulasim WHERE gezi_id = ? AND ulasim_tipi = 'ucak' ORDER BY kalkis_tarihi, kalkis_saati",
      [geziId]
    );

    const container = document.getElementById("ucakListesi");

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>Henüz uçuş bilgisi eklenmedi</p>
        </div>
      `;
      return;
    }

    // Uçuş kartlarını render et
    container.innerHTML = result.data
      .map((ucus) => renderUcusCard(ucus))
      .join("");

    console.log(`✅ ${result.data.length} uçuş bilgisi yüklendi`);
  } catch (error) {
    console.error("❌ Uçuş bilgileri yükleme hatası:", error);
  }
}

// ==========================================
// UÇUŞ KARTI RENDER
// ==========================================

function renderUcusCard(ucus) {
  return `
    <div class="ucus-card">
      <div class="ucus-card-header">
        <div class="ucus-card-title">
          <div class="ucus-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
          </div>
          <div class="ucus-title-text">
            <h4>${ucus.firma_adi} - ${ucus.sefer_no}</h4>
            <p>${
              ucus.pnr_kodu ? `PNR: ${ucus.pnr_kodu}` : "PNR belirtilmemiş"
            }</p>
          </div>
        </div>
        <div class="ucus-actions">
  <button class="btn-modern btn-sm btn-warning" onclick="ucakDuzenle(${
    ucus.id
  })" title="Uçuş Düzenle">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </button>
  <button class="btn-modern btn-sm btn-danger" onclick="ucusSil(${
    ucus.id
  })" title="Uçuş Sil">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    </svg>
  </button>
</div>
      </div>

      <div class="ucus-route">
        <div class="ucus-location">
          <div class="ucus-location-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div class="ucus-location-info">
            <div class="ucus-location-label">Kalkış</div>
            <div class="ucus-location-name">${ucus.kalkis_yeri}</div>
            <div class="ucus-location-time">${formatDate(ucus.kalkis_tarihi)} ${
    ucus.kalkis_saati
  }</div>
          </div>
        </div>

        <div class="ucus-arrow">
          ${
            ucus.aktarma_var
              ? `
            <div class="ucus-aktarma-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              Aktarmalı
            </div>
          `
              : `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          `
          }
        </div>

        <div class="ucus-location">
          <div class="ucus-location-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="ucus-location-info">
            <div class="ucus-location-label">Varış</div>
            <div class="ucus-location-name">${ucus.varis_yeri}</div>
            <div class="ucus-location-time">${formatDate(ucus.varis_tarihi)} ${
    ucus.varis_saati
  }</div>
          </div>
        </div>
      </div>

      ${
        ucus.aktarma_bilgisi
          ? `
        <div class="ucus-aktarma-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <strong>Aktarma:</strong> ${ucus.aktarma_bilgisi}
        </div>
      `
          : ""
      }

      <div class="ucus-card-footer">
        ${
          ucus.ucret
            ? `
          <div class="ucus-price">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span>${parseFloat(ucus.ucret).toFixed(2)} TL</span> / Kişi
          </div>
        `
            : ""
        }
        ${
          ucus.notlar
            ? `
          <div class="ucus-notes">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            ${ucus.notlar}
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

// ==========================================
// UÇUŞ SİL
// ==========================================

async function ucusSil(ucusId) {
  const confirmed = confirm(
    "⚠️ Bu uçuş bilgisini silmek istediğinize emin misiniz?"
  );

  if (!confirmed) return;

  try {
    console.log("🗑️ Uçuş siliniyor, ID:", ucusId);

    await window.electronAPI.dbQuery("DELETE FROM gezi_ulasim WHERE id = ?", [
      ucusId,
    ]);

    Bildirim.goster("success", "Uçuş bilgisi silindi!");
    await loadUcakBilgileri(currentGeziIdForUlasim);
  } catch (error) {
    console.error("❌ Uçuş silme hatası:", error);
    Bildirim.goster("error", "Uçuş silinirken hata oluştu!");
  }
}

// ==========================================
// UÇAK EKLEME MODAL
// ==========================================

function openUcakEkleModal() {
  editingUcusId = null; // ✅ Düzenleme ID'sini sıfırla
  clearUcakForm();
  document.getElementById("ucakModalTitle").textContent = "Uçuş Bilgisi Ekle"; // ✅ Başlığı sıfırla
  document.getElementById("ucakEkleModal").style.display = "flex";
}

function closeUcakEkleModal() {
  document.getElementById("ucakEkleModal").style.display = "none";
  editingUcusId = null; // ✅ Kapatırken sıfırla
}

function clearUcakForm() {
  document.getElementById("ucakFirma").value = "";
  document.getElementById("ucakSeferNo").value = "";
  document.getElementById("ucakPNR").value = "";
  document.getElementById("ucakKalkis").value = "";
  document.getElementById("ucakVaris").value = "";
  document.getElementById("ucakKalkisTarih").value = "";
  document.getElementById("ucakKalkisSaat").value = "";
  document.getElementById("ucakVarisTarih").value = "";
  document.getElementById("ucakVarisSaat").value = "";
  document.getElementById("ucakAktarma").value = "0";
  document.getElementById("ucakAktarmaBilgi").value = "";
  document.getElementById("ucakUcret").value = "";
  document.getElementById("ucakNotlar").value = "";
  document.getElementById("ucakAktarmaBilgiGroup").style.display = "none";
}

// ==========================================
// UÇAK KAYDET (EKLEME + GÜNCELLEME)
// ==========================================

async function ucakKaydet() {
  try {
    console.log("✈️ Uçuş bilgisi kaydediliyor...");

    // Validasyon
    const firma = document.getElementById("ucakFirma").value.trim();
    const seferNo = document.getElementById("ucakSeferNo").value.trim();
    const kalkis = document.getElementById("ucakKalkis").value.trim();
    const varis = document.getElementById("ucakVaris").value.trim();
    const kalkisTarih = document.getElementById("ucakKalkisTarih").value;
    const kalkisSaat = document.getElementById("ucakKalkisSaat").value;
    const varisTarih = document.getElementById("ucakVarisTarih").value;
    const varisSaat = document.getElementById("ucakVarisSaat").value;

    if (!firma) {
      Bildirim.goster("warning", "Havayolu firması zorunludur!");
      return;
    }

    if (!seferNo) {
      Bildirim.goster("warning", "Uçuş numarası zorunludur!");
      return;
    }

    if (!kalkis || !varis) {
      Bildirim.goster("warning", "Kalkış ve varış havalimanı zorunludur!");
      return;
    }

    if (!kalkisTarih || !kalkisSaat || !varisTarih || !varisSaat) {
      Bildirim.goster(
        "warning",
        "Kalkış ve varış tarih/saat bilgileri zorunludur!"
      );
      return;
    }

    // Uçuş verisi
    const ucakData = {
      firma_adi: firma,
      sefer_no: seferNo,
      pnr_kodu: document.getElementById("ucakPNR").value.trim() || null,
      kalkis_yeri: kalkis,
      varis_yeri: varis,
      kalkis_tarihi: kalkisTarih,
      kalkis_saati: kalkisSaat,
      varis_tarihi: varisTarih,
      varis_saati: varisSaat,
      aktarma_var: parseInt(document.getElementById("ucakAktarma").value),
      aktarma_bilgisi:
        document.getElementById("ucakAktarmaBilgi").value.trim() || null,
      ucret: document.getElementById("ucakUcret").value || null,
      notlar: document.getElementById("ucakNotlar").value.trim() || null,
    };

    console.log("📊 Uçuş Data:", ucakData);

    if (editingUcusId) {
      // GÜNCELLEME MODU
      console.log("🔄 Güncelleme modu, Uçuş ID:", editingUcusId);

      const result = await window.electronAPI.dbQuery(
        `UPDATE gezi_ulasim SET
          firma_adi = ?, sefer_no = ?, pnr_kodu = ?, kalkis_yeri = ?, varis_yeri = ?,
          kalkis_tarihi = ?, kalkis_saati = ?, varis_tarihi = ?, varis_saati = ?,
          aktarma_var = ?, aktarma_bilgisi = ?, ucret = ?, notlar = ?
          WHERE id = ?`,
        [
          ucakData.firma_adi,
          ucakData.sefer_no,
          ucakData.pnr_kodu,
          ucakData.kalkis_yeri,
          ucakData.varis_yeri,
          ucakData.kalkis_tarihi,
          ucakData.kalkis_saati,
          ucakData.varis_tarihi,
          ucakData.varis_saati,
          ucakData.aktarma_var,
          ucakData.aktarma_bilgisi,
          ucakData.ucret,
          ucakData.notlar,
          editingUcusId,
        ]
      );

      if (!result.success) {
        throw new Error("Uçuş güncellenemedi");
      }

      console.log("✅ Uçuş güncellendi");
      Bildirim.goster("success", "✈️ Uçuş bilgisi başarıyla güncellendi!");
    } else {
      // YENİ EKLEME MODU
      console.log("➕ Yeni ekleme modu");

      const result = await window.electronAPI.dbQuery(
        `INSERT INTO gezi_ulasim 
          (gezi_id, ulasim_tipi, firma_adi, sefer_no, pnr_kodu, kalkis_yeri, varis_yeri,
           kalkis_tarihi, kalkis_saati, varis_tarihi, varis_saati, aktarma_var, aktarma_bilgisi, ucret, notlar)
          VALUES (?, 'ucak', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          currentGeziIdForUlasim,
          ucakData.firma_adi,
          ucakData.sefer_no,
          ucakData.pnr_kodu,
          ucakData.kalkis_yeri,
          ucakData.varis_yeri,
          ucakData.kalkis_tarihi,
          ucakData.kalkis_saati,
          ucakData.varis_tarihi,
          ucakData.varis_saati,
          ucakData.aktarma_var,
          ucakData.aktarma_bilgisi,
          ucakData.ucret,
          ucakData.notlar,
        ]
      );

      if (!result.success) {
        throw new Error("Uçuş bilgisi kaydedilemedi");
      }

      console.log("✅ Uçuş eklendi");
      Bildirim.goster("success", "✈️ Uçuş bilgisi başarıyla eklendi!");
    }

    closeUcakEkleModal();
    await loadUcakBilgileri(currentGeziIdForUlasim);
  } catch (error) {
    console.error("❌ Uçuş kaydetme hatası:", error);
    Bildirim.goster(
      "error",
      "Uçuş kaydedilirken hata oluştu: " + error.message
    );
  }
}

// ==========================================
// UÇAK DÜZENLE
// ==========================================

async function ucakDuzenle(ucusId) {
  try {
    console.log("✏️ Uçuş düzenleniyor, ID:", ucusId);
    editingUcusId = ucusId;

    // Uçuş bilgilerini çek
    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_ulasim WHERE id = ?",
      [ucusId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      Bildirim.goster("error", "Uçuş bilgisi bulunamadı!");
      return;
    }

    const ucus = result.data[0];

    // Formu doldur
    document.getElementById("ucakFirma").value = ucus.firma_adi || "";
    document.getElementById("ucakSeferNo").value = ucus.sefer_no || "";
    document.getElementById("ucakPNR").value = ucus.pnr_kodu || "";
    document.getElementById("ucakKalkis").value = ucus.kalkis_yeri || "";
    document.getElementById("ucakVaris").value = ucus.varis_yeri || "";
    document.getElementById("ucakKalkisTarih").value = ucus.kalkis_tarihi || "";
    document.getElementById("ucakKalkisSaat").value = ucus.kalkis_saati || "";
    document.getElementById("ucakVarisTarih").value = ucus.varis_tarihi || "";
    document.getElementById("ucakVarisSaat").value = ucus.varis_saati || "";
    document.getElementById("ucakAktarma").value = ucus.aktarma_var ? "1" : "0";
    document.getElementById("ucakAktarmaBilgi").value =
      ucus.aktarma_bilgisi || "";
    document.getElementById("ucakUcret").value = ucus.ucret || "";
    document.getElementById("ucakNotlar").value = ucus.notlar || "";

    // Aktarma alanını göster/gizle
    document.getElementById("ucakAktarmaBilgiGroup").style.display =
      ucus.aktarma_var ? "block" : "none";

    // Modal başlığını değiştir
    document.getElementById("ucakModalTitle").textContent = "Uçuş Düzenle";

    // Modalı aç
    document.getElementById("ucakEkleModal").style.display = "flex";

    Bildirim.goster("info", "Uçuş bilgileri yüklendi");
    console.log("✅ Uçuş düzenleme formu dolduruldu");
  } catch (error) {
    console.error("❌ Uçuş düzenleme hatası:", error);
    Bildirim.goster("error", "Uçuş yüklenirken hata oluştu!");
  }
}

// ==========================================
// KONAKLAMA YÖNETİMİ - GLOBAL DEĞİŞKENLER
// ==========================================

let currentKonaklamaId = null;
let tempOdalar = [];
let yerlesimData = {};

// ==========================================
// KONAKLAMA BİLGİLERİNİ YÜKLE
// ==========================================

async function loadKonaklamaBilgileri(geziId) {
  try {
    console.log("🔄 Konaklama bilgileri yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      `SELECT k.*, 
        COUNT(DISTINCT o.id) as oda_sayisi,
        COUNT(DISTINCT y.id) as yerlesik_sayisi
       FROM gezi_konaklama k
       LEFT JOIN gezi_konaklama_odalar o ON k.id = o.konaklama_id
       LEFT JOIN gezi_konaklama_yerlesim y ON o.id = y.oda_id
       WHERE k.gezi_id = ?
       GROUP BY k.id
       ORDER BY k.giris_tarihi DESC`,
      [geziId]
    );

    const container = document.getElementById("konaklamaListesi");

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML =
        '<div class="empty-state-small"><p>Henüz konaklama bilgisi eklenmedi</p></div>';
      return;
    }

    container.innerHTML = result.data
      .map((konaklama) => renderKonaklamaCard(konaklama))
      .join("");

    console.log(`✅ ${result.data.length} konaklama bilgisi yüklendi`);
  } catch (error) {
    console.error("❌ Konaklama yükleme hatası:", error);
  }
}

// ==========================================
// KONAKLAMA KARTI RENDER
// ==========================================

function renderKonaklamaCard(konaklama) {
  return `
    <div class="konaklama-card">
      <div class="konaklama-card-header">
        <div class="konaklama-card-title">
          <div class="konaklama-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="konaklama-title-text">
            <h4>${konaklama.otel_adi}</h4>
            <p>${konaklama.otel_adresi || "Adres belirtilmemiş"}</p>
          </div>
        </div>
        <div class="konaklama-actions">
          <button class="btn-modern btn-sm btn-primary" onclick="odaYerlesimAc(${
            konaklama.id
          })" title="Oda Yerleşimi">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </button>
          <button class="btn-modern btn-sm btn-danger" onclick="konaklamaSil(${
            konaklama.id
          })" title="Konaklama Sil">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="konaklama-card-body">
        <div class="konaklama-info-item">
          <div class="konaklama-info-label">📅 Giriş Tarihi</div>
          <div class="konaklama-info-value">${formatDate(
            konaklama.giris_tarihi
          )}</div>
        </div>
        <div class="konaklama-info-item">
          <div class="konaklama-info-label">📅 Çıkış Tarihi</div>
          <div class="konaklama-info-value">${formatDate(
            konaklama.cikis_tarihi
          )}</div>
        </div>
        <div class="konaklama-info-item">
          <div class="konaklama-info-label">🏠 Oda Sayısı</div>
          <div class="konaklama-info-value">${konaklama.oda_sayisi} Oda</div>
        </div>
        <div class="konaklama-info-item">
          <div class="konaklama-info-label">📞 Telefon</div>
          <div class="konaklama-info-value">${
            konaklama.otel_telefon || "-"
          }</div>
        </div>
        <div class="konaklama-info-item">
          <div class="konaklama-info-label">📧 E-posta</div>
          <div class="konaklama-info-value">${konaklama.otel_email || "-"}</div>
        </div>
        <div class="konaklama-info-item">
          <div class="konaklama-info-label">👥 Yerleşen Kişi</div>
          <div class="konaklama-info-value">${
            konaklama.yerlesik_sayisi
          } Kişi</div>
        </div>
      </div>

      ${
        konaklama.notlar
          ? `
        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; margin-top: 12px;">
          <strong style="color: #6b7280; font-size: 13px;">📝 Notlar:</strong>
          <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 14px;">${konaklama.notlar}</p>
        </div>
      `
          : ""
      }
    </div>
  `;
}

// ==========================================
// KONAKLAMA SİL
// ==========================================

async function konaklamaSil(konaklamaId) {
  const confirmed = confirm(
    "⚠️ Bu konaklama bilgisini silmek istediğinize emin misiniz?\n\nTüm oda ve yerleşim bilgileri silinecektir!"
  );

  if (!confirmed) return;

  try {
    console.log("🗑️ Konaklama siliniyor, ID:", konaklamaId);

    await window.electronAPI.dbQuery(
      "DELETE FROM gezi_konaklama WHERE id = ?",
      [konaklamaId]
    );

    Bildirim.goster("success", "Konaklama bilgisi silindi!");
    await loadKonaklamaBilgileri(currentGeziIdForUlasim);
  } catch (error) {
    console.error("❌ Konaklama silme hatası:", error);
    Bildirim.goster("error", "Konaklama silinirken hata oluştu!");
  }
}

// ==========================================
// KONAKLAMA MODAL AÇ
// ==========================================

function openKonaklamaEkleModal() {
  currentKonaklamaId = null;
  tempOdalar = [];
  clearKonaklamaForm();
  document.getElementById("konaklamaModalTitle").textContent =
    "Konaklama Bilgisi Ekle";
  document.getElementById("konaklamaEkleModal").style.display = "flex";
}

function closeKonaklamaModal() {
  document.getElementById("konaklamaEkleModal").style.display = "none";
  currentKonaklamaId = null;
  tempOdalar = [];
}

function clearKonaklamaForm() {
  document.getElementById("otelAdi").value = "";
  document.getElementById("otelTelefon").value = "";
  document.getElementById("otelAdres").value = "";
  document.getElementById("otelEmail").value = "";
  document.getElementById("konaklamaGirisTarih").value = "";
  document.getElementById("konaklamaCikisTarih").value = ""; // ✅ DÜZELTİLDİ
  document.getElementById("konaklamaNotlar").value = "";
  document.getElementById("odaNo").value = "";
  document.getElementById("odaTipi").value = "tek";
  document.getElementById("odalarListesi").innerHTML =
    '<div class="empty-state-small"><p>Henüz oda eklenmedi</p></div>';
}

// ==========================================
// ODA EKLEME
// ==========================================

function odaEkle() {
  const odaNo = document.getElementById("odaNo").value.trim();
  const odaTipi = document.getElementById("odaTipi").value;

  if (!odaNo) {
    Bildirim.goster("warning", "Oda numarası giriniz!");
    return;
  }

  if (tempOdalar.some((o) => o.oda_no === odaNo)) {
    Bildirim.goster("warning", "Bu oda numarası zaten ekli!");
    return;
  }

  const kapasite =
    odaTipi === "tek" ? 1 : odaTipi === "cift" ? 2 : odaTipi === "uc" ? 3 : 4;

  const oda = {
    id: Date.now(),
    oda_no: odaNo,
    oda_tipi: odaTipi,
    kapasite: kapasite,
  };

  tempOdalar.push(oda);
  renderOdalar();

  document.getElementById("odaNo").value = "";
  document.getElementById("odaTipi").value = "tek";

  Bildirim.goster("success", `Oda ${odaNo} eklendi!`);
}

function renderOdalar() {
  const container = document.getElementById("odalarListesi");

  if (tempOdalar.length === 0) {
    container.innerHTML =
      '<div class="empty-state-small"><p>Henüz oda eklenmedi</p></div>';
    return;
  }

  container.innerHTML = tempOdalar
    .map(
      (oda) => `
    <div class="oda-item">
      <div class="oda-item-header">
        <div class="oda-no">${oda.oda_no}</div>
        <button class="oda-remove-btn" onclick="odaCikar(${oda.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="oda-tipi-badge">${getOdaTipiText(oda.oda_tipi)}</div>
      <div class="oda-kapasite">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
        ${oda.kapasite} Kişi
      </div>
    </div>
  `
    )
    .join("");
}

function odaCikar(odaId) {
  tempOdalar = tempOdalar.filter((o) => o.id !== odaId);
  renderOdalar();
  Bildirim.goster("info", "Oda kaldırıldı");
}

function getOdaTipiText(tip) {
  const tipler = {
    tek: "Tek Kişilik",
    cift: "Çift Kişilik",
    uc: "Üç Kişilik",
    dort: "Dört Kişilik",
  };
  return tipler[tip] || tip;
}

// ==========================================
// KONAKLAMA KAYDET (DEBUG MODU)
// ==========================================

async function konaklamaKaydet() {
  try {
    console.log(
      "%c🏨 KONAKLAMA KAYIT SÜRECİ BAŞLADI",
      "background: #222; color: #bada55; font-size: 14px; padding: 5px;"
    );

    // 1. Veri Toplama ve Kontrol
    const otelAdi = document.getElementById("otelAdi").value.trim();
    const girisTarih = document.getElementById("konaklamaGirisTarih").value;
    const cikisTarih = document.getElementById("konaklamaCikisTarih").value;

    console.log("🔍 [1/6] Form Verileri:", {
      currentGeziId: currentGeziIdForUlasim,
      otelAdi,
      girisTarih,
      cikisTarih,
      odaSayisi: tempOdalar.length,
    });

    if (!otelAdi) {
      console.warn("⚠️ Durduruldu: Otel adı eksik");
      Bildirim.goster("warning", "Otel adı zorunludur!");
      return;
    }

    if (!girisTarih || !cikisTarih) {
      console.warn("⚠️ Durduruldu: Tarihler eksik");
      Bildirim.goster("warning", "Giriş ve çıkış tarihleri zorunludur!");
      return;
    }

    if (tempOdalar.length === 0) {
      console.warn("⚠️ Durduruldu: tempOdalar dizisi boş!");
      Bildirim.goster("warning", "En az 1 oda eklenmelidir!");
      return;
    }

    const konaklamaData = {
      otel_adi: otelAdi,
      otel_adresi: document.getElementById("otelAdres").value.trim() || null,
      otel_telefon: document.getElementById("otelTelefon").value.trim() || null,
      otel_email: document.getElementById("otelEmail").value.trim() || null,
      giris_tarihi: girisTarih,
      cikis_tarihi: cikisTarih,
      notlar: document.getElementById("konaklamaNotlar").value.trim() || null,
    };

    // 2. Ana Tabloya Kayıt (gezi_konaklama)
    console.log("🚀 [2/6] Veritabanına ana kayıt gönderiliyor...");
    const result = await window.electronAPI.dbQuery(
      `INSERT INTO gezi_konaklama 
        (gezi_id, otel_adi, otel_adresi, otel_telefon, otel_email, giris_tarihi, cikis_tarihi, notlar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentGeziIdForUlasim,
        konaklamaData.otel_adi,
        konaklamaData.otel_adresi,
        konaklamaData.otel_telefon,
        konaklamaData.otel_email,
        konaklamaData.giris_tarihi,
        konaklamaData.cikis_tarihi,
        konaklamaData.notlar,
      ]
    );

    console.log("📡 [3/6] Ana Kayıt DB Cevabı:", result);

    if (!result.success) {
      console.error("❌ Veritabanı Hatası (Ana Kayıt):", result.error);
      throw new Error("Konaklama ana kaydı yapılamadı: " + result.error);
    }

    // 3. Eklenen ID'yi Al
    console.log("🆔 [4/6] Son eklenen ID talep ediliyor...");
    const konaklamaIdResult = await window.electronAPI.dbQuery(
      "SELECT last_insert_rowid() as id"
    );

    console.log("📡 ID Sorgu Cevabı:", konaklamaIdResult);

    if (!konaklamaIdResult.success || !konaklamaIdResult.data[0].id) {
      throw new Error("Eklenen konaklama ID'si alınamadı!");
    }

    const konaklamaId = konaklamaIdResult.data[0].id;
    console.log("✅ Alınan Konaklama ID:", konaklamaId);

    // 4. Odaları Kaydet (Döngü)
    console.log(
      `📦 [5/6] ${tempOdalar.length} adet oda için döngü başlatılıyor...`
    );

    for (const [index, oda] of tempOdalar.entries()) {
      console.log(
        `➡️ Oda Kaydediliyor (${index + 1}/${tempOdalar.length}):`,
        oda.oda_no
      );

      const odaResult = await window.electronAPI.dbQuery(
        `INSERT INTO gezi_konaklama_odalar (konaklama_id, oda_no, oda_tipi, kapasite)
          VALUES (?, ?, ?, ?)`,
        [konaklamaId, oda.oda_no, oda.oda_tipi, oda.kapasite]
      );

      if (!odaResult.success) {
        console.error(
          `❌ Oda ${oda.oda_no} kaydedilirken hata:`,
          odaResult.error
        );
        // Bir oda bile başarısız olursa bilmek isteriz
      } else {
        console.log(`✅ Oda ${oda.oda_no} başarıyla kaydedildi.`);
      }
    }

    // 5. İşlemi Bitir
    console.log("🏁 [6/6] Tüm işlemler tamamlandı. Arayüz güncelleniyor...");

    Bildirim.goster("success", "🏨 Konaklama başarıyla kaydedildi!");

    closeKonaklamaModal();

    if (typeof loadKonaklamaBilgileri === "function") {
      await loadKonaklamaBilgileri(currentGeziIdForUlasim);
    } else {
      console.warn(
        "⚠️ loadKonaklamaBilgileri fonksiyonu bulunamadı, liste yenilenemedi."
      );
    }
  } catch (error) {
    console.error("❌ KRİTİK HATA (konaklamaKaydet):", error);
    Bildirim.goster(
      "error",
      "Konaklama kaydedilirken hata oluştu: " + error.message
    );
  }
}
// ==========================================
// ODA YERLEŞİM SİSTEMİ - VERİTABANI UYUMLU TAM KOD
// ==========================================

async function odaYerlesimAc(konaklamaId) {
  try {
    console.log(
      "%c🏠 Oda yerleşimi süreci başladı...",
      "color: #007bff; font-weight: bold;"
    );

    currentKonaklamaId = konaklamaId;
    yerlesimData = {};

    const konaklamaResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_konaklama WHERE id = ?",
      [konaklamaId]
    );

    if (!konaklamaResult.success || !konaklamaResult.data.length) {
      Bildirim.goster("error", "Konaklama bilgisi bulunamadı!");
      return;
    }

    const konaklama = konaklamaResult.data[0];
    const modalTitle = document.getElementById("odaYerlesimTitle");
    if (modalTitle)
      modalTitle.textContent = `Oda Yerleşimi - ${konaklama.otel_adi}`;

    const odalarResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_konaklama_odalar WHERE konaklama_id = ? ORDER BY oda_no",
      [konaklamaId]
    );

    const odalar = odalarResult.data || [];

    for (const oda of odalar) {
      const yerlesimResult = await window.electronAPI.dbQuery(
        "SELECT * FROM gezi_konaklama_yerlesim WHERE oda_id = ?",
        [oda.id]
      );
      yerlesimData[oda.id] = yerlesimResult.data || [];
    }

    await loadGeziKatilimcilari(konaklama.gezi_id);
    renderOdalarYerlesim(odalar);

    const modalElement = document.getElementById("odaYerlesimModal");
    if (modalElement) modalElement.style.display = "flex";
  } catch (error) {
    console.error("❌ Oda yerleşim açma hatası:", error);
  }
}

function closeOdaYerlesimModal() {
  const modalElement = document.getElementById("odaYerlesimModal");
  if (modalElement) modalElement.style.display = "none";
  currentKonaklamaId = null;
  yerlesimData = {};
}

async function loadGeziKatilimcilari(geziId) {
  try {
    const yerlesmemisListesi = [];

    // 1. KAFİLE BAŞKANI (Sütun adını netleştirerek çekiyoruz)
    const baskanSorgu = await window.electronAPI.dbQuery(
      `SELECT o.id, o.tc_no, o.ad_soyad, o.dogum_tarihi 
             FROM geziler g
             INNER JOIN ogretmenler o ON g.kafile_baskani_id = o.id
             WHERE g.id = ?`,
      [geziId]
    );

    if (baskanSorgu.success && baskanSorgu.data.length > 0) {
      const baskan = baskanSorgu.data[0];
      const yerlestiMi = Object.values(yerlesimData)
        .flat()
        .some((k) => k.kisi_tipi === "baskan" && k.kisi_id === baskan.id);

      if (!yerlestiMi) {
        yerlesmemisListesi.push({
          id: baskan.id,
          tc_no: baskan.tc_no,
          ad_soyad: baskan.ad_soyad,
          dogum_tarihi: baskan.dogum_tarihi, // DB'deki isimle birebir
          kisi_tipi: "baskan",
        });
      }
    }

    // 2. ÖĞRETMENLER
    const ogretmenlerResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.tc_no, o.ad_soyad, o.dogum_tarihi 
             FROM gezi_ogretmenler go 
             INNER JOIN ogretmenler o ON go.ogretmen_id = o.id 
             WHERE go.gezi_id = ?`,
      [geziId]
    );

    if (ogretmenlerResult.success) {
      ogretmenlerResult.data.forEach((ogr) => {
        const baskanMi = yerlesmemisListesi.some(
          (b) => b.id === ogr.id && b.kisi_tipi === "baskan"
        );
        const yerlestiMi = Object.values(yerlesimData)
          .flat()
          .some((k) => k.kisi_tipi === "ogretmen" && k.kisi_id === ogr.id);

        if (!yerlestiMi && !baskanMi) {
          yerlesmemisListesi.push({
            id: ogr.id,
            tc_no: ogr.tc_no,
            ad_soyad: ogr.ad_soyad,
            dogum_tarihi: ogr.dogum_tarihi,
            kisi_tipi: "ogretmen",
          });
        }
      });
    }

    // 3. ÖĞRENCİLER (Öğrencilerde sütun adı 'dogum_tarihi' mi kontrol edin, değilse güncelleyin)
    const ogrencilerResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.tc_no, o.ad_soyad, o.dogum_tarihi 
             FROM gezi_ogrenciler go 
             INNER JOIN ogrenciler o ON go.ogrenci_id = o.id 
             WHERE go.gezi_id = ?`,
      [geziId]
    );

    if (ogrencilerResult.success) {
      ogrencilerResult.data.forEach((ogr) => {
        const yerlestiMi = Object.values(yerlesimData)
          .flat()
          .some((k) => k.kisi_tipi === "ogrenci" && k.kisi_id === ogr.id);
        if (!yerlestiMi) {
          yerlesmemisListesi.push({
            id: ogr.id,
            tc_no: ogr.tc_no,
            ad_soyad: ogr.ad_soyad,
            dogum_tarihi: ogr.dogum_tarihi,
            kisi_tipi: "ogrenci",
          });
        }
      });
    }

    renderYerlesmemisKisiler(yerlesmemisListesi);
  } catch (error) {
    console.error("❌ Katılımcı yükleme hatası:", error);
  }
}

function renderYerlesmemisKisiler(kisiler) {
  const container = document.getElementById("yerlesmemisListesi");
  const countEl = document.getElementById("yerlesmemisCount");
  if (countEl) countEl.textContent = kisiler.length;
  if (!container) return;

  if (kisiler.length === 0) {
    container.innerHTML =
      '<div class="empty-state-small"><p>✅ Tüm kişiler yerleştirildi!</p></div>';
    return;
  }

  container.innerHTML = kisiler
    .map((kisi) => {
      // --- TARİH GÖSTERİMİ KRİTİK ALAN ---
      let dGoster = "Girilmemiş";

      // Eğer veritabanından veri geliyorsa (null değilse ve boş string değilse)
      if (
        kisi.dogum_tarihi &&
        String(kisi.dogum_tarihi).trim() !== "" &&
        String(kisi.dogum_tarihi) !== "null"
      ) {
        // Eğer format uygun değilse bile ham veriyi (YYYY-MM-DD) göster
        dGoster =
          typeof formatDate === "function"
            ? formatDate(kisi.dogum_tarihi)
            : kisi.dogum_tarihi;
      }

      const etiket =
        kisi.kisi_tipi === "baskan"
          ? "Kafile Bşk."
          : kisi.kisi_tipi === "ogretmen"
          ? "Öğretmen"
          : "Öğrenci";

      return `
            <div class="kisi-item" draggable="true" 
                 data-kisi-id="${kisi.id}" 
                 data-kisi-tipi="${kisi.kisi_tipi}"
                 data-tc="${kisi.tc_no}"
                 data-ad="${kisi.ad_soyad}"
                 data-dogum="${kisi.dogum_tarihi || ""}"
                 ondragstart="handleDragStart(event)">
                <div class="kisi-avatar ${kisi.kisi_tipi}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>
                <div class="kisi-info">
                    <div class="kisi-name">${kisi.ad_soyad}</div>
                    <div class="kisi-details">TC: ${
                      kisi.tc_no
                    } | <b>Doğum: ${dGoster}</b></div>
                </div>
                <span class="kisi-type-badge ${kisi.kisi_tipi}">${etiket}</span>
            </div>
        `;
    })
    .join("");
}

function renderOdalarYerlesim(odalar) {
  const container = document.getElementById("odalarYerlesimListesi");
  if (!container) return;

  container.innerHTML = odalar
    .map((oda) => {
      const kisiler = yerlesimData[oda.id] || [];
      const doluMu = kisiler.length >= oda.kapasite;
      const durumClass =
        kisiler.length === 0 ? "oda-bos" : doluMu ? "oda-full" : "oda-eksik";

      return `
            <div class="oda-yerlesim-item ${durumClass}" 
                 data-oda-id="${oda.id}" 
                 data-kapasite="${oda.kapasite}"
                 ondrop="handleDrop(event)" 
                 ondragover="handleDragOver(event)"
                 ondragleave="handleDragLeave(event)">
                <div class="oda-yerlesim-header">
                    <div class="oda-yerlesim-title">
                        <div class="oda-yerlesim-no">Oda ${oda.oda_no}</div>
                        <div class="oda-yerlesim-tipi">${
                          typeof getOdaTipiText === "function"
                            ? getOdaTipiText(oda.oda_tipi)
                            : oda.oda_tipi
                        }</div>
                    </div>
                    <div class="oda-yerlesim-kapasite ${
                      kisiler.length === oda.kapasite ? "full" : "warning"
                    }">
                        ${kisiler.length} / ${oda.kapasite}
                    </div>
                </div>
                <div class="oda-yerlesim-kisiler">
                    ${
                      kisiler.length === 0
                        ? '<div class="oda-empty-text">Boş Oda</div>'
                        : kisiler
                            .map(
                              (kisi) => `
                        <div class="yerlesim-kisi-item">
                            <div class="yerlesim-kisi-info">
                                <div class="kisi-avatar ${kisi.kisi_tipi}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div>
                                    <div class="yerlesim-kisi-name">${kisi.ad_soyad}</div>
                                </div>
                            </div>
                            <button class="btn-kisi-cikar" onclick="kisiOdadanCikar(${oda.id}, '${kisi.kisi_tipi}', ${kisi.kisi_id})">×</button>
                        </div>
                    `
                            )
                            .join("")
                    }
                </div>
            </div>
        `;
    })
    .join("");
}

// ==========================================
// DRAG & DROP
// ==========================================

let draggedKisi = null;

function handleDragStart(e) {
  draggedKisi = {
    kisi_id: parseInt(e.target.dataset.kisiId),
    kisi_tipi: e.target.dataset.kisiTipi,
    tc_no: e.target.dataset.tc,
    ad_soyad: e.target.dataset.ad,
    dogum_tarihi: e.target.dataset.dogum,
  };
  e.target.classList.add("dragging");
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drop-zone");
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("drop-zone");
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drop-zone");

  if (!draggedKisi) return;

  const odaElement = e.currentTarget;
  const odaId = parseInt(odaElement.dataset.odaId);
  const kapasite = parseInt(odaElement.dataset.kapasite);

  const mevcutKisiler = yerlesimData[odaId] || [];
  if (mevcutKisiler.length >= kapasite) {
    Bildirim.goster("warning", "⚠️ Bu oda dolu!");
    draggedKisi = null;
    return;
  }

  if (!yerlesimData[odaId]) {
    yerlesimData[odaId] = [];
  }

  yerlesimData[odaId].push(draggedKisi);

  Bildirim.goster("success", `✅ ${draggedKisi.ad_soyad} odaya yerleştirildi`);

  const konaklamaResult = await window.electronAPI.dbQuery(
    "SELECT gezi_id FROM gezi_konaklama WHERE id = ?",
    [currentKonaklamaId]
  );

  if (konaklamaResult.success) {
    await loadGeziKatilimcilari(konaklamaResult.data[0].gezi_id);

    const odalarResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_konaklama_odalar WHERE konaklama_id = ? ORDER BY oda_no",
      [currentKonaklamaId]
    );

    renderOdalarYerlesim(odalarResult.data || []);
  }

  draggedKisi = null;
}

async function kisiOdadanCikar(odaId, kisiTipi, kisiId) {
  if (!yerlesimData[odaId]) return;

  yerlesimData[odaId] = yerlesimData[odaId].filter(
    (k) => !(k.kisi_tipi === kisiTipi && k.kisi_id === kisiId)
  );

  Bildirim.goster("info", "Kişi odadan çıkarıldı");

  const konaklamaResult = await window.electronAPI.dbQuery(
    "SELECT gezi_id FROM gezi_konaklama WHERE id = ?",
    [currentKonaklamaId]
  );

  if (konaklamaResult.success) {
    await loadGeziKatilimcilari(konaklamaResult.data[0].gezi_id);

    const odalarResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_konaklama_odalar WHERE konaklama_id = ? ORDER BY oda_no",
      [currentKonaklamaId]
    );

    renderOdalarYerlesim(odalarResult.data || []);
  }
}

async function yerlesimKaydet() {
  try {
    console.log("💾 Yerleşim kaydediliyor...");

    await window.electronAPI.dbQuery(
      `DELETE FROM gezi_konaklama_yerlesim 
       WHERE oda_id IN (
         SELECT id FROM gezi_konaklama_odalar WHERE konaklama_id = ?
       )`,
      [currentKonaklamaId]
    );

    let toplamKayit = 0;
    for (const [odaId, kisiler] of Object.entries(yerlesimData)) {
      for (const kisi of kisiler) {
        await window.electronAPI.dbQuery(
          `INSERT INTO gezi_konaklama_yerlesim 
            (oda_id, kisi_tipi, kisi_id, tc_no, ad_soyad, dogum_tarihi)
            VALUES (?, ?, ?, ?, ?, ?)`,
          [
            parseInt(odaId),
            kisi.kisi_tipi,
            kisi.kisi_id,
            kisi.tc_no,
            kisi.ad_soyad,
            kisi.dogum_tarihi || null,
          ]
        );
        toplamKayit++;
      }
    }

    Bildirim.goster("success", `✅ ${toplamKayit} kişi yerleşimi kaydedildi!`);
    closeOdaYerlesimModal();
    await loadKonaklamaBilgileri(currentGeziIdForUlasim);
  } catch (error) {
    console.error("❌ Yerleşim kaydetme hatası:", error);
    Bildirim.goster("error", "Yerleşim kaydedilirken hata oluştu!");
  }
}
// ==========================================
// FİRMA YÖNETİMİ
// ==========================================

let currentFirmaGeziId = null;

// ==========================================
// FİRMA MODAL AÇ
// ==========================================

async function geziFirma(geziId) {
  try {
    console.log("🏢 Firma yönetimi açılıyor, Gezi ID:", geziId);
    currentFirmaGeziId = geziId;

    // Gezi bilgilerini çek
    const geziResult = await window.electronAPI.dbQuery(
      "SELECT gezi_adi FROM geziler WHERE id = ?",
      [geziId]
    );

    if (
      !geziResult.success ||
      !geziResult.data ||
      geziResult.data.length === 0
    ) {
      Bildirim.goster("error", "Gezi bulunamadı!");
      return;
    }

    const gezi = geziResult.data[0];
    document.getElementById(
      "firmaModalTitle"
    ).textContent = `${gezi.gezi_adi} - Tur Firması`;

    // Firma bilgilerini yükle (bu zaten formu dolduracak)
    await loadFirmaBilgileri(geziId);

    // Modalı aç
    document.getElementById("firmaModal").style.display = "flex";

    console.log("✅ Firma modal açıldı");
  } catch (error) {
    console.error("❌ Firma modal açma hatası:", error);
    Bildirim.goster("error", "Firma yönetimi açılırken hata oluştu!");
  }
}

function closeFirmaModal() {
  document.getElementById("firmaModal").style.display = "none";
  currentFirmaGeziId = null;
}

// ==========================================
// FİRMA BİLGİLERİNİ YÜKLE
// ==========================================

async function loadFirmaBilgileri(geziId) {
  try {
    console.log("🔄 Firma bilgileri yükleniyor, Gezi ID:", geziId);

    const result = await window.electronAPI.firmaGetir(geziId);

    console.log("📊 Firma Getir Sonucu:", result);

    if (!result.success) {
      console.error("❌ Firma getirme başarısız:", result.message);
      return;
    }

    if (!result.data || result.data.length === 0) {
      console.log("ℹ️ Bu gezi için firma kaydı yok");
      return;
    }

    const firma = result.data[0];
    console.log("🏢 Firma Detayı:", firma);

    // Form alanlarını doldur
    if (document.getElementById("firmaAdi")) {
      document.getElementById("firmaAdi").value = firma.firma_adi || "";
    }
    if (document.getElementById("firmaIsletmeBelge")) {
      document.getElementById("firmaIsletmeBelge").value =
        firma.isletme_belge_no || "";
    }
    if (document.getElementById("firmaTursabNo")) {
      document.getElementById("firmaTursabNo").value = firma.tursab_no || "";
    }
    if (document.getElementById("firmaVergiDaire")) {
      document.getElementById("firmaVergiDaire").value =
        firma.vergi_dairesi || "";
    }
    if (document.getElementById("firmaVergiNo")) {
      document.getElementById("firmaVergiNo").value = firma.vergi_no || "";
    }
    if (document.getElementById("firmaYetkiBelge")) {
      document.getElementById("firmaYetkiBelge").value =
        firma.yetki_belgesi || "";
    }
    if (document.getElementById("firmaYetkili")) {
      document.getElementById("firmaYetkili").value =
        firma.yetkili_ad_soyad || "";
    }
    if (document.getElementById("firmaYetkiliUnvan")) {
      document.getElementById("firmaYetkiliUnvan").value =
        firma.yetkili_unvan || "";
    }
    if (document.getElementById("firmaYetkiliTel")) {
      document.getElementById("firmaYetkiliTel").value =
        firma.yetkili_telefon || "";
    }
    if (document.getElementById("firmaTelefon")) {
      document.getElementById("firmaTelefon").value = firma.firma_telefon || "";
    }
    if (document.getElementById("firmaAdres")) {
      document.getElementById("firmaAdres").value = firma.firma_adres || "";
    }
    if (document.getElementById("firmaEmail")) {
      document.getElementById("firmaEmail").value = firma.firma_email || "";
    }
    if (document.getElementById("rehberAd")) {
      document.getElementById("rehberAd").value = firma.rehber_ad || "";
    }
    if (document.getElementById("rehberKokart")) {
      document.getElementById("rehberKokart").value = firma.rehber_kokart || "";
    }
    if (document.getElementById("sozlesmeTarih")) {
      document.getElementById("sozlesmeTarih").value =
        firma.sozlesme_tarihi || "";
    }
    if (document.getElementById("toplamBedel")) {
      document.getElementById("toplamBedel").value = firma.toplam_bedel || "";
    }
    if (document.getElementById("paraBirimi")) {
      document.getElementById("paraBirimi").value = firma.para_birimi || "TL";
    }
    if (document.getElementById("dahilOlmayan")) {
      document.getElementById("dahilOlmayan").value = firma.dahil_olmayan || "";
    }
    if (document.getElementById("iptalKosul")) {
      document.getElementById("iptalKosul").value = firma.iptal_kosul || "";
    }
    if (document.getElementById("firmaNotlar")) {
      document.getElementById("firmaNotlar").value = firma.notlar || "";
    }

    // Dahil hizmetleri işaretle
    if (firma.dahil_hizmetler) {
      const hizmetler = firma.dahil_hizmetler.split(", ");

      if (document.getElementById("hizmet_rehber")) {
        document.getElementById("hizmet_rehber").checked = hizmetler.includes(
          "Kokartlı Profesyonel Rehberlik"
        );
      }
      if (document.getElementById("hizmet_muze")) {
        document.getElementById("hizmet_muze").checked = hizmetler.includes(
          "Müze ve Ören Yeri Girişleri"
        );
      }
      if (document.getElementById("hizmet_kahvalti")) {
        document.getElementById("hizmet_kahvalti").checked =
          hizmetler.includes("Sabah Kahvaltısı");
      }
      if (document.getElementById("hizmet_ogle")) {
        document.getElementById("hizmet_ogle").checked =
          hizmetler.includes("Öğle Yemeği");
      }
      if (document.getElementById("hizmet_aksam")) {
        document.getElementById("hizmet_aksam").checked =
          hizmetler.includes("Akşam Yemeği");
      }
      if (document.getElementById("hizmet_konaklama_oda")) {
        document.getElementById("hizmet_konaklama_oda").checked =
          hizmetler.includes("Konaklama (Oda Kahvaltı)");
      }
      if (document.getElementById("hizmet_konaklama_yarim")) {
        document.getElementById("hizmet_konaklama_yarim").checked =
          hizmetler.includes("Konaklama (Yarım Pansiyon)");
      }
      if (document.getElementById("hizmet_konaklama_tam")) {
        document.getElementById("hizmet_konaklama_tam").checked =
          hizmetler.includes("Konaklama (Tam Pansiyon)");
      }
      if (document.getElementById("hizmet_sigorta")) {
        document.getElementById("hizmet_sigorta").checked = hizmetler.includes(
          "Zorunlu Seyahat Sigortası"
        );
      }
      if (document.getElementById("hizmet_yurtdisi_sigorta")) {
        document.getElementById("hizmet_yurtdisi_sigorta").checked =
          hizmetler.includes("Yurt Dışı Sağlık Sigortası");
      }
    }

    console.log("✅ Firma bilgileri form alanlarına dolduruldu");
  } catch (error) {
    console.error("❌ Firma bilgileri yükleme hatası:", error);
    Bildirim.goster("error", "Firma bilgileri yüklenirken hata oluştu!");
  }
}
// ==========================================
// FİRMA KAYDET
// ==========================================

async function firmaKaydet() {
  try {
    console.log("🏢 Firma kaydediliyor...");

    // Validasyon
    const firmaAdi = document.getElementById("firmaAdi").value.trim();
    const firmaYetkili = document.getElementById("firmaYetkili").value.trim();
    const firmaYetkiliTel = document
      .getElementById("firmaYetkiliTel")
      .value.trim();
    const toplamBedel = document.getElementById("toplamBedel").value;

    if (!firmaAdi) {
      Bildirim.goster("warning", "Firma adı zorunludur!");
      return;
    }

    if (!firmaYetkili || !firmaYetkiliTel) {
      Bildirim.goster("warning", "Yetkili ad-soyad ve telefon zorunludur!");
      return;
    }

    if (!toplamBedel) {
      Bildirim.goster("warning", "Toplam bedel zorunludur!");
      return;
    }

    // Hizmetleri topla
    const hizmetler = [];
    if (document.getElementById("hizmet_rehber").checked)
      hizmetler.push("Kokartlı Profesyonel Rehberlik");
    if (document.getElementById("hizmet_muze").checked)
      hizmetler.push("Müze ve Ören Yeri Girişleri");
    if (document.getElementById("hizmet_kahvalti").checked)
      hizmetler.push("Sabah Kahvaltısı");
    if (document.getElementById("hizmet_ogle").checked)
      hizmetler.push("Öğle Yemeği");
    if (document.getElementById("hizmet_aksam").checked)
      hizmetler.push("Akşam Yemeği");
    if (document.getElementById("hizmet_konaklama_oda").checked)
      hizmetler.push("Konaklama (Oda Kahvaltı)");
    if (document.getElementById("hizmet_konaklama_yarim").checked)
      hizmetler.push("Konaklama (Yarım Pansiyon)");
    if (document.getElementById("hizmet_konaklama_tam").checked)
      hizmetler.push("Konaklama (Tam Pansiyon)");
    if (document.getElementById("hizmet_sigorta").checked)
      hizmetler.push("Zorunlu Seyahat Sigortası");
    if (document.getElementById("hizmet_yurtdisi_sigorta").checked)
      hizmetler.push("Yurt Dışı Sağlık Sigortası");

    const firmaData = {
      firma_adi: firmaAdi,
      isletme_belge_no:
        document.getElementById("firmaIsletmeBelge").value.trim() || null,
      tursab_no: document.getElementById("firmaTursabNo").value.trim() || null,
      vergi_dairesi:
        document.getElementById("firmaVergiDaire").value.trim() || null,
      vergi_no: document.getElementById("firmaVergiNo").value.trim() || null,
      yetki_belgesi:
        document.getElementById("firmaYetkiBelge").value.trim() || null,
      yetkili_ad_soyad: firmaYetkili,
      yetkili_unvan:
        document.getElementById("firmaYetkiliUnvan").value.trim() || null,
      yetkili_telefon: firmaYetkiliTel,
      firma_telefon:
        document.getElementById("firmaTelefon").value.trim() || null,
      firma_adres: document.getElementById("firmaAdres").value.trim() || null,
      firma_email: document.getElementById("firmaEmail").value.trim() || null,
      rehber_ad: document.getElementById("rehberAd").value.trim() || null,
      rehber_kokart:
        document.getElementById("rehberKokart").value.trim() || null,
      sozlesme_tarihi: document.getElementById("sozlesmeTarih").value || null,
      toplam_bedel: parseFloat(toplamBedel),
      para_birimi: document.getElementById("paraBirimi").value,
      dahil_hizmetler: hizmetler.join(", "),
      dahil_olmayan:
        document.getElementById("dahilOlmayan").value.trim() || null,
      iptal_kosul: document.getElementById("iptalKosul").value.trim() || null,
      notlar: document.getElementById("firmaNotlar").value.trim() || null,
    };

    console.log("📊 Firma Data:", firmaData);

    // Backend'e gönder
    const result = await window.electronAPI.firmaKaydet(
      currentFirmaGeziId,
      firmaData
    );

    if (result.success) {
      Bildirim.goster("success", "✅ Firma bilgileri başarıyla kaydedildi!");
      closeFirmaModal();
      await loadFirmaBilgileri(currentFirmaGeziId);
    } else {
      Bildirim.goster("error", "❌ Hata: " + result.message);
    }

    console.log("✅ Firma kaydedildi");
  } catch (error) {
    console.error("❌ Firma kaydetme hatası:", error);
    Bildirim.goster(
      "error",
      "Firma kaydedilirken hata oluştu: " + error.message
    );
  }
}
// ==========================================
// ÖDEME TAKİBİ SİSTEMİ
// ==========================================

let currentOdemeGeziId = null;
let odemePlani = null;
let katilimciUcretleri = [];
let currentOdemeFilter = "hepsi";
let currentKatilimciFilter = "hepsi";
let currentOdemeTaksitId = null;

// ==========================================
// ÖDEME MODAL AÇ
// ==========================================

async function geziOdeme(geziId) {
  try {
    console.log("💳 Ödeme takibi açılıyor, Gezi ID:", geziId);
    currentOdemeGeziId = geziId;

    const geziResult = await window.electronAPI.dbQuery(
      "SELECT gezi_adi FROM geziler WHERE id = ?",
      [geziId]
    );

    if (
      !geziResult.success ||
      !geziResult.data ||
      geziResult.data.length === 0
    ) {
      Bildirim.goster("error", "Gezi bulunamadı!");
      return;
    }

    const gezi = geziResult.data[0];
    document.getElementById(
      "odemeModalTitle"
    ).textContent = `${gezi.gezi_adi} - Ödeme Takibi`;

    await loadOdemePlani(geziId);
    document.getElementById("odemeModal").style.display = "flex";

    console.log("✅ Ödeme modal açıldı");
  } catch (error) {
    console.error("❌ Ödeme modal açma hatası:", error);
    Bildirim.goster("error", "Ödeme takibi açılırken hata oluştu!");
  }
}

function closeOdemeModal() {
  document.getElementById("odemeModal").style.display = "none";
  currentOdemeGeziId = null;
  odemePlani = null;
  katilimciUcretleri = [];
}

// ==========================================
// ÖDEME PLANI YÜKLE
// ==========================================

async function loadOdemePlani(geziId) {
  try {
    console.log("🔄 Ödeme planı yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_odeme_plani WHERE gezi_id = ?",
      [geziId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      // Plan yok, form göster
      document.getElementById("odemePlaniForm").style.display = "block";
      document.getElementById("odemePlaniOzet").style.display = "none";
      document.getElementById("katilimciUcretSection").style.display = "none";
      document.getElementById("odemeTakipSection").style.display = "none";
      return;
    }

    // Plan var, özet göster
    odemePlani = result.data[0];

    document.getElementById("kisiBasiUcret").value = odemePlani.kisi_basi_ucret;
    document.getElementById("odemeParaBirimi").value = odemePlani.para_birimi;
    document.getElementById("taksitSayisi").value = odemePlani.taksit_sayisi;
    document.getElementById("pesinatOrani").value = odemePlani.pesinat_orani;
    document.getElementById("ilkTaksitTarih").value =
      odemePlani.odeme_baslangic;
    document.getElementById("taksitAraligi").value = odemePlani.taksit_araligi;
    document.getElementById("hatirlatmaGun").value = odemePlani.hatirlatma_gun;

    document.getElementById(
      "planKisiBasi"
    ).textContent = `${odemePlani.kisi_basi_ucret} ${odemePlani.para_birimi}`;
    document.getElementById(
      "planTaksit"
    ).textContent = `${odemePlani.taksit_sayisi} Taksit`;
    document.getElementById(
      "planPesinat"
    ).textContent = `%${odemePlani.pesinat_orani}`;
    document.getElementById("planTarih").textContent = formatDate(
      odemePlani.odeme_baslangic
    );

    document.getElementById("odemePlaniForm").style.display = "none";
    document.getElementById("odemePlaniOzet").style.display = "grid";
    document.getElementById("katilimciUcretSection").style.display = "block";
    document.getElementById("odemeTakipSection").style.display = "block";

    await loadKatilimciUcretler(geziId);
    await loadOdemeTakip(geziId);

    console.log("✅ Ödeme planı yüklendi");
  } catch (error) {
    console.error("❌ Ödeme planı yükleme hatası:", error);
  }
}

// ==========================================
// ÖDEME PLANI KAYDET
// ==========================================

async function odemePlaniKaydet() {
  try {
    console.log("💾 Ödeme planı kaydediliyor...");

    const kisiBasiUcret = document.getElementById("kisiBasiUcret").value;
    const taksitSayisi = document.getElementById("taksitSayisi").value;
    const ilkTaksitTarih = document.getElementById("ilkTaksitTarih").value;

    if (!kisiBasiUcret) {
      Bildirim.goster("warning", "Kişi başı ücret zorunludur!");
      return;
    }

    if (!taksitSayisi) {
      Bildirim.goster("warning", "Taksit sayısı zorunludur!");
      return;
    }

    if (!ilkTaksitTarih) {
      Bildirim.goster("warning", "İlk taksit tarihi zorunludur!");
      return;
    }

    const planData = {
      gezi_id: currentOdemeGeziId,
      kisi_basi_ucret: parseFloat(kisiBasiUcret),
      para_birimi: document.getElementById("odemeParaBirimi").value,
      taksit_sayisi: parseInt(taksitSayisi),
      pesinat_orani:
        parseFloat(document.getElementById("pesinatOrani").value) || 0,
      odeme_baslangic: ilkTaksitTarih,
      taksit_araligi:
        parseInt(document.getElementById("taksitAraligi").value) || 30,
      hatirlatma_gun:
        parseInt(document.getElementById("hatirlatmaGun").value) || 7,
    };

    const existingResult = await window.electronAPI.dbQuery(
      "SELECT id FROM gezi_odeme_plani WHERE gezi_id = ?",
      [currentOdemeGeziId]
    );

    if (
      existingResult.success &&
      existingResult.data &&
      existingResult.data.length > 0
    ) {
      await window.electronAPI.dbQuery(
        `UPDATE gezi_odeme_plani SET
          kisi_basi_ucret = ?, para_birimi = ?, taksit_sayisi = ?,
          pesinat_orani = ?, odeme_baslangic = ?, taksit_araligi = ?, hatirlatma_gun = ?
          WHERE gezi_id = ?`,
        [
          planData.kisi_basi_ucret,
          planData.para_birimi,
          planData.taksit_sayisi,
          planData.pesinat_orani,
          planData.odeme_baslangic,
          planData.taksit_araligi,
          planData.hatirlatma_gun,
          currentOdemeGeziId,
        ]
      );
    } else {
      await window.electronAPI.dbQuery(
        `INSERT INTO gezi_odeme_plani 
          (gezi_id, kisi_basi_ucret, para_birimi, taksit_sayisi, pesinat_orani,
           odeme_baslangic, taksit_araligi, hatirlatma_gun)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          planData.gezi_id,
          planData.kisi_basi_ucret,
          planData.para_birimi,
          planData.taksit_sayisi,
          planData.pesinat_orani,
          planData.odeme_baslangic,
          planData.taksit_araligi,
          planData.hatirlatma_gun,
        ]
      );
    }

    Bildirim.goster("success", "💳 Ödeme planı oluşturuldu!");

    document.getElementById(
      "planKisiBasi"
    ).textContent = `${planData.kisi_basi_ucret} ${planData.para_birimi}`;
    document.getElementById(
      "planTaksit"
    ).textContent = `${planData.taksit_sayisi} Taksit`;
    document.getElementById(
      "planPesinat"
    ).textContent = `%${planData.pesinat_orani}`;
    document.getElementById("planTarih").textContent = formatDate(
      planData.odeme_baslangic
    );

    document.getElementById("odemePlaniForm").style.display = "none";
    document.getElementById("odemePlaniOzet").style.display = "grid";
    document.getElementById("katilimciUcretSection").style.display = "block";

    await loadKatilimciUcretler(currentOdemeGeziId);
  } catch (error) {
    console.error("❌ Ödeme planı kaydetme hatası:", error);
    Bildirim.goster("error", "Ödeme planı kaydedilirken hata oluştu!");
  }
}

function odemePlaniDuzenle() {
  document.getElementById("odemePlaniForm").style.display = "block";
  document.getElementById("odemePlaniOzet").style.display = "none";
}

// ==========================================
// KATILIMCI ÜCRETLERİNİ YÜKLE
// ==========================================

async function loadKatilimciUcretler(geziId) {
  try {
    console.log("🔄 Katılımcılar yükleniyor...");

    katilimciUcretleri = [];

    // Önce veritabanından kayıtlı ücretleri çek
    const kayitliUcretler = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_katilimci_ucretler WHERE gezi_id = ?",
      [geziId]
    );

    const kayitliMap = {};
    if (kayitliUcretler.success && kayitliUcretler.data) {
      kayitliUcretler.data.forEach((u) => {
        const key = `${u.kisi_tipi}_${u.kisi_id}`;
        kayitliMap[key] = u;
      });
    }

    // Öğrencileri yükle
    const ogrencilerResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad_soyad
       FROM gezi_ogrenciler go
       INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
       WHERE go.gezi_id = ?`,
      [geziId]
    );

    if (ogrencilerResult.success && ogrencilerResult.data) {
      ogrencilerResult.data.forEach((ogr) => {
        const key = `ogrenci_${ogr.id}`;
        const kayitli = kayitliMap[key];

        katilimciUcretleri.push({
          kisi_id: ogr.id,
          ad_soyad: ogr.ad_soyad,
          kisi_tipi: "ogrenci",
          ucret_durumu: kayitli ? kayitli.ucret_durumu : "normal",
          ozel_ucret: kayitli ? kayitli.ozel_ucret : null,
          taksit_sayisi: kayitli ? kayitli.taksit_sayisi : null,
        });
      });
    }

    // Öğretmenleri yükle
    const ogretmenlerResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad_soyad
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       WHERE go.gezi_id = ?`,
      [geziId]
    );

    if (ogretmenlerResult.success && ogretmenlerResult.data) {
      ogretmenlerResult.data.forEach((ogr) => {
        const key = `ogretmen_${ogr.id}`;
        const kayitli = kayitliMap[key];

        katilimciUcretleri.push({
          kisi_id: ogr.id,
          ad_soyad: ogr.ad_soyad,
          kisi_tipi: "ogretmen",
          ucret_durumu: kayitli ? kayitli.ucret_durumu : "normal",
          ozel_ucret: kayitli ? kayitli.ozel_ucret : null,
          taksit_sayisi: kayitli ? kayitli.taksit_sayisi : null,
        });
      });
    }

    renderKatilimciUcretler();
    updateUcretOzet();

    console.log(`✅ ${katilimciUcretleri.length} katılımcı yüklendi`);
  } catch (error) {
    console.error("❌ Katılımcı yükleme hatası:", error);
  }
}

// ==========================================
// KATILIMCI ÜCRETLERİ RENDER
// ==========================================

function renderKatilimciUcretler() {
  const container = document.getElementById("katilimciUcretListesi");

  let filtered = katilimciUcretleri;

  if (currentKatilimciFilter === "ogrenci") {
    filtered = katilimciUcretleri.filter((k) => k.kisi_tipi === "ogrenci");
  } else if (currentKatilimciFilter === "ogretmen") {
    filtered = katilimciUcretleri.filter((k) => k.kisi_tipi === "ogretmen");
  } else if (currentKatilimciFilter === "normal") {
    filtered = katilimciUcretleri.filter((k) => k.ucret_durumu === "normal");
  } else if (currentKatilimciFilter === "ucretsiz") {
    filtered = katilimciUcretleri.filter((k) => k.ucret_durumu === "ucretsiz");
  } else if (currentKatilimciFilter === "indirimli") {
    filtered = katilimciUcretleri.filter((k) => k.ucret_durumu === "indirimli");
  }

  if (filtered.length === 0) {
    container.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">Kayıt bulunamadı</td></tr>';
    return;
  }

  container.innerHTML = filtered
    .map(
      (kisi) => `
    <tr>
      <td>
        <strong style="color: #1f2937;">${kisi.ad_soyad}</strong>
      </td>
      <td>
        <span class="kisi-badge ${kisi.kisi_tipi}">
          ${kisi.kisi_tipi === "ogrenci" ? "👨‍🎓 Öğrenci" : "👨‍🏫 Öğretmen"}
        </span>
      </td>
      <td>
        <select class="ucret-durum-select" onchange="ucretDurumuDegistir(${
          kisi.kisi_id
        }, '${kisi.kisi_tipi}', this.value)">
          <option value="normal" ${
            kisi.ucret_durumu === "normal" ? "selected" : ""
          }>Normal Ücret</option>
          <option value="ucretsiz" ${
            kisi.ucret_durumu === "ucretsiz" ? "selected" : ""
          }>Ücretsiz</option>
          <option value="indirimli" ${
            kisi.ucret_durumu === "indirimli" ? "selected" : ""
          }>İndirimli</option>
        </select>
      </td>
      <td>
        ${
          kisi.ucret_durumu === "ucretsiz"
            ? '<span style="color: #10b981; font-weight: 700;">Ücretsiz</span>'
            : kisi.ucret_durumu === "indirimli"
            ? `<input type="number" class="ucret-input" value="${
                kisi.ozel_ucret || ""
              }" placeholder="Özel tutar" 
             onchange="ozelUcretDegistir(${kisi.kisi_id}, '${
                kisi.kisi_tipi
              }', this.value)" />`
            : `<span style="color: #6b7280;">${
                document.getElementById("kisiBasiUcret").value
              } ${document.getElementById("odemeParaBirimi").value}</span>`
        }
      </td>
      <td>
        <input type="number" class="taksit-input" value="${
          kisi.taksit_sayisi || document.getElementById("taksitSayisi").value
        }" min="1" max="12"
         onchange="taksitSayisiDegistir(${kisi.kisi_id}, '${
        kisi.kisi_tipi
      }', this.value)" />
      </td>
      <td>
        <button class="btn-modern btn-sm btn-primary" onclick="kisiDetayGoster(${
          kisi.kisi_id
        }, '${kisi.kisi_tipi}')">
          Detay
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

function ucretDurumuDegistir(kisiId, kisiTipi, durum) {
  const kisi = katilimciUcretleri.find(
    (k) => k.kisi_id === kisiId && k.kisi_tipi === kisiTipi
  );
  if (kisi) {
    kisi.ucret_durumu = durum;
    if (durum === "ucretsiz") {
      kisi.ozel_ucret = 0;
    } else if (durum === "normal") {
      kisi.ozel_ucret = null;
    }
    renderKatilimciUcretler();
    updateUcretOzet();
  }
}

function ozelUcretDegistir(kisiId, kisiTipi, tutar) {
  const kisi = katilimciUcretleri.find(
    (k) => k.kisi_id === kisiId && k.kisi_tipi === kisiTipi
  );
  if (kisi) {
    kisi.ozel_ucret = parseFloat(tutar) || null;
    updateUcretOzet();
  }
}

function taksitSayisiDegistir(kisiId, kisiTipi, sayi) {
  const kisi = katilimciUcretleri.find(
    (k) => k.kisi_id === kisiId && k.kisi_tipi === kisiTipi
  );
  if (kisi) {
    kisi.taksit_sayisi = parseInt(sayi);
  }
}

function katilimciFiltrele(filtre) {
  currentKatilimciFilter = filtre;

  document.querySelectorAll(".filtre-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-filtre="${filtre}"]`).classList.add("active");

  renderKatilimciUcretler();
}

// ==========================================
// ÜCRET ÖZET GÜNCELLE
// ==========================================

function updateUcretOzet() {
  const kisiBasiUcret =
    parseFloat(document.getElementById("kisiBasiUcret").value) || 0;
  const paraBirimi = document.getElementById("odemeParaBirimi").value;

  const toplam = katilimciUcretleri.length;
  const ucretli = katilimciUcretleri.filter(
    (k) => k.ucret_durumu === "normal"
  ).length;
  const ucretsiz = katilimciUcretleri.filter(
    (k) => k.ucret_durumu === "ucretsiz"
  ).length;
  const indirimli = katilimciUcretleri.filter(
    (k) => k.ucret_durumu === "indirimli"
  ).length;

  const ucretliTutar = ucretli * kisiBasiUcret;
  const indirimliTutar = katilimciUcretleri
    .filter((k) => k.ucret_durumu === "indirimli")
    .reduce((sum, k) => sum + (parseFloat(k.ozel_ucret) || 0), 0);

  const toplamHasilat = ucretliTutar + indirimliTutar;

  const toplamEl = document.getElementById("toplamKatilimci");
  const ucretliSayiEl = document.getElementById("ucretliSayi");
  const ucretliTutarEl = document.getElementById("ucretliTutar");
  const ucretsizSayiEl = document.getElementById("ucretsizSayi");
  const indirimliSayiEl = document.getElementById("indirimliSayi");
  const indirimliTutarEl = document.getElementById("indirimliTutar");
  const toplamHasilatEl = document.getElementById("toplamHasilat");

  if (toplamEl) toplamEl.textContent = toplam;
  if (ucretliSayiEl) ucretliSayiEl.textContent = ucretli;
  if (ucretliTutarEl)
    ucretliTutarEl.textContent = `(${ucretliTutar.toFixed(2)} ${paraBirimi})`;
  if (ucretsizSayiEl) ucretsizSayiEl.textContent = ucretsiz;
  if (indirimliSayiEl) indirimliSayiEl.textContent = indirimli;
  if (indirimliTutarEl)
    indirimliTutarEl.textContent = `(${indirimliTutar.toFixed(
      2
    )} ${paraBirimi})`;
  if (toplamHasilatEl)
    toplamHasilatEl.textContent = `${toplamHasilat.toFixed(2)} ${paraBirimi}`;

  const filtreHepsiEl = document.getElementById("filtreHepsi");
  const filtreOgrenciEl = document.getElementById("filtreOgrenci");
  const filtreOgretmenEl = document.getElementById("filtreOgretmen");
  const filtreNormalEl = document.getElementById("filtreNormal");
  const filtreUcretsizEl = document.getElementById("filtreUcretsiz");
  const filtreIndirimliEl = document.getElementById("filtreIndirimli");

  if (filtreHepsiEl) filtreHepsiEl.textContent = toplam;
  if (filtreOgrenciEl)
    filtreOgrenciEl.textContent = katilimciUcretleri.filter(
      (k) => k.kisi_tipi === "ogrenci"
    ).length;
  if (filtreOgretmenEl)
    filtreOgretmenEl.textContent = katilimciUcretleri.filter(
      (k) => k.kisi_tipi === "ogretmen"
    ).length;
  if (filtreNormalEl) filtreNormalEl.textContent = ucretli;
  if (filtreUcretsizEl) filtreUcretsizEl.textContent = ucretsiz;
  if (filtreIndirimliEl) filtreIndirimliEl.textContent = indirimli;
}

// ==========================================
// KATILIMCI ÜCRETLERİNİ KAYDET
// ==========================================

async function katilimciUcretleriKaydet() {
  try {
    console.log("💾 Katılımcı ücretleri kaydediliyor...");

    const kisiBasiUcret =
      parseFloat(document.getElementById("kisiBasiUcret").value) || 0;
    const paraBirimi = document.getElementById("odemeParaBirimi").value;
    const taksitSayisi = parseInt(
      document.getElementById("taksitSayisi").value
    );
    const ilkTaksitTarih = document.getElementById("ilkTaksitTarih").value;
    const taksitAraligi =
      parseInt(document.getElementById("taksitAraligi").value) || 30;
    const pesinatOrani =
      parseFloat(document.getElementById("pesinatOrani").value) || 0;

    let kayitSayisi = 0;

    for (const kisi of katilimciUcretleri) {
      let toplamUcret = 0;
      if (kisi.ucret_durumu === "ucretsiz") {
        toplamUcret = 0;
      } else if (kisi.ucret_durumu === "indirimli") {
        toplamUcret = parseFloat(kisi.ozel_ucret) || 0;
      } else {
        toplamUcret = kisiBasiUcret;
      }

      const kisiTaksitSayisi = kisi.taksit_sayisi || taksitSayisi;

      const existingResult = await window.electronAPI.dbQuery(
        "SELECT id FROM gezi_katilimci_ucretler WHERE gezi_id = ? AND kisi_tipi = ? AND kisi_id = ?",
        [currentOdemeGeziId, kisi.kisi_tipi, kisi.kisi_id]
      );

      let katilimciUcretId;

      if (
        existingResult.success &&
        existingResult.data &&
        existingResult.data.length > 0
      ) {
        katilimciUcretId = existingResult.data[0].id;
        await window.electronAPI.dbQuery(
          `UPDATE gezi_katilimci_ucretler SET
            ucret_durumu = ?, ozel_ucret = ?, taksit_sayisi = ?,
            toplam_ucret = ?, kalan_borc = ?
            WHERE id = ?`,
          [
            kisi.ucret_durumu,
            kisi.ozel_ucret,
            kisiTaksitSayisi,
            toplamUcret,
            toplamUcret,
            katilimciUcretId,
          ]
        );
      } else {
        const insertResult = await window.electronAPI.dbQuery(
          `INSERT INTO gezi_katilimci_ucretler 
            (gezi_id, kisi_tipi, kisi_id, ad_soyad, ucret_durumu, ozel_ucret, 
             taksit_sayisi, toplam_ucret, toplam_odenen, kalan_borc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [
            currentOdemeGeziId,
            kisi.kisi_tipi,
            kisi.kisi_id,
            kisi.ad_soyad,
            kisi.ucret_durumu,
            kisi.ozel_ucret,
            kisiTaksitSayisi,
            toplamUcret,
            toplamUcret,
          ]
        );

        const idResult = await window.electronAPI.dbQuery(
          "SELECT last_insert_rowid() as id"
        );
        katilimciUcretId = idResult.data[0].id;
      }

      if (toplamUcret > 0) {
        await window.electronAPI.dbQuery(
          "DELETE FROM gezi_odemeler WHERE katilimci_ucret_id = ?",
          [katilimciUcretId]
        );

        const pesinatTutari = (toplamUcret * pesinatOrani) / 100;
        const kalanTutar = toplamUcret - pesinatTutari;
        const taksitTutari = kalanTutar / kisiTaksitSayisi;

        for (let i = 1; i <= kisiTaksitSayisi; i++) {
          const vadeTarihi = new Date(ilkTaksitTarih);
          vadeTarihi.setDate(vadeTarihi.getDate() + (i - 1) * taksitAraligi);

          const tutar = i === 1 ? pesinatTutari + taksitTutari : taksitTutari;

          await window.electronAPI.dbQuery(
            `INSERT INTO gezi_odemeler 
              (katilimci_ucret_id, taksit_no, taksit_tutari, vade_tarihi, odeme_durumu)
              VALUES (?, ?, ?, ?, 'bekliyor')`,
            [katilimciUcretId, i, tutar, vadeTarihi.toISOString().split("T")[0]]
          );
        }
      }

      kayitSayisi++;
    }

    Bildirim.goster(
      "success",
      `✅ ${kayitSayisi} katılımcının ücreti ve taksitleri kaydedildi!`
    );

    document.getElementById("odemeTakipSection").style.display = "block";
    await loadOdemeTakip(currentOdemeGeziId);
  } catch (error) {
    console.error("❌ Ücret kaydetme hatası:", error);
    Bildirim.goster("error", "Ücretler kaydedilirken hata oluştu!");
  }
}

// ==========================================
// ÖDEME TAKİP YÜKLE
// ==========================================

async function loadOdemeTakip(geziId) {
  try {
    console.log("🔄 Ödeme takibi yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      `SELECT 
        ku.id as katilimci_ucret_id,
        ku.ad_soyad,
        ku.kisi_tipi,
        ku.toplam_ucret,
        ku.toplam_odenen,
        ku.kalan_borc,
        COUNT(o.id) as toplam_taksit,
        SUM(CASE WHEN o.odeme_durumu = 'odendi' THEN 1 ELSE 0 END) as odenen_taksit,
        SUM(CASE WHEN o.odeme_durumu = 'gecikti' THEN 1 ELSE 0 END) as geciken_taksit
       FROM gezi_katilimci_ucretler ku
       LEFT JOIN gezi_odemeler o ON ku.id = o.katilimci_ucret_id
       WHERE ku.gezi_id = ?
       GROUP BY ku.id
       ORDER BY ku.ad_soyad`,
      [geziId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      document.getElementById("odemeTakipKartlari").innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #9ca3af;">
          Henüz ödeme kaydı yok
        </div>
      `;
      return;
    }

    await renderOdemeTakipKartlari(result.data);
    updateOdemeDurumSayilari(result.data);

    console.log("✅ Ödeme takibi yüklendi");
  } catch (error) {
    console.error("❌ Ödeme takip yükleme hatası:", error);
  }
}

async function renderOdemeTakipKartlari(katilimcilar) {
  const container = document.getElementById("odemeTakipKartlari");

  let filtered = katilimcilar;

  if (currentOdemeFilter === "tamamlandi") {
    filtered = katilimcilar.filter(
      (k) => k.kalan_borc === 0 && k.toplam_ucret > 0
    );
  } else if (currentOdemeFilter === "kismi") {
    filtered = katilimcilar.filter(
      (k) => k.toplam_odenen > 0 && k.kalan_borc > 0
    );
  } else if (currentOdemeFilter === "odenmedi") {
    filtered = katilimcilar.filter(
      (k) => k.toplam_odenen === 0 && k.toplam_ucret > 0
    );
  } else if (currentOdemeFilter === "gecikti") {
    filtered = katilimcilar.filter((k) => k.geciken_taksit > 0);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #9ca3af;">
        Bu filtre için kayıt bulunamadı
      </div>
    `;
    return;
  }

  const kartlarHTML = [];

  for (const kisi of filtered) {
    const taksitlerResult = await window.electronAPI.dbQuery(
      `SELECT * FROM gezi_odemeler WHERE katilimci_ucret_id = ? ORDER BY taksit_no`,
      [kisi.katilimci_ucret_id]
    );

    const taksitler = taksitlerResult.data || [];

    // Durumu belirle
    let durumClass = "odenmedi";
    let durumText = "Ödeme Yok";

    if (kisi.kalan_borc === 0 && kisi.toplam_ucret > 0) {
      durumClass = "tamamlandi";
      durumText = "Tamamlandı";
    } else if (kisi.toplam_odenen > 0 && kisi.kalan_borc > 0) {
      durumClass = "kismi";
      durumText = "Kısmi Ödeme";
    } else if (kisi.geciken_taksit > 0) {
      durumClass = "gecikti";
      durumText = "Vadesi Geçmiş";
    }

    const paraBirimi = document.getElementById("odemeParaBirimi").value;
    const odemeyuzde =
      kisi.toplam_ucret > 0
        ? ((kisi.toplam_odenen / kisi.toplam_ucret) * 100).toFixed(0)
        : 0;

    kartlarHTML.push(`
      <div class="odeme-kart ${durumClass}">
        <div class="odeme-kart-header">
          <div class="kart-kisi-bilgi">
            <h4>${kisi.ad_soyad}</h4>
            <p>${
              kisi.kisi_tipi === "ogrenci" ? "👨‍🎓 Öğrenci" : "👨‍🏫 Öğretmen"
            }</p>
          </div>
          <span class="kart-durum-badge ${durumClass}">${durumText}</span>
        </div>

        <div class="odeme-kart-taksitler">
          ${taksitler
            .map((t) => {
              const bugun = new Date();
              const vade = new Date(t.vade_tarihi);
              const gunFark = Math.ceil((vade - bugun) / (1000 * 60 * 60 * 24));

              let taksitClass = "bekliyor";
              let durum = "⏳";
              let aciklama = t.vade_tarihi;

              if (t.odeme_durumu === "odendi") {
                taksitClass = "odendi";
                durum = "✓";
                aciklama = formatDate(t.odeme_tarihi);
              } else if (gunFark < 0) {
                taksitClass = "gecikti";
                durum = "⚠️";
                aciklama = `${Math.abs(gunFark)} gün gecikti`;
              } else if (gunFark <= 7) {
                aciklama = `${gunFark} gün kaldı`;
              }

              return `
              <div class="taksit-item ${taksitClass}">
                <div class="taksit-bilgi">
                  <div class="taksit-no">Taksit ${t.taksit_no}</div>
                  <div class="taksit-tarih">${aciklama}</div>
                </div>
                <div class="taksit-tutar">${t.taksit_tutari.toFixed(
                  2
                )} ${paraBirimi}</div>
                <div class="taksit-durum-icon">${durum}</div>
              </div>
            `;
            })
            .join("")}
        </div>

        <div class="odeme-kart-ozet">
          <div class="ozet-satir">
            <span class="ozet-label">Toplam Ücret:</span>
            <span class="ozet-deger">${kisi.toplam_ucret.toFixed(
              2
            )} ${paraBirimi}</span>
          </div>
          <div class="ozet-satir">
            <span class="ozet-label">Ödenen:</span>
            <span class="ozet-deger" style="color: #10b981;">${kisi.toplam_odenen.toFixed(
              2
            )} ${paraBirimi} (${odemeyuzde}%)</span>
          </div>
          <div class="ozet-satir toplam">
            <span class="ozet-label">Kalan:</span>
            <span class="ozet-deger" style="color: #ef4444;">${kisi.kalan_borc.toFixed(
              2
            )} ${paraBirimi}</span>
          </div>
        </div>

        <div class="odeme-kart-aksiyonlar">
          ${
            taksitler.some((t) => t.odeme_durumu === "bekliyor")
              ? `
            <button class="btn-odeme-al" onclick="odemeAlAc(${kisi.katilimci_ucret_id}, '${kisi.ad_soyad}')">
              💰 Ödeme Al
            </button>
          `
              : ""
          }
          <button class="btn-kart-detay" onclick="kisiDetayGoster(${
            kisi.katilimci_ucret_id
          }, '${kisi.kisi_tipi}')">
            📊 Detay
          </button>
        </div>
      </div>
    `);
  }

  container.innerHTML = kartlarHTML.join("");
}

function updateOdemeDurumSayilari(katilimcilar) {
  const hepsi = katilimcilar.length;
  const tamamlandi = katilimcilar.filter(
    (k) => k.kalan_borc === 0 && k.toplam_ucret > 0
  ).length;
  const kismi = katilimcilar.filter(
    (k) => k.toplam_odenen > 0 && k.kalan_borc > 0
  ).length;
  const odenmedi = katilimcilar.filter(
    (k) => k.toplam_odenen === 0 && k.toplam_ucret > 0
  ).length;
  const gecikti = katilimcilar.filter((k) => k.geciken_taksit > 0).length;

  const hepsiEl = document.getElementById("durumHepsi");
  const tamamlandiEl = document.getElementById("durumTamamlandi");
  const kismiEl = document.getElementById("durumKismi");
  const odenmedEl = document.getElementById("durumOdenmedi");
  const geciktiEl = document.getElementById("durumGecikti");

  if (hepsiEl) hepsiEl.textContent = hepsi;
  if (tamamlandiEl) tamamlandiEl.textContent = tamamlandi;
  if (kismiEl) kismiEl.textContent = kismi;
  if (odenmedEl) odenmedEl.textContent = odenmedi;
  if (geciktiEl) geciktiEl.textContent = gecikti;
}

function odemeDurumFiltrele(durum) {
  currentOdemeFilter = durum;

  document.querySelectorAll(".takip-filtre-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-durum="${durum}"]`).classList.add("active");

  loadOdemeTakip(currentOdemeGeziId);
}

function kisiDetayGoster(katilimciUcretId, kisiTipi) {
  console.log("📊 Kişi detayı:", katilimciUcretId, kisiTipi);
  Bildirim.goster("info", "Detay modal özelliği bir sonraki adımda eklenecek");
}

// ==========================================
// ÖDEME AL MODALI
// ==========================================

async function odemeAlAc(katilimciUcretId, kisiAd) {
  try {
    const taksitlerResult = await window.electronAPI.dbQuery(
      `SELECT * FROM gezi_odemeler 
       WHERE katilimci_ucret_id = ? AND odeme_durumu = 'bekliyor'
       ORDER BY taksit_no LIMIT 1`,
      [katilimciUcretId]
    );

    if (
      !taksitlerResult.success ||
      !taksitlerResult.data ||
      taksitlerResult.data.length === 0
    ) {
      Bildirim.goster("warning", "Bekleyen taksit bulunamadı!");
      return;
    }

    const taksit = taksitlerResult.data[0];
    const paraBirimi = document.getElementById("odemeParaBirimi").value;

    currentOdemeTaksitId = taksit.id;

    document.getElementById("odemeAlKisi").textContent = kisiAd;
    document.getElementById(
      "odemeAlTaksit"
    ).textContent = `Taksit ${taksit.taksit_no}`;
    document.getElementById(
      "odemeAlTutar"
    ).textContent = `${taksit.taksit_tutari.toFixed(2)} ${paraBirimi}`;
    document.getElementById("odemeTarihi").value = new Date()
      .toISOString()
      .split("T")[0];
    document.getElementById("odemeSekli").value = "nakit";
    document.getElementById("makbuzNo").value = "";
    document.getElementById("odemeNotlar").value = "";

    document.getElementById("odemeAlModal").style.display = "flex";
  } catch (error) {
    console.error("❌ Ödeme al hatası:", error);
    Bildirim.goster("error", "Ödeme al modalı açılırken hata oluştu!");
  }
}

function closeOdemeAlModal() {
  document.getElementById("odemeAlModal").style.display = "none";
  currentOdemeTaksitId = null;
}

async function odemeKaydet() {
  try {
    const odemeTarihi = document.getElementById("odemeTarihi").value;

    if (!odemeTarihi) {
      Bildirim.goster("warning", "Ödeme tarihi zorunludur!");
      return;
    }

    console.log("💰 Ödeme kaydediliyor...");

    const odemeSekli = document.getElementById("odemeSekli").value;
    const makbuzNo = document.getElementById("makbuzNo").value.trim() || null;
    const notlar = document.getElementById("odemeNotlar").value.trim() || null;

    // Taksiti güncelle
    await window.electronAPI.dbQuery(
      `UPDATE gezi_odemeler SET
        odeme_durumu = 'odendi',
        odeme_tarihi = ?,
        odeme_sekli = ?,
        makbuz_no = ?,
        notlar = ?
        WHERE id = ?`,
      [odemeTarihi, odemeSekli, makbuzNo, notlar, currentOdemeTaksitId]
    );

    // Katılımcı ücret toplamlarını güncelle
    const taksitResult = await window.electronAPI.dbQuery(
      "SELECT katilimci_ucret_id, taksit_tutari FROM gezi_odemeler WHERE id = ?",
      [currentOdemeTaksitId]
    );

    if (taksitResult.success && taksitResult.data.length > 0) {
      const katilimciUcretId = taksitResult.data[0].katilimci_ucret_id;
      const taksitTutari = taksitResult.data[0].taksit_tutari;

      await window.electronAPI.dbQuery(
        `UPDATE gezi_katilimci_ucretler SET
          toplam_odenen = toplam_odenen + ?,
          kalan_borc = kalan_borc - ?
          WHERE id = ?`,
        [taksitTutari, taksitTutari, katilimciUcretId]
      );
    }

    Bildirim.goster("success", "✅ Ödeme kaydedildi!");
    closeOdemeAlModal();
    await loadOdemeTakip(currentOdemeGeziId);
  } catch (error) {
    console.error("❌ Ödeme kaydetme hatası:", error);
    Bildirim.goster("error", "Ödeme kaydedilirken hata oluştu!");
  }
}

// ==========================================
// KİŞİ DETAY MODAL
// ==========================================

let currentDetayKatilimciUcretId = null;

async function kisiDetayGoster(katilimciUcretId, kisiTipi) {
  try {
    console.log("📊 Kişi detayı açılıyor:", katilimciUcretId);
    currentDetayKatilimciUcretId = katilimciUcretId;

    // Katılımcı bilgilerini çek
    const ucretResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_katilimci_ucretler WHERE id = ?",
      [katilimciUcretId]
    );

    if (
      !ucretResult.success ||
      !ucretResult.data ||
      ucretResult.data.length === 0
    ) {
      Bildirim.goster("error", "Katılımcı bilgisi bulunamadı!");
      return;
    }

    const kisi = ucretResult.data[0];

    // Taksitleri çek
    const taksitlerResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_odemeler WHERE katilimci_ucret_id = ? ORDER BY taksit_no",
      [katilimciUcretId]
    );

    const taksitler = taksitlerResult.data || [];

    // Para birimini al
    const planResult = await window.electronAPI.dbQuery(
      "SELECT para_birimi FROM gezi_odeme_plani WHERE gezi_id = ?",
      [kisi.gezi_id]
    );
    const paraBirimi = planResult.data[0]?.para_birimi || "TL";

    // Modal başlığı
    document.getElementById(
      "detayModalTitle"
    ).textContent = `${kisi.ad_soyad} - Ödeme Detayı`;

    // Avatar ve bilgiler
    document.getElementById("detayKisiAd").textContent = kisi.ad_soyad;
    document.getElementById("detayKisiTip").textContent =
      kisi.kisi_tipi === "ogrenci" ? "👨‍🎓 Öğrenci" : "👨‍🏫 Öğretmen";

    // Özet kartı
    document.getElementById(
      "detayToplamUcret"
    ).textContent = `${kisi.toplam_ucret.toFixed(2)} ${paraBirimi}`;
    document.getElementById(
      "detayOdenen"
    ).textContent = `${kisi.toplam_odenen.toFixed(2)} ${paraBirimi}`;
    document.getElementById(
      "detayKalan"
    ).textContent = `${kisi.kalan_borc.toFixed(2)} ${paraBirimi}`;

    // İlerleme çubuğu
    const ilerlemeYuzde =
      kisi.toplam_ucret > 0
        ? ((kisi.toplam_odenen / kisi.toplam_ucret) * 100).toFixed(0)
        : 0;
    document.getElementById(
      "detayIlerlemeyuzde"
    ).textContent = `${ilerlemeYuzde}%`;
    document.getElementById(
      "detayIlerlemeDolgu"
    ).style.width = `${ilerlemeYuzde}%`;

    // Taksitleri render et
    renderDetayTaksitler(taksitler, paraBirimi);

    // Ödeme geçmişini render et
    renderOdemeGecmisi(
      taksitler.filter((t) => t.odeme_durumu === "odendi"),
      paraBirimi
    );

    // Modalı aç
    document.getElementById("kisiDetayModal").style.display = "flex";

    console.log("✅ Detay modal açıldı");
  } catch (error) {
    console.error("❌ Detay modal açma hatası:", error);
    Bildirim.goster("error", "Detay gösterilirken hata oluştu!");
  }
}

function closeKisiDetayModal() {
  document.getElementById("kisiDetayModal").style.display = "none";
  currentDetayKatilimciUcretId = null;
}

function renderDetayTaksitler(taksitler, paraBirimi) {
  const container = document.getElementById("detayTaksitlerListesi");

  if (taksitler.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #9ca3af; padding: 40px;">Taksit bilgisi yok</p>';
    return;
  }

  const bugun = new Date();

  container.innerHTML = taksitler
    .map((t) => {
      const vade = new Date(t.vade_tarihi);
      const gunFark = Math.ceil((vade - bugun) / (1000 * 60 * 60 * 24));

      let durumClass = "bekliyor";
      let durumText = "Bekliyor";
      let durumIcon = "⏳";
      let aciklama = formatDate(t.vade_tarihi);

      if (t.odeme_durumu === "odendi") {
        durumClass = "odendi";
        durumText = "Ödendi";
        durumIcon = "✓";
        aciklama = `Ödeme: ${formatDate(t.odeme_tarihi)}`;
      } else if (gunFark < 0) {
        durumClass = "gecikti";
        durumText = "Gecikti";
        durumIcon = "⚠️";
        aciklama = `${Math.abs(gunFark)} gün gecikti`;
      } else if (gunFark === 0) {
        aciklama = "BUGÜN";
      } else if (gunFark <= 7) {
        aciklama = `${gunFark} gün kaldı`;
      }

      return `
      <div class="detay-taksit-item ${durumClass}">
        <div class="detay-taksit-no">Taksit ${t.taksit_no}</div>
        <div class="detay-taksit-bilgi">
          <div class="detay-taksit-vade">Vade: ${formatDate(
            t.vade_tarihi
          )}</div>
          <div class="detay-taksit-aciklama">${aciklama}</div>
        </div>
        <div class="detay-taksit-tutar">${t.taksit_tutari.toFixed(
          2
        )} ${paraBirimi}</div>
        <div class="detay-taksit-durum ${durumClass}">
          ${durumIcon} ${durumText}
        </div>
        <div class="detay-taksit-aksiyonlar">
          ${
            t.odeme_durumu === "bekliyor"
              ? `
            <button class="btn-taksit-odeme" onclick="detayOdemeAl(${t.id})">
              Ödeme Al
            </button>
          `
              : "-"
          }
        </div>
      </div>
    `;
    })
    .join("");
}

function renderOdemeGecmisi(odemeler, paraBirimi) {
  const container = document.getElementById("detayOdemeGecmisi");

  if (odemeler.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #9ca3af; padding: 40px;">Henüz ödeme yapılmamış</p>';
    return;
  }

  container.innerHTML = odemeler
    .map(
      (o) => `
    <div class="odeme-gecmisi-item">
      <div class="gecmis-sol">
        <div class="gecmis-icon">💰</div>
        <div class="gecmis-bilgi">
          <h4>Taksit ${o.taksit_no} Ödemesi</h4>
          <p>${o.odeme_sekli ? formatOdemeSekli(o.odeme_sekli) : "Nakit"} ${
        o.makbuz_no ? `• Makbuz: ${o.makbuz_no}` : ""
      }</p>
          ${
            o.notlar
              ? `<p style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${o.notlar}</p>`
              : ""
          }
        </div>
      </div>
      <div class="gecmis-sag">
        <div class="gecmis-tutar">${o.taksit_tutari.toFixed(
          2
        )} ${paraBirimi}</div>
        <div class="gecmis-tarih">${formatDate(o.odeme_tarihi)}</div>
      </div>
    </div>
  `
    )
    .join("");
}

function formatOdemeSekli(sekil) {
  const sekiller = {
    nakit: "💵 Nakit",
    havale: "🏦 Havale/EFT",
    kredi_karti: "💳 Kredi Kartı",
    pos: "🖥️ POS",
  };
  return sekiller[sekil] || sekil;
}

async function detayOdemeAl(taksitId) {
  try {
    const taksitResult = await window.electronAPI.dbQuery(
      `SELECT o.*, ku.ad_soyad 
       FROM gezi_odemeler o
       INNER JOIN gezi_katilimci_ucretler ku ON o.katilimci_ucret_id = ku.id
       WHERE o.id = ?`,
      [taksitId]
    );

    if (
      !taksitResult.success ||
      !taksitResult.data ||
      taksitResult.data.length === 0
    ) {
      Bildirim.goster("error", "Taksit bulunamadı!");
      return;
    }

    const taksit = taksitResult.data[0];
    const planResult = await window.electronAPI.dbQuery(
      "SELECT para_birimi FROM gezi_odeme_plani WHERE gezi_id = ?",
      [currentOdemeGeziId]
    );
    const paraBirimi = planResult.data[0]?.para_birimi || "TL";

    currentOdemeTaksitId = taksit.id;

    document.getElementById("odemeAlKisi").textContent = taksit.ad_soyad;
    document.getElementById(
      "odemeAlTaksit"
    ).textContent = `Taksit ${taksit.taksit_no}`;
    document.getElementById(
      "odemeAlTutar"
    ).textContent = `${taksit.taksit_tutari.toFixed(2)} ${paraBirimi}`;
    document.getElementById("odemeTarihi").value = new Date()
      .toISOString()
      .split("T")[0];
    document.getElementById("odemeSekli").value = "nakit";
    document.getElementById("makbuzNo").value = "";
    document.getElementById("odemeNotlar").value = "";

    closeKisiDetayModal();
    document.getElementById("odemeAlModal").style.display = "flex";
  } catch (error) {
    console.error("❌ Detay ödeme al hatası:", error);
    Bildirim.goster("error", "Ödeme al modalı açılırken hata oluştu!");
  }
}

async function detayYazdir() {
  try {
    console.log("🖨️ Detay yazdırma:", currentDetayKatilimciUcretId);

    if (!currentDetayKatilimciUcretId) {
      Bildirim.goster("error", "Kişi detayı bulunamadı!");
      return;
    }

    // Katılımcı bilgilerini çek
    const ucretResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_katilimci_ucretler WHERE id = ?",
      [currentDetayKatilimciUcretId]
    );

    if (
      !ucretResult.success ||
      !ucretResult.data ||
      ucretResult.data.length === 0
    ) {
      Bildirim.goster("error", "Katılımcı bilgisi bulunamadı!");
      return;
    }

    const kisi = ucretResult.data[0];

    // Taksitleri çek
    const taksitlerResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_odemeler WHERE katilimci_ucret_id = ? ORDER BY taksit_no",
      [currentDetayKatilimciUcretId]
    );

    const taksitler = taksitlerResult.data || [];

    // Para birimini al
    const planResult = await window.electronAPI.dbQuery(
      "SELECT para_birimi FROM gezi_odeme_plani WHERE gezi_id = ?",
      [kisi.gezi_id]
    );
    const paraBirimi = planResult.data[0]?.para_birimi || "TL";

    // HTML oluştur
    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Ödeme Detayı - ${kisi.ad_soyad}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header p { font-size: 14px; color: #666; }
    .ozet { display: flex; justify-content: space-around; margin: 20px 0; background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .ozet-item { text-align: center; }
    .ozet-label { font-size: 12px; color: #666; margin-bottom: 5px; }
    .ozet-deger { font-size: 20px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #333; color: white; font-weight: bold; }
    .durum-odendi { background: #d4edda; color: #155724; padding: 5px 10px; border-radius: 5px; font-size: 12px; }
    .durum-bekliyor { background: #fff3cd; color: #856404; padding: 5px 10px; border-radius: 5px; font-size: 12px; }
    .durum-gecikti { background: #f8d7da; color: #721c24; padding: 5px 10px; border-radius: 5px; font-size: 12px; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>ÖDEME DETAYI</h1>
    <p><strong>${kisi.ad_soyad}</strong> - ${
      kisi.kisi_tipi === "ogrenci" ? "Öğrenci" : "Öğretmen"
    }</p>
  </div>

  <div class="ozet">
    <div class="ozet-item">
      <div class="ozet-label">Toplam Ücret</div>
      <div class="ozet-deger">${kisi.toplam_ucret.toFixed(
        2
      )} ${paraBirimi}</div>
    </div>
    <div class="ozet-item">
      <div class="ozet-label">Ödenen</div>
      <div class="ozet-deger" style="color: #10b981;">${kisi.toplam_odenen.toFixed(
        2
      )} ${paraBirimi}</div>
    </div>
    <div class="ozet-item">
      <div class="ozet-label">Kalan Borç</div>
      <div class="ozet-deger" style="color: #ef4444;">${kisi.kalan_borc.toFixed(
        2
      )} ${paraBirimi}</div>
    </div>
  </div>

  <h3 style="margin-top: 30px; margin-bottom: 10px;">Taksit Listesi</h3>
  <table>
    <thead>
      <tr>
        <th>Taksit No</th>
        <th>Vade Tarihi</th>
        <th>Tutar</th>
        <th>Durum</th>
        <th>Ödeme Tarihi</th>
        <th>Ödeme Şekli</th>
      </tr>
    </thead>
    <tbody>
      ${taksitler
        .map(
          (t) => `
        <tr>
          <td>${t.taksit_no}</td>
          <td>${formatDate(t.vade_tarihi)}</td>
          <td>${t.taksit_tutari.toFixed(2)} ${paraBirimi}</td>
          <td>
            <span class="durum-${t.odeme_durumu}">
              ${
                t.odeme_durumu === "odendi"
                  ? "✓ Ödendi"
                  : t.odeme_durumu === "gecikti"
                  ? "⚠ Gecikti"
                  : "⏳ Bekliyor"
              }
            </span>
          </td>
          <td>${t.odeme_tarihi ? formatDate(t.odeme_tarihi) : "-"}</td>
          <td>${t.odeme_sekli ? formatOdemeSekli(t.odeme_sekli) : "-"}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <p>Yazdırma Tarihi: ${new Date().toLocaleDateString("tr-TR")}</p>
  </div>

  <script>
    function formatDate(dateStr) {
      if (!dateStr) return "-";
      const d = new Date(dateStr);
      return d.toLocaleDateString("tr-TR");
    }
    
    function formatOdemeSekli(sekil) {
      const sekiller = {
        nakit: "Nakit",
        havale: "Havale/EFT",
        kredi_karti: "Kredi Kartı",
        pos: "POS"
      };
      return sekiller[sekil] || sekil;
    }
    
    // Sayfa yüklendiğinde otomatik yazdır
    window.onload = function() {
      setTimeout(() => window.print(), 500);
    };
  </script>

</body>
</html>
    `;

    // Yeni pencerede aç ve yazdır
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    Bildirim.goster("success", "✅ Yazdırma penceresi açıldı!");
  } catch (error) {
    console.error("❌ Yazdırma hatası:", error);
    Bildirim.goster("error", "Yazdırma işlemi başarısız!");
  }
}

// ==========================================
// ÖDEME HATIRLATICI SİSTEMİ
// ==========================================

async function loadOdemeHatirlaticlari() {
  try {
    console.log("🔔 Hatırlatıcılar yükleniyor...");

    // Tüm bekleyen ve gecikmiş ödemeleri çek
    const result = await window.electronAPI.dbQuery(
      `SELECT 
        o.id,
        o.taksit_no,
        o.taksit_tutari,
        o.vade_tarihi,
        ku.ad_soyad,
        ku.kisi_tipi,
        p.para_birimi,
        p.gezi_id,
        g.gezi_adi
       FROM gezi_odemeler o
       INNER JOIN gezi_katilimci_ucretler ku ON o.katilimci_ucret_id = ku.id
       INNER JOIN gezi_odeme_plani p ON ku.gezi_id = p.gezi_id
       INNER JOIN geziler g ON ku.gezi_id = g.id
       WHERE o.odeme_durumu = 'bekliyor'
       ORDER BY o.vade_tarihi ASC`
    );

    if (!result.success || !result.data || result.data.length === 0) {
      document.getElementById("odemeHatirlaticiPanel").style.display = "none";
      return;
    }

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    const bugunVadesi = [];
    const yakinVadesi = [];
    const gecmisVadesi = [];

    result.data.forEach((odeme) => {
      const vade = new Date(odeme.vade_tarihi);
      vade.setHours(0, 0, 0, 0);
      const gunFark = Math.ceil((vade - bugun) / (1000 * 60 * 60 * 24));

      if (gunFark < 0) {
        gecmisVadesi.push({ ...odeme, gunFark });
      } else if (gunFark === 0) {
        bugunVadesi.push({ ...odeme, gunFark });
      } else if (gunFark <= 7) {
        yakinVadesi.push({ ...odeme, gunFark });
      }
    });

    // Sadece veri varsa paneli göster
    if (
      bugunVadesi.length === 0 &&
      yakinVadesi.length === 0 &&
      gecmisVadesi.length === 0
    ) {
      document.getElementById("odemeHatirlaticiPanel").style.display = "none";
      return;
    }

    // Bugün
    if (bugunVadesi.length > 0) {
      document.getElementById("hatirlaticiBugun").style.display = "block";
      document.getElementById("bugunSayi").textContent = bugunVadesi.length;
      document.getElementById("bugunListe").innerHTML = bugunVadesi
        .map(
          (o) => `
        <div class="hatirlatici-item acil" onclick="hatirlaticiClick(${
          o.gezi_id
        })">
          <div class="hatirlatici-kisi">
            <div class="hatirlatici-kisi-ad">${o.ad_soyad}</div>
            <div class="hatirlatici-kisi-detay">${o.gezi_adi} • Taksit ${
            o.taksit_no
          }</div>
          </div>
          <div class="hatirlatici-tutar">
            <div class="hatirlatici-tutar-sayi">${o.taksit_tutari.toFixed(2)} ${
            o.para_birimi
          }</div>
            <div class="hatirlatici-tutar-gun">BUGÜN</div>
          </div>
        </div>
      `
        )
        .join("");
    } else {
      document.getElementById("hatirlaticiBugun").style.display = "none";
    }

    // 7 gün içinde
    if (yakinVadesi.length > 0) {
      document.getElementById("hatirlaticiYakin").style.display = "block";
      document.getElementById("yakinSayi").textContent = yakinVadesi.length;
      document.getElementById("yakinListe").innerHTML = yakinVadesi
        .map(
          (o) => `
        <div class="hatirlatici-item yakin" onclick="hatirlaticiClick(${
          o.gezi_id
        })">
          <div class="hatirlatici-kisi">
            <div class="hatirlatici-kisi-ad">${o.ad_soyad}</div>
            <div class="hatirlatici-kisi-detay">${o.gezi_adi} • Taksit ${
            o.taksit_no
          }</div>
          </div>
          <div class="hatirlatici-tutar">
            <div class="hatirlatici-tutar-sayi">${o.taksit_tutari.toFixed(2)} ${
            o.para_birimi
          }</div>
            <div class="hatirlatici-tutar-gun">${o.gunFark} gün kaldı</div>
          </div>
        </div>
      `
        )
        .join("");
    } else {
      document.getElementById("hatirlaticiYakin").style.display = "none";
    }

    // Vadesi geçmiş
    if (gecmisVadesi.length > 0) {
      document.getElementById("hatirlaticiGecmis").style.display = "block";
      document.getElementById("gecmisSayi").textContent = gecmisVadesi.length;
      document.getElementById("gecmisListe").innerHTML = gecmisVadesi
        .map(
          (o) => `
        <div class="hatirlatici-item gecmis" onclick="hatirlaticiClick(${
          o.gezi_id
        })">
          <div class="hatirlatici-kisi">
            <div class="hatirlatici-kisi-ad">${o.ad_soyad}</div>
            <div class="hatirlatici-kisi-detay">${o.gezi_adi} • Taksit ${
            o.taksit_no
          }</div>
          </div>
          <div class="hatirlatici-tutar">
            <div class="hatirlatici-tutar-sayi">${o.taksit_tutari.toFixed(2)} ${
            o.para_birimi
          }</div>
            <div class="hatirlatici-tutar-gun">${Math.abs(
              o.gunFark
            )} gün gecikti</div>
          </div>
        </div>
      `
        )
        .join("");
    } else {
      document.getElementById("hatirlaticiGecmis").style.display = "none";
    }

    // Paneli göster
    document.getElementById("odemeHatirlaticiPanel").style.display = "block";

    console.log(
      `✅ Hatırlatıcılar yüklendi: ${bugunVadesi.length} bugün, ${yakinVadesi.length} yakın, ${gecmisVadesi.length} gecikmiş`
    );
  } catch (error) {
    console.error("❌ Hatırlatıcı yükleme hatası:", error);
  }
}

function hatirlaticiKapat() {
  document.getElementById("odemeHatirlaticiPanel").style.display = "none";
}

function hatirlaticiClick(geziId) {
  console.log("🔔 Hatırlatıcı tıklandı, Gezi ID:", geziId);
  hatirlaticiKapat();
  geziOdeme(geziId);
}

// Sayfa yüklendiğinde hatırlatıcıları yükle
document.addEventListener("DOMContentLoaded", async () => {
  // 3 saniye bekle sonra hatırlatıcıları yükle
  setTimeout(() => {
    loadOdemeHatirlaticlari();
  }, 3000);

  // Her 5 dakikada bir güncelle
  setInterval(() => {
    loadOdemeHatirlaticlari();
  }, 300000); // 5 dakika = 300000ms
});

// ==========================================
// PASAPORT YÖNETİMİ SİSTEMİ
// ==========================================

let currentPasaportGeziId = null;
let currentPasaportTab = "kafile";
let pasaportKatilimcilar = [];
let currentPasaportDuzenleId = null;

// ==========================================
// PASAPORT MODAL AÇ
// ==========================================

async function geziPasaport(geziId) {
  try {
    console.log("🛂 Pasaport yönetimi açılıyor, Gezi ID:", geziId);
    currentPasaportGeziId = geziId;

    // Gezi bilgilerini çek
    const geziResult = await window.electronAPI.dbQuery(
      "SELECT gezi_adi, gezi_turu FROM geziler WHERE id = ?",
      [geziId]
    );

    if (
      !geziResult.success ||
      !geziResult.data ||
      geziResult.data.length === 0
    ) {
      Bildirim.goster("error", "Gezi bulunamadı!");
      return;
    }

    const gezi = geziResult.data[0];

    // Yurt içi geziyse engelle
    if (gezi.gezi_turu === "yurt_ici") {
      Bildirim.goster(
        "warning",
        "Pasaport yönetimi sadece yurt dışı gezileri için kullanılabilir!"
      );
      return;
    }

    document.getElementById(
      "pasaportModalTitle"
    ).textContent = `${gezi.gezi_adi} - Pasaport Yönetimi`;

    // Katılımcıları yükle
    await loadPasaportKatilimcilar(geziId);

    // Modalı aç
    document.getElementById("pasaportModal").style.display = "flex";

    console.log("✅ Pasaport modal açıldı");
  } catch (error) {
    console.error("❌ Pasaport modal açma hatası:", error);
    Bildirim.goster("error", "Pasaport yönetimi açılırken hata oluştu!");
  }
}

function closePasaportModal() {
  document.getElementById("pasaportModal").style.display = "none";
  currentPasaportGeziId = null;
  pasaportKatilimcilar = [];
}
// ==========================================
// KATILIMCILARI YÜKLE
// ==========================================

async function loadPasaportKatilimcilar(geziId) {
  try {
    console.log("🔄 Pasaport katılımcıları yükleniyor...");

    pasaportKatilimcilar = [];

    // 1. GEZİ BİLGİLERİNİ ÇEK (Kafİle Başkanı için)
    const geziResult = await window.electronAPI.dbQuery(
      "SELECT kafile_baskani_id FROM geziler WHERE id = ?",
      [geziId]
    );

    if (geziResult.success && geziResult.data && geziResult.data.length > 0) {
      const kafileBaskanId = geziResult.data[0].kafile_baskani_id;

      // Kafİle başkanını yükle
      const kafileResult = await window.electronAPI.dbQuery(
        "SELECT id, ad_soyad, tc_no FROM ogretmenler WHERE id = ?",
        [kafileBaskanId]
      );

      if (
        kafileResult.success &&
        kafileResult.data &&
        kafileResult.data.length > 0
      ) {
        const k = kafileResult.data[0];
        pasaportKatilimcilar.push({
          kisi_id: k.id,
          ad_soyad: k.ad_soyad,
          tc_kimlik: k.tc_no,
          kisi_tipi: "kafile_baskani",
          secili: false,
          pasaport: null,
        });
        console.log(`✅ 1 kafİle başkanı yüklendi: ${k.ad_soyad}`);
      }
    }

    // 2. SORUMLU ÖĞRETMEN(LER)İ YÜKLE
    const ogretmenResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad_soyad, o.tc_no
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       WHERE go.gezi_id = ?`,
      [geziId]
    );

    if (ogretmenResult.success && ogretmenResult.data) {
      ogretmenResult.data.forEach((o) => {
        // Kafİle başkanı zaten ekli mi kontrol et
        const mevcutMu = pasaportKatilimcilar.find(
          (k) => k.kisi_tipi === "kafile_baskani" && k.kisi_id === o.id
        );

        if (!mevcutMu) {
          pasaportKatilimcilar.push({
            kisi_id: o.id,
            ad_soyad: o.ad_soyad,
            tc_kimlik: o.tc_no,
            kisi_tipi: "ogretmen",
            secili: false,
            pasaport: null,
          });
        }
      });
      console.log(`✅ ${ogretmenResult.data.length} sorumlu öğretmen yüklendi`);
    }

    // 3. ÖĞRENCİLERİ YÜKLE (ad ve soyad ayrı!)
    const ogrenciResult = await window.electronAPI.dbQuery(
      `SELECT o.id, (o.ad || ' ' || o.soyad) as ad_soyad, o.tc_no
       FROM gezi_ogrenciler go
       INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
       WHERE go.gezi_id = ?`,
      [geziId]
    );

    if (ogrenciResult.success && ogrenciResult.data) {
      ogrenciResult.data.forEach((o) => {
        pasaportKatilimcilar.push({
          kisi_id: o.id,
          ad_soyad: o.ad_soyad,
          tc_kimlik: o.tc_no,
          kisi_tipi: "ogrenci",
          secili: false,
          pasaport: null,
        });
      });
      console.log(`✅ ${ogrenciResult.data.length} öğrenci yüklendi`);
    }

    // 4. MİSAFİRLERİ YÜKLE
    const misafirResult = await window.electronAPI.dbQuery(
      `SELECT id, ad_soyad, tc_no
       FROM gezi_misafirler
       WHERE gezi_id = ?`,
      [geziId]
    );

    if (misafirResult.success && misafirResult.data) {
      misafirResult.data.forEach((m) => {
        pasaportKatilimcilar.push({
          kisi_id: m.id,
          ad_soyad: m.ad_soyad,
          tc_kimlik: m.tc_no,
          kisi_tipi: "misafir",
          secili: false,
          pasaport: null,
        });
      });
      console.log(`✅ ${misafirResult.data.length} misafir yüklendi`);
    }

    // 5. PASAPORT BİLGİLERİNİ YÜKLE
    const pasaportResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_pasaportlar WHERE gezi_id = ?",
      [geziId]
    );

    if (pasaportResult.success && pasaportResult.data) {
      pasaportResult.data.forEach((p) => {
        const kisi = pasaportKatilimcilar.find(
          (k) => k.kisi_tipi === p.kisi_tipi && k.kisi_id === p.kisi_id
        );
        if (kisi) {
          kisi.pasaport = p;
        }
      });
      console.log(`✅ ${pasaportResult.data.length} pasaport bilgisi yüklendi`);
    }

    // 6. ÖZET SAYILARI GÜNCELLE
    updatePasaportOzetler();

    // 7. İLK SEKMEYİ GÖSTER
    pasaportTabDegistir("kafile");

    console.log(`✅ TOPLAM ${pasaportKatilimcilar.length} katılımcı yüklendi`);
    console.log("📊 Detay:", {
      kafile: pasaportKatilimcilar.filter(
        (k) => k.kisi_tipi === "kafile_baskani"
      ).length,
      ogretmen: pasaportKatilimcilar.filter((k) => k.kisi_tipi === "ogretmen")
        .length,
      ogrenci: pasaportKatilimcilar.filter((k) => k.kisi_tipi === "ogrenci")
        .length,
      misafir: pasaportKatilimcilar.filter((k) => k.kisi_tipi === "misafir")
        .length,
    });
  } catch (error) {
    console.error("❌ Katılımcı yükleme hatası:", error);
  }
}

function updatePasaportOzetler() {
  const kafile = pasaportKatilimcilar.filter(
    (k) => k.kisi_tipi === "kafile_baskani"
  ).length;
  const ogretmen = pasaportKatilimcilar.filter(
    (k) => k.kisi_tipi === "ogretmen"
  ).length;
  const ogrenci = pasaportKatilimcilar.filter(
    (k) => k.kisi_tipi === "ogrenci"
  ).length;
  const misafir = pasaportKatilimcilar.filter(
    (k) => k.kisi_tipi === "misafir"
  ).length;

  document.getElementById("pasaportKafSayi").textContent = kafile;
  document.getElementById("pasaportOgrSayi").textContent = ogretmen;
  document.getElementById("pasaportOgrenciSayi").textContent = ogrenci;
  document.getElementById("pasaportMisSayi").textContent = misafir;

  document.getElementById("tabKafSayi").textContent = kafile;
  document.getElementById("tabOgrSayi").textContent = ogretmen;
  document.getElementById("tabOgrenciSayi").textContent = ogrenci;
  document.getElementById("tabMisSayi").textContent = misafir;
}

// ==========================================
// SEKME DEĞİŞTİR
// ==========================================

function pasaportTabDegistir(tab) {
  currentPasaportTab = tab;

  // Aktif sekme
  document.querySelectorAll(".pasaport-tab").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");

  // Listeyi render et
  renderPasaportListesi();
}

// ==========================================
// LİSTE RENDER
// ==========================================

function renderPasaportListesi() {
  const container = document.getElementById("pasaportListesi");

  let filtered = pasaportKatilimcilar;

  if (currentPasaportTab === "kafile") {
    filtered = pasaportKatilimcilar.filter(
      (k) => k.kisi_tipi === "kafile_baskani"
    );
  } else if (currentPasaportTab === "ogretmen") {
    filtered = pasaportKatilimcilar.filter((k) => k.kisi_tipi === "ogretmen");
  } else if (currentPasaportTab === "ogrenci") {
    filtered = pasaportKatilimcilar.filter((k) => k.kisi_tipi === "ogrenci");
  } else if (currentPasaportTab === "misafir") {
    filtered = pasaportKatilimcilar.filter((k) => k.kisi_tipi === "misafir");
  }

  if (filtered.length === 0) {
    container.innerHTML =
      '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #9ca3af;">Bu kategoride katılımcı yok</td></tr>';
    updateSeciliSayisi();
    return;
  }

  const bugun = new Date();

  container.innerHTML = filtered
    .map((kisi, index) => {
      const p = kisi.pasaport;

      // Geçerlilik kontrolü
      let gecerlilikBadge = "";
      if (p && p.son_gecerlilik_tarihi) {
        const gecerlilik = new Date(p.son_gecerlilik_tarihi);
        const gunFark = Math.ceil((gecerlilik - bugun) / (1000 * 60 * 60 * 24));

        if (gunFark < 0) {
          gecerlilikBadge =
            '<span class="gecerlilik-badge dolmus">❌ Süresi Dolmuş</span>';
        } else if (gunFark <= 180) {
          gecerlilikBadge =
            '<span class="gecerlilik-badge yaklasan">⚠️ 6 Ay İçinde</span>';
        } else {
          gecerlilikBadge = `<span class="gecerlilik-badge gecerli">✅ ${formatDate(
            p.son_gecerlilik_tarihi
          )}</span>`;
        }
      } else {
        gecerlilikBadge = '<span style="color: #9ca3af;">-</span>';
      }

      // Pasaport türü badge
      let turuBadge = "";
      if (p && p.pasaport_turu) {
        const turler = {
          bordo: "📕 Bordo",
          gri: "📘 Gri",
          yesil: "📗 Yeşil",
        };
        turuBadge = `<span class="pasaport-turu-badge ${p.pasaport_turu}">${
          turler[p.pasaport_turu]
        }</span>`;
      } else {
        turuBadge = `
        <select class="pasaport-select-mini" data-index="${index}" data-field="pasaport_turu">
          <option value="">Seçiniz</option>
          <option value="bordo">📕 Bordo</option>
          <option value="gri">📘 Gri</option>
          <option value="yesil">📗 Yeşil</option>
        </select>
      `;
      }

      // Vize durumu
      let vizeBadge = "";
      if (p && p.vize_durumu) {
        const vizeDurumlar = {
          bekliyor: "⏳ Bekliyor",
          basvuruldu: "📝 Başvuruldu",
          alindi: "✅ Alındı",
          reddedildi: "❌ Reddedildi",
        };
        vizeBadge = `<span class="vize-badge ${p.vize_durumu}">${
          vizeDurumlar[p.vize_durumu]
        }</span>`;
      } else {
        vizeBadge = '<span style="color: #9ca3af;">Bekliyor</span>';
      }

      // Çifte vatandaşlık
      let cifteBadge = "";
      if (p && p.cift_vatandaslik === 1) {
        cifteBadge = '<span class="cifte-badge">🌍 Çifte</span>';
      } else {
        cifteBadge = '<span style="color: #9ca3af;">-</span>';
      }

      return `
      <tr class="${kisi.secili ? "selected" : ""}">
        <td>
          <input type="checkbox" ${
            kisi.secili ? "checked" : ""
          } onchange="pasaportCheckToggle(${index})" />
        </td>
        <td><strong>${kisi.ad_soyad}</strong></td>
        <td>
          ${
            p
              ? p.tc_kimlik || kisi.tc_kimlik || "-"
              : `
            <input type="text" class="pasaport-input-mini" data-index="${index}" data-field="tc_kimlik" 
             value="${
               kisi.tc_kimlik || ""
             }" placeholder="12345678901" maxlength="11" />
          `
          }
        </td>
        <td>
          ${
            p
              ? p.pasaport_seri
              : `
            <input type="text" class="pasaport-input-mini" data-index="${index}" data-field="pasaport_seri" 
             placeholder="S" maxlength="1" style="text-transform: uppercase;" />
          `
          }
        </td>
        <td>
          ${
            p
              ? p.pasaport_no
              : `
            <input type="text" class="pasaport-input-mini" data-index="${index}" data-field="pasaport_no" 
             placeholder="123456" maxlength="9" />
          `
          }
        </td>
        <td>${turuBadge}</td>
        <td>${gecerlilikBadge}</td>
        <td>${cifteBadge}</td>
        <td>${vizeBadge}</td>
        <td>
          ${
            p
              ? `
            <div class="pasaport-aksiyonlar">
              <button class="btn-pasaport-aksiyon btn-pasaport-duzenle" onclick="pasaportDuzenle(${p.id})">
                ✏️ Düzenle
              </button>
              <button class="btn-pasaport-aksiyon btn-pasaport-sil" onclick="pasaportSil(${p.id})">
                🗑️ Sil
              </button>
            </div>
          `
              : `
            <button class="btn-pasaport-aksiyon btn-pasaport-duzenle" onclick="pasaportEkle(${index})">
              ➕ Ekle
            </button>
          `
          }
        </td>
      </tr>
    `;
    })
    .join("");

  updateSeciliSayisi();
}

// ==========================================
// SEÇİM İŞLEMLERİ
// ==========================================

function pasaportCheckToggle(index) {
  const filtered = getCurrentFilteredList();
  filtered[index].secili = !filtered[index].secili;
  renderPasaportListesi();
}

function pasaportCheckAllToggle() {
  const checked = document.getElementById("pasaportCheckAll").checked;
  const filtered = getCurrentFilteredList();

  filtered.forEach((k) => {
    k.secili = checked;
  });

  renderPasaportListesi();
}

function pasaportHepsiniSec() {
  const filtered = getCurrentFilteredList();
  filtered.forEach((k) => (k.secili = true));
  document.getElementById("pasaportCheckAll").checked = true;
  renderPasaportListesi();
}

function pasaportSecimiTemizle() {
  const filtered = getCurrentFilteredList();
  filtered.forEach((k) => (k.secili = false));
  document.getElementById("pasaportCheckAll").checked = false;
  renderPasaportListesi();
}

function getCurrentFilteredList() {
  if (currentPasaportTab === "kafile") {
    return pasaportKatilimcilar.filter((k) => k.kisi_tipi === "kafile_baskani");
  } else if (currentPasaportTab === "ogretmen") {
    return pasaportKatilimcilar.filter((k) => k.kisi_tipi === "ogretmen");
  } else if (currentPasaportTab === "ogrenci") {
    return pasaportKatilimcilar.filter((k) => k.kisi_tipi === "ogrenci");
  } else if (currentPasaportTab === "misafir") {
    return pasaportKatilimcilar.filter((k) => k.kisi_tipi === "misafir");
  }
  return [];
}

function updateSeciliSayisi() {
  const secili = pasaportKatilimcilar.filter((k) => k.secili).length;
  document.getElementById("seciliSayisi").textContent = `${secili} kişi seçili`;
}

// ==========================================
// TOPLU PASAPORT KAYDET
// ==========================================

async function topluPasaportKaydet() {
  try {
    const secililer = pasaportKatilimcilar.filter(
      (k) => k.secili && !k.pasaport
    );

    if (secililer.length === 0) {
      Bildirim.goster("warning", "Lütfen pasaportu olmayan kişileri seçin!");
      return;
    }

    console.log(
      "💾 Toplu pasaport kaydı başlıyor...",
      secililer.length,
      "kişi"
    );

    let basarili = 0;
    let hatali = 0;

    for (const kisi of secililer) {
      // Input alanlarından verileri topla
      const inputs = document.querySelectorAll(`input[data-index]`);
      const selects = document.querySelectorAll(`select[data-index]`);

      const index = getCurrentFilteredList().findIndex(
        (k) => k.kisi_id === kisi.kisi_id && k.kisi_tipi === kisi.kisi_tipi
      );

      let tc = kisi.tc_kimlik;
      let seri = "";
      let no = "";
      let turu = "";

      inputs.forEach((input) => {
        if (parseInt(input.dataset.index) === index) {
          if (input.dataset.field === "tc_kimlik") tc = input.value.trim();
          if (input.dataset.field === "pasaport_seri")
            seri = input.value.trim().toUpperCase();
          if (input.dataset.field === "pasaport_no") no = input.value.trim();
        }
      });

      selects.forEach((select) => {
        if (parseInt(select.dataset.index) === index) {
          if (select.dataset.field === "pasaport_turu") turu = select.value;
        }
      });

      // Validasyon
      if (!seri || !no || !turu) {
        console.log(`⚠️ ${kisi.ad_soyad}: Eksik bilgi`);
        hatali++;
        continue;
      }

      // Kaydet
      try {
        await window.electronAPI.dbQuery(
          `INSERT INTO gezi_pasaportlar 
            (gezi_id, kisi_tipi, kisi_id, ad_soyad, tc_kimlik, pasaport_seri, pasaport_no, 
             pasaport_turu, son_gecerlilik_tarihi, cift_vatandaslik, vize_durumu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now', '+10 years'), 0, 'bekliyor')`,
          [
            currentPasaportGeziId,
            kisi.kisi_tipi,
            kisi.kisi_id,
            kisi.ad_soyad,
            tc,
            seri,
            no,
            turu,
          ]
        );
        basarili++;
      } catch (err) {
        console.error(`❌ ${kisi.ad_soyad} kaydedilemedi:`, err);
        hatali++;
      }
    }

    if (basarili > 0) {
      Bildirim.goster(
        "success",
        `✅ ${basarili} kişinin pasaportu kaydedildi!`
      );
      await loadPasaportKatilimcilar(currentPasaportGeziId);
    }

    if (hatali > 0) {
      Bildirim.goster("warning", `⚠️ ${hatali} kişi için hata oluştu!`);
    }
  } catch (error) {
    console.error("❌ Toplu kayıt hatası:", error);
    Bildirim.goster("error", "Toplu kayıt sırasında hata oluştu!");
  }
}

// ==========================================
// PASAPORT EKLE/DÜZENLE MODAL
// ==========================================

function pasaportEkle(index) {
  const filtered = getCurrentFilteredList();
  const kisi = filtered[index];

  openPasaportDuzenleModal(kisi, null);
}

async function pasaportDuzenle(pasaportId) {
  try {
    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_pasaportlar WHERE id = ?",
      [pasaportId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      Bildirim.goster("error", "Pasaport bulunamadı!");
      return;
    }

    const pasaport = result.data[0];
    const kisi = pasaportKatilimcilar.find(
      (k) =>
        k.kisi_tipi === pasaport.kisi_tipi && k.kisi_id === pasaport.kisi_id
    );

    openPasaportDuzenleModal(kisi, pasaport);
  } catch (error) {
    console.error("❌ Pasaport düzenleme hatası:", error);
    Bildirim.goster("error", "Pasaport yüklenemedi!");
  }
}

function openPasaportDuzenleModal(kisi, pasaport) {
  currentPasaportDuzenleId = pasaport ? pasaport.id : null;

  // Başlık
  document.getElementById("pasaportDuzenleTitle").textContent = pasaport
    ? `${kisi.ad_soyad} - Pasaport Düzenle`
    : `${kisi.ad_soyad} - Pasaport Ekle`;

  // Kişi bilgileri
  document.getElementById("duzenleAdSoyad").value = kisi.ad_soyad;
  document.getElementById("duzenleTcKimlik").value = pasaport
    ? pasaport.tc_kimlik || kisi.tc_kimlik || ""
    : kisi.tc_kimlik || "";

  // Birinci pasaport
  document.getElementById("duzenlePasaportSeri").value = pasaport
    ? pasaport.pasaport_seri
    : "";
  document.getElementById("duzenlePasaportNo").value = pasaport
    ? pasaport.pasaport_no
    : "";
  document.getElementById("duzenlePasaportTuru").value = pasaport
    ? pasaport.pasaport_turu
    : "";
  document.getElementById("duzenleGecerlilik").value = pasaport
    ? pasaport.son_gecerlilik_tarihi
    : "";

  // İkinci pasaport
  const ciftVatandaslik = pasaport && pasaport.cift_vatandaslik === 1;
  document.getElementById("duzenleCifteVatandaslik").checked = ciftVatandaslik;
  document.getElementById("ikinciPasaportAlanlari").style.display =
    ciftVatandaslik ? "block" : "none";

  if (ciftVatandaslik) {
    document.getElementById("duzenleIkinciSeri").value =
      pasaport.ikinci_pasaport_seri || "";
    document.getElementById("duzenleIkinciNo").value =
      pasaport.ikinci_pasaport_no || "";
    document.getElementById("duzenleIkinciTuru").value =
      pasaport.ikinci_pasaport_turu || "";
    document.getElementById("duzenleIkinciGecerlilik").value =
      pasaport.ikinci_gecerlilik_tarihi || "";
  }

  // Vize bilgileri
  document.getElementById("duzenleVizeDurum").value = pasaport
    ? pasaport.vize_durumu
    : "bekliyor";
  document.getElementById("duzenleVizeTarih").value = pasaport
    ? pasaport.vize_tarihi || ""
    : "";
  document.getElementById("duzenleVizeNotlar").value = pasaport
    ? pasaport.vize_notlar || ""
    : "";

  // Notlar
  document.getElementById("duzenleNotlar").value = pasaport
    ? pasaport.notlar || ""
    : "";

  // Modalı aç
  document.getElementById("pasaportDuzenleModal").style.display = "flex";
}

function closePasaportDuzenleModal() {
  document.getElementById("pasaportDuzenleModal").style.display = "none";
  currentPasaportDuzenleId = null;
}

function toggleIkinciPasaport() {
  const checked = document.getElementById("duzenleCifteVatandaslik").checked;
  document.getElementById("ikinciPasaportAlanlari").style.display = checked
    ? "block"
    : "none";
}

// ==========================================
// PASAPORT KAYDET
// ==========================================

async function pasaportKaydet() {
  try {
    console.log("💾 Pasaport kaydediliyor...");

    // Validasyon
    const seri = document
      .getElementById("duzenlePasaportSeri")
      .value.trim()
      .toUpperCase();
    const no = document.getElementById("duzenlePasaportNo").value.trim();
    const turu = document.getElementById("duzenlePasaportTuru").value;
    const gecerlilik = document.getElementById("duzenleGecerlilik").value;

    if (!seri || !no || !turu || !gecerlilik) {
      Bildirim.goster(
        "warning",
        "Pasaport seri, no, tür ve geçerlilik tarihi zorunludur!"
      );
      return;
    }

    // Seri kontrolü (1 harf)
    if (seri.length !== 1 || !/^[A-Z]$/.test(seri)) {
      Bildirim.goster("warning", "Pasaport serisi 1 harf olmalıdır (A-Z)!");
      return;
    }

    // No kontrolü (6-9 rakam)
    if (no.length < 6 || no.length > 9 || !/^\d+$/.test(no)) {
      Bildirim.goster("warning", "Pasaport numarası 6-9 rakam olmalıdır!");
      return;
    }

    // Geçerlilik kontrolü
    const gecerlilikTarih = new Date(gecerlilik);
    const bugun = new Date();
    if (gecerlilikTarih <= bugun) {
      Bildirim.goster("warning", "Geçerlilik tarihi gelecekte olmalıdır!");
      return;
    }

    const adSoyad = document.getElementById("duzenleAdSoyad").value;
    const tcKimlik =
      document.getElementById("duzenleTcKimlik").value.trim() || null;

    const ciftVatandaslik = document.getElementById("duzenleCifteVatandaslik")
      .checked
      ? 1
      : 0;
    let ikinciSeri = null;
    let ikinciNo = null;
    let ikinciTuru = null;
    let ikinciGecerlilik = null;

    if (ciftVatandaslik) {
      ikinciSeri =
        document
          .getElementById("duzenleIkinciSeri")
          .value.trim()
          .toUpperCase() || null;
      ikinciNo =
        document.getElementById("duzenleIkinciNo").value.trim() || null;
      ikinciTuru = document.getElementById("duzenleIkinciTuru").value || null;
      ikinciGecerlilik =
        document.getElementById("duzenleIkinciGecerlilik").value || null;
    }

    const vizeDurum = document.getElementById("duzenleVizeDurum").value;
    const vizeTarih = document.getElementById("duzenleVizeTarih").value || null;
    const vizeNotlar =
      document.getElementById("duzenleVizeNotlar").value.trim() || null;
    const notlar =
      document.getElementById("duzenleNotlar").value.trim() || null;

    if (currentPasaportDuzenleId) {
      // GÜNCELLEME
      await window.electronAPI.dbQuery(
        `UPDATE gezi_pasaportlar SET
          tc_kimlik = ?, pasaport_seri = ?, pasaport_no = ?, pasaport_turu = ?,
          son_gecerlilik_tarihi = ?, cift_vatandaslik = ?,
          ikinci_pasaport_seri = ?, ikinci_pasaport_no = ?, ikinci_pasaport_turu = ?,
          ikinci_gecerlilik_tarihi = ?, vize_durumu = ?, vize_tarihi = ?,
          vize_notlar = ?, notlar = ?
          WHERE id = ?`,
        [
          tcKimlik,
          seri,
          no,
          turu,
          gecerlilik,
          ciftVatandaslik,
          ikinciSeri,
          ikinciNo,
          ikinciTuru,
          ikinciGecerlilik,
          vizeDurum,
          vizeTarih,
          vizeNotlar,
          notlar,
          currentPasaportDuzenleId,
        ]
      );
      Bildirim.goster("success", "🛂 Pasaport güncellendi!");
    } else {
      // YENİ KAYIT
      // Kişi bilgilerini bul
      const kisiAdSoyad = document.getElementById("duzenleAdSoyad").value;
      const kisi = pasaportKatilimcilar.find((k) => k.ad_soyad === kisiAdSoyad);

      if (!kisi) {
        Bildirim.goster("error", "Kişi bulunamadı!");
        return;
      }

      await window.electronAPI.dbQuery(
        `INSERT INTO gezi_pasaportlar 
          (gezi_id, kisi_tipi, kisi_id, ad_soyad, tc_kimlik, pasaport_seri, pasaport_no,
           pasaport_turu, son_gecerlilik_tarihi, cift_vatandaslik,
           ikinci_pasaport_seri, ikinci_pasaport_no, ikinci_pasaport_turu,
           ikinci_gecerlilik_tarihi, vize_durumu, vize_tarihi, vize_notlar, notlar)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          currentPasaportGeziId,
          kisi.kisi_tipi,
          kisi.kisi_id,
          kisi.ad_soyad,
          tcKimlik,
          seri,
          no,
          turu,
          gecerlilik,
          ciftVatandaslik,
          ikinciSeri,
          ikinciNo,
          ikinciTuru,
          ikinciGecerlilik,
          vizeDurum,
          vizeTarih,
          vizeNotlar,
          notlar,
        ]
      );
      Bildirim.goster("success", "🛂 Pasaport eklendi!");
    }

    closePasaportDuzenleModal();
    await loadPasaportKatilimcilar(currentPasaportGeziId);
  } catch (error) {
    console.error("❌ Pasaport kaydetme hatası:", error);
    Bildirim.goster("error", "Pasaport kaydedilirken hata oluştu!");
  }
}

// ==========================================
// PASAPORT SİL
// ==========================================

async function pasaportSil(pasaportId) {
  if (!confirm("Bu pasaport bilgisini silmek istediğinizden emin misiniz?")) {
    return;
  }

  try {
    await window.electronAPI.dbQuery(
      "DELETE FROM gezi_pasaportlar WHERE id = ?",
      [pasaportId]
    );

    Bildirim.goster("success", "🗑️ Pasaport silindi!");
    await loadPasaportKatilimcilar(currentPasaportGeziId);
  } catch (error) {
    console.error("❌ Pasaport silme hatası:", error);
    Bildirim.goster("error", "Pasaport silinirken hata oluştu!");
  }
}

// ==========================================
// PASAPORT EKSİK UYARISI (ANA SAYFA)
// ==========================================

async function checkPasaportEksikleri() {
  try {
    // Yurt dışı gezilerini kontrol et
    const geziResult = await window.electronAPI.dbQuery(
      `SELECT g.id, g.gezi_adi,
        (SELECT COUNT(*) FROM gezi_kafile_baskanlari WHERE gezi_id = g.id) +
        (SELECT COUNT(*) FROM gezi_ogretmenler WHERE gezi_id = g.id) +
        (SELECT COUNT(*) FROM gezi_ogrenciler WHERE gezi_id = g.id) +
        (SELECT COUNT(*) FROM gezi_misafirler WHERE gezi_id = g.id) as toplam_katilimci,
        (SELECT COUNT(*) FROM gezi_pasaportlar WHERE gezi_id = g.id) as pasaport_sayisi
       FROM geziler g
       WHERE g.gezi_turu = 'yurt_disi' AND g.gezi_durumu = 'aktif'`
    );

    if (!geziResult.success || !geziResult.data) return;

    const eksikGeziler = geziResult.data.filter(
      (g) => g.pasaport_sayisi < g.toplam_katilimci
    );

    if (eksikGeziler.length > 0) {
      const toplamEksik = eksikGeziler.reduce(
        (sum, g) => sum + (g.toplam_katilimci - g.pasaport_sayisi),
        0
      );

      // Uyarı banner'ı göster
      const banner = document.createElement("div");
      banner.className = "pasaport-uyari-banner";
      banner.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>⚠️ ${eksikGeziler.length} yurt dışı gezisi için ${toplamEksik} kişinin pasaportu eksik!</span>
      `;
      banner.onclick = () => {
        geziPasaport(eksikGeziler[0].id);
        banner.remove();
      };

      document.body.appendChild(banner);

      // 10 saniye sonra otomatik kapat
      setTimeout(() => {
        if (banner.parentNode) {
          banner.remove();
        }
      }, 10000);
    }
  } catch (error) {
    console.error("❌ Pasaport eksik kontrolü hatası:", error);
  }
}

// Sayfa yüklendiğinde kontrol et
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    checkPasaportEksikleri();
  }, 5000);
});
// ==========================================
// GEZİ RAPORLARI SAYFASINI AÇ
// ==========================================

function geziRaporlar(geziId) {
  console.log("📊 Raporlar açılıyor, Gezi ID:", geziId);

  // Gezi raporları sayfasını aç (geziId parametresiyle)
  window.location.href = `gezi-raporlar/gezi-raporlar.html?geziId=${geziId}`;
}

console.log("✅ Gezi Planlama JS yüklendi");
