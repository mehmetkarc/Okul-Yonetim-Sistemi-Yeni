// ==========================================
// DERS RAPORLARI - 2025
// (Part 1 of N) - Başlangıç, global değişkenler, yükleme ve ilk raporlar
// ==========================================

// ==========================================
// BİLDİRİM FONKSİYONU
// ==========================================
function bildirimGoster(mesaj, tip = "info") {
  console.log(`[${tip.toUpperCase()}] ${mesaj}`);
  if (typeof Bildirim !== "undefined") {
    if (tip === "success") Bildirim.success(mesaj);
    else if (tip === "error") Bildirim.error(mesaj);
    else if (tip === "warning") Bildirim.warning(mesaj);
    else Bildirim.info(mesaj);
    return;
  }
  const bildirimAlani = document.getElementById("bildirimAlani");
  if (!bildirimAlani) {
    console.warn("Bildirim alanı bulunamadı");
    return;
  }
  const bildirim = document.createElement("div");
  bildirim.className = `bildirim bildirim-${tip}`;
  bildirim.textContent = mesaj;
  bildirimAlani.appendChild(bildirim);
  setTimeout(() => {
    bildirim.style.opacity = "0";
    setTimeout(() => bildirim.remove(), 300);
  }, 3000);
}

console.log("📚 Ders Raporları sayfası yüklendi");

// ==========================================
// GLOBAL DEĞİŞKENLER (GÜNCELLENMİŞ)
// ==========================================
const raporTuru = document.getElementById("raporTuru");
const filtrelerKart = document.getElementById("filtrelerKart");
const butonlar = document.getElementById("butonlar");
const onizlemeKart = document.getElementById("onizlemeKart");
const onizlemeAlani = document.getElementById("onizlemeAlani");
const sinifFiltre = document.getElementById("sinifFiltre");
const bransFiltre = document.getElementById("bransFiltre");
const turFiltre = document.getElementById("turFiltre");
const pdfIndirBtn = document.getElementById("pdfIndir");
const excelIndirBtn = document.getElementById("excelIndir");
const onizleBtn = document.getElementById("onizleBtn");

let mevcutDersler = []; // sistemdeki ders verisi
let mevcutOgretmenler = []; // sistemdeki öğretmen verisi
let mevcutSiniflar = []; // sistemdeki sınıf verisi
let filtreliDersler = []; // önizleme/rapor için geçici filtrelenmiş dersler

// Güvenlik kontrolü - undefined olmamasını sağlar
if (typeof filtreliDersler === "undefined") {
  console.warn(
    "⚠️ filtreliDersler global olarak tanımlanmadı, oluşturuluyor..."
  );
  filtreliDersler = [];
}

console.log("✅ Global değişkenler yüklendi");

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
  console.log("🔄 Sayfa yükleniyor...");
  const currentUser = localStorage.getItem("currentUser");
  const currentSchool = localStorage.getItem("currentSchool");
  if (!currentUser || !currentSchool) {
    console.warn("⚠️ Kullanıcı bilgisi bulunamadı");
    window.location.href = "../giris.html";
    return;
  }

  // Yükleme sırasını koru
  await dersleriYukle();
  await ogretmenleriYukle();
  await siniflariYukle();

  // UI başlangıç durumu
  if (filtrelerKart) filtrelerKart.style.display = "none";
  if (butonlar) butonlar.style.display = "none";
  if (onizlemeKart) onizlemeKart.style.display = "none";

  console.log("✅ Sayfa hazır!");
});

// ==========================================
// DERSLERİ YÜKLE
// ==========================================
async function dersleriYukle() {
  try {
    console.log("📚 Dersler yükleniyor...");

    // Öncelik: preload / electronAPI
    if (window.electronAPI && window.electronAPI.getAllDersler) {
      const result = await window.electronAPI.getAllDersler();
      if (result && result.success) {
        mevcutDersler = result.data || [];
        mevcutDersler = mevcutDersler.filter(
          (d) => d.durum === 1 || d.durum === "1"
        );
        console.log("✅ Dersler yüklendi:", mevcutDersler);
        bildirimGoster(
          "✅ " + mevcutDersler.length + " ders yüklendi",
          "success"
        );
        return;
      } else {
        console.warn("⚠️ electronAPI.getAllDersler döndürdü:", result);
      }
    }

    // Fallback: ipcRenderer direkt require (renderer context'ında çalışacaksa)
    try {
      const { ipcRenderer } = require("electron");
      const result = await ipcRenderer.invoke("get-all-dersler");
      if (result && result.success) {
        mevcutDersler = result.data || [];
        mevcutDersler = mevcutDersler.filter(
          (d) => d.durum === 1 || d.durum === "1"
        );
        console.log("✅ Dersler yüklendi (ipcRenderer):", mevcutDersler);
        bildirimGoster(
          "✅ " + mevcutDersler.length + " ders yüklendi",
          "success"
        );
        return;
      } else {
        console.warn("⚠️ ipcRenderer.get-all-dersler döndürdü:", result);
      }
    } catch (requireError) {
      console.warn("⚠️ require electron başarısız:", requireError.message);
    }

    // Test verisi (geliştirme için)
    console.warn("⚠️ Test verisi kullanılıyor (dersler)");
    mevcutDersler = [
      {
        id: 1,
        ders_adi: "Matematik",
        ders_kodu: "9.MAT",
        sinif_seviyeleri: "[9]",
        brans: "Matematik",
        ders_turu: "Ortak",
        haftalik_saat: 6,
        ders_blogu: "2-2-2",
        ogretmenler: [{ id: 1, ad_soyad: "Ahmet Yılmaz", brans: "Matematik" }],
        durum: 1,
      },
      {
        id: 2,
        ders_adi: "Türk Dili ve Edebiyatı",
        ders_kodu: "9.TDE",
        sinif_seviyeleri: "[9]",
        brans: "Türk Dili ve Edebiyatı",
        ders_turu: "Ortak",
        haftalik_saat: 5,
        ders_blogu: "2-2-1",
        ogretmenler: [
          { id: 2, ad_soyad: "Ayşe Demir", brans: "Türk Dili ve Edebiyatı" },
        ],
        durum: 1,
      },
    ];
    bildirimGoster("⚠️ Test verisi yüklendi (dersler)", "warning");
  } catch (error) {
    console.error("❌ Ders yükleme hatası:", error);
    bildirimGoster("❌ Dersler yüklenemedi!", "error");
  }
}

// ==========================================
// ÖĞRETMENLERİ YÜKLE
// ==========================================
async function ogretmenleriYukle() {
  try {
    console.log("👨‍🏫 Öğretmenler yükleniyor...");

    if (window.electronAPI && window.electronAPI.getAllTeachers) {
      const result = await window.electronAPI.getAllTeachers();
      if (result && result.success) {
        mevcutOgretmenler = result.data || [];
        console.log("✅ Öğretmenler yüklendi:", mevcutOgretmenler);
        return;
      } else {
        console.warn("⚠️ electronAPI.getAllTeachers döndürdü:", result);
      }
    }

    try {
      const { ipcRenderer } = require("electron");
      const result = await ipcRenderer.invoke("get-all-teachers");
      if (result && result.success) {
        mevcutOgretmenler = result.data || [];
        console.log(
          "✅ Öğretmenler yüklendi (ipcRenderer):",
          mevcutOgretmenler
        );
        return;
      } else {
        console.warn("⚠️ ipcRenderer.get-all-teachers döndürdü:", result);
      }
    } catch (requireError) {
      console.warn("⚠️ require electron başarısız:", requireError.message);
    }

    // Test verisi (geliştirme)
    console.warn("⚠️ Test verisi kullanılıyor (öğretmenler)");
    mevcutOgretmenler = [
      {
        id: 1,
        ad_soyad: "Ahmet Yılmaz",
        unvan: "Branş Öğretmeni",
        brans: "Matematik",
      },
      {
        id: 2,
        ad_soyad: "Ayşe Demir",
        unvan: "Branş Öğretmeni",
        brans: "Türk Dili ve Edebiyatı",
      },
    ];
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
  }
}

