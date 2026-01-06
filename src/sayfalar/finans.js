// ==========================================
// FİNANS YÖNETİMİ JS (TAM VE GÜNCEL)
// ==========================================

// 1. ELECTRON BAĞLANTISI
const { ipcRenderer } = require("electron");

// Global Değişkenler
let allSchools = [];

// Sayfa yüklendiğinde çalışacak ana fonksiyon
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Finans sayfası yüklendi");

  // Veritabanından verileri çek
  await loadFinanceData();

  // Event Listener'ları başlat
  initFinanceEventListeners();
});

// 2. VERİTABANINDAN VERİLERİ ÇEKME
async function loadFinanceData() {
  try {
    // Backend'den okulları al
    const result = await ipcRenderer.invoke("get-all-schools");

    if (result.success) {
      allSchools = result.data;
      console.log("📋 Okullar başarıyla yüklendi:", allSchools.length);

      renderFinanceDashboard();
      updateFinanceStats();
      loadOkulListesiForSelect();
    } else {
      console.error("❌ Okullar yüklenemedi:", result.message);
    }
  } catch (error) {
    console.error("❌ Veritabanı bağlantı hatası:", error);
  }
}

// 3. TABLOYU OLUŞTURMA (Dinamik Veri İle)
function renderFinanceDashboard() {
  const tbody = document.getElementById("finansTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const bugun = new Date();

  allSchools.forEach((okul) => {
    const bitisTarihi = new Date(okul.lisans_bitis);
    const farkZamani = bitisTarihi - bugun;
    const kalanGun = Math.ceil(farkZamani / (1000 * 60 * 60 * 24));

    let durumClass = "";
    let durumText = "";

    if (kalanGun <= 0) {
      durumClass = "badge-expired";
      durumText = "❌ Süresi Doldu";
    } else if (kalanGun <= 30) {
      durumClass = "badge-warning";
      durumText = `⚠️ Kritik (${kalanGun} Gün)`;
    } else {
      durumClass = "badge-active";
      durumText = "✅ Aktif";
    }

    const row = `
            <tr>
                <td>
                    <div class="school-cell">
                        <span class="school-name"><strong>${
                          okul.okul_adi
                        }</strong></span>
                        <span class="school-code">Kod: ${okul.okul_kodu}</span>
                    </div>
                </td>
                <td>${okul.il} / ${okul.ilce}</td>
                <td>${new Date(okul.lisans_bitis).toLocaleDateString(
                  "tr-TR"
                )}</td>
                <td>
                    <span class="days-left" style="color: ${
                      kalanGun <= 15 ? "#ff6b6b" : "inherit"
                    }">
                        ${kalanGun > 0 ? kalanGun + " Gün" : "Süre Doldu"}
                    </span>
                </td>
                <td><strong>5.000 ₺</strong></td>
                <td><span class="status-badge ${durumClass}">${durumText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="openPaymentModal('${
                          okul.id
                        }', '${okul.okul_adi}')" title="Ödeme Al">💰</button>
                        <button class="btn-icon" onclick="showHistory('${
                          okul.id
                        }')" title="Geçmiş">📜</button>
                    </div>
                </td>
            </tr>
        `;
    tbody.innerHTML += row;
  });
}

// 4. İSTATİSTİKLERİ GÜNCELLE
function updateFinanceStats() {
  const bugun = new Date();
  const stats = {
    toplam: 0,
    beklenen: 0,
    dolan: allSchools.filter((o) => new Date(o.lisans_bitis) < bugun).length,
    aktif: allSchools.filter((o) => new Date(o.lisans_bitis) >= bugun).length,
  };

  // Beklenen ödeme hesabı (30 gün altındakiler)
  const kritikOkullar = allSchools.filter((o) => {
    const kalan = (new Date(o.lisans_bitis) - bugun) / (1000 * 60 * 60 * 24);
    return kalan > 0 && kalan <= 30;
  });
  stats.beklenen = kritikOkullar.length * 5000;

  // Arayüzü güncelle
  if (document.getElementById("toplamTahsilat"))
    document.getElementById("toplamTahsilat").innerText = "--- ₺";

  if (document.getElementById("beklenenOdemeler"))
    document.getElementById("beklenenOdemeler").innerText =
      stats.beklenen.toLocaleString("tr-TR") + " ₺";

  if (document.getElementById("suresiDolanlar"))
    document.getElementById("suresiDolanlar").innerText = stats.dolan;

  if (document.getElementById("aktifOkulSayisi"))
    document.getElementById("aktifOkulSayisi").innerText = stats.aktif;
}

// 5. ÖDEME MODALINI AÇ
function openPaymentModal(okulId, okulAdi) {
  const modal = document.getElementById("modalOdemeAl");
  const select = document.getElementById("odemeOkulSecimi");

  if (select) select.value = okulId;
  if (modal) modal.style.display = "flex";
}

// 6. ÖDEME FORMU GÖNDERİMİ
function initFinanceEventListeners() {
  const form = document.getElementById("formOdemeAl");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const okulId = document.getElementById("odemeOkulSecimi").value;
      const tutar = document.getElementById("odemeTutarı").value;
      const yontem = document.getElementById("odemeYontemi").value;

      try {
        // Backend'e lisans yenileme isteği gönder
        const result = await ipcRenderer.invoke(
          "renew-license",
          parseInt(okulId),
          1,
          { tutar, yontem }
        );

        if (result.success) {
          if (window.showNotification) {
            showNotification(
              "Ödeme başarıyla alındı ve lisans 1 yıl uzatıldı!",
              "success"
            );
          } else {
            alert("Ödeme başarıyla alındı ve lisans 1 yıl uzatıldı!");
          }
          closeModal("modalOdemeAl");
          await loadFinanceData(); // Listeyi yenile
        } else {
          alert("Hata: " + result.message);
        }
      } catch (err) {
        console.error("Lisans yenileme hatası:", err);
      }
    });
  }
}

