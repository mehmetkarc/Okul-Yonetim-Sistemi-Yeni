// ==========================================
// ÖĞRETMEN NÖBET SİSTEMİ
// ==========================================

const { ipcRenderer } = require("electron");

// ==========================================
// GLOBAL DEĞİŞKENLER
// ==========================================

let ogretmenler = []; // Tüm öğretmenler
let nobetYerleri = []; // Nöbet yerleri
let nobetAtamalari = {}; // { yerID: { gun: [ogretmenID, ...] } }
let pasifOgretmenler = []; // Pasif öğretmen ID'leri
let pasifOgretmenDetay = {}; // { ogretmenId: { neden, aciklama, baslangic, bitis } }
let aciklamalar = []; // ← EKLE
let currentProgram = null; // Aktif program
let dersProgrami = null; // otomatik-dagitim.html'den gelen ders programı

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Nöbet sistemi başlatılıyor...");

  try {
    // Tarihleri ayarla
    setDefaultDates();

    // Verileri yükle (sıralama önemli!)
    await loadOgretmenler(); // 1. Öğretmenler
    await loadNobetYerleri(); // 2. Nöbet yerleri
    await loadPasifOgretmenler(); // 3. Pasif öğretmenler
    await loadAciklamalar(); // 4. Açıklamalar
    await loadGunTercihleri(); // 5. Gün tercihleri ← YENİ EKLE
    loadDersProgrami(); // 6. Ders programı (localStorage)

    // Event listener'ları ekle
    initEventListeners();

    // UI'ı render et (tüm veriler yüklendikten sonra)
    renderOgretmenler();
    renderNobetYerleri();
    renderPasifOgretmenler();
    renderAciklamalar();
    renderNobetTable();

    // İstatistikleri güncelle
    updateStats();

    console.log("✅ Nöbet sistemi hazır!");
    console.log(`📊 ${ogretmenler.length} öğretmen`);
    console.log(`📍 ${nobetYerleri.length} nöbet yeri`);
    console.log(`🚫 ${pasifOgretmenler.length} pasif öğretmen`);
    console.log(`📝 ${aciklamalar.length} açıklama`);
    console.log(
      `📅 ${
        Object.keys(ogretmenGunTercihleri).length
      } öğretmen için gün tercihi`
    ); // ← YENİ EKLE
  } catch (error) {
    console.error("❌ Başlatma hatası:", error);
    Bildirim.goster("error", "❌ Sistem başlatılamadı!");
  }
});
// ==========================================
// VERİ YÜKLEME
// ==========================================

async function loadData() {
  try {
    console.log("📂 Veriler yükleniyor...");

    // Öğretmenleri yükle
    await loadOgretmenler();

    // Nöbet yerlerini yükle
    await loadNobetYerleri();

    // Ders programını yükle (otomatik-dagitim.html'den)
    await loadDersProgrami();

    // Pasif öğretmenleri yükle
    await loadPasifOgretmenler();

    // Gün tercihlerini yükle
    await loadGunTercihleri(); // ← YENİ EKLE

    console.log("✅ Veriler yüklendi");
  } catch (error) {
    console.error("❌ Veri yükleme hatası:", error);
    Bildirim.goster("error", "Veriler yüklenirken hata oluştu!");
  }
}

// Öğretmenleri yükle
async function loadOgretmenler() {
  try {
    console.log("📂 Öğretmenler yükleniyor...");

    // Preload API kullan
    const result = await window.electronAPI.getAllTeachers();

    if (result && result.success && result.data && result.data.length > 0) {
      ogretmenler = result.data;
      console.log(`✅ ${ogretmenler.length} öğretmen yüklendi (Veritabanı)`);
    } else {
      console.warn("⚠️ Veritabanından öğretmen bulunamadı!");
      ogretmenler = [];
      Bildirim.goster(
        "warning",
        "⚠️ Öğretmen bulunamadı! Lütfen önce öğretmen ekleyin."
      );
    }
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
    ogretmenler = [];
    Bildirim.goster("error", "❌ Öğretmenler yüklenirken hata oluştu!");
  }
}
// Nöbet yerlerini yükle
async function loadNobetYerleri() {
  try {
    console.log("📂 Nöbet yerleri yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM nobet_yerleri WHERE durum = 1 ORDER BY sira ASC",
      []
    );

    if (result.success && result.data && result.data.length > 0) {
      nobetYerleri = result.data;
      console.log(`✅ ${nobetYerleri.length} nöbet yeri yüklendi (Veritabanı)`);
    } else {
      // Varsayılan nöbet yerlerini veritabanına ekle
      console.log("📋 Varsayılan nöbet yerleri oluşturuluyor...");

      const varsayilanYerler = [
        {
          yer_adi: "Nöbetçi Müdür Yardımcısı",
          aciklama: "Manuel atama",
          sira: 0,
        },
        { yer_adi: "Ön Bahçe", aciklama: "", sira: 1 },
        { yer_adi: "Yan Bahçe", aciklama: "", sira: 2 },
        { yer_adi: "Alt Bahçe", aciklama: "", sira: 3 },
        { yer_adi: "Atölye", aciklama: "", sira: 4 },
        { yer_adi: "Mavi Kat-1", aciklama: "", sira: 5 },
        { yer_adi: "Mavi Kat-2", aciklama: "", sira: 6 },
      ];

      for (const yer of varsayilanYerler) {
        await window.electronAPI.dbExec(
          "INSERT INTO nobet_yerleri (yer_adi, aciklama, sira) VALUES (?, ?, ?)",
          [yer.yer_adi, yer.aciklama, yer.sira]
        );
      }

      // Tekrar yükle
      const reloadResult = await window.electronAPI.dbQuery(
        "SELECT * FROM nobet_yerleri WHERE durum = 1 ORDER BY sira ASC",
        []
      );

      if (reloadResult.success && reloadResult.data) {
        nobetYerleri = reloadResult.data;
      }

      console.log(
        `✅ ${nobetYerleri.length} varsayılan nöbet yeri oluşturuldu`
      );
    }
  } catch (error) {
    console.error("❌ Nöbet yeri yükleme hatası:", error);
    nobetYerleri = [];
  }
}

// Ders programını yükle (localStorage'dan)
async function loadDersProgrami() {
  try {
    const programData = localStorage.getItem("currentSolution");

    if (programData) {
      dersProgrami = JSON.parse(programData);
      console.log("✅ Ders programı yüklendi");
    } else {
      console.warn(
        "⚠️ Ders programı bulunamadı (otomatik-dagitim.html'den kayıt yok)"
      );
      dersProgrami = null;
    }
  } catch (error) {
    console.error("❌ Ders programı yükleme hatası:", error);
    dersProgrami = null;
  }
}

