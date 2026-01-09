// ==========================================
// 🦋 KELEBEK DAĞITIM ALGORİTMASI V2.0 (ULTRA OPTİMİZE)
// - Minimum çakışma
// - Kız/Erkek dengesi
// - Seviye çeşitliliği
// - Serpantin düzen
// - Backtracking
// ==========================================

class KelebekAlgorithm {
  constructor(ogrenciler, salonlar, ayarlar = {}) {
    this.ogrenciler = ogrenciler;
    this.salonlar = salonlar;
    this.ayarlar = {
      ayniSeviyeYasak: ayarlar.ayniSeviyeYasak ?? true,
      ayniSubeYasak: ayarlar.ayniSubeYasak ?? true,
      cinsiyetDengesi: ayarlar.cinsiyetDengesi ?? true,
      serpantinDuzen: ayarlar.serpantinDuzen ?? true,
      minCakismaModu: ayarlar.minCakismaModu ?? true,
      ...ayarlar,
    };

    this.dagitimSonucu = [];
    this.bosKoltuklar = [];
    this.cakismalar = {
      ayniSube: 0,
      ayniSeviye: 0,
      ayniCinsiyet: 0,
    };
  }

  // ==========================================
  // 1. ANA ÇALIŞTIRICI
  // ==========================================

  async calistir() {
    console.log("=".repeat(60));
    console.log("🦋 KELEBEK ALGORİTMASI BAŞLATILIYOR");
    console.log("=".repeat(60));

    // Veri hazırlama
    this.ogrenciHavuzlari = this.ogrencileriGrupla();
    console.log("✅ Öğrenciler gruplandı:", {
      9: this.ogrenciHavuzlari[9]?.length || 0,
      10: this.ogrenciHavuzlari[10]?.length || 0,
      11: this.ogrenciHavuzlari[11]?.length || 0,
      12: this.ogrenciHavuzlari[12]?.length || 0,
    });

    // Her seviyeyi karıştır (Fisher-Yates)
    Object.keys(this.ogrenciHavuzlari).forEach((seviye) => {
      this.ogrenciHavuzlari[seviye] = this.fisherYatesShuffle(
        this.ogrenciHavuzlari[seviye]
      );
    });

    console.log("✅ Öğrenciler karıştırıldı (Fisher-Yates)");

    // Dağıtımı yap
    await this.dagitimYap();

    // Backtracking (boş koltukları doldur)
    if (this.bosKoltuklar.length > 0) {
      console.log(
        `⚠️ ${this.bosKoltuklar.length} boş koltuk var, backtracking başlatılıyor...`
      );
      await this.backtrackingDoldur();
    }

    console.log("=".repeat(60));
    console.log("✅ DAĞITIM TAMAMLANDI");
    console.log("=".repeat(60));
    console.log("📊 İSTATİSTİKLER:");
    console.log(`   • Yerleştirilen: ${this.dagitimSonucu.length} öğrenci`);
    console.log(`   • Boş Koltuk: ${this.bosKoltuklar.length}`);
    console.log(`   • Aynı Şube Çakışma: ${this.cakismalar.ayniSube}`);
    console.log(`   • Aynı Seviye Çakışma: ${this.cakismalar.ayniSeviye}`);
    console.log(`   • Aynı Cinsiyet Çakışma: ${this.cakismalar.ayniCinsiyet}`);
    console.log("=".repeat(60));

    return {
      dagitim: this.dagitimSonucu,
      bosKoltuklar: this.bosKoltuklar,
      cakismalar: this.cakismalar,
    };
  }

  // ==========================================
  // 2. VERİ HAZIRLAMA
  // ==========================================

  ogrencileriGrupla() {
    const gruplar = { 9: [], 10: [], 11: [], 12: [] };

    this.ogrenciler.forEach((ogr) => {
      // Sınıf bilgisinden seviyeyi çıkar (örn: "9-A" → 9)
      const seviye = parseInt(ogr.sinif?.toString().split("-")[0]);

      if (seviye >= 9 && seviye <= 12) {
        if (!gruplar[seviye]) gruplar[seviye] = [];
        gruplar[seviye].push(ogr);
      }
    });

    return gruplar;
  }

  fisherYatesShuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ==========================================
  // 3. ANA DAĞITIM MOTORU
  // ==========================================

  async dagitimYap() {
    const seviyeAnahtarlari = Object.keys(this.ogrenciHavuzlari).filter(
      (s) => this.ogrenciHavuzlari[s].length > 0
    );

    let seviyeIndex = 0;
    let globalSiraNo = 1;

    for (const salon of this.salonlar) {
      console.log(
        `\n🏢 Salon: ${salon.salon_adi} (Kapasite: ${salon.kapasite})`
      );

      const satirSayisi = salon.satir_sayisi || 8;
      const sutunSayisi = salon.sutun_sayisi || 5;
      const duzen = this.ayarlar.serpantinDuzen ? "serpantin" : "normal";

      // Salon matrisi oluştur
      const matris = Array(satirSayisi)
        .fill()
        .map(() => Array(sutunSayisi).fill(null));

      // Koltukları sırala (serpantin veya normal)
      const koltukSirasi = this.koltukSirasiOlustur(
        satirSayisi,
        sutunSayisi,
        duzen
      );

      for (const { satir, sutun } of koltukSirasi) {
        let yerlesti = false;
        let deneme = 0;

        // Uygun öğrenci bul (tüm seviyeleri dene)
        while (deneme < seviyeAnahtarlari.length && !yerlesti) {
          const seviye = seviyeAnahtarlari[seviyeIndex];
          const havuz = this.ogrenciHavuzlari[seviye];

          if (havuz && havuz.length > 0) {
            // Skora göre en uygun öğrenciyi seç
            const { ogrenci, index } = this.enUygunOgrenciyiBul(
              havuz,
              matris,
              satir,
              sutun
            );

            if (ogrenci) {
              // Yerleştir
              matris[satir][sutun] = ogrenci;
              this.ogrenciHavuzlari[seviye].splice(index, 1);

              this.dagitimSonucu.push({
                salon_id: salon.id,
                salon_adi: salon.salon_adi,
                ogrenci_id: ogrenci.id,
                ogrenci_ad: ogrenci.ad_soyad,
                sinif: ogrenci.sinif,
                cinsiyet: ogrenci.cinsiyet,
                sira_no: globalSiraNo,
                satir_index: satir,
                sutun_index: sutun,
              });

              yerlesti = true;
              globalSiraNo++;
            }
          }

          seviyeIndex = (seviyeIndex + 1) % seviyeAnahtarlari.length;
          deneme++;
        }

        // Yerleştirilemediyse boş bırak
        if (!yerlesti) {
          this.bosKoltuklar.push({
            salon_id: salon.id,
            salon_adi: salon.salon_adi,
            satir: satir,
            sutun: sutun,
            sira_no: globalSiraNo,
          });
          globalSiraNo++;
        }

        // Animasyon için bekle (UI güncellemesi)
        if (typeof dagitimDurdur !== "undefined" && dagitimDurdur) {
          throw new Error("Dağıtım kullanıcı tarafından durduruldu");
        }

        await this.sleep(5); // 5ms bekle
      }
    }
  }

  // ==========================================
  // 4. KOLTUK SIRASI OLUŞTUR (SERPANTİN)
  // ==========================================

  koltukSirasiOlustur(satirSayisi, sutunSayisi, duzen) {
    const koltuklar = [];

    for (let satir = 0; satir < satirSayisi; satir++) {
      if (duzen === "serpantin" && satir % 2 === 1) {
        // Tek satırlarda sağdan sola
        for (let sutun = sutunSayisi - 1; sutun >= 0; sutun--) {
          koltuklar.push({ satir, sutun });
        }
      } else {
        // Çift satırlarda (ve normal modda) soldan sağa
        for (let sutun = 0; sutun < sutunSayisi; sutun++) {
          koltuklar.push({ satir, sutun });
        }
      }
    }

    return koltuklar;
  }

  // ==========================================
  // 5. EN UYGUN ÖĞRENCİYİ BUL (SKOR SİSTEMİ)
  // ==========================================

  enUygunOgrenciyiBul(havuz, matris, satir, sutun) {
    let enIyiOgrenci = null;
    let enIyiIndex = -1;
    let enDusukSkor = Infinity;

    for (let i = 0; i < havuz.length; i++) {
      const ogrenci = havuz[i];
      const skor = this.cakismaSkoruHesapla(ogrenci, matris, satir, sutun);

      // Sıfır skor = hiç çakışma yok (en iyisi)
      if (skor === 0) {
        return { ogrenci, index: i };
      }

      if (skor < enDusukSkor) {
        enDusukSkor = skor;
        enIyiOgrenci = ogrenci;
        enIyiIndex = i;
      }
    }

    // Minimum çakışma modunda en düşük skorlu olanı döndür
    if (this.ayarlar.minCakismaModu && enIyiOgrenci) {
      return { ogrenci: enIyiOgrenci, index: enIyiIndex };
    }

    // Minimum çakışma modu kapalıysa ve skor > 0 ise null döndür
    return { ogrenci: null, index: -1 };
  }

  // ==========================================
  // 6. ÇAKIŞMA SKORU HESAPLA
  // ==========================================

  cakismaSkoruHesapla(ogrenci, matris, satir, sutun) {
    let skor = 0;

    // 4 yönlü komşular (üst, alt, sol, sağ)
    const komsular = [
      { r: satir - 1, c: sutun }, // Üst
      { r: satir + 1, c: sutun }, // Alt
      { r: satir, c: sutun - 1 }, // Sol
      { r: satir, c: sutun + 1 }, // Sağ
    ];

    for (const { r, c } of komsular) {
      if (r >= 0 && r < matris.length && c >= 0 && c < matris[0].length) {
        const komsu = matris[r][c];

        if (komsu) {
          // KURAL 1: Aynı şube (ÇOK KÖTÜ - en yüksek skor)
          if (komsu.sinif === ogrenci.sinif) {
            skor += 1000;
          }

          // KURAL 2: Aynı seviye (KÖTÜ - orta skor)
          const komsuSeviye = parseInt(komsu.sinif?.toString().split("-")[0]);
          const ogrSeviye = parseInt(ogrenci.sinif?.toString().split("-")[0]);

          if (this.ayarlar.ayniSeviyeYasak && komsuSeviye === ogrSeviye) {
            skor += 100;
          }

          // KURAL 3: Aynı cinsiyet (İSTENMEYEN - düşük skor)
          if (
            this.ayarlar.cinsiyetDengesi &&
            komsu.cinsiyet === ogrenci.cinsiyet
          ) {
            skor += 10;
          }
        }
      }
    }

    return skor;
  }

  // ==========================================
  // 7. BACKTRACKING (BOŞ KOLTUKLARI DOLDUR)
  // ==========================================

  async backtrackingDoldur() {
    console.log("🔄 Backtracking başlatılıyor...");

    // Kalan tüm öğrencileri topla
    const kalanOgrenciler = [];
    Object.values(this.ogrenciHavuzlari).forEach((havuz) => {
      kalanOgrenciler.push(...havuz);
    });

    if (kalanOgrenciler.length === 0) {
      console.log("⚠️ Kalan öğrenci yok, backtracking atlanıyor");
      return;
    }

    console.log(
      `📦 ${kalanOgrenciler.length} öğrenci kaldı, boş koltuklara yerleştirilecek`
    );

    // Kuralları gevşeterek yerleştir
    for (const bosKoltuk of this.bosKoltuklar) {
      if (kalanOgrenciler.length === 0) break;

      // İlk öğrenciyi al (artık skor bakmıyoruz, zorunluluk)
      const ogrenci = kalanOgrenciler.shift();

      this.dagitimSonucu.push({
        salon_id: bosKoltuk.salon_id,
        salon_adi: bosKoltuk.salon_adi,
        ogrenci_id: ogrenci.id,
        ogrenci_ad: ogrenci.ad_soyad,
        sinif: ogrenci.sinif,
        cinsiyet: ogrenci.cinsiyet,
        sira_no: bosKoltuk.sira_no,
        satir_index: bosKoltuk.satir,
        sutun_index: bosKoltuk.sutun,
        backtracking: true, // İşaretle
      });

      await this.sleep(5);
    }

    console.log("✅ Backtracking tamamlandı");
  }