// ==========================================
// SINIFLARI YÜKLE
// ==========================================
async function siniflariYukle() {
  try {
    console.log("🏫 Sınıflar yükleniyor...");

    if (window.electronAPI && window.electronAPI.getAllClasses) {
      const result = await window.electronAPI.getAllClasses();
      if (result && result.success) {
        mevcutSiniflar = result.data || [];
        console.log("✅ Sınıflar yüklendi:", mevcutSiniflar);
        return;
      } else {
        console.warn("⚠️ electronAPI.getAllClasses döndürdü:", result);
      }
    }

    try {
      const { ipcRenderer } = require("electron");
      const result = await ipcRenderer.invoke("get-all-classes");
      if (result && result.success) {
        mevcutSiniflar = result.data || [];
        console.log("✅ Sınıflar yüklendi (ipcRenderer):", mevcutSiniflar);
        return;
      } else {
        console.warn("⚠️ ipcRenderer.get-all-classes döndürdü:", result);
      }
    } catch (requireError) {
      console.warn("⚠️ require electron başarısız:", requireError.message);
    }

    // Test verisi
    console.warn("⚠️ Test verisi kullanılıyor (sınıflar)");
    mevcutSiniflar = [
      { id: 1, sinif_adi: "9/A", sinif_duzey: 9 },
      { id: 2, sinif_adi: "10/B", sinif_duzey: 10 },
    ];
  } catch (error) {
    console.error("❌ Sınıf yükleme hatası:", error);
  }
}

// ==========================================
// YARDIMCI: ÖĞRETMEN ADI BUL
// ==========================================
function getOgretmenAdi(ogretmenId) {
  if (!ogretmenId) return "Atanmamış";
  const ogretmen = mevcutOgretmenler.find(
    (o) => String(o.id) === String(ogretmenId)
  );
  return ogretmen ? ogretmen.ad_soyad : "Bilinmiyor";
}

// ==========================================
// ÖĞRETMEN YÜK HESAPLA
// ==========================================
function calculateOgretmenYuk(ogretmenId) {
  const ogretmenDersleri = mevcutDersler.filter((ders) => {
    if (!ders.ogretmenler) return false;
    return ders.ogretmenler.some((og) => String(og.id) === String(ogretmenId));
  });
  const toplamSaat = ogretmenDersleri.reduce(
    (sum, ders) => sum + (Number(ders.haftalik_saat) || 0),
    0
  );
  const maxSaat = 30; // bu değeri konfigürasyondan alacak şekilde ileride taşırız
  const yuzde = Math.round((toplamSaat / maxSaat) * 100);
  return {
    toplam: toplamSaat,
    max: maxSaat,
    yuzde: yuzde,
    dersler: ogretmenDersleri,
  };
}

// ==========================================
// RAPOR TÜRÜ SEÇİLDİĞİNDE UI GÖSTER/GİZLE
// ==========================================
if (raporTuru) {
  raporTuru.addEventListener("change", function () {
    if (this.value) {
      if (filtrelerKart) filtrelerKart.style.display = "block";
      if (butonlar) butonlar.style.display = "flex";
      if (onizlemeKart) onizlemeKart.style.display = "none";
      console.log("📋 Seçilen rapor:", this.value);
    } else {
      if (filtrelerKart) filtrelerKart.style.display = "none";
      if (butonlar) butonlar.style.display = "none";
      if (onizlemeKart) onizlemeKart.style.display = "none";
    }
  });
}

// ==========================================
// ÖNİZLE BUTONU - filtreleme mantığı
// ==========================================
if (onizleBtn) {
  onizleBtn.addEventListener("click", function () {
    const raporTip = raporTuru ? raporTuru.value : "";
    const seciliSinif = sinifFiltre ? sinifFiltre.value : "";
    const seciliBrans = bransFiltre ? bransFiltre.value : "";
    const seciliTur = turFiltre ? turFiltre.value : "";

    if (!raporTip) {
      bildirimGoster("⚠️ Lütfen rapor türü seçin!", "warning");
      return;
    }

    bildirimGoster("🔄 Rapor hazırlanıyor...", "info");

    setTimeout(() => {
      // filtreliDersler global hale getirildi ve burada set ediliyor
      filtreliDersler = [...mevcutDersler];

      // Sınıf filtresi (sinifFiltre içindeki değer muhtemelen bir sinif_duzey ya da sinif id)
      if (seciliSinif) {
        filtreliDersler = filtreliDersler.filter((ders) => {
          if (!ders.sinif_seviyeleri) return false;
          try {
            const siniflar = Array.isArray(ders.sinif_seviyeleri)
              ? ders.sinif_seviyeleri
              : JSON.parse(ders.sinif_seviyeleri || "[]");
            return (
              siniflar.includes(parseInt(seciliSinif)) ||
              siniflar.includes(String(seciliSinif))
            );
          } catch (e) {
            console.warn(
              "sinif_seviyeleri parse edilemedi:",
              ders.sinif_seviyeleri
            );
            return false;
          }
        });
      }

      // Branş filtresi
      if (seciliBrans) {
        filtreliDersler = filtreliDersler.filter(
          (d) => d.brans === seciliBrans
        );
      }

      // Tür filtresi
      if (seciliTur) {
        filtreliDersler = filtreliDersler.filter(
          (d) => d.ders_turu === seciliTur
        );
      }

      if (onizlemeKart) onizlemeKart.style.display = "block";

      // Rapor tipine göre renderer'ları çağır
      switch (raporTip) {
        case "tum-dersler":
          onizlemeAlani.innerHTML = tumDerslerListesi();
          break;
        case "sinif-bazli":
          onizlemeAlani.innerHTML = sinifBazliDersler();
          break;
        case "brans-bazli":
          bransBazliDersler(filtreliDersler); // brans bazlı fonksiyon onizlemeAlani içerir
          break;
        case "ogretmen-yuku":
          ogretmenYukuRaporu();
          break;
        case "haftalik-saat":
          onizlemeAlani.innerHTML = haftalikSaatAnalizi();
          break;
        case "secmeli-dersler":
          secmeliDerslerListesi(filtreliDersler);
          break;
        case "ortak-dersler":
          onizlemeAlani.innerHTML = ortakDerslerListesi();
          break;
        case "istatistikler":
          istatistikselOzet();
          break;
        default:
          onizlemeAlani.innerHTML = "<p>Geçersiz rapor türü.</p>";
      }

      bildirimGoster("✅ Önizleme hazır!", "success");
    }, 300);
  });
}