// Pasif öğretmenleri yükle
async function loadPasifOgretmenler() {
  try {
    console.log("📂 Pasif öğretmenler yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM nobet_pasif_ogretmenler WHERE durum = 1",
      []
    );

    if (result.success && result.data && result.data.length > 0) {
      pasifOgretmenler = [];
      pasifOgretmenDetay = {};

      result.data.forEach((row) => {
        pasifOgretmenler.push(row.ogretmen_id);
        pasifOgretmenDetay[row.ogretmen_id] = {
          neden: row.neden,
          aciklama: row.aciklama,
          baslangic: row.baslangic_tarihi,
          bitis: row.bitis_tarihi,
        };
      });

      console.log(
        `✅ ${pasifOgretmenler.length} pasif öğretmen yüklendi (Veritabanı)`
      );
    } else {
      pasifOgretmenler = [];
      pasifOgretmenDetay = {};
      console.log("ℹ️ Pasif öğretmen bulunamadı");
    }
  } catch (error) {
    console.error("❌ Pasif öğretmen yükleme hatası:", error);
    pasifOgretmenler = [];
    pasifOgretmenDetay = {};
  }
}
function initEventListeners() {
  // Akıllı atama
  document
    .getElementById("btnAkilliAta")
    .addEventListener("click", akilliNobetAta);

  // Kaydet
  document
    .getElementById("btnKaydet")
    .addEventListener("click", kaydetNobetler);

  // Yazdır
  document.getElementById("btnYazdir").addEventListener("click", yazdirNobet);

  // Yeni program
  document
    .getElementById("btnYeniProgram")
    .addEventListener("click", yeniProgramOlustur);

  // Nöbet yeri ekle
  document
    .getElementById("btnNobetYeriEkle")
    .addEventListener("click", openNobetYeriModal);

  // Temizle
  document
    .getElementById("btnTemizle")
    .addEventListener("click", temizleNobetler);

  // Öğretmen arama
  document
    .getElementById("ogretmenAra")
    .addEventListener("input", filterOgretmenler);

  // Açıklama ekle
  document
    .getElementById("btnAciklamaEkle")
    .addEventListener("click", openAciklamaModal); // ← YENİ
}
// ==========================================
// UI RENDER
// ==========================================

function renderUI() {
  renderNobetYerleri();
  renderOgretmenler();
  renderPasifOgretmenler();
  renderNobetTable();
  renderAciklamalar(); // ← YENİ
}

// Nöbet yerlerini render et
function renderNobetYerleri() {
  const container = document.getElementById("nobetYerleriList");
  container.innerHTML = "";

  nobetYerleri.forEach((yer) => {
    const item = document.createElement("div");
    item.className = "nobet-yer-item";
    item.dataset.yerId = yer.id;

    item.innerHTML = `
      <div class="nobet-yer-info">
        <div class="nobet-yer-adi">${yer.yer_adi}</div>
        ${
          yer.aciklama
            ? `<div class="nobet-yer-aciklama">${yer.aciklama}</div>`
            : ""
        }
      </div>
      <div class="nobet-yer-actions">
        <div class="action-icon" onclick="silNobetYeri(${yer.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
      </div>
    `;

    container.appendChild(item);
  });
}

// Öğretmenleri render et
function renderOgretmenler() {
  const container = document.getElementById("ogretmenList");
  container.innerHTML = "";

  // Pasif olanları filtrele
  const aktifOgretmenler = ogretmenler.filter(
    (ogr) => !pasifOgretmenler.includes(ogr.id)
  );

  aktifOgretmenler.forEach((ogr) => {
    const item = document.createElement("div");
    item.className = "ogretmen-item";
    item.draggable = true;
    item.dataset.ogretmenId = ogr.id;

    // Avatar (erkek/kadın)
    const avatar = ogr.cinsiyet === "Kadın" ? "👩‍🏫" : "👨‍🏫";
    const avatarClass = ogr.cinsiyet === "Kadın" ? "female" : "";

    // Ünvan göster
    const unvan = ogr.unvan || "Öğretmen";

    item.innerHTML = `
      <div class="ogretmen-avatar ${avatarClass}">
        ${avatar}
      </div>
      <div class="ogretmen-info">
        <div class="ogretmen-adi">${ogr.ad_soyad}</div>
        <div class="ogretmen-meta">
          <span>${unvan}</span>
          <span>•</span>
          <span>${ogr.cinsiyet || "Belirtilmemiş"}</span>
        </div>
      </div>
      <div class="ogretmen-actions">
        <div class="action-icon" onclick="showDersProgrami(${
          ogr.id
        })" title="Ders Programı">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="4" x2="8" y2="22" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="action-icon" onclick="openPasifOgretmenModal(${
          ogr.id
        })" title="Pasif Yap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M4.93 4.93l14.14 14.14" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
      </div>
    `;

    // Drag events
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragend", handleDragEnd);

    container.appendChild(item);
  });

  // Sayıyı güncelle
  document.getElementById("ogretmenSayisi").textContent =
    aktifOgretmenler.length;
}
// Pasif öğretmenleri render et
function renderPasifOgretmenler() {
  const container = document.getElementById("pasifList");
  container.innerHTML = "";

  if (pasifOgretmenler.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Pasif öğretmen yok</div>';
    document.getElementById("pasifSayisi").textContent = "0";
    return;
  }

  pasifOgretmenler.forEach((id) => {
    const ogr = ogretmenler.find((o) => o.id === id);
    if (!ogr) return;

    // Pasif detayları al
    const detay = pasifOgretmenDetay[id] || {};
    const neden = detay.neden || "Belirtilmemiş";
    const baslangic = detay.baslangic || "-";
    const bitis = detay.bitis || "-";

    const item = document.createElement("div");
    item.className = "pasif-item";

    item.innerHTML = `
      <div class="pasif-header">
        <div class="pasif-adi">${ogr.ad_soyad}</div>
        <div class="action-icon" onclick="aktifYap(${ogr.id})" title="Aktif Yap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
      </div>
      <div class="pasif-neden">${neden}</div>
      <div class="pasif-tarih">${baslangic} - ${bitis}</div>
    `;

    container.appendChild(item);
  });

  document.getElementById("pasifSayisi").textContent = pasifOgretmenler.length;
}

// Aktif yap
async function aktifYap(ogretmenId) {
  try {
    console.log("🔄 Öğretmen aktif yapılıyor:", ogretmenId);

    // Veritabanından sil
    const result = await window.electronAPI.dbExec(
      "DELETE FROM nobet_pasif_ogretmenler WHERE ogretmen_id = ?",
      [ogretmenId]
    );

    if (result.success) {
      console.log("✅ Veritabanından silindi");

      // Pasif öğretmenleri tekrar yükle
      await loadPasifOgretmenler();

      renderOgretmenler();
      renderPasifOgretmenler();
      updateStats();

      Bildirim.goster("success", "✅ Öğretmen aktif yapıldı!");
    } else {
      console.error("❌ Veritabanından silinemedi:", result.message);
      Bildirim.goster("error", "❌ Silinemedi!");
    }
  } catch (error) {
    console.error("❌ Aktif yapma hatası:", error);
    Bildirim.goster("error", "❌ Hata oluştu!");
  }
}

