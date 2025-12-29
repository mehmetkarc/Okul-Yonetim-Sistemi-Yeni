// ==========================================
// GEZİ RAPORLAR SİSTEMİ
// ==========================================

let currentGeziId = null;
let geziData = null;
let katilimcilar = {
  ogretmenler: [],
  ogrenciler: [],
  misafirler: [],
};

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📊 Gezi Raporlar sayfası yüklendi");

  // URL'den geziId'yi al
  const urlParams = new URLSearchParams(window.location.search);
  currentGeziId = urlParams.get("geziId");

  if (!currentGeziId) {
    Bildirim.goster("error", "❌ Gezi ID bulunamadı!");
    setTimeout(() => {
      window.location.href = "../gezi-planla.html";
    }, 2000);
    return;
  }

  console.log("📌 Gezi ID:", currentGeziId);

  // Gezi bilgilerini yükle
  await loadGeziInfo();

  // Katılımcıları yükle
  await loadKatilimcilar();

  Bildirim.goster("success", "✅ Gezi bilgileri yüklendi!");
});

// ==========================================
// GEZİ BİLGİLERİNİ YÜKLE
// ==========================================

async function loadGeziInfo() {
  try {
    console.log("🔄 Gezi bilgileri yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      "SELECT * FROM geziler WHERE id = ?",
      [currentGeziId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      throw new Error("Gezi bulunamadı");
    }

    geziData = result.data[0];
    console.log("📊 Gezi Data:", geziData);

    // Sayfayı güncelle
    document.getElementById("geziAdi").textContent = geziData.gezi_adi;
    document.getElementById(
      "geziYer"
    ).textContent = `📍 ${geziData.duzenlenen_yer}`;

    const baslangic = formatDate(geziData.gezi_tarihi);
    const bitis = formatDate(geziData.donus_tarihi);
    document.getElementById(
      "geziTarih"
    ).textContent = `📅 ${baslangic} - ${bitis}`;

    // Katılımcı sayısını hesapla
    await updateKatilimciSayisi();

    console.log("✅ Gezi bilgileri yüklendi");
  } catch (error) {
    console.error("❌ Gezi bilgisi yükleme hatası:", error);
    Bildirim.goster("error", "❌ Gezi bilgileri yüklenemedi!");
  }
}

// ==========================================
// KATILIMCILARI YÜKLE
// ==========================================

async function loadKatilimcilar() {
  try {
    console.log("🔄 Katılımcılar yükleniyor...");

    // Öğretmenleri yükle
    const ogretmenResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad_soyad, o.tc_no
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       WHERE go.gezi_id = ?`,
      [currentGeziId]
    );

    if (ogretmenResult.success && ogretmenResult.data) {
      katilimcilar.ogretmenler = ogretmenResult.data;
    }

    // Öğrencileri yükle
    const ogrenciResult = await window.electronAPI.dbQuery(
      `SELECT o.id, (o.ad || ' ' || o.soyad) as ad_soyad, o.tc_no, o.sinif
       FROM gezi_ogrenciler go
       INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
       WHERE go.gezi_id = ?`,
      [currentGeziId]
    );

    if (ogrenciResult.success && ogrenciResult.data) {
      katilimcilar.ogrenciler = ogrenciResult.data;
    }

    // Misafirleri yükle
    const misafirResult = await window.electronAPI.dbQuery(
      `SELECT id, ad_soyad, tc_no
       FROM gezi_misafirler
       WHERE gezi_id = ?`,
      [currentGeziId]
    );

    if (misafirResult.success && misafirResult.data) {
      katilimcilar.misafirler = misafirResult.data;
    }

    console.log("✅ Katılımcılar yüklendi:", {
      ogretmen: katilimcilar.ogretmenler.length,
      ogrenci: katilimcilar.ogrenciler.length,
      misafir: katilimcilar.misafirler.length,
    });

    await updateKatilimciSayisi();
  } catch (error) {
    console.error("❌ Katılımcı yükleme hatası:", error);
  }
}

async function updateKatilimciSayisi() {
  const toplam =
    katilimcilar.ogretmenler.length +
    katilimcilar.ogrenciler.length +
    katilimcilar.misafirler.length;

  document.getElementById(
    "geziKatilimci"
  ).textContent = `👥 ${toplam} Katılımcı`;
}

// ==========================================
// RAPOR ÖNİZLE
// ==========================================

async function raporOnizle(raporTuru) {
  console.log("👁️ Rapor önizleniyor:", raporTuru);
  Bildirim.goster("info", "🔄 Rapor hazırlanıyor...");

  try {
    // ==========================================
    // ÖĞRENCİ LİSTESİ - ŞABLON DOSYASI
    // ==========================================
    if (raporTuru === "ogrenci-listesi") {
      const ogrWindow = window.open(
        "sablonlar/ogrenci-listesi.html",
        "_blank",
        "width=1000,height=800"
      );

      ogrWindow.addEventListener("load", async function () {
        try {
          console.log("🔄 Öğrenci listesi verileri dolduruluyor...");

          // Gezi bilgileri
          ogrWindow.document.getElementById("geziYeri").textContent =
            geziData.duzenlenen_yer;
          ogrWindow.document.getElementById(
            "gidisTarih"
          ).textContent = `${formatDate(geziData.gezi_tarihi)} - ${
            geziData.cikis_saati
          }`;
          ogrWindow.document.getElementById(
            "donusTarih"
          ).textContent = `${formatDate(geziData.donus_tarihi)} - ${
            geziData.donus_saati
          }`;
          ogrWindow.document.getElementById("geziYeriAlt").textContent =
            geziData.duzenlenen_yer;
          ogrWindow.document.getElementById("baslangicTarih").textContent =
            formatDate(geziData.gezi_tarihi);
          ogrWindow.document.getElementById("bitisTarih").textContent =
            formatDate(geziData.donus_tarihi);
          ogrWindow.document.getElementById("bugunTarih").textContent =
            getCurrentDate().replace(/_/g, ".");

          // Öğrencileri çek
          const ogrenciResult = await window.electronAPI.dbQuery(
            `SELECT 
              o.id, 
              o.ad, 
              o.soyad,
              o.ad_soyad,
              o.okul_no,
              o.sinif,
              o.cinsiyet,
              o.anne_telefon,
              o.baba_telefon
             FROM gezi_ogrenciler go
             INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
             WHERE go.gezi_id = ?
             ORDER BY o.sinif, o.ad_soyad`,
            [currentGeziId]
          );

          const ogrenciler = ogrenciResult.data || [];
          const tbody = ogrWindow.document.getElementById("ogrenciListesi");

          ogrenciler.forEach((o, index) => {
            const row = tbody.insertRow();

            // Sıra No
            row.insertCell().textContent = index + 1;

            // Sınıf
            row.insertCell().textContent = o.sinif || "-";

            // Okul No
            row.insertCell().textContent = o.okul_no || "-";

            // Ad Soyad
            const cellAd = row.insertCell();
            cellAd.textContent = o.ad_soyad || `${o.ad} ${o.soyad}`;
            cellAd.className = "ad-soyad";

            // Cinsiyet
            const cinsiyet =
              o.cinsiyet === "E" ? "Erkek" : o.cinsiyet === "K" ? "Kız" : "-";
            row.insertCell().textContent = cinsiyet;

            // Anne Telefon (Düzenlenebilir)
            const cellAnneTel = row.insertCell();
            ogrWindow.makeEditable(cellAnneTel, o.anne_telefon);

            // Baba Telefon (Düzenlenebilir)
            const cellBabaTel = row.insertCell();
            ogrWindow.makeEditable(cellBabaTel, o.baba_telefon);
          });

          // Toplam öğrenci
          ogrWindow.document.getElementById("toplamOgrenci").textContent =
            ogrenciler.length;

          console.log("✅ Öğrenci listesi verileri dolduruldu");
          Bildirim.goster(
            "success",
            "✅ Önizleme hazır! Telefon numaralarını düzenleyebilirsiniz."
          );
        } catch (error) {
          console.error("❌ Veri doldurma hatası:", error);
          Bildirim.goster("error", "❌ Veriler yüklenemedi!");
        }
      });
      return;
    }

    // ==========================================
    // GEZİ PLANI EK-1 - ŞABLON DOSYASI
    // ==========================================
    if (raporTuru === "gezi-plani-ek1") {
      const ek1Window = window.open(
        "sablonlar/gezi-plani-ek1.html",
        "_blank",
        "width=1200,height=900"
      );

      ek1Window.addEventListener("load", async function () {
        try {
          console.log("🔄 Gezi Planı Ek-1 verileri dolduruluyor...");

          // ============================================
          // 1. GENEL BİLGİLER (Mavi Tablo)
          // ============================================
          ek1Window.document.getElementById("okulAdi").textContent =
            geziData.okul_adi || "Bahçelievler Cumhuriyet Anadolu Lisesi";
          ek1Window.document.getElementById("guzergah").textContent =
            geziData.guzergah || geziData.duzenlenen_yer || "";
          ek1Window.document.getElementById("geziAmaci").textContent =
            geziData.gezi_amaci || "";

          // Tarih ve saatler
          const geziTarih = `${formatDate(geziData.gezi_tarihi)} - ${
            geziData.cikis_saati || "08:00"
          }`;
          const donusTarih = `${formatDate(geziData.donus_tarihi)} - ${
            geziData.donus_saati || "18:00"
          }`;
          ek1Window.document.getElementById("geziTarihSaat").textContent =
            geziTarih;
          ek1Window.document.getElementById("donusTarihSaat").textContent =
            donusTarih;

          // ============================================
          // 2. KATILIMCILAR TABLOSU (3 Sütun)
          // ============================================
          await loadKatilimcilarEk1(ek1Window);

          // ============================================
          // 3. İSTATİSTİKLER VE MALİ BİLGİLER
          // ============================================
          await loadIstatistiklerEk1(ek1Window);

          // ============================================
          // 4. ARAÇ BİLGİLERİ (Varsa göster)
          // ============================================
          await loadAracBilgileriEk1(ek1Window);

          // ============================================
          // 5. İMZA ALANLARI
          // ============================================
          await loadImzaAlanlariEk1(ek1Window);

          console.log("✅ Gezi Planı Ek-1 verileri dolduruldu");
          Bildirim.goster("success", "✅ Gezi Planı Ek-1 hazır!");
        } catch (error) {
          console.error("❌ Gezi Planı Ek-1 doldurma hatası:", error);
          Bildirim.goster("error", "❌ Gezi Planı Ek-1 yüklenemedi!");
        }
      });
      return;
    }
    // ==========================================
    // GEZİ PLANI EK-2 - ŞABLON DOSYASI
    // ==========================================
    if (raporTuru === "gezi-plani-ek2") {
      const ek2Window = window.open(
        "sablonlar/gezi-plani-ek2.html",
        "_blank",
        "width=1200,height=900"
      );

      ek2Window.addEventListener("load", async function () {
        try {
          console.log("🔄 Gezi Planı Ek-2 verileri dolduruluyor...");

          // ============================================
          // 1. GENEL BİLGİLER
          // ============================================
          ek2Window.document.getElementById("okulAdi").textContent =
            localStorage.getItem("okul_adi") ||
            "Bahçelievler Cumhuriyet Anadolu Lisesi";

          ek2Window.document.getElementById("geziTarihi").textContent =
            formatDate(geziData.gezi_tarihi);

          ek2Window.document.getElementById("cikisSaati").textContent =
            geziData.cikis_saati || "08:00";

          ek2Window.document.getElementById(
            "donusTarihSaat"
          ).textContent = `${formatDate(geziData.donus_tarihi)} - ${
            geziData.donus_saati || "18:00"
          }`;

          // Kafile başkanı
          const kafileResult = await window.electronAPI.dbQuery(
            `SELECT o.ad_soyad
             FROM gezi_kafile_baskanlari gk
             INNER JOIN ogretmenler o ON gk.ogretmen_id = o.id
             WHERE gk.gezi_id = ?
             LIMIT 1`,
            [currentGeziId]
          );

          ek2Window.document.getElementById("kafileBaskan").textContent =
            kafileResult.data && kafileResult.data.length > 0
              ? kafileResult.data[0].ad_soyad
              : "-";

          ek2Window.document.getElementById("guzergah").textContent =
            geziData.guzergah || geziData.duzenlenen_yer || "";

          ek2Window.document.getElementById("amac").textContent =
            geziData.gezi_amaci || "";

          ek2Window.document.getElementById("konu").textContent =
            geziData.gezi_konusu || geziData.gezi_adi || "";

          ek2Window.document.getElementById("arastirmaGorev").textContent =
            geziData.arastirma_gorevi || "-";

          // ============================================
          // 2. SINIFLAR VE ÖĞRENCİ SAYILARI
          // ============================================
          await loadSinifListesiEk2(ek2Window);

          // ============================================
          // 3. SORUMLU ÖĞRETMENLER
          // ============================================
          await loadOgretmenlerEk2(ek2Window);

          // ============================================
          // 4. FİRMA BİLGİLERİ
          // ============================================
          await loadFirmaBilgileriEk2(ek2Window);

          // ============================================
          // 5. ULAŞIM BİLGİLERİ (ARAÇ / UÇAK)
          // ============================================
          await loadUlasimBilgileriEk2(ek2Window);

          // ============================================
          // 6. İMZA ALANLARI VE TARİHLER
          // ============================================
          await loadImzaAlanlariEk2(ek2Window);

          console.log("✅ Gezi Planı Ek-2 verileri dolduruldu");
          Bildirim.goster("success", "✅ Gezi Planı Ek-2 hazır!");
        } catch (error) {
          console.error("❌ Gezi Planı Ek-2 doldurma hatası:", error);
          Bildirim.goster("error", "❌ Gezi Planı Ek-2 yüklenemedi!");
        }
      });
      return;
    }

    // ==========================================
    // GEZİ PLANI EK-4 - VELİ İZİN BELGESİ
    // ==========================================
    if (raporTuru === "veli-izin") {
      // Önce öğrenci seçim modalı göster
      showOgrenciSecimModal();
      return;
    }

    // ==========================================
    // DİĞER RAPORLAR - HTML STRING OLUŞTUR
    // ==========================================
    let htmlContent = "";

    switch (raporTuru) {
      case "ogretmen-listesi":
        htmlContent = await generateOgretmenListesi();
        break;
      case "misafir-listesi":
        htmlContent = await generateMisafirListesi();
        break;
      case "pasaport-listesi":
        htmlContent = await generatePasaportListesi();
        break;
      case "ucus-manifesto":
        htmlContent = await generateUcusManifestosu();
        break;
      case "konaklama-raporu":
        htmlContent = await generateKonaklamaRaporu();
        break;
      case "odeme-raporu":
        htmlContent = await generateOdemeRaporu();
        break;
      case "maliyet-analizi":
        htmlContent = await generateMaliyetAnalizi();
        break;
      case "arac-dagilim":
        htmlContent = await generateAracDagilimi();
        break;
      case "gunluk-program":
        htmlContent = await generateGunlukProgram();
        break;
      case "mudurluk-onay": // ← YENİ EKLENEN
        htmlContent = await generateMudurlukOnay();
        break;
      default:
        Bildirim.goster("warning", "⚠️ Bu rapor henüz hazır değil!");
        return;
    }

    // Yeni pencerede aç
    const previewWindow = window.open("", "_blank", "width=900,height=700");
    previewWindow.document.write(htmlContent);
    previewWindow.document.close();

    Bildirim.goster("success", "✅ Önizleme hazır!");
  } catch (error) {
    console.error("❌ Önizleme hatası:", error);
    Bildirim.goster("error", "❌ Önizleme oluşturulamadı!");
  }
}

// ==========================================
// YARDIMCI FONKSİYONLAR - GEZİ PLANI EK-1
// ==========================================

// ============================================
// KATILIMCILAR TABLOSU (3 Sütun Yan Yana)
// ============================================
async function loadKatilimcilarEk1(ek1Window) {
  console.log("🔄 Katılımcılar yükleniyor (Ek-1)...");

  // Kafile başkanını çek
  const kafileResult = await window.electronAPI.dbQuery(
    `SELECT o.ad_soyad, o.gorev
     FROM gezi_kafile_baskanlari gk
     INNER JOIN ogretmenler o ON gk.ogretmen_id = o.id
     WHERE gk.gezi_id = ?`,
    [currentGeziId]
  );

  // Sorumlu öğretmenleri çek
  const ogretmenResult = await window.electronAPI.dbQuery(
    `SELECT o.ad_soyad, 'Sorumlu Öğretmen' as gorev
     FROM gezi_ogretmenler go
     INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
     WHERE go.gezi_id = ?
     ORDER BY o.ad_soyad`,
    [currentGeziId]
  );

  const katilimcilar = [];

  // Kafile başkanını ekle (en üstte)
  if (kafileResult.data && kafileResult.data.length > 0) {
    kafileResult.data.forEach((k) => {
      katilimcilar.push({
        ad_soyad: k.ad_soyad,
        gorev: k.gorev || "Kafile Başkanı",
      });
    });
  }

  // Sorumlu öğretmenleri ekle
  if (ogretmenResult.data && ogretmenResult.data.length > 0) {
    ogretmenResult.data.forEach((o) => {
      katilimcilar.push({
        ad_soyad: o.ad_soyad,
        gorev: o.gorev,
      });
    });
  }

  // 3'lü gruplara böl
  const tbody = ek1Window.document.getElementById("katilimcilarBody");
  tbody.innerHTML = "";

  for (let i = 0; i < katilimcilar.length; i += 3) {
    const row = tbody.insertRow();

    // 1. Sütun
    if (katilimcilar[i]) {
      row.insertCell().textContent = katilimcilar[i].ad_soyad;
      row.insertCell().textContent = katilimcilar[i].gorev;
      row.insertCell().textContent = ""; // İmza alanı
    } else {
      row.insertCell().textContent = "";
      row.insertCell().textContent = "";
      row.insertCell().textContent = "";
    }

    // 2. Sütun
    if (katilimcilar[i + 1]) {
      row.insertCell().textContent = katilimcilar[i + 1].ad_soyad;
      row.insertCell().textContent = katilimcilar[i + 1].gorev;
      row.insertCell().textContent = ""; // İmza alanı
    } else {
      row.insertCell().textContent = "";
      row.insertCell().textContent = "";
      row.insertCell().textContent = "";
    }

    // 3. Sütun
    if (katilimcilar[i + 2]) {
      row.insertCell().textContent = katilimcilar[i + 2].ad_soyad;
      row.insertCell().textContent = katilimcilar[i + 2].gorev;
      row.insertCell().textContent = ""; // İmza alanı
    } else {
      row.insertCell().textContent = "";
      row.insertCell().textContent = "";
      row.insertCell().textContent = "";
    }
  }

  console.log(`✅ ${katilimcilar.length} katılımcı eklendi (Ek-1)`);
}

// ============================================
// İSTATİSTİKLER VE MALİ BİLGİLER
// ============================================
async function loadIstatistiklerEk1(ek1Window) {
  console.log("🔄 İstatistikler hesaplanıyor (Ek-1)...");

  // Öğrenci sayısı
  const ogrenciResult = await window.electronAPI.dbQuery(
    "SELECT COUNT(*) as sayi FROM gezi_ogrenciler WHERE gezi_id = ?",
    [currentGeziId]
  );
  const ogrenciSayi = ogrenciResult.data[0]?.sayi || 0;

  // Öğretmen sayısı
  const ogretmenResult = await window.electronAPI.dbQuery(
    "SELECT COUNT(*) as sayi FROM gezi_ogretmenler WHERE gezi_id = ?",
    [currentGeziId]
  );
  const ogretmenSayi = ogretmenResult.data[0]?.sayi || 0;

  // Kafile başkanı sayısı
  const kafileResult = await window.electronAPI.dbQuery(
    "SELECT COUNT(*) as sayi FROM gezi_kafile_baskanlari WHERE gezi_id = ?",
    [currentGeziId]
  );
  const kafileSayi = kafileResult.data[0]?.sayi || 0;

  // Misafir sayısı
  const misafirResult = await window.electronAPI.dbQuery(
    "SELECT COUNT(*) as sayi FROM gezi_misafirler WHERE gezi_id = ?",
    [currentGeziId]
  );
  const misafirSayi = misafirResult.data[0]?.sayi || 0;

  const toplamKatilimci = ogrenciSayi + ogretmenSayi + kafileSayi + misafirSayi;

  // Ödeme planını çek
  const planResult = await window.electronAPI.dbQuery(
    "SELECT * FROM gezi_odeme_plani WHERE gezi_id = ?",
    [currentGeziId]
  );

  let kisiBasiUcret = 0;
  let paraBirimi = "TL";
  let toplamGelir = 0;
  let toplamGider = 0;

  if (planResult.data && planResult.data.length > 0) {
    const plan = planResult.data[0];
    kisiBasiUcret = plan.kisi_basi_ucret || 0;
    paraBirimi = plan.para_birimi || "TL";
    toplamGelir = ogrenciSayi * kisiBasiUcret;
    toplamGider = toplamGelir; // Şimdilik eşit
  }

  const kalan = toplamGelir - toplamGider;

  // Verileri doldur
  ek1Window.document.getElementById("ogrenciSayi").textContent = ogrenciSayi;
  ek1Window.document.getElementById("toplamKatilimci").textContent =
    toplamKatilimci;

  // Kişi başı ücret label'ına para birimini ekle
  ek1Window.document.getElementById(
    "kisiBasiUcretLabel"
  ).textContent = `(${kisiBasiUcret.toLocaleString("tr-TR")} ${paraBirimi})`;

  ek1Window.document.getElementById("kisiBasiUcret").textContent =
    kisiBasiUcret.toLocaleString("tr-TR");
  ek1Window.document.getElementById("toplamGelir").textContent =
    toplamGelir.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  ek1Window.document.getElementById("toplamGider").textContent =
    toplamGider.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  ek1Window.document.getElementById("kalanBakiye").textContent =
    kalan.toLocaleString("tr-TR", { minimumFractionDigits: 2 });

  console.log("✅ İstatistikler dolduruldu (Ek-1)");
}
// ============================================
// ARAÇ/UÇAK BİLGİLERİ (Gezi Türüne Göre)
// ============================================
async function loadAracBilgileriEk1(ek1Window) {
  console.log("🔄 Ulaşım bilgileri kontrol ediliyor (Ek-1)...");
  console.log("📊 Current Gezi ID:", currentGeziId);
  console.log("📊 Gezi Türü:", geziData.gezi_turu);

  try {
    const karaTablo = ek1Window.document.getElementById("karaYoluTablosu");
    const havaTablo = ek1Window.document.getElementById("havaYoluTablosu");
    const karaEkler = ek1Window.document.getElementById("karaYoluEkler");
    const ulasimBaslik = ek1Window.document.getElementById("ulasimBaslik");

    // ============================================
    // YURT DIŞI İSE UÇAK BİLGİLERİNİ GÖSTER
    // ============================================
    if (geziData.gezi_turu === "yurt_disi") {
      console.log("✈️ Yurt dışı gezisi - Uçak bilgileri gösteriliyor");

      // Kara yolu tablosunu gizle
      if (karaTablo) karaTablo.style.display = "none";
      if (karaEkler) karaEkler.style.display = "none";

      // Hava yolu tablosunu göster
      if (havaTablo) havaTablo.style.display = "table";

      // Başlığı değiştir
      if (ulasimBaslik) {
        ulasimBaslik.textContent = "Uçuş Bilgileri";
      }

      // Uçuş bilgilerini çek
      const ucakResult = await window.electronAPI.dbQuery(
        "SELECT * FROM gezi_ulasim WHERE gezi_id = ? AND ulasim_tipi = 'ucak' LIMIT 1",
        [currentGeziId]
      );

      console.log("📊 UÇAK SORGU SONUCU:", ucakResult);

      if (ucakResult.data && ucakResult.data.length > 0) {
        const ucus = ucakResult.data[0];
        console.log("✈️ Uçuş Detayı:", ucus);

        // Uçuş bilgilerini doldur
        ek1Window.document.getElementById("havayoluSirketi").textContent =
          ucus.firma_adi || "-";
        ek1Window.document.getElementById("ucusNo").textContent =
          ucus.sefer_no || "-";
        ek1Window.document.getElementById("kalkisHavaalani").textContent =
          ucus.kalkis_yeri || "-";
        ek1Window.document.getElementById("varisHavaalani").textContent =
          ucus.varis_yeri || "-";
        ek1Window.document.getElementById("kalkisTarihiUcak").textContent =
          ucus.kalkis_tarihi
            ? `${formatDate(ucus.kalkis_tarihi)} ${ucus.kalkis_saati || ""}`
            : "-";
        ek1Window.document.getElementById("varisTarihiUcak").textContent =
          ucus.varis_tarihi
            ? `${formatDate(ucus.varis_tarihi)} ${ucus.varis_saati || ""}`
            : "-";
        ek1Window.document.getElementById("pnrKodu").textContent =
          ucus.pnr_kodu || "-";

        console.log("✅ Uçak bilgileri dolduruldu");
      } else {
        console.log("⚠️ Uçuş bilgisi bulunamadı, boş bırakılıyor");
        ek1Window.document.getElementById("havayoluSirketi").textContent = "-";
        ek1Window.document.getElementById("ucusNo").textContent = "-";
        ek1Window.document.getElementById("kalkisHavaalani").textContent = "-";
        ek1Window.document.getElementById("varisHavaalani").textContent = "-";
        ek1Window.document.getElementById("kalkisTarihiUcak").textContent = "-";
        ek1Window.document.getElementById("varisTarihiUcak").textContent = "-";
        ek1Window.document.getElementById("pnrKodu").textContent = "-";
      }

      return; // Fonksiyondan çık
    }

    // ============================================
    // YURT İÇİ İSE ARAÇ BİLGİLERİNİ GÖSTER
    // ============================================
    console.log("🚗 Yurt içi gezisi - Araç bilgileri gösteriliyor");

    // Hava yolu tablosunu gizle
    if (havaTablo) havaTablo.style.display = "none";

    // Kara yolu tablosunu göster
    if (karaTablo) karaTablo.style.display = "table";
    if (karaEkler) karaEkler.style.display = "table";

    // Başlığı onayla
    if (ulasimBaslik) {
      ulasimBaslik.textContent = "Aracın (Araç otobüsse tek katlı olacaktır)";
    }

    // Araç bilgilerini çek
    const aracResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_araclar WHERE gezi_id = ?",
      [currentGeziId]
    );

    console.log("📊 ARAÇ SORGU SONUCU:", aracResult);

    if (!aracResult.data || aracResult.data.length === 0) {
      console.log("⚠️ Araç kaydı yok, tüm alanlar '-' yapılıyor");

      // Tüm alanları "-" yap
      ek1Window.document.getElementById("aracPlaka").textContent = "-";
      ek1Window.document.getElementById("aracModel").textContent = "-";
      ek1Window.document.getElementById("aracTrafik").textContent = "-";
      ek1Window.document.getElementById("aracMuayene").textContent = "-";
      ek1Window.document.getElementById("maliSigortaNo").textContent = "-";
      ek1Window.document.getElementById("maliSigortaBitis").textContent = "-";
      ek1Window.document.getElementById("kazaSigortaNo").textContent = "-";
      ek1Window.document.getElementById("kazaSigortaBitis").textContent = "-";
      ek1Window.document.getElementById("sofor1Ad").textContent = "-";
      ek1Window.document.getElementById("sofor1Tc").textContent = "-";
      ek1Window.document.getElementById("sofor2Ad").textContent = "-";
      ek1Window.document.getElementById("sofor2Tc").textContent = "-";

      console.log("✅ Tüm araç alanları '-' olarak dolduruldu");
      return;
    }

    const arac = aracResult.data[0];
    console.log("🚗 Araç Detayı:", arac);

    // Araç bilgilerini doldur
    ek1Window.document.getElementById("aracPlaka").textContent =
      arac.plaka || "-";
    ek1Window.document.getElementById("aracModel").textContent =
      arac.arac_modeli || "-";
    ek1Window.document.getElementById("aracTrafik").textContent =
      arac.trafige_cikis_tarihi ? formatDate(arac.trafige_cikis_tarihi) : "-";
    ek1Window.document.getElementById("aracMuayene").textContent =
      arac.son_muayene_tarihi ? formatDate(arac.son_muayene_tarihi) : "-";

    // Sigorta bilgileri - ARAC TABLOSUNDAN ÇEK
    ek1Window.document.getElementById("maliSigortaNo").textContent =
      arac.mali_sorumluluk_police_no || "-";
    ek1Window.document.getElementById("maliSigortaBitis").textContent =
      arac.mali_sorumluluk_bitis_tarihi
        ? formatDate(arac.mali_sorumluluk_bitis_tarihi)
        : "-";
    ek1Window.document.getElementById("kazaSigortaNo").textContent =
      arac.ferdi_kaza_police_no || "-";
    ek1Window.document.getElementById("kazaSigortaBitis").textContent =
      arac.ferdi_kaza_bitis_tarihi
        ? formatDate(arac.ferdi_kaza_bitis_tarihi)
        : "-";

    // Şoförleri çek
    console.log("🔍 Şoförler sorgulanıyor, Araç ID:", arac.id);
    const soforResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_arac_soforler WHERE arac_id = ? ORDER BY id LIMIT 2",
      [arac.id]
    );

    console.log("📊 ŞOFÖR SORGU SONUCU:", soforResult);

    const soforler = soforResult.data || [];

    // Şoför bilgileri
    if (soforler[0]) {
      console.log("👤 1. Şoför:", soforler[0]);
      ek1Window.document.getElementById("sofor1Ad").textContent =
        soforler[0].ad_soyad || "-";
      ek1Window.document.getElementById("sofor1Tc").textContent =
        soforler[0].tc_no || "-";
    } else {
      console.log("⚠️ 1. Şoför yok");
      ek1Window.document.getElementById("sofor1Ad").textContent = "-";
      ek1Window.document.getElementById("sofor1Tc").textContent = "-";
    }

    if (soforler[1]) {
      console.log("👤 2. Şoför:", soforler[1]);
      ek1Window.document.getElementById("sofor2Ad").textContent =
        soforler[1].ad_soyad || "-";
      ek1Window.document.getElementById("sofor2Tc").textContent =
        soforler[1].tc_no || "-";
    } else {
      console.log("⚠️ 2. Şoför yok");
      ek1Window.document.getElementById("sofor2Ad").textContent = "-";
      ek1Window.document.getElementById("sofor2Tc").textContent = "-";
    }

    console.log("✅ Araç bilgileri dolduruldu");
  } catch (error) {
    console.error("❌ Ulaşım bilgileri yükleme hatası:", error);
    console.error("❌ Hata detayı:", error.message);
    console.error("❌ Stack:", error.stack);
  }
}
// ============================================
// İMZA ALANLARI
// ============================================
async function loadImzaAlanlariEk1(ek1Window) {
  console.log("🔄 İmza alanları dolduruluyor (Ek-1)...");

  // ============================================
  // 1. GEZİYİ DÜZENLEYEN/HAZIRLAYAN (Sorumlu Öğretmenler)
  // ============================================
  const ogretmenResult = await window.electronAPI.dbQuery(
    `SELECT o.ad_soyad
     FROM gezi_ogretmenler go
     INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
     WHERE go.gezi_id = ?
     ORDER BY o.ad_soyad`,
    [currentGeziId]
  );

  let geziDuzenleyenler = "";
  if (ogretmenResult.data && ogretmenResult.data.length > 0) {
    // Alt alta yaz
    geziDuzenleyenler = ogretmenResult.data.map((o) => o.ad_soyad).join("\n");
    console.log("👥 Geziyi düzenleyenler:", geziDuzenleyenler);
  } else {
    // Öğretmen yoksa kullanıcı adını kullan
    geziDuzenleyenler =
      localStorage.getItem("kullanici_adi") || "Gezi Sorumlusu";
  }

  ek1Window.document.getElementById("geziDuzenleyen").textContent =
    geziDuzenleyenler;

  // ============================================
  // 2. KAFİLE BAŞKANI
  // ============================================
  const kafileResult = await window.electronAPI.dbQuery(
    `SELECT o.ad_soyad
     FROM gezi_kafile_baskanlari gk
     INNER JOIN ogretmenler o ON gk.ogretmen_id = o.id
     WHERE gk.gezi_id = ?
     LIMIT 1`,
    [currentGeziId]
  );

  if (kafileResult.data && kafileResult.data.length > 0) {
    ek1Window.document.getElementById("kafileBaskan").textContent =
      kafileResult.data[0].ad_soyad;
    console.log("👑 Kafile başkanı:", kafileResult.data[0].ad_soyad);
  } else {
    ek1Window.document.getElementById("kafileBaskan").textContent = "-";
    console.log("⚠️ Kafile başkanı bulunamadı");
  }

  // ============================================
  // 3. OKUL MÜDÜRÜ (Veritabanından çek)
  // ============================================
  const mudurResult = await window.electronAPI.dbQuery(
    `SELECT ad_soyad, gorev 
     FROM ogretmenler 
     WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili')
     AND durum = 1
     LIMIT 1`
  );

  let okulMuduru = "";
  if (mudurResult.data && mudurResult.data.length > 0) {
    okulMuduru = mudurResult.data[0].ad_soyad;
    console.log(
      "🏫 Okul Müdürü:",
      okulMuduru,
      `(${mudurResult.data[0].gorev})`
    );
  } else {
    // Veritabanında bulunamazsa localStorage'dan al
    okulMuduru = localStorage.getItem("okul_muduru") || "-";
    console.log(
      "⚠️ Okul müdürü veritabanında bulunamadı, localStorage kullanıldı"
    );
  }

  ek1Window.document.getElementById("okulMuduru").textContent = okulMuduru;

  console.log("✅ İmza alanları dolduruldu (Ek-1)");
}
// ==========================================
// RAPOR PDF İNDİR
// ==========================================

async function raporPDFIndir(raporTuru) {
  console.log("📄 PDF indiriliyor:", raporTuru);
  Bildirim.goster("info", "🔄 PDF oluşturuluyor...");

  try {
    // ÖĞRENCİ LİSTESİ - ŞABLON KULLANDIĞI İÇİN ÖNİZLEMEDEN YAZDIR
    if (raporTuru === "ogrenci-listesi") {
      Bildirim.goster(
        "warning",
        "⚠️ Önce önizlemeyi açın, ardından 'PDF Olarak Kaydet' butonuna tıklayın!"
      );
      // Otomatik önizleme aç
      await raporOnizle("ogrenci-listesi");
      return;
    }

    let htmlContent = "";
    let fileName = "";

    switch (raporTuru) {
      case "gezi-plani-ek1":
        htmlContent = await generateGeziPlaniEk1();
        fileName = `Gezi_Plani_${geziData.gezi_adi}_${getCurrentDate()}.pdf`;
        break;
      case "ogretmen-listesi":
        htmlContent = await generateOgretmenListesi();
        fileName = `Ogretmen_Listesi_${
          geziData.gezi_adi
        }_${getCurrentDate()}.pdf`;
        break;
      case "misafir-listesi":
        htmlContent = await generateMisafirListesi();
        fileName = `Misafir_Listesi_${
          geziData.gezi_adi
        }_${getCurrentDate()}.pdf`;
        break;
      case "pasaport-listesi":
        htmlContent = await generatePasaportListesi();
        fileName = `Pasaport_Listesi_${
          geziData.gezi_adi
        }_${getCurrentDate()}.pdf`;
        break;
      default:
        Bildirim.goster("warning", "⚠️ Bu rapor henüz hazır değil!");
        return;
    }

    // PDF oluştur
    const result = await window.electronAPI.createPDF({
      html: htmlContent,
      fileName: fileName,
    });

    if (result.success) {
      Bildirim.goster("success", "✅ PDF başarıyla indirildi!");
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("❌ PDF oluşturma hatası:", error);
    Bildirim.goster("error", "❌ PDF oluşturulamadı!");
  }
}

// ==========================================
// ÖĞRETMEN LİSTESİ RAPORU
// ==========================================
async function generateOgretmenListesi() {
  console.log("🔄 Öğretmen listesi oluşturuluyor...");

  try {
    // ============================================
    // 1. KAFİLE BAŞKANINI ÇEK
    // ============================================
    const kafileResult = await window.electronAPI.dbQuery(
      `SELECT o.ad_soyad
       FROM gezi_kafile_baskanlari gk
       INNER JOIN ogretmenler o ON gk.ogretmen_id = o.id
       WHERE gk.gezi_id = ?
       LIMIT 1`,
      [currentGeziId]
    );

    const kafileBaskan =
      kafileResult.data && kafileResult.data.length > 0
        ? { ad_soyad: kafileResult.data[0].ad_soyad, gorev: "Kafile Başkanı" }
        : null;

    // ============================================
    // 2. DİĞER ÖĞRETMENLERİ ÇEK
    // ============================================
    const ogretmenResult = await window.electronAPI.dbQuery(
      `SELECT o.ad_soyad
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       WHERE go.gezi_id = ?
       ORDER BY o.ad_soyad`,
      [currentGeziId]
    );

    // ============================================
    // 3. LİSTEYİ BİRLEŞTİR (KAFİLE BAŞKANI EN ÜSTTE)
    // ============================================
    const tumOgretmenler = [];

    if (kafileBaskan) {
      tumOgretmenler.push(kafileBaskan);
    }

    if (ogretmenResult.success && ogretmenResult.data) {
      ogretmenResult.data.forEach((o) => {
        // Kafile başkanı zaten listede, tekrar ekleme
        if (!kafileBaskan || o.ad_soyad !== kafileBaskan.ad_soyad) {
          tumOgretmenler.push({
            ad_soyad: o.ad_soyad,
            gorev: "Sorumlu Öğretmen",
          });
        }
      });
    }

    // ============================================
    // 4. OKUL MÜDÜRÜNÜ ÇEK
    // ============================================
    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev
       FROM ogretmenler
       WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili')
       AND durum = 1
       LIMIT 1`
    );

    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : { ad_soyad: "___________________", gorev: "Okul Müdürü" };

    // Okul adı
    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";

    // Tarih
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    // ============================================
    // 5. HTML OLUŞTUR
    // ============================================
    let html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Öğretmen Listesi</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 20mm;
    }

    @page {
      size: A4 portrait;
      margin: 20mm;
    }

    @media print {
      body {
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
      th {
        background-color: #e3f2fd !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    .btn-container {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      color: white;
    }

    .btn-print {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .btn-close {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .header h2 {
      font-size: 14pt;
      font-weight: bold;
      margin: 5px 0;
    }

    .tarih {
      text-align: right;
      margin-bottom: 20px;
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    table, th, td {
      border: 1px solid #000;
    }

    th, td {
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #e3f2fd; /* ✅ AÇIK MAVİ */
      font-weight: bold;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .mudur-imza {
      text-align: center;
      margin-top: 60px;
    }

    .mudur-imza .ad-soyad {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .mudur-imza .unvan {
      font-size: 11pt;
    }
  </style>
</head>
<body>
  <!-- Butonlar -->
  <div class="btn-container no-print">
    <button class="btn btn-print" onclick="window.print()">
      📄 YAZDIR / PDF
    </button>
    <button class="btn btn-close" onclick="window.close()">
      ✖ KAPAT
    </button>
  </div>

  <!-- Başlık -->
  <div class="header">
    <h2>${okulAdi}</h2>
    <h2>ÖĞRETMEN LİSTESİ</h2>
  </div>

  <!-- Tarih -->
  <div class="tarih">Tarih: ${tarih}</div>

  <!-- Öğretmen Tablosu -->
  <table>
    <thead>
      <tr>
        <th style="width: 10%; white-space: nowrap;">Sıra No</th>
        <th style="width: 50%">Adı Soyadı</th>
        <th style="width: 40%">Görevi</th>
      </tr>
    </thead>
    <tbody>`;

    // Öğretmenleri ekle
    if (tumOgretmenler.length > 0) {
      tumOgretmenler.forEach((ogretmen, index) => {
        html += `
      <tr>
        <td style="text-align: center">${index + 1}</td>
        <td>${ogretmen.ad_soyad}</td>
        <td style="text-align: center">${ogretmen.gorev}</td>
      </tr>`;
      });
    } else {
      html += `
      <tr>
        <td colspan="3" style="text-align: center">Öğretmen bulunamadı</td>
      </tr>`;
    }

    html += `
    </tbody>
  </table>

  <!-- Müdür İmza Alanı -->
  <div class="mudur-imza">
    <div style="height: 50px"></div>
    <div class="ad-soyad">${mudur.ad_soyad}</div>
    <div class="unvan">${mudur.gorev}</div>
  </div>

</body>
</html>`;

    return html;
  } catch (error) {
    console.error("❌ Öğretmen listesi oluşturma hatası:", error);
    throw error;
  }
}

// DEVAM EDİYOR - PART 2 GÖNDERECEĞİM...
// ==========================================
// MİSAFİR LİSTESİ RAPORU
// ==========================================
async function generateMisafirListesi() {
  console.log("🔄 Misafir listesi oluşturuluyor...");

  try {
    // Misafirleri çek
    const misafirResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, tc_no, cinsiyet
       FROM gezi_misafirler
       WHERE gezi_id = ?
       ORDER BY ad_soyad`,
      [currentGeziId]
    );

    // Okul müdürünü çek
    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev
       FROM ogretmenler
       WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili')
       AND durum = 1
       LIMIT 1`
    );

    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : { ad_soyad: "___________________", gorev: "Okul Müdürü" };

    // Okul adı
    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";

    // Tarih
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    // Misafir yoksa
    if (
      !misafirResult.success ||
      !misafirResult.data ||
      misafirResult.data.length === 0
    ) {
      return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Misafir Listesi</title>
  <style>
    body { 
      font-family: "Times New Roman", Times, serif; 
      margin: 20px; 
      color: #000; 
      text-align: center; 
      padding-top: 100px; 
    }
    .btn-container {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      gap: 10px;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      color: white;
    }
    .btn-close {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    @media print {
      .btn-container { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="btn-container">
    <button class="btn btn-close" onclick="window.close()">✖ KAPAT</button>
  </div>
  <h2>Bu gezide misafir katılımcı bulunmamaktadır.</h2>
</body>
</html>`;
    }

    // HTML oluştur
    let html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Misafir Listesi</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 20mm;
    }

    @page {
      size: A4 portrait;
      margin: 20mm;
    }

    @media print {
      body {
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
      th {
        background-color: #e3f2fd !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    .btn-container {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      color: white;
    }

    .btn-print {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .btn-close {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .header h2 {
      font-size: 14pt;
      font-weight: bold;
      margin: 5px 0;
    }

    .tarih {
      text-align: right;
      margin-bottom: 20px;
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    table, th, td {
      border: 1px solid #000;
    }

    th, td {
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #e3f2fd;
      font-weight: bold;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .mudur-imza {
      text-align: center;
      margin-top: 60px;
    }

    .mudur-imza .ad-soyad {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .mudur-imza .unvan {
      font-size: 11pt;
    }
  </style>
</head>
<body>
  <!-- Butonlar -->
  <div class="btn-container no-print">
    <button class="btn btn-print" onclick="window.print()">
      📄 YAZDIR / PDF
    </button>
    <button class="btn btn-close" onclick="window.close()">
      ✖ KAPAT
    </button>
  </div>

  <!-- Başlık -->
  <div class="header">
    <h2>${okulAdi}</h2>
    <h2>MİSAFİR LİSTESİ</h2>
  </div>

  <!-- Tarih -->
  <div class="tarih">Tarih: ${tarih}</div>

  <!-- Misafir Tablosu -->
  <table>
    <thead>
      <tr>
        <th style="width: 10%; white-space: nowrap;">Sıra No</th>
        <th style="width: 50%">Adı Soyadı</th>
        <th style="width: 20%">TC Kimlik No</th>
        <th style="width: 20%">Cinsiyet</th>
      </tr>
    </thead>
    <tbody>`;

    // Misafirleri ekle
    misafirResult.data.forEach((misafir, index) => {
      html += `
      <tr>
        <td style="text-align: center">${index + 1}</td>
        <td>${misafir.ad_soyad}</td>
        <td style="text-align: center">${misafir.tc_no || "-"}</td>
        <td style="text-align: center">${
          misafir.cinsiyet === "K" ? "Kadın" : "Erkek"
        }</td>
      </tr>`;
    });

    html += `
    </tbody>
  </table>

  <!-- Müdür İmza Alanı -->
  <div class="mudur-imza">
    <div style="height: 50px"></div>
    <div class="ad-soyad">${mudur.ad_soyad}</div>
    <div class="unvan">${mudur.gorev}</div>
  </div>

</body>
</html>`;

    return html;
  } catch (error) {
    console.error("❌ Misafir listesi oluşturma hatası:", error);
    throw error;
  }
}
// ==========================================
// PASAPORT LİSTESİ RAPORU
// ==========================================
async function generatePasaportListesi() {
  console.log("🔄 Pasaport listesi oluşturuluyor...");

  try {
    // Pasaport bilgilerini çek
    const pasaportResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_pasaportlar WHERE gezi_id = ? ORDER BY kisi_tipi, ad_soyad",
      [currentGeziId]
    );

    // Okul müdürünü çek
    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev
       FROM ogretmenler
       WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili')
       AND durum = 1
       LIMIT 1`
    );

    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : { ad_soyad: "___________________", gorev: "Okul Müdürü" };

    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    if (
      !pasaportResult.success ||
      !pasaportResult.data ||
      pasaportResult.data.length === 0
    ) {
      return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Pasaport Listesi</title><style>body{font-family:"Times New Roman",Times,serif;margin:20px;color:#000;text-align:center;padding-top:100px}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}@media print{.btn-container{display:none!important}}</style></head><body><div class="btn-container"><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><h2>Bu gezi için henüz pasaport bilgisi girilmemiştir.</h2></body></html>`;
    }

    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Pasaport Listesi</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:11pt;line-height:1.4;color:#000;background:#fff;padding:20mm}@page{size:A4 portrait;margin:20mm}@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}th{background-color:#e3f2fd!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-print{background:linear-gradient(135deg,#10b981 0%,#059669 100%)}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}.header{text-align:center;margin-bottom:20px}.header h2{font-size:14pt;font-weight:bold;margin:5px 0}.tarih{text-align:right;margin-bottom:20px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-bottom:30px;font-size:9pt}table,th,td{border:1px solid #000}th,td{padding:6px;text-align:left}th{background-color:#e3f2fd;font-weight:bold;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}.mudur-imza{text-align:center;margin-top:60px}.mudur-imza .ad-soyad{font-size:12pt;font-weight:bold;margin-bottom:5px}.mudur-imza .unvan{font-size:11pt}small{font-size:8pt;color:#666}</style></head><body><div class="btn-container no-print"><button class="btn btn-print" onclick="window.print()">📄 YAZDIR / PDF</button><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><div class="header"><h2>${okulAdi}</h2><h2>PASAPORT LİSTESİ</h2></div><div class="tarih">Tarih: ${tarih}</div><table><thead><tr><th style="width:7%;white-space:nowrap;">Sıra No</th><th style="width:23%;white-space:nowrap;">Adı Soyadı</th><th style="width:14%;white-space:nowrap;">Tipi</th><th style="width:15%;white-space:nowrap;">TC Kimlik No</th><th style="width:15%;white-space:nowrap;">Pasaport No</th><th style="width:10%;white-space:nowrap;">Türü</th><th style="width:16%;white-space:nowrap;">Geçerlilik</th></tr></thead><tbody>`;

    pasaportResult.data.forEach((p, index) => {
      let kisiTipi = "Misafir";
      if (p.kisi_tipi === "kafile_baskani" || p.kisi_tipi === "kafile")
        kisiTipi = "Kafile Başkanı";
      else if (p.kisi_tipi === "ogretmen") kisiTipi = "Öğretmen";
      else if (p.kisi_tipi === "ogrenci") kisiTipi = "Öğrenci";

      let pasaportTuru = "-";
      if (p.pasaport_turu === "bordo")
        pasaportTuru =
          '<span style="color:#8B0000;font-weight:bold;">● Bordo</span>';
      else if (p.pasaport_turu === "gri")
        pasaportTuru =
          '<span style="color:#808080;font-weight:bold;">● Gri</span>';
      else if (p.pasaport_turu === "yesil")
        pasaportTuru =
          '<span style="color:#006400;font-weight:bold;">● Yeşil</span>';

      const ciftVatandaslik =
        p.cift_vatandaslik === 1
          ? `<br><small>2. Pasaport: ${p.ikinci_pasaport_seri}${p.ikinci_pasaport_no}</small>`
          : "";
      const gecerlilik = p.son_gecerlilik_tarihi
        ? formatDate(p.son_gecerlilik_tarihi)
        : "-";

      html += `<tr><td style="text-align:center">${index + 1}</td><td>${
        p.ad_soyad
      }</td><td style="text-align:center">${kisiTipi}</td><td style="text-align:center">${
        p.tc_kimlik || "-"
      }</td><td style="text-align:center">${p.pasaport_seri}${
        p.pasaport_no
      }${ciftVatandaslik}</td><td style="text-align:center">${pasaportTuru}</td><td style="text-align:center">${gecerlilik}</td></tr>`;
    });

    html += `</tbody></table><div class="mudur-imza"><div style="height:50px"></div><div class="ad-soyad">${mudur.ad_soyad}</div><div class="unvan">${mudur.gorev}</div></div></body></html>`;
    return html;
  } catch (error) {
    console.error("❌ Pasaport listesi oluşturma hatası:", error);
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Pasaport Listesi</title><style>body{font-family:"Times New Roman",Times,serif;margin:20px;color:#000;text-align:center;padding-top:100px}</style></head><body><h2>Pasaport bilgileri yüklenirken hata oluştu.</h2></body></html>`;
  }
}
// ==========================================
// UÇUŞ MANİFESTOSU RAPORU
// ==========================================
async function generateUcusManifestosu() {
  console.log("🔄 Uçuş manifestosu oluşturuluyor...");

  try {
    const ucusResult = await window.electronAPI.dbQuery(
      `SELECT * FROM gezi_ulasim WHERE gezi_id = ? AND ulasim_tipi = 'ucak' ORDER BY kalkis_tarihi, kalkis_saati`,
      [currentGeziId]
    );

    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev FROM ogretmenler WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili') AND durum = 1 LIMIT 1`
    );

    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : { ad_soyad: "___________________", gorev: "Okul Müdürü" };

    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    if (
      !ucusResult.success ||
      !ucusResult.data ||
      ucusResult.data.length === 0
    ) {
      return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Uçuş Manifestosu</title><style>body{font-family:"Times New Roman",Times,serif;margin:20px;color:#000;text-align:center;padding-top:100px}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}@media print{.btn-container{display:none!important}}</style></head><body><div class="btn-container"><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><h2>Bu gezi için uçuş bilgisi girilmemiştir.</h2></body></html>`;
    }

    const katilimcilar = await loadAllKatilimcilar();

    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Uçuş Manifestosu</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:10pt;line-height:1.4;color:#000;background:#fff;padding:15mm}@page{size:A4 portrait;margin:15mm}@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}th{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.flight-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-print{background:linear-gradient(135deg,#10b981 0%,#059669 100%)}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}.header{text-align:center;margin-bottom:20px}.header h2{font-size:14pt;font-weight:bold;margin:5px 0}.tarih{text-align:right;margin-bottom:15px;font-weight:bold;font-size:10pt}.flight-section{margin-bottom:30px;page-break-inside:avoid}.flight-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:12px;border-radius:8px 8px 0 0;font-weight:bold;font-size:11pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}.flight-info{background:#f0f4ff;padding:10px;border:2px solid #667eea;border-top:none;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:9pt}.info-item{display:flex;flex-direction:column}.info-label{font-weight:bold;color:#4c51bf;font-size:8pt}.info-value{margin-top:2px;font-size:9pt}table{width:100%;border-collapse:collapse;margin-top:15px;font-size:9pt}table,th,td{border:1px solid #000}th,td{padding:6px;text-align:left}th{background-color:#e3f2fd;font-weight:bold;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:8pt;font-weight:bold}.badge-kafile{background:#fef3c7;color:#92400e}.badge-ogretmen{background:#dbeafe;color:#1e40af}.badge-ogrenci{background:#dcfce7;color:#166534}.badge-misafir{background:#f3e8ff;color:#6b21a8}.mudur-imza{text-align:center;margin-top:40px}.mudur-imza .ad-soyad{font-size:11pt;font-weight:bold;margin-bottom:5px}.mudur-imza .unvan{font-size:10pt}.summary-box{background:#f9fafb;border:2px solid #e5e7eb;border-radius:8px;padding:10px;margin-top:15px;display:flex;justify-content:space-around;font-size:9pt}.summary-item{text-align:center}.summary-label{font-weight:bold;color:#6b7280;font-size:8pt}.summary-value{font-size:14pt;font-weight:bold;color:#1f2937;margin-top:3px}</style></head><body><div class="btn-container no-print"><button class="btn btn-print" onclick="window.print()">📄 YAZDIR / PDF</button><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><div class="header"><h2>${okulAdi}</h2><h2>✈️ UÇUŞ MANİFESTOSU</h2></div><div class="tarih">Tarih: ${tarih}</div>`;

    ucusResult.data.forEach((ucus, index) => {
      const kalkisTarih = ucus.kalkis_tarihi
        ? formatDate(ucus.kalkis_tarihi)
        : "-";
      const varisTarih = ucus.varis_tarihi
        ? formatDate(ucus.varis_tarihi)
        : "-";

      html += `<div class="flight-section"><div class="flight-header">✈️ UÇUŞ ${
        index + 1
      }: ${ucus.kalkis_yeri || "?"} → ${
        ucus.varis_yeri || "?"
      }</div><div class="flight-info"><div class="info-item"><span class="info-label">Havayolu</span><span class="info-value">${
        ucus.firma_adi || "-"
      }</span></div><div class="info-item"><span class="info-label">Sefer No</span><span class="info-value">${
        ucus.sefer_no || "-"
      }</span></div><div class="info-item"><span class="info-label">PNR Kodu</span><span class="info-value">${
        ucus.pnr_kodu || "-"
      }</span></div><div class="info-item"><span class="info-label">Kalkış</span><span class="info-value">${kalkisTarih} ${
        ucus.kalkis_saati || ""
      }</span></div><div class="info-item"><span class="info-label">Varış</span><span class="info-value">${varisTarih} ${
        ucus.varis_saati || ""
      }</span></div><div class="info-item"><span class="info-label">Ücret</span><span class="info-value">${
        ucus.ucret ? ucus.ucret + " TL" : "-"
      }</span></div></div><table><thead><tr><th style="width:7%;white-space:nowrap;">Sıra No</th><th style="width:35%">Adı Soyadı</th><th style="width:15%">Tipi</th><th style="width:18%">TC Kimlik No</th><th style="width:15%">Pasaport No</th><th style="width:10%">Cinsiyet</th></tr></thead><tbody>`;

      let siraNo = 1;

      // ✅ KAFİLE BAŞKANI (PASAPORT DAHİL)
      if (katilimcilar.kafile && katilimcilar.kafile.length > 0) {
        katilimcilar.kafile.forEach((k) => {
          const pasaportNo =
            k.pasaport_seri && k.pasaport_no
              ? `${k.pasaport_seri}${k.pasaport_no}`
              : "-";
          html += `<tr><td style="text-align:center">${siraNo++}</td><td>${
            k.ad_soyad
          }</td><td style="text-align:center"><span class="badge badge-kafile">👑 Kafile Başkanı</span></td><td style="text-align:center">${
            k.tc_no || "-"
          }</td><td style="text-align:center">${pasaportNo}</td><td style="text-align:center">-</td></tr>`;
        });
      }

      // ✅ ÖĞRETMENLER (PASAPORT DAHİL)
      if (katilimcilar.ogretmen && katilimcilar.ogretmen.length > 0) {
        katilimcilar.ogretmen.forEach((o) => {
          const pasaportNo =
            o.pasaport_seri && o.pasaport_no
              ? `${o.pasaport_seri}${o.pasaport_no}`
              : "-";
          html += `<tr><td style="text-align:center">${siraNo++}</td><td>${
            o.ad_soyad
          }</td><td style="text-align:center"><span class="badge badge-ogretmen">👨‍🏫 Öğretmen</span></td><td style="text-align:center">${
            o.tc_no || "-"
          }</td><td style="text-align:center">${pasaportNo}</td><td style="text-align:center">-</td></tr>`;
        });
      }

      // ✅ ÖĞRENCİLER (PASAPORT DAHİL)
      if (katilimcilar.ogrenci && katilimcilar.ogrenci.length > 0) {
        katilimcilar.ogrenci.forEach((ogr) => {
          const cinsiyet =
            ogr.cinsiyet === "K" || ogr.cinsiyet === "Kız" ? "K" : "E";
          const pasaportNo =
            ogr.pasaport_seri && ogr.pasaport_no
              ? `${ogr.pasaport_seri}${ogr.pasaport_no}`
              : "-";
          html += `<tr><td style="text-align:center">${siraNo++}</td><td>${
            ogr.ad_soyad
          }</td><td style="text-align:center"><span class="badge badge-ogrenci">👨‍🎓 Öğrenci</span></td><td style="text-align:center">${
            ogr.tc_no || "-"
          }</td><td style="text-align:center">${pasaportNo}</td><td style="text-align:center">${cinsiyet}</td></tr>`;
        });
      }

      // ✅ MİSAFİRLER (PASAPORT DAHİL)
      if (katilimcilar.misafir && katilimcilar.misafir.length > 0) {
        katilimcilar.misafir.forEach((m) => {
          const cinsiyet =
            m.cinsiyet === "K" || m.cinsiyet === "Kadın" ? "K" : "E";
          const pasaportNo =
            m.pasaport_seri && m.pasaport_no
              ? `${m.pasaport_seri}${m.pasaport_no}`
              : "-";
          html += `<tr><td style="text-align:center">${siraNo++}</td><td>${
            m.ad_soyad
          }</td><td style="text-align:center"><span class="badge badge-misafir">👥 Misafir</span></td><td style="text-align:center">${
            m.tc_no || "-"
          }</td><td style="text-align:center">${pasaportNo}</td><td style="text-align:center">${cinsiyet}</td></tr>`;
        });
      }

      const toplamYolcu = siraNo - 1;
      html += `</tbody></table><div class="summary-box"><div class="summary-item"><div class="summary-label">TOPLAM YOLCU</div><div class="summary-value">${toplamYolcu}</div></div><div class="summary-item"><div class="summary-label">KADIN</div><div class="summary-value">${
        katilimcilar.ogrenci.filter(
          (o) => o.cinsiyet === "K" || o.cinsiyet === "Kız"
        ).length + katilimcilar.misafir.filter((m) => m.cinsiyet === "K").length
      }</div></div><div class="summary-item"><div class="summary-label">ERKEK</div><div class="summary-value">${
        katilimcilar.ogrenci.filter(
          (o) => o.cinsiyet === "E" || o.cinsiyet === "Erkek"
        ).length +
        katilimcilar.misafir.filter((m) => m.cinsiyet === "E").length +
        (katilimcilar.kafile?.length || 0) +
        (katilimcilar.ogretmen?.length || 0)
      }</div></div></div></div>`;
    });

    html += `<div class="mudur-imza"><div style="height:40px"></div><div class="ad-soyad">${mudur.ad_soyad}</div><div class="unvan">${mudur.gorev}</div></div></body></html>`;
    return html;
  } catch (error) {
    console.error("❌ Uçuş manifestosu oluşturma hatası:", error);
    throw error;
  }
}
// ==========================================
// TÜM KATILIMCILARI YÜKLE (PASAPORT DAHİL)
// ==========================================
async function loadAllKatilimcilar() {
  const result = { kafile: [], ogretmen: [], ogrenci: [], misafir: [] };

  try {
    // Kafile başkanı
    const kafileResult = await window.electronAPI.dbQuery(
      `SELECT o.ad_soyad, o.tc_no, p.pasaport_seri, p.pasaport_no
       FROM gezi_kafile_baskanlari gk
       INNER JOIN ogretmenler o ON gk.ogretmen_id = o.id
       LEFT JOIN gezi_pasaportlar p ON p.gezi_id = gk.gezi_id AND p.kisi_tipi = 'kafile_baskani' AND p.kisi_id = o.id
       WHERE gk.gezi_id = ?`,
      [currentGeziId]
    );
    if (kafileResult.success && kafileResult.data)
      result.kafile = kafileResult.data;

    // Öğretmenler
    const ogretmenResult = await window.electronAPI.dbQuery(
      `SELECT o.ad_soyad, o.tc_no, p.pasaport_seri, p.pasaport_no
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       LEFT JOIN gezi_pasaportlar p ON p.gezi_id = go.gezi_id AND p.kisi_tipi = 'ogretmen' AND p.kisi_id = o.id
       WHERE go.gezi_id = ?
       ORDER BY o.ad_soyad`,
      [currentGeziId]
    );
    if (ogretmenResult.success && ogretmenResult.data)
      result.ogretmen = ogretmenResult.data;

    // Öğrenciler
    const ogrenciResult = await window.electronAPI.dbQuery(
      `SELECT o.ad_soyad, o.tc_no, o.cinsiyet, p.pasaport_seri, p.pasaport_no
       FROM gezi_ogrenciler go
       INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
       LEFT JOIN gezi_pasaportlar p ON p.gezi_id = go.gezi_id AND p.kisi_tipi = 'ogrenci' AND p.kisi_id = o.id
       WHERE go.gezi_id = ?
       ORDER BY o.sinif, o.soyad, o.ad`,
      [currentGeziId]
    );
    if (ogrenciResult.success && ogrenciResult.data)
      result.ogrenci = ogrenciResult.data;

    // Misafirler
    const misafirResult = await window.electronAPI.dbQuery(
      `SELECT m.ad_soyad, m.tc_no, m.cinsiyet, p.pasaport_seri, p.pasaport_no
       FROM gezi_misafirler m
       LEFT JOIN gezi_pasaportlar p ON p.gezi_id = m.gezi_id AND p.kisi_tipi = 'misafir' AND p.kisi_id = m.id
       WHERE m.gezi_id = ?
       ORDER BY m.ad_soyad`,
      [currentGeziId]
    );
    if (misafirResult.success && misafirResult.data)
      result.misafir = misafirResult.data;

    return result;
  } catch (error) {
    console.error("❌ Katılımcı yükleme hatası:", error);
    return result;
  }
}

// ==========================================
// KONAKLAMA RAPORU
// ==========================================
async function generateKonaklamaRaporu() {
  console.log("🔄 Konaklama raporu oluşturuluyor...");

  try {
    const konaklamaResult = await window.electronAPI.dbQuery(
      `SELECT * FROM gezi_konaklama WHERE gezi_id = ? ORDER BY giris_tarihi`,
      [currentGeziId]
    );

    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev FROM ogretmenler WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili') AND durum = 1 LIMIT 1`
    );

    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : { ad_soyad: "___________________", gorev: "Okul Müdürü" };
    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    if (
      !konaklamaResult.success ||
      !konaklamaResult.data ||
      konaklamaResult.data.length === 0
    ) {
      return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Konaklama Raporu</title><style>body{font-family:"Times New Roman",Times,serif;margin:20px;color:#000;text-align:center;padding-top:100px}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}@media print{.btn-container{display:none!important}}</style></head><body><div class="btn-container"><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><h2>Bu gezi için konaklama bilgisi girilmemiştir.</h2></body></html>`;
    }

    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Konaklama Raporu</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:10pt;line-height:1.4;color:#000;background:#fff;padding:15mm}@page{size:A4 portrait;margin:15mm}@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}th,.hotel-header{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-print{background:linear-gradient(135deg,#10b981 0%,#059669 100%)}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}.header{text-align:center;margin-bottom:20px}.header h2{font-size:14pt;font-weight:bold;margin:5px 0}.tarih{text-align:right;margin-bottom:15px;font-weight:bold;font-size:10pt}.hotel-section{margin-bottom:30px;page-break-inside:avoid}.hotel-header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:12px;border-radius:8px 8px 0 0;font-weight:bold;font-size:11pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}.hotel-info{background:#fffbeb;padding:10px;border:2px solid #f59e0b;border-top:none;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:9pt}.info-item{display:flex;flex-direction:column}.info-label{font-weight:bold;color:#92400e;font-size:8pt}.info-value{margin-top:2px;font-size:9pt}.mudur-imza{text-align:center;margin-top:40px}.mudur-imza .ad-soyad{font-size:11pt;font-weight:bold;margin-bottom:5px}.mudur-imza .unvan{font-size:10pt}</style></head><body><div class="btn-container no-print"><button class="btn btn-print" onclick="window.print()">📄 YAZDIR / PDF</button><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><div class="header"><h2>${okulAdi}</h2><h2>🏨 KONAKLAMA RAPORU</h2></div><div class="tarih">Tarih: ${tarih}</div>`;

    konaklamaResult.data.forEach((otel, index) => {
      const girisTarih = otel.giris_tarihi
        ? formatDate(otel.giris_tarihi)
        : "-";
      const cikisTarih = otel.cikis_tarihi
        ? formatDate(otel.cikis_tarihi)
        : "-";

      html += `<div class="hotel-section"><div class="hotel-header">🏨 OTEL ${
        index + 1
      }: ${
        otel.otel_adi || "Bilinmiyor"
      }</div><div class="hotel-info"><div class="info-item"><span class="info-label">Adres</span><span class="info-value">${
        otel.adres || "-"
      }</span></div><div class="info-item"><span class="info-label">Telefon</span><span class="info-value">${
        otel.telefon || "-"
      }</span></div><div class="info-item"><span class="info-label">Oda Sayısı</span><span class="info-value">${
        otel.oda_sayisi || "-"
      }</span></div><div class="info-item"><span class="info-label">Giriş Tarihi</span><span class="info-value">${girisTarih}</span></div><div class="info-item"><span class="info-label">Çıkış Tarihi</span><span class="info-value">${cikisTarih}</span></div><div class="info-item"><span class="info-label">Ücret</span><span class="info-value">${
        otel.ucret ? otel.ucret + " TL" : "-"
      }</span></div></div></div>`;
    });

    html += `<div class="mudur-imza"><div style="height:40px"></div><div class="ad-soyad">${mudur.ad_soyad}</div><div class="unvan">${mudur.gorev}</div></div></body></html>`;
    return html;
  } catch (error) {
    console.error("❌ Konaklama raporu hatası:", error);
    throw error;
  }
}

// ==========================================
// ÖDEME RAPORU
// ==========================================
async function generateOdemeRaporu() {
  console.log("🔄 Ödeme raporu oluşturuluyor...");

  try {
    const odemeResult = await window.electronAPI.dbQuery(
      `SELECT ku.ad_soyad, ku.kisi_tipi, ku.toplam_ucret, ku.toplam_odenen, ku.kalan_borc, COUNT(o.id) as toplam_taksit, SUM(CASE WHEN o.odeme_durumu = 'odendi' THEN 1 ELSE 0 END) as odenen_taksit FROM gezi_katilimci_ucretler ku LEFT JOIN gezi_odemeler o ON ku.id = o.katilimci_ucret_id WHERE ku.gezi_id = ? GROUP BY ku.id ORDER BY ku.kisi_tipi, ku.ad_soyad`,
      [currentGeziId]
    );

    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev FROM ogretmenler WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili') AND durum = 1 LIMIT 1`
    );

    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : { ad_soyad: "___________________", gorev: "Okul Müdürü" };
    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    if (
      !odemeResult.success ||
      !odemeResult.data ||
      odemeResult.data.length === 0
    ) {
      return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Ödeme Raporu</title><style>body{font-family:"Times New Roman",Times,serif;margin:20px;color:#000;text-align:center;padding-top:100px}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}@media print{.btn-container{display:none!important}}</style></head><body><div class="btn-container"><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><h2>Bu gezi için ödeme bilgisi girilmemiştir.</h2></body></html>`;
    }

    let toplamUcret = 0,
      toplamOdenen = 0,
      toplamBorc = 0;
    odemeResult.data.forEach((k) => {
      toplamUcret += k.toplam_ucret || 0;
      toplamOdenen += k.toplam_odenen || 0;
      toplamBorc += k.kalan_borc || 0;
    });

    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Ödeme Raporu</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:10pt;line-height:1.4;color:#000;background:#fff;padding:15mm}@page{size:A4 portrait;margin:15mm}@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}th{background-color:#e3f2fd!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-print{background:linear-gradient(135deg,#10b981 0%,#059669 100%)}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}.header{text-align:center;margin-bottom:20px}.header h2{font-size:14pt;font-weight:bold;margin:5px 0}.tarih{text-align:right;margin-bottom:15px;font-weight:bold;font-size:10pt}table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:9pt}table,th,td{border:1px solid #000}th,td{padding:6px;text-align:left}th{background-color:#e3f2fd;font-weight:bold;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}.summary-box{background:#dcfce7;border:2px solid #22c55e;border-radius:8px;padding:15px;margin:20px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.summary-item{text-align:center}.summary-label{font-weight:bold;color:#166534;font-size:9pt}.summary-value{font-size:16pt;font-weight:bold;color:#166534;margin-top:5px}.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:8pt;font-weight:bold}.badge-odendi{background:#dcfce7;color:#166534}.badge-bekliyor{background:#fef3c7;color:#92400e}.badge-gecikti{background:#fee2e2;color:#991b1b}.mudur-imza{text-align:center;margin-top:40px}.mudur-imza .ad-soyad{font-size:11pt;font-weight:bold;margin-bottom:5px}.mudur-imza .unvan{font-size:10pt}</style></head><body><div class="btn-container no-print"><button class="btn btn-print" onclick="window.print()">📄 YAZDIR / PDF</button><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><div class="header"><h2>${okulAdi}</h2><h2>💰 ÖDEME RAPORU</h2></div><div class="tarih">Tarih: ${tarih}</div><div class="summary-box"><div class="summary-item"><div class="summary-label">TOPLAM ÜCRET</div><div class="summary-value">${toplamUcret.toFixed(
      2
    )} ₺</div></div><div class="summary-item"><div class="summary-label">TOPLAM ÖDENEN</div><div class="summary-value">${toplamOdenen.toFixed(
      2
    )} ₺</div></div><div class="summary-item"><div class="summary-label">KALAN BORÇ</div><div class="summary-value">${toplamBorc.toFixed(
      2
    )} ₺</div></div></div><table><thead><tr><th style="width:7%;white-space:nowrap;">Sıra No</th><th style="width:30%">Adı Soyadı</th><th style="width:12%">Tipi</th><th style="width:15%">Toplam Ücret</th><th style="width:15%">Ödenen</th><th style="width:15%">Kalan</th><th style="width:6%">Durum</th></tr></thead><tbody>`;

    odemeResult.data.forEach((k, index) => {
      const kisiTipi =
        k.kisi_tipi === "kafile_baskani"
          ? "Kafile Başkanı"
          : k.kisi_tipi === "ogretmen"
          ? "Öğretmen"
          : k.kisi_tipi === "ogrenci"
          ? "Öğrenci"
          : "Misafir";
      const durum =
        k.kalan_borc === 0
          ? '<span class="badge badge-odendi">✓ Ödendi</span>'
          : k.toplam_odenen > 0
          ? '<span class="badge badge-bekliyor">⏳ Devam</span>'
          : '<span class="badge badge-gecikti">✗ Bekliyor</span>';

      html += `<tr><td style="text-align:center">${index + 1}</td><td>${
        k.ad_soyad
      }</td><td style="text-align:center">${kisiTipi}</td><td style="text-align:right">${(
        k.toplam_ucret || 0
      ).toFixed(2)} ₺</td><td style="text-align:right">${(
        k.toplam_odenen || 0
      ).toFixed(2)} ₺</td><td style="text-align:right">${(
        k.kalan_borc || 0
      ).toFixed(2)} ₺</td><td style="text-align:center">${durum}</td></tr>`;
    });

    html += `</tbody></table><div class="mudur-imza"><div style="height:40px"></div><div class="ad-soyad">${mudur.ad_soyad}</div><div class="unvan">${mudur.gorev}</div></div></body></html>`;
    return html;
  } catch (error) {
    console.error("❌ Ödeme raporu hatası:", error);
    throw error;
  }
}

// ==========================================
// MALİYET ANALİZİ RAPORU
// ==========================================
async function generateMaliyetAnalizi() {
  console.log("🔄 Maliyet analizi oluşturuluyor...");

  try {
    // ============================================
    // 1. GELİR - KATILIMCI ÜCRETLERİ
    // ============================================
    const gelirResult = await window.electronAPI.dbQuery(
      `SELECT 
        SUM(toplam_ucret) as toplam_gelir,
        SUM(toplam_odenen) as toplam_tahsilat,
        SUM(kalan_borc) as toplam_borc,
        COUNT(*) as katilimci_sayisi
       FROM gezi_katilimci_ucretler
       WHERE gezi_id = ?`,
      [currentGeziId]
    );

    const gelir =
      gelirResult.data && gelirResult.data.length > 0
        ? gelirResult.data[0]
        : {
            toplam_gelir: 0,
            toplam_tahsilat: 0,
            toplam_borc: 0,
            katilimci_sayisi: 0,
          };

    // ============================================
    // 2. GİDER - ULAŞIM
    // ============================================
    const ulasimResult = await window.electronAPI.dbQuery(
      `SELECT SUM(ucret) as toplam_ulasim FROM gezi_ulasim WHERE gezi_id = ?`,
      [currentGeziId]
    );
    const ulasimGider =
      (ulasimResult.data && ulasimResult.data[0]?.toplam_ulasim) || 0;

    // ============================================
    // 3. GİDER - KONAKLAMA
    // ============================================
    const konaklamaResult = await window.electronAPI.dbQuery(
      `SELECT SUM(ucret) as toplam_konaklama FROM gezi_konaklama WHERE gezi_id = ?`,
      [currentGeziId]
    );
    const konaklamaGider =
      (konaklamaResult.data && konaklamaResult.data[0]?.toplam_konaklama) || 0;

    // ============================================
    // 4. GİDER - FİRMA
    // ============================================
    const firmaResult = await window.electronAPI.dbQuery(
      `SELECT toplam_bedel FROM gezi_tur_firma WHERE gezi_id = ? LIMIT 1`,
      [currentGeziId]
    );
    const firmaGider =
      (firmaResult.data && firmaResult.data[0]?.toplam_bedel) || 0;

    // ============================================
    // 5. TOPLAM GİDER VE KAR/ZARAR
    // ============================================
    const toplamGider = ulasimGider + konaklamaGider + firmaGider;
    const karZarar = gelir.toplam_gelir - toplamGider;
    const tahsilatOrani =
      gelir.toplam_gelir > 0
        ? ((gelir.toplam_tahsilat / gelir.toplam_gelir) * 100).toFixed(1)
        : 0;

    // ============================================
    // 6. OKUL MÜDÜRÜ
    // ============================================
    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev FROM ogretmenler WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili') AND durum = 1 LIMIT 1`
    );
    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : { ad_soyad: "___________________", gorev: "Okul Müdürü" };

    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    // ============================================
    // 7. HTML OLUŞTUR
    // ============================================
    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maliyet Analizi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.4; color: #000; background: #fff; padding: 20mm; }
    @page { size: A4 portrait; margin: 20mm; }
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .summary-card, .detail-card { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    .btn-container { position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; gap: 10px; }
    .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; color: white; }
    .btn-print { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .btn-close { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .header { text-align: center; margin-bottom: 20px; }
    .header h2 { font-size: 14pt; font-weight: bold; margin: 5px 0; }
    .tarih { text-align: right; margin-bottom: 20px; font-weight: bold; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .summary-card.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .summary-card.red { background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%); }
    .summary-card.yellow { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .summary-label { font-size: 10pt; opacity: 0.9; margin-bottom: 8px; }
    .summary-value { font-size: 24pt; font-weight: bold; }
    .detail-section { margin-bottom: 30px; }
    .detail-card { background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .detail-header { font-size: 12pt; font-weight: bold; color: #374151; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: bold; color: #1f2937; }
    .kar-zarar-box { background: ${
      karZarar >= 0 ? "#dcfce7" : "#fee2e2"
    }; border: 3px solid ${
      karZarar >= 0 ? "#22c55e" : "#ef4444"
    }; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .kar-zarar-label { font-size: 14pt; font-weight: bold; color: ${
      karZarar >= 0 ? "#166534" : "#991b1b"
    }; margin-bottom: 10px; }
    .kar-zarar-value { font-size: 32pt; font-weight: bold; color: ${
      karZarar >= 0 ? "#166534" : "#991b1b"
    }; }
    .progress-bar { background: #e5e7eb; border-radius: 8px; height: 20px; overflow: hidden; margin-top: 5px; }
    .progress-fill { background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 9pt; font-weight: bold; }
    .mudur-imza { text-align: center; margin-top: 40px; }
    .mudur-imza .ad-soyad { font-size: 12pt; font-weight: bold; margin-bottom: 5px; }
    .mudur-imza .unvan { font-size: 11pt; }
  </style>
</head>
<body>
  <div class="btn-container no-print">
    <button class="btn btn-print" onclick="window.print()">📄 YAZDIR / PDF</button>
    <button class="btn btn-close" onclick="window.close()">✖ KAPAT</button>
  </div>

  <div class="header">
    <h2>${okulAdi}</h2>
    <h2>💰 MALİYET ANALİZİ RAPORU</h2>
  </div>

  <div class="tarih">Tarih: ${tarih}</div>

  <!-- ÖZET KARTLAR -->
  <div class="summary-grid">
    <div class="summary-card green">
      <div class="summary-label">TOPLAM GELİR</div>
      <div class="summary-value">${gelir.toplam_gelir.toFixed(2)} ₺</div>
    </div>
    <div class="summary-card red">
      <div class="summary-label">TOPLAM GİDER</div>
      <div class="summary-value">${toplamGider.toFixed(2)} ₺</div>
    </div>
    <div class="summary-card yellow">
      <div class="summary-label">TAHSİLAT ORANI</div>
      <div class="summary-value">${tahsilatOrani}%</div>
    </div>
  </div>

  <!-- KAR/ZARAR -->
  <div class="kar-zarar-box">
    <div class="kar-zarar-label">${
      karZarar >= 0 ? "✓ NET KAR" : "✗ NET ZARAR"
    }</div>
    <div class="kar-zarar-value">${Math.abs(karZarar).toFixed(2)} ₺</div>
  </div>

  <!-- GELİR DETAYI -->
  <div class="detail-section">
    <div class="detail-card">
      <div class="detail-header">
        <span>💵</span>
        <span>GELİR DETAYI</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Katılımcı Sayısı</span>
        <span class="detail-value">${gelir.katilimci_sayisi} Kişi</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Toplam Beklenen Gelir</span>
        <span class="detail-value">${gelir.toplam_gelir.toFixed(2)} ₺</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Toplam Tahsilat</span>
        <span class="detail-value" style="color: #059669;">${gelir.toplam_tahsilat.toFixed(
          2
        )} ₺</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Kalan Borç</span>
        <span class="detail-value" style="color: #dc2626;">${gelir.toplam_borc.toFixed(
          2
        )} ₺</span>
      </div>
      <div style="margin-top: 10px;">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${tahsilatOrani}%">${tahsilatOrani}% Tahsil Edildi</div>
        </div>
      </div>
    </div>
  </div>

  <!-- GİDER DETAYI -->
  <div class="detail-section">
    <div class="detail-card">
      <div class="detail-header">
        <span>💸</span>
        <span>GİDER DETAYI</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Ulaşım Gideri</span>
        <span class="detail-value">${ulasimGider.toFixed(2)} ₺</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Konaklama Gideri</span>
        <span class="detail-value">${konaklamaGider.toFixed(2)} ₺</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Tur Firması Gideri</span>
        <span class="detail-value">${firmaGider.toFixed(2)} ₺</span>
      </div>
      <div class="detail-row" style="border-top: 2px solid #374151; margin-top: 10px; padding-top: 10px;">
        <span class="detail-label" style="font-weight: bold; font-size: 12pt;">TOPLAM GİDER</span>
        <span class="detail-value" style="font-size: 14pt; color: #dc2626;">${toplamGider.toFixed(
          2
        )} ₺</span>
      </div>
    </div>
  </div>

  <!-- MÜDÜR İMZA -->
  <div class="mudur-imza">
    <div style="height: 40px"></div>
    <div class="ad-soyad">${mudur.ad_soyad}</div>
    <div class="unvan">${mudur.gorev}</div>
  </div>

</body>
</html>`;

    return html;
  } catch (error) {
    console.error("❌ Maliyet analizi hatası:", error);
    throw error;
  }
}

// ==========================================
// ARAÇ DAĞILIMI RAPORU
// ==========================================
async function generateAracDagilimi() {
  console.log("🔄 Araç dağılımı raporu oluşturuluyor...");

  try {
    // ============================================
    // 1. ARAÇ BİLGİLERİNİ ÇEK
    // ============================================
    const aracResult = await window.electronAPI.dbQuery(
      `SELECT * FROM gezi_araclar WHERE gezi_id = ? ORDER BY id`,
      [currentGeziId]
    );

    // ============================================
    // 2. TOPLAM KATILIMCI SAYISI
    // ============================================
    const katilimciResult = await window.electronAPI.dbQuery(
      `SELECT 
        (SELECT COUNT(*) FROM gezi_kafile_baskanlari WHERE gezi_id = ?) +
        (SELECT COUNT(*) FROM gezi_ogretmenler WHERE gezi_id = ?) +
        (SELECT COUNT(*) FROM gezi_ogrenciler WHERE gezi_id = ?) +
        (SELECT COUNT(*) FROM gezi_misafirler WHERE gezi_id = ?) as toplam`,
      [currentGeziId, currentGeziId, currentGeziId, currentGeziId]
    );

    const toplamKatilimci =
      (katilimciResult.data && katilimciResult.data[0]?.toplam) || 0;

    // ============================================
    // 3. OKUL MÜDÜRÜ
    // ============================================
    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev FROM ogretmenler WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili') AND durum = 1 LIMIT 1`
    );
    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : { ad_soyad: "___________________", gorev: "Okul Müdürü" };

    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    // Araç yoksa
    if (
      !aracResult.success ||
      !aracResult.data ||
      aracResult.data.length === 0
    ) {
      return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Araç Dağılımı</title><style>body{font-family:"Times New Roman",Times,serif;margin:20px;color:#000;text-align:center;padding-top:100px}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}@media print{.btn-container{display:none!important}}</style></head><body><div class="btn-container"><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><h2>Bu gezi için araç bilgisi girilmemiştir.</h2></body></html>`;
    }

    // ============================================
    // 4. TOPLAM KAPASİTE HESAPLA
    // ============================================
    let toplamKapasite = 0;
    for (const arac of aracResult.data) {
      toplamKapasite += arac.kapasite || 0;
    }

    const kapasiteDurum =
      toplamKapasite >= toplamKatilimci
        ? { renk: "#22c55e", mesaj: "✓ Yeterli Kapasite", ikon: "✓" }
        : { renk: "#ef4444", mesaj: "✗ Yetersiz Kapasite", ikon: "✗" };

    // ============================================
    // 5. HTML OLUŞTUR
    // ============================================
    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Araç Dağılımı</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:11pt;line-height:1.4;color:#000;background:#fff;padding:20mm}@page{size:A4 portrait;margin:20mm}@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}.arac-card{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}.btn-container{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px}.btn{padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;color:white}.btn-print{background:linear-gradient(135deg,#10b981 0%,#059669 100%)}.btn-close{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)}.header{text-align:center;margin-bottom:20px}.header h2{font-size:14pt;font-weight:bold;margin:5px 0}.tarih{text-align:right;margin-bottom:20px;font-weight:bold}.summary-box{background:#f0f9ff;border:2px solid #3b82f6;border-radius:12px;padding:15px;margin-bottom:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.summary-item{text-align:center}.summary-label{font-size:9pt;color:#1e40af;font-weight:bold;margin-bottom:5px}.summary-value{font-size:18pt;font-weight:bold;color:#1e3a8a}.kapasite-box{background:${kapasiteDurum.renk};color:white;padding:12px;border-radius:8px;text-align:center;font-weight:bold;margin-bottom:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.arac-card{background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;padding:15px;margin-bottom:20px;page-break-inside:avoid}.arac-header{background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);color:white;padding:10px 15px;border-radius:8px;font-weight:bold;font-size:11pt;margin-bottom:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.arac-info{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px}.info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e5e7eb}.info-label{color:#6b7280;font-size:9pt}.info-value{font-weight:bold;color:#1f2937;font-size:9pt}.sofor-section{background:#fffbeb;border:1px solid #fbbf24;border-radius:6px;padding:10px;margin-top:10px}.sofor-title{font-weight:bold;color:#92400e;margin-bottom:8px;font-size:10pt}.mudur-imza{text-align:center;margin-top:40px}.mudur-imza .ad-soyad{font-size:12pt;font-weight:bold;margin-bottom:5px}.mudur-imza .unvan{font-size:11pt}</style></head><body><div class="btn-container no-print"><button class="btn btn-print" onclick="window.print()">📄 YAZDIR / PDF</button><button class="btn btn-close" onclick="window.close()">✖ KAPAT</button></div><div class="header"><h2>${okulAdi}</h2><h2>🚌 ARAÇ DAĞILIMI RAPORU</h2></div><div class="tarih">Tarih: ${tarih}</div><div class="summary-box"><div class="summary-item"><div class="summary-label">TOPLAM ARAÇ</div><div class="summary-value">${aracResult.data.length}</div></div><div class="summary-item"><div class="summary-label">TOPLAM KAPASİTE</div><div class="summary-value">${toplamKapasite}</div></div><div class="summary-item"><div class="summary-label">KATILIMCI</div><div class="summary-value">${toplamKatilimci}</div></div></div><div class="kapasite-box">${kapasiteDurum.ikon} ${kapasiteDurum.mesaj}: ${toplamKapasite} Koltuk / ${toplamKatilimci} Kişi</div>`;

    // Her araç için kart
    for (let i = 0; i < aracResult.data.length; i++) {
      const arac = aracResult.data[i];

      // Şoförleri çek
      const soforResult = await window.electronAPI.dbQuery(
        `SELECT * FROM gezi_arac_soforler WHERE arac_id = ? ORDER BY id`,
        [arac.id]
      );
      const soforler = soforResult.data || [];

      html += `<div class="arac-card"><div class="arac-header">🚌 ARAÇ ${
        i + 1
      }: ${
        arac.plaka || "Bilinmiyor"
      }</div><div class="arac-info"><div class="info-row"><span class="info-label">Model</span><span class="info-value">${
        arac.arac_modeli || "-"
      }</span></div><div class="info-row"><span class="info-label">Kapasite</span><span class="info-value">${
        arac.kapasite || "-"
      } Kişi</span></div><div class="info-row"><span class="info-label">Trafiğe Çıkış</span><span class="info-value">${
        arac.trafige_cikis_tarihi ? formatDate(arac.trafige_cikis_tarihi) : "-"
      }</span></div><div class="info-row"><span class="info-label">Son Muayene</span><span class="info-value">${
        arac.son_muayene_tarihi ? formatDate(arac.son_muayene_tarihi) : "-"
      }</span></div></div>`;

      // Şoför bilgileri
      if (soforler.length > 0) {
        html += `<div class="sofor-section"><div class="sofor-title">👤 ŞOFÖR BİLGİLERİ</div>`;
        soforler.forEach((sofor, idx) => {
          html += `<div class="info-row"><span class="info-label">${
            idx + 1
          }. Şoför</span><span class="info-value">${sofor.ad_soyad || "-"} (${
            sofor.tc_no || "-"
          })</span></div>`;
        });
        html += `</div>`;
      }

      html += `</div>`;
    }

    html += `<div class="mudur-imza"><div style="height:40px"></div><div class="ad-soyad">${mudur.ad_soyad}</div><div class="unvan">${mudur.gorev}</div></div></body></html>`;

    return html;
  } catch (error) {
    console.error("❌ Araç dağılımı raporu hatası:", error);
    throw error;
  }
}
// ==========================================
// GÜNLÜK PROGRAM
// ==========================================

async function generateGunlukProgram() {
  try {
    console.log("📅 Günlük program oluşturuluyor...");

    // geziData kontrolü
    if (!geziData) {
      return `<!DOCTYPE html><html><body><h2>Hata: Gezi bilgileri bulunamadı</h2></body></html>`;
    }

    // Gezi bilgilerini hazırla
    const geziAdi = geziData.gezi_adi || "-";
    const geziTarihi = geziData.gezi_tarihi
      ? formatDate(geziData.gezi_tarihi)
      : "-";
    const donusTarihi = geziData.donus_tarihi
      ? formatDate(geziData.donus_tarihi)
      : "-";

    // HTML oluştur (inline)
    const html = `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <title>${geziAdi} - Günlük Program</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: "Times New Roman", serif;
        font-size: 11pt;
        line-height: 1.3;
        margin: 0;
        padding: 20mm;
        color: #000;
        background: white;
      }

      .header {
        text-align: center;
        margin-bottom: 20px;
      }

      .header h2 {
        margin: 10px 0;
        color: #000;
        font-size: 18pt;
        font-weight: bold;
      }

      .header p {
        margin: 5px 0;
        font-size: 12pt;
        color: #333;
      }

      .gezi-bilgi-tablo {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }

      .gezi-bilgi-tablo td {
        border: 1px solid #000;
        padding: 8px;
        color: #000;
        font-size: 11pt;
      }

      .gezi-bilgi-tablo .label {
        font-weight: bold;
        width: 200px;
        background: #b3d9ff;
      }

      .gun-secim {
        margin: 20px 0;
        text-align: center;
      }

      .gun-secim label {
        font-weight: bold;
        margin-right: 10px;
        font-size: 12pt;
      }

      .gun-secim select {
        padding: 8px 12px;
        font-size: 11pt;
        border: 2px solid #000;
        border-radius: 4px;
        cursor: pointer;
      }

      table.program-tablo {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }

      .program-tablo th,
      .program-tablo td {
        border: 1px solid #000;
        padding: 10px;
        color: #000;
        font-size: 10pt;
        vertical-align: top;
      }

      .program-tablo th {
        background: #d9d9d9;
        font-weight: bold;
        text-align: center;
        color: #000;
      }

      .program-tablo .gun-cell {
        background: #b3d9ff;
        font-weight: bold;
        text-align: center;
        width: 15%;
      }

      .program-tablo .saat-cell {
        width: 20%;
        text-align: center;
      }

      .editable {
        background: #ffffcc !important;
        cursor: text !important;
        min-height: 60px;
        position: relative;
      }

      .editable:hover {
        background: #ffff99 !important;
        outline: 2px solid #ffd700;
      }

      .editable:focus {
        background: #ffeb3b !important;
        outline: 2px solid #ff9800;
      }

      .editable:empty:before {
        content: "Tıklayarak düzenleyin...";
        color: #999;
        font-style: italic;
      }

      .footer-text {
        margin-top: 30px;
        font-size: 11pt;
        color: #000;
        line-height: 1.5;
        text-align: center;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 15mm;
        }

        body {
          margin: 0;
          padding: 0;
        }

        .editable {
          background: white !important;
          outline: none !important;
          cursor: default !important;
        }

        .editable:empty:before {
          content: "";
        }

        .no-print {
          display: none !important;
        }

        .gezi-bilgi-tablo .label {
          background: #e0e0e0 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .program-tablo th {
          background: #e0e0e0 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .program-tablo .gun-cell {
          background: #d9d9d9 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }

      .top-buttons {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 15px;
        text-align: center;
        margin: -20mm -20mm 20px -20mm;
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .top-buttons button {
        padding: 12px 24px;
        border: none;
        cursor: pointer;
        font-size: 15px;
        font-weight: 700;
        border-radius: 8px;
        margin: 0 8px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .btn-pdf {
        background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
        color: white;
      }

      .btn-pdf:hover {
        background: linear-gradient(135deg, #229954 0%, #1e8449 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(39, 174, 96, 0.4);
      }

      .btn-close {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
      }

      .btn-close:hover {
        background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(231, 76, 60, 0.4);
      }
    </style>
  </head>
  <body>
    <div class="top-buttons no-print">
      <button class="btn-pdf" onclick="window.print()">
        📄 PDF Olarak Kaydet / Yazdır
      </button>
      <button class="btn-close" onclick="window.close()">✖ Kapat</button>
    </div>

    <div class="header">
      <h2>GÜNLÜK GEZİ PROGRAMI</h2>
      <p>${geziAdi}</p>
    </div>

    <table class="gezi-bilgi-tablo">
      <tr>
        <td class="label">Gezi Adı</td>
        <td>${geziAdi}</td>
      </tr>
      <tr>
        <td class="label">Gezi Tarihi</td>
        <td>${geziTarihi}</td>
      </tr>
      <tr>
        <td class="label">Dönüş Tarihi</td>
        <td>${donusTarihi}</td>
      </tr>
    </table>

    <div class="gun-secim no-print">
      <label>📆 Gezi Süresi:</label>
      <select id="gunSayisi" onchange="updateTable()">
        <option value="1">1 Gün</option>
        <option value="2">2 Gün</option>
        <option value="3" selected>3 Gün</option>
        <option value="4">4 Gün</option>
        <option value="5">5 Gün</option>
        <option value="6">6 Gün</option>
        <option value="7">7 Gün</option>
      </select>
    </div>

    <table class="program-tablo">
      <thead>
        <tr>
          <th style="width: 15%">Gün</th>
          <th style="width: 20%">Saat</th>
          <th>Etkinlik / Ziyaret Yeri</th>
        </tr>
      </thead>
      <tbody id="programBody"></tbody>
    </table>

    <div class="footer-text">
      <p>
        <strong>Not:</strong> Bu program tahmini bir plandır, hava şartları ve
        trafik durumuna göre değişiklik gösterebilir.
      </p>
    </div>

    <script>
      function makeEditable(cell, defaultValue) {
        cell.contentEditable = true;
        cell.className = "editable";
        if (defaultValue && defaultValue.trim() !== "") {
          cell.textContent = defaultValue;
        }
        cell.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            this.blur();
            const editables = Array.from(document.querySelectorAll(".editable"));
            const currentIndex = editables.indexOf(this);
            if (currentIndex < editables.length - 1) {
              editables[currentIndex + 1].focus();
            }
          }
        });
        cell.addEventListener("focus", function () {
          const range = document.createRange();
          range.selectNodeContents(this);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
      }

      function updateTable() {
        const gunSayisi = parseInt(document.getElementById("gunSayisi").value);
        const tbody = document.getElementById("programBody");
        let html = "";
        for (let gun = 1; gun <= gunSayisi; gun++) {
          const etkinlikler = [
            { saat: "08:00 - 10:00", placeholder: "Örn: Otelden hareket, kahvaltı" },
            { saat: "10:00 - 13:00", placeholder: "Örn: Anıtkabir ziyareti" },
            { saat: "13:00 - 15:00", placeholder: "Örn: Öğle yemeği, dinlenme" },
            { saat: "15:00 - 18:00", placeholder: "Örn: Müze ziyareti" }
          ];
          etkinlikler.forEach((etk, index) => {
            html += \`<tr>
              \${index === 0 ? \`<td rowspan="4" class="gun-cell">\${gun}. Gün</td>\` : ""}
              <td class="saat-cell" id="saat_\${gun}_\${index}">\${etk.saat}</td>
              <td id="etkinlik_\${gun}_\${index}"></td>
            </tr>\`;
          });
        }
        tbody.innerHTML = html;
        for (let gun = 1; gun <= gunSayisi; gun++) {
          const etkinlikler = [
            { saat: "08:00 - 10:00" },
            { saat: "10:00 - 13:00" },
            { saat: "13:00 - 15:00" },
            { saat: "15:00 - 18:00" }
          ];
          etkinlikler.forEach((etk, index) => {
            const saatCell = document.getElementById(\`saat_\${gun}_\${index}\`);
            const etkinlikCell = document.getElementById(\`etkinlik_\${gun}_\${index}\`);
            makeEditable(saatCell, etk.saat);
            makeEditable(etkinlikCell, "");
          });
        }
      }
      window.addEventListener("DOMContentLoaded", () => { updateTable(); });
    </script>
  </body>
</html>`;

    return html;
  } catch (error) {
    console.error("❌ Günlük program hatası:", error);
    return `<!DOCTYPE html><html><body><h2>Hata: ${error.message}</h2></body></html>`;
  }
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getCurrentDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}_${month}_${year}`;
}

// ==========================================
// KAFİLE BAŞKANLARINI YÜKLE (GÜNCELLEME)
// ==========================================

// loadKatilimcilar fonksiyonunu güncelle - Kafİle başkanlarını da ekle
async function loadKatilimcilarWithKafile() {
  try {
    console.log("🔄 Katılımcılar (Kafİle Başkanı dahil) yükleniyor...");

    // 1. KAFİLE BAŞKANINI YÜKLE
    if (geziData && geziData.kafile_baskani_id) {
      const kafileResult = await window.electronAPI.dbQuery(
        "SELECT id, ad_soyad, tc_no FROM ogretmenler WHERE id = ?",
        [geziData.kafile_baskani_id]
      );

      if (
        kafileResult.success &&
        kafileResult.data &&
        kafileResult.data.length > 0
      ) {
        // Kafİle başkanını öğretmenler listesine ekle (eğer yoksa)
        const kafile = kafileResult.data[0];
        const mevcutMu = katilimcilar.ogretmenler.find(
          (o) => o.id === kafile.id
        );

        if (!mevcutMu) {
          katilimcilar.ogretmenler.unshift({
            ...kafile,
            kafile_baskani: true,
          });
        } else {
          // Mevcut ise işaretle
          mevcutMu.kafile_baskani = true;
        }
      }
    }

    // 2. SORUMLU ÖĞRETMENLERİ YÜKLE
    const ogretmenResult = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad_soyad, o.tc_no
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       WHERE go.gezi_id = ?`,
      [currentGeziId]
    );

    if (ogretmenResult.success && ogretmenResult.data) {
      ogretmenResult.data.forEach((o) => {
        const mevcutMu = katilimcilar.ogretmenler.find(
          (ogr) => ogr.id === o.id
        );
        if (!mevcutMu) {
          katilimcilar.ogretmenler.push(o);
        }
      });
    }

    // 3. ÖĞRENCİLERİ YÜKLE
    const ogrenciResult = await window.electronAPI.dbQuery(
      `SELECT o.id, (o.ad || ' ' || o.soyad) as ad_soyad, o.tc_no, o.sinif
       FROM gezi_ogrenciler go
       INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
       WHERE go.gezi_id = ?`,
      [currentGeziId]
    );

    if (ogrenciResult.success && ogrenciResult.data) {
      katilimcilar.ogrenciler = ogrenciResult.data;
    }

    // 4. MİSAFİRLERİ YÜKLE
    const misafirResult = await window.electronAPI.dbQuery(
      `SELECT id, ad_soyad, tc_no
       FROM gezi_misafirler
       WHERE gezi_id = ?`,
      [currentGeziId]
    );

    if (misafirResult.success && misafirResult.data) {
      katilimcilar.misafirler = misafirResult.data;
    }

    console.log("✅ Tüm katılımcılar yüklendi:", {
      ogretmen: katilimcilar.ogretmenler.length,
      ogrenci: katilimcilar.ogrenciler.length,
      misafir: katilimcilar.misafirler.length,
    });

    await updateKatilimciSayisi();
  } catch (error) {
    console.error("❌ Katılımcı yükleme hatası:", error);
  }
}

// loadKatilimcilar fonksiyonunu değiştir
loadKatilimcilar = loadKatilimcilarWithKafile;

// ==========================================
// GEZİ PLANI EK-1 GÜNCELLE (KAFİLE BAŞKANI EKLE)
// ==========================================

// generateGeziPlaniEk1 fonksiyonundaki öğretmen listesini güncelle
async function generateGeziPlaniEk1Updated() {
  const tarih = getCurrentDate();
  const kaymakamlik = localStorage.getItem("kaymakamlikAdi") || "İSTANBUL";

  const okulAdi = geziData.okul_adi || "Bahçelievler Cumhuriyet Anadolu Lisesi";
  const geziTarihi = `${formatDate(geziData.gezi_tarihi)} ${
    geziData.cikis_saati
  }`;
  const donusTarihi = `${formatDate(geziData.donus_tarihi)} ${
    geziData.donus_saati
  }`;

  // Öğretmen listesi (Kafİle Başkanı işaretli)
  const ogretmenlerHTML = katilimcilar.ogretmenler
    .map(
      (o) => `
    <tr>
      <td>${o.ad_soyad}</td>
      <td>${o.kafile_baskani ? "Kafİle Başkanı" : "Sorumlu Öğretmen"}</td>
      <td style="width: 150px;"></td>
    </tr>
  `
    )
    .join("");

  const toplamKatilimci =
    katilimcilar.ogretmenler.length +
    katilimcilar.ogrenciler.length +
    katilimcilar.misafirler.length;

  // Kafİle başkanının adını al
  const kafileBaskan = katilimcilar.ogretmenler.find((o) => o.kafile_baskani);
  const kafileBaskanAd = kafileBaskan
    ? kafileBaskan.ad_soyad
    : "________________";

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Gezi Planı - ${geziData.gezi_adi}</title>
  <style>
    body { 
      font-family: 'Times New Roman', serif; 
      font-size: 11pt; 
      line-height: 1.3; 
      margin: 20px; 
      color: #000;
    }
    .header { text-align: center; margin-bottom: 20px; }
    .header h3, .header h4 { margin: 5px 0; color: #000; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 15px 0; 
    }
    th, td { 
      border: 1px solid #000; 
      padding: 8px; 
      text-align: left; 
      color: #000;
      font-size: 10pt;
    }
    th { 
      background: #e0e0e0; 
      font-weight: bold; 
      text-align: center;
    }
    .bold { font-weight: bold; }
    .footer-section { 
      display: flex; 
      justify-content: space-between; 
      margin-top: 40px; 
    }
    .footer-item { 
      text-align: center; 
      flex: 1; 
    }
    @media print {
      body { margin: 0; padding: 10mm; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>

  <div class="header">
    <h3>T.C.</h3>
    <h4>${kaymakamlik} KAYMAKAMLIĞI</h4>
    <h4>${okulAdi}</h4>
    <h2>GEZİ PLANI</h2>
  </div>

  <table>
    <tr>
      <td class="bold" style="width: 30%;">Gezi Güzergahı</td>
      <td>${geziData.guzergah}</td>
    </tr>
    <tr>
      <td class="bold">Gezinin Amacı</td>
      <td>${geziData.gezi_amaci}</td>
    </tr>
    <tr>
      <td class="bold">Gidiş Tarihi ve Saati</td>
      <td>${geziTarihi}</td>
    </tr>
    <tr>
      <td class="bold">Dönüş Tarihi ve Saati</td>
      <td>${donusTarihi}</td>
    </tr>
  </table>

  <p class="bold">GEZİYE KATILACAKLAR (İdareci-Öğretmen-Personel)</p>
  <table>
    <thead>
      <tr>
        <th>Adı Soyadı</th>
        <th>Görevi</th>
        <th>İmzası</th>
      </tr>
    </thead>
    <tbody>
      ${ogretmenlerHTML}
    </tbody>
  </table>

  <div style="margin: 15px 0;">
    <p><span class="bold">Öğrenci Sayısı:</span> ${katilimcilar.ogrenciler.length}</p>
    <p><span class="bold">Bütün Katılımcıların Sayısı:</span> ${toplamKatilimci}</p>
  </div>

  <div class="footer-section">
    <div class="footer-item">
      <p class="bold">Geziyi Düzenleyen</p>
      <br><br><br>
      <p>________________<br>Ad Soyad / İmza</p>
    </div>
    <div class="footer-item">
      <p class="bold">Kafile Başkanı</p>
      <br><br><br>
      <p>${kafileBaskanAd}<br>İmza</p>
    </div>
    <div class="footer-item">
      <p class="bold">Okul Müdürü</p>
      <br><br><br>
      <p>________________<br>Ad Soyad / Mühür</p>
    </div>
  </div>

  <p style="font-size: 9pt; margin-top: 30px; text-align: right;">
    Tarih: ${tarih}
  </p>

</body>
</html>
  `;
}
// ==========================================
// GEZİ PLANI EK-2 YARDIMCI FONKSİYONLAR
// ==========================================

// ============================================
// SINIF LİSTESİ (DİNAMİK SATIRLAR)
// ============================================
async function loadSinifListesiEk2(ek2Window) {
  console.log("🔄 Sınıf listesi yükleniyor (Ek-2)...");

  try {
    // Öğrencileri sınıflara göre grupla
    const ogrenciResult = await window.electronAPI.dbQuery(
      `SELECT o.sinif, o.cinsiyet
       FROM gezi_ogrenciler go
       INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
       WHERE go.gezi_id = ?
       ORDER BY o.sinif`,
      [currentGeziId]
    );

    if (!ogrenciResult.success || !ogrenciResult.data) {
      console.log("⚠️ Öğrenci bulunamadı");
      return;
    }

    // Sınıflara göre grupla
    const siniflar = {};
    ogrenciResult.data.forEach((o) => {
      const sinif = o.sinif || "Bilinmiyor";
      if (!siniflar[sinif]) {
        siniflar[sinif] = { kiz: 0, erkek: 0 };
      }

      if (o.cinsiyet === "K" || o.cinsiyet === "Kız") {
        siniflar[sinif].kiz++;
      } else {
        siniflar[sinif].erkek++;
      }
    });

    // Sınıf sırasına göre sırala (9, 10, 11, 12)
    const sinifSirali = Object.keys(siniflar).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || 999);
      const numB = parseInt(b.match(/\d+/)?.[0] || 999);
      return numA - numB;
    });

    const tbody = ek2Window.document.getElementById("sinifListesi");
    tbody.innerHTML = "";

    let toplamKiz = 0;
    let toplamErkek = 0;
    let toplamOgrenci = 0;

    // Her sınıf için satır ekle
    sinifSirali.forEach((sinif, index) => {
      const data = siniflar[sinif];
      const toplam = data.kiz + data.erkek;

      toplamKiz += data.kiz;
      toplamErkek += data.erkek;
      toplamOgrenci += toplam;

      const row = tbody.insertRow();
      row.insertCell().textContent = index + 1;

      // ✅ "9.SINIF" formatında yaz
      const sinifNo = sinif.match(/\d+/)?.[0] || sinif;
      row.insertCell().textContent = `${sinifNo}.SINIF`;

      row.insertCell().textContent = data.kiz;
      row.insertCell().textContent = data.erkek;
      row.insertCell().textContent = toplam;
    });

    // TOPLAM SATIRI EKLE
    const toplamRow = tbody.insertRow();
    toplamRow.style.fontWeight = "bold";
    toplamRow.style.backgroundColor = "#f0f0f0";
    toplamRow.insertCell().textContent = "";
    toplamRow.insertCell().textContent = "Toplam";
    toplamRow.insertCell().textContent = toplamKiz;
    toplamRow.insertCell().textContent = toplamErkek;
    toplamRow.insertCell().textContent = toplamOgrenci;

    console.log(`✅ ${sinifSirali.length} sınıf eklendi (Ek-2)`);
  } catch (error) {
    console.error("❌ Sınıf listesi yükleme hatası:", error);
  }
}

// ============================================
// SORUMLU ÖĞRETMENLER (DİNAMİK SATIRLAR)
// ============================================
async function loadOgretmenlerEk2(ek2Window) {
  console.log("🔄 Öğretmenler yükleniyor (Ek-2)...");

  try {
    const ogretmenResult = await window.electronAPI.dbQuery(
      `SELECT o.ad_soyad
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       WHERE go.gezi_id = ?
       ORDER BY o.ad_soyad`,
      [currentGeziId]
    );

    const tbody = ek2Window.document.getElementById("ogretmenListesi");
    tbody.innerHTML = "";

    if (
      !ogretmenResult.success ||
      !ogretmenResult.data ||
      ogretmenResult.data.length === 0
    ) {
      const row = tbody.insertRow();
      row.insertCell().textContent = "1";
      row.insertCell().textContent = "-";
      row.insertCell().textContent = "";
      console.log("⚠️ Öğretmen bulunamadı");
      return;
    }

    // Her öğretmen için satır ekle (BOŞ SATIR YOK!)
    ogretmenResult.data.forEach((o, index) => {
      const row = tbody.insertRow();
      row.insertCell().textContent = index + 1;
      row.insertCell().textContent = o.ad_soyad;
      row.insertCell().textContent = ""; // İmza alanı
    });

    console.log(`✅ ${ogretmenResult.data.length} öğretmen eklendi (Ek-2)`);
  } catch (error) {
    console.error("❌ Öğretmen listesi yükleme hatası:", error);
  }
}

// ============================================
// FİRMA BİLGİLERİ
// ============================================
async function loadFirmaBilgileriEk2(ek2Window) {
  console.log("🔄 Firma bilgileri yükleniyor (Ek-2)...");

  try {
    const firmaResult = await window.electronAPI.firmaGetir(currentGeziId);

    const tbody = ek2Window.document.getElementById("firmaBilgileri");
    tbody.innerHTML = "";

    if (
      !firmaResult.success ||
      !firmaResult.data ||
      firmaResult.data.length === 0
    ) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center;">Firma bilgisi bulunamadı</td>
        </tr>
      `;
      console.log("⚠️ Firma bilgisi yok");
      return;
    }

    const firma = firmaResult.data[0];

    // Firma bilgilerini tabloya ekle
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <strong>Yüklenici Firma/Acente Adı:</strong> ${firma.firma_adi || "-"}
        </td>
      </tr>
      <tr>
        <td colspan="3"><strong>İşletme Belge No:</strong> ${
          firma.isletme_belge_no || "-"
        }</td>
        <td colspan="3"><strong>TÜRSAB Belge No:</strong> ${
          firma.tursab_no || "-"
        }</td>
      </tr>
      <tr>
        <td colspan="3"><strong>B2 / D2 Yetki Belgesi No:</strong> ${
          firma.yetki_belgesi || "-"
        }</td>
        <td colspan="3"><strong>Mesleki Yeterlik Belgesi (SRC1 / SRC2) No:</strong> <span id="srcBelgesi">-</span></td>
      </tr>
    `;

    console.log("✅ Firma bilgileri eklendi (Ek-2)");
  } catch (error) {
    console.error("❌ Firma bilgileri yükleme hatası:", error);
  }
}
// ============================================
// ULAŞIM BİLGİLERİ (ARAÇ / UÇAK)
// ============================================
async function loadUlasimBilgileriEk2(ek2Window) {
  console.log("🔄 Ulaşım bilgileri yükleniyor (Ek-2)...");

  try {
    const karaTablo = ek2Window.document.getElementById("karaYoluTablosu");
    const havaTablo = ek2Window.document.getElementById("havaYoluTablosu");

    // ============================================
    // YURT DIŞI İSE UÇAK BİLGİLERİNİ GÖSTER
    // ============================================
    if (geziData.gezi_turu === "yurt_disi") {
      console.log("✈️ Yurt dışı gezisi - Uçak bilgileri gösteriliyor");

      if (karaTablo) karaTablo.style.display = "none";
      if (havaTablo) havaTablo.style.display = "table";

      // Uçuş bilgilerini çek
      const ucakResult = await window.electronAPI.dbQuery(
        "SELECT * FROM gezi_ulasim WHERE gezi_id = ? AND ulasim_tipi = 'ucak'",
        [currentGeziId]
      );

      const tbody = ek2Window.document.getElementById("ucusListesi");
      tbody.innerHTML = "";

      if (
        !ucakResult.success ||
        !ucakResult.data ||
        ucakResult.data.length === 0
      ) {
        const row = tbody.insertRow();
        row.insertCell().textContent = "1";
        row.insertCell().textContent = "-";
        row.insertCell().textContent = "-";
        row.insertCell().textContent = "-";
        console.log("⚠️ Uçuş bilgisi bulunamadı");
        return;
      }

      // Her uçuş için satır ekle
      ucakResult.data.forEach((ucus, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = ucus.firma_adi || "-";
        row.insertCell().textContent = ucus.sefer_no || "-";
        row.insertCell().textContent = ucus.pnr_kodu || "-";
      });

      console.log(`✅ ${ucakResult.data.length} uçuş eklendi (Ek-2)`);
      return;
    }

    // ============================================
    // YURT İÇİ İSE ARAÇ BİLGİLERİNİ GÖSTER
    // ============================================
    console.log("🚗 Yurt içi gezisi - Araç bilgileri gösteriliyor");

    if (havaTablo) havaTablo.style.display = "none";
    if (karaTablo) karaTablo.style.display = "table";

    // Araç bilgilerini çek
    const aracResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_araclar WHERE gezi_id = ?",
      [currentGeziId]
    );

    const tbody = ek2Window.document.getElementById("aracListesi");
    tbody.innerHTML = "";

    if (
      !aracResult.success ||
      !aracResult.data ||
      aracResult.data.length === 0
    ) {
      const row = tbody.insertRow();
      row.insertCell().textContent = "1";
      row.insertCell().textContent = "-";
      row.insertCell().textContent = "-";
      row.insertCell().textContent = "-";
      console.log("⚠️ Araç bilgisi bulunamadı");
      return;
    }

    const arac = aracResult.data[0];

    // Şoförleri çek
    const soforResult = await window.electronAPI.dbQuery(
      "SELECT * FROM gezi_arac_soforler WHERE arac_id = ? ORDER BY id",
      [arac.id]
    );

    const soforler = soforResult.data || [];

    // Model yılını al (trafiğe çıkış tarihinden)
    const modelYili = arac.trafige_cikis_tarihi
      ? new Date(arac.trafige_cikis_tarihi).getFullYear()
      : "-";

    // ✅ SRC BELGESİNİ İLK ŞOFÖRDEN AL (DÜZELTME: src_belge_no)
    if (soforler.length > 0 && soforler[0].src_belge_no) {
      const srcBelgeElem = ek2Window.document.getElementById("srcBelgesi");
      if (srcBelgeElem) {
        srcBelgeElem.textContent = soforler[0].src_belge_no;
        console.log("✅ SRC Belgesi eklendi:", soforler[0].src_belge_no);
      }
    }

    // Her şoför için satır ekle
    if (soforler.length === 0) {
      const row = tbody.insertRow();
      row.insertCell().textContent = "1";
      row.insertCell().textContent = "-";
      row.insertCell().textContent = arac.plaka || "-";
      row.insertCell().textContent = modelYili;
    } else {
      soforler.forEach((sofor, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = sofor.ad_soyad || "-";
        row.insertCell().textContent = arac.plaka || "-";
        row.insertCell().textContent = modelYili;
      });
    }

    console.log(`✅ ${soforler.length} araç/şoför eklendi (Ek-2)`);
  } catch (error) {
    console.error("❌ Ulaşım bilgileri yükleme hatası:", error);
  }
}
// ============================================
// İMZA ALANLARI VE TARİHLER
// ============================================
async function loadImzaAlanlariEk2(ek2Window) {
  console.log("🔄 İmza alanları dolduruluyor (Ek-2)...");

  try {
    // Bugünün tarihi (dd/mm/yyyy)
    const bugun = new Date();
    const gun = String(bugun.getDate()).padStart(2, "0");
    const ay = String(bugun.getMonth() + 1).padStart(2, "0");
    const yil = bugun.getFullYear();
    const tarih = `${gun}/${ay}/${yil}`;

    // Tarihleri doldur
    const arzTarihElem = ek2Window.document.getElementById("arzTarihi");
    const olurTarihElem = ek2Window.document.getElementById("olurTarihi");

    if (arzTarihElem) arzTarihElem.textContent = tarih;
    if (olurTarihElem) olurTarihElem.textContent = tarih;

    // Sorumlu öğretmenleri çek (ilk 2 kişi)
    const ogretmenResult = await window.electronAPI.dbQuery(
      `SELECT o.ad_soyad, o.gorev, o.brans
       FROM gezi_ogretmenler go
       INNER JOIN ogretmenler o ON go.ogretmen_id = o.id
       WHERE go.gezi_id = ?
       ORDER BY o.ad_soyad
       LIMIT 2`,
      [currentGeziId]
    );

    // Okul müdürünü çek
    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad, gorev
       FROM ogretmenler
       WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili')
       AND durum = 1
       LIMIT 1`
    );

    const ogretmenler = ogretmenResult.data || [];
    const mudur =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0]
        : null;

    // Sol öğretmen
    const ogr1Div = ek2Window.document.getElementById("ogretmen1");
    if (ogr1Div) {
      const ogr1 = ogretmenler[0];
      if (ogr1) {
        ogr1Div.innerHTML = `
          <div style="font-weight: bold; font-size: 11pt; margin-bottom: 3px;">${
            ogr1.ad_soyad
          }</div>
          <div style="font-size: 10pt; color: #333;">${
            ogr1.brans ? ogr1.brans + " Öğretmeni" : "Öğretmen"
          }</div>
        `;
      }
    }

    // Orta öğretmen
    const ogr2Div = ek2Window.document.getElementById("ogretmen2");
    if (ogr2Div) {
      const ogr2 = ogretmenler[1];
      if (ogr2) {
        // ✅ BRANŞ VARSA BRANŞ, YOKSA GÖREV
        const unvan = ogr2.brans
          ? ogr2.brans + " Öğretmeni"
          : ogr2.gorev || "Öğretmen";

        ogr2Div.innerHTML = `
      <div style="font-weight: bold; font-size: 11pt; margin-bottom: 3px;">${ogr2.ad_soyad}</div>
      <div style="font-size: 10pt; color: #333;">${unvan}</div>
    `;
      }
    }

    // Sağ müdür (OLUR ALTINDA)
    const mudurDiv = ek2Window.document.getElementById("mudur");
    if (mudurDiv && mudur) {
      mudurDiv.innerHTML = `
        <div style="font-weight: bold; font-size: 11pt; margin-bottom: 3px;">${mudur.ad_soyad}</div>
        <div style="font-size: 10pt; color: #333;">${mudur.gorev}</div>
      `;
    }

    console.log("✅ İmza alanları dolduruldu (Ek-2)");
  } catch (error) {
    console.error("❌ İmza alanları yükleme hatası:", error);
    console.error("❌ Hata detayı:", error.message);
  }
}

// ==========================================
// VELİ İZİN BELGESİ (EK-4) FONKSİYONLARI
// ==========================================

// ============================================
// ÖĞRENCİ SEÇİM MODALI GÖSTER
// ============================================
function showOgrenciSecimModal() {
  console.log("🔄 Öğrenci seçim modalı açılıyor...");

  // Modal HTML'i oluştur
  const modalHTML = `
    <div id="ogrenciSecimModal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    ">
      <div style="
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      ">
        <h2 style="margin-bottom: 20px; color: #333;">📋 Öğrenci Seçin</h2>
        <div id="ogrenciListesi" style="margin-bottom: 20px;">
          <div style="text-align: center; padding: 20px;">
            <div style="
              display: inline-block;
              width: 40px;
              height: 40px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
            <p style="margin-top: 10px; color: #666;">Öğrenciler yükleniyor...</p>
          </div>
        </div>
        <button onclick="closeOgrenciSecimModal()" style="
          width: 100%;
          padding: 12px;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
        ">✖ Kapat</button>
      </div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  // Modal'ı body'ye ekle
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Öğrencileri yükle
  loadOgrencilerForVeliIzin();
}

// ============================================
// MODAL KAPAT
// ============================================
function closeOgrenciSecimModal() {
  const modal = document.getElementById("ogrenciSecimModal");
  if (modal) modal.remove();
}

// ============================================
// GEZİYE KAYITLI ÖĞRENCİLERİ YÜKLE
// ============================================
async function loadOgrencilerForVeliIzin() {
  try {
    console.log("🔄 Öğrenciler yükleniyor (Veli İzin)...");

    const result = await window.electronAPI.dbQuery(
      `SELECT o.id, o.ad, o.soyad, o.okul_no, o.sinif, o.cinsiyet
       FROM gezi_ogrenciler go
       INNER JOIN ogrenciler o ON go.ogrenci_id = o.id
       WHERE go.gezi_id = ?
       ORDER BY o.sinif, o.soyad, o.ad`,
      [currentGeziId]
    );

    const container = document.getElementById("ogrenciListesi");

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #999;">
          <p style="font-size: 16px; margin-bottom: 10px;">📭</p>
          <p>Bu geziye kayıtlı öğrenci bulunamadı.</p>
        </div>
      `;
      return;
    }

    // Öğrenci listesi HTML'i oluştur
    let html =
      '<div style="display: flex; flex-direction: column; gap: 10px;">';

    result.data.forEach((ogrenci) => {
      const cinsiyetIcon = ogrenci.cinsiyet === "K" ? "👧" : "👦";
      html += `
        <div onclick="openVeliIzinBelgesi(${ogrenci.id})" style="
          padding: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          background: #f9f9f9;
        " onmouseover="this.style.borderColor='#3498db'; this.style.background='#e3f2fd';"
           onmouseout="this.style.borderColor='#e0e0e0'; this.style.background='#f9f9f9';">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 14px; color: #333;">
                ${cinsiyetIcon} ${ogrenci.ad} ${ogrenci.soyad}
              </strong>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">
                ${ogrenci.sinif} • Okul No: ${ogrenci.okul_no}
              </div>
            </div>
            <div style="
              padding: 8px 15px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border-radius: 6px;
              font-size: 12px;
              font-weight: bold;
            ">
              📄 Belge Oluştur
            </div>
          </div>
        </div>
      `;
    });

    html += "</div>";
    container.innerHTML = html;

    console.log(`✅ ${result.data.length} öğrenci listelendi`);
  } catch (error) {
    console.error("❌ Öğrenci listesi yükleme hatası:", error);
    Bildirim.goster("error", "❌ Öğrenciler yüklenemedi!");
  }
}

// ============================================
// VELİ İZİN BELGESİ AÇ (SELECTED ÖĞRENCİ)
// ============================================
async function openVeliIzinBelgesi(ogrenciId) {
  console.log(`🔄 Öğrenci ${ogrenciId} için Veli İzin Belgesi açılıyor...`);

  // Modal'ı kapat
  closeOgrenciSecimModal();

  try {
    // Yeni pencere aç
    const veliWindow = window.open(
      "sablonlar/gezi-plani-ek4.html",
      "_blank",
      "width=1000,height=1200"
    );

    veliWindow.addEventListener("load", async function () {
      try {
        console.log("🔄 Veli İzin Belgesi verileri dolduruluyor...");

        await loadVeliIzinData(veliWindow, ogrenciId);

        console.log("✅ Veli İzin Belgesi hazır!");
        Bildirim.goster("success", "✅ Veli İzin Belgesi hazır!");
      } catch (error) {
        console.error("❌ Veli İzin Belgesi doldurma hatası:", error);
        Bildirim.goster("error", "❌ Belge yüklenemedi!");
      }
    });
  } catch (error) {
    console.error("❌ Pencere açma hatası:", error);
    Bildirim.goster("error", "❌ Belge açılamadı!");
  }
}
// ============================================
// VELİ İZİN BELGESİ VERİLERİNİ DOLDUR
// ============================================
async function loadVeliIzinData(veliWindow, ogrenciId) {
  console.log("🔄 Veri doldurma başlıyor...");

  try {
    // ============================================
    // 1. ÖĞRENCİ BİLGİLERİNİ ÇEK
    // ============================================
    const ogrenciResult = await window.electronAPI.dbQuery(
      `SELECT ad, soyad, okul_no, sinif, cinsiyet,
              dogum_tarihi, dogum_yeri, 
              baba_ad_soyad, baba_telefon,
              anne_ad_soyad, anne_telefon
       FROM ogrenciler 
       WHERE id = ?`,
      [ogrenciId]
    );

    console.log("📊 Öğrenci Sorgu Sonucu:", ogrenciResult); // ✅ DEBUG

    if (
      !ogrenciResult.success ||
      !ogrenciResult.data ||
      ogrenciResult.data.length === 0
    ) {
      throw new Error("Öğrenci bulunamadı!");
    }

    const ogrenci = ogrenciResult.data[0];
    console.log("📊 Öğrenci Verisi:", ogrenci); // ✅ DEBUG

    // Öğrenci bilgilerini doldur
    veliWindow.document.getElementById(
      "ogrAdiSoyadi"
    ).textContent = `${ogrenci.ad} ${ogrenci.soyad}`;
    veliWindow.document.getElementById("babaAdi").textContent =
      ogrenci.baba_ad_soyad || "-";
    veliWindow.document.getElementById("sinif").textContent =
      ogrenci.sinif || "-";
    veliWindow.document.getElementById("anneAdi").textContent =
      ogrenci.anne_ad_soyad || "-";
    veliWindow.document.getElementById("okulNo").textContent =
      ogrenci.okul_no || "-";

    // Cinsiyet checkbox
    if (ogrenci.cinsiyet === "K" || ogrenci.cinsiyet === "Kız") {
      veliWindow.document.getElementById("checkKiz").classList.add("checked");
    } else {
      veliWindow.document.getElementById("checkErkek").classList.add("checked");
    }

    veliWindow.document.getElementById("dogumTarihi").textContent =
      ogrenci.dogum_tarihi ? formatDate(ogrenci.dogum_tarihi) : "-";
    veliWindow.document.getElementById("dogumYeri").textContent =
      ogrenci.dogum_yeri || "-";

    // ✅ KAN GRUBU KALDIRILDI (veritabanında yok)
    veliWindow.document.getElementById("kanGrubu").textContent = "-";

    // Telefon bilgileri
    veliWindow.document.getElementById("babaTelefon").textContent =
      ogrenci.baba_telefon || "-";
    veliWindow.document.getElementById("anneTelefon").textContent =
      ogrenci.anne_telefon || "-";

    // ============================================
    // 2. OKUL BİLGİLERİNİ ÇEK
    // ============================================
    const okulAdi =
      localStorage.getItem("okul_adi") ||
      "Bahçelievler Cumhuriyet Anadolu Lisesi";

    // ✅ OKUL BİLGİLERİNİ OKULLAR TABLOSUNDAN ÇEK
    const okulResult = await window.electronAPI.dbQuery(
      `SELECT adres, telefon, ilce FROM okullar WHERE id = ? LIMIT 1`,
      [1] // okul_id (şu an 1, dinamik yapılabilir)
    );

    let okulAdres = "Bahçelievler Mah. Yıldızlı Sk. No:2 Bahçelievler-İstanbul";
    let okulTelefon = "0 212 441 40 04";
    let ilce = "BAHÇELİEVLER";

    if (okulResult.success && okulResult.data && okulResult.data.length > 0) {
      okulAdres = okulResult.data[0].adres || okulAdres;
      okulTelefon = okulResult.data[0].telefon || okulTelefon;
      ilce = okulResult.data[0].ilce || ilce;
    }

    veliWindow.document.getElementById("okulAdresi").textContent = okulAdres;
    veliWindow.document.getElementById("okulTelefon").textContent = okulTelefon;
    veliWindow.document.getElementById("okulAdiBaslik").textContent =
      okulAdi.toUpperCase();
    veliWindow.document.getElementById("ilceAdi").textContent =
      ilce.toUpperCase();

    // ============================================
    // 3. GEZİ BİLGİLERİNİ ÇEK
    // ============================================
    veliWindow.document.getElementById("geziYerleri").textContent =
      geziData.duzenlenen_yer || geziData.guzergah || "-";

    // Gezi tarihleri
    const geziTarih = `${formatDate(geziData.gezi_tarihi)} - ${formatDate(
      geziData.donus_tarihi
    )}`;
    veliWindow.document.getElementById("geziTarihMetin").textContent =
      geziTarih;

    // Gezi türü
    const geziTuruMap = {
      ilce_ici: "İlçe İçi",
      il_ici: "İl İçi",
      il_disi: "İl Dışı",
      yurt_disi: "Yurt Dışı",
    };
    veliWindow.document.getElementById("geziTuruMetin").textContent =
      geziTuruMap[geziData.gezi_turu] || "Yurt İçi";

    veliWindow.document.getElementById("geziYeriMetin").textContent =
      geziData.gezi_adi || geziData.duzenlenen_yer || "";

    // ============================================
    // 4. OKUL MÜDÜRÜNÜ ÇEK
    // ============================================
    const mudurResult = await window.electronAPI.dbQuery(
      `SELECT ad_soyad 
       FROM ogretmenler 
       WHERE gorev IN ('Okul Müdürü', 'Müdür', 'Müdür Yetkili Öğretmen', 'Müdür Vekili')
       AND durum = 1 
       LIMIT 1`
    );

    const mudurAdi =
      mudurResult.data && mudurResult.data.length > 0
        ? mudurResult.data[0].ad_soyad
        : "___________________";

    veliWindow.document.getElementById("mudurAdi").textContent = mudurAdi;
    // ============================================
    // 5. TARİHLERİ DOLDUR (BUGÜN)
    // ============================================
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, "0")}/${String(
      bugun.getMonth() + 1
    ).padStart(2, "0")}/${bugun.getFullYear()}`;

    veliWindow.document.getElementById("tarihMetin").textContent = tarih;
    veliWindow.document.getElementById("tarihMetin2").textContent = tarih;

    // ============================================
    // 6. İMZA ALANINA ANNE-BABA İSİMLERİNİ EKLE
    // ============================================
    // ✅ SOYAD ALANININ SON KELİMESİNİ AL (GERÇEK SOYAD)
    const soyadKelimeler = ogrenci.soyad ? ogrenci.soyad.trim().split(" ") : [];
    const gercekSoyad =
      soyadKelimeler.length > 0
        ? soyadKelimeler[soyadKelimeler.length - 1]
        : "";

    const anneAdi = ogrenci.anne_ad_soyad
      ? `${ogrenci.anne_ad_soyad} ${gercekSoyad}`.trim()
      : "___________________";

    const babaAdi = ogrenci.baba_ad_soyad
      ? `${ogrenci.baba_ad_soyad} ${gercekSoyad}`.trim()
      : "___________________";

    // ✅ İmza alanlarını ID ile doldur (HTML'deki yeni yapı)
    const anneImzaElem = veliWindow.document.getElementById("anneImza");
    const babaImzaElem = veliWindow.document.getElementById("babaImza");

    if (anneImzaElem) {
      anneImzaElem.innerHTML = `<strong>${anneAdi}</strong>`;
    }

    if (babaImzaElem) {
      babaImzaElem.innerHTML = `<strong>${babaAdi}</strong>`;
    }

    console.log("✅ Tüm veriler dolduruldu");
  } catch (error) {
    console.error("❌ Veri doldurma hatası:", error);
    console.error("❌ Hata mesajı:", error.message);
    throw error;
  }
}

async function generateMudurlukOnay() {
  try {
    console.log("📋 Müdürlük onay yazısı oluşturuluyor...");

    if (!geziData) {
      return `<!DOCTYPE html><html><body><h2>Hata: Gezi bilgileri bulunamadı</h2></body></html>`;
    }

    const okulAdi = geziData.okul_adi || "OKUL ADI";
    const mudurAdi = geziData.mudur_adi || "OKUL MÜDÜRÜ AD SOYAD";

    const html = `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <title>Müdürlük Onay Yazısı</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.5;
        margin: 0;
        padding: 20mm;
        color: #000;
        background: white;
      }
      .header-center {
        text-align: center;
        margin-bottom: 30px;
      }
      .header-center div {
        margin: 2px 0;
      }
      .meta-info {
        display: flex;
        justify-content: space-between;
        margin: 20px 0;
      }
      .content {
        text-align: justify;
        margin: 30px 0;
        text-indent: 50px;
      }
      .footer-right {
        text-align: right;
        margin-top: 40px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      table, th, td { border: 1px solid #000; }
      th, td {
        padding: 8px;
        text-align: left;
      }
      th {
        background: #f0f0f0;
        font-weight: bold;
      }
      .editable {
        background: #ffffcc !important;
        cursor: text !important;
        padding: 2px 5px;
        border-bottom: 1px dashed #999;
      }
      .editable:hover { background: #ffff99 !important; }
      .editable:focus {
        background: #ffeb3b !important;
        outline: 2px solid #ff9800;
      }
      .editable:empty:before {
        content: "Tıklayın...";
        color: #999;
        font-style: italic;
      }
      @media print {
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body { margin: 0; padding: 0; }
        .editable {
          background: white !important;
          outline: none !important;
          border: none !important;
          cursor: default !important;
        }
        .editable:empty:before { content: ""; }
        .no-print { display: none !important; }
        .warning-modal, .top-buttons { display: none !important; }
      }
      .warning-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      .warning-box {
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
      }
      .warning-icon { font-size: 50px; margin-bottom: 15px; }
      .warning-title {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #e67e22;
        font-family: Arial, sans-serif;
      }
      .warning-text {
        font-size: 14px;
        line-height: 1.6;
        color: #555;
        margin-bottom: 25px;
        font-family: Arial, sans-serif;
        text-align: left;
      }
      .warning-btn {
        background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
      }
      .warning-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(230, 126, 34, 0.4);
      }
      .top-buttons {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 15px;
        text-align: center;
        margin: -20mm -20mm 20px -20mm;
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      .top-buttons button {
        padding: 12px 24px;
        border: none;
        cursor: pointer;
        font-size: 15px;
        font-weight: 700;
        border-radius: 8px;
        margin: 0 8px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .btn-pdf {
        background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
        color: white;
      }
      .btn-pdf:hover {
        background: linear-gradient(135deg, #229954 0%, #1e8449 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(39, 174, 96, 0.4);
      }
      .btn-close {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
      }
      .btn-close:hover {
        background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(231, 76, 60, 0.4);
      }
    </style>
  </head>
  <body>
    <div class="warning-modal" id="warningModal">
      <div class="warning-box">
        <div class="warning-icon">⚠️</div>
        <div class="warning-title">KULLANICI BİLGİLENDİRMESİ</div>
        <div class="warning-text">
          <p style="margin-bottom: 10px"><strong>📌 Önemli Not:</strong></p>
          <p style="margin-bottom: 8px">
            Bu şablon <strong>sadece örnek olarak</strong> kullanıcılara yol
            göstermek amacıyla hazırlanmıştır.
          </p>
          <p style="margin-bottom: 8px">
            Lütfen aşağıdaki bilgileri <strong>kendi kurumunuza göre</strong>
            düzenleyiniz:
          </p>
          <ul style="text-align: left; margin-left: 20px; margin-top: 10px">
            <li>✓ Okul bilgileri</li>
            <li>✓ İlçe/İl Milli Eğitim Müdürlüğü</li>
            <li>✓ Tarih ve sayı bilgileri</li>
            <li>✓ Gezi detayları</li>
          </ul>
        </div>
        <button class="warning-btn" onclick="closeWarning()">
          ANLADIM, DEVAM ET
        </button>
      </div>
    </div>

    <div class="top-buttons no-print">
      <button class="btn-pdf" onclick="window.print()">
        📄 PDF Olarak Kaydet / Yazdır
      </button>
      <button class="btn-close" onclick="window.close()">✖ Kapat</button>
    </div>

    <div class="header-center">
      <div><strong>T.C.</strong></div>
      <div>
        <span class="editable" contenteditable="true">........... KAYMAKAMLIĞI</span>
      </div>
      <div>
        <strong><span class="editable" contenteditable="true">${okulAdi}</span></strong>
      </div>
    </div>

    <div class="meta-info">
      <div>
        <strong>SAYI:</strong>
        <span class="editable" contenteditable="true">............</span>
      </div>
      <div>
        <strong>Tarih:</strong> ${new Date().toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </div>
    </div>

    <div><strong>KONU:</strong> Gezi İzin Talebi</div>

    <div style="text-align: center; margin: 30px 0">
      <strong><span class="editable" contenteditable="true">............ İLÇE MİLLİ EĞİTİM MÜDÜRLÜĞÜNE</span></strong><br />
      <span class="editable" contenteditable="true">(................................... BÖLÜMÜNE)</span>
    </div>

    <div class="content">
      <span class="editable" contenteditable="true">${okulAdi}</span>
      idareci, öğretmen ve öğrencilerinin yol izni hariç
      <span class="editable" contenteditable="true">...../...../......</span> -
      <span class="editable" contenteditable="true">...../...../......</span>
      tarihleri arasında
      <span class="editable" contenteditable="true">......................................</span>
      kapsamında proje/davet'e istinaden
      <span class="editable" contenteditable="true">......</span> Kafile Başkanı,
      <span class="editable" contenteditable="true">........</span> Sorumlu
      öğretmen ve
      <span class="editable" contenteditable="true">.......</span> öğrenci ile
      <span class="editable" contenteditable="true">........</span> ülkesine
      yapılacak ziyaret ile ilgili evraklar hazırlanarak, tarafımızca kontrol
      edilerek yazımız ekinde sunulmuştur. Söz konusu ziyaret için yol
      giderleri, konaklama ve tüm harcamalar ilgili idareci, sorumlu öğretmen
      ve öğrenciler tarafından karşılanacaktır.
    </div>

    <div class="content">
      İlgili ziyaret programına katılacak idareci, öğretmen ve öğrencilerin T.C
      Kimlik Numaraları, Ad Soyad ve Ünvanları aşağıda belirtilmiştir. Ziyaretin
      belirtilen tarihlerde adı geçen idareci, öğretmenlerin denetim, gözetim ve
      sorumluluğunda yapılması ve ziyarete katılan idareci, sorumlu öğretmen ve
      öğrencilerin
      <span class="editable" contenteditable="true">...../...../.....</span> -
      <span class="editable" contenteditable="true">...../...../.....</span>
      tarihleri arasında görevli izinli sayılmaları için gerekli onayın alınması
      hususunda;
    </div>

    <div class="footer-right">
      <div>
        <strong><span class="editable" contenteditable="true">${mudurAdi}</span></strong>
      </div>
      <div><strong>Okul Müdürü</strong></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 10%">Sıra No</th>
          <th style="width: 20%">TC Kimlik No</th>
          <th style="width: 40%">Ad Soyad</th>
          <th style="width: 30%">Ünvan</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>1</td><td class="editable" contenteditable="true"></td><td class="editable" contenteditable="true"></td><td class="editable" contenteditable="true"></td></tr>
        <tr><td>2</td><td class="editable" contenteditable="true"></td><td class="editable" contenteditable="true"></td><td class="editable" contenteditable="true"></td></tr>
        <tr><td>3</td><td class="editable" contenteditable="true"></td><td class="editable" contenteditable="true"></td><td class="editable" contenteditable="true"></td></tr>
      </tbody>
    </table>

    <script>
      function closeWarning() {
        document.getElementById("warningModal").style.display = "none";
      }
      document.querySelectorAll(".editable").forEach((elem) => {
        elem.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            this.blur();
            const editables = Array.from(document.querySelectorAll(".editable"));
            const currentIndex = editables.indexOf(this);
            if (currentIndex < editables.length - 1) {
              editables[currentIndex + 1].focus();
            }
          }
        });
        elem.addEventListener("focus", function () {
          const range = document.createRange();
          range.selectNodeContents(this);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
      });
    </script>
  </body>
</html>`;

    return html;
  } catch (error) {
    console.error("❌ Müdürlük onay hatası:", error);
    return `<!DOCTYPE html><html><body><h2>Hata: ${error.message}</h2></body></html>`;
  }
}

// Eski fonksiyonu yenisiyle değiştir
generateGeziPlaniEk1 = generateGeziPlaniEk1Updated;

console.log("✅ Gezi Raporlar JS yüklendi");
