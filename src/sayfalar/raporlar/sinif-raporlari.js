// ==========================================
// BİLDİRİM FONKSİYONU
// ==========================================
function bildirimGoster(mesaj, tip = "info") {
  console.log(`[${tip.toUpperCase()}] ${mesaj}`);

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

console.log("📊 Sınıf Raporları sayfası yüklendi");

// ==========================================
// ELEMANLAR
// ==========================================
const raporTuru = document.getElementById("raporTuru");
const filtrelerKart = document.getElementById("filtrelerKart");
const butonlar = document.getElementById("butonlar");
const onizlemeKart = document.getElementById("onizlemeKart");
const onizlemeAlani = document.getElementById("onizlemeAlani");
const duzeyFiltre = document.getElementById("duzeyFiltre");
const alanFiltre = document.getElementById("alanFiltre");

let mevcutSiniflar = [];
let mevcutOgretmenler = [];

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
  await siniflariYukle();
  await ogretmenleriYukle();
});

// ==========================================
// SINIFLARI YÜKLE
// ==========================================
async function siniflariYukle() {
  try {
    console.log("🔄 Sınıflar yükleniyor...");

    if (window.electronAPI && window.electronAPI.getAllClasses) {
      const result = await window.electronAPI.getAllClasses();

      if (result.success) {
        mevcutSiniflar = result.data;
        mevcutSiniflar = mevcutSiniflar.filter(
          (s) => s.durum === 1 || s.durum === "1"
        );
        console.log("✅ Sınıflar yüklendi:", mevcutSiniflar);
        bildirimGoster(
          "✅ " + mevcutSiniflar.length + " sınıf yüklendi",
          "success"
        );
        return;
      }
    }

    try {
      const { ipcRenderer } = require("electron");
      const result = await ipcRenderer.invoke("get-all-classes");

      if (result.success) {
        mevcutSiniflar = result.data;
        mevcutSiniflar = mevcutSiniflar.filter(
          (s) => s.durum === 1 || s.durum === "1"
        );
        console.log("✅ Sınıflar yüklendi (ipcRenderer):", mevcutSiniflar);
        bildirimGoster(
          "✅ " + mevcutSiniflar.length + " sınıf yüklendi",
          "success"
        );
        return;
      }
    } catch (requireError) {
      console.warn("⚠️ require electron başarısız:", requireError.message);
    }

    console.warn("⚠️ Test verisi kullanılıyor");
    mevcutSiniflar = [
      {
        id: 1,
        sinif_adi: "9/A",
        sinif_duzey: 9,
        sube: "A",
        alan: "Alanı Yok",
        sinif_ogretmeni_id: 1,
        mudur_yardimcisi_id: 2,
        rehber_ogretmen_id: 3,
        ogrenci_sayisi: 30,
        erkek_sayisi: 15,
        kiz_sayisi: 15,
        durum: 1,
      },
      {
        id: 2,
        sinif_adi: "10/B",
        sinif_duzey: 10,
        sube: "B",
        alan: "Sayısal",
        sinif_ogretmeni_id: 4,
        mudur_yardimcisi_id: 2,
        rehber_ogretmen_id: 3,
        ogrenci_sayisi: 28,
        erkek_sayisi: 14,
        kiz_sayisi: 14,
        durum: 1,
      },
    ];
    bildirimGoster("⚠️ Test verisi yüklendi", "warning");
  } catch (error) {
    console.error("❌ Sınıf yükleme hatası:", error);
    bildirimGoster("❌ Sınıflar yüklenemedi!", "error");
  }
}

