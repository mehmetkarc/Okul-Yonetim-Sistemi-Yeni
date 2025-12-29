// ==========================================
// SINIFLAR YÖNETİMİ - PART 1: TEMEL DEĞİŞKENLER VE BAŞLATMA
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let allClasses = [];
let filteredClasses = [];
let allTeachers = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentStep = 1;
const totalSteps = 4;

// DOM elementleri
const siniflarTablosu = document.getElementById("siniflarTbody"); // ← DEĞİŞTİ
const formYeniSinif = document.getElementById("formYeniSinif");
const btnYeniSinif = document.getElementById("btnYeniSinif");
const searchInput = document.getElementById("searchInput");
const duzeyFiltre = document.getElementById("filterDuzey"); // ← DEĞİŞTİ
const alanFiltre = document.getElementById("filterAlan"); // ← DEĞİŞTİ
const durumFiltre = document.getElementById("filterDurum"); // ← YENİ
const siralamaFiltre = document.getElementById("filterSiralama"); // ← YENİ

// Sayfa yüklendiğinde
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Sınıf yönetimi sayfası yüklendi");

  // Kullanıcı kontrolü
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const currentSchool = JSON.parse(localStorage.getItem("currentSchool"));

  console.log("👤 Kullanıcı:", currentUser);
  console.log("🏫 Okul:", currentSchool);

  if (!currentUser || !currentSchool) {
    console.warn("⚠️ Kullanıcı bilgisi bulunamadı");
    window.location.href = "./giris.html";
    return;
  }

  // Başlangıç fonksiyonları
  await loadTeachers();
  await loadClasses();
  initEventListeners();
});

// ==========================================
// ÖĞRETMEN YÖNETİMİ
// ==========================================