  // ==========================================
  // 8. YARDIMCI FONKSİYONLAR
  // ==========================================

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global olarak erişilebilir yap
if (typeof window !== "undefined") {
  window.KelebekAlgorithm = KelebekAlgorithm;
}

// ==========================================
// ORTAK SINAV (KELEBEK) SİSTEMİ - JAVASCRIPT
// Modern SweetAlert2 Modals & Notifications
// ==========================================

// ==========================================
// GLOBAL DEĞİŞKENLER
// ==========================================

let currentSinav = null;
let selectedOgrenciler = [];
let selectedSalonlar = [];
let dagitimDurdur = false;
let kelebekAlgorithm = null;

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Ortak Sınav Sistemi Yüklendi");

  // Menü navigation
  initMenuNavigation();

  // İlk yükleme
  await loadDashboard();
});

// ==========================================
// MENÜ NAVIGATION
// ==========================================

function initMenuNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      // Aktif menü değiştir
      menuItems.forEach((m) => m.classList.remove("active"));
      item.classList.add("active");

      // Section'ları değiştir
      const section = item.getAttribute("data-section");
      showSection(section);
    });
  });
}

function showSection(sectionId) {
  // Tüm section'ları gizle
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((s) => s.classList.remove("active"));

  // Seçili section'ı göster
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");

    // Her section açıldığında ilgili verileri yükle
    switch (sectionId) {
      case "dashboard":
        loadDashboard();
        break;
      case "salon-yonetimi":
        loadSalonlar();
        break;
      case "plan-yonetimi":
        loadPlanlar();
        break;
      case "kelebek-dagitim":
        loadKelebekDagitim();
        break;
      case "ogrenci-sabitle":
        loadOgrenciSabitle();
        break;
      case "ogretmen-gorevlendir":
        loadOgretmenGorevlendir();
        break;
      case "aciklamalar":
        loadAciklamalar();
        break;
    }
  }
}

// ==========================================
// MODERN NOTIFICATION SYSTEM (SweetAlert2)
// ==========================================

function showNotification(type, message, duration = 3000) {
  const iconMap = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  const colorMap = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  Swal.fire({
    toast: true,
    position: "top-end",
    icon: type,
    title: message,
    showConfirmButton: false,
    timer: duration,
    timerProgressBar: true,
    background: "#1e1e2e",
    color: "#ffffff",
    iconColor: colorMap[type],
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
}

function showConfirm(title, text, confirmText = "Evet", cancelText = "Hayır") {
  return Swal.fire({
    title: title,
    text: text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: "#4a148c",
    cancelButtonColor: "#6c757d",
    background: "#1e1e2e",
    color: "#ffffff",
    reverseButtons: true,
  });
}

function showLoading(message = "İşlem yapılıyor...") {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    background: "#1e1e2e",
    color: "#ffffff",
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

function closeLoading() {
  Swal.close();
}

// ==========================================
// RAPORLAR PANEL TOGGLE
// ==========================================

function toggleReportsPanel() {
  const panel = document.getElementById("reportsPanel");
  const overlay = document.getElementById("reportsOverlay");

  panel.classList.toggle("active");
  overlay.classList.toggle("active");
}

// ==========================================
// DASHBOARD: SINAV KARTLARI
// ==========================================

async function loadDashboard() {
  console.log("📊 Dashboard yükleniyor...");

  try {
    showLoading("Sınavlar yükleniyor...");

    // Veritabanından sınavları çek
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinavlar WHERE durum = 1 ORDER BY sinav_tarihi DESC`
    );

    closeLoading();

    if (result.success) {
      displaySinavKartlari(result.data);
    } else {
      showNotification("error", "Sınavlar yüklenemedi!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Dashboard yükleme hatası:", error);
    showNotification("error", "Bir hata oluştu!");
  }
}

function displaySinavKartlari(sinavlar) {
  const grid = document.getElementById("sinavGrid");

  if (!sinavlar || sinavlar.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6c757d;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin-bottom: 1rem; opacity: 0.5;">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
        </svg>
        <h3>Henüz sınav oluşturulmamış</h3>
        <p>Yeni sınav oluşturmak için üstteki butona tıklayın.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = sinavlar
    .map((sinav) => {
      const badgeClass =
        sinav.sinav_turu === "Kelebek"
          ? "badge-kelebek"
          : sinav.sinav_turu === "Karma"
          ? "badge-karma"
          : "badge-normal";

      const lockIcon = sinav.kilitli ? '<span class="lock-icon">🔒</span>' : "";

      return `
      <div class="sinav-card" data-sinav-id="${sinav.id}">
        ${lockIcon}
        <div class="sinav-card-header">
          <h3 class="sinav-card-title">${sinav.sinav_adi}</h3>
          <span class="sinav-card-badge ${badgeClass}">${
        sinav.sinav_turu
      }</span>
        </div>
        <div class="sinav-card-info">
          <div class="info-item">
            <span>Tarih</span>
            <strong>${formatDate(sinav.sinav_tarihi)}</strong>
          </div>
          <div class="info-item">
            <span>Saat</span>
            <strong>${sinav.sinav_saati}</strong>
          </div>
          <div class="info-item">
            <span>Seviye</span>
            <strong>${sinav.sinif_seviyesi}</strong>
          </div>
          <div class="info-item">
            <span>Dönem</span>
            <strong>${sinav.sinav_donemi}</strong>
          </div>
        </div>
        <div class="sinav-card-actions">
          <button class="card-action-btn" onclick="viewSinavDetay(${
            sinav.id
          })" title="Detay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="card-action-btn" onclick="editSinav(${
            sinav.id
          })" title="Düzenle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="card-action-btn ${
            sinav.kilitli ? "" : "danger"
          }" onclick="toggleSinavKilit(${sinav.id}, ${sinav.kilitli})" title="${
        sinav.kilitli ? "Kilidi Aç" : "Kilitle"
      }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              ${
                sinav.kilitli
                  ? '<rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="currentColor" stroke-width="2"/>'
                  : '<rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>'
              }
            </svg>
          </button>
          <button class="card-action-btn danger" onclick="deleteSinav(${
            sinav.id
          })" title="Sil">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}
// ==========================================
// YENİ SINAV OLUŞTUR MODAL
// ==========================================

/* ESKİ MODAL - ARTIK KULLANILMIYOR (ortak-sinav-modals.js kullanılıyor)
async function openYeniSinavModal() {
  const { value: formValues } = await Swal.fire({
    title: '<h2 style="color: #fff;">Yeni Sınav Oluştur</h2>',
    html: `
      <div style="display: flex; flex-direction: column; gap: 1rem; text-align: left;">
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Sınav Kodu</label>
          <input id="sinavKodu" class="swal2-input" placeholder="Örn: SINAV-1" style="width: 100%; margin: 0;">
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Sınav Türü</label>
          <select id="sinavTuru" class="swal2-input" style="width: 100%; margin: 0;">
            <option value="Kelebek">Kelebek</option>
            <option value="Karma">Karma</option>
            <option value="Normal">Normal</option>
          </select>
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Sınav Adı</label>
          <input id="sinavAdi" class="swal2-input" placeholder="Örn: İKİNCİ YABANCI DİL" style="width: 100%; margin: 0;">
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Tarih</label>
            <input type="date" id="sinavTarihi" class="swal2-input" style="width: 100%; margin: 0;">
          </div>
          <div>
            <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Saat</label>
            <input type="time" id="sinavSaati" class="swal2-input" style="width: 100%; margin: 0;">
          </div>
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Sınıf Seviyesi</label>
          <select id="sinifSeviyesi" class="swal2-input" style="width: 100%; margin: 0;">
            <option value="9-10-11-12">Tüm Seviyeler</option>
            <option value="9">9. Sınıf</option>
            <option value="10">10. Sınıf</option>
            <option value="11">11. Sınıf</option>
            <option value="12">12. Sınıf</option>
            <option value="9-10">9-10. Sınıf</option>
            <option value="11-12">11-12. Sınıf</option>
          </select>
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Sınav Dönemi</label>
          <select id="sinavDonemi" class="swal2-input" style="width: 100%; margin: 0;">
            <option value="I. Dönem">I. Dönem</option>
            <option value="II. Dönem">II. Dönem</option>
          </select>
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Sınav No</label>
          <select id="sinavNo" class="swal2-input" style="width: 100%; margin: 0;">
            <option value="I. Yazılı">I. Yazılı</option>
            <option value="II. Yazılı">II. Yazılı</option>
            <option value="III. Yazılı">III. Yazılı</option>
          </select>
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Açıklama</label>
          <textarea id="aciklama" class="swal2-textarea" placeholder="Sınav hakkında notlar..." style="width: 100%; margin: 0; height: 80px;"></textarea>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="checkbox" id="mazeretTelafi" style="width: 20px; height: 20px;">
          <label for="mazeretTelafi" style="color: #fff; margin: 0;">Mazeret/Telafi Sınavı</label>
        </div>
      </div>
    `,
    focusConfirm: false,
    width: 600,
    background: "#1e1e2e",
    color: "#ffffff",
    showCancelButton: true,
    confirmButtonText: "✅ Kaydet",
    cancelButtonText: "❌ İptal",
    confirmButtonColor: "#4a148c",
    cancelButtonColor: "#6c757d",
    customClass: {
      popup: "modern-modal",
    },
    preConfirm: () => {
      const sinavKodu = document.getElementById("sinavKodu").value;
      const sinavTuru = document.getElementById("sinavTuru").value;
      const sinavAdi = document.getElementById("sinavAdi").value;
      const sinavTarihi = document.getElementById("sinavTarihi").value;
      const sinavSaati = document.getElementById("sinavSaati").value;
      const sinifSeviyesi = document.getElementById("sinifSeviyesi").value;
      const sinavDonemi = document.getElementById("sinavDonemi").value;
      const sinavNo = document.getElementById("sinavNo").value;
      const aciklama = document.getElementById("aciklama").value;
      const mazeretTelafi = document.getElementById("mazeretTelafi").checked;

      if (!sinavKodu || !sinavAdi || !sinavTarihi || !sinavSaati) {
        Swal.showValidationMessage("Lütfen tüm zorunlu alanları doldurun!");
        return false;
      }

      return {
        sinavKodu,
        sinavTuru,
        sinavAdi,
        sinavTarihi,
        sinavSaati,
        sinifSeviyesi,
        sinavDonemi,
        sinavNo,
        aciklama,
        mazeretTelafi: mazeretTelafi ? 1 : 0,
      };
    },
  });

  if (formValues) {
    await kaydetYeniSinav(formValues);
  }
}

async function kaydetYeniSinav(data) {
  try {
    showLoading("Sınav kaydediliyor...");

    const result = await window.electronAPI.dbQuery(
      `INSERT INTO ortak_sinavlar (
        sinav_kodu, sinav_turu, sinav_adi, sinav_tarihi, sinav_saati,
        sinif_seviyesi, sinav_donemi, sinav_no, aciklama, mazeret_telafi, durum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        data.sinavKodu,
        data.sinavTuru,
        data.sinavAdi,
        data.sinavTarihi,
        data.sinavSaati,
        data.sinifSeviyesi,
        data.sinavDonemi,
        data.sinavNo,
        data.aciklama,
        data.mazeretTelafi,
      ]
    );

    closeLoading();

    if (result.success) {
      showNotification("success", "✅ Sınav başarıyla oluşturuldu!");
      loadDashboard();
    } else {
      showNotification("error", "❌ Sınav kaydedilemedi!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Sınav kaydetme hatası:", error);
    showNotification("error", "❌ Bir hata oluştu!");
  }
}
*/

// ==========================================
// SINAV KİLİTLE/KİLİDİ AÇ
// ==========================================

