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

console.log("📊 Raporlar sayfası yüklendi");

// ==========================================
// ELEMANLAR
// ==========================================
const raporTuru = document.getElementById("raporTuru");
const filtrelerKart = document.getElementById("filtrelerKart");
const butonlar = document.getElementById("butonlar");
const onizlemeKart = document.getElementById("onizlemeKart");
const onizlemeAlani = document.getElementById("onizlemeAlani");
const sinifFiltre = document.getElementById("sinifFiltre");

let mevcutOgrenciler = [];

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
  await ogrencileriYukle();
  siniflariDoldur();

  const kayitliKaymakamlik = localStorage.getItem("kaymakamlikAdi");
  if (kayitliKaymakamlik) {
    document.getElementById("kaymakamlikAdi").value = kayitliKaymakamlik;
  }
});

// ==========================================
// ÖĞRENCİLERİ YÜKLE
// ==========================================
async function ogrencileriYukle() {
  try {
    console.log("🔄 Öğrenciler yükleniyor...");

    if (window.electronAPI && window.electronAPI.getAllStudents) {
      const result = await window.electronAPI.getAllStudents("okul_admin", 1);

      if (result.success) {
        mevcutOgrenciler = result.data;
        mevcutOgrenciler = mevcutOgrenciler.filter(
          (o) => o.durum === 1 || o.durum === "1"
        );
        console.log("✅ Öğrenciler yüklendi:", mevcutOgrenciler.length);
        bildirimGoster(
          "✅ " + mevcutOgrenciler.length + " öğrenci yüklendi",
          "success"
        );
        return;
      }
    }

    try {
      const { ipcRenderer } = require("electron");
      const result = await ipcRenderer.invoke(
        "get-all-students",
        "okul_admin",
        1
      );

      if (result.success) {
        mevcutOgrenciler = result.data;
        mevcutOgrenciler = mevcutOgrenciler.filter(
          (o) => o.durum === 1 || o.durum === "1"
        );
        console.log(
          "✅ Öğrenciler yüklendi (ipcRenderer):",
          mevcutOgrenciler.length
        );
        bildirimGoster(
          "✅ " + mevcutOgrenciler.length + " öğrenci yüklendi",
          "success"
        );
        return;
      }
    } catch (requireError) {
      console.warn("⚠️ require electron başarısız:", requireError.message);
    }

    console.warn("⚠️ Test verisi kullanılıyor");
    mevcutOgrenciler = [
      {
        id: 1,
        tc_no: "12345678901",
        ad: "Ahmet",
        soyad: "Yılmaz",
        ad_soyad: "Ahmet Yılmaz",
        okul_no: "1001",
        sinif: "9-A",
        cinsiyet: "E",
      },
      {
        id: 2,
        tc_no: "12345678902",
        ad: "Ayşe",
        soyad: "Demir",
        ad_soyad: "Ayşe Demir",
        okul_no: "1002",
        sinif: "9-A",
        cinsiyet: "K",
      },
    ];
    bildirimGoster("⚠️ Test verisi yüklendi", "warning");
  } catch (error) {
    console.error("❌ Öğrenci yükleme hatası:", error);
    bildirimGoster("❌ Öğrenciler yüklenemedi!", "error");
  }
}