// Nöbet tablosunu render et
function renderNobetTable() {
  const tbody = document.getElementById("nobetTableBody");
  tbody.innerHTML = "";

  const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

  nobetYerleri.forEach((yer) => {
    const row = document.createElement("tr");

    // Yer adı
    const yerCell = document.createElement("td");
    yerCell.textContent = yer.yer_adi;
    row.appendChild(yerCell);

    // Günler
    gunler.forEach((gun) => {
      const cell = document.createElement("td");
      const cellDiv = document.createElement("div");
      cellDiv.className = "nobet-cell";
      cellDiv.dataset.yerId = yer.id;
      cellDiv.dataset.gun = gun;

      // Drop events
      cellDiv.addEventListener("dragover", handleDragOver);
      cellDiv.addEventListener("dragleave", handleDragLeave);
      cellDiv.addEventListener("drop", handleDrop);

      // Atanmış öğretmenler varsa göster
      if (nobetAtamalari[yer.id] && nobetAtamalari[yer.id][gun]) {
        nobetAtamalari[yer.id][gun].forEach((ogretmenId) => {
          const ogr = ogretmenler.find((o) => o.id === ogretmenId);
          if (ogr) {
            const ogretmenDiv = createNobetOgretmenElement(ogr, yer.id, gun);
            cellDiv.appendChild(ogretmenDiv);
            cellDiv.classList.add("filled");
          }
        });
      }

      cell.appendChild(cellDiv);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });
}

// Nöbet öğretmen elementi oluştur
function createNobetOgretmenElement(ogretmen, yerId, gun) {
  const div = document.createElement("div");
  div.className = "nobet-ogretmen";
  div.draggable = true;
  div.dataset.ogretmenId = ogretmen.id;
  div.dataset.yerId = yerId;
  div.dataset.gun = gun;

  const avatar = ogretmen.cinsiyet === "Kadın" ? "👩‍🏫" : "👨‍🏫";
  const avatarClass = ogretmen.cinsiyet === "Kadın" ? "female" : "";

  div.innerHTML = `
    <div class="nobet-avatar ${avatarClass}">${avatar}</div>
    <div class="nobet-adi">${ogretmen.ad_soyad}</div>
    <div class="nobet-remove" onclick="removeNobetOgretmen(${ogretmen.id}, ${yerId}, '${gun}')">
      ✕
    </div>
  `;

  // Drag events
  div.addEventListener("dragstart", handleDragStart);
  div.addEventListener("dragend", handleDragEnd);

  return div;
}
// ==========================================
// DRAG & DROP
// ==========================================

let draggedElement = null;
let draggedOgretmenId = null;

function handleDragStart(e) {
  draggedElement = e.target;
  draggedOgretmenId = parseInt(e.target.dataset.ogretmenId);

  e.target.style.opacity = "0.5";
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", e.target.innerHTML);
}

function handleDragEnd(e) {
  e.target.style.opacity = "1";
  draggedElement = null;
  draggedOgretmenId = null;
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }

  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("dragover");

  return false;
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("dragover");
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  e.currentTarget.classList.remove("dragover");

  if (!draggedOgretmenId) return false;

  const yerId = parseInt(e.currentTarget.dataset.yerId);
  const gun = e.currentTarget.dataset.gun;

  // Pasif öğretmen kontrolü
  if (pasifOgretmenler.includes(draggedOgretmenId)) {
    Bildirim.goster("warning", "⚠️ Pasif öğretmen nöbet tutamaz!");
    return false;
  }

  // Öğretmeni ata
  ataNobetOgretmen(draggedOgretmenId, yerId, gun);

  return false;
}

// ==========================================
// NÖBET ATAMA
// ==========================================

function ataNobetOgretmen(ogretmenId, yerId, gun) {
  // Nöbet ataması nesnesini oluştur
  if (!nobetAtamalari[yerId]) {
    nobetAtamalari[yerId] = {};
  }

  if (!nobetAtamalari[yerId][gun]) {
    nobetAtamalari[yerId][gun] = [];
  }

  // Aynı öğretmen aynı gün zaten atanmış mı?
  if (nobetAtamalari[yerId][gun].includes(ogretmenId)) {
    Bildirim.goster("warning", "⚠️ Bu öğretmen zaten bu yere atanmış!");
    return;
  }

  // Aynı gün başka yerde var mı kontrol et
  const ayniGunBaskaBirYerde = Object.keys(nobetAtamalari).some((yerIdKey) => {
    return (
      parseInt(yerIdKey) !== yerId &&
      nobetAtamalari[yerIdKey][gun] &&
      nobetAtamalari[yerIdKey][gun].includes(ogretmenId)
    );
  });

  if (ayniGunBaskaBirYerde) {
    Bildirim.goster(
      "warning",
      "⚠️ Bu öğretmen aynı gün başka bir yerde nöbetçi!"
    );
    return;
  }

  // Ata
  nobetAtamalari[yerId][gun].push(ogretmenId);

  // Render
  renderNobetTable();
  updateStats();

  Bildirim.goster("success", "✅ Nöbet atandı!");
}

// Nöbet öğretmen sil
function removeNobetOgretmen(ogretmenId, yerId, gun) {
  if (nobetAtamalari[yerId] && nobetAtamalari[yerId][gun]) {
    nobetAtamalari[yerId][gun] = nobetAtamalari[yerId][gun].filter(
      (id) => id !== ogretmenId
    );
  }

  renderNobetTable();
  updateStats();

  Bildirim.goster("info", "🗑️ Nöbet silindi!");
}
// ==========================================
// AKILLI NÖBET ATAMA - GRUP BAZLI CİNSİYET DENGESİ
// ==========================================

async function akilliNobetAta() {
  const onay = await showModernConfirm(
    "🤖 Akıllı Nöbet Ataması",
    "Tercihli günlere göre rotasyonlu atama yapılacak.\n\nGrup bazında cinsiyet dengesi sağlanacak.\n\nDevam edilsin mi?",
    "Evet, Devam Et",
    "İptal"
  );

  if (!onay) return;

  try {
    console.log("🤖 Akıllı nöbet ataması başlıyor...");

    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    // Aktif öğretmenler
    const aktifOgretmenler = ogretmenler.filter(
      (ogr) => !pasifOgretmenler.includes(ogr.id)
    );

    if (aktifOgretmenler.length === 0) {
      Bildirim.goster("error", "❌ Aktif öğretmen bulunamadı!");
      return;
    }

    // Cinsiyet ayrımı
    const erkekOgretmenler = aktifOgretmenler.filter(
      (ogr) => ogr.cinsiyet && ogr.cinsiyet === "Erkek"
    );
    const bayanOgretmenler = aktifOgretmenler.filter(
      (ogr) => ogr.cinsiyet && ogr.cinsiyet === "Kadın"
    );

    console.log(`👨 ${erkekOgretmenler.length} erkek öğretmen`);
    console.log(`👩 ${bayanOgretmenler.length} bayan öğretmen`);

    // Müdür yardımcıları
    const mudurYardimcilari = aktifOgretmenler.filter(
      (ogr) => ogr.unvan && ogr.unvan.toLowerCase().includes("müdür yardımcısı")
    );

    // Normal öğretmenler
    const normalOgretmenler = aktifOgretmenler.filter(
      (ogr) =>
        !ogr.unvan || !ogr.unvan.toLowerCase().includes("müdür yardımcısı")
    );

    // Öğretmen tercihleri
    const ogretmenTercihleri = getOgretmenGunTercihleri();

    // Geçmiş atamaları yükle
    const gecmisAtamalar = await loadGecmisAtamalar();
    console.log(
      `📊 ${Object.keys(gecmisAtamalar).length} öğretmen için geçmiş atama var`
    );

    // Günlük atananlar
    const gunlukAtananlar = {
      Pazartesi: new Set(),
      Salı: new Set(),
      Çarşamba: new Set(),
      Perşembe: new Set(),
      Cuma: new Set(),
    };

    // Rotasyon takip
    const ogretmenRotasyon = gecmisAtamalar;
    ogretmenler.forEach((ogr) => {
      if (!ogretmenRotasyon[ogr.id]) {
        ogretmenRotasyon[ogr.id] = [];
      }
    });

    // Müdür yardımcısı sayaç
    const mudurYardimcisiSayac = {};
    mudurYardimcilari.forEach((my) => {
      mudurYardimcisiSayac[my.id] = 0;
    });

    // ==========================================
    // YARDIMCI FONKSİYON: RASTGELE KARIŞTIR
    // ==========================================
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    // ==========================================
    // NÖBET YERİ GRUPLAMA (Turuncu Kat-1,2,3 = 1 grup)
    // ==========================================
    function grupAdi(yerAdi) {
      const match = yerAdi.match(/^(.*?)\s*-?\d+$/);
      return match ? match[1].trim() : yerAdi;
    }

    // Nöbet yerlerini gruplara ayır
    const yerGruplari = {};
    nobetYerleri.forEach((yer) => {
      if (yer.yer_adi.toLowerCase().includes("müdür yardımcısı")) return;

      const grup = grupAdi(yer.yer_adi);
      if (!yerGruplari[grup]) {
        yerGruplari[grup] = [];
      }
      yerGruplari[grup].push(yer);
    });

    console.log("📦 Yer grupları:", Object.keys(yerGruplari));

    // ==========================================
    // ADIM 1: MÜDÜR YARDIMCISI ATAMA
    // ==========================================

    const mudurYardimcisiYer = nobetYerleri.find((yer) =>
      yer.yer_adi.toLowerCase().includes("müdür yardımcısı")
    );

    if (mudurYardimcisiYer && mudurYardimcilari.length > 0) {
      if (!nobetAtamalari[mudurYardimcisiYer.id]) {
        nobetAtamalari[mudurYardimcisiYer.id] = {};
      }

      gunler.forEach((gun) => {
        if (
          nobetAtamalari[mudurYardimcisiYer.id][gun] &&
          nobetAtamalari[mudurYardimcisiYer.id][gun].length > 0
        ) {
          console.log(`⏭️ Müdür Yardımcısı - ${gun}: Manuel atama mevcut`);
          nobetAtamalari[mudurYardimcisiYer.id][gun].forEach((ogretmenId) => {
            gunlukAtananlar[gun].add(ogretmenId);
            mudurYardimcisiSayac[ogretmenId]++;
          });
          return;
        }

        if (!nobetAtamalari[mudurYardimcisiYer.id][gun]) {
          nobetAtamalari[mudurYardimcisiYer.id][gun] = [];
        }

        let tercihliMY = mudurYardimcilari.filter((my) => {
          if (gunlukAtananlar[gun].has(my.id)) return false;
          if (ogretmenTercihleri[my.id]) {
            return ogretmenTercihleri[my.id].gunler.includes(gun);
          }
          return false;
        });

        if (tercihliMY.length === 0) {
          console.warn(
            `⚠️ Müdür Yardımcısı - ${gun}: Tercihli müdür yardımcısı yok!`
          );
          return;
        }

        let enAzAtanan = tercihliMY.reduce((min, my) => {
          const myCount = mudurYardimcisiSayac[my.id] || 0;
          const minCount = mudurYardimcisiSayac[min.id] || 0;
          return myCount < minCount ? my : min;
        }, tercihliMY[0]);

        nobetAtamalari[mudurYardimcisiYer.id][gun].push(enAzAtanan.id);
        gunlukAtananlar[gun].add(enAzAtanan.id);
        mudurYardimcisiSayac[enAzAtanan.id]++;
        ogretmenRotasyon[enAzAtanan.id].push(mudurYardimcisiYer.id);

        console.log(`✅ Müdür Yardımcısı - ${gun}: ${enAzAtanan.ad_soyad}`);
      });
    }

    // ==========================================
    // ADIM 2: GRUP BAZLI CİNSİYET DENGELİ ATAMA
    // ==========================================

    for (const [grupIsmi, yerler] of Object.entries(yerGruplari)) {
      console.log(`\n📦 Grup: ${grupIsmi} (${yerler.length} yer)`);

      gunler.forEach((gun) => {
        console.log(`\n  📅 ${gun}:`);

        // Bu gruptaki tüm yerleri isle
        const grupCinsiyetler = {}; // { Erkek: count, Kadın: count }

        yerler.forEach((yer) => {
          if (!nobetAtamalari[yer.id]) {
            nobetAtamalari[yer.id] = {};
          }

          // Manuel atama varsa atla
          if (
            nobetAtamalari[yer.id][gun] &&
            nobetAtamalari[yer.id][gun].length > 0
          ) {
            console.log(`    ⏭️ ${yer.yer_adi} - ${gun}: Manuel atama mevcut`);
            nobetAtamalari[yer.id][gun].forEach((ogretmenId) => {
              gunlukAtananlar[gun].add(ogretmenId);
              ogretmenRotasyon[ogretmenId].push(yer.id);

              const ogr = ogretmenler.find((o) => o.id === ogretmenId);
              if (ogr && ogr.cinsiyet) {
                grupCinsiyetler[ogr.cinsiyet] =
                  (grupCinsiyetler[ogr.cinsiyet] || 0) + 1;
              }
            });
            return;
          }

          if (!nobetAtamalari[yer.id][gun]) {
            nobetAtamalari[yer.id][gun] = [];
          }

          // GRUP İÇİNDE CİNSİYET DENGESİ
          let hedefCinsiyet = null;

          const erkekSayisi = grupCinsiyetler["Erkek"] || 0;
          const kadinSayisi = grupCinsiyetler["Kadın"] || 0;

          // En az olan cinsiyeti tercih et
          if (erkekSayisi < kadinSayisi && erkekOgretmenler.length > 0) {
            hedefCinsiyet = "Erkek";
          } else if (kadinSayisi < erkekSayisi && bayanOgretmenler.length > 0) {
            hedefCinsiyet = "Kadın";
          } else if (erkekSayisi === 0 && kadinSayisi === 0) {
            // İlk atama: rastgele başla
            hedefCinsiyet = Math.random() < 0.5 ? "Erkek" : "Kadın";
          } else {
            // Eşit: rastgele
            hedefCinsiyet = Math.random() < 0.5 ? "Erkek" : "Kadın";
          }

          console.log(
            `    🎯 ${yer.yer_adi}: Hedef = ${hedefCinsiyet} (Grup: E:${erkekSayisi}, K:${kadinSayisi})`
          );

          // Tercihli öğretmenler (cinsiyet filtreli)
          let tercihliOgretmenler = normalOgretmenler.filter((ogr) => {
            if (gunlukAtananlar[gun].has(ogr.id)) return false;
            if (hedefCinsiyet && ogr.cinsiyet !== hedefCinsiyet) return false;

            if (ogretmenTercihleri[ogr.id]) {
              return ogretmenTercihleri[ogr.id].gunler.includes(gun);
            }
            return false;
          });

          // Cinsiyet dengesi sağlanamazsa, herkesi dene
          if (tercihliOgretmenler.length === 0 && hedefCinsiyet) {
            console.warn(
              `    ⚠️ ${hedefCinsiyet} öğretmen yok, tüm cinsiyetlere bakılıyor`
            );
            tercihliOgretmenler = normalOgretmenler.filter((ogr) => {
              if (gunlukAtananlar[gun].has(ogr.id)) return false;
              if (ogretmenTercihleri[ogr.id]) {
                return ogretmenTercihleri[ogr.id].gunler.includes(gun);
              }
              return false;
            });
          }

          if (tercihliOgretmenler.length === 0) {
            console.warn(
              `    ⚠️ ${yer.yer_adi} - ${gun}: Tercihli öğretmen yok!`
            );
            return;
          }

          // RASTGELE KARIŞTIR
          tercihliOgretmenler = shuffleArray(tercihliOgretmenler);

          // Bu yerde en az nöbet tutan
          let enAzNobetTutan = null;
          let minNobetSayisi = Infinity;

          tercihliOgretmenler.forEach((ogr) => {
            const buYerdeKacKez = ogretmenRotasyon[ogr.id].filter(
              (y) => y === yer.id
            ).length;

            if (buYerdeKacKez < minNobetSayisi) {
              minNobetSayisi = buYerdeKacKez;
              enAzNobetTutan = ogr;
            }
          });

          if (enAzNobetTutan) {
            nobetAtamalari[yer.id][gun].push(enAzNobetTutan.id);
            gunlukAtananlar[gun].add(enAzNobetTutan.id);
            ogretmenRotasyon[enAzNobetTutan.id].push(yer.id);

            // Grup cinsiyetlerini güncelle
            if (enAzNobetTutan.cinsiyet) {
              grupCinsiyetler[enAzNobetTutan.cinsiyet] =
                (grupCinsiyetler[enAzNobetTutan.cinsiyet] || 0) + 1;
            }

            const cinsiyetEmoji =
              enAzNobetTutan.cinsiyet === "Kadın" ? "👩" : "👨";
            console.log(
              `    ✅ ${yer.yer_adi}: ${cinsiyetEmoji} ${
                enAzNobetTutan.ad_soyad
              } (Bu yerde: ${minNobetSayisi + 1}. kez)`
            );
          }
        });

        // Grup özeti
        const erkekSayisi = grupCinsiyetler["Erkek"] || 0;
        const kadinSayisi = grupCinsiyetler["Kadın"] || 0;
        console.log(
          `    📊 Grup özeti: ${erkekSayisi} Erkek, ${kadinSayisi} Kadın`
        );
      });
    }

    renderNobetTable();
    updateStats();

    Bildirim.goster(
      "success",
      "🎉 Grup bazlı cinsiyet dengeli atama tamamlandı!"
    );
  } catch (error) {
    console.error("❌ Akıllı atama hatası:", error);
    Bildirim.goster("error", "❌ Atama başarısız!");
  }
}

// Geçmiş atamaları yükle
async function loadGecmisAtamalar() {
  try {
    console.log("📂 Geçmiş atamalar yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      "SELECT ogretmen_id, yer_id FROM nobet_atamalari",
      []
    );

    const rotasyon = {};

    if (result.success && result.data && result.data.length > 0) {
      result.data.forEach((row) => {
        if (!rotasyon[row.ogretmen_id]) {
          rotasyon[row.ogretmen_id] = [];
        }
        rotasyon[row.ogretmen_id].push(row.yer_id);
      });

      console.log(`✅ ${result.data.length} geçmiş atama yüklendi`);
    } else {
      console.log("ℹ️ Geçmiş atama yok, ilk program");
    }

    return rotasyon;
  } catch (error) {
    console.error("❌ Geçmiş atama yükleme hatası:", error);
    return {};
  }
}

// ==========================================
// MODERN ONAY DİYALOGU
// ==========================================

function showModernConfirm(
  baslik,
  mesaj,
  evetMetni = "Evet",
  hayirMetni = "Hayır"
) {
  return new Promise((resolve) => {
    // Modal oluştur
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.style.display = "flex";
    modal.style.zIndex = "99999";

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 450px;">
        <div class="modal-header" style="background: linear-gradient(135deg, #ffd93d 0%, #ffb800 100%);">
          <h2 style="color: #1f2937;">${baslik}</h2>
        </div>
        <div class="modal-body" style="padding: 30px; text-align: center;">
          <p style="font-size: 15px; line-height: 1.6; color: var(--text-primary); white-space: pre-line;">${mesaj}</p>
        </div>
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: center;">
          <button class="btn-modern btn-secondary confirm-hayir-btn">
            <span class="btn-icon">✖</span>
            <span class="btn-text">${hayirMetni}</span>
          </button>
          <button class="btn-modern btn-success confirm-evet-btn">
            <span class="btn-icon">✅</span>
            <span class="btn-text">${evetMetni}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const evetBtn = modal.querySelector(".confirm-evet-btn");
    const hayirBtn = modal.querySelector(".confirm-hayir-btn");

    evetBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(true);
    };

    hayirBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(false);
    };

    // Escape ile kapat
    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        document.removeEventListener("keydown", escapeHandler);
        resolve(false);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  });
}