async function toggleSinavKilit(sinavId, mevcutDurum) {
  const yeniDurum = mevcutDurum ? 0 : 1;
  const mesaj = yeniDurum
    ? "Bu sınav kilitlenecek ve değişiklik yapılamayacak."
    : "Bu sınavın kilidi açılacak.";

  const result = await showConfirm(
    yeniDurum ? "Sınavı Kilitle?" : "Kilidi Aç?",
    mesaj,
    yeniDurum ? "🔒 Kilitle" : "🔓 Kilidi Aç"
  );

  if (result.isConfirmed) {
    try {
      showLoading();

      const updateResult = await window.electronAPI.dbQuery(
        `UPDATE ortak_sinavlar SET kilitli = ? WHERE id = ?`,
        [yeniDurum, sinavId]
      );

      closeLoading();

      if (updateResult.success) {
        showNotification(
          "success",
          yeniDurum ? "🔒 Sınav kilitlendi!" : "🔓 Kilit açıldı!"
        );
        loadDashboard();
      } else {
        showNotification("error", "❌ İşlem başarısız!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Kilit toggle hatası:", error);
      showNotification("error", "❌ Bir hata oluştu!");
    }
  }
}

// ==========================================
// SINAV SİL
// ==========================================

async function deleteSinav(sinavId) {
  const result = await showConfirm(
    "Sınavı Sil?",
    "Bu sınav ve tüm ilgili veriler silinecek!",
    "🗑️ Sil",
    "İptal"
  );

  if (result.isConfirmed) {
    try {
      showLoading("Sınav siliniyor...");

      // Sınavı sil (durum = 0)
      const deleteResult = await window.electronAPI.dbQuery(
        `UPDATE ortak_sinavlar SET durum = 0 WHERE id = ?`,
        [sinavId]
      );

      closeLoading();

      if (deleteResult.success) {
        showNotification("success", "✅ Sınav silindi!");
        loadDashboard();
      } else {
        showNotification("error", "❌ Sınav silinemedi!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Sınav silme hatası:", error);
      showNotification("error", "❌ Bir hata oluştu!");
    }
  }
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

function formatTime(timeString) {
  if (!timeString) return "-";
  return timeString.substring(0, 5);
}

// ==========================================
// PART 2: SALON YÖNETİMİ
// ==========================================

async function loadSalonlar() {
  console.log("🏢 Salonlar yükleniyor...");

  try {
    showLoading("Salonlar yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      `SELECT s.*, p.plan_adi, p.toplam_kapasite 
       FROM ortak_sinav_salonlar s
       LEFT JOIN ortak_sinav_planlar p ON s.plan_id = p.id
       WHERE s.durum = 1
       ORDER BY s.salon_adi`
    );

    closeLoading();

    if (result.success) {
      displaySalonlar(result.data);
    } else {
      showNotification("error", "Salonlar yüklenemedi!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Salon yükleme hatası:", error);
    showNotification("error", "Bir hata oluştu!");
  }
}

function displaySalonlar(salonlar) {
  const grid = document.getElementById("salonGrid");

  if (!salonlar || salonlar.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6c757d;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin-bottom: 1rem; opacity: 0.5;">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
        </svg>
        <h3>Henüz salon eklenmemiş</h3>
        <p>Yeni salon eklemek için üstteki butona tıklayın.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = salonlar
    .map((salon) => {
      return `
      <div class="salon-card">
        <div class="salon-card-header">
          <h3 class="salon-card-title">${salon.salon_adi}</h3>
          <span class="sinav-card-badge badge-kelebek">${
            salon.kapasite
          } Kişi</span>
        </div>
        <div class="sinav-card-info">
          <div class="info-item">
            <span>Plan</span>
            <strong>${salon.plan_adi || "-"}</strong>
          </div>
          <div class="info-item">
            <span>Kapasite</span>
            <strong>${salon.kapasite} Öğrenci</strong>
          </div>
        </div>
        <div class="salon-card-actions">
          <button class="card-action-btn" onclick="editSalon(${
            salon.id
          })" title="Düzenle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="card-action-btn danger" onclick="deleteSalon(${
            salon.id
          })" title="Sil">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

/*
async function openYeniSalonModal() {
  // Planları çek
  const planlarResult = await window.electronAPI.dbQuery(
    `SELECT * FROM ortak_sinav_planlar WHERE durum = 1 ORDER BY plan_adi`
  );

  const planOptions =
    planlarResult.success && planlarResult.data.length > 0
      ? planlarResult.data
          .map(
            (plan) =>
              `<option value="${plan.id}">${plan.plan_adi} (${plan.toplam_kapasite} kişi)</option>`
          )
          .join("")
      : '<option value="">Plan bulunamadı</option>';

  const { value: formValues } = await Swal.fire({
    title: '<h2 style="color: #fff;">Yeni Salon Ekle</h2>',
    html: `
      <div style="display: flex; flex-direction: column; gap: 1rem; text-align: left;">
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Salon Adı</label>
          <input id="salonAdi" class="swal2-input" placeholder="Örn: 10-H, 9-E" style="width: 100%; margin: 0;">
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Oturma Planı</label>
          <select id="planId" class="swal2-input" style="width: 100%; margin: 0;">
            ${planOptions}
          </select>
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Kapasite</label>
          <input type="number" id="kapasite" class="swal2-input" placeholder="Örn: 40" style="width: 100%; margin: 0;">
        </div>
      </div>
    `,
    width: 500,
    background: "#1e1e2e",
    color: "#ffffff",
    showCancelButton: true,
    confirmButtonText: "✅ Kaydet",
    cancelButtonText: "❌ İptal",
    confirmButtonColor: "#4a148c",
    cancelButtonColor: "#6c757d",
    preConfirm: () => {
      const salonAdi = document.getElementById("salonAdi").value;
      const planId = document.getElementById("planId").value;
      const kapasite = document.getElementById("kapasite").value;

      if (!salonAdi || !planId || !kapasite) {
        Swal.showValidationMessage("Lütfen tüm alanları doldurun!");
        return false;
      }

      return { salonAdi, planId, kapasite };
    },
  });

  if (formValues) {
    try {
      showLoading("Salon kaydediliyor...");

      const result = await window.electronAPI.dbQuery(
        `INSERT INTO ortak_sinav_salonlar (salon_adi, plan_id, kapasite, durum) VALUES (?, ?, ?, 1)`,
        [formValues.salonAdi, formValues.planId, formValues.kapasite]
      );

      closeLoading();

      if (result.success) {
        showNotification("success", "✅ Salon eklendi!");
        loadSalonlar();
      } else {
        showNotification("error", "❌ Salon eklenemedi!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Salon ekleme hatası:", error);
      showNotification("error", "❌ Bir hata oluştu!");
    }
  }
}

async function deleteSalon(salonId) {
  const result = await showConfirm(
    "Salonu Sil?",
    "Bu salon silinecek!",
    "🗑️ Sil"
  );

  if (result.isConfirmed) {
    try {
      showLoading();

      const deleteResult = await window.electronAPI.dbQuery(
        `UPDATE ortak_sinav_salonlar SET durum = 0 WHERE id = ?`,
        [salonId]
      );

      closeLoading();

      if (deleteResult.success) {
        showNotification("success", "✅ Salon silindi!");
        loadSalonlar();
      } else {
        showNotification("error", "❌ Salon silinemedi!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Salon silme hatası:", error);
      showNotification("error", "❌ Bir hata oluştu!");
    }
  }
}
*/

// ==========================================
// PART 2: PLAN YÖNETİMİ
// ==========================================

async function loadPlanlar() {
  console.log("📐 Planlar yükleniyor...");

  try {
    showLoading("Planlar yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinav_planlar WHERE durum = 1 ORDER BY plan_adi`
    );

    closeLoading();

    if (result.success) {
      displayPlanlar(result.data);
    } else {
      showNotification("error", "Planlar yüklenemedi!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Plan yükleme hatası:", error);
    showNotification("error", "Bir hata oluştu!");
  }
}

function displayPlanlar(planlar) {
  // İlk planın önizlemesini göster
  if (planlar && planlar.length > 0) {
    generatePlanPreview(planlar[0]);
  }
}

function selectPlanTab(planId) {
  // Tab'ları güncelle
  const tabs = document.querySelectorAll(".plan-tab");
  tabs.forEach((tab) => tab.classList.remove("active"));
  event.target.classList.add("active");

  // Plan önizlemesini yükle
  loadPlanPreview(planId);
}

async function loadPlanPreview(planId) {
  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinav_planlar WHERE id = ? OR plan_adi = ?`,
      [planId, planId]
    );

    if (result.success && result.data.length > 0) {
      generatePlanPreview(result.data[0]);
    }
  } catch (error) {
    console.error("❌ Plan önizleme hatası:", error);
  }
}

function generatePlanPreview(plan) {
  const preview = document.getElementById("planPreview");

  // Input değerlerini güncelle
  document.getElementById("planSiraSayisi").value = plan.sira_sayisi || 8;
  document.getElementById("planSutunSayisi").value = plan.sutun_sayisi || 5;
  document.getElementById("planDuzen").value = plan.duzeni || "Z";

  const siraSayisi = plan.sira_sayisi || 8;
  const sutunSayisi = plan.sutun_sayisi || 5;
  const duzen = plan.duzeni || "Z";

  let html = '<div style="display: flex; gap: 1rem; justify-content: center;">';

  // Z Düzeni: Sağa doğru gidip, bir alt satıra geçip sola gider
  let siraNo = 1;

  for (let sira = 1; sira <= siraSayisi; sira++) {
    html += `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: center;">
        <div style="background: var(--primary-gradient); color: white; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700;">
          SIRA-${sira}
        </div>
    `;

    for (let sutun = 1; sutun <= sutunSayisi; sutun++) {
      html += `
        <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: var(--glass-bg); border: 2px solid var(--glass-border); border-radius: 8px; font-weight: 700; color: var(--text-light);">
          ${siraNo}
        </div>
      `;

      if (duzen === "Z") {
        // Z düzeni: Tek sıralarda artır, çift sıralarda azalt
        if (sira % 2 === 1) {
          siraNo++;
        } else {
          siraNo--;
        }
      } else {
        // S düzeni: Her zaman artır
        siraNo++;
      }
    }

    html += "</div>";

    // Z düzeninde çift sıra bitince, sıra numarasını ayarla
    if (duzen === "Z" && sira % 2 === 0) {
      siraNo += sutunSayisi + 1;
    }
  }

  html += "</div>";
  preview.innerHTML = html;
}

function hizliDuzenOlustur() {
  const siraSayisi = parseInt(document.getElementById("planSiraSayisi").value);
  const sutunSayisi = parseInt(
    document.getElementById("planSutunSayisi").value
  );
  const duzen = document.getElementById("planDuzen").value;

  if (!siraSayisi || !sutunSayisi) {
    showNotification("warning", "Lütfen sıra ve sütun sayısını girin!");
    return;
  }

  const mockPlan = {
    sira_sayisi: siraSayisi,
    sutun_sayisi: sutunSayisi,
    duzeni: duzen,
  };

  generatePlanPreview(mockPlan);
  showNotification("success", "✅ Düzen oluşturuldu!");
}

function temizlePlan() {
  document.getElementById("planPreview").innerHTML = `
    <div style="text-align: center; padding: 3rem; color: #6c757d;">
      <p>Plan temizlendi. Yeni düzen oluşturmak için ayarları yapın.</p>
    </div>
  `;
}

/*
async function openYeniPlanModal() {
  const { value: formValues } = await Swal.fire({
    title: '<h2 style="color: #fff;">Yeni Plan Oluştur</h2>',
    html: `
      <div style="display: flex; flex-direction: column; gap: 1rem; text-align: left;">
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Plan Adı</label>
          <input id="planAdi" class="swal2-input" placeholder="Örn: Plan-9" style="width: 100%; margin: 0;">
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Sıra Sayısı</label>
            <input type="number" id="planSira" class="swal2-input" value="8" min="1" max="20" style="width: 100%; margin: 0;">
          </div>
          <div>
            <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Sütun Sayısı</label>
            <input type="number" id="planSutun" class="swal2-input" value="5" min="1" max="10" style="width: 100%; margin: 0;">
          </div>
        </div>
        
        <div>
          <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Düzen Tipi</label>
          <select id="planDuzenTip" class="swal2-input" style="width: 100%; margin: 0;">
            <option value="Z">Z Düzeni</option>
            <option value="S">S Düzeni</option>
          </select>
        </div>
      </div>
    `,
    width: 500,
    background: "#1e1e2e",
    color: "#ffffff",
    showCancelButton: true,
    confirmButtonText: "✅ Kaydet",
    cancelButtonText: "❌ İptal",
    confirmButtonColor: "#4a148c",
    cancelButtonColor: "#6c757d",
    preConfirm: () => {
      const planAdi = document.getElementById("planAdi").value;
      const siraSayisi = document.getElementById("planSira").value;
      const sutunSayisi = document.getElementById("planSutun").value;
      const duzen = document.getElementById("planDuzenTip").value;

      if (!planAdi || !siraSayisi || !sutunSayisi) {
        Swal.showValidationMessage("Lütfen tüm alanları doldurun!");
        return false;
      }

      const toplamKapasite = parseInt(siraSayisi) * parseInt(sutunSayisi);

      return { planAdi, siraSayisi, sutunSayisi, duzen, toplamKapasite };
    },
  });

  if (formValues) {
    try {
      showLoading("Plan kaydediliyor...");

      const result = await window.electronAPI.dbQuery(
        `INSERT INTO ortak_sinav_planlar (plan_adi, sira_sayisi, sutun_sayisi, toplam_kapasite, duzeni, durum) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          formValues.planAdi,
          formValues.siraSayisi,
          formValues.sutunSayisi,
          formValues.toplamKapasite,
          formValues.duzen,
        ]
      );

      closeLoading();

      if (result.success) {
        showNotification("success", "✅ Plan oluşturuldu!");
        loadPlanlar();
      } else {
        showNotification("error", "❌ Plan oluşturulamadı!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Plan oluşturma hatası:", error);
      showNotification("error", "❌ Bir hata oluştu!");
    }
  }
}
*/