async function loadTeachers() {
  try {
    console.log("👨‍🏫 Öğretmenler yükleniyor...");

    const result = await ipcRenderer.invoke("get-all-teachers");

    if (result.success) {
      allTeachers = result.data.filter((t) => t.durum === 1);
      console.log(`✅ ${allTeachers.length} öğretmen yüklendi`);
      populateTeacherDropdowns();
    } else {
      console.error("❌ Öğretmen yükleme hatası:", result.message);
      Bildirim.error("Öğretmenler yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Öğretmen yükleme hatası:", error);
    Bildirim.error("Öğretmenler yüklenirken hata oluştu!");
  }
}

function populateTeacherDropdowns() {
  const dropdowns = [
    { id: "sinifOgretmeni", keywords: null }, // Tüm öğretmenler
    {
      id: "mudurYardimcisi",
      keywords: ["müdür yardımcısı", "müdür yrd", "müdür yard"],
    },
    {
      id: "rehberOgretmen",
      keywords: ["rehber", "rehberlik", "psikolojik", "pdr"],
    }, // Ayten Hoca için anahtar kelimeler
  ];

  dropdowns.forEach(({ id, keywords }) => {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = '<option value="">Seçiniz...</option>';

    if (!allTeachers || allTeachers.length === 0) return;

    const filteredTeachers = keywords
      ? allTeachers.filter((t) => {
          // Hem unvanı hem branşı küçük harfe çevirip kontrol ediyoruz
          const unvan = (t.unvan || "").toLowerCase();
          const brans = (t.brans || "").toLowerCase();

          return keywords.some(
            (key) =>
              unvan.includes(key.toLowerCase()) ||
              brans.includes(key.toLowerCase())
          );
        })
      : allTeachers;

    if (filteredTeachers.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Uygun öğretmen bulunamadı";
      option.disabled = true;
      select.appendChild(option);
      return;
    }

    filteredTeachers.forEach((ogretmen) => {
      const option = document.createElement("option");
      option.value = ogretmen.id;
      // Yanında unvanını da gösterelim ki doğru kişi olduğu anlaşılsın
      option.textContent = `${ogretmen.ad_soyad} (${
        ogretmen.unvan || ogretmen.brans || "Öğretmen"
      })`;
      select.appendChild(option);
    });
  });

  console.log("✅ Rehberlik ve Yönetim dropdownları başarıyla güncellendi.");
}

// ==========================================
// SINIF YÖNETİMİ
// ==========================================

async function loadClasses() {
  try {
    console.log("📋 Sınıflar yükleniyor...");

    const result = await ipcRenderer.invoke("get-all-classes");

    if (result.success) {
      allClasses = result.data;
      filteredClasses = [...allClasses];
      console.log(`✅ ${allClasses.length} sınıf yüklendi`);

      renderClasses();
      updateStats();

      Bildirim.success(`${allClasses.length} sınıf yüklendi!`, null, 2000);
    } else {
      console.error("❌ Sınıf yükleme hatası:", result.message);
      Bildirim.error("Sınıflar yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Sınıf yükleme hatası:", error);
    Bildirim.error("Sınıflar yüklenirken hata oluştu!");
  }
}

// Kullanıcı bilgilerini göster
function loadUserInfo() {
  const currentUserStr = localStorage.getItem("currentUser");
  const currentSchoolStr = localStorage.getItem("currentSchool");

  if (!currentUserStr) {
    console.error("❌ Kullanıcı bilgisi bulunamadı!");
    return;
  }

  try {
    const currentUser = JSON.parse(currentUserStr);
    const schoolInfo = currentSchoolStr ? JSON.parse(currentSchoolStr) : null;

    // Kullanıcı bilgilerini göster
    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    const userInitials = document.getElementById("userInitials");
    const okulAdi = document.getElementById("okulAdi");

    if (userName) userName.textContent = currentUser.ad_soyad;
    if (userRole) userRole.textContent = getRoleName(currentUser.rol);

    if (userInitials) {
      const initials = currentUser.ad_soyad
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
      userInitials.textContent = initials;
    }

    if (schoolInfo && okulAdi) {
      okulAdi.textContent = schoolInfo.okul_adi;
    }
  } catch (error) {
    console.error("❌ Kullanıcı bilgisi parse hatası:", error);
  }
}

// ==========================================
// SINIF İSTATİSTİKLERİNİ GÜNCELLE
// ==========================================

async function updateClassStats(sinifAdi) {
  if (!sinifAdi) {
    console.warn("⚠️ Sınıf adı belirtilmedi, istatistikler güncellenemedi");
    return;
  }

  try {
    console.log(`📊 ${sinifAdi} için istatistikler getiriliyor...`);

    const result = await window.electronAPI.getStatsForClass(sinifAdi);

    if (result.success) {
      const ogrenciSayisi = document.getElementById("ogrenciSayisi");
      const erkekSayisi = document.getElementById("erkekSayisi");
      const kizSayisi = document.getElementById("kizSayisi");

      if (ogrenciSayisi) ogrenciSayisi.value = result.data.toplam || 0;
      if (erkekSayisi) erkekSayisi.value = result.data.erkek || 0;
      if (kizSayisi) kizSayisi.value = result.data.kiz || 0;

      console.log(`✅ ${sinifAdi} istatistikleri güncellendi:`, result.data);
    } else {
      console.warn("⚠️ İstatistikler alınamadı:", result.message);
      // Hata durumunda sıfırla
      document.getElementById("ogrenciSayisi").value = 0;
      document.getElementById("erkekSayisi").value = 0;
      document.getElementById("kizSayisi").value = 0;
    }
  } catch (error) {
    console.error("❌ İstatistik güncelleme hatası:", error);
    // Hata durumunda sıfırla
    document.getElementById("ogrenciSayisi").value = 0;
    document.getElementById("erkekSayisi").value = 0;
    document.getElementById("kizSayisi").value = 0;
  }
}

function getRoleName(rol) {
  const roles = {
    super_admin: "Sistem Yöneticisi",
    okul_admin: "Okul Yöneticisi",
    ogretmen: "Öğretmen",
  };
  return roles[rol] || rol;
}

function renderClasses() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageClasses = filteredClasses.slice(startIndex, endIndex);

  let html = "";

  if (pageClasses.length === 0) {
    html = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p style="font-size: 18px; margin: 0;">Henüz sınıf bulunmamaktadır</p>
          <p style="font-size: 14px; margin-top: 8px;">Yeni sınıf eklemek için "Yeni Sınıf Ekle" butonuna tıklayın</p>
        </td>
      </tr>
    `;
  } else {
    pageClasses.forEach((sinif, index) => {
      const ogretmenAdi = getOgretmenAdi(sinif.sinif_ogretmeni_id);
      const durumBadge =
        sinif.durum === 1
          ? '<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">Aktif</span>'
          : '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">Pasif</span>';

      const ogrenciSayisiInfo = sinif.ogrenci_sayisi
        ? `<small style="color: var(--text-secondary); display: block; margin-top: 4px;">👥 ${
            sinif.ogrenci_sayisi || 0
          } öğrenci (E:${sinif.erkek_sayisi || 0} K:${
            sinif.kiz_sayisi || 0
          })</small>`
        : "";

      html += `
        <tr style="animation: fadeIn 0.5s ease ${index * 0.05}s both;">
          <td>${startIndex + index + 1}</td>
          <td>
            <strong style="color: var(--primary); font-family: monospace;">${
              sinif.sinif_adi
            }</strong>
            ${ogrenciSayisiInfo}
          </td>
          <td>${sinif.sinif_duzey}. Sınıf</td>
          <td><span style="background: rgba(123, 47, 255, 0.2); color: #7b2fff; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${
            sinif.sube
          }</span></td>
          <td>${sinif.alan || "-"}</td>
          <td>${ogretmenAdi}</td>
          <td>${durumBadge}</td>
          <td>
            <div class="action-buttons">
              <button
                class="btn-icon btn-primary"
                onclick="duzenleSinif(${sinif.id})"
                title="Düzenle"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button
                class="btn-icon btn-info"
                onclick="sinifDetay(${sinif.id})"
                title="Detay"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
              <button
                class="btn-icon btn-danger"
                onclick="silSinif(${sinif.id})"
                title="Sil"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  siniflarTablosu.innerHTML = html;
  renderPagination();
}

function getOgretmenAdi(ogretmenId) {
  if (!ogretmenId) return "-";
  const ogretmen = allTeachers.find((t) => t.id === ogretmenId);
  return ogretmen ? ogretmen.ad_soyad : "-";
}

// ==========================================
// PAGINATION
// ==========================================

function renderPagination() {
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const paginationDiv = document.getElementById("pagination");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");
  const paginationInfo = document.getElementById("paginationInfo");

  // Pagination div yoksa çık
  if (!paginationDiv) {
    console.warn("⚠️ Pagination div bulunamadı!");
    return;
  }

  // 1 sayfa veya daha azsa pagination'ı gizle
  if (totalPages <= 1 || filteredClasses.length === 0) {
    paginationDiv.style.display = "none";
    return;
  }

  // Pagination'ı göster
  paginationDiv.style.display = "flex";

  // Pagination bilgisini güncelle (1-10 / 50 gibi)
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredClasses.length);

  if (paginationInfo) {
    paginationInfo.textContent = `${startIndex}-${endIndex} / ${filteredClasses.length}`;
  } else {
    console.warn("⚠️ paginationInfo elementi bulunamadı!");
  }

  // Önceki butonu güncelle
  if (btnPrevPage) {
    btnPrevPage.disabled = currentPage === 1;
    btnPrevPage.style.opacity = currentPage === 1 ? "0.5" : "1";
    btnPrevPage.style.cursor = currentPage === 1 ? "not-allowed" : "pointer";
  } else {
    console.warn("⚠️ btnPrevPage bulunamadı!");
  }

  // Sonraki butonu güncelle
  if (btnNextPage) {
    btnNextPage.disabled = currentPage === totalPages;
    btnNextPage.style.opacity = currentPage === totalPages ? "0.5" : "1";
    btnNextPage.style.cursor =
      currentPage === totalPages ? "not-allowed" : "pointer";
  } else {
    console.warn("⚠️ btnNextPage bulunamadı!");
  }

  console.log(
    `📄 Pagination: Sayfa ${currentPage}/${totalPages} (${startIndex}-${endIndex} / ${filteredClasses.length})`
  );
}

