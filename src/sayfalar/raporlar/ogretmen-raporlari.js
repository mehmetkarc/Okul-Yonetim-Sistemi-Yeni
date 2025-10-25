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

console.log("📊 Öğretmen Raporları sayfası yüklendi");

// ==========================================
// ELEMANLAR
// ==========================================
const raporTuru = document.getElementById("raporTuru");
const filtrelerKart = document.getElementById("filtrelerKart");
const butonlar = document.getElementById("butonlar");
const onizlemeKart = document.getElementById("onizlemeKart");
const onizlemeAlani = document.getElementById("onizlemeAlani");
const bransFiltre = document.getElementById("bransFiltre");

let mevcutOgretmenler = [];

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
  await ogretmenleriYukle();
  branslariDoldur();

  const kayitliKaymakamlik = localStorage.getItem("kaymakamlikAdi");
  if (kayitliKaymakamlik) {
    document.getElementById("kaymakamlikAdi").value = kayitliKaymakamlik;
  }

  const kayitliRaporBaslik = localStorage.getItem("raporBaslik");
  if (kayitliRaporBaslik) {
    document.getElementById("raporBaslik").value = kayitliRaporBaslik;
  } else {
    document.getElementById("raporBaslik").value = "Öğretmen Listesi";
  }

  const kayitliImzaSutun = localStorage.getItem("imzaSutunEkle");
  if (kayitliImzaSutun !== null) {
    document.getElementById("imzaSutunEkle").checked =
      kayitliImzaSutun === "true";
  }

  const kayitliTarihSutun = localStorage.getItem("tarihSutunEkle");
  if (kayitliTarihSutun !== null) {
    document.getElementById("tarihSutunEkle").checked =
      kayitliTarihSutun === "true";
  }
});

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
        mevcutOgretmenler = mevcutOgretmenler.filter(
          (o) => o.durum === 1 || o.durum === "1"
        );
        console.log("✅ Öğretmenler yüklendi:", mevcutOgretmenler);
        bildirimGoster(
          "✅ " + mevcutOgretmenler.length + " öğretmen yüklendi",
          "success"
        );
        return;
      }
    }

    try {
      const { ipcRenderer } = require("electron");
      const result = await ipcRenderer.invoke("get-all-teachers");

      if (result.success) {
        mevcutOgretmenler = result.data;
        mevcutOgretmenler = mevcutOgretmenler.filter(
          (o) => o.durum === 1 || o.durum === "1"
        );
        console.log(
          "✅ Öğretmenler yüklendi (ipcRenderer):",
          mevcutOgretmenler
        );
        bildirimGoster(
          "✅ " + mevcutOgretmenler.length + " öğretmen yüklendi",
          "success"
        );
        return;
      }
    } catch (requireError) {
      console.warn("⚠️ require electron başarısız:", requireError.message);
    }

    console.warn("⚠️ Test verisi kullanılıyor");
    mevcutOgretmenler = [
      {
        id: 1,
        tc_no: "12345678901",
        ad_soyad: "Ahmet Yılmaz",
        unvan: "Okul Müdürü",
        kariyer: "Baş Öğretmen",
        gorev: "Müdür",
        brans: "İngilizce",
        cinsiyet: "E",
        telefon: "555 123 4567",
        email: "ahmet@example.com",
      },
      {
        id: 2,
        tc_no: "98765432109",
        ad_soyad: "Ayşe Demir",
        unvan: "Branş Öğretmeni",
        kariyer: "Öğretmen",
        gorev: "Öğretmen",
        brans: "Matematik",
        cinsiyet: "K",
        telefon: "555 987 6543",
        email: "ayse@example.com",
      },
    ];
    bildirimGoster("⚠️ Test verisi yüklendi", "warning");
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
    bildirimGoster("❌ Öğretmenler yüklenemedi!", "error");
  }
}