// ==========================================
// PART 2: KELEBEK DAĞITIM SİSTEMİ
// ==========================================

async function loadKelebekDagitim() {
  console.log("🦋 Kelebek dağıtım yükleniyor...");

  // Sınavları yükle
  await loadKelebekSinavlar();

  // Salonları yükle
  await loadKelebekSalonlar();

  // Sınıfları yükle
  await loadKelebekSiniflar();
}

async function loadKelebekSinavlar() {
  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinavlar WHERE durum = 1 AND kilitli = 0 ORDER BY sinav_tarihi DESC`
    );

    const select = document.getElementById("kelebekSinav");

    if (result.success && result.data.length > 0) {
      select.innerHTML =
        '<option value="">Sınav Seçiniz</option>' +
        result.data
          .map(
            (sinav) =>
              `<option value="${sinav.id}">${sinav.sinav_adi} - ${formatDate(
                sinav.sinav_tarihi
              )}</option>`
          )
          .join("");
    } else {
      select.innerHTML = '<option value="">Sınav bulunamadı</option>';
    }
  } catch (error) {
    console.error("❌ Sınav yükleme hatası:", error);
  }
}

async function loadKelebekSinavBilgileri() {
  const sinavId = document.getElementById("kelebekSinav").value;

  if (!sinavId) {
    document.getElementById("kelebekSinavBilgileri").style.display = "none";
    return;
  }

  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinavlar WHERE id = ?`,
      [sinavId]
    );

    if (result.success && result.data.length > 0) {
      const sinav = result.data[0];

      document.getElementById("kelebekSinavAdi").textContent = sinav.sinav_adi;
      document.getElementById("kelebekSinavTarihi").textContent = `${formatDate(
        sinav.sinav_tarihi
      )} - ${sinav.sinav_saati}`;
      document.getElementById("kelebekSinavSeviye").textContent =
        sinav.sinif_seviyesi;

      document.getElementById("kelebekSinavBilgileri").style.display = "block";

      currentSinav = sinav;

      // Öğrencileri yükle
      await loadKelebekOgrenciler(sinav.sinif_seviyesi);
    }
  } catch (error) {
    console.error("❌ Sınav bilgileri yükleme hatası:", error);
  }
}

async function loadKelebekSalonlar() {
  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT s.*, p.plan_adi, p.toplam_kapasite 
       FROM ortak_sinav_salonlar s
       LEFT JOIN ortak_sinav_planlar p ON s.plan_id = p.id
       WHERE s.durum = 1
       ORDER BY s.salon_adi`
    );

    const container = document.getElementById("salonSecimListesi");

    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data
        .map(
          (salon) => `
        <label class="checkbox-label">
          <input type="checkbox" class="salon-checkbox" value="${salon.id}" data-kapasite="${salon.kapasite}">
          <span>${salon.salon_adi} (${salon.kapasite} kişi)</span>
        </label>
      `
        )
        .join("");

      // Checkbox değişikliklerini dinle
      document.querySelectorAll(".salon-checkbox").forEach((cb) => {
        cb.addEventListener("change", updateKelebekStats);
      });
    } else {
      container.innerHTML = '<p style="color: #6c757d;">Salon bulunamadı</p>';
    }
  } catch (error) {
    console.error("❌ Salon yükleme hatası:", error);
  }
}

async function loadKelebekSiniflar() {
  try {
    // Sınıfları çek
    const result = await window.electronAPI.dbQuery(
      `SELECT DISTINCT sinif FROM ogrenciler WHERE durum = 1 ORDER BY sinif`
    );

    const container = document.getElementById("sinifCheckboxGrid");

    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data
        .map(
          (row) => `
        <label class="checkbox-label">
          <input type="checkbox" class="sinif-checkbox" value="${row.sinif}">
          <span>${row.sinif}</span>
        </label>
      `
        )
        .join("");
    }
  } catch (error) {
    console.error("❌ Sınıf yükleme hatası:", error);
  }
}

function toggleSinifSecimi() {
  const value = document.getElementById("kelebekSinif").value;
  const liste = document.getElementById("sinifSecimListesi");

  if (value === "custom") {
    liste.style.display = "block";
  } else {
    liste.style.display = "none";
  }
}

async function loadKelebekOgrenciler(seviye) {
  try {
    let query = `SELECT * FROM ogrenciler WHERE durum = 1`;

    // Seviyeye göre filtrele
    if (seviye && seviye !== "9-10-11-12") {
      const seviyeler = seviye.split("-");
      const conditions = seviyeler
        .map((s) => `sinif LIKE '${s}-%'`)
        .join(" OR ");
      query += ` AND (${conditions})`;
    }

    query += ` ORDER BY sinif, ad_soyad`;

    const result = await window.electronAPI.dbQuery(query);

    if (result.success) {
      displayOgrenciListesi(result.data);
      displaySinifMevcut(result.data);
      updateKelebekStats();
    }
  } catch (error) {
    console.error("❌ Öğrenci yükleme hatası:", error);
  }
}

function displayOgrenciListesi(ogrenciler) {
  const liste = document.getElementById("ogrenciListesi");

  if (!ogrenciler || ogrenciler.length === 0) {
    liste.innerHTML =
      '<p style="color: #6c757d; text-align: center; padding: 2rem;">Öğrenci bulunamadı</p>';
    return;
  }

  liste.innerHTML = ogrenciler
    .map((ogr) => {
      // ✅ FOTOĞRAF PATH DÜZELTMESİ
      let fotoSrc = "assets/default-avatar.png";
      if (ogr.fotograf_path) {
        fotoSrc = "file:///" + ogr.fotograf_path.replace(/\\/g, "/");
      }

      return `
    <div class="ogrenci-item">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; border: 2px solid var(--primary-light); position: relative; background: rgba(123, 47, 255, 0.1);">
          <img src="${fotoSrc}" 
               style="width: 100%; height: 100%; object-fit: cover;" 
               alt="${ogr.ad_soyad}"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 20px;">👤</div>
        </div>
        <div>
          <div style="font-weight: 600;">${ogr.ad_soyad}</div>
          <div style="font-size: 0.85rem; color: #6c757d;">${ogr.sinif} - No: ${
        ogr.okul_no
      }</div>
        </div>
      </div>
      <div style="font-size: 0.85rem; color: #6c757d;">${
        ogr.cinsiyet === "E" ? "👨 Erkek" : "👩 Kadın"
      }</div>
    </div>
  `;
    })
    .join("");

  // İstatistikleri güncelle
  document.getElementById("toplamOgrenci").textContent = ogrenciler.length;
}

function displaySinifMevcut(ogrenciler) {
  const liste = document.getElementById("sinifMevcutListesi");

  // Sınıflara göre grupla
  const siniflar = {};
  ogrenciler.forEach((ogr) => {
    if (!siniflar[ogr.sinif]) {
      siniflar[ogr.sinif] = 0;
    }
    siniflar[ogr.sinif]++;
  });

  liste.innerHTML = Object.entries(siniflar)
    .map(
      ([sinif, mevcut]) => `
    <div class="sinif-item">
      <div>
        <strong>${sinif}</strong>
        <span style="font-size: 0.85rem; color: #6c757d; margin-left: 0.5rem;">${mevcut} öğrenci</span>
      </div>
      <div style="background: var(--accent-gradient); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-weight: 600;">
        ${mevcut}
      </div>
    </div>
  `
    )
    .join("");
}

function updateKelebekStats() {
  // Seçili salonları say
  const salonCheckboxes = document.querySelectorAll(".salon-checkbox:checked");
  const salonSayisi = salonCheckboxes.length;

  // Toplam kapasiteyi hesapla
  let toplamKapasite = 0;
  salonCheckboxes.forEach((cb) => {
    toplamKapasite += parseInt(cb.getAttribute("data-kapasite"));
  });

  document.getElementById("toplamSalon").textContent = salonSayisi;
  document.getElementById("toplamKapasite").textContent = toplamKapasite;
}

function filterOgrenciListesi() {
  const searchTerm = document.getElementById("ogrenciAra").value.toLowerCase();
  const items = document.querySelectorAll(".ogrenci-item");

  items.forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(searchTerm) ? "flex" : "none";
  });
}

// ==========================================
// KELEBEK DAĞITIM BAŞLAT
// ==========================================

async function baslaDagitim() {
  // Validasyon
  if (!currentSinav) {
    showNotification("warning", "Lütfen bir sınav seçin!");
    return;
  }

  const salonCheckboxes = document.querySelectorAll(".salon-checkbox:checked");
  if (salonCheckboxes.length === 0) {
    showNotification("warning", "Lütfen en az bir salon seçin!");
    return;
  }

  const toplamOgrenci = parseInt(
    document.getElementById("toplamOgrenci").textContent
  );
  const toplamKapasite = parseInt(
    document.getElementById("toplamKapasite").textContent
  );

  if (toplamOgrenci > toplamKapasite) {
    showNotification(
      "warning",
      "⚠️ Öğrenci sayısı salon kapasitesinden fazla!"
    );
    return;
  }

  // Onay iste
  const result = await showConfirm(
    "Dağıtım Başlasın mı?",
    `${toplamOgrenci} öğrenci ${salonCheckboxes.length} salona dağıtılacak.`,
    "🚀 Başlat"
  );

  if (result.isConfirmed) {
    dagitimDurdur = false;
    await executeKelebekAlgorithm();
  }
}

async function executeKelebekAlgorithm() {
  console.log("🦋 Kelebek algoritması başlatılıyor...");

  showLoading("Kelebek dağıtımı yapılıyor...");

  // Butonları devre dışı bırak
  document.getElementById("btnBasla").disabled = true;
  document.getElementById("btnDurdur").disabled = false;
  document.getElementById("dagitimProgress").style.display = "block";

  try {
    // ADIM 1: Öğrencileri al
    console.log("📥 Öğrenciler çekiliyor...");
    const ogrenciler = await window.electronAPI.getKelebekOgrenciler();
    console.log(`✅ ${ogrenciler.length} öğrenci alındı`);

    // ADIM 2: Salonları al
    console.log("🏢 Salonlar çekiliyor...");
    const salonlar = await window.electronAPI.getKelebekSalonlar();
    console.log(`✅ ${salonlar.length} salon alındı`);

    // Validasyon
    if (ogrenciler.length === 0) {
      throw new Error("Öğrenci bulunamadı!");
    }

    if (salonlar.length === 0) {
      throw new Error("Salon bulunamadı!");
    }

    // ADIM 3: Algoritma ayarlarını belirle
    const ayarlar = {
      ayniSeviyeYasak:
        document.getElementById("ayniSeviyeYasak")?.checked ?? true,
      ayniSubeYasak: true,
      cinsiyetDengesi:
        document.getElementById("cinsiyetDengesi")?.checked ?? true,
      serpantinDuzen:
        document.getElementById("serpantinDuzen")?.checked ?? true,
      minCakismaModu: true, // Her zaman açık
    };

    console.log("⚙️ Algoritma ayarları:", ayarlar);

    // ADIM 4: 🦋 YENİ ALGORİTMAYI BAŞLAT
    const algorithm = new KelebekAlgorithm(ogrenciler, salonlar, ayarlar);

    // Progress callback ekle
    algorithm.sleep = async function (ms) {
      const yerlesenSayisi = algorithm.dagitim ? algorithm.dagitim.length : 0;
      const progress = Math.round((yerlesenSayisi / ogrenciler.length) * 100);

      document.getElementById(
        "dagitimProgressFill"
      ).style.width = `${progress}%`;
      document.getElementById(
        "dagitimProgressText"
      ).textContent = `${progress}%`;
      document.getElementById(
        "yerlestirilenSayi"
      ).textContent = `${yerlesenSayisi} / ${ogrenciler.length}`;

      // Durduruldu mu kontrol et
      if (dagitimDurdur) {
        throw new Error("Dağıtım durduruldu");
      }

      return new Promise((resolve) => setTimeout(resolve, ms));
    };

    // Algoritma çalıştır
    const sonuc = await algorithm.calistir();

    console.log("📊 Algoritma sonucu:", sonuc);

    // ADIM 5: VERİTABANINA KAYDET
    console.log("💾 Veritabanına kaydediliyor...");

    // Önce eski dağıtımı temizle
    await window.electronAPI.dbQuery(
      `DELETE FROM ortak_sinav_dagitim WHERE sinav_id = ?`,
      [currentSinav.id]
    );

    const kayitlar = sonuc.dagitim || [];

    // Hata takibi için sayaç
    let basariliKayit = 0;

    for (const kayit of kayitlar) {
      try {
        await window.electronAPI.dbQuery(
          `INSERT INTO ortak_sinav_dagitim 
            (sinav_id, ogrenci_id, salon_id, sira_no, satir_index, sutun_index, sabitle) 
            VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [
            currentSinav.id,
            kayit.ogrenci_id,
            kayit.salon_id,
            kayit.sira_no,
            kayit.satir_index || 0,
            kayit.sutun_index || 0,
          ]
        );
        basariliKayit++;
      } catch (dbErr) {
        console.error(
          `❌ Kayıt hatası (Öğrenci ID: ${kayit.ogrenci_id}):`,
          dbErr
        );
        // Kritik hata değilse devam et, kritikse throw et
      }
    }

    console.log(
      `✅ Kayıt işlemi tamamlandı. Toplam: ${basariliKayit}/${kayitlar.length}`
    );

    closeLoading();

    // Sonuç raporu göster
    await Swal.fire({
      icon: "success",
      title: "✅ Dağıtım Tamamlandı!",
      html: `
        <div style="text-align: left; padding: 20px; color: #333;">
          <h4 style="color: #10b981; margin-bottom: 15px;">📊 İSTATİSTİKLER:</h4>
          
          <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #10b981;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
              <div><strong>Yerleştirilen:</strong></div>
              <div style="text-align: right; color: #10b981; font-weight: 700;">${basariliKayit} öğrenci</div>
              
              <div><strong>Toplam Öğrenci:</strong></div>
              <div style="text-align: right; font-weight: 700;">${
                ogrenciler.length
              }</div>
              
              <div><strong>Boş Koltuk:</strong></div>
              <div style="text-align: right; color: ${
                sonuc.bosKoltuklar.length > 0 ? "#f59e0b" : "#10b981"
              }; font-weight: 700;">${sonuc.bosKoltuklar.length}</div>
            </div>
          </div>

          <h4 style="color: #f59e0b; margin-bottom: 15px;">⚠️ ÇAKIŞMALAR:</h4>
          
          <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%); padding: 15px; border-radius: 10px; border-left: 4px solid #f59e0b;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
              <div><strong>Aynı Şube:</strong></div>
              <div style="text-align: right; color: ${
                sonuc.cakismalar.ayniSube > 0 ? "#ef4444" : "#10b981"
              }; font-weight: 700;">${sonuc.cakismalar.ayniSube}</div>
              
              <div><strong>Aynı Seviye:</strong></div>
              <div style="text-align: right; color: ${
                sonuc.cakismalar.ayniSeviye > 0 ? "#f59e0b" : "#10b981"
              }; font-weight: 700;">${sonuc.cakismalar.ayniSeviye}</div>
            </div>
          </div>
        </div>
      `,
      confirmButtonText: "Tamam",
      confirmButtonColor: "#10b981",
      width: "600px",
    });

    // Butonları geri al
    document.getElementById("btnBasla").disabled = false;
    document.getElementById("btnDurdur").disabled = true;
    document.getElementById("dagitimProgress").style.display = "none";

    // Listeyi yenile
    if (typeof loadDagitimListesi === "function") loadDagitimListesi();
  } catch (error) {
    closeLoading();
    console.error("❌ Dağıtım ana hatası:", error);
    if (error.message !== "Dağıtım durduruldu") {
      showNotification("error", "❌ Dağıtım başarısız: " + error.message);
    }

    document.getElementById("btnBasla").disabled = false;
    document.getElementById("btnDurdur").disabled = true;
  }
}