// ==========================================
// İSTATİSTİKLER
// ==========================================

function updateStats() {
  let toplamNobet = 0;
  let atananNobet = 0;

  nobetYerleri.forEach((yer) => {
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    gunler.forEach((gun) => {
      toplamNobet++;

      if (nobetAtamalari[yer.id] && nobetAtamalari[yer.id][gun]) {
        atananNobet += nobetAtamalari[yer.id][gun].length;
      }
    });
  });

  const bekleyen = toplamNobet - atananNobet;
  const aktifOgretmen = ogretmenler.length - pasifOgretmenler.length;

  document.getElementById("statToplamNobet").textContent = toplamNobet;
  document.getElementById("statAtanan").textContent = atananNobet;
  document.getElementById("statBekleyen").textContent = bekleyen;
  document.getElementById("statAktifOgretmen").textContent = aktifOgretmen;
}

// ==========================================
// MODAL FONKSİYONLARI
// ==========================================

// Ders programı göster
function showDersProgrami(ogretmenId) {
  const ogretmen = ogretmenler.find((o) => o.id === ogretmenId);
  if (!ogretmen) return;

  document.getElementById("modalOgretmenAdi").textContent = ogretmen.ad_soyad;

  const content = document.getElementById("dersProgramiContent");

  if (!dersProgrami) {
    content.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <p>⚠️ Ders programı bulunamadı!</p>
        <p style="font-size: 12px; margin-top: 10px;">Otomatik Dağıtım sayfasından program oluşturun.</p>
      </div>
    `;
  } else {
    content.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 10px; background: #f5f5f5;">Saat</th>
            <th style="border: 1px solid #ddd; padding: 10px; background: #f5f5f5;">Pazartesi</th>
            <th style="border: 1px solid #ddd; padding: 10px; background: #f5f5f5;">Salı</th>
            <th style="border: 1px solid #ddd; padding: 10px; background: #f5f5f5;">Çarşamba</th>
            <th style="border: 1px solid #ddd; padding: 10px; background: #f5f5f5;">Perşembe</th>
            <th style="border: 1px solid #ddd; padding: 10px; background: #f5f5f5;">Cuma</th>
          </tr>
        </thead>
        <tbody>
          ${generateDersProgramiRows(ogretmenId)}
        </tbody>
      </table>
    `;
  }

  document.getElementById("dersProgramiModal").style.display = "flex";
}