// ==========================================
// BRANŞLARI DOLDUR
// ==========================================
function branslariDoldur() {
  const branslar = [
    ...new Set(mevcutOgretmenler.map((o) => o.brans).filter((s) => s)),
  ];
  branslar.sort();

  bransFiltre.innerHTML = '<option value="">Tüm Branşlar</option>';
  branslar.forEach((brans) => {
    const option = document.createElement("option");
    option.value = brans;
    option.textContent = brans;
    bransFiltre.appendChild(option);
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
  const seciliBrans = bransFiltre.value;

  if (!raporTip) {
    bildirimGoster("⚠️ Lütfen rapor türü seçin!", "warning");
    return;
  }

  bildirimGoster("🔄 Rapor hazırlanıyor...", "info");

  setTimeout(() => {
    const filtreliOgretmenler = seciliBrans
      ? mevcutOgretmenler.filter((o) => o.brans === seciliBrans)
      : mevcutOgretmenler;

    onizlemeKart.style.display = "block";

    switch (raporTip) {
      case "ogretmen-listesi":
        ogretmenListesiOlustur(filtreliOgretmenler);
        break;
      case "tc-listesi":
        tcListesiOlustur(filtreliOgretmenler);
        break;
      case "unvan-listesi":
        unvanListesiOlustur(filtreliOgretmenler);
        break;
      case "alfabetik-liste":
        alfabetikListeOlustur(filtreliOgretmenler);
        break;
      case "kariyer-listesi":
        kariyerListesiOlustur(filtreliOgretmenler);
        break;
      case "brans-dagilimi":
        bransDagilimiOlustur(filtreliOgretmenler);
        break;
      case "iletisim-listesi":
        iletisimListesiOlustur(filtreliOgretmenler);
        break;
    }

    bildirimGoster("✅ Önizleme hazır!", "success");
  }, 500);
});

// ==========================================
// ÜST BİLGİ AYARLARI KAYDET
// ==========================================
document
  .getElementById("ustBilgiKaydet")
  .addEventListener("click", function () {
    const kaymakamlik = document.getElementById("kaymakamlikAdi").value.trim();
    const raporBaslik = document.getElementById("raporBaslik").value.trim();
    const imzaSutunEkle = document.getElementById("imzaSutunEkle").checked;
    const tarihSutunEkle = document.getElementById("tarihSutunEkle").checked;

    if (!kaymakamlik) {
      bildirimGoster("⚠️ Lütfen kaymakamlık adı girin!", "warning");
      return;
    }

    if (!raporBaslik) {
      bildirimGoster("⚠️ Lütfen rapor başlığı girin!", "warning");
      return;
    }

    localStorage.setItem("kaymakamlikAdi", kaymakamlik);
    localStorage.setItem("raporBaslik", raporBaslik);
    localStorage.setItem("imzaSutunEkle", imzaSutunEkle);
    localStorage.setItem("tarihSutunEkle", tarihSutunEkle);

    bildirimGoster("✅ Üst bilgi ayarları kaydedildi!", "success");
    console.log("💾 Kaymakamlık kaydedildi:", kaymakamlik);
    console.log("💾 Rapor başlığı kaydedildi:", raporBaslik);
    console.log("💾 İmza sütunu:", imzaSutunEkle);
    console.log("💾 Tarih sütunu:", tarihSutunEkle);
  });

// ==========================================
// ÖĞRETMEN LİSTESİ OLUŞTUR
// ==========================================
function ogretmenListesiOlustur(ogretmenler) {
  console.log("🔍 ogretmenListesiOlustur çağrıldı");
  console.log("📊 Öğretmen sayısı:", ogretmenler.length);

  const imzaSutunEkle = localStorage.getItem("imzaSutunEkle") === "true";
  const tarihSutunEkle = localStorage.getItem("tarihSutunEkle") === "true";
  const raporBaslik = localStorage.getItem("raporBaslik") || "Öğretmen Listesi";
  const bugun = new Date().toLocaleDateString("tr-TR");

  // Tablo başlıklarını oluştur
  let tableHeaders = `
    <th>S.N.</th>
    <th>Adı Soyadı</th>
    <th>Branşı</th>
    <th>Görevi</th>
  `;
  if (imzaSutunEkle) {
    tableHeaders += `<th class="imza-sutun">İmza</th>`;
  }
  if (tarihSutunEkle) {
    tableHeaders += `<th class="tarih-sutun">Tarih</th>`;
  }

  // Tablo satırlarını oluştur
  const tableRow = (ogr, index) => {
    let row = `
      <td>${index + 1}</td>
      <td>${ogr.ad_soyad || ""}</td>
      <td>${ogr.brans || ""}</td>
      <td>${ogr.unvan || ""}</td>
    `;
    if (imzaSutunEkle) {
      row += `<td class="imza-sutun">${ogr.imza || ""}</td>`;
    }
    if (tarihSutunEkle) {
      row += `<td class="tarih-sutun">${bugun}</td>`;
    }
    return row;
  };

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
      .tarih-sutun {
        text-align: center !important;
        min-width: 100px;
      }
      .imza-sutun {
        min-width: 150px;
        width: 150px;
      }
    </style>
    <h2>${raporBaslik}</h2>
    <table>
      <thead>
        <tr>
          ${tableHeaders}
        </tr>
      </thead>
      <tbody>
        ${ogretmenler
          .map((ogr, index) => `<tr>${tableRow(ogr, index)}</tr>`)
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${ogretmenler.length} öğretmen listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// TC LİSTESİ OLUŞTUR
// ==========================================
function tcListesiOlustur(ogretmenler) {
  const html = `
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>TC Kimlik No</th>
          <th>Adı Soyadı</th>
          <th>Branşı</th>
          <th>Görevi</th>
        </tr>
      </thead>
      <tbody>
        ${ogretmenler
          .map(
            (ogr, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${ogr.tc_no || ""}</td>
            <td>${ogr.ad_soyad || ""}</td>
            <td>${ogr.brans || ""}</td>
            <td>${ogr.unvan || ""}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${ogretmenler.length} öğretmen listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// ÜNVANA GÖRE LİSTE OLUŞTUR
// ==========================================
function unvanListesiOlustur(ogretmenler) {
  const unvanSirasi = {
    "Okul Müdürü": 1,
    "Müdür Yardımcısı": 2,
    "Branş Öğretmeni": 3,
    "Rehber Öğretmen": 4,
    "Sözleşmeli Öğretmen": 5,
    "Ücretli Öğretmen": 6,
  };

  const siraliOgretmenler = [...ogretmenler].sort((a, b) => {
    const unvanA = unvanSirasi[a.unvan] || 999;
    const unvanB = unvanSirasi[b.unvan] || 999;
    return unvanA - unvanB;
  });

  const html = `
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Adı Soyadı</th>
          <th>Branşı</th>
          <th>Ünvanı</th>
        </tr>
      </thead>
      <tbody>
        ${siraliOgretmenler
          .map(
            (ogr, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${ogr.ad_soyad || ""}</td>
            <td>${ogr.brans || ""}</td>
            <td>${ogr.unvan || ""}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${ogretmenler.length} öğretmen listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// ALFABETİK LİSTE OLUŞTUR
// ==========================================
function alfabetikListeOlustur(ogretmenler) {
  const siraliOgretmenler = [...ogretmenler].sort((a, b) => {
    const adA = (a.ad_soyad || "").toLowerCase();
    const adB = (b.ad_soyad || "").toLowerCase();
    return adA.localeCompare(adB, "tr");
  });

  const html = `
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Adı Soyadı</th>
          <th>Branşı</th>
          <th>Görevi</th>
        </tr>
      </thead>
      <tbody>
        ${siraliOgretmenler
          .map(
            (ogr, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${ogr.ad_soyad || ""}</td>
            <td>${ogr.brans || ""}</td>
            <td>${ogr.unvan || ""}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${ogretmenler.length} öğretmen listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// KARİYER DURUMUNA GÖRE LİSTE
// ==========================================
function kariyerListesiOlustur(ogretmenler) {
  const kariyerSirasi = {
    "Baş Öğretmen": 1,
    "Uzman Öğretmen": 2,
    Öğretmen: 3,
    "Sözleşmeli Öğretmen": 4,
    "Ücretli Öğretmen": 5,
  };

  const siraliOgretmenler = [...ogretmenler].sort((a, b) => {
    const kariyerA = kariyerSirasi[a.kariyer] || 999;
    const kariyerB = kariyerSirasi[b.kariyer] || 999;
    return kariyerA - kariyerB;
  });

  const html = `
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Adı Soyadı</th>
          <th>Branşı</th>
          <th>Kariyer Durumu</th>
        </tr>
      </thead>
      <tbody>
        ${siraliOgretmenler
          .map(
            (ogr, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${ogr.ad_soyad || ""}</td>
            <td>${ogr.brans || ""}</td>
            <td>${ogr.kariyer || ""}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${ogretmenler.length} öğretmen listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// BRANŞ BAZLI DAĞILIM
// ==========================================
function bransDagilimiOlustur(ogretmenler) {
  console.log("🔍 bransDagilimiOlustur çağrıldı");
  console.log("📊 Öğretmen sayısı:", ogretmenler.length);
  console.log("📋 Öğretmenler:", ogretmenler);

  const branslar = {};

  ogretmenler.forEach((ogr) => {
    const brans = ogr.brans || "Belirtilmemiş";
    if (!branslar[brans]) {
      branslar[brans] = { toplam: 0, erkek: 0, kadin: 0 };
    }
    branslar[brans].toplam++;
    if (ogr.cinsiyet === "E" || ogr.cinsiyet === "Erkek") {
      branslar[brans].erkek++;
    } else if (ogr.cinsiyet === "K" || ogr.cinsiyet === "Kadın") {
      branslar[brans].kadin++;
    } else {
      console.warn(
        `⚠️ Geçersiz cinsiyet değeri: ${ogr.cinsiyet} (ID: ${ogr.id})`
      );
    }
  });

  console.log("📊 Branş dağılımı:", branslar);

  const html = `
    <table>
      <thead>
        <tr>
          <th>Branş</th>
          <th>Erkek</th>
          <th>Kadın</th>
          <th>Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(branslar)
          .map(
            ([brans, data]) => `
          <tr>
            <td>${brans}</td>
            <td>${data.erkek}</td>
            <td>${data.kadin}</td>
            <td><strong>${data.toplam}</strong></td>
          </tr>
        `
          )
          .join("")}
        <tr style="background: #667eea; color: white; font-weight: bold;">
          <td>GENEL TOPLAM</td>
          <td>${Object.values(branslar).reduce(
            (sum, s) => sum + s.erkek,
            0
          )}</td>
          <td>${Object.values(branslar).reduce(
            (sum, s) => sum + s.kadin,
            0
          )}</td>
          <td>${ogretmenler.length}</td>
        </tr>
      </tbody>
    </table>
  `;

  onizlemeAlani.innerHTML = html;
}

// ==========================================
// İLETİŞİM BİLGİLERİ LİSTESİ
// ==========================================
function iletisimListesiOlustur(ogretmenler) {
  const html = `
    <table>
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Adı Soyadı</th>
          <th>Telefon</th>
          <th>E-Mail</th>
          <th>Adres</th>
        </tr>
      </thead>
      <tbody>
        ${ogretmenler
          .map(
            (ogr, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${ogr.ad_soyad || ""}</td>
            <td>${ogr.telefon || ""}</td>
            <td>${ogr.email || ""}</td>
            <td>${ogr.adres || ""}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    
    <p style="margin-top: 10px; text-align: left; font-style: italic;">
      Toplam ${ogretmenler.length} öğretmen listelenmiştir.
    </p>
  `;

  onizlemeAlani.innerHTML = html;
}

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
      const raporBaslik =
        localStorage.getItem("raporBaslik") || "Öğretmen Listesi";

      let baslikMetni = "";
      switch (raporTip) {
        case "ogretmen-listesi":
          baslikMetni = raporBaslik;
          break;
        case "tc-listesi":
          baslikMetni = "TC KİMLİK NUMARALI ÖĞRETMEN LİSTESİ";
          break;
        case "unvan-listesi":
          baslikMetni = "ÜNVANA GÖRE ÖĞRETMEN LİSTESİ";
          break;
        case "alfabetik-liste":
          baslikMetni = "ALFABETİK ÖĞRETMEN LİSTESİ";
          break;
        case "kariyer-listesi":
          baslikMetni = "KARİYER DURUMUNA GÖRE ÖĞRETMEN LİSTESİ";
          break;
        case "brans-dagilimi":
          baslikMetni = "BRANŞ BAZLI DAĞILIM";
          break;
        case "iletisim-listesi":
          baslikMetni = "ÖĞRETMEN İLETİŞİM BİLGİLERİ LİSTESİ";
          break;
        default:
          baslikMetni = "ÖĞRETMEN RAPORU";
      }

      const tarih = new Date().toLocaleDateString("tr-TR");
      const kaymakamlik = localStorage.getItem("kaymakamlikAdi") || "İSTANBUL";

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
    <h4>${kaymakamlik} KAYMAKAMLIĞI</h4>
    <h4>Bahçelievler Cumhuriyet Anadolu Lisesi</h4>
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
      const seciliBrans = bransFiltre.value;

      if (!raporTip) {
        bildirimGoster("⚠️ Lütfen rapor türü seçin!", "warning");
        return;
      }

      const filtreliOgretmenler = seciliBrans
        ? mevcutOgretmenler.filter((o) => o.brans === seciliBrans)
        : mevcutOgretmenler;

      console.log("📊 Filtrelenmiş öğretmenler:", filtreliOgretmenler);

      const tarih = new Date().toLocaleDateString("tr-TR");
      const kaymakamlik = localStorage.getItem("kaymakamlikAdi") || "İSTANBUL";
      const raporBaslik =
        localStorage.getItem("raporBaslik") || "Öğretmen Listesi";
      const imzaSutunEkle = localStorage.getItem("imzaSutunEkle") === "true";
      const tarihSutunEkle = localStorage.getItem("tarihSutunEkle") === "true";

      let baslikMetni = "";
      switch (raporTip) {
        case "ogretmen-listesi":
          baslikMetni = raporBaslik;
          break;
        case "tc-listesi":
          baslikMetni = "TC KİMLİK NUMARALI ÖĞRETMEN LİSTESİ";
          break;
        case "unvan-listesi":
          baslikMetni = "ÜNVANA GÖRE ÖĞRETMEN LİSTESİ";
          break;
        case "alfabetik-liste":
          baslikMetni = "ALFABETİK ÖĞRETMEN LİSTESİ";
          break;
        case "kariyer-listesi":
          baslikMetni = "KARİYER DURUMUNA GÖRE ÖĞRETMEN LİSTESİ";
          break;
        case "brans-dagilimi":
          baslikMetni = "BRANŞ BAZLI DAĞILIM";
          break;
        case "iletisim-listesi":
          baslikMetni = "ÖĞRETMEN İLETİŞİM BİLGİLERİ LİSTESİ";
          break;
        default:
          baslikMetni = "ÖĞRETMEN RAPORU";
      }

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
      excelContent.data.push([`${kaymakamlik} KAYMAKAMLIĞI`]);
      excelContent.data.push(["Bahçelievler Cumhuriyet Anadolu Lisesi"]);
      excelContent.data.push([baslikMetni]);
      excelContent.data.push([`Tarih: ${tarih}`]);
      excelContent.data.push([]);

      if (raporTip === "ogretmen-listesi") {
        let headers = ["S.N.", "Adı Soyadı", "Branşı", "Görevi"];
        if (imzaSutunEkle) headers.push("İmza");
        if (tarihSutunEkle) headers.push("Tarih");
        excelContent.data.push(headers);
        filtreliOgretmenler.forEach((ogr, i) => {
          let row = [
            i + 1,
            ogr.ad_soyad || "",
            ogr.brans || "",
            ogr.unvan || "",
          ];
          if (imzaSutunEkle) row.push(ogr.imza || "");
          if (tarihSutunEkle) row.push(tarih);
          excelContent.data.push(row);
        });
      } else if (raporTip === "tc-listesi") {
        excelContent.data.push([
          "S.N.",
          "TC Kimlik No",
          "Adı Soyadı",
          "Branşı",
          "Görevi",
        ]);
        filtreliOgretmenler.forEach((ogr, i) => {
          excelContent.data.push([
            i + 1,
            ogr.tc_no || "",
            ogr.ad_soyad || "",
            ogr.brans || "",
            ogr.unvan || "",
          ]);
        });
      } else if (raporTip === "brans-dagilimi") {
        excelContent.data.push(["Branş", "Erkek", "Kadın", "Toplam"]);
        const branslar = {};
        filtreliOgretmenler.forEach((ogr) => {
          const brans = ogr.brans || "Belirtilmemiş";
          if (!branslar[brans])
            branslar[brans] = { erkek: 0, kadin: 0, toplam: 0 };
          branslar[brans].toplam++;
          if (ogr.cinsiyet === "E" || ogr.cinsiyet === "Erkek") {
            branslar[brans].erkek++;
          } else if (ogr.cinsiyet === "K" || ogr.cinsiyet === "Kadın") {
            branslar[brans].kadin++;
          } else {
            console.warn(
              `⚠️ Geçersiz cinsiyet değeri: ${ogr.cinsiyet} (ID: ${ogr.id})`
            );
          }
        });
        console.log("📊 Excel için branş dağılımı:", branslar);
        Object.entries(branslar).forEach(([brans, d]) => {
          excelContent.data.push([brans, d.erkek, d.kadin, d.toplam]);
        });
        const toplamE = Object.values(branslar).reduce(
          (a, s) => a + s.erkek,
          0
        );
        const toplamK = Object.values(branslar).reduce(
          (a, s) => a + s.kadin,
          0
        );
        excelContent.data.push([
          "GENEL TOPLAM",
          toplamE,
          toplamK,
          filtreliOgretmenler.length,
        ]);
      }

      excelContent.data.push([]);
      excelContent.data.push([
        `Toplam ${filtreliOgretmenler.length} öğretmen listelenmiştir.`,
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
// ÜST BİLGİ AYARLARI KAYDET
// ==========================================
document
  .getElementById("ustBilgiKaydet")
  .addEventListener("click", function () {
    const kaymakamlik = document.getElementById("kaymakamlikAdi").value.trim();
    const raporBaslik = document.getElementById("raporBaslik").value.trim();
    const imzaSutunEkle = document.getElementById("imzaSutunEkle").checked;
    const tarihSutunEkle = document.getElementById("tarihSutunEkle").checked;

    if (!kaymakamlik) {
      bildirimGoster("⚠️ Lütfen kaymakamlık adı girin!", "warning");
      return;
    }

    if (!raporBaslik) {
      bildirimGoster("⚠️ Lütfen rapor başlığı girin!", "warning");
      return;
    }

    localStorage.setItem("kaymakamlikAdi", kaymakamlik);
    localStorage.setItem("raporBaslik", raporBaslik);
    localStorage.setItem("imzaSutunEkle", imzaSutunEkle);
    localStorage.setItem("tarihSutunEkle", tarihSutunEkle);

    bildirimGoster("✅ Üst bilgi ayarları kaydedildi!", "success");
    console.log("💾 Kaymakamlık kaydedildi:", kaymakamlik);
    console.log("💾 Rapor başlığı kaydedildi:", raporBaslik);
    console.log("💾 İmza sütunu:", imzaSutunEkle);
    console.log("💾 Tarih sütunu:", tarihSutunEkle);
  });