// ==========================================
// TÜM DERSLER LİSTESİ (HTML döner)
// ==========================================
function tumDerslerListesi() {
  console.log("tumDerslerListesi çağrıldı");
  const dersler =
    filtreliDersler && filtreliDersler.length > 0
      ? filtreliDersler
      : mevcutDersler;
  console.log("Ders sayısı:", dersler.length);

  let html = `
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Ders Kodu</th>
          <th>Ders Adı</th>
          <th>Sınıf</th>
          <th>Branş</th>
          <th>Tür</th>
          <th>Haftalık Saat</th>
          <th>Blok</th>
          <th>Öğretmenler</th>
        </tr>
      </thead>
      <tbody>
  `;

  dersler.forEach((ders, i) => {
    const siniflar = (function () {
      try {
        if (!ders.sinif_seviyeleri) return "-";
        const parsed = Array.isArray(ders.sinif_seviyeleri)
          ? ders.sinif_seviyeleri
          : JSON.parse(ders.sinif_seviyeleri);
        return parsed.length ? parsed.join(", ") : "-";
      } catch (e) {
        return "-";
      }
    })();

    const ogretmenler = ders.ogretmenler
      ? ders.ogretmenler.map((o) => o.ad_soyad).join(", ")
      : "Atanmamış";

    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${ders.ders_kodu || "-"}</td>
        <td>${ders.ders_adi || "-"}</td>
        <td>${siniflar}</td>
        <td>${ders.brans || "-"}</td>
        <td>${ders.ders_turu || "-"}</td>
        <td>${ders.haftalik_saat || 0} saat</td>
        <td>${ders.ders_blogu || "-"}</td>
        <td>${ogretmenler}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <p class="note">Toplam ${dersler.length} ders listelenmiştir.</p>
  `;

  return html;
}

// ==========================================
// SINIF BAZLI DERSLER (HTML döner)
// ==========================================
function sinifBazliDersler() {
  console.log("sinifBazliDersler çağrıldı");

  const dersler =
    filtreliDersler && filtreliDersler.length > 0
      ? filtreliDersler
      : mevcutDersler;
  const sinifMap = {};

  dersler.forEach((ders) => {
    let siniflar = [];
    try {
      const val = ders.sinif_seviyeleri;
      if (Array.isArray(val)) siniflar = val;
      else if (typeof val === "string") {
        const parsed = JSON.parse(val);
        siniflar = Array.isArray(parsed)
          ? parsed
          : val.split(",").map((s) => s.trim());
      }
    } catch {
      siniflar = [];
    }
    if (!Array.isArray(siniflar)) siniflar = [];

    siniflar.forEach((sinif) => {
      if (!sinifMap[sinif]) sinifMap[sinif] = [];
      sinifMap[sinif].push(ders);
    });
  });

  let html = "";
  const siniflar = Object.keys(sinifMap).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  if (siniflar.length === 0) {
    return "<p class='no-data'>Seçilen filtreye uygun ders bulunamadı.</p>";
  }

  siniflar.forEach((sinif) => {
    const dersList = sinifMap[sinif];
    html += `
      <h3>${sinif}. Sınıf Dersleri (${dersList.length} ders)</h3>
      <table>
        <thead>
          <tr>
            <th>Ders Adı</th>
            <th>Branş</th>
            <th>Tür</th>
            <th>Haftalık Saat</th>
            <th>Öğretmen</th>
          </tr>
        </thead>
        <tbody>
    `;

    dersList.forEach((ders) => {
      const ogretmen =
        ders.ogretmenler && ders.ogretmenler.length > 0
          ? ders.ogretmenler.map((o) => o.ad_soyad).join(", ")
          : "Atanmamış";

      html += `
        <tr>
          <td>${ders.ders_adi || "-"}</td>
          <td>${ders.brans || "-"}</td>
          <td>${ders.ders_turu || "-"}</td>
          <td>${ders.haftalik_saat || 0} saat</td>
          <td>${ogretmen}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
  });

  return html;
}

// ==========================================
// Part 1 için son – sonraki parça hazır.
// ==========================================
console.log("ders-raporlari.js - Part 1 yüklendi");

// ==========================================
// DERS RAPORLARI - 2025
// (Part 2 of N) - Brans bazlı, öğretmen yükü, haftalık analiz, seçmeli/ortak, istatistikler
// ==========================================