function generateDersProgramiRows(ogretmenId) {
  // Basit örnek (gerçek ders programı verisi kullanılacak)
  let rows = "";
  for (let i = 1; i <= 8; i++) {
    rows += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">-</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">-</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">-</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">-</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">-</td>
      </tr>
    `;
  }
  return rows;
}

function closeDersProgramiModal() {
  document.getElementById("dersProgramiModal").style.display = "none";
}

// Nöbet yeri ekle modal
function openNobetYeriModal() {
  document.getElementById("nobetYeriAdi").value = "";
  document.getElementById("nobetYeriAciklama").value = "";
  document.getElementById("nobetYeriModal").style.display = "flex";
}

function closeNobetYeriModal() {
  document.getElementById("nobetYeriModal").style.display = "none";
}

// Nöbet yeri kaydet
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("btnNobetYeriKaydet")
    ?.addEventListener("click", async () => {
      const adi = document.getElementById("nobetYeriAdi").value.trim();
      const aciklama = document
        .getElementById("nobetYeriAciklama")
        .value.trim();

      if (!adi) {
        Bildirim.goster("warning", "⚠️ Nöbet yeri adı zorunludur!");
        return;
      }

      try {
        // Veritabanına kaydet
        const result = await window.electronAPI.dbExec(
          "INSERT INTO nobet_yerleri (yer_adi, aciklama, sira) VALUES (?, ?, ?)",
          [adi, aciklama, nobetYerleri.length]
        );

        if (result.success) {
          // Nöbet yerlerini tekrar yükle
          await loadNobetYerleri();

          renderNobetYerleri();
          renderNobetTable();
          closeNobetYeriModal();

          Bildirim.goster("success", "✅ Nöbet yeri eklendi ve kaydedildi!");
        } else {
          Bildirim.goster("error", "❌ Nöbet yeri kaydedilemedi!");
        }
      } catch (error) {
        console.error("❌ Kaydetme hatası:", error);
        Bildirim.goster("error", "❌ Hata oluştu!");
      }
    });
});

// Nöbet yeri sil
function silNobetYeri(yerId) {
  const confirmed = confirm(
    "Bu nöbet yerini silmek istediğinize emin misiniz?"
  );

  if (!confirmed) return;

  nobetYerleri = nobetYerleri.filter((y) => y.id !== yerId);

  // Atamaları da sil
  delete nobetAtamalari[yerId];

  renderNobetYerleri();
  renderNobetTable();
  updateStats();

  Bildirim.goster("info", "🗑️ Nöbet yeri silindi!");
}

// Pasif öğretmen modal aç
function openPasifOgretmenModal(ogretmenId) {
  const ogretmen = ogretmenler.find((o) => o.id === ogretmenId);
  if (!ogretmen) return;

  // Formu temizle
  document.getElementById("pasifOgretmenAdi").value = ogretmen.ad_soyad;
  document.getElementById("pasifNeden").value = "";
  document.getElementById("pasifAciklama").value = "";
  document.getElementById("pasifBaslangic").value = "";
  document.getElementById("pasifBitis").value = "";

  // Modal'a öğretmen ID'sini data attribute olarak ekle
  document.getElementById("pasifOgretmenModal").dataset.ogretmenId = ogretmenId;
  document.getElementById("pasifOgretmenModal").style.display = "flex";
}

// Pasif öğretmen modal kapat
function closePasifOgretmenModal() {
  document.getElementById("pasifOgretmenModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  // ... diğer event listener'lar ...

  // Pasif kaydet butonu
  const btnPasifKaydet = document.getElementById("btnPasifKaydet");

  if (btnPasifKaydet) {
    btnPasifKaydet.addEventListener("click", async () => {
      const ogretmenId = parseInt(
        document.getElementById("pasifOgretmenModal").dataset.ogretmenId
      );
      const neden = document.getElementById("pasifNeden").value.trim();
      const aciklama = document.getElementById("pasifAciklama").value.trim();
      const baslangic = document.getElementById("pasifBaslangic").value;
      const bitis = document.getElementById("pasifBitis").value;

      if (!neden) {
        Bildirim.goster("warning", "⚠️ Neden seçmelisiniz!");
        return;
      }

      try {
        // Veritabanına kaydet
        const result = await window.electronAPI.dbExec(
          `INSERT INTO nobet_pasif_ogretmenler 
           (ogretmen_id, neden, aciklama, baslangic_tarihi, bitis_tarihi) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            ogretmenId,
            neden,
            aciklama,
            baslangic || new Date().toISOString().split("T")[0],
            bitis,
          ]
        );

        if (result.success) {
          // Pasif öğretmenleri tekrar yükle
          await loadPasifOgretmenler();

          renderOgretmenler();
          renderPasifOgretmenler();
          closePasifOgretmenModal();
          updateStats();

          Bildirim.goster(
            "success",
            `✅ ${neden} nedeniyle pasif yapıldı ve kaydedildi!`
          );
        } else {
          Bildirim.goster("error", "❌ Kaydedilemedi!");
        }
      } catch (error) {
        console.error("❌ Kaydetme hatası:", error);
        Bildirim.goster("error", "❌ Hata oluştu!");
      }
    });
  }
});
// ==========================================
// ÖĞRETMEN GÜN TERCİHLERİ
// ==========================================

