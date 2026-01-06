// ==========================================
// GİRİŞ SAYFASI - LİSANS SİSTEMLİ (DEBUG)
// ==========================================

// Electron API'yi al
const { ipcRenderer } = require("electron");

// DOM elemanları
const girisForm = document.getElementById("girisForm");
const btnGiris = document.getElementById("btnGiris");
const btnUploadLicense = document.getElementById("btnUploadLicense");
const alertBox = document.getElementById("alertBox");
const versionText = document.getElementById("versionText");

// Modal elemanları
const licenseModal = document.getElementById("licenseModal");
const btnCloseModal = document.getElementById("btnCloseModal");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const licenseInfo = document.getElementById("licenseInfo");
const infoOkulKodu = document.getElementById("infoOkulKodu");
const infoOkulAdi = document.getElementById("infoOkulAdi");

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Giriş sayfası yüklendi");

  // Versiyon bilgisini al
  try {
    const appInfo = await ipcRenderer.invoke("get-app-info");
    versionText.textContent = `v${appInfo.version} - 2025`;
  } catch (error) {
    console.error("Versiyon alınamadı:", error);
  }

  // Beni hatırla kontrolü
  const hatirlanmisBilgiler = localStorage.getItem("giris_bilgileri");
  if (hatirlanmisBilgiler) {
    try {
      const bilgiler = JSON.parse(hatirlanmisBilgiler);
      document.getElementById("okulKodu").value = bilgiler.okulKodu || "";
      document.getElementById("kullaniciAdi").value =
        bilgiler.kullaniciAdi || "";
      document.getElementById("beniHatirla").checked = true;
    } catch (error) {
      console.error("Hatırlanan bilgiler okunamadı:", error);
    }
  }

  // Enter tuşu ile form gönderimi
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        girisForm.dispatchEvent(new Event("submit"));
      }
    });
  });
});

// ==========================================
// BİLDİRİM GÖSTER
// ==========================================

function showAlert(message, type = "error") {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = "block";

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 5000);
}

// ==========================================
// MODAL KONTROL
// ==========================================

btnUploadLicense.addEventListener("click", () => {
  console.log("📄 Lisans yükleme modal'ı açıldı");
  licenseModal.style.display = "block";
});

btnCloseModal.addEventListener("click", () => {
  console.log("❌ Lisans modal'ı kapatıldı");
  licenseModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === licenseModal) {
    console.log("❌ Modal dış alana tıklanarak kapatıldı");
    licenseModal.style.display = "none";
  }
});

// ==========================================
// DOSYA YÜKLEME
// ==========================================

uploadArea.addEventListener("click", () => {
  console.log("📁 Dosya seçme dialog'u açılıyor");
  fileInput.click();
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

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    console.log("📥 Dosya sürükle-bırak ile alındı:", files[0].name);
    handleLicenseFile(files[0]);
  }
});

// Dosya seçimi
fileInput.addEventListener("change", (e) => {
  const files = e.target.files;
  if (files.length > 0) {
    console.log("📁 Dosya seçildi:", files[0].name);
    handleLicenseFile(files[0]);
  }
});

// ==========================================
// LİSANS DOSYASINI İŞLE (NİHAİ REVİZE SÜRÜM)
// ==========================================