// ==========================================
// 3. BRANŞ BAZLI DERS LİSTESİ
// ==========================================
function bransBazliDersler(dersler) {
  console.log("🔍 bransBazliDersler çağrıldı");

  // Eğer parametre verilmediyse filtreli/ana diziyi kullan
  const kaynakDersler = Array.isArray(dersler)
    ? dersler
    : filtreliDersler.length
    ? filtreliDersler
    : mevcutDersler;

  // Branşa göre grupla
  const bransGroups = {};
  kaynakDersler.forEach((ders) => {
    const brans = ders.brans || "Belirtilmemiş";
    if (!bransGroups[brans]) bransGroups[brans] = [];
    bransGroups[brans].push(ders);
  });

  let html = `
    <h2>Branş Bazlı Ders Listesi</h2>
    <table>
      <thead>
        <tr>
          <th>Branş</th>
          <th>Ders Sayısı</th>
          <th>Toplam Saat/Hafta</th>
          <th>Dersler</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.entries(bransGroups)
    .sort((a, b) => a[0].localeCompare(b[0], "tr"))
    .forEach(([brans, dersList]) => {
      const toplamSaat = dersList.reduce(
        (sum, d) => sum + (Number(d.haftalik_saat) || 0),
        0
      );
      const dersAdlari = dersList.map((d) => d.ders_adi).join(", ");
      html += `
        <tr>
          <td><strong>${brans}</strong></td>
          <td>${dersList.length}</td>
          <td>${toplamSaat} saat</td>
          <td>${dersAdlari}</td>
        </tr>
      `;
    });

  html += `
        <tr style="background: #667eea; color: white; font-weight: bold;">
          <td>GENEL TOPLAM</td>
          <td>${kaynakDersler.length}</td>
          <td>${kaynakDersler.reduce(
            (sum, d) => sum + (Number(d.haftalik_saat) || 0),
            0
          )} saat</td>
          <td>-</td>
        </tr>
      </tbody>
    </table>
  `;

  if (onizlemeAlani) onizlemeAlani.innerHTML = html;
  return html;
}

// ==========================================
// 4. ÖĞRETMEN DERS YÜKÜ RAPORU (+ GRAFİK)
// ==========================================
function ogretmenYukuRaporu() {
  console.log("🔍 ogretmenYukuRaporu çağrıldı");

  // Öğretmen yüklerini hesapla
  const ogretmenYukleri = mevcutOgretmenler.map((ogretmen) => {
    const yuk = calculateOgretmenYuk(ogretmen.id);
    return {
      ...ogretmen,
      yukBilgisi: yuk,
    };
  });

  // Yüke göre sırala (en yüklüden en aza)
  ogretmenYukleri.sort(
    (a, b) => (b.yukBilgisi.toplam || 0) - (a.yukBilgisi.toplam || 0)
  );

  let html = `
    <h2>Öğretmen Ders Yükü Raporu</h2>
    <div class="chart-container">
      <h3 style="text-align:center; margin-bottom: 12px;">📊 Öğretmen Yük Dağılımı</h3>
  `;

  ogretmenYukleri.forEach((ogretmen) => {
    const yuk = ogretmen.yukBilgisi;
    const yuzde = Math.min(100, Math.max(0, yuk.yuzde || 0));
    const yukClass =
      yuzde >= 90 ? "danger" : yuzde >= 70 ? "warning" : "success";
    html += `
      <div class="chart-bar">
        <div class="chart-label">${ogretmen.ad_soyad || "—"}</div>
        <div class="chart-bar-container" style="background: rgba(0,0,0,0.05); border-radius:8px; overflow:hidden;">
          <div class="chart-bar-fill ${yukClass}" style="width: ${yuzde}%; padding:6px 8px; box-sizing:border-box;">
            <strong style="font-size:12px;">${yuk.toplam}/${
      yuk.max
    } saat</strong> <span style="font-size:11px;">(%${yuzde})</span>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  // Tablo versiyon
  html += `
    <table style="margin-top: 18px;">
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Öğretmen Adı</th>
          <th>Branş</th>
          <th>Ders Sayısı</th>
          <th>Toplam Saat</th>
          <th>Max Saat</th>
          <th>Yük %</th>
          <th>Dersler</th>
        </tr>
      </thead>
      <tbody>
  `;

  ogretmenYukleri.forEach((ogretmen, index) => {
    const yuk = ogretmen.yukBilgisi;
    const dersAdlari =
      (yuk.dersler || []).map((d) => d.ders_adi).join(", ") || "-";
    const yukRenk =
      yuk.yuzde >= 90 ? "#ff6b6b" : yuk.yuzde >= 70 ? "#ffc107" : "#00c853";
    html += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${ogretmen.ad_soyad || "-"}</strong></td>
        <td>${ogretmen.brans || "-"}</td>
        <td>${(yuk.dersler || []).length}</td>
        <td><strong>${yuk.toplam} saat</strong></td>
        <td>${yuk.max} saat</td>
        <td style="color: ${yukRenk}; font-weight: bold;">${yuk.yuzde}%</td>
        <td style="font-size: 12px;">${dersAdlari}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <p style="margin-top:10px; font-style: italic;">Toplam ${ogretmenYukleri.length} öğretmen listelenmiştir.</p>
  `;

  if (onizlemeAlani) onizlemeAlani.innerHTML = html;

  // Animasyon: bar'ları sıfırdan animasyonla doldur
  setTimeout(() => {
    document.querySelectorAll(".chart-bar-fill").forEach((bar) => {
      const w = bar.style.width;
      bar.style.width = "0%";
      // force reflow
      void bar.offsetWidth;
      bar.style.transition = "width 700ms ease";
      setTimeout(() => (bar.style.width = w), 100);
    });
  }, 80);

  return html;
}

// ==========================================
// ✅ HAFTALIK SAAT ANALİZİ (GÜNCELLENMİŞ VE HATASIZ)
// ==========================================
function haftalikSaatAnalizi() {
  console.log("🧠 haftalikSaatAnalizi çağrıldı");

  const dersler =
    filtreliDersler && filtreliDersler.length > 0
      ? filtreliDersler
      : mevcutDersler;
  const sinifSaatleri = {};

  // 🔍 Her dersi tarayarak sınıf bazlı saatleri topla
  dersler.forEach((ders) => {
    let siniflar = [];

    try {
      const val = ders.sinif_seviyeleri;

      if (Array.isArray(val)) {
        siniflar = val;
      } else if (typeof val === "string") {
        // Dizi formatındaysa JSON olarak çöz
        if (val.trim().startsWith("[") && val.trim().endsWith("]")) {
          const parsed = JSON.parse(val);
          siniflar = Array.isArray(parsed)
            ? parsed
            : val.split(",").map((s) => s.trim());
        } else {
          // "9,10,11" gibi virgüllü metinlerde split
          siniflar = val.split(",").map((s) => s.trim());
        }
      }
    } catch (err) {
      console.warn("⚠️ sinif_seviyeleri parse hatası:", err);
      siniflar = [];
    }

    // Son güvenlik katmanı
    if (!Array.isArray(siniflar)) siniflar = [];

    // 📊 Sınıfların toplam haftalık saatini biriktir
    siniflar.forEach((sinif) => {
      const key = String(sinif)
        .replace(/[^\wğüşöçİĞÜŞÖÇ]/g, "")
        .trim();
      if (!key) return;
      sinifSaatleri[key] =
        (sinifSaatleri[key] || 0) + (Number(ders.haftalik_saat) || 0);
    });
  });

  // 💡 Tablo oluştur
  let html = `
    <h2>📆 Haftalık Ders Saati Analizi</h2>
    <table>
      <thead>
        <tr>
          <th>Sınıf</th>
          <th>Ders Sayısı</th>
          <th>Toplam Saat/Hafta</th>
          <th>Ortalama Saat/Ders</th>
        </tr>
      </thead>
      <tbody>
  `;

  const siniflar = Object.keys(sinifSaatleri).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numA - numB;
  });

  let genelToplam = 0;
  let genelDersSayisi = 0;

  siniflar.forEach((sinif) => {
    const derslerBuSinif = dersler.filter((d) => {
      try {
        const raw = d.sinif_seviyeleri;
        let ss = [];

        if (Array.isArray(raw)) {
          ss = raw.map(String);
        } else if (typeof raw === "string") {
          if (raw.trim().startsWith("[") && raw.trim().endsWith("]")) {
            const parsed = JSON.parse(raw);
            ss = Array.isArray(parsed)
              ? parsed.map(String)
              : raw.split(",").map((s) => s.trim());
          } else {
            ss = raw.split(",").map((s) => s.trim());
          }
        }

        return ss.includes(String(sinif)) || ss.includes(parseInt(sinif));
      } catch {
        return false;
      }
    });

    const toplamSaat = sinifSaatleri[sinif] || 0;
    const ortalama =
      derslerBuSinif.length > 0
        ? (toplamSaat / derslerBuSinif.length).toFixed(2)
        : "0.00";

    html += `
      <tr>
        <td>${sinif}. Sınıf</td>
        <td>${derslerBuSinif.length}</td>
        <td>${toplamSaat} saat</td>
        <td>${ortalama} saat</td>
      </tr>
    `;

    genelToplam += toplamSaat;
    genelDersSayisi += derslerBuSinif.length;
  });

  const genelOrtalama =
    genelDersSayisi > 0 ? (genelToplam / genelDersSayisi).toFixed(2) : "0.00";

  html += `
      <tr class="total-row" style="background: #667eea; color: white;">
        <td><strong>GENEL TOPLAM</strong></td>
        <td><strong>${genelDersSayisi}</strong></td>
        <td><strong>${genelToplam} saat</strong></td>
        <td><strong>${genelOrtalama} saat</strong></td>
      </tr>
    </tbody>
    </table>
  `;

  if (onizlemeAlani) onizlemeAlani.innerHTML = html;
  return html;
}

// ==========================================
// 6. SEÇMELİ DERSLER LİSTESİ
// ==========================================
function secmeliDerslerListesi(dersler) {
  console.log("🔍 secmeliDerslerListesi çağrıldı");

  const kaynakDersler = Array.isArray(dersler)
    ? dersler
    : filtreliDersler.length
    ? filtreliDersler
    : mevcutDersler;
  const secmeliDersler = kaynakDersler.filter((d) => d.ders_turu === "Seçmeli");

  // Seçmeli gruba göre grupla
  const gruplar = {};
  secmeliDersler.forEach((ders) => {
    const grup = ders.secmeli_grup || "Belirtilmemiş";
    if (!gruplar[grup]) gruplar[grup] = [];
    gruplar[grup].push(ders);
  });

  let html = `
    <h2>Seçmeli Dersler Listesi</h2>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-number">${
        secmeliDersler.length
      }</div><div class="stat-label">Toplam Seçmeli Ders</div></div>
      <div class="stat-box"><div class="stat-number">${
        Object.keys(gruplar).length
      }</div><div class="stat-label">Seçmeli Grup Sayısı</div></div>
      <div class="stat-box"><div class="stat-number">${secmeliDersler.reduce(
        (sum, d) => sum + (Number(d.haftalik_saat) || 0),
        0
      )}</div><div class="stat-label">Toplam Saat/Hafta</div></div>
    </div>
  `;

  Object.keys(gruplar)
    .sort((a, b) => a.localeCompare(b, "tr"))
    .forEach((grup) => {
      const grupDersleri = gruplar[grup];
      html += `
      <h3 style="margin-top: 20px; margin-bottom: 10px;">${grup} (${grupDersleri.length} ders)</h3>
      <table>
        <thead>
          <tr>
            <th>S.N.</th>
            <th>Ders Kodu</th>
            <th>Ders Adı</th>
            <th>Sınıf</th>
            <th>Branş</th>
            <th>Haftalık Saat</th>
            <th>Öğretmenler</th>
          </tr>
        </thead>
        <tbody>
    `;
      grupDersleri.forEach((ders, index) => {
        let siniflar = "-";
        try {
          siniflar = ders.sinif_seviyeleri
            ? Array.isArray(ders.sinif_seviyeleri)
              ? ders.sinif_seviyeleri.join(", ")
              : JSON.parse(ders.sinif_seviyeleri).join(", ")
            : "-";
        } catch (e) {
          siniflar = "-";
        }
        const ogretmenler = ders.ogretmenler
          ? ders.ogretmenler.map((og) => og.ad_soyad).join(", ")
          : "Atanmamış";
        html += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${ders.ders_kodu || "-"}</strong></td>
          <td>${ders.ders_adi || "-"}</td>
          <td>${siniflar}</td>
          <td>${ders.brans || "-"}</td>
          <td>${ders.haftalik_saat || 0} saat</td>
          <td>${ogretmenler}</td>
        </tr>
      `;
      });
      html += `</tbody></table>`;
    });

  html += `<p style="margin-top: 10px; text-align: left; font-style: italic;">Toplam ${secmeliDersler.length} seçmeli ders listelenmiştir.</p>`;

  if (onizlemeAlani) onizlemeAlani.innerHTML = html;
  return html;
}