// ==========================================
// ÖĞRETMENLERİ YÜKLE
// ==========================================
async function ogretmenleriYukle() {
  try {
    console.log("🔄 Öğretmenler yükleniyor...");

    if (window.electronAPI && window.electronAPI.getAllTeachers) {
      const result = await window.electronAPI.getAllTeachers();

      if (result.success) {
        mevcutOgretmenler = result.data;
        console.log("✅ Öğretmenler yüklendi:", mevcutOgretmenler);
        return;
      }
    }

    try {
      const { ipcRenderer } = require("electron");
      const result = await ipcRenderer.invoke("get-all-teachers");

      if (result.success) {
        mevcutOgretmenler = result.data;
        console.log(
          "✅ Öğretmenler yüklendi (ipcRenderer):",
          mevcutOgretmenler
        );
        return;
      }
    } catch (requireError) {
      console.warn("⚠️ require electron başarısız:", requireError.message);
    }

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
        ad_soyad: "Mehmet Demir",
        unvan: "Müdür Yardımcısı",
        brans: "Fizik",
      },
      {
        id: 3,
        ad_soyad: "Ayşe Kaya",
        unvan: "Rehberlik Öğretmeni",
        brans: "Rehberlik",
      },
      {
        id: 4,
        ad_soyad: "Fatma Şahin",
        unvan: "Branş Öğretmeni",
        brans: "Türkçe",
      },
    ];
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
  }
}

// ==========================================
// ÖĞRETMEN ADI BUL
// ==========================================
function getOgretmenAdi(ogretmenId) {
  if (!ogretmenId) return "Atanmamış";
  const ogretmen = mevcutOgretmenler.find((o) => o.id === ogretmenId);
  return ogretmen ? ogretmen.ad_soyad : "Bilinmiyor";
}

// ==========================================
// RAPOR TÜRÜ SEÇİLDİĞİNDE
// ==========================================
raporTuru.addEventListener("change", function () {
  if (this.value) {
    filtrelerKart.style.display = "block";
    butonlar.style.display = "flex";
    onizlemeKart.style.display = "none";
    console.log("📋 Seçilen rapor:", this.value);
  } else {
    filtrelerKart.style.display = "none";
    butonlar.style.display = "none";
    onizlemeKart.style.display = "none";
  }
});

// ==========================================
// ÖNİZLE BUTONU
// ==========================================
document.getElementById("onizleBtn").addEventListener("click", function () {
  const raporTip = raporTuru.value;
  const seciliDuzey = duzeyFiltre.value;
  const seciliAlan = alanFiltre.value;

  if (!raporTip) {
    bildirimGoster("⚠️ Lütfen rapor türü seçin!", "warning");
    return;
  }

  bildirimGoster("🔄 Rapor hazırlanıyor...", "info");

  setTimeout(() => {
    let filtreliSiniflar = [...mevcutSiniflar];

    // Düzey filtresi
    if (seciliDuzey) {
      filtreliSiniflar = filtreliSiniflar.filter(
        (s) => s.sinif_duzey === parseInt(seciliDuzey)
      );
    }

    // Alan filtresi
    if (seciliAlan) {
      filtreliSiniflar = filtreliSiniflar.filter((s) => s.alan === seciliAlan);
    }

    onizlemeKart.style.display = "block";

    switch (raporTip) {
      case "sinif-listesi":
        sinifListesiOlustur(filtreliSiniflar);
        break;
      case "subeye-gore-liste":
        subeyeGoreListeOlustur(filtreliSiniflar);
        break;
      case "duzeye-gore-liste":
        duzeyeGoreListeOlustur(filtreliSiniflar);
        break;
      case "alana-gore-dagilim":
        alanaGoreDagilimiOlustur(filtreliSiniflar);
        break;
      case "ogretmen-atama-listesi":
        ogretmenAtamaListesiOlustur(filtreliSiniflar);
        break;
      case "ogrenci-mevcudu-raporu":
        ogrenciMevcuduRaporuOlustur(filtreliSiniflar);
        break;
      case "rehber-ogretmen-listesi":
        rehberOgretmenListesiOlustur(filtreliSiniflar);
        break;
    }

    bildirimGoster("✅ Önizleme hazır!", "success");
  }, 500);
});

