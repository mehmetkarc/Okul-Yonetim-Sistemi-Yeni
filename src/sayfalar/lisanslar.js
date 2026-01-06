// ==========================================
// ✅ LİSANS TAKİP JS — SİMRE/MK V3.1 UYARLAMASI
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  fetchOkullarFromDB();
});

// GLOBAL VERİ DEPOLAMA (Filtreleme ve Detay için)
let tumOkullar = [];

async function fetchOkullarFromDB() {
  try {
    const api = window.electronAPI;
    if (!api) {
      console.error("❌ Electron API bulunamadı!");
      return;
    }

    console.log("🔍 Veritabanından okullar çekiliyor...");
    const response = await api.getAllSchools();

    // Veri formatını kontrol et ({success: true, data: []} yapısına uygun)
    if (response && response.success && Array.isArray(response.data)) {
      tumOkullar = response.data;
      renderLisanslar(tumOkullar);
    } else {
      console.error("❌ Veri formatı hatalı veya boş:", response);
      renderLisanslar([]);
    }
  } catch (error) {
    console.error("❌ Veri çekme hatası:", error);
  }
}

function renderLisanslar(schools) {
  const tbody = document.getElementById("lisansTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  let aktifSayisi = 0;
  let kritikSayisi = 0;

  if (schools.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;">Kayıtlı okul bulunamadı.</td></tr>';
    return;
  }

  schools.forEach((okul) => {
    const kalanGun = kalanGunHesapla(okul.lisans_bitis);
    const durum = durumBelirle(kalanGun, okul.durum);

    // İstatistikleri topla
    if (okul.durum === 1 && kalanGun > 0) aktifSayisi++;
    if (kalanGun <= 30 && kalanGun > 0) kritikSayisi++;

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><span style="color:#00d9ff; font-weight:bold;">${
              okul.okul_kodu
            }</span></td>
            <td style="color:white;">${okul.okul_adi}</td>
            <td>${tarihFormatla(okul.lisans_baslangic)}</td>
            <td>${tarihFormatla(okul.lisans_bitis)}</td>
            <td><span class="kalan-gun ${getGunClass(
              kalanGun
            )}">${kalanGun} Gün</span></td>
            <td><span class="badge-${durum.class}">${durum.text}</span></td>
            <td>
                <button class="icon-btn" onclick="okulDetay(${
                  okul.id
                })" title="Detaylı Gör">
                    👁️
                </button>
            </td>
        `;
    tbody.appendChild(tr);
  });

  document.getElementById("statAktif").textContent = aktifSayisi;
  document.getElementById("statKritik").textContent = kritikSayisi;
}

// ==========================================
// 🔍 MODERN MODAL VE DETAYLAR
// ==========================================

function okulDetay(id) {
  const okul = tumOkullar.find((o) => o.id == id);
  if (!okul) return;

  const modal = document.getElementById("okulModal");
  const icerik = document.getElementById("modalDetayIcerik");
  const baslik = document.getElementById("modalOkulAdi");

  baslik.textContent = okul.okul_adi;
  icerik.innerHTML = `
        <div class="detail-row"><span class="detail-label">Kurum Kodu:</span><span class="detail-value">${
          okul.okul_kodu
        }</span></div>
        <div class="detail-row"><span class="detail-label">Yetkili Kişi:</span><span class="detail-value">${
          okul.yetkili_ad || "---"
        }</span></div>
        <div class="detail-row"><span class="detail-label">Unvan:</span><span class="detail-value">${
          okul.yetkili_unvan || "---"
        }</span></div>
        <div class="detail-row"><span class="detail-label">Telefon:</span><span class="detail-value">${
          okul.telefon || "---"
        }</span></div>
        <div class="detail-row"><span class="detail-label">E-Posta:</span><span class="detail-value">${
          okul.email || "---"
        }</span></div>
        <div class="detail-row"><span class="detail-label">İl / İlçe:</span><span class="detail-value">${
          okul.il || ""
        } / ${okul.ilce || ""}</span></div>
        <div class="detail-row"><span class="detail-label">Adres:</span><span class="detail-value">${
          okul.adres || "---"
        }</span></div>
        <div class="detail-row"><span class="detail-label">Lisans Bitiş:</span><span class="detail-value" style="color:#ffd93d">${tarihFormatla(
          okul.lisans_bitis
        )}</span></div>
    `;

  modal.style.display = "flex";
}

function modalKapat() {
  document.getElementById("okulModal").style.display = "none";
}

// Dışarı tıklayınca kapansın
window.onclick = (e) => {
  if (e.target.id === "okulModal") modalKapat();
};

// ==========================================
// 🛠️ YARDIMCI ARAÇLAR
// ==========================================

function kalanGunHesapla(tarih) {
  if (!tarih) return 0;
  const bitis = new Date(tarih);
  const bugun = new Date();
  const fark = bitis - bugun;
  return Math.max(0, Math.ceil(fark / (1000 * 60 * 60 * 24)));
}

function durumBelirle(gun, aktiflik) {
  if (aktiflik === 0) return { text: "Pasif", class: "danger" };
  if (gun <= 0) return { text: "Bitti", class: "danger" };
  if (gun <= 30) return { text: "Kritik", class: "warning" };
  return { text: "Aktif", class: "success" };
}

function getGunClass(gun) {
  if (gun <= 0) return "gun-kritik";
  if (gun <= 30) return "gun-uyari";
  return "gun-pozitif";
}

function tarihFormatla(tarihStr) {
  if (!tarihStr) return "---";
  return new Date(tarihStr).toLocaleDateString("tr-TR");
}

function filtreleLisanslar() {
  const arama = document.getElementById("searchInput").value.toLowerCase();
  const filtrelenmiş = tumOkullar.filter(
    (o) =>
      o.okul_adi.toLowerCase().includes(arama) ||
      o.okul_kodu.toLowerCase().includes(arama)
  );
  renderLisanslar(filtrelenmiş);
}