// ==========================================
// ORTAK DERSLER LİSTESİ
// ==========================================
function ortakDerslerListesi() {
  console.log("ortakDerslerListesi çağrıldı");

  const dersler =
    filtreliDersler && filtreliDersler.length > 0
      ? filtreliDersler
      : mevcutDersler;
  const ortakDersler = dersler.filter((d) => d.ders_turu === "Ortak");

  let html = `
    <h2>Ortak Dersler Listesi</h2>
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Ders Kodu</th>
          <th>Ders Adı</th>
          <th>Sınıflar</th>
          <th>Branş</th>
          <th>Haftalık Saat</th>
          <th>Öğretmenler</th>
        </tr>
      </thead>
      <tbody>
  `;

  ortakDersler.forEach((ders, i) => {
    let sinifMetni = "-";
    try {
      const parsed = ders.sinif_seviyeleri
        ? Array.isArray(ders.sinif_seviyeleri)
          ? ders.sinif_seviyeleri
          : JSON.parse(ders.sinif_seviyeleri)
        : [];
      sinifMetni = parsed.length ? parsed.join(", ") : "-";
    } catch (e) {
      sinifMetni = "-";
    }
    const ogretmenler = ders.ogretmenler
      ? ders.ogretmenler.map((o) => o.ad_soyad).join(", ")
      : "Atanmamış";

    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${ders.ders_kodu || "-"}</td>
        <td>${ders.ders_adi || "-"}</td>
        <td>${sinifMetni}</td>
        <td>${ders.brans || "-"}</td>
        <td>${ders.haftalik_saat || 0} saat</td>
        <td>${ogretmenler}</td>
      </tr>
    `;
  });

  html += `</tbody></table><p class="note">Toplam ${ortakDersler.length} ortak ders listelenmiştir.</p>`;

  if (onizlemeAlani) onizlemeAlani.innerHTML = html;
  return html;
}

// ==========================================
// 8. İSTATİSTİKSEL ÖZET (+ GRAFİKLER)
// ==========================================
function istatistikselOzet() {
  console.log("🔍 istatistikselOzet çağrıldı");

  const toplamDers = mevcutDersler.length;
  const ortakDersler = mevcutDersler.filter((d) => d.ders_turu === "Ortak");
  const secmeliDersler = mevcutDersler.filter((d) => d.ders_turu === "Seçmeli");
  const toplamSaat = mevcutDersler.reduce(
    (sum, d) => sum + (Number(d.haftalik_saat) || 0),
    0
  );
  const ortalamaSaat =
    toplamDers > 0 ? (toplamSaat / toplamDers).toFixed(2) : "0.00";

  // Öğretmen yükleri
  const ogretmenYukleri = mevcutOgretmenler.map((og) => ({
    ...og,
    yuk: calculateOgretmenYuk(og.id),
  }));
  // En yüklü / en az yüklü öğretmen
  const sortedByYukDesc = [...ogretmenYukleri].sort(
    (a, b) => (b.yuk.toplam || 0) - (a.yuk.toplam || 0)
  );
  const enYukluOgretmen = sortedByYukDesc[0] || null;
  const enAzYukluOgretmen =
    [...ogretmenYukleri].sort(
      (a, b) => (a.yuk.toplam || 0) - (b.yuk.toplam || 0)
    )[0] || null;

  // Branş dağılımı
  const branslar = {};
  mevcutDersler.forEach((ders) => {
    const brans = ders.brans || "Belirtilmemiş";
    branslar[brans] = (branslar[brans] || 0) + 1;
  });

  let html = `
    <h2>İstatistiksel Özet</h2>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-number">${toplamDers}</div><div class="stat-label">Toplam Ders</div></div>
      <div class="stat-box"><div class="stat-number">${
        ortakDersler.length
      }</div><div class="stat-label">Ortak Dersler</div></div>
      <div class="stat-box"><div class="stat-number">${
        secmeliDersler.length
      }</div><div class="stat-label">Seçmeli Dersler</div></div>
      <div class="stat-box"><div class="stat-number">${toplamSaat}</div><div class="stat-label">Toplam Saat/Hafta</div></div>
      <div class="stat-box"><div class="stat-number">${ortalamaSaat}</div><div class="stat-label">Ortalama Saat/Ders</div></div>
      <div class="stat-box"><div class="stat-number">${
        Object.keys(branslar).length
      }</div><div class="stat-label">Branş Sayısı</div></div>
    </div>
  `;

  // Ders türü dağılımı grafik
  html += `<div class="chart-container"><h3 style="text-align:center; margin-bottom:12px;">📊 Ders Türü Dağılımı</h3>`;
  if (toplamDers > 0) {
    const ortakPct = Math.round((ortakDersler.length / toplamDers) * 100);
    const secmeliPct = Math.round((secmeliDersler.length / toplamDers) * 100);
    html += `
      <div class="chart-bar">
        <div class="chart-label">Ortak Dersler</div>
        <div class="chart-bar-container"><div class="chart-bar-fill success" style="width: ${ortakPct}%">${ortakDersler.length} ders (%${ortakPct})</div></div>
      </div>
      <div class="chart-bar">
        <div class="chart-label">Seçmeli Dersler</div>
        <div class="chart-bar-container"><div class="chart-bar-fill warning" style="width: ${secmeliPct}%">${secmeliDersler.length} ders (%${secmeliPct})</div></div>
      </div>
    `;
  } else {
    html += `<p>Veri yok</p>`;
  }
  html += `</div>`;

  // Branş dağılımı detay
  html += `<div class="chart-container"><h3 style="text-align:center; margin-bottom:12px;">📖 Branş Bazlı Ders Dağılımı</h3>`;
  const maxBransDers = Math.max(0, ...Object.values(branslar));
  Object.entries(branslar)
    .sort((a, b) => b[1] - a[1])
    .forEach(([brans, adet]) => {
      const yuzde = maxBransDers ? Math.round((adet / maxBransDers) * 100) : 0;
      html += `
      <div class="chart-bar">
        <div class="chart-label">${brans}</div>
        <div class="chart-bar-container"><div class="chart-bar-fill" style="width: ${yuzde}%">${adet} ders</div></div>
      </div>
    `;
    });
  html += `</div>`;

  // Öğretmen yük istatistikleri
  html += `
    <div class="chart-container" style="margin-top:18px;">
      <h3 style="text-align:center; margin-bottom:12px;">👨‍🏫 Öğretmen Yük İstatistikleri</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px;">
        <div style="padding:16px; background:rgba(0,245,160,0.08); border-radius:8px;">
          <div style="font-size:12px; color:var(--text-secondary);">🏆 En Yüklü Öğretmen</div>
          <div style="font-size:16px; font-weight:700; color:#00c853;">${
            enYukluOgretmen?.ad_soyad || "-"
          }</div>
          <div style="font-size:20px; font-weight:700; color:#00c853;">${
            enYukluOgretmen?.yuk.toplam || 0
          } saat (%${enYukluOgretmen?.yuk.yuzde || 0})</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:6px;">${
            (enYukluOgretmen?.yuk.dersler || []).length || 0
          } ders</div>
        </div>
        <div style="padding:16px; background:rgba(102,126,234,0.06); border-radius:8px;">
          <div style="font-size:12px; color:var(--text-secondary);">💤 En Az Yüklü Öğretmen</div>
          <div style="font-size:16px; font-weight:700; color:#667eea;">${
            enAzYukluOgretmen?.ad_soyad || "-"
          }</div>
          <div style="font-size:20px; font-weight:700; color:#667eea;">${
            enAzYukluOgretmen?.yuk.toplam || 0
          } saat (%${enAzYukluOgretmen?.yuk.yuzde || 0})</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:6px;">${
            (enAzYukluOgretmen?.yuk.dersler || []).length || 0
          } ders</div>
        </div>
      </div>
    </div>
  `;

  // Özet tablo
  html += `
    <table style="margin-top:18px;">
      <thead><tr><th>İstatistik</th><th>Değer</th></tr></thead>
      <tbody>
        <tr><td>Toplam Ders Sayısı</td><td><strong>${toplamDers}</strong></td></tr>
        <tr><td>Ortak Ders Sayısı</td><td><strong>${
          ortakDersler.length
        }</strong></td></tr>
        <tr><td>Seçmeli Ders Sayısı</td><td><strong>${
          secmeliDersler.length
        }</strong></td></tr>
        <tr><td>Toplam Haftalık Ders Saati</td><td><strong>${toplamSaat} saat</strong></td></tr>
        <tr><td>Ortalama Ders Saati</td><td><strong>${ortalamaSaat} saat</strong></td></tr>
        <tr><td>Branş Sayısı</td><td><strong>${
          Object.keys(branslar).length
        }</strong></td></tr>
        <tr><td>Toplam Öğretmen Sayısı</td><td><strong>${
          mevcutOgretmenler.length
        }</strong></td></tr>
        <tr style="background:#667eea;color:white;"><td>Ders Başına Düşen Öğretmen</td><td><strong>${
          toplamDers ? (mevcutOgretmenler.length / toplamDers).toFixed(2) : "-"
        }</strong></td></tr>
      </tbody>
    </table>
  `;

  if (onizlemeAlani) onizlemeAlani.innerHTML = html;

  // Küçük animasyon (chart fill)
  setTimeout(() => {
    document.querySelectorAll(".chart-bar-fill").forEach((bar) => {
      const w = bar.style.width || "0%";
      bar.style.width = "0%";
      void bar.offsetWidth;
      bar.style.transition = "width 700ms ease";
      setTimeout(() => (bar.style.width = w), 120);
    });
  }, 80);

  return html;
}

// ==========================================
// Part 2 için son - Part 3'e geçmeye hazırım.
// ==========================================
console.log("ders-raporlari.js - Part 2 yüklendi");

// ==========================================
// DERS RAPORLARI - 2025
// (Part 3 of N) - PDF/Excel Çıktıları, Event Handler’lar, Yapay Zeka Analiz, Final
// ==========================================

// ==========================================
// PDF İNDİR – OKUL ADI %100 GELİR (SENİN ÇALIŞAN KODUNDAN UYARLANDI)
// ==========================================
document
  .getElementById("pdfIndir")
  .addEventListener("click", async function () {
    try {
      bildirimGoster("PDF oluşturuluyor...", "info");

      const htmlIcerik = onizlemeAlani.innerHTML.trim();
      if (!htmlIcerik) {
        bildirimGoster("Önce rapor önizlemesi yapın!", "warning");
        return;
      }

      const raporTip = raporTuru.value;
      const tarih = new Date().toLocaleDateString("tr-TR");

      // RAPOR BAŞLIĞI (Ders Raporları için)
      const basliklar = {
        "tum-dersler": "TÜM DERSLER LİSTESİ",
        "sinif-bazli": "SINIF BAZLI DERS DAĞILIMI",
        "brans-bazli": "BRANŞ BAZLI DERS LİSTESİ",
        "ogretmen-yuku": "ÖĞRETMEN DERS YÜKÜ RAPORU",
        "haftalik-saat": "HAFTALIK SAAT ANALİZİ",
        "secmeli-dersler": "SEÇMELİ DERSLER LİSTESİ",
        "ortak-dersler": "ORTAK DERSLER LİSTESİ",
        istatistikler: "İSTATİSTİKSEL ÖZET",
      };
      const baslikMetni = basliklar[raporTip] || "DERS RAPORU";

      // OKUL ADI – SENİN ÇALIŞAN KODUNDAN ALINDI
      let schoolName = "Bahçelievler Cumhuriyet Anadolu Lisesi"; // fallback
      try {
        const currentUserStr =
          sessionStorage.getItem("currentUser") ||
          localStorage.getItem("currentUser");
        if (currentUserStr) {
          const user = JSON.parse(currentUserStr);
          schoolName =
            user.school?.okul_adi ||
            user.okul_adi ||
            user.okulAdi ||
            schoolName;
        }
      } catch (e) {
        console.warn("currentUser parse edilemedi:", e);
      }

      // KAYMAKAMLIK – prompt ile bir kere sor, sonra kaydet
      let kaymakamlik = localStorage.getItem("kaymakamlikAdi");
      if (!kaymakamlik) {
        kaymakamlik = prompt("Kaymakamlık adını girin (örnek: Bahçelievler):");
        if (kaymakamlik && kaymakamlik.trim()) {
          localStorage.setItem("kaymakamlikAdi", kaymakamlik.trim());
        } else {
          kaymakamlik = "KAYMAKAMLIĞI";
        }
      }

      // PDF HTML ŞABLONU
      const tamHTML = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #000 !important; background: white; padding: 10mm; }
    .tarih { font-size: 11px; text-align: right; margin-bottom: 5px; }
    .ust-baslik { text-align: center; margin-bottom: 10px; line-height: 1.3; }
    .ust-baslik h3, .ust-baslik h4 { font-size: 13px; margin: 3px 0; }
    .ust-baslik h2 { font-size: 15px; font-weight: bold; margin: 8px 0 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
    th { background: #f0f0f0 !important; text-align: center; font-weight: bold; }
    .note { font-style: italic; margin-top: 8px; font-size: 10px; }
    .chart-container, .stats-grid, .stat-box { display: none !important; }
    @page { margin: 10mm 12mm 15mm 12mm; size: A4 portrait; }
  </style>
</head>
<body>
  <div class="tarih">${tarih}</div>
  <div class="ust-baslik">
    <h3>T.C.</h3>
    <h4>${kaymakamlik.toUpperCase()} KAYMAKAMLIĞI</h4>
    <h4>${schoolName}</h4>
    <h2>${baslikMetni}</h2>
  </div>
  ${htmlIcerik}
</body>
</html>`;

      // PDF OLUŞTUR
      let result;
      try {
        if (window.electronAPI?.createPDF) {
          result = await window.electronAPI.createPDF({
            html: tamHTML,
            fileName: `${baslikMetni}_${tarih}.pdf`,
          });
        } else {
          const { ipcRenderer } = require("electron");
          result = await ipcRenderer.invoke("create-pdf", {
            html: tamHTML,
            fileName: `${baslikMetni}_${tarih}.pdf`,
          });
        }

        bildirimGoster(
          result?.success
            ? "PDF başarıyla indirildi!"
            : "PDF oluşturulamadı: " + (result?.message || ""),
          result?.success ? "success" : "error"
        );
      } catch (pdfErr) {
        console.error("PDF hatası:", pdfErr);
        bildirimGoster("PDF oluşturulamadı!", "error");
      }
    } catch (err) {
      console.error("PDF genel hata:", err);
      bildirimGoster("PDF hatası!", "error");
    }
  });

