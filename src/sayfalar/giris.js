// Electron API'yi al
const { ipcRenderer } = require("electron");

// DOM elemanları
const girisForm = document.getElementById("girisForm");
const btnGiris = document.getElementById("btnGiris");
const alertBox = document.getElementById("alertBox");
const versionText = document.getElementById("versionText");

// Sayfa yüklendiğinde
window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Giriş sayfası yüklendi");

  // Versiyon bilgisini al
  try {
    const version = await window.electronAPI.getAppVersion();
    versionText.textContent = `v${version} - 2025`;
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

// Bildirim göster
function showAlert(message, type = "error") {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = "block";

  // 5 saniye sonra gizle
  setTimeout(() => {
    alertBox.style.display = "none";
  }, 5000);
}

// Form gönderimi
girisForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const okulKodu = document.getElementById("okulKodu").value.trim();
  const kullaniciAdi = document.getElementById("kullaniciAdi").value.trim();
  const sifre = document.getElementById("sifre").value;
  const beniHatirla = document.getElementById("beniHatirla").checked;

  // Validasyon
  if (!okulKodu || !kullaniciAdi || !sifre) {
    showAlert("Tüm alanları doldurunuz!", "error");
    return;
  }

  // Okul kodu sadece rakam kontrolü
  if (
    okulKodu !== "000000" &&
    okulKodu !== "SISTEM" &&
    !/^\d+$/.test(okulKodu)
  ) {
    showAlert("Okul kodu sadece rakamlardan oluşmalıdır!", "error");
    return;
  }

  // Butonu devre dışı bırak
  btnGiris.disabled = true;
  btnGiris.textContent = "Giriş yapılıyor...";

  try {
    console.log("🔐 Giriş denemesi:", okulKodu, kullaniciAdi);

    // Backend'e giriş isteği gönder
    const result = await ipcRenderer.invoke(
      "login",
      okulKodu,
      kullaniciAdi,
      sifre
    );

    if (result.success) {
      showAlert("Giriş başarılı! Yönlendiriliyorsunuz...", "success");

      // Beni hatırla
      if (beniHatirla) {
        localStorage.setItem(
          "giris_bilgileri",
          JSON.stringify({
            okulKodu: okulKodu,
            kullaniciAdi: kullaniciAdi,
          })
        );
      } else {
        localStorage.removeItem("giris_bilgileri");
      }

      // Kullanıcı bilgilerini kaydet
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          userType: result.userType,
          school: result.school || null,
          user: result.user,
        })
      );

      console.log("✅ Giriş başarılı:", result.userType);

      // Yönlendirme
      setTimeout(() => {
        window.location.href = "anasayfa.html";
      }, 1000);
    } else {
      showAlert(result.message || "Giriş başarısız!", "error");
      btnGiris.disabled = false;
      btnGiris.textContent = "Giriş Yap";
    }
  } catch (error) {
    console.error("❌ Giriş hatası:", error);
    showAlert("Giriş sırasında bir hata oluştu!", "error");
    btnGiris.disabled = false;
    btnGiris.textContent = "Giriş Yap";
  }
});

// Okul kodu input - sadece rakam
document.getElementById("okulKodu").addEventListener("input", (e) => {
  // 000000 veya SISTEM haricinde sadece rakam
  const value = e.target.value;
  if (value !== "000000" && value !== "SISTEM" && value !== "") {
    e.target.value = value.replace(/[^0-9]/g, "");
  }
});

console.log("✅ Giriş scripti yüklendi");