// ==========================================
// SINIFLARI DOLDUR
// ==========================================
function siniflariDoldur() {
  const siniflar = [
    ...new Set(mevcutOgrenciler.map((o) => o.sinif).filter((s) => s)),
  ];
  siniflar.sort();

  sinifFiltre.innerHTML = '<option value="">Tüm Sınıflar</option>';
  siniflar.forEach((sinif) => {
    const option = document.createElement("option");
    option.value = sinif;
    option.textContent = sinif;
    sinifFiltre.appendChild(option);
  });
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
  const seciliSinif = sinifFiltre.value;

  if (!raporTip) {
    bildirimGoster("⚠️ Lütfen rapor türü seçin!", "warning");
    return;
  }

  bildirimGoster("🔄 Rapor hazırlanıyor...", "info");

  setTimeout(() => {
    const filtreliOgrenciler = seciliSinif
      ? mevcutOgrenciler.filter((o) => o.sinif === seciliSinif)
      : mevcutOgrenciler;

    onizlemeKart.style.display = "block";

    switch (raporTip) {
      case "ogrenci-listesi":
        ogrenciListesiOlustur(filtreliOgrenciler);
        break;
      case "tc-listesi":
        tcListesiOlustur(filtreliOgrenciler);
        break;
      case "sinif-mevcudu":
        sinifMevcuduOlustur(filtreliOgrenciler);
        break;
    }

    bildirimGoster("✅ Önizleme hazır!", "success");
  }, 500);
});

