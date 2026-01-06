// ==========================================
// KULLANICI YÖNETİMİ - JAVASCRIPT
// ==========================================

const { ipcRenderer } = require("electron");

// Global değişkenler
let allUsers = [];
let filteredUsers = [];

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Kullanıcı Yönetimi sayfası yüklendi");

  // Kullanıcı bilgilerini yükle
  loadUserInfo();

  // Kullanıcıları yükle
  loadUsers();

  // Event listener'ları ekle
  initEventListeners();
});

// ==========================================
// KULLANICI BİLGİLERİ
// ==========================================

function loadUserInfo() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  if (currentUser.kullanici_adi) {
    const initials = currentUser.kullanici_adi
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    document.getElementById("userInitials").textContent = initials;
  }
}

// ==========================================
// EVENT LISTENER'LAR
// ==========================================

function initEventListeners() {
  // Arama
  document.getElementById("searchInput").addEventListener("input", (e) => {
    filterUsers(e.target.value, null, null);
  });

  // Rol filtresi
  document.getElementById("filterRole").addEventListener("change", (e) => {
    filterUsers(null, e.target.value, null);
  });

  // Durum filtresi
  document.getElementById("filterStatus").addEventListener("change", (e) => {
    filterUsers(null, null, e.target.value);
  });

  // Yeni kullanıcı formu
  document
    .getElementById("formYeniKullanici")
    .addEventListener("submit", handleAddUser);

  // Düzenle formu
  document
    .getElementById("formDuzenle")
    .addEventListener("submit", handleUpdateUser);
}

// ==========================================
// KULLANICILARI YÜKLE
// ==========================================

async function loadUsers() {
  try {
    console.log("📋 Kullanıcılar yükleniyor...");

    const result = await ipcRenderer.invoke("get-all-users");

    if (result.success) {
      allUsers = result.data;
      filteredUsers = [...allUsers];

      console.log(`✅ ${allUsers.length} kullanıcı yüklendi`);

      // İstatistikleri güncelle
      updateStats();

      // Tabloyu render et
      renderTable();
    } else {
      Bildirim.error(result.message || "Kullanıcılar yüklenemedi!");
    }
  } catch (error) {
    console.error("❌ Kullanıcı yükleme hatası:", error);
    Bildirim.error("Kullanıcılar yüklenirken hata oluştu!");
  }
}

// ==========================================
// İSTATİSTİKLERİ GÜNCELLE
// ==========================================

function updateStats() {
  const toplam = allUsers.length;
  const aktif = allUsers.filter((u) => u.durum === 1).length;
  const pasif = allUsers.filter((u) => u.durum === 0).length;
  const admin = allUsers.filter((u) => u.rol === "admin").length;

  document.getElementById("toplamKullanici").textContent = toplam;
  document.getElementById("aktifKullanici").textContent = aktif;
  document.getElementById("pasifKullanici").textContent = pasif;
  document.getElementById("adminSayisi").textContent = admin;
}

// ==========================================
// TABLO RENDER
// ==========================================