function changePage(page) {
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);

  // Sayfa sınırlarını kontrol et
  if (page < 1 || page > totalPages) {
    console.warn(`⚠️ Geçersiz sayfa numarası: ${page}`);
    return;
  }

  currentPage = page;
  renderClasses();

  console.log(`📄 Sayfa değiştirildi: ${currentPage}/${totalPages}`);
}

function changePage(page) {
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  renderClasses();

  console.log(`📄 Sayfa değiştirildi: ${currentPage}/${totalPages}`);
}

function updateStats() {
  const toplamSinif = allClasses.length;
  const aktifSinif = allClasses.filter((s) => s.durum === 1).length;
  const pasifSinif = allClasses.filter((s) => s.durum === 0).length;
  const toplamOgrenci = allClasses.reduce(
    (sum, s) => sum + (s.ogrenci_sayisi || 0),
    0
  );

  // ID'ler HTML'e göre güncellendi
  const statToplam = document.getElementById("statToplam");
  const statAktif = document.getElementById("statAktif");
  const statPasif = document.getElementById("statPasif");

  if (statToplam) statToplam.textContent = toplamSinif;
  if (statAktif) statAktif.textContent = aktifSinif;
  if (statPasif) statPasif.textContent = pasifSinif;
}

// ==========================================
// FİLTRELEME VE ARAMA
// ==========================================