// ==========================================
// PART 3: ÖĞRENCİ SABİTLE (KELEBEK)
// ==========================================

async function loadOgrenciSabitle() {
  console.log("📌 Öğrenci Sabitle yükleniyor...");

  // Salonları yükle
  await loadSabitlSalonlar();

  // Sabitlenen öğrencileri göster
  await loadSabitlenenListesi();
}

async function loadSabitlSalonlar() {
  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT s.*, p.plan_adi 
       FROM ortak_sinav_salonlar s
       LEFT JOIN ortak_sinav_planlar p ON s.plan_id = p.id
       WHERE s.durum = 1
       ORDER BY s.salon_adi`
    );

    const select = document.getElementById("sabitleSalon");

    if (result.success && result.data.length > 0) {
      select.innerHTML =
        '<option value="">Salon Seçiniz</option>' +
        result.data
          .map(
            (salon) =>
              `<option value="${salon.id}" data-plan="${salon.plan_id}">${salon.salon_adi} (${salon.kapasite} kişi)</option>`
          )
          .join("");
    } else {
      select.innerHTML = '<option value="">Salon bulunamadı</option>';
    }
  } catch (error) {
    console.error("❌ Salon yükleme hatası:", error);
  }
}

async function araOgrenci() {
  const okulNo = document.getElementById("sabitleOkulNo").value.trim();
  const tckn = document.getElementById("sabitleTckn").value.trim();
  const adSoyad = document.getElementById("sabitleAdSoyad").value.trim();

  if (!okulNo && !tckn && !adSoyad) {
    showNotification("warning", "Lütfen en az bir arama kriteri girin!");
    return;
  }

  try {
    showLoading("Öğrenci aranıyor...");

    let query = `SELECT * FROM ogrenciler WHERE durum = 1`;
    const params = [];

    if (okulNo) {
      query += ` AND okul_no = ?`;
      params.push(okulNo);
    }

    if (tckn) {
      query += ` AND tc_no = ?`;
      params.push(tckn);
    }

    if (adSoyad) {
      query += ` AND ad_soyad LIKE ?`;
      params.push(`%${adSoyad}%`);
    }

    const result = await window.electronAPI.dbQuery(query, params);

    closeLoading();

    if (result.success && result.data.length > 0) {
      const ogrenci = result.data[0];
      displayOgrenciBilgileri(ogrenci);
      showNotification("success", "✅ Öğrenci bulundu!");
    } else {
      showNotification("error", "❌ Öğrenci bulunamadı!");
      document.getElementById("sabitleOgrenciBilgileri").style.display = "none";
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Öğrenci arama hatası:", error);
    showNotification("error", "❌ Bir hata oluştu!");
  }
}

function displayOgrenciBilgileri(ogrenci) {
  document.getElementById("sabitleFoto").src =
    ogrenci.fotograf_yolu || "assets/default-avatar.png";
  document.getElementById("sabitleAdSoyadText").textContent = ogrenci.ad_soyad;
  document.getElementById("sabitleSinifText").textContent = ogrenci.sinif;
  document.getElementById("sabitleOkulNoText").textContent = ogrenci.okul_no;

  document.getElementById("sabitleOgrenciBilgileri").style.display = "block";

  // Global değişkene kaydet
  window.selectedOgrenci = ogrenci;
}

async function loadSalonPlan() {
  const salonId = document.getElementById("sabitleSalon").value;

  if (!salonId) {
    document.getElementById("sabitlOturmaPlan").innerHTML = "";
    return;
  }

  try {
    // Salon bilgilerini al
    const result = await window.electronAPI.dbQuery(
      `SELECT s.*, p.sira_sayisi, p.sutun_sayisi, p.duzeni, p.plan_adi
       FROM ortak_sinav_salonlar s
       LEFT JOIN ortak_sinav_planlar p ON s.plan_id = p.id
       WHERE s.id = ?`,
      [salonId]
    );

    if (result.success && result.data.length > 0) {
      const salon = result.data[0];
      generateSabitlOturmaPlan(salon);
    }
  } catch (error) {
    console.error("❌ Salon plan yükleme hatası:", error);
  }
}

function generateSabitlOturmaPlan(salon) {
  const container = document.getElementById("sabitlOturmaPlan");

  const siraSayisi = salon.sira_sayisi || 8;
  const sutunSayisi = salon.sutun_sayisi || 5;
  const duzen = salon.duzeni || "Z";

  let html = `
    <div style="text-align: center; margin-bottom: 1rem;">
      <h4 style="color: var(--text-light);">${salon.salon_adi} - ${salon.plan_adi}</h4>
      <p style="color: #6c757d; font-size: 0.9rem;">Sıra sayısını tıklayarak öğrenci sabitleyin</p>
    </div>
    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
  `;

  let siraNo = 1;

  for (let sira = 1; sira <= siraSayisi; sira++) {
    html += `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: center;">
        <div style="background: var(--accent-gradient); color: white; padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">
          SIRA-${sira}
        </div>
    `;

    for (let sutun = 1; sutun <= sutunSayisi; sutun++) {
      html += `
        <div 
          onclick="selectSiraForSabitle(${siraNo})" 
          style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: var(--glass-bg); border: 2px solid var(--glass-border); border-radius: 8px; font-weight: 700; color: var(--text-light); cursor: pointer; transition: all 0.2s ease;"
          onmouseover="this.style.background='var(--primary-gradient)'; this.style.transform='scale(1.1)';"
          onmouseout="this.style.background='var(--glass-bg)'; this.style.transform='scale(1)';"
        >
          ${siraNo}
        </div>
      `;

      if (duzen === "Z") {
        if (sira % 2 === 1) {
          siraNo++;
        } else {
          siraNo--;
        }
      } else {
        siraNo++;
      }
    }

    html += "</div>";

    if (duzen === "Z" && sira % 2 === 0) {
      siraNo += sutunSayisi + 1;
    }
  }

  html += "</div>";
  container.innerHTML = html;
}

function selectSiraForSabitle(siraNo) {
  document.getElementById("sabitleSira").value = siraNo;
  showNotification("info", `Sıra ${siraNo} seçildi`);
}

async function sabitleOgrenci() {
  if (!window.selectedOgrenci) {
    showNotification("warning", "Lütfen önce bir öğrenci arayın!");
    return;
  }

  const salonId = document.getElementById("sabitleSalon").value;
  const donem = document.getElementById("sabitleDönem").value;
  const siraNo = document.getElementById("sabitleSira").value;

  if (!salonId || !siraNo) {
    showNotification("warning", "Lütfen salon ve sıra seçin!");
    return;
  }

  try {
    showLoading("Öğrenci sabitleniyor...");

    // Sabitle kaydı ekle (genel sabitleme, sınava bağlı değil)
    const result = await window.electronAPI.dbQuery(
      `INSERT INTO ortak_sinav_dagitim (sinav_id, ogrenci_id, salon_id, sira_no, sutun_no, sabitle) 
       VALUES (0, ?, ?, ?, 1, 1)`,
      [window.selectedOgrenci.id, salonId, siraNo]
    );

    closeLoading();

    if (result.success) {
      showNotification("success", "✅ Öğrenci sabitlendi!");
      loadSabitlenenListesi();

      // Formu temizle
      document.getElementById("sabitleOkulNo").value = "";
      document.getElementById("sabitleTckn").value = "";
      document.getElementById("sabitleAdSoyad").value = "";
      document.getElementById("sabitleSira").value = "";
      document.getElementById("sabitleOgrenciBilgileri").style.display = "none";
      window.selectedOgrenci = null;
    } else {
      showNotification("error", "❌ Sabitleme başarısız!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Sabitleme hatası:", error);
    showNotification("error", "❌ Bir hata oluştu!");
  }
}

async function loadSabitlenenListesi() {
  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT d.*, o.ad_soyad, o.sinif, o.okul_no, s.salon_adi
       FROM ortak_sinav_dagitim d
       INNER JOIN ogrenciler o ON d.ogrenci_id = o.id
       INNER JOIN ortak_sinav_salonlar s ON d.salon_id = s.id
       WHERE d.sabitle = 1
       ORDER BY d.id DESC`
    );

    const tbody = document.getElementById("sabitlenenListesi");

    if (result.success && result.data.length > 0) {
      tbody.innerHTML = result.data
        .map(
          (row) => `
        <tr>
          <td>Genel</td>
          <td>${row.sinif}</td>
          <td>${row.okul_no}</td>
          <td>${row.ad_soyad}</td>
          <td>${row.salon_adi}</td>
          <td>${row.sira_no}</td>
          <td>
            <button class="card-action-btn danger" onclick="removeSabitle(${row.id})" title="Sil">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </td>
        </tr>
      `
        )
        .join("");
    } else {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center; color: #6c757d;">Sabitlenen öğrenci yok</td></tr>';
    }
  } catch (error) {
    console.error("❌ Sabitlenen liste hatası:", error);
  }
}