let ogretmenGunTercihleri = {}; // { ogretmenId: { gunler: ["Pazartesi", "Salı"] } }

// Gün tercihlerini yükle (veritabanından)
async function loadGunTercihleri() {
  try {
    console.log("📂 Gün tercihleri yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM ogretmen_nobet_tercihleri",
      []
    );

    if (result.success && result.data && result.data.length > 0) {
      ogretmenGunTercihleri = {};

      // Her satır bir öğretmen-gün ilişkisi
      result.data.forEach((row) => {
        if (!ogretmenGunTercihleri[row.ogretmen_id]) {
          ogretmenGunTercihleri[row.ogretmen_id] = { gunler: [] };
        }
        ogretmenGunTercihleri[row.ogretmen_id].gunler.push(row.gun);
      });

      const toplamTercih = result.data.length;
      const ogretmenSayisi = Object.keys(ogretmenGunTercihleri).length;

      console.log(
        `✅ ${ogretmenSayisi} öğretmen için ${toplamTercih} gün tercihi yüklendi`
      );
    } else {
      ogretmenGunTercihleri = {};
      console.log("ℹ️ Gün tercihi bulunamadı");
    }
  } catch (error) {
    console.error("❌ Gün tercihi yükleme hatası:", error);
    ogretmenGunTercihleri = {};
  }
}

// Gün tercihleri modalını aç
function openGunTercihModal() {
  renderTercihList();
  document.getElementById("gunTercihModal").style.display = "flex";
}

// Gün tercihleri modalını kapat
function closeGunTercihModal() {
  document.getElementById("gunTercihModal").style.display = "none";
}

// Tercih listesini render et
function renderTercihList() {
  const container = document.getElementById("tercihList");
  container.innerHTML = "";

  const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

  // Aktif öğretmenler
  const aktifOgretmenler = ogretmenler.filter(
    (ogr) => !pasifOgretmenler.includes(ogr.id)
  );

  aktifOgretmenler.forEach((ogr) => {
    const item = document.createElement("div");
    item.className = "tercih-item";

    // Mevcut tercihleri al
    const mevcutTercihler = ogretmenGunTercihleri[ogr.id]?.gunler || [];

    item.innerHTML = `
      <div class="tercih-header">
        <div class="ogretmen-avatar ${
          ogr.cinsiyet === "Kadın" ? "female" : ""
        }">
          ${ogr.cinsiyet === "Kadın" ? "👩‍🏫" : "👨‍🏫"}
        </div>
        <div class="tercih-adi">${ogr.ad_soyad}</div>
      </div>
      <div class="gun-checkboxes">
        ${gunler
          .map(
            (gun) => `
          <div class="gun-checkbox-item ${
            mevcutTercihler.includes(gun) ? "selected" : ""
          }" 
               data-ogretmen-id="${ogr.id}" 
               data-gun="${gun}"
               onclick="toggleGunTercih(${ogr.id}, '${gun}', this)">
            <input type="checkbox" 
                   id="tercih_${ogr.id}_${gun}" 
                   ${mevcutTercihler.includes(gun) ? "checked" : ""}
                   onchange="event.stopPropagation()">
            <label for="tercih_${ogr.id}_${gun}">${gun.substring(0, 3)}</label>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    container.appendChild(item);
  });
}

// Gün tercihini aç/kapat
function toggleGunTercih(ogretmenId, gun, element) {
  const checkbox = element.querySelector("input[type='checkbox']");
  checkbox.checked = !checkbox.checked;

  if (checkbox.checked) {
    element.classList.add("selected");

    // Tercihe ekle
    if (!ogretmenGunTercihleri[ogretmenId]) {
      ogretmenGunTercihleri[ogretmenId] = { gunler: [] };
    }

    if (!ogretmenGunTercihleri[ogretmenId].gunler.includes(gun)) {
      ogretmenGunTercihleri[ogretmenId].gunler.push(gun);
    }
  } else {
    element.classList.remove("selected");

    // Tercihten çıkar
    if (ogretmenGunTercihleri[ogretmenId]) {
      ogretmenGunTercihleri[ogretmenId].gunler = ogretmenGunTercihleri[
        ogretmenId
      ].gunler.filter((g) => g !== gun);
    }
  }
}

// Tercihleri al
function getOgretmenGunTercihleri() {
  return ogretmenGunTercihleri;
}