function handleFilter() {
  const duzey = duzeyFiltre.value;
  const alan = alanFiltre.value;
  const searchTerm = searchInput.value.toLowerCase();

  filteredClasses = allClasses.filter((sinif) => {
    const matchesDuzey = !duzey || sinif.sinif_duzey === parseInt(duzey);
    const matchesAlan = !alan || sinif.alan === alan;
    const matchesSearch =
      !searchTerm ||
      sinif.sinif_adi.toLowerCase().includes(searchTerm) ||
      sinif.sube.toLowerCase().includes(searchTerm);

    return matchesDuzey && matchesAlan && matchesSearch;
  });

  currentPage = 1;
  renderClasses();
}

function handleSearch() {
  handleFilter();
}

// ==========================================
// SINIF EKLEME/DÜZENLEME
// ==========================================

async function handleFormSubmit(e) {
  e.preventDefault();

  const formYeniSinif = document.getElementById("formYeniSinif");
  const formData = new FormData(formYeniSinif);

  const sinifBilgileri = {
    sinif_duzey: parseInt(formData.get("sinifDuzey")),
    sube: formData.get("sube").toUpperCase().trim(),
    alan: formData.get("alan") || null,
    sinif_ogretmeni_id: formData.get("sinifOgretmeni") || null,
    mudur_yardimcisi_id: formData.get("mudurYardimcisi") || null,
    rehber_ogretmen_id: formData.get("rehberOgretmen") || null,
    ogrenci_sayisi: parseInt(formData.get("ogrenciSayisi")) || 0,
    erkek_sayisi: parseInt(formData.get("erkekSayisi")) || 0,
    kiz_sayisi: parseInt(formData.get("kizSayisi")) || 0,
    durum: parseInt(formData.get("durum")) || 1,
  };

  sinifBilgileri.sinif_adi = `${sinifBilgileri.sinif_duzey}-${sinifBilgileri.sube}`;

  const editId = formYeniSinif.dataset.editId;

  try {
    let result;

    if (editId) {
      console.log("✏️ Sınıf güncelleniyor:", editId, sinifBilgileri);
      result = await window.electronAPI.updateClass(editId, sinifBilgileri);
    } else {
      console.log("➕ Yeni sınıf ekleniyor:", sinifBilgileri);
      result = await window.electronAPI.createClass(sinifBilgileri);
    }

    if (result.success) {
      closeModal("modalYeniSinif");
      formYeniSinif.reset();
      delete formYeniSinif.dataset.editId;
      goToStep(1);

      await loadClasses();

      Bildirim.success(
        editId
          ? "Sınıf başarıyla güncellendi!"
          : `🎉 ${sinifBilgileri.sinif_adi} başarıyla oluşturuldu!`
      );
    } else {
      Bildirim.error(result.message || "İşlem başarısız!");
    }
  } catch (error) {
    console.error("❌ Form submit hatası:", error);
    Bildirim.error("Bir hata oluştu!");
  }
}