// ==========================================
// YAPAY ZEKA DESTEKLİ ANALİZ MODÜLÜ
// ==========================================
async function yapayZekaAnalizBaslat() {
  try {
    bildirimGoster("Yapay zeka analizi başlatılıyor...", "info");

    const analizVerisi = {
      ogretmenler: mevcutOgretmenler,
      dersler: mevcutDersler,
      siniflar: mevcutSiniflar,
    };

    const sonuc = yapayZekaAnalizLokal(analizVerisi);

    onizlemeAlani.innerHTML = sonuc.html;
    onizlemeKart.style.display = "block";
    bildirimGoster("Analiz tamamlandı!", "success");
  } catch (error) {
    console.error("Yapay zeka analiz hatası:", error);
    bildirimGoster("Analiz sırasında hata oluştu.", "error");
  }
}

function yapayZekaAnalizLokal({ ogretmenler, dersler }) {
  const toplamDers = dersler.length;
  const ogretmenYukleri = ogretmenler.map((og) => ({
    ...og,
    yuk: calculateOgretmenYuk(og.id),
  }));

  const yukOrtalama =
    ogretmenYukleri.length > 0
      ? ogretmenYukleri.reduce((s, o) => s + o.yuk.toplam, 0) /
        ogretmenYukleri.length
      : 0;

  const asiriYuklu = ogretmenYukleri.filter(
    (o) => o.yuk.toplam > yukOrtalama * 1.3
  );
  const azYuklu = ogretmenYukleri.filter(
    (o) => o.yuk.toplam < yukOrtalama * 0.7 && o.yuk.toplam > 0
  );

  let html = `
    <div style="padding: 16px; background: #f8f9fa; border-radius: 12px; border: 1px solid #dee2e6;">
      <h2 style="color: #2c3e50; margin-bottom: 12px;">Yapay Zeka Analizi</h2>
      <p><strong>${
        ogretmenler.length
      }</strong> öğretmen, <strong>${toplamDers}</strong> ders incelendi.</p>
      
      <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin: 12px 0;">
        <p><strong>Ortalama Yük:</strong> ${yukOrtalama.toFixed(
          2
        )} saat/öğretmen</p>
      </div>

      ${
        asiriYuklu.length > 0
          ? `
        <div style="background: #ffebee; padding: 12px; border-radius: 8px; margin: 12px 0; border-left: 4px solid #f44336;">
          <h4 style="color: #c62828; margin: 0 0 8px 0;">Aşırı Yüklü Öğretmenler (${
            asiriYuklu.length
          })</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${asiriYuklu
              .map(
                (o) =>
                  `<li><strong>${o.ad_soyad}</strong> → ${o.yuk.toplam} saat</li>`
              )
              .join("")}
          </ul>
        </div>
      `
          : ""
      }

      ${
        azYuklu.length > 0
          ? `
        <div style="background: #e8f5e8; padding: 12px; border-radius: 8px; margin: 12px 0; border-left: 4px solid #4caf50;">
          <h4 style="color: #2e7d32; margin: 0 0 8px 0;">Az Yüklü Öğretmenler (${
            azYuklu.length
          })</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${azYuklu
              .map(
                (o) =>
                  `<li><strong>${o.ad_soyad}</strong> → ${o.yuk.toplam} saat</li>`
              )
              .join("")}
          </ul>
        </div>
      `
          : ""
      }
      
      ${
        asiriYuklu.length === 0 && azYuklu.length === 0
          ? `
        <div style="background: #e8f5e8; padding: 12px; border-radius: 8px; border-left: 4px solid #4caf50;">
          <p style="margin: 0; color: #2e7d32;"><strong>Tebrikler!</strong> Öğretmen yük dağılımı dengeli.</p>
        </div>
      `
          : ""
      }
    </div>
  `;

  return { html };
}