// ==========================================
// SINIF LİSTESİ OLUŞTUR
// ==========================================
function sinifListesiOlustur(siniflar) {
  console.log("🔍 sinifListesiOlustur çağrıldı");
  console.log("📊 Sınıf sayısı:", siniflar.length);

  const html = `
    <style>
      table th, table td {
        border: 1px solid #000;
        padding: 6px;
        text-align: left;
        font-size: 11px;
        vertical-align: middle;
      }
      table th {
        background: #f0f0f0;
        font-weight: bold;
        text-align: center;
      }
    </style>
    <h2>Sınıf Listesi</h2>
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Sınıf Adı</th>
          <th>Düzey</th>
          <th>Şube</th>
          <th>Alan</th>
          <th>Sınıf Öğretmeni</th>
        </tr>
      </thead>
      <tbody>
        ${siniflar
          .map(
            (sinif, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${sinif.sinif_adi || ""}</td>
            <td>${sinif.sinif_duzey}. Sınıf</td>
            <td>${sinif.sube || ""}</td>
            <td>${sinif.alan || "-"}</td>
            <td>${getOgretmenAdi(sinif.sinif_ogretmeni_id)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${siniflar.length} sınıf listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

console.log("✅ Sınıf Raporları scripti yüklendi (Part 1)");

// ==========================================
// ŞUBEYE GÖRE LİSTE OLUŞTUR
// ==========================================
function subeyeGoreListeOlustur(siniflar) {
  console.log("🔍 subeyeGoreListeOlustur çağrıldı");

  // Şubeye göre sırala
  const siraliSiniflar = [...siniflar].sort((a, b) => {
    if (a.sube !== b.sube) {
      return a.sube.localeCompare(b.sube, "tr");
    }
    return a.sinif_duzey - b.sinif_duzey;
  });

  const html = `
    <h2>Şubeye Göre Sınıf Listesi</h2>
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Şube</th>
          <th>Sınıf Adı</th>
          <th>Düzey</th>
          <th>Alan</th>
          <th>Sınıf Öğretmeni</th>
        </tr>
      </thead>
      <tbody>
        ${siraliSiniflar
          .map(
            (sinif, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${sinif.sube}</strong></td>
            <td>${sinif.sinif_adi || ""}</td>
            <td>${sinif.sinif_duzey}. Sınıf</td>
            <td>${sinif.alan || "-"}</td>
            <td>${getOgretmenAdi(sinif.sinif_ogretmeni_id)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${siniflar.length} sınıf listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// DÜZEYE GÖRE LİSTE OLUŞTUR
// ==========================================
function duzeyeGoreListeOlustur(siniflar) {
  console.log("🔍 duzeyeGoreListeOlustur çağrıldı");

  // Düzeye göre sırala
  const siraliSiniflar = [...siniflar].sort((a, b) => {
    if (a.sinif_duzey !== b.sinif_duzey) {
      return a.sinif_duzey - b.sinif_duzey;
    }
    return a.sube.localeCompare(b.sube, "tr");
  });

  const html = `
    <h2>Düzeye Göre Sınıf Listesi</h2>
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Düzey</th>
          <th>Sınıf Adı</th>
          <th>Şube</th>
          <th>Alan</th>
          <th>Öğrenci Sayısı</th>
        </tr>
      </thead>
      <tbody>
        ${siraliSiniflar
          .map(
            (sinif, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${sinif.sinif_duzey}. Sınıf</strong></td>
            <td>${sinif.sinif_adi || ""}</td>
            <td>${sinif.sube || ""}</td>
            <td>${sinif.alan || "-"}</td>
            <td>${sinif.ogrenci_sayisi || 0}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${siniflar.length} sınıf listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// ALANA GÖRE DAĞILIM OLUŞTUR
// ==========================================
function alanaGoreDagilimiOlustur(siniflar) {
  console.log("🔍 alanaGoreDagilimiOlustur çağrıldı");
  console.log("📊 Sınıf sayısı:", siniflar.length);

  const alanlar = {};

  siniflar.forEach((sinif) => {
    const alan = sinif.alan || "Belirtilmemiş";
    if (!alanlar[alan]) {
      alanlar[alan] = { toplam: 0, siniflar: [] };
    }
    alanlar[alan].toplam++;
    alanlar[alan].siniflar.push(sinif.sinif_adi);
  });

  console.log("📊 Alan dağılımı:", alanlar);

  const html = `
    <h2>Alana Göre Dağılım</h2>
    <table>
      <thead>
        <tr>
          <th>Alan</th>
          <th>Sınıf Sayısı</th>
          <th>Sınıflar</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(alanlar)
          .map(
            ([alan, data]) => `
          <tr>
            <td><strong>${alan}</strong></td>
            <td>${data.toplam}</td>
            <td>${data.siniflar.join(", ")}</td>
          </tr>
        `
          )
          .join("")}
        <tr style="background: #667eea; color: white; font-weight: bold;">
          <td>GENEL TOPLAM</td>
          <td>${siniflar.length}</td>
          <td>-</td>
        </tr>
      </tbody>
    </table>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// ÖĞRETMEN ATAMA LİSTESİ OLUŞTUR
// ==========================================
function ogretmenAtamaListesiOlustur(siniflar) {
  console.log("🔍 ogretmenAtamaListesiOlustur çağrıldı");

  const html = `
    <h2>Öğretmen Atama Listesi</h2>
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Sınıf Adı</th>
          <th>Sınıf Öğretmeni</th>
          <th>Müdür Yardımcısı</th>
          <th>Rehber Öğretmen</th>
        </tr>
      </thead>
      <tbody>
        ${siniflar
          .map(
            (sinif, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${sinif.sinif_adi || ""}</strong></td>
            <td>${getOgretmenAdi(sinif.sinif_ogretmeni_id)}</td>
            <td>${getOgretmenAdi(sinif.mudur_yardimcisi_id)}</td>
            <td>${getOgretmenAdi(sinif.rehber_ogretmen_id)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${siniflar.length} sınıf listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// ÖĞRENCİ MEVCUDU RAPORU OLUŞTUR
// ==========================================
function ogrenciMevcuduRaporuOlustur(siniflar) {
  console.log("🔍 ogrenciMevcuduRaporuOlustur çağrıldı");

  // Toplam hesapla
  const toplamOgrenci = siniflar.reduce(
    (sum, s) => sum + (s.ogrenci_sayisi || 0),
    0
  );
  const toplamErkek = siniflar.reduce(
    (sum, s) => sum + (s.erkek_sayisi || 0),
    0
  );
  const toplamKiz = siniflar.reduce((sum, s) => sum + (s.kiz_sayisi || 0), 0);

  const html = `
    <h2>Öğrenci Mevcudu Raporu</h2>
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Sınıf Adı</th>
          <th>Erkek</th>
          <th>Kız</th>
          <th>Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${siniflar
          .map(
            (sinif, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${sinif.sinif_adi || ""}</strong></td>
            <td>${sinif.erkek_sayisi || 0}</td>
            <td>${sinif.kiz_sayisi || 0}</td>
            <td><strong>${sinif.ogrenci_sayisi || 0}</strong></td>
          </tr>
        `
          )
          .join("")}
        <tr style="background: #667eea; color: white; font-weight: bold;">
          <td colspan="2">GENEL TOPLAM</td>
          <td>${toplamErkek}</td>
          <td>${toplamKiz}</td>
          <td>${toplamOgrenci}</td>
        </tr>
      </tbody>
    </table>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// REHBER ÖĞRETMEN LİSTESİ OLUŞTUR
// ==========================================
function rehberOgretmenListesiOlustur(siniflar) {
  console.log("🔍 rehberOgretmenListesiOlustur çağrıldı");

  // Rehber öğretmene göre grupla
  const rehberOgretmenler = {};

  siniflar.forEach((sinif) => {
    const rehberOgretmenAdi = getOgretmenAdi(sinif.rehber_ogretmen_id);

    if (!rehberOgretmenler[rehberOgretmenAdi]) {
      rehberOgretmenler[rehberOgretmenAdi] = [];
    }
    rehberOgretmenler[rehberOgretmenAdi].push(sinif);
  });

  let html = `
    <h2>Rehber Öğretmen Listesi</h2>
    <table>
      <thead>
        <tr>
          <th>Rehber Öğretmen</th>
          <th>Sınıflar</th>
          <th>Sınıf Sayısı</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.entries(rehberOgretmenler).forEach(([ogretmen, siniflar]) => {
    const sinifAdlari = siniflar.map((s) => s.sinif_adi).join(", ");
    html += `
      <tr>
        <td><strong>${ogretmen}</strong></td>
        <td>${sinifAdlari}</td>
        <td>${siniflar.length}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${Object.keys(rehberOgretmenler).length} rehber öğretmen.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

console.log("✅ Sınıf Raporları scripti yüklendi (Part 2)");

// ==========================================
// PDF İNDİR
// ==========================================
document
  .getElementById("pdfIndir")
  .addEventListener("click", async function () {
    try {
      bildirimGoster("🔄 PDF oluşturuluyor, lütfen bekleyin...", "info");

      const htmlIcerik = onizlemeAlani.innerHTML;

      if (!htmlIcerik || htmlIcerik.trim() === "") {
        bildirimGoster("⚠️ Önce rapor önizlemesi yapın!", "warning");
        return;
      }

      const raporTip = raporTuru.value;
      const tarih = new Date().toLocaleDateString("tr-TR");

      let baslikMetni = "";
      switch (raporTip) {
        case "sinif-listesi":
          baslikMetni = "SINIF LİSTESİ";
          break;
        case "subeye-gore-liste":
          baslikMetni = "ŞUBEYE GÖRE SINIF LİSTESİ";
          break;
        case "duzeye-gore-liste":
          baslikMetni = "DÜZEYE GÖRE SINIF LİSTESİ";
          break;
        case "alana-gore-dagilim":
          baslikMetni = "ALANA GÖRE DAĞILIM";
          break;
        case "ogretmen-atama-listesi":
          baslikMetni = "ÖĞRETMEN ATAMA LİSTESİ";
          break;
        case "ogrenci-mevcudu-raporu":
          baslikMetni = "ÖĞRENCİ MEVCUDU RAPORU";
          break;
        case "rehber-ogretmen-listesi":
          baslikMetni = "REHBER ÖĞRETMEN LİSTESİ";
          break;
        default:
          baslikMetni = "SINIF RAPORU";
      }

      const schoolName = sessionStorage.getItem("currentUser")
        ? JSON.parse(sessionStorage.getItem("currentUser")).school?.okul_adi ||
          "Bahçelievler Cumhuriyet Anadolu Lisesi"
        : "Bahçelievler Cumhuriyet Anadolu Lisesi";

      const tamHTML = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      color: #000 !important;
      background: white;
      margin: 0;
      padding: 0;
    }

    .tarih {
      font-size: 11px;
      text-align: right;
      margin-bottom: 5px;
      color: #000;
    }

    .ust-baslik {
      text-align: center;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    .ust-baslik h3, 
    .ust-baslik h4, 
    .ust-baslik h2 {
      color: #000 !important;
      margin: 2px 0;
      page-break-after: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
      margin-left: 0 !important;
      margin-right: 0 !important;
      page-break-inside: auto;
      display: table;
    }

    th, td {
      border: 1px solid #000;
      padding: 6px;
      text-align: left;
      color: #000 !important;
      font-size: 11px;
      vertical-align: middle;
    }

    th {
      background: #f0f0f0 !important;
      font-weight: bold;
      text-align: center;
    }

    p {
      color: #000 !important;
      text-align: left;
      font-style: italic;
      margin-top: 8px;
    }

    @page {
      margin: 8mm 10mm 15mm 10mm;
    }
  </style>
</head>
<body>

  <div class="tarih">${tarih}</div>

  <div class="ust-baslik">
    <h3>T.C.</h3>
    <h4>MİLLİ EĞİTİM BAKANLIĞI</h4>
    <h4>${schoolName}</h4>
    <h2>${baslikMetni}</h2>
  </div>

  ${htmlIcerik}

</body>
</html>
`;

      let result;

      if (window.electronAPI && window.electronAPI.createPDF) {
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

      if (result.success) {
        bildirimGoster("✅ PDF başarıyla indirildi!", "success");
      } else {
        bildirimGoster("❌ PDF oluşturulamadı: " + result.message, "error");
      }
    } catch (error) {
      console.error("PDF hatası:", error);
      bildirimGoster("❌ PDF oluşturulurken hata!", "error");
    }
  });

// ==========================================
// EXCEL İNDİR
// ==========================================
document
  .getElementById("excelIndir")
  .addEventListener("click", async function () {
    try {
      bildirimGoster("🔄 Excel hazırlanıyor...", "info");

      const raporTip = raporTuru.value;
      const seciliDuzey = duzeyFiltre.value;
      const seciliAlan = alanFiltre.value;

      if (!raporTip) {
        bildirimGoster("⚠️ Lütfen rapor türü seçin!", "warning");
        return;
      }

      let filtreliSiniflar = [...mevcutSiniflar];

      // Düzey filtresi
      if (seciliDuzey) {
        filtreliSiniflar = filtreliSiniflar.filter(
          (s) => s.sinif_duzey === parseInt(seciliDuzey)
        );
      }

      // Alan filtresi
      if (seciliAlan) {
        filtreliSiniflar = filtreliSiniflar.filter(
          (s) => s.alan === seciliAlan
        );
      }

      console.log("📊 Filtrelenmiş sınıflar:", filtreliSiniflar);

      const tarih = new Date().toLocaleDateString("tr-TR");
      const schoolName = sessionStorage.getItem("currentUser")
        ? JSON.parse(sessionStorage.getItem("currentUser")).school?.okul_adi ||
          "Bahçelievler Cumhuriyet Anadolu Lisesi"
        : "Bahçelievler Cumhuriyet Anadolu Lisesi";

      let baslikMetni = "";
      switch (raporTip) {
        case "sinif-listesi":
          baslikMetni = "SINIF LİSTESİ";
          break;
        case "subeye-gore-liste":
          baslikMetni = "ŞUBEYE GÖRE SINIF LİSTESİ";
          break;
        case "duzeye-gore-liste":
          baslikMetni = "DÜZEYE GÖRE SINIF LİSTESİ";
          break;
        case "alana-gore-dagilim":
          baslikMetni = "ALANA GÖRE DAĞILIM";
          break;
        case "ogretmen-atama-listesi":
          baslikMetni = "ÖĞRETMEN ATAMA LİSTESİ";
          break;
        case "ogrenci-mevcudu-raporu":
          baslikMetni = "ÖĞRENCİ MEVCUDU RAPORU";
          break;
        case "rehber-ogretmen-listesi":
          baslikMetni = "REHBER ÖĞRETMEN LİSTESİ";
          break;
        default:
          baslikMetni = "SINIF RAPORU";
      }

      const excelContent = {
        meta: {
          title: baslikMetni,
          author: schoolName,
          created: new Date(),
        },
        sheetName: baslikMetni,
        fileName: `${baslikMetni}_${tarih}.xlsx`,
        headerStyle: {
          font: { bold: true, color: { argb: "000000" } },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "D9E1F2" },
          },
          alignment: { horizontal: "center", vertical: "middle" },
          border: {
            top: { style: "thin", color: { argb: "808080" } },
            left: { style: "thin", color: { argb: "808080" } },
            bottom: { style: "thin", color: { argb: "808080" } },
            right: { style: "thin", color: { argb: "808080" } },
          },
        },
        cellStyle: {
          font: { color: { argb: "000000" }, size: 10 },
          alignment: { horizontal: "left", vertical: "middle" },
          border: {
            top: { style: "thin", color: { argb: "D3D3D3" } },
            left: { style: "thin", color: { argb: "D3D3D3" } },
            bottom: { style: "thin", color: { argb: "D3D3D3" } },
            right: { style: "thin", color: { argb: "D3D3D3" } },
          },
        },
        data: [],
      };

      excelContent.data.push(["T.C."]);
      excelContent.data.push(["MİLLİ EĞİTİM BAKANLIĞI"]);
      excelContent.data.push([schoolName]);
      excelContent.data.push([baslikMetni]);
      excelContent.data.push([`Tarih: ${tarih}`]);
      excelContent.data.push([]);

      // Rapor türüne göre veri hazırla
      if (raporTip === "sinif-listesi") {
        excelContent.data.push([
          "S.N.",
          "Sınıf Adı",
          "Düzey",
          "Şube",
          "Alan",
          "Sınıf Öğretmeni",
        ]);
        filtreliSiniflar.forEach((sinif, i) => {
          excelContent.data.push([
            i + 1,
            sinif.sinif_adi || "",
            `${sinif.sinif_duzey}. Sınıf`,
            sinif.sube || "",
            sinif.alan || "-",
            getOgretmenAdi(sinif.sinif_ogretmeni_id),
          ]);
        });
      } else if (raporTip === "alana-gore-dagilim") {
        excelContent.data.push(["Alan", "Sınıf Sayısı", "Sınıflar"]);
        const alanlar = {};
        filtreliSiniflar.forEach((sinif) => {
          const alan = sinif.alan || "Belirtilmemiş";
          if (!alanlar[alan]) {
            alanlar[alan] = { toplam: 0, siniflar: [] };
          }
          alanlar[alan].toplam++;
          alanlar[alan].siniflar.push(sinif.sinif_adi);
        });
        Object.entries(alanlar).forEach(([alan, data]) => {
          excelContent.data.push([alan, data.toplam, data.siniflar.join(", ")]);
        });
        excelContent.data.push(["GENEL TOPLAM", filtreliSiniflar.length, "-"]);
      } else if (raporTip === "ogrenci-mevcudu-raporu") {
        excelContent.data.push(["S.N.", "Sınıf Adı", "Erkek", "Kız", "Toplam"]);
        filtreliSiniflar.forEach((sinif, i) => {
          excelContent.data.push([
            i + 1,
            sinif.sinif_adi || "",
            sinif.erkek_sayisi || 0,
            sinif.kiz_sayisi || 0,
            sinif.ogrenci_sayisi || 0,
          ]);
        });
        const toplamErkek = filtreliSiniflar.reduce(
          (sum, s) => sum + (s.erkek_sayisi || 0),
          0
        );
        const toplamKiz = filtreliSiniflar.reduce(
          (sum, s) => sum + (s.kiz_sayisi || 0),
          0
        );
        const toplamOgrenci = filtreliSiniflar.reduce(
          (sum, s) => sum + (s.ogrenci_sayisi || 0),
          0
        );
        excelContent.data.push([
          "GENEL TOPLAM",
          "",
          toplamErkek,
          toplamKiz,
          toplamOgrenci,
        ]);
      } else if (raporTip === "ogretmen-atama-listesi") {
        excelContent.data.push([
          "S.N.",
          "Sınıf Adı",
          "Sınıf Öğretmeni",
          "Müdür Yardımcısı",
          "Rehber Öğretmen",
        ]);
        filtreliSiniflar.forEach((sinif, i) => {
          excelContent.data.push([
            i + 1,
            sinif.sinif_adi || "",
            getOgretmenAdi(sinif.sinif_ogretmeni_id),
            getOgretmenAdi(sinif.mudur_yardimcisi_id),
            getOgretmenAdi(sinif.rehber_ogretmen_id),
          ]);
        });
      }

      excelContent.data.push([]);
      excelContent.data.push([
        `Toplam ${filtreliSiniflar.length} sınıf listelenmiştir.`,
      ]);

      let result;
      if (window.electronAPI && window.electronAPI.createExcel) {
        result = await window.electronAPI.createExcel(excelContent);
      } else {
        const { ipcRenderer } = require("electron");
        result = await ipcRenderer.invoke("create-excel", excelContent);
      }

      if (result.success) {
        bildirimGoster("✅ Excel başarıyla indirildi!", "success");
      } else {
        bildirimGoster("❌ Excel oluşturulamadı: " + result.message, "error");
      }
    } catch (err) {
      console.error("Excel hatası:", err);
      bildirimGoster("❌ Excel oluşturulurken hata!", "error");
    }
  });

// ==========================================
// ÇIKIŞ BUTONU
// ==========================================
document.getElementById("logoutBtn").addEventListener("click", function () {
  const confirmed = confirm("Çıkış yapmak istediğinize emin misiniz?");
  if (confirmed) {
    sessionStorage.clear();
    window.location.href = "../giris.html";
  }
});

console.log("✅ Sınıf Raporları scripti yüklendi (Part 3 - SON)");
console.log("🎯 Tüm fonksiyonlar hazır!");
console.log("📊 PDF ve Excel export sistemleri aktif!");
console.log("🚀 Sistem kullanıma hazır!");