async function duzenleSinif(sinifId) {
  const sinif = allClasses.find((s) => s.id === sinifId);
  if (!sinif) {
    Bildirim.error("Sınıf bulunamadı!");
    return;
  }

  console.log("Sınıf düzenleniyor:", sinif);

  // Modal başlığını değiştir
  const modalBaslikText = document.getElementById("modalBaslikText");
  if (modalBaslikText) {
    modalBaslikText.textContent = "Sınıf Düzenle";
  }

  // Form'a edit ID ekle
  const formYeniSinif = document.getElementById("formYeniSinif");
  if (formYeniSinif) {
    formYeniSinif.dataset.editId = sinifId;
  }

  // Modal açıldıktan sonra tüm işlemleri yap (DOM hazır olmalı)
  openModal("modalYeniSinif", async () => {
    // 1. Formu doldur
    const sinifDuzey = document.getElementById("sinifDuzey");
    const sube = document.getElementById("sube");
    const alan = document.getElementById("alan");
    const sinifOgretmeni = document.getElementById("sinifOgretmeni");
    const mudurYardimcisi = document.getElementById("mudurYardimcisi");
    const rehberOgretmen = document.getElementById("rehberOgretmen");
    const durum = document.getElementById("durum");
    const notlar = document.getElementById("notlar");
    const sinifAdiInput = document.getElementById("sinifAdi");

    if (sinifDuzey) sinifDuzey.value = sinif.sinif_duzey;
    if (sube) sube.value = sinif.sube;
    if (alan) alan.value = sinif.alan || "";
    if (sinifOgretmeni) sinifOgretmeni.value = sinif.sinif_ogretmeni_id || "";
    if (mudurYardimcisi)
      mudurYardimcisi.value = sinif.mudur_yardimcisi_id || "";
    if (rehberOgretmen) rehberOgretmen.value = sinif.rehber_ogretmen_id || "";
    if (durum) durum.value = sinif.durum || 1;
    if (notlar) notlar.value = sinif.notlar || "";
    if (sinifAdiInput) sinifAdiInput.value = sinif.sinif_adi;

    // 2. Öğretmen dropdown'larını yeniden doldur
    populateTeacherDropdowns();

    // 3. İstatistikleri güncelle
    await updateClassStats(sinif.sinif_adi);

    // 4. İlk adıma git
    goToStep(1);
  });
}