function renderTable() {
  const tbody = document.getElementById("kullaniciTbody");

  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 60px 20px; color: #888;">
          Kullanıcı bulunamadı
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredUsers
    .map((user) => {
      const initials = (user.ad_soyad || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);

      const rolBadge = getRoleBadge(user.rol);
      const statusBadge = getStatusBadge(user.durum);
      const sonGiris = user.son_giris
        ? new Date(user.son_giris).toLocaleDateString("tr-TR")
        : "Hiç giriş yapmadı";

      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-avatar-small">${initials}</div>
              <div class="user-info-cell">
                <span class="user-username-cell">${user.kullanici_adi}</span>
              </div>
            </div>
          </td>
          <td><span class="user-name-cell">${user.ad_soyad}</span></td>
          <td>${rolBadge}</td>
          <td>${user.email || "-"}</td>
          <td>${user.telefon || "-"}</td>
          <td>${statusBadge}</td>
          <td style="color: #888; font-size: 13px;">${sonGiris}</td>
          <td>
            <div class="action-btns">
              <button class="btn-icon edit" onclick="openEditModal(${
                user.id
              })" title="Düzenle">
                ✏️
              </button>
              <button class="btn-icon password" onclick="resetPassword(${
                user.id
              })" title="Şifre Sıfırla">
                🔑
              </button>
              <button class="btn-icon toggle" onclick="toggleStatus(${
                user.id
              })" title="Durum Değiştir">
                ${user.durum === 1 ? "⏸️" : "▶️"}
              </button>
              ${
                user.kullanici_adi !== "admin"
                  ? `<button class="btn-icon delete" onclick="deleteUser(${user.id})" title="Sil">🗑️</button>`
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ==========================================
// ROL BADGE
// ==========================================

function getRoleBadge(rol) {
  const roleMap = {
    admin: { icon: "👑", text: "Admin", class: "role-admin" },
    sekreter: { icon: "📋", text: "Sekreter", class: "role-sekreter" },
    ogretmen: { icon: "👨‍🏫", text: "Öğretmen", class: "role-ogretmen" },
    muhasebe: { icon: "💰", text: "Muhasebe", class: "role-muhasebe" },
    kullanici: { icon: "👤", text: "Kullanıcı", class: "role-kullanici" },
  };

  const role = roleMap[rol] || roleMap.kullanici;

  return `<span class="role-badge ${role.class}">${role.icon} ${role.text}</span>`;
}

// ==========================================
// DURUM BADGE
// ==========================================

function getStatusBadge(durum) {
  if (durum === 1) {
    return '<span class="status-badge status-active">✅ Aktif</span>';
  } else {
    return '<span class="status-badge status-inactive">⏸️ Pasif</span>';
  }
}

// ==========================================
// FİLTRELEME
// ==========================================

function filterUsers(searchTerm, role, status) {
  const search =
    searchTerm !== null
      ? searchTerm.toLowerCase()
      : document.getElementById("searchInput").value.toLowerCase();

  const roleFilter =
    role !== null ? role : document.getElementById("filterRole").value;

  const statusFilter =
    status !== null ? status : document.getElementById("filterStatus").value;

  filteredUsers = allUsers.filter((user) => {
    // Arama filtresi
    const matchSearch =
      !search ||
      user.ad_soyad.toLowerCase().includes(search) ||
      user.kullanici_adi.toLowerCase().includes(search) ||
      user.rol.toLowerCase().includes(search);

    // Rol filtresi
    const matchRole = roleFilter === "all" || user.rol === roleFilter;

    // Durum filtresi
    const matchStatus =
      statusFilter === "all" || user.durum === parseInt(statusFilter);

    return matchSearch && matchRole && matchStatus;
  });

  renderTable();
}

// ==========================================
// YENİ KULLANICI MODAL AÇ
// ==========================================

function openAddUserModal() {
  document.getElementById("modalYeniKullanici").style.display = "flex";
  document.getElementById("formYeniKullanici").reset();
}

// ==========================================
// YENİ KULLANICI EKLE
// ==========================================

async function handleAddUser(e) {
  e.preventDefault();

  const userData = {
    kullanici_adi: document.getElementById("yeniKullaniciAdi").value.trim(),
    sifre: document.getElementById("yeniSifre").value,
    ad_soyad: document.getElementById("yeniAdSoyad").value.trim(),
    tc_no: document.getElementById("yeniTcNo").value.trim() || null,
    email: document.getElementById("yeniEmail").value.trim() || null,
    telefon: document.getElementById("yeniTelefon").value.trim() || null,
    rol: document.getElementById("yeniRol").value,
  };

  if (!userData.kullanici_adi || !userData.sifre || !userData.ad_soyad) {
    Bildirim.error("Lütfen zorunlu alanları doldurun!");
    return;
  }

  try {
    const result = await ipcRenderer.invoke("create-user", userData);

    if (result.success) {
      Bildirim.success("Kullanıcı başarıyla oluşturuldu!");
      closeModal("modalYeniKullanici");
      loadUsers();
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Kullanıcı ekleme hatası:", error);
    Bildirim.error("Kullanıcı eklenirken hata oluştu!");
  }
}

// ==========================================
// DÜZENLE MODAL AÇ
// ==========================================

async function openEditModal(userId) {
  const user = allUsers.find((u) => u.id === userId);

  if (!user) {
    Bildirim.error("Kullanıcı bulunamadı!");
    return;
  }

  document.getElementById("duzenleUserId").value = user.id;
  document.getElementById("duzenleAdSoyad").value = user.ad_soyad;
  document.getElementById("duzenleTcNo").value = user.tc_no || "";
  document.getElementById("duzenleEmail").value = user.email || "";
  document.getElementById("duzenleTelefon").value = user.telefon || "";
  document.getElementById("duzenleRol").value = user.rol;

  document.getElementById("modalDuzenle").style.display = "flex";
}

// ==========================================
// KULLANICI GÜNCELLE
// ==========================================

async function handleUpdateUser(e) {
  e.preventDefault();

  const userId = parseInt(document.getElementById("duzenleUserId").value);

  const userData = {
    ad_soyad: document.getElementById("duzenleAdSoyad").value.trim(),
    tc_no: document.getElementById("duzenleTcNo").value.trim() || null,
    email: document.getElementById("duzenleEmail").value.trim() || null,
    telefon: document.getElementById("duzenleTelefon").value.trim() || null,
    rol: document.getElementById("duzenleRol").value,
  };

  try {
    const result = await ipcRenderer.invoke("update-user", userId, userData);

    if (result.success) {
      Bildirim.success("Kullanıcı başarıyla güncellendi!");
      closeModal("modalDuzenle");
      loadUsers();
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Kullanıcı güncelleme hatası:", error);
    Bildirim.error("Kullanıcı güncellenirken hata oluştu!");
  }
}

// ==========================================
// ŞİFRE SIFIRLA
// ==========================================

async function resetPassword(userId) {
  const user = allUsers.find((u) => u.id === userId);

  if (!user) {
    Bildirim.error("Kullanıcı bulunamadı!");
    return;
  }

  const yeniSifre = await Bildirim.prompt(
    `**👤 Kullanıcı:** ${user.ad_soyad}\n\n` +
      `**🔐 Yeni şifre girin:**\n\n` +
      `⚠️ Şifre en az 4 karakter olmalıdır.`,
    "Şifre Sıfırla",
    {
      icon: "🔑",
      confirmText: "Sıfırla",
      cancelText: "İptal",
      placeholder: "Yeni şifre...",
    }
  );

  if (!yeniSifre || yeniSifre.length < 4) {
    if (yeniSifre !== null) {
      Bildirim.error("Şifre en az 4 karakter olmalıdır!");
    }
    return;
  }

  try {
    const result = await ipcRenderer.invoke(
      "reset-user-password",
      userId,
      yeniSifre
    );

    if (result.success) {
      await Bildirim.confirm(
        `**✅ Şifre Sıfırlandı!**\n\n` +
          `👤 **Kullanıcı:** ${user.ad_soyad}\n` +
          `🔑 **Yeni Şifre:** \`${result.yeni_sifre}\`\n\n` +
          `⚠️ Bu şifreyi kullanıcıya iletin!`,
        "Şifre Sıfırlandı",
        {
          icon: "✅",
          confirmText: "Tamam",
          cancelText: "📋 Kopyala",
        }
      ).then((action) => {
        if (action === "cancel") {
          navigator.clipboard.writeText(result.yeni_sifre);
          Bildirim.success("Şifre kopyalandı!");
        }
      });
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Şifre sıfırlama hatası:", error);
    Bildirim.error("Şifre sıfırlanırken hata oluştu!");
  }
}

// ==========================================
// DURUM DEĞİŞTİR
// ==========================================

async function toggleStatus(userId) {
  const user = allUsers.find((u) => u.id === userId);

  if (!user) {
    Bildirim.error("Kullanıcı bulunamadı!");
    return;
  }

  const newStatus =
    user.durum === 1 ? "pasifleştirilecek" : "aktifleştirilecek";

  const confirm = await Bildirim.confirm(
    `**${user.ad_soyad}** kullanıcısı ${newStatus}. Onaylıyor musunuz?`,
    "Durum Değiştir",
    {
      icon: "⚠️",
      confirmText: "Evet",
      cancelText: "Hayır",
    }
  );

  if (confirm !== true) return;

  try {
    const result = await ipcRenderer.invoke("toggle-user-status", userId);

    if (result.success) {
      Bildirim.success(result.message);
      loadUsers();
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Durum değiştirme hatası:", error);
    Bildirim.error("Durum değiştirilirken hata oluştu!");
  }
}

// ==========================================
// KULLANICI SİL
// ==========================================

async function deleteUser(userId) {
  const user = allUsers.find((u) => u.id === userId);

  if (!user) {
    Bildirim.error("Kullanıcı bulunamadı!");
    return;
  }

  if (user.kullanici_adi === "admin") {
    Bildirim.error("Admin kullanıcısı silinemez!");
    return;
  }

  const confirm = await Bildirim.confirm(
    `**${user.ad_soyad}** kullanıcısı kalıcı olarak silinecek. Onaylıyor musunuz?`,
    "Kullanıcı Sil",
    {
      icon: "🗑️",
      confirmText: "Evet, Sil",
      cancelText: "Hayır",
      type: "danger",
    }
  );

  if (confirm !== true) return;

  try {
    const result = await ipcRenderer.invoke("delete-user", userId);

    if (result.success) {
      Bildirim.success("Kullanıcı başarıyla silindi!");
      loadUsers();
    } else {
      Bildirim.error(result.message);
    }
  } catch (error) {
    console.error("❌ Kullanıcı silme hatası:", error);
    Bildirim.error("Kullanıcı silinirken hata oluştu!");
  }
}

// ==========================================
// MODAL KAPAT
// ==========================================

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

console.log("✅ Kullanıcı Yönetimi scripti yüklendi");