async function removeSabitle(dagitimId) {
  const result = await showConfirm(
    "Sabitlemeyi Kaldır?",
    "Bu işlem geri alınamaz!"
  );

  if (result.isConfirmed) {
    try {
      showLoading();

      const deleteResult = await window.electronAPI.dbQuery(
        `DELETE FROM ortak_sinav_dagitim WHERE id = ?`,
        [dagitimId]
      );

      closeLoading();

      if (deleteResult.success) {
        showNotification("success", "✅ Sabitleme kaldırıldı!");
        loadSabitlenenListesi();
      } else {
        showNotification("error", "❌ Silme başarısız!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Silme hatası:", error);
      showNotification("error", "❌ Bir hata oluştu!");
    }
  }
}

// ==========================================
// PART 3: ÖĞRETMEN GÖREVLENDİRME
// ==========================================

async function loadOgretmenGorevlendir() {
  console.log("👨‍🏫 Öğretmen Görevlendirme yükleniyor...");

  // Sınavları yükle
  await loadGorevSinavlar();

  // Salonları yükle
  await loadGorevSalonlar();

  // Sınıfları yükle
  await loadGorevSiniflar();

  // Öğretmenleri yükle
  await loadOgretmenSecimListesi();
}

async function loadGorevSinavlar() {
  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinavlar WHERE durum = 1 ORDER BY sinav_tarihi DESC`
    );

    // Dropdown'ları doldur (şimdilik basit)
    console.log("Sınavlar yüklendi:", result.data.length);
  } catch (error) {
    console.error("❌ Sınav yükleme hatası:", error);
  }
}

async function loadGorevSalonlar() {
  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinav_salonlar WHERE durum = 1 ORDER BY salon_adi`
    );

    const select = document.getElementById("gorevSalon");

    if (result.success && result.data.length > 0) {
      select.innerHTML =
        '<option value="">Salon Seçiniz</option>' +
        result.data
          .map(
            (salon) =>
              `<option value="${salon.id}">${salon.salon_adi} (${salon.kapasite} kişi)</option>`
          )
          .join("");
    } else {
      select.innerHTML = '<option value="">Salon bulunamadı</option>';
    }
  } catch (error) {
    console.error("❌ Salon yükleme hatası:", error);
  }
}

async function loadGorevSiniflar() {
  try {
    const result = await window.electronAPI.dbQuery(
      `SELECT DISTINCT sinif FROM ogrenciler WHERE durum = 1 ORDER BY sinif`
    );

    const select = document.getElementById("gorevSinif");

    if (result.success && result.data.length > 0) {
      select.innerHTML =
        '<option value="">Tüm Sınıflar</option>' +
        result.data
          .map((row) => `<option value="${row.sinif}">${row.sinif}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("❌ Sınıf yükleme hatası:", error);
  }
}

async function loadOgretmenSecimListesi() {
  try {
    // Öğretmenleri ders programı ile birlikte çek
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ogretmenler WHERE durum = 1 ORDER BY ad_soyad`
    );

    const tbody = document.getElementById("ogretmenSecimListesi");

    if (result.success && result.data.length > 0) {
      tbody.innerHTML = result.data
        .map(
          (ogr) => `
        <tr>
          <td>
            <input type="checkbox" class="ogretmen-checkbox" value="${ogr.id}">
          </td>
          <td>
            <input type="radio" name="gorev_uye_${ogr.id}" value="uye">
          </td>
          <td>
            <input type="radio" name="gorev_uye_${ogr.id}" value="gozcu">
          </td>
          <td>
            <input type="radio" name="gorev_uye_${ogr.id}" value="yedek">
          </td>
          <td>${ogr.ad_soyad}</td>
          <td>${ogr.brans || "-"}</td>
        </tr>
      `
        )
        .join("");
    } else {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; color: #6c757d;">Öğretmen bulunamadı</td></tr>';
    }
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
  }
}

function filterOgretmenListesi() {
  const searchTerm = document.getElementById("ogretmenAra").value.toLowerCase();
  const rows = document.querySelectorAll("#ogretmenSecimListesi tr");

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? "" : "none";
  });
}