// ==========================================
// ÖĞRENCİ LİSTESİ OLUŞTUR (başlıksız)
// ==========================================
function ogrenciListesiOlustur(ogrenciler) {
  console.log("🔍 ogrenciListesiOlustur çağrıldı");
  console.log("📊 Öğrenci sayısı:", ogrenciler.length);

  const html = `
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Sınıfı</th>
          <th>Okul No</th>
          <th>TC Kimlik No</th>
          <th>Adı Soyadı</th>
          <th>Cinsiyeti</th>
        </tr>
      </thead>
      <tbody>
        ${ogrenciler
          .map(
            (ogr, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${ogr.sinif || "-"}</td>
            <td>${ogr.okul_no || "-"}</td>
            <td>${ogr.tc_no || "-"}</td>
            <td>${ogr.ad_soyad || ogr.ad + " " + ogr.soyad}</td>
            <td>${
              ogr.cinsiyet === "E"
                ? "Erkek"
                : ogr.cinsiyet === "K"
                ? "Kız"
                : "-"
            }</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${ogrenciler.length} öğrenci listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// TC LİSTESİ OLUŞTUR (başlıksız)
// ==========================================
function tcListesiOlustur(ogrenciler) {
  const html = `
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>TC Kimlik No</th>
          <th>Adı Soyadı</th>
          <th>Okul No</th>
          <th>Sınıfı</th>
        </tr>
      </thead>
      <tbody>
        ${ogrenciler
          .map(
            (ogr, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${ogr.tc_no || "-"}</td>
            <td>${ogr.ad_soyad || ogr.ad + " " + ogr.soyad}</td>
            <td>${ogr.okul_no || "-"}</td>
            <td>${ogr.sinif || "-"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${ogrenciler.length} öğrenci listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// SINIF MEVCUDU OLUŞTUR (başlıksız)
// ==========================================
function sinifMevcuduOlustur(ogrenciler) {
  const siniflar = {};
  ogrenciler.forEach((ogr) => {
    const sinif = ogr.sinif || "Sınıfsız";
    if (!siniflar[sinif]) {
      siniflar[sinif] = { toplam: 0, erkek: 0, kiz: 0 };
    }
    siniflar[sinif].toplam++;
    if (ogr.cinsiyet === "E") siniflar[sinif].erkek++;
    if (ogr.cinsiyet === "K") siniflar[sinif].kiz++;
  });

  const html = `
    <table>
      <thead>
        <tr>
          <th>Sınıf</th>
          <th>Erkek</th>
          <th>Kız</th>
          <th>Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(siniflar)
          .map(
            ([sinif, data]) => `
          <tr>
            <td>${sinif}</td>
            <td>${data.erkek}</td>
            <td>${data.kiz}</td>
            <td><strong>${data.toplam}</strong></td>
          </tr>
        `
          )
          .join("")}
        <tr style="background: #667eea; color: white; font-weight: bold;">
          <td>GENEL TOPLAM</td>
          <td>${Object.values(siniflar).reduce(
            (sum, s) => sum + s.erkek,
            0
          )}</td>
          <td>${Object.values(siniflar).reduce((sum, s) => sum + s.kiz, 0)}</td>
          <td>${ogrenciler.length}</td>
        </tr>
      </tbody>
    </table>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// PDF İNDİR (Tam ve Gelişmiş)
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

      // =============================
      // 🧭 Rapor türüne göre başlık
      // =============================
      const raporTip = raporTuru.value;
      let baslikMetni = "";

      switch (raporTip) {
        case "ogrenci-listesi":
          baslikMetni = "ÖĞRENCİ LİSTESİ";
          break;
        case "tc-listesi":
          baslikMetni = "TC KİMLİK LİSTESİ";
          break;
        case "sinif-mevcudu":
          baslikMetni = "SINIF MEVCUDU";
          break;
        default:
          baslikMetni = "RAPOR LİSTESİ";
      }

      // =============================
      // 📅 Tarih ve Kaymakamlık Bilgisi
      // =============================
      const tarih = new Date().toLocaleDateString("tr-TR");
      const kaymakamlik = localStorage.getItem("kaymakamlikAdi") || "İSTANBUL";

      // =============================
      // 🧾 PDF HTML ŞABLONU
      // =============================
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

    /* ===== Üst Başlık ===== */
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

    .tarih {
      font-size: 11px;
      text-align: right;
      margin-bottom: 5px;
      color: #000;
    }

    /* ===== Tablo ===== */
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

    /* ===== Alt Bilgi ===== */
    p {
      color: #000 !important;
      text-align: left;
      font-style: italic;
      margin-top: 8px;
    }

    /* ===== Sayfa Ayarları ===== */
    @page {
      margin: 8mm 10mm 15mm 10mm;
      @bottom-center {
        content: "Sayfa " counter(page) " / " counter(pages);
        font-size: 10px;
        color: #000;
      }
    }
  </style>
</head>
<body>

  <div class="tarih">${tarih}</div>

  <div class="ust-baslik">
    <h3>T.C.</h3>
    <h4>${kaymakamlik} KAYMAKAMLIĞI</h4>
    <h4>Bahçelievler Cumhuriyet Anadolu Lisesi</h4>
    <h2>${baslikMetni}</h2>
  </div>

  ${htmlIcerik}

</body>
</html>
`;

      // =============================
      // 💾 PDF OLUŞTURMA
      // =============================
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
// EXCEL İNDİR (Gerçek Pastel Mavi + Kenarlıklı Tablo)
// ==========================================
document
  .getElementById("excelIndir")
  .addEventListener("click", async function () {
    try {
      bildirimGoster("🔄 Excel hazırlanıyor...", "info");

      const raporTip = raporTuru.value;
      const seciliSinif = sinifFiltre.value;

      if (!raporTip) {
        bildirimGoster("⚠️ Lütfen rapor türü seçin!", "warning");
        return;
      }

      const filtreliOgrenciler = seciliSinif
        ? mevcutOgrenciler.filter((o) => o.sinif === seciliSinif)
        : mevcutOgrenciler;

      const tarih = new Date().toLocaleDateString("tr-TR");
      const kaymakamlik = localStorage.getItem("kaymakamlikAdi") || "İSTANBUL";

      // =========================
      // 📘 Rapor Başlığı
      // =========================
      let baslikMetni = "";
      switch (raporTip) {
        case "ogrenci-listesi":
          baslikMetni = "ÖĞRENCİ LİSTESİ";
          break;
        case "tc-listesi":
          baslikMetni = "TC KİMLİK LİSTESİ";
          break;
        case "sinif-mevcudu":
          baslikMetni = "SINIF MEVCUDU";
          break;
        default:
          baslikMetni = "RAPOR LİSTESİ";
      }

      // =========================
      // 💾 ExcelJS (veya electronAPI) için veri ve stil
      // =========================
      const excelContent = {
        meta: {
          title: baslikMetni,
          author: "Bahçelievler CAL",
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
          }, // 🩵 pastel mavi
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

      // =========================
      // 🏫 Üst Bilgi
      // =========================
      excelContent.data.push(["T.C."]);
      excelContent.data.push([`${kaymakamlik} KAYMAKAMLIĞI`]);
      excelContent.data.push(["Bahçelievler Cumhuriyet Anadolu Lisesi"]);
      excelContent.data.push([baslikMetni]);
      excelContent.data.push([`Tarih: ${tarih}`]);
      excelContent.data.push([]);

      // =========================
      // 📋 İçerik
      // =========================
      if (raporTip === "ogrenci-listesi") {
        excelContent.data.push([
          "S.N.",
          "Sınıfı",
          "Okul No",
          "TC Kimlik No",
          "Adı Soyadı",
          "Cinsiyeti",
        ]);
        filtreliOgrenciler.forEach((ogr, i) => {
          excelContent.data.push([
            i + 1,
            ogr.sinif || "-",
            ogr.okul_no || "-",
            ogr.tc_no || "-",
            ogr.ad_soyad || `${ogr.ad} ${ogr.soyad}`,
            ogr.cinsiyet === "E" ? "Erkek" : ogr.cinsiyet === "K" ? "Kız" : "-",
          ]);
        });
      } else if (raporTip === "tc-listesi") {
        excelContent.data.push([
          "S.N.",
          "TC Kimlik No",
          "Adı Soyadı",
          "Okul No",
          "Sınıfı",
        ]);
        filtreliOgrenciler.forEach((ogr, i) => {
          excelContent.data.push([
            i + 1,
            ogr.tc_no || "-",
            ogr.ad_soyad || `${ogr.ad} ${ogr.soyad}`,
            ogr.okul_no || "-",
            ogr.sinif || "-",
          ]);
        });
      } else if (raporTip === "sinif-mevcudu") {
        excelContent.data.push(["Sınıf", "Erkek", "Kız", "Toplam"]);
        const siniflar = {};
        filtreliOgrenciler.forEach((ogr) => {
          const sinif = ogr.sinif || "Sınıfsız";
          if (!siniflar[sinif])
            siniflar[sinif] = { erkek: 0, kiz: 0, toplam: 0 };
          siniflar[sinif].toplam++;
          if (ogr.cinsiyet === "E") siniflar[sinif].erkek++;
          if (ogr.cinsiyet === "K") siniflar[sinif].kiz++;
        });
        Object.entries(siniflar).forEach(([sinif, d]) => {
          excelContent.data.push([sinif, d.erkek, d.kiz, d.toplam]);
        });
        const toplamE = Object.values(siniflar).reduce(
          (a, s) => a + s.erkek,
          0
        );
        const toplamK = Object.values(siniflar).reduce((a, s) => a + s.kiz, 0);
        excelContent.data.push([
          "GENEL TOPLAM",
          toplamE,
          toplamK,
          filtreliOgrenciler.length,
        ]);
      }

      excelContent.data.push([]);
      excelContent.data.push([
        `Toplam ${filtreliOgrenciler.length} öğrenci listelenmiştir.`,
      ]);

      // =========================
      // 🧩 Electron ile gönder
      // =========================
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
// ÜST BİLGİ AYARLARI KAYDET
// ==========================================
document
  .getElementById("ustBilgiKaydet")
  .addEventListener("click", function () {
    const kaymakamlik = document.getElementById("kaymakamlikAdi").value.trim();

    if (!kaymakamlik) {
      bildirimGoster("⚠️ Lütfen kaymakamlık adı girin!", "warning");
      return;
    }

    localStorage.setItem("kaymakamlikAdi", kaymakamlik);

    bildirimGoster("✅ Üst bilgi ayarları kaydedildi!", "success");

    console.log("💾 Kaymakamlık kaydedildi:", kaymakamlik);
  });