// ==========================================
// 11. EVENT HANDLERLAR
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 ders-raporlari.js yüklendi");

  const raporSec = document.getElementById("raporTuru");
  const olusturBtn = document.getElementById("raporOlusturBtn");
  const pdfBtn = document.getElementById("pdfIndirBtn");
  const excelBtn = document.getElementById("excelIndirBtn");
  const analizBtn = document.getElementById("analizBtn");

  if (olusturBtn) {
    olusturBtn.addEventListener("click", () => {
      const tur = raporSec?.value || "genel";
      showModernToast(`📑 "${tur}" raporu hazırlanıyor...`, "info");

      switch (tur) {
        case "brans":
          bransBazliDersler();
          break;
        case "ogretmenYuku":
          ogretmenYukuRaporu();
          break;
        case "haftalik":
          haftalikSaatAnalizi();
          break;
        case "secmeli":
          secmeliDerslerListesi();
          break;
        case "ortak":
          ortakDerslerListesi();
          break;
        case "istatistik":
          istatistikselOzet();
          break;
        default:
          showModernToast("⚠️ Geçerli rapor türü seçilmedi.", "warning");
          break;
      }
    });
  }

  if (pdfBtn) pdfBtn.addEventListener("click", () => raporuIndir("pdf"));
  if (excelBtn) excelBtn.addEventListener("click", () => raporuIndir("excel"));
  if (analizBtn)
    analizBtn.addEventListener("click", () => yapayZekaAnalizBaslat());
});