// Tercih kaydet (veritabanına)
document.addEventListener("DOMContentLoaded", () => {
  const btnTercihKaydet = document.getElementById("btnTercihKaydet");

  if (btnTercihKaydet) {
    btnTercihKaydet.addEventListener("click", async () => {
      try {
        console.log("💾 Gün tercihleri kaydediliyor...");

        // Önce tüm tercihleri sil
        await window.electronAPI.dbExec(
          "DELETE FROM ogretmen_nobet_tercihleri",
          []
        );

        // Yeni tercihleri kaydet
        let kayitSayisi = 0;

        for (const ogretmenId in ogretmenGunTercihleri) {
          const tercihler = ogretmenGunTercihleri[ogretmenId];

          if (tercihler.gunler && tercihler.gunler.length > 0) {
            for (const gun of tercihler.gunler) {
              const result = await window.electronAPI.dbExec(
                "INSERT INTO ogretmen_nobet_tercihleri (ogretmen_id, gun) VALUES (?, ?)",
                [parseInt(ogretmenId), gun]
              );

              if (result.success) {
                kayitSayisi++;
              }
            }
          }
        }

        console.log(`✅ ${kayitSayisi} tercih kaydedildi`);

        closeGunTercihModal();
        Bildirim.goster("success", `✅ ${kayitSayisi} gün tercihi kaydedildi!`);
      } catch (error) {
        console.error("❌ Tercih kaydetme hatası:", error);
        Bildirim.goster("error", "❌ Tercihler kaydedilemedi!");
      }
    });
  }
});

// ==========================================
// AÇIKLAMA YÖNETİMİ
// ==========================================

// Açıklamaları yükle (veritabanından)
async function loadAciklamalar() {
  try {
    console.log("📂 Açıklamalar yükleniyor...");

    // Eğer program ID varsa o programa ait açıklamaları getir
    // Şimdilik genel açıklamalar (program_id = 1 varsayalım)
    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM nobet_aciklamalari WHERE program_id = 1 ORDER BY sira ASC",
      []
    );

    if (result.success && result.data && result.data.length > 0) {
      aciklamalar = result.data.map((row) => row.aciklama);
      console.log(`✅ ${aciklamalar.length} açıklama yüklendi (Veritabanı)`);
    } else {
      aciklamalar = [];
      console.log("ℹ️ Açıklama bulunamadı");
    }

    renderAciklamalar();
  } catch (error) {
    console.error("❌ Açıklama yükleme hatası:", error);
    aciklamalar = [];
  }
}