// 7. GEÇMİŞ (TAHSİLAT) ÖZELLİĞİ
async function showHistory(okulId) {
  const okul = allSchools.find((o) => o.id == okulId);
  if (!okul) return;

  const historyModal = document.getElementById("modalGecmis");
  const historyTitle = document.getElementById("gecmisOkulAdi");
  if (historyTitle) historyTitle.innerText = okul.okul_adi;

  try {
    const result = await ipcRenderer.invoke("get-school-payments", okulId);
    const tbody = document.getElementById("gecmisTbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (result.success && result.data.length > 0) {
      result.data.forEach((odeme) => {
        tbody.innerHTML += `
                    <tr>
                        <td><span class="date-badge">${new Date(
                          odeme.odeme_tarihi
                        ).toLocaleDateString("tr-TR")}</span></td>
                        <td><strong>${parseFloat(odeme.tutar).toLocaleString(
                          "tr-TR"
                        )} ₺</strong></td>
                        <td><span class="method-tag">${
                          odeme.odeme_yontemi
                        }</span></td>
                        <td><small>${
                          odeme.aciklama || "Lisans Yenileme"
                        }</small></td>
                        <td>
                            <button class="btn-print-mini" onclick="printReceipt(${
                              odeme.id
                            })">🖨️</button>
                        </td>
                    </tr>
                `;
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Henüz ödeme kaydı bulunamadı.</td></tr>`;
    }

    if (historyModal) {
      historyModal.style.display = "flex";
      historyModal.classList.add("modal-active");
    }
  } catch (error) {
    console.error("Geçmiş yükleme hatası:", error);
    alert(
      "Ödeme geçmişi yüklenirken bir hata oluştu. Backend handler'ı (get-school-payments) kontrol edin."
    );
  }
}

// 8. YARDIMCI FONKSİYONLAR
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("modal-active");
  }
}

function loadOkulListesiForSelect() {
  const select = document.getElementById("odemeOkulSecimi");
  if (!select) return;

  select.innerHTML = allSchools
    .map((o) => `<option value="${o.id}">${o.okul_adi}</option>`)
    .join("");
}

function printReceipt(odemeId) {
  console.log("Yazdırılacak Ödeme ID:", odemeId);
  alert(odemeId + " nolu ödeme için makbuz hazırlanıyor...");
}