// Replace your existing silSinif with this improved version
async function silSinif(sinifId) {
  try {
    const sinif = allClasses.find((s) => s.id === sinifId);
    if (!sinif) {
      Bildirim.error("Sınıf bulunamadı!");
      return;
    }

    // Modern onay (SweetAlert2)
    const { isConfirmed } = await Swal.fire({
      title: `"${sinif.sinif_adi}" sınıfını sil?`,
      html: `Bu işlem geri alınamaz.<br><strong>${sinif.sinif_adi}</strong> kalıcı olarak silinecek.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Evet, sil",
      cancelButtonText: "İptal",
      confirmButtonColor: "#d33",
      reverseButtons: true,
    });

    if (!isConfirmed) return;

    console.log("🗑️ Sınıf silme isteği gönderiliyor:", sinifId);

    // API çağrısı
    const result = await window.electronAPI.deleteClass(sinifId);

    if (!result) {
      console.error("❌ deleteClass çağrısı başarısız veya sonuç yok", result);
      Bildirim.error("Sunucu yanıtı alınamadı. Kontrol edin.");
      return;
    }

    if (result.success) {
      // 1) immediate UI update: allClasses dizisinden çıkar
      allClasses = allClasses.filter((s) => s.id !== sinifId);

      // 2) DOM'dan ilgili satırı sil (eğer tabloda satırlara data-id ekliyorsanız)
      // Örnek satır render'ınızda <tr data-id="..."> kullanmalısınız.
      const row = document.querySelector(`tr[data-id="${sinifId}"]`);
      if (row) {
        row.remove();
      } else {
        // Eğer row yoksa loadClasses ile tam yenileme yap
        await loadClasses().catch((err) => {
          console.warn("loadClasses hata (silme sonrası):", err);
        });
      }

      // 3) istatistikleri güncelle (varsa)
      if (typeof updateClassStats === "function") {
        try {
          await updateClassStats(); // işleyişinize göre parametre gerekebilir
        } catch (err) {
          console.warn("updateClassStats hata:", err);
        }
      }

      Bildirim.success(`${sinif.sinif_adi} sınıfı başarıyla silindi!`);
      console.log(`✅ Sınıf ${sinifId} silindi ve UI güncellendi.`);
    } else {
      console.warn("❗ deleteClass returned success:false", result);
      Bildirim.error(result.message || "Sınıf silinemedi!");
    }
  } catch (error) {
    console.error("❌ Sınıf silme hatası:", error);
    Bildirim.error("Sınıf silinirken hata oluştu!");
  }
}

function sinifDetay(sinifId) {
  const sinif = allClasses.find((s) => s.id === sinifId);
  if (!sinif) {
    Bildirim.error("Sınıf bulunamadı!");
    return;
  }

  const ogretmenAdi = getOgretmenAdi(sinif.sinif_ogretmeni_id);
  const mudurYardimcisiAdi = getOgretmenAdi(sinif.mudur_yardimcisi_id);
  const rehberOgretmenAdi = getOgretmenAdi(sinif.rehber_ogretmen_id);

  const detayIcerik = document.getElementById("detayIcerik");
  if (detayIcerik) {
    detayIcerik.innerHTML = `
      <div style="display: grid; gap: 20px;">
        <div class="info-box" style="background: rgba(102, 126, 234, 0.1); border-left: 4px solid #667eea;">
          <h3 style="margin: 0 0 16px 0; color: #667eea; font-size: 18px;">📋 Genel Bilgiler</h3>
          <div style="display: grid; gap: 12px;">
            <div><strong>Sınıf Adı:</strong> ${sinif.sinif_adi}</div>
            <div><strong>Düzey:</strong> ${sinif.sinif_duzey}. Sınıf</div>
            <div><strong>Şube:</strong> ${sinif.sube}</div>
            <div><strong>Alan:</strong> ${sinif.alan || "-"}</div>
            <div><strong>Durum:</strong> ${
              sinif.durum === 1
                ? '<span style="color: #00f5a0;">✓ Aktif</span>'
                : '<span style="color: #ff6b6b;">✗ Pasif</span>'
            }</div>
          </div>
        </div>

        <div class="info-box" style="background: rgba(0, 217, 255, 0.1); border-left: 4px solid #00d9ff;">
          <h3 style="margin: 0 0 16px 0; color: #00d9ff; font-size: 18px;">👨‍🏫 Öğretmenler</h3>
          <div style="display: grid; gap: 12px;">
            <div><strong>Sınıf Öğretmeni:</strong> ${ogretmenAdi}</div>
            <div><strong>Müdür Yardımcısı:</strong> ${mudurYardimcisiAdi}</div>
            <div><strong>Rehber Öğretmen:</strong> ${rehberOgretmenAdi}</div>
          </div>
        </div>

        <div class="info-box" style="background: rgba(0, 245, 160, 0.1); border-left: 4px solid #00f5a0;">
          <h3 style="margin: 0 0 16px 0; color: #00f5a0; font-size: 18px;">📊 İstatistikler</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="text-align: center; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
              <div style="font-size: 24px; font-weight: 600; color: #00d9ff;">${
                sinif.ogrenci_sayisi || 0
              }</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Toplam Öğrenci</div>
            </div>
            <div style="text-align: center; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
              <div style="font-size: 24px; font-weight: 600; color: #3b82f6;">${
                sinif.erkek_sayisi || 0
              }</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Erkek</div>
            </div>
            <div style="text-align: center; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
              <div style="font-size: 24px; font-weight: 600; color: #ec4899;">${
                sinif.kiz_sayisi || 0
              }</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Kız</div>
            </div>
          </div>
        </div>

        ${
          sinif.notlar
            ? `
        <div class="info-box" style="background: rgba(255, 217, 61, 0.1); border-left: 4px solid #ffd93d;">
          <h3 style="margin: 0 0 16px 0; color: #ffd93d; font-size: 18px;">📝 Notlar</h3>
          <div style="white-space: pre-wrap;">${sinif.notlar}</div>
        </div>
        `
            : ""
        }
      </div>
    `;
  }

  openModal("modalDetay");
}
// ==========================================
// MODAL YÖNETİMİ
// ==========================================

function openModal(modalId, callback) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
    modal.style.zIndex = "9999";
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    // Modal tamamen açıldıktan sonra callback çalışsın
    requestAnimationFrame(() => {
      if (callback && typeof callback === "function") {
        callback();
      }
    });
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none"; // 👈 Kapatma eklendi
    modal.classList.remove("active");
    document.body.style.overflow = "";

    if (modalId === "modalYeniSinif") {
      formYeniSinif.reset();
      delete formYeniSinif.dataset.editId;
      document.getElementById("modalBaslik").textContent = "Yeni Sınıf Ekle";
      goToStep(1);
    }
  }
}

// ==========================================
// STEP NAVIGATION
// ==========================================

function goToStep(step) {
  if (step < 1 || step > totalSteps) {
    console.warn(`⚠️ Geçersiz step: ${step}`);
    return;
  }

  console.log(`📍 Step değiştiriliyor: ${step}/${totalSteps}`);

  // Tüm step içeriklerini gizle
  const formSteps = document.querySelectorAll(".form-step-content");
  formSteps.forEach((s) => {
    s.classList.remove("active");
  });

  // Seçili step'i göster
  const targetStep = document.querySelector(
    `.form-step-content[data-step="${step}"]`
  );
  if (targetStep) {
    targetStep.classList.add("active");
  } else {
    console.error(`❌ Step ${step} bulunamadı!`);
  }

  // Step indicator'ları güncelle
  const stepIndicators = document.querySelectorAll(".form-step[data-step]");
  stepIndicators.forEach((stepEl) => {
    const stepNum = parseInt(stepEl.dataset.step);

    if (stepNum < step) {
      stepEl.classList.add("completed");
      stepEl.classList.remove("active");
    } else if (stepNum === step) {
      stepEl.classList.add("active");
      stepEl.classList.remove("completed");
    } else {
      stepEl.classList.remove("active", "completed");
    }
  });

  // Butonları güncelle
  const btnPrevStep = document.getElementById("btnPrevStep");
  const btnNextStep = document.getElementById("btnNextStep");
  const btnKaydet = document.getElementById("btnKaydet");

  if (btnPrevStep) {
    btnPrevStep.style.display = step === 1 ? "none" : "inline-flex";
    btnPrevStep.onclick = () => goToStep(step - 1);
  }

  if (btnNextStep) {
    btnNextStep.style.display = step === totalSteps ? "none" : "inline-flex";
    btnNextStep.onclick = () => {
      // Step 1'den 2'ye geçerken validasyon
      if (step === 1) {
        const sinifDuzey = document.getElementById("sinifDuzey");
        const sube = document.getElementById("sube");

        if (!sinifDuzey || !sinifDuzey.value || !sube || !sube.value) {
          Bildirim.error("Lütfen zorunlu alanları doldurun!");
          return;
        }
      }
      goToStep(step + 1);
    };
  }

  if (btnKaydet) {
    btnKaydet.style.display = step === totalSteps ? "inline-flex" : "none";
  }

  currentStep = step;
  console.log(`✅ Step ${step} aktif`);
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function initEventListeners() {
  console.log("🎯 Event listener'lar başlatılıyor...");

  // Yeni sınıf butonu
  const btnYeniSinif = document.getElementById("btnYeniSinif");
  if (btnYeniSinif) {
    btnYeniSinif.addEventListener("click", () => {
      console.log("Yeni sınıf modalı açılıyor");

      const formYeniSinif = document.getElementById("formYeniSinif");
      if (formYeniSinif) {
        formYeniSinif.reset();
        delete formYeniSinif.dataset.editId;
      }

      const modalBaslikText = document.getElementById("modalBaslikText");
      if (modalBaslikText) {
        modalBaslikText.textContent = "Yeni Sınıf Kaydı";
      }

      const ogrenciSayisi = document.getElementById("ogrenciSayisi");
      const erkekSayisi = document.getElementById("erkekSayisi");
      const kizSayisi = document.getElementById("kizSayisi");

      if (ogrenciSayisi) ogrenciSayisi.value = 0;
      if (erkekSayisi) erkekSayisi.value = 0;
      if (kizSayisi) kizSayisi.value = 0;

      // Modal açıldıktan sonra dropdown'ları doldur
      openModal("modalYeniSinif", () => {
        populateTeacherDropdowns();
        goToStep(1);
      });
    });
  } else {
    console.warn("⚠️ btnYeniSinif bulunamadı!");
  }

  // Sınıf adı otomatik oluşturma ve istatistik güncelleme
  const sinifDuzeyInput = document.getElementById("sinifDuzey");
  const subeInput = document.getElementById("sube");
  const sinifAdiInput = document.getElementById("sinifAdi");

  if (sinifDuzeyInput && subeInput && sinifAdiInput) {
    const updateSinifAdi = async () => {
      const duzey = sinifDuzeyInput.value;
      const sube = subeInput.value;

      if (duzey && sube) {
        const yeniSinifAdi = `${duzey}/${sube}`;
        sinifAdiInput.value = yeniSinifAdi;

        // İstatistikleri güncelle (varsa)
        await updateClassStats(yeniSinifAdi);
      } else {
        sinifAdiInput.value = "";
      }
    };

    sinifDuzeyInput.addEventListener("change", updateSinifAdi);
    subeInput.addEventListener("change", updateSinifAdi);
  }

  // Form submit
  const formYeniSinif = document.getElementById("formYeniSinif");
  if (formYeniSinif) {
    formYeniSinif.addEventListener("submit", handleFormSubmit);
  } else {
    console.warn("⚠️ formYeniSinif bulunamadı!");
  }

  // Filtreler
  const duzeyFiltre = document.getElementById("filterDuzey");
  const alanFiltre = document.getElementById("filterAlan");
  const durumFiltre = document.getElementById("filterDurum");
  const searchInput = document.getElementById("searchInput");

  if (duzeyFiltre) duzeyFiltre.addEventListener("change", handleFilter);
  if (alanFiltre) alanFiltre.addEventListener("change", handleFilter);
  if (durumFiltre) durumFiltre.addEventListener("change", handleFilter);
  if (searchInput) searchInput.addEventListener("input", handleSearch);

  // Filtreleme butonu
  const btnFiltrele = document.getElementById("btnFiltrele");
  if (btnFiltrele) {
    btnFiltrele.addEventListener("click", handleFilter);
  }

  // Pagination butonları
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        changePage(currentPage - 1);
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
      if (currentPage < totalPages) {
        changePage(currentPage + 1);
      }
    });
  }

  // Çıkış butonu
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
        localStorage.clear();
        window.location.href = "giris.html";
      }
    });
  }

  // Modal kapatma butonları
  const closeButtons = document.querySelectorAll(".close-modal, .modal-close");
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const modal = this.closest(".modal-overlay");
      if (modal) {
        closeModal(modal.id);
      }
    });
  });

  // Modal dışına tıklama
  const modals = document.querySelectorAll(".modal-overlay");
  modals.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });

  // ESC tuşu ile modal kapatma
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModal = document.querySelector(
        ".modal-overlay[style*='display: block'], .modal-overlay[style*='display: flex']"
      );
      if (activeModal) {
        closeModal(activeModal.id);
      }
    }
  });

  console.log("✅ Event listener'lar başarıyla başlatıldı");
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

// Animasyon için
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

// ==========================================
// RAPORLAR SAYFASI
// ==========================================

function sinifRaporlariAc() {
  console.log("📊 Sınıf raporları sayfası açılıyor...");
  window.location.href = "./raporlar/sinif-raporlari.html";
}

console.log("✅ Sınıf yönetimi scripti yüklendi!");