// Açıklamaları render et
function renderAciklamalar() {
  const container = document.getElementById("aciklamalarList");

  if (aciklamalar.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Açıklama yok</div>';
    return;
  }

  container.innerHTML = "";

  aciklamalar.forEach((aciklama, index) => {
    const item = document.createElement("div");
    item.className = "aciklama-item";
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <strong>${index + 1}.</strong> ${aciklama}
        </div>
        <div class="action-icon" onclick="silAciklama(${index})" style="margin-left: 10px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Açıklama modal aç
function openAciklamaModal() {
  document.getElementById("aciklamaMetin").value = "";
  document.getElementById("aciklamaModal").style.display = "flex";
}

// Açıklama modal kapat
function closeAciklamaModal() {
  document.getElementById("aciklamaModal").style.display = "none";
}

// Açıklama kaydet
document.addEventListener("DOMContentLoaded", () => {
  const btnAciklamaKaydet = document.getElementById("btnAciklamaKaydet");

  if (btnAciklamaKaydet) {
    btnAciklamaKaydet.addEventListener("click", async () => {
      const metin = document.getElementById("aciklamaMetin").value.trim();

      if (!metin) {
        Bildirim.goster("warning", "⚠️ Açıklama metni boş olamaz!");
        return;
      }

      try {
        console.log("💾 Açıklama kaydediliyor:", metin);

        // Veritabanına kaydet
        const result = await window.electronAPI.dbExec(
          "INSERT INTO nobet_aciklamalari (program_id, aciklama, sira) VALUES (?, ?, ?)",
          [1, metin, aciklamalar.length] // program_id = 1 varsayılan
        );

        if (result.success) {
          console.log("✅ Veritabanına kaydedildi");

          // Açıklamaları tekrar yükle
          await loadAciklamalar();

          closeAciklamaModal();

          Bildirim.goster("success", "✅ Açıklama eklendi ve kaydedildi!");
        } else {
          console.error("❌ Kaydedilemedi:", result.message);
          Bildirim.goster("error", "❌ Açıklama kaydedilemedi!");
        }
      } catch (error) {
        console.error("❌ Kaydetme hatası:", error);
        Bildirim.goster("error", "❌ Hata oluştu!");
      }
    });
  }
});

// Açıklama sil
async function silAciklama(index) {
  const confirmed = confirm("Bu açıklamayı silmek istediğinize emin misiniz?");

  if (!confirmed) return;

  try {
    const aciklama = aciklamalar[index];
    console.log("🗑️ Açıklama siliniyor:", aciklama);

    // Veritabanından sil (aciklama metnine göre)
    const result = await window.electronAPI.dbExec(
      "DELETE FROM nobet_aciklamalari WHERE program_id = 1 AND aciklama = ?",
      [aciklama]
    );

    if (result.success) {
      console.log("✅ Veritabanından silindi");

      // Açıklamaları tekrar yükle
      await loadAciklamalar();

      Bildirim.goster("info", "🗑️ Açıklama silindi!");
    } else {
      console.error("❌ Silinemedi:", result.message);
      Bildirim.goster("error", "❌ Silinemedi!");
    }
  } catch (error) {
    console.error("❌ Silme hatası:", error);
    Bildirim.goster("error", "❌ Hata oluştu!");
  }
}
// ==========================================
// DİĞER FONKSİYONLAR
// ==========================================

// Öğretmen filtrele
function filterOgretmenler(e) {
  const query = e.target.value.toLowerCase();
  const items = document.querySelectorAll(".ogretmen-item");

  items.forEach((item) => {
    const adi = item.querySelector(".ogretmen-adi").textContent.toLowerCase();

    if (adi.includes(query)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Varsayılan tarihleri set et
function setDefaultDates() {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  document.getElementById("baslangicTarihi").value = today
    .toISOString()
    .split("T")[0];
  document.getElementById("bitisTarihi").value = nextWeek
    .toISOString()
    .split("T")[0];
}

// Yeni program oluştur
function yeniProgramOlustur() {
  Bildirim.goster("info", "📅 Yeni program özelliği yakında eklenecek!");
}

// Nöbetleri kaydet
async function kaydetNobetler() {
  // Modern onay modalı göster
  const onay = await showModernConfirm(
    "💾 Nöbetleri Kaydet",
    "Tüm nöbet atamaları veritabanına kaydedilecek.\n\nDevam edilsin mi?",
    "Evet, Kaydet",
    "İptal"
  );

  if (!onay) {
    return;
  }

  try {
    // TODO: Veritabanına kaydetme işlemi buraya gelecek
    // await window.electronAPI.saveNobetler(nobetAtamalari);

    Bildirim.goster("success", "💾 Nöbetler başarıyla kaydedildi!");
  } catch (error) {
    console.error("❌ Kaydetme hatası:", error);
    Bildirim.goster("error", "❌ Nöbetler kaydedilemedi!");
  }
}

// Nöbetleri temizle
async function temizleNobetler() {
  // Modern onay modalı göster
  if (
    !(await showModernConfirm(
      "🗑️ Nöbetleri Temizle",
      "Tüm nöbet atamaları silinecek.\n\nBu işlem geri alınamaz. Emin misiniz?",
      "Evet, Temizle",
      "İptal"
    ))
  ) {
    return;
  }

  nobetAtamalari = {};
  renderNobetTable();
  updateStats();

  Bildirim.goster("info", "🗑️ Nöbetler temizlendi!");
}
// ==========================================
// PDF ÖNİZLEME VE KAYDETME - DÜZELTİLMİŞ
// ==========================================

async function yazdirNobet() {
  const baslangic = document.getElementById("baslangicTarihi").value;
  const bitis = document.getElementById("bitisTarihi").value;

  if (!baslangic || !bitis) {
    Bildirim.goster("warning", "⚠️ Lütfen tarih aralığını seçin!");
    return;
  }

  // Müdür bilgisini veritabanından çek
  const mudurBilgisi = await getMudurBilgisi();

  const modal = document.createElement("div");
  modal.className = "pdf-modal-overlay";
  modal.innerHTML = `
    <div class="pdf-modal-container">
      <div class="pdf-modal-header">
        <h2><span>📄</span>Nöbet Programı Önizleme</h2>
        <button class="modal-close" onclick="closePdfModal()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
      <div class="pdf-modal-body">
        <iframe id="pdfPreview" style="width: 100%; height: 100%; border: none;"></iframe>
      </div>
      <div class="pdf-modal-footer">
        <button class="btn-modern btn-secondary" onclick="closePdfModal()">
          <span class="btn-icon">✖</span><span class="btn-text">Kapat</span>
        </button>
        <button class="btn-modern btn-primary" onclick="downloadPdf('${baslangic}', '${bitis}')">
          <span class="btn-icon">💾</span><span class="btn-text">PDF Kaydet</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  setTimeout(() => {
    const iframe = document.getElementById("pdfPreview");
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const printContent = generatePrintContent(baslangic, bitis, mudurBilgisi);
    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();
  }, 100);
}

// Müdür bilgisini veritabanından çek
async function getMudurBilgisi() {
  try {
    const result = await window.electronAPI.dbQuery(
      "SELECT ad_soyad, unvan FROM ogretmenler WHERE unvan LIKE '%Müdür%' AND unvan NOT LIKE '%Yardımcısı%' LIMIT 1",
      []
    );

    if (result.success && result.data && result.data.length > 0) {
      return {
        ad_soyad: result.data[0].ad_soyad,
        unvan: result.data[0].unvan || "Müdür",
      };
    }

    // Varsayılan
    return {
      ad_soyad: "...........................",
      unvan: "Müdür",
    };
  } catch (error) {
    console.error("❌ Müdür bilgisi hatası:", error);
    return {
      ad_soyad: "...........................",
      unvan: "Müdür",
    };
  }
}

function closePdfModal() {
  const modal = document.querySelector(".pdf-modal-overlay");
  if (modal) modal.remove();
}

function downloadPdf(baslangic, bitis) {
  const baslangicFormatli = new Date(baslangic).toLocaleDateString("tr-TR");
  const bitisFormatli = new Date(bitis).toLocaleDateString("tr-TR");
  const dosyaAdi = `${baslangicFormatli}-${bitisFormatli}.pdf`;

  const iframe = document.getElementById("pdfPreview");
  iframe.contentWindow.print();

  Bildirim.goster("info", `📄 PDF kaydediliyor: ${dosyaAdi}`);
}
function generatePrintContent(baslangic, bitis, mudurBilgisi) {
  const baslangicFormatli = new Date(baslangic).toLocaleDateString("tr-TR");
  const bitisFormatli = new Date(bitis).toLocaleDateString("tr-TR");
  const bugun = new Date().toLocaleDateString("tr-TR");

  const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

  let tableRows = "";
  nobetYerleri.forEach((yer) => {
    let row = `<tr><td class="yer-adi">${yer.yer_adi.toUpperCase()}</td>`;

    gunler.forEach((gun) => {
      let cell = '<td class="gun-cell">';

      if (nobetAtamalari[yer.id] && nobetAtamalari[yer.id][gun]) {
        nobetAtamalari[yer.id][gun].forEach((ogretmenId) => {
          const ogr = ogretmenler.find((o) => o.id === ogretmenId);
          if (ogr) {
            // İsim uzunluğuna göre font boyutu
            const isim = ogr.ad_soyad.toUpperCase();
            const fontSize =
              isim.length > 20 ? "7px" : isim.length > 15 ? "8px" : "9px";
            cell += `<div class="ogretmen-item" style="font-size: ${fontSize};">${isim}</div>`;
          }
        });
      }

      cell += "</td>";
      row += cell;
    });

    row += "</tr>";
    tableRows += row;
  });

  // Açıklamalar
  let aciklamalarHtml = "";
  if (aciklamalar.length > 0) {
    aciklamalarHtml =
      '<div class="aciklamalar-section"><p><strong>Nöbetçi Öğretmenin Görevleri:</strong></p><ol>';
    aciklamalar.forEach((aciklama) => {
      aciklamalarHtml += `<li>${aciklama}</li>`;
    });
    aciklamalarHtml += "</ol></div>";
  }

  const gunlerBuyuk = ["PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA"];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Nöbet Programı</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 10px; 
          font-size: 10px; 
        }
        
        .header { 
          text-align: center; 
          margin-bottom: 10px; 
        }
        
        .header h1 { 
          font-size: 13px; 
          margin: 5px 0; 
          text-transform: uppercase; 
          font-weight: bold;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 8px;
          table-layout: auto;
        }
        
        th, td { 
          border: 1px solid #000; 
          padding: 4px; 
          text-align: center; 
          vertical-align: middle;
        }
        
        th { 
          background: #E3F2FD !important; 
          background-color: #E3F2FD !important;
          color: #000 !important; 
          font-weight: bold;
          font-size: 9px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          white-space: nowrap;
        }
        
        .yer-adi { 
          text-align: left; 
          font-weight: bold; 
          background: #E3F2FD !important;
          background-color: #E3F2FD !important;
          width: auto;
          min-width: 120px;
          max-width: 180px;
          font-size: 8px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-left: 6px;
          padding-right: 6px;
        }
        
        .gun-cell { 
          width: auto;
          vertical-align: middle;
          padding: 3px;
          font-size: 9px;
        }
        
        .ogretmen-item { 
          margin: 1px 0; 
          line-height: 1.2;
          white-space: nowrap;
          font-size: 9px;
        }
        
        .aciklamalar-section { 
          margin-top: 12px; 
          page-break-inside: avoid; 
          font-size: 8px; 
        }
        
        .aciklamalar-section p {
          margin: 3px 0;
          font-weight: bold;
        }
        
        .aciklamalar-section ol { 
          margin: 3px 0; 
          padding-left: 18px; 
        }
        
        .aciklamalar-section li { 
          margin: 2px 0; 
          line-height: 1.3; 
        }
        
        .footer { 
          margin-top: 15px; 
          text-align: right; 
        }
        
        .footer .tarih { 
          margin-bottom: 25px; 
          font-size: 9px;
        }
        
        .footer .imza { 
          display: inline-block; 
          text-align: center; 
        }
        
        .footer .isim { 
          font-weight: bold; 
          margin-bottom: 3px; 
          font-size: 10px;
        }
        
        .footer .unvan { 
          font-size: 9px;
        }

        /* Uzun yer isimleri için özel ayar */
        @media print {
          .yer-adi {
            font-size: 7px !important;
          }
          
          th {
            font-size: 8px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${baslangicFormatli}-${bitisFormatli} ARASI ÖĞRETMEN VE MÜDÜR YARDIMCILARI NÖBET LİSTESİ</h1>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: auto;">NÖBET YERİ</th>
            ${gunlerBuyuk
              .map((gun) => `<th style="width: auto;">${gun}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      ${aciklamalarHtml}
      <div class="footer">
        <div class="tarih">${bugun}</div>
        <div class="imza">
          <div class="isim">${mudurBilgisi.ad_soyad}</div>
          <div class="unvan">${mudurBilgisi.unvan}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

console.log("✅ Nöbet sistemi script yüklendi");