async function handleLicenseFile(file) {
  console.log("=".repeat(60));
  console.log("📄 LİSANS DOSYASI İŞLENİYOR");
  console.log("=".repeat(60));
  console.log("Dosya Adı:", file.name);
  console.log("Dosya Boyutu:", file.size, "bytes");
  console.log("Dosya Tipi:", file.type);

  // 1. Dosya uzantısı kontrolü
  if (!file.name.endsWith(".lic")) {
    console.error("❌ Geçersiz dosya uzantısı:", file.name);
    showAlert("Lütfen .lic uzantılı bir dosya seçin!", "error");
    return;
  }

  try {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const base64Data = e.target.result;

        console.log("✅ Dosya base64'e çevrildi");
        console.log("📦 Base64 uzunluğu:", base64Data.length, "karakter");
        console.log("📤 Backend'e (upload-license) gönderiliyor...");

        // 2. Backend'e gönder (ipcMain.handle("upload-license") kısmını çağırır)
        const result = await ipcRenderer.invoke("upload-license", {
          name: file.name,
          data: base64Data,
        });

        console.log("📥 Backend'den cevap geldi:");
        console.log(JSON.stringify(result, null, 2));

        if (result.success) {
          console.log("✅ Lisans başarıyla yüklendi!");
          console.log("   • Okul Kodu:", result.okul_kodu);
          console.log("   • Okul Adı:", result.okul_adi);

          // Bilgileri ekranda göster
          if (licenseInfo) {
            licenseInfo.style.display = "block";
          }
          if (infoOkulKodu) {
            infoOkulKodu.textContent = result.okul_kodu;
          }
          if (infoOkulAdi) {
            infoOkulAdi.textContent = result.okul_adi;
          }

          // Giriş formundaki okul kodu alanını otomatik doldur
          const inputOkulKodu = document.getElementById("okulKodu");
          if (inputOkulKodu) {
            inputOkulKodu.value = result.okul_kodu;
            console.log(
              "✅ Form alanı otomatik dolduruldu: ",
              result.okul_kodu
            );
          }

          showAlert("Lisans başarıyla yüklendi ve doğrulandı!", "success");

          console.log("⏳ 2 saniye sonra modal kapanacak...");

          // 3. Başarılıysa 2 saniye sonra modal'ı kapat
          setTimeout(() => {
            if (licenseModal) {
              licenseModal.style.display = "none";
            }
            if (licenseInfo) {
              licenseInfo.style.display = "none";
            }
            console.log("✅ Modal ve bilgi paneli kapatıldı");
          }, 2000);
        } else {
          // Backend'den gelen spesifik hata mesajını göster (Master Key hatası, İmza hatası vb.)
          console.error("❌ Lisans yükleme başarısız!");
          console.error("Hata Detayı:", result.message);
          showAlert(
            "Lisans Hatası: " + (result.message || "Dosya doğrulanamadı!"),
            "error"
          );
        }
      } catch (innerError) {
        console.error("❌ İşlem sırasında beklenmedik hata:", innerError);
        showAlert("İşlem hatası: " + innerError.message, "error");
      }

      console.log("=".repeat(60));
    };

    reader.onerror = () => {
      console.error("❌ Dosya okuma hatası (FileReader)!");
      showAlert("Dosya okunamadı! Lütfen dosyayı kontrol edin.", "error");
    };

    // Dosyayı oku
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("=".repeat(60));
    console.error("❌ KRİTİK LİSANS İŞLEME HATASI!");
    console.error("=".repeat(60));
    console.error("Hata Mesajı:", error.message);
    console.error("Stack:", error.stack);
    console.error("=".repeat(60));
    showAlert("Sistem hatası: Lisans dosyası işlenemedi!", "error");
  }
}

// ==========================================
// FORM GÖNDERİMİ (GİRİŞ)
// ==========================================

girisForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const okulKodu = document.getElementById("okulKodu").value.trim();
  const kullaniciAdi = document.getElementById("kullaniciAdi").value.trim();
  const sifre = document.getElementById("sifre").value;
  const beniHatirla = document.getElementById("beniHatirla").checked;

  console.log("=".repeat(60));
  console.log("📝 FORM GÖNDERİLDİ");

  // 🔐 İLK KURULUM KONTROLÜ (YENİ)
  if (okulKodu === "000000" && kullaniciAdi === "superadmin") {
    try {
      console.log(
        "👑 Superadmin girişi tespit edildi, ilk kurulum kontrolü yapılıyor..."
      );
      const setupCheck = await ipcRenderer.invoke("is-first-setup");

      if (setupCheck.isFirstSetup) {
        console.log(
          "⚠️ İlk kurulum gerekli! admin-setup.html'e yönlendiriliyor..."
        );
        showAlert(
          "İlk kurulum için güvenli bir şifre oluşturmanız gerekiyor!",
          "warning"
        );

        setTimeout(() => {
          window.location.href = "admin-setup.html";
        }, 1500);

        return; // Form gönderimini durdur
      }

      console.log("✅ İlk kurulum tamamlanmış, normal giriş yapılıyor...");
    } catch (error) {
      console.error("❌ İlk kurulum kontrolü hatası:", error);
    }
  }

  console.log("=".repeat(60));
  console.log("Kurum Kodu:", okulKodu);
  console.log("Kullanıcı Adı:", kullaniciAdi);
  console.log("Şifre Uzunluğu:", sifre.length);
  console.log("Beni Hatırla:", beniHatirla);

  // Validasyon
  if (!okulKodu || !kullaniciAdi || !sifre) {
    console.error("❌ Boş alan kontrolü başarısız!");
    showAlert("Tüm alanları doldurunuz!", "error");
    return;
  }

  // Butonu devre dışı bırak
  btnGiris.disabled = true;
  btnGiris.textContent = "Giriş yapılıyor...";

  try {
    console.log("📤 Backend'e giriş isteği gönderiliyor...");

    // Backend'e giriş isteği gönder
    const result = await ipcRenderer.invoke(
      "login",
      okulKodu,
      kullaniciAdi,
      sifre
    );

    console.log("=".repeat(60));
    console.log("📥 BACKEND'DEN CEVAP GELDİ");
    console.log("=".repeat(60));
    console.log(JSON.stringify(result, null, 2));
    console.log("=".repeat(60));

    if (result.success) {
      console.log("✅ GİRİŞ BAŞARILI!");
      console.log("📦 result.okul:", JSON.stringify(result.okul, null, 2));

      showAlert("Giriş başarılı! Yönlendiriliyorsunuz...", "success");

      // Beni hatırla
      if (beniHatirla) {
        console.log("💾 'Beni Hatırla' aktif, bilgiler kaydediliyor...");
        localStorage.setItem(
          "giris_bilgileri",
          JSON.stringify({
            okulKodu: okulKodu,
            kullaniciAdi: kullaniciAdi,
          })
        );
        console.log("✅ Hatırlama bilgileri kaydedildi");
      } else {
        localStorage.removeItem("giris_bilgileri");
        console.log("🗑️ Hatırlama bilgileri temizlendi");
      }

      // Kullanıcı bilgilerini kaydet
      console.log("💾 localStorage'a yazılıyor...");
      console.log("💾 Yazılacak veri:", JSON.stringify(result.okul, null, 2));

      localStorage.setItem("currentUser", JSON.stringify(result.okul));

      console.log("✅ localStorage'a yazıldı!");
      console.log("📦 Kontrol - localStorage'dan okunan:");
      console.log(localStorage.getItem("currentUser"));

      // Yönlendirme
      console.log("⏳ 1 saniye sonra anasayfaya yönlendirilecek...");
      setTimeout(() => {
        console.log("🔄 Anasayfaya yönlendiriliyor: anasayfa.html");
        window.location.href = "anasayfa.html";
      }, 1000);
    } else if (result.needLicense) {
      console.warn("⚠️ Lisans gerekli!");
      console.warn("Mesaj:", result.message);

      showAlert(result.message, "warning");

      console.log("⏳ 1 saniye sonra lisans modal'ı açılacak...");
      setTimeout(() => {
        licenseModal.style.display = "block";
        console.log("✅ Lisans modal'ı açıldı");
      }, 1000);

      btnGiris.disabled = false;
      btnGiris.textContent = "Giriş Yap";
    } else {
      console.error("❌ GİRİŞ BAŞARISIZ!");
      console.error("Hata Mesajı:", result.message);

      showAlert(result.message || "Giriş başarısız!", "error");
      btnGiris.disabled = false;
      btnGiris.textContent = "Giriş Yap";
    }
  } catch (error) {
    console.error("=".repeat(60));
    console.error("❌ GİRİŞ HATASI!");
    console.error("=".repeat(60));
    console.error("Hata Mesajı:", error.message);
    console.error("Stack:", error.stack);
    console.error("=".repeat(60));

    showAlert("Giriş sırasında bir hata oluştu!", "error");
    btnGiris.disabled = false;
    btnGiris.textContent = "Giriş Yap";
  }
});

// ==========================================
// SCRIPT HAZIR
// ==========================================

console.log("=".repeat(60));
console.log("✅ GİRİŞ SCRİPTİ YÜKLENDI");
console.log("✅ Lisans Sistemi: AKTİF");
console.log("✅ Debug Modları: AKTİF");
console.log("=".repeat(60));