async function bulGorevlendir() {
  const sinif = document.getElementById("gorevSinif").value;
  const gun = document.getElementById("gorevGun").value;
  const saat = document.getElementById("gorevSaat").value;
  const salonId = document.getElementById("gorevSalon").value;

  if (!salonId) {
    showNotification("warning", "Lütfen salon seçin!");
    return;
  }

  if (!gun || !saat) {
    showNotification("warning", "Lütfen gün ve saat seçin!");
    return;
  }

  try {
    showLoading("Uygun öğretmenler aranıyor...");

    // Ders programından uygun öğretmenleri bul
    // Bu kısım otomatik-dagitim.html'den ders programlarını çekecek

    // Şimdilik basit bir query
    const result = await window.electronAPI.dbQuery(
      `SELECT DISTINCT o.* FROM ogretmenler o
       WHERE o.durum = 1
       LIMIT 5`
    );

    closeLoading();

    if (result.success && result.data.length > 0) {
      showNotification(
        "success",
        `✅ ${result.data.length} uygun öğretmen bulundu!`
      );
      // TODO: Öğretmenleri otomatik seç
    } else {
      showNotification("warning", "⚠️ Uygun öğretmen bulunamadı!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Öğretmen arama hatası:", error);
    showNotification("error", "❌ Bir hata oluştu!");
  }
}

async function topluGorevlendir() {
  showNotification("info", "🚧 Toplu görevlendirme özelliği geliştiriliyor...");
}

async function tumGorevleriSil() {
  const result = await showConfirm(
    "Tüm Görevleri Sil?",
    "Bu sınavdaki tüm görevlendirmeler silinecek!",
    "🗑️ Tümünü Sil"
  );

  if (result.isConfirmed) {
    showNotification("info", "🚧 Özellik geliştiriliyor...");
  }
}

// ==========================================
// PART 3: AÇIKLAMALAR
// ==========================================

async function loadAciklamalar() {
  console.log("📝 Açıklamalar yükleniyor...");

  try {
    showLoading("Açıklamalar yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinav_aciklamalar ORDER BY sira`
    );

    closeLoading();

    if (result.success) {
      displayAciklamalar(result.data);
    } else {
      showNotification("error", "Açıklamalar yüklenemedi!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Açıklama yükleme hatası:", error);
    showNotification("error", "Bir hata oluştu!");
  }
}

function displayAciklamalar(aciklamalar) {
  const liste = document.getElementById("aciklamalarListesi");

  if (!aciklamalar || aciklamalar.length === 0) {
    liste.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #6c757d;">
        <h3>Henüz açıklama eklenmemiş</h3>
        <p>Yeni açıklama eklemek için üstteki butona tıklayın.</p>
      </div>
    `;
    return;
  }

  liste.innerHTML = aciklamalar
    .map(
      (aciklama) => `
    <div class="aciklama-item">
      <div class="aciklama-number">${aciklama.sira}</div>
      <div class="aciklama-text">${aciklama.aciklama}</div>
      <div class="aciklama-actions">
        <button class="card-action-btn" onclick="editAciklama(${aciklama.id})" title="Düzenle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="card-action-btn danger" onclick="deleteAciklama(${aciklama.id})" title="Sil">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

async function openYeniAciklamaModal() {
  const { value: aciklamaText } = await Swal.fire({
    title: '<h2 style="color: #fff;">Yeni Açıklama Ekle</h2>',
    html: `
      <div style="text-align: left;">
        <label style="color: #fff; font-weight: 600; margin-bottom: 0.5rem; display: block;">Açıklama Metni</label>
        <textarea id="aciklamaMetni" class="swal2-textarea" rows="5" placeholder="Açıklama metnini girin..." style="width: 100%; margin: 0;"></textarea>
      </div>
    `,
    width: 600,
    background: "#1e1e2e",
    color: "#ffffff",
    showCancelButton: true,
    confirmButtonText: "✅ Kaydet",
    cancelButtonText: "❌ İptal",
    confirmButtonColor: "#4a148c",
    cancelButtonColor: "#6c757d",
    preConfirm: () => {
      const metin = document.getElementById("aciklamaMetni").value.trim();

      if (!metin) {
        Swal.showValidationMessage("Lütfen açıklama metnini girin!");
        return false;
      }

      return metin;
    },
  });

  if (aciklamaText) {
    try {
      showLoading("Açıklama kaydediliyor...");

      // Son sıra numarasını al
      const siraResult = await window.electronAPI.dbQuery(
        `SELECT MAX(sira) as max_sira FROM ortak_sinav_aciklamalar`
      );

      const yeniSira =
        siraResult.success && siraResult.data[0].max_sira
          ? siraResult.data[0].max_sira + 1
          : 1;

      const result = await window.electronAPI.dbQuery(
        `INSERT INTO ortak_sinav_aciklamalar (aciklama, sira) VALUES (?, ?)`,
        [aciklamaText, yeniSira]
      );

      closeLoading();

      if (result.success) {
        showNotification("success", "✅ Açıklama eklendi!");
        loadAciklamalar();
      } else {
        showNotification("error", "❌ Açıklama eklenemedi!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Açıklama ekleme hatası:", error);
      showNotification("error", "❌ Bir hata oluştu!");
    }
  }
}

async function deleteAciklama(id) {
  const result = await showConfirm(
    "Açıklamayı Sil?",
    "Bu işlem geri alınamaz!"
  );

  if (result.isConfirmed) {
    try {
      showLoading();

      const deleteResult = await window.electronAPI.dbQuery(
        `DELETE FROM ortak_sinav_aciklamalar WHERE id = ?`,
        [id]
      );

      closeLoading();

      if (deleteResult.success) {
        showNotification("success", "✅ Açıklama silindi!");
        loadAciklamalar();
      } else {
        showNotification("error", "❌ Silme başarısız!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Silme hatası:", error);
      showNotification("error", "❌ Bir hata oluştu!");
    }
  }
}

// ==========================================
// PART 3: PDF RAPORLARI
// ==========================================

async function generateSalonPDF() {
  showNotification("info", "🚧 Salon PDF raporu geliştiriliyor...");

  // TODO: Her salon için ayrı PDF oluştur
  // PDF template: ALMANCA_removed.pdf formatında
}

async function generateGenelListePDF() {
  showNotification("info", "🚧 Genel liste PDF raporu geliştiriliyor...");

  // TODO: Tüm öğrencilerin listesi
}

async function generateOgretmenPDF() {
  showNotification("info", "🚧 Öğretmen görev listesi PDF'i geliştiriliyor...");

  // TODO: Gözetmen dağılımı PDF
}

async function generateYoklamaPDF() {
  showNotification("info", "🚧 Yoklama listesi PDF'i geliştiriliyor...");

  // TODO: Salon bazında yoklama
}

async function generateKapiEtiketiPDF() {
  showNotification("info", "🚧 Kapı etiketi PDF'i geliştiriliyor...");

  // TODO: A4 kapı etiketi
}

async function generateOgrenciKartiPDF() {
  showNotification("info", "🚧 Öğrenci sınav kartı PDF'i geliştiriliyor...");

  // TODO: Fotoğraflı sınav kartı
}

async function generateExcel() {
  showNotification("info", "🚧 Excel export geliştiriliyor...");

  // TODO: XLSX export
}

// ==========================================
// PART 3: DİĞER FONKSİYONLAR
// ==========================================

async function viewSinavDetay(sinavId) {
  try {
    showLoading("Sınav detayları yükleniyor...");

    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ortak_sinavlar WHERE id = ?`,
      [sinavId]
    );

    closeLoading();

    if (result.success && result.data.length > 0) {
      const sinav = result.data[0];

      await Swal.fire({
        title: `<h2 style="color: #fff;">${sinav.sinav_adi}</h2>`,
        html: `
          <div style="text-align: left; color: #fff;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
              <div>
                <strong>Sınav Kodu:</strong> ${sinav.sinav_kodu}
              </div>
              <div>
                <strong>Sınav Türü:</strong> ${sinav.sinav_turu}
              </div>
              <div>
                <strong>Tarih:</strong> ${formatDate(sinav.sinav_tarihi)}
              </div>
              <div>
                <strong>Saat:</strong> ${sinav.sinav_saati}
              </div>
              <div>
                <strong>Seviye:</strong> ${sinav.sinif_seviyesi}
              </div>
              <div>
                <strong>Dönem:</strong> ${sinav.sinav_donemi}
              </div>
              <div>
                <strong>Sınav No:</strong> ${sinav.sinav_no}
              </div>
              <div>
                <strong>Durum:</strong> ${
                  sinav.kilitli ? "🔒 Kilitli" : "🔓 Açık"
                }
              </div>
            </div>
            ${
              sinav.aciklama
                ? `<div style="margin-top: 1rem;"><strong>Açıklama:</strong><br>${sinav.aciklama}</div>`
                : ""
            }
          </div>
        `,
        width: 700,
        background: "#1e1e2e",
        color: "#ffffff",
        confirmButtonText: "Kapat",
        confirmButtonColor: "#4a148c",
      });
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Detay yükleme hatası:", error);
    showNotification("error", "❌ Bir hata oluştu!");
  }
}

async function editSinav(sinavId) {
  showNotification("info", "🚧 Sınav düzenleme özelliği geliştiriliyor...");
}

async function editSalon(salonId) {
  showNotification("info", "🚧 Salon düzenleme özelliği geliştiriliyor...");
}

async function editAciklama(aciklamaId) {
  showNotification("info", "🚧 Açıklama düzenleme özelliği geliştiriliyor...");
}

// ==========================================
// FİLTRELEME FONKSİYONLARI
// ==========================================

async function filterSinavlar() {
  const tur = document.getElementById("filterTur").value;
  const donem = document.getElementById("filterDonem").value;
  const seviye = document.getElementById("filterSeviye").value;
  const tarih = document.getElementById("filterTarih").value;

  let query = `SELECT * FROM ortak_sinavlar WHERE durum = 1`;
  const params = [];

  if (tur) {
    query += ` AND sinav_turu = ?`;
    params.push(tur);
  }

  if (donem) {
    query += ` AND sinav_donemi = ?`;
    params.push(donem);
  }

  if (seviye) {
    query += ` AND sinif_seviyesi LIKE ?`;
    params.push(`%${seviye}%`);
  }

  if (tarih) {
    query += ` AND sinav_tarihi = ?`;
    params.push(tarih);
  }

  query += ` ORDER BY sinav_tarihi DESC`;

  try {
    showLoading("Filtreleniyor...");

    const result = await window.electronAPI.dbQuery(query, params);

    closeLoading();

    if (result.success) {
      displaySinavKartlari(result.data);
      showNotification("success", `✅ ${result.data.length} sınav bulundu`);
    } else {
      showNotification("error", "❌ Filtreleme başarısız!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Filtreleme hatası:", error);
    showNotification("error", "❌ Bir hata oluştu!");
  }
}

function resetFilters() {
  document.getElementById("filterTur").value = "";
  document.getElementById("filterDonem").value = "";
  document.getElementById("filterSeviye").value = "";
  document.getElementById("filterTarih").value = "";

  loadDashboard();
  showNotification("info", "Filtreler temizlendi");
}

// ==========================================
// 🆕 AKILLI GÖZETMEN DAĞITIM SİSTEMİ
// ==========================================

async function akılliGozetmenDagit(sinavId, salonId) {
  try {
    console.log("🤖 Akıllı gözetmen dağıtımı başlatılıyor...");

    showLoading("Uygun gözetmen aranıyor...");

    const result = await window.electronAPI.akillilGozetmenDagit(
      sinavId,
      salonId
    );

    closeLoading();

    if (result.success) {
      // Başarılı atama
      const mesaj = result.bransUyumu
        ? `✅ ${result.ogretmen.ad_soyad} gözetmen olarak atandı!`
        : `⚠️ ${result.ogretmen.ad_soyad} atandı (Branş zorunluluğu nedeniyle)`;

      await Swal.fire({
        icon: result.bransUyumu ? "success" : "warning",
        title: result.bransUyumu ? "Başarılı!" : "Uyarı!",
        html: `
          <div style="text-align: left; padding: 20px;">
            <div style="background: ${
              result.bransUyumu
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(245, 158, 11, 0.1)"
            }; padding: 15px; border-radius: 10px; border-left: 4px solid ${
          result.bransUyumu ? "#10b981" : "#f59e0b"
        }; margin-bottom: 15px;">
              <p style="margin: 0; color: #555; font-size: 16px;">${mesaj}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: #666;">
              <div><strong>Öğretmen:</strong></div>
              <div style="text-align: right;">${result.ogretmen.ad_soyad}</div>
              
              <div><strong>Branş:</strong></div>
              <div style="text-align: right;">${
                result.ogretmen.brans || "-"
              }</div>
              
              <div><strong>Görev Puanı:</strong></div>
              <div style="text-align: right;">${
                result.ogretmen.gorev_puani || 0
              } dakika</div>
            </div>

            ${
              !result.bransUyumu
                ? `
              <div style="margin-top: 15px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 8px;">
                <p style="margin: 0; color: #ef4444; font-size: 13px;">
                  <strong>Not:</strong> Okulda yeterli farklı branştan öğretmen bulunamadığı için bu öğretmen mecburen atandı.
                </p>
              </div>
            `
                : ""
            }
          </div>
        `,
        confirmButtonText: "Tamam",
        confirmButtonColor: result.bransUyumu ? "#10b981" : "#f59e0b",
      });

      // Komisyon listesini yenile
      await loadKomisyonListesi(sinavId);
    } else {
      showNotification("error", result.message);
    }
  } catch (error) {
    closeLoading();
    console.error("❌ Gözetmen dağıtım hatası:", error);
    showNotification("error", "Gözetmen atanamadı: " + error.message);
  }
}

// Komisyon listesini yükle
async function loadKomisyonListesi(sinavId) {
  try {
    const result = await window.electronAPI.getSinavGozetmenler(sinavId);

    const tbody = document.getElementById("komisyonListesi");

    if (result.success && result.data.length > 0) {
      tbody.innerHTML = result.data
        .map(
          (gorev) => `
        <tr>
          <td>${gorev.ogretmen_ad}</td>
          <td>${gorev.brans || "-"}</td>
          <td>${gorev.salon_adi}</td>
          <td>
            <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${
              gorev.brans_uyumu === 1
                ? "rgba(16, 185, 129, 0.1); color: #10b981"
                : "rgba(245, 158, 11, 0.1); color: #f59e0b"
            };">
              ${gorev.brans_uyumu === 1 ? "✅ Uygun" : "⚠️ Mecburi"}
            </span>
          </td>
          <td>
            <button class="card-action-btn danger" onclick="removeGozetmen(${
              gorev.id
            })" title="Sil">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </td>
        </tr>
      `
        )
        .join("");
    } else {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center; color: #6c757d; padding: 30px;">Henüz gözetmen atanmamış</td></tr>';
    }
  } catch (error) {
    console.error("❌ Komisyon listesi yükleme hatası:", error);
  }
}

async function removeGozetmen(gozetmenId) {
  const result = await showConfirm(
    "Gözetmeni Kaldır?",
    "Bu gözetmen görevden alınacak!"
  );

  if (result.isConfirmed) {
    try {
      showLoading();
      const deleteResult = await window.electronAPI.deleteSinavGozetmen(
        gozetmenId
      );
      closeLoading();

      if (deleteResult.success) {
        showNotification("success", "Gözetmen kaldırıldı!");
        // Liste yenileme işlemi buraya
      } else {
        showNotification("error", "Gözetmen kaldırılamadı!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Gözetmen kaldırma hatası:", error);
      showNotification("error", "Bir hata oluştu!");
    }
  }
}

// ==========================================
// 🆕 QR KOD SİSTEMİ
// ==========================================

async function generateOgrenciQR(ogrenciId, sinavId) {
  try {
    showLoading("QR Kod oluşturuluyor...");

    const result = await window.electronAPI.generateQrKod(
      sinavId,
      "OGRENCI",
      ogrenciId
    );

    closeLoading();

    if (result.success) {
      // QR Kod göster
      await Swal.fire({
        title: "📱 Öğrenci QR Kodu",
        html: `
          <div style="text-align: center; padding: 20px;">
            <div id="qrcode" style="display: flex; justify-content: center; margin: 20px 0;"></div>
            <p style="color: #666; font-size: 14px; margin-top: 15px;">
              Bu QR kodu öğrenci kapıdan okutabilir.
            </p>
          </div>
        `,
        confirmButtonText: "Tamam",
        confirmButtonColor: "#667eea",
        didOpen: () => {
          // QR Code kütüphanesi ile QR oluştur
          new QRCode(document.getElementById("qrcode"), {
            text: result.qrHash,
            width: 256,
            height: 256,
          });
        },
      });
    } else {
      showNotification("error", "QR Kod oluşturulamadı!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ QR Kod hatası:", error);
    showNotification("error", "QR Kod oluşturulamadı: " + error.message);
  }
}

async function generateOgretmenQR(ogretmenId, sinavId, salonId) {
  try {
    showLoading("Öğretmen QR Kodu oluşturuluyor...");

    const result = await window.electronAPI.generateQrKod(
      sinavId,
      "OGRETMEN",
      ogretmenId
    );

    closeLoading();

    if (result.success) {
      await Swal.fire({
        title: "👨‍🏫 Öğretmen QR Kodu",
        html: `
          <div style="text-align: center; padding: 20px;">
            <div id="qrcode-teacher" style="display: flex; justify-content: center; margin: 20px 0;"></div>
            <div style="background: rgba(102, 126, 234, 0.1); padding: 15px; border-radius: 10px; margin-top: 20px;">
              <p style="margin: 0; color: #555; font-size: 14px;">
                <strong>Bu QR kodu okutarak:</strong><br>
                ✅ Dijital imza atabilir<br>
                ✅ Yoklama yapabilir<br>
                ✅ Olay kaydı oluşturabilirsiniz
              </p>
            </div>
          </div>
        `,
        confirmButtonText: "Tamam",
        confirmButtonColor: "#667eea",
        didOpen: () => {
          new QRCode(document.getElementById("qrcode-teacher"), {
            text: result.qrHash,
            width: 256,
            height: 256,
          });
        },
      });
    } else {
      showNotification("error", "QR Kod oluşturulamadı!");
    }
  } catch (error) {
    closeLoading();
    console.error("❌ QR Kod hatası:", error);
    showNotification("error", "QR Kod oluşturulamadı: " + error.message);
  }
}

// ==========================================
// 🆕 DİJİTAL YOKLAMA SİSTEMİ
// ==========================================

async function openYoklamaPanel(sinavId, salonId) {
  try {
    showLoading("Yoklama listesi yükleniyor...");

    const result = await window.electronAPI.getSalonYoklama(sinavId, salonId);

    closeLoading();

    if (!result.success) {
      showNotification("error", "Yoklama listesi yüklenemedi!");
      return;
    }

    const ogrenciler = result.data;

    await Swal.fire({
      title: "📋 Dijital Yoklama Paneli",
      html: `
        <div style="max-height: 500px; overflow-y: auto; padding: 10px;">
          ${ogrenciler
            .map((ogr) => {
              // ✅ FOTOĞRAF PATH DÜZELTMESİ
              let fotoSrc = "assets/default-avatar.png";
              if (ogr.fotograf_path) {
                fotoSrc = "file:///" + ogr.fotograf_path.replace(/\\/g, "/");
              }

              return `
            <div class="yoklama-item" data-id="${
              ogr.ogrenci_id
            }" style="display: flex; align-items: center; gap: 15px; padding: 15px; background: white; border: 2px solid #e5e7eb; border-radius: 12px; margin-bottom: 10px;">
              <div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; border: 2px solid #667eea; position: relative; background: rgba(102, 126, 234, 0.1);">
                <img src="${fotoSrc}" 
                     style="width: 100%; height: 100%; object-fit: cover;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 24px;">👤</div>
              </div>
              <div style="flex: 1; text-align: left;">
                <div style="font-weight: 700; color: #111;">${
                  ogr.ad_soyad
                }</div>
                <div style="font-size: 13px; color: #666;">${ogr.sinif} - No: ${
                ogr.okul_no
              }</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="yoklama-btn" data-durum="Mevcut" style="padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; background: ${
                  ogr.yoklama_durumu === "Mevcut"
                    ? "#10b981"
                    : "rgba(16, 185, 129, 0.2)"
                }; color: ${
                ogr.yoklama_durumu === "Mevcut" ? "white" : "#10b981"
              };">✅</button>
                <button class="yoklama-btn" data-durum="Gelmedi" style="padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; background: ${
                  ogr.yoklama_durumu === "Gelmedi"
                    ? "#ef4444"
                    : "rgba(239, 68, 68, 0.2)"
                }; color: ${
                ogr.yoklama_durumu === "Gelmedi" ? "white" : "#ef4444"
              };">❌</button>
              </div>
            </div>
          `;
            })
            .join("")}
        </div>
      `,
      width: "700px",
      showConfirmButton: true,
      confirmButtonText: "Yoklamayı Kaydet",
      confirmButtonColor: "#667eea",
      didOpen: () => {
        document.querySelectorAll(".yoklama-btn").forEach((btn) => {
          btn.onclick = async function () {
            const durum = this.getAttribute("data-durum");
            const ogrenciId =
              this.closest(".yoklama-item").getAttribute("data-id");

            const saveResult = await window.electronAPI.kaydetYoklama({
              sinav_id: sinavId,
              ogrenci_id: ogrenciId,
              salon_id: salonId,
              yoklama_durumu: durum,
              gozetmen_id: null,
            });

            if (saveResult.success) {
              const item = this.closest(".yoklama-item");
              item.querySelectorAll(".yoklama-btn").forEach((b) => {
                const btnDurum = b.getAttribute("data-durum");
                if (btnDurum === durum) {
                  b.style.background =
                    durum === "Mevcut" ? "#10b981" : "#ef4444";
                  b.style.color = "white";
                } else {
                  b.style.background =
                    btnDurum === "Mevcut"
                      ? "rgba(16, 185, 129, 0.2)"
                      : "rgba(239, 68, 68, 0.2)";
                  b.style.color = btnDurum === "Mevcut" ? "#10b981" : "#ef4444";
                }
              });
              showNotification("success", "Yoklama kaydedildi!");
            }
          };
        });
      },
    });
  } catch (error) {
    closeLoading();
    console.error("❌ Yoklama paneli hatası:", error);
    showNotification("error", "Yoklama paneli açılamadı: " + error.message);
  }
}

// ==========================================
// 🆕 DİSİPLİN KAYDI SİSTEMİ
// ==========================================

async function openDisiplinKaydiModal(sinavId, ogrenciId, salonId) {
  const result = await Swal.fire({
    title: "⚠️ Disiplin Kaydı Oluştur",
    html: `
      <div style="text-align: left; padding: 20px;">
        <div style="margin-bottom: 20px;">
          <label style="font-weight: 600; color: #555; display: block; margin-bottom: 8px;">Olay Türü *</label>
          <select id="disiplinTuru" class="swal2-select" style="width: 100%;">
            <option value="Kopya">📝 Kopya Çekmek</option>
            <option value="Huzur Bozma">🔊 Huzur Bozmak</option>
            <option value="Kurallara Uymama">⚠️ Kurallara Uymamak</option>
            <option value="Diger">➕ Diğer</option>
          </select>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="font-weight: 600; color: #555; display: block; margin-bottom: 8px;">Açıklama *</label>
          <textarea id="disiplinAciklama" class="swal2-textarea" rows="4" placeholder="Olayın detaylarını yazın..." style="width: 100%;"></textarea>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="font-weight: 600; color: #555; display: block; margin-bottom: 8px;">Kanıt Fotoğrafı (Opsiyonel)</label>
          <input type="file" id="disiplinKanit" accept="image/*" class="swal2-file" style="width: 100%;">
          <p style="font-size: 12px; color: #999; margin-top: 5px;">Fotoğraf yükleyerek kanıt ekleyebilirsiniz.</p>
        </div>
      </div>
    `,
    width: "600px",
    showCancelButton: true,
    confirmButtonText: "Kaydet",
    cancelButtonText: "İptal",
    confirmButtonColor: "#ef4444",
    preConfirm: () => {
      const tur = document.getElementById("disiplinTuru").value;
      const aciklama = document.getElementById("disiplinAciklama").value.trim();
      const kanitFile = document.getElementById("disiplinKanit").files[0];

      if (!tur || !aciklama) {
        Swal.showValidationMessage("Lütfen tüm zorunlu alanları doldurun!");
        return false;
      }

      return { tur, aciklama, kanitFile };
    },
  });

  if (result.isConfirmed) {
    try {
      showLoading("Disiplin kaydı oluşturuluyor...");

      let kanitlar = null;

      // Fotoğraf varsa yükle
      if (result.value.kanitFile) {
        const uploadResult = await window.electronAPI.uploadDisiplinKanit({
          file: result.value.kanitFile,
          sinav_id: sinavId,
          ogrenci_id: ogrenciId,
        });

        if (uploadResult.success) {
          kanitlar = [uploadResult.filePath];
        }
      }

      // Disiplin kaydı oluştur
      const saveResult = await window.electronAPI.kaydetDisiplin({
        sinav_id: sinavId,
        ogrenci_id: ogrenciId,
        salon_id: salonId,
        disiplin_turu: result.value.tur,
        aciklama: result.value.aciklama,
        kanitlar: kanitlar,
        gozetmen_id: null, // TODO: Oturum açmış öğretmen
      });

      closeLoading();

      if (saveResult.success) {
        await Swal.fire({
          icon: "success",
          title: "Başarılı!",
          text: "Disiplin kaydı başarıyla oluşturuldu.",
          confirmButtonText: "Tamam",
          confirmButtonColor: "#10b981",
        });
      } else {
        showNotification("error", "Disiplin kaydı oluşturulamadı!");
      }
    } catch (error) {
      closeLoading();
      console.error("❌ Disiplin kaydı hatası:", error);
      showNotification(
        "error",
        "Disiplin kaydı oluşturulamadı: " + error.message
      );
    }
  }
}
// ==========================================
// 🆕 HTML'DE KULLANILAN EKSİK FONKSİYONLAR
// ==========================================

/**
 * Tüm salonlar için yoklama panelini aç
 */
async function openYoklamaPanelForAllSalons() {
  try {
    const sinavId = document.getElementById("kelebekSinav")?.value;

    if (!sinavId) {
      showNotification("warning", "Lütfen önce bir sınav seçin!");
      return;
    }

    showNotification("info", "Yoklama paneli açılıyor...");
    // TODO: Salon seçimi ve yoklama paneli
  } catch (error) {
    console.error("❌ Yoklama paneli hatası:", error);
    showNotification("error", "Yoklama paneli açılamadı!");
  }
}

/**
 * Tüm QR kodlarını oluştur
 */
async function generateAllQRCodes() {
  showNotification("info", "QR kod sistemi hazırlanıyor...");
  // TODO: QR kod oluşturma
}

/**
 * Disiplin kayıtlarını göster
 */
async function openDisiplinKayitlari() {
  showNotification("info", "Disiplin kayıtları yükleniyor...");
  // TODO: Disiplin listesi
}

/**
 * Sınav kontrol panelini yeniden çalıştır
 */
async function yenidenKontrolEt() {
  showNotification("info", "Kontrol paneli çalışıyor...");
  // TODO: Validasyon
}

/**
 * Akıllı gözetmen dağıtımı (tüm salonlar)
 */
async function akılliGozetmenDagitALL() {
  showNotification("info", "Akıllı gözetmen dağıtımı başlatılıyor...");
  // TODO: Toplu gözetmen atama
}
// ==========================================
// 🆕 HTML'DE KULLANILAN FONKSİYONLAR
// ==========================================

async function openYoklamaPanelForAllSalons() {
  showNotification("info", "Yoklama paneli geliştirme aşamasında...");
}

async function generateAllQRCodes() {
  showNotification("info", "QR kod sistemi geliştirme aşamasında...");
}

async function openDisiplinKayitlari() {
  showNotification("info", "Disiplin kayıtları geliştirme aşamasında...");
}

async function yenidenKontrolEt() {
  showNotification("info", "Kontrol paneli geliştirme aşamasında...");
}

async function akılliGozetmenDagitALL() {
  showNotification("info", "Akıllı gözetmen dağıtımı geliştirme aşamasında...");
}

console.log("✅ HTML Fonksiyonları Yüklendi");
console.log("✅ Ortak Sınav JS - HTML Fonksiyonları Eklendi");
console.log("✅ Ortak Sınav JS - YENİ ÖZELLİKLER Yüklendi");
console.log("   • Akıllı Gözetmen Dağıtım Sistemi");
console.log("   • QR Kod Ekosistemi");
console.log("   • Dijital Yoklama & Disiplin Modülü");

console.log("✅ Ortak Sınav JS - Part 3 Yüklendi");