// ==========================================
// 12. MODERN TOAST BİLDİRİMİ
// ==========================================
function showModernToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `modern-toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("visible"), 10);

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ==========================================
// 13. YARDIMCI FONKSİYONLAR
// ==========================================
function calculateOgretmenYuk(ogretmenId) {
  const ogretmenDersleri = mevcutDersler.filter((d) =>
    (d.ogretmenler || []).some((o) => o.id === ogretmenId)
  );
  const toplam = ogretmenDersleri.reduce(
    (sum, d) => sum + (Number(d.haftalik_saat) || 0),
    0
  );
  const max = 30; // örnek maksimum haftalık saat
  const yuzde = Math.round((toplam / max) * 100);
  return { toplam, max, yuzde, dersler: ogretmenDersleri };
}

// ==========================================
// 14. STİL EKLEME (Modern Toast CSS)
// ==========================================
const style = document.createElement("style");
style.textContent = `
  .modern-toast {
    position: fixed;
    left: 50%;
    bottom: 30px;
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
    background: #333;
    color: #fff;
    padding: 12px 22px;
    border-radius: 10px;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    transition: all 0.4s ease;
    z-index: 9999;
  }
  .modern-toast.visible {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
  .modern-toast.success { background: #00c853; }
  .modern-toast.error { background: #ff5252; }
  .modern-toast.warning { background: #ffb300; color:#222; }
  .modern-toast.info { background: #2196f3; }
`;
document.head.appendChild(style);

// ======= ÜST BİLGİ MODAL - Modern ve güvenli sürüm =======
if (!window.__ustBilgiInit) {
  window.__ustBilgiInit = true;

  (function () {
    if (!document.getElementById("ustBilgiModal")) {
      const modalHtml = `
        <div id="ustBilgiModal" class="modern-modal" style="display:none;">
          <div class="modal-box">
            <div class="modal-header">
              <h2>Kaymakamlık Bilgisi</h2>
              <button id="ustBilgiKapat" class="close-btn" aria-label="Kapat">&times;</button>
            </div>
            <p style="font-size:14px;color:#555;margin-bottom:10px;">
              Lütfen bağlı bulunduğunuz <strong>Kaymakamlık adını</strong> giriniz.
            </p>
            <input type="text" id="kaymakamlikInput" class="modal-input" placeholder="Örn: Bahçelievler Kaymakamlığı" />
            <div class="modal-footer">
              <button id="ustBilgiKaydet" class="btn-save">Kaydet</button>
              <button id="ustBilgiKapatAlt" class="btn-cancel">Kapat</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
    }

    if (!document.getElementById("ustBilgiModalStyles")) {
      const style = document.createElement("style");
      style.id = "ustBilgiModalStyles";
      style.textContent = `
        .modern-modal {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(4px);
          animation: fadeIn .2s ease;
        }
        .modal-box {
          background: #fff;
          border-radius: 14px;
          padding: 20px;
          width: 90%;
          max-width: 420px;
          box-shadow: 0 8px 35px rgba(0,0,0,0.3);
          animation: scaleIn .22s ease;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px;
        }
        .modal-header h2 {
          font-size: 18px; color: #2c3e50; margin: 0;
        }
        .close-btn {
          background: none; border: 0;
          font-size: 22px; color: #555;
          cursor: pointer;
        }
        .close-btn:hover { color: #e74c3c; transform: scale(1.05); }
        .modal-input {
          width: 100%;
          padding: 10px;
          font-size: 14px;
          border: 1px solid #ccc;
          border-radius: 6px;
          outline: none;
        }
        .modal-input:focus {
          border-color: #6c5ce7;
          box-shadow: 0 0 6px rgba(108,92,231,0.35);
        }
        .modal-footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 12px;
        }
        .btn-save {
          background: linear-gradient(135deg,#6c5ce7 0%,#341f97 100%);
          color: #fff; border: 0;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
        }
        .btn-cancel {
          background: #f0f0f0;
          border: 0;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }
      `;
      document.head.appendChild(style);
    }

    const ustBilgiModalEl = document.getElementById("ustBilgiModal");
    const ustBilgiAyarBtnEl = document.getElementById("ustBilgiAyarBtn");
    const kaymakamlikInputEl = document.getElementById("kaymakamlikInput");
    const ustBilgiKaydetEl = document.getElementById("ustBilgiKaydet");
    const ustBilgiKapatEl = document.getElementById("ustBilgiKapat");
    const ustBilgiKapatAltEl = document.getElementById("ustBilgiKapatAlt");

    function openUstBilgiModal() {
      ustBilgiModalEl.style.display = "flex";
      kaymakamlikInputEl.value = localStorage.getItem("kaymakamlikAdi") || "";
      setTimeout(() => kaymakamlikInputEl.focus(), 100);
    }

    function closeUstBilgiModal() {
      ustBilgiModalEl.style.display = "none";
    }

    if (ustBilgiAyarBtnEl)
      ustBilgiAyarBtnEl.addEventListener("click", openUstBilgiModal);
    ustBilgiKapatEl.addEventListener("click", closeUstBilgiModal);
    ustBilgiKapatAltEl.addEventListener("click", closeUstBilgiModal);

    ustBilgiKaydetEl.addEventListener("click", () => {
      const val = kaymakamlikInputEl.value.trim();
      if (!val) {
        if (typeof bildirimGoster === "function")
          bildirimGoster("⚠️ Lütfen Kaymakamlık adını giriniz!", "warning");
        else alert("Lütfen Kaymakamlık adını giriniz!");
        return;
      }
      localStorage.setItem("kaymakamlikAdi", val);
      if (typeof bildirimGoster === "function")
        bildirimGoster("✅ Kaymakamlık bilgisi kaydedildi.", "success");
      closeUstBilgiModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeUstBilgiModal();
    });

    ustBilgiModalEl.addEventListener("click", (e) => {
      if (e.target === ustBilgiModalEl) closeUstBilgiModal();
    });
  })();
}
// ======= /ÜST BİLGİ MODAL =======

console.log("✅ ders-raporlari.js (Üst Bilgi Modal) başarıyla güncellendi");

// ==========================================
// FİNAL - HER ŞEY BAŞARIYLA YÜKLENDİ
// ==========================================
console.log("✅ ders-raporlari.js (Part 3) başarıyla yüklendi");
