/**
 * ============================================
 * AKILLI SÜRÜKLE-BIRAK SİSTEMİ
 * ============================================
 * Program tablosuna ders/öğretmen ekleme
 */

class ScheduleDragDrop {
  constructor() {
    if (ScheduleDragDrop.instance) {
      return ScheduleDragDrop.instance;
    }

    this.draggedElement = null;
    this.draggedData = null;
    this.isDragging = false;

    ScheduleDragDrop.instance = this;
  }

  // ============================================
  // SİSTEMİ BAŞLAT
  // ============================================

  init() {
    console.log("🎯 Sürükle-bırak sistemi başlatılıyor...");

    this.initDraggableItems();
    this.initDropZones();
    this.initContextMenu(); // ✅ Sağ tık menüsü ayrı başlatılıyor

    console.log("✅ Sürükle-bırak sistemi hazır");
  }

  // ============================================
  // SÜRÜKLENEBİLİR ÖĞELER
  // ============================================

  initDraggableItems() {
    // Ders kartları
    document.addEventListener("dragstart", (e) => {
      const dersItem = e.target.closest(".draggable-item[data-type='ders']");
      if (dersItem) {
        this.onDragStart(e, {
          type: "ders",
          id: dersItem.dataset.id,
          kod: dersItem.dataset.kod,
          ad: dersItem.dataset.ad,
          renk: dersItem.dataset.renk,
        });
      }

      // Öğretmen kartları
      const ogretmenItem = e.target.closest(
        ".draggable-item[data-type='ogretmen']"
      );
      if (ogretmenItem) {
        this.onDragStart(e, {
          type: "ogretmen",
          id: ogretmenItem.dataset.id,
          kod: ogretmenItem.dataset.kod,
          ad: ogretmenItem.dataset.ad,
        });
      }
    });

    document.addEventListener("dragend", (e) => {
      const draggableItem = e.target.closest(".draggable-item");
      if (draggableItem) {
        this.onDragEnd(e);
      }
    });
  }

  // ============================================
  // DROP ZONLARI (TABLO HÜCRELERİ)
  // ============================================

  initDropZones() {
    document.addEventListener("dragover", (e) => {
      const cell = e.target.closest(".cell-content:not(.disabled)");
      if (cell && this.isDragging) {
        e.preventDefault();
        this.onDragOver(e, cell);
      }
    });

    document.addEventListener("dragleave", (e) => {
      const cell = e.target.closest(".cell-content");
      if (cell) {
        this.onDragLeave(e, cell);
      }
    });

    document.addEventListener("drop", (e) => {
      const cell = e.target.closest(".cell-content:not(.disabled)");
      if (cell && this.isDragging) {
        e.preventDefault();
        this.onDrop(e, cell);
      }
    });
  }

  // ============================================
  // SAĞ TIK MENÜSÜ BAŞLATMA
  // ============================================

  initContextMenu() {
    // ✅ Event delegation ile sağ tık menüsü
    document.addEventListener("contextmenu", (e) => {
      const cell = e.target.closest(".cell-content[data-gun][data-saat]");
      if (cell) {
        const gun = cell.dataset.gun;
        const saat = cell.dataset.saat;

        // Hücrede veri var mı kontrol et
        if (programData[gun] && programData[gun][saat]) {
          e.preventDefault();
          e.stopPropagation();
          this.showContextMenu(e, gun, saat);
          console.log("🖱️ Sağ tık menüsü açıldı:", gun, saat);
        }
      }
    });

    console.log("✅ Sağ tık menüsü event listener'ı eklendi");
  }

  // ============================================
  // DRAG EVENTLARI
  // ============================================

  onDragStart(event, data) {
    console.log("🎯 Sürükleme başladı:", data);

    this.isDragging = true;
    this.draggedElement = event.target;
    this.draggedData = data;

    // Görsel efekt
    event.target.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify(data));

    // Drop alanlarını highlight et
    this.highlightDropZones(true);
  }

  onDragEnd(event) {
    console.log("🎯 Sürükleme bitti");

    this.isDragging = false;
    event.target.classList.remove("dragging");

    // Highlight'ı kaldır
    this.highlightDropZones(false);

    // Tüm hover efektlerini temizle
    document.querySelectorAll(".drop-hover").forEach((el) => {
      el.classList.remove("drop-hover");
    });
  }

  onDragOver(event, cell) {
    cell.classList.add("drop-hover");
  }

  onDragLeave(event, cell) {
    cell.classList.remove("drop-hover");
  }

  async onDrop(event, cell) {
    cell.classList.remove("drop-hover");

    const gun = cell.dataset.gun;
    const saat = cell.dataset.saat;

    console.log("📍 Drop yapıldı:", { gun, saat, data: this.draggedData });

    if (this.draggedData.type === "ders") {
      await this.dropDers(gun, saat, this.draggedData);
    } else if (this.draggedData.type === "ogretmen") {
      await this.dropOgretmen(gun, saat, this.draggedData);
    }

    this.draggedData = null;
    this.draggedElement = null;
  }

  // ============================================
  // DERS DROP İŞLEMİ
  // ============================================

  async dropDers(gun, saat, dersData) {
    console.log("📚 Ders yerleştiriliyor:", dersData);

    // Hücrede zaten ders var mı?
    if (programData[gun] && programData[gun][saat]?.ders_id) {
      const onay = confirm(
        "Bu hücrede zaten bir ders var. Değiştirmek istiyor musunuz?"
      );
      if (!onay) return;
    }

    // ✅ KISIT KONTROLÜ
    if (window.ConstraintManager) {
      const kisitSonuc = window.ConstraintManager.kontrolEt(
        gun,
        saat,
        dersData.id,
        null,
        null,
        programData
      );

      if (!kisitSonuc.success) {
        const mesajlar = kisitSonuc.ihlaller
          .map((i) => `• ${i.mesaj}`)
          .join("\n");

        if (window.ModernBildirim) {
          ModernBildirim.warning("⚠️ Kısıt İhlali", mesajlar);
        }

        window.ConstraintManager.ihlalKaydet(
          gun,
          saat,
          dersData.id,
          null,
          null,
          kisitSonuc.ihlaller
        );

        const onay = confirm(
          `⚠️ KISIT İHLALİ BULUNDU!\n\n${mesajlar}\n\nYine de yerleştirmek istiyor musunuz?`
        );

        if (!onay) {
          if (typeof addLog === "function") {
            addLog(
              `❌ ${dersData.ad} dersi kısıt ihlali nedeniyle yerleştirilemedi`
            );
          }
          return;
        }
      }
    }

    // Dersi yerleştir
    if (!programData[gun]) {
      programData[gun] = {};
    }

    programData[gun][saat] = {
      ders_id: dersData.id,
      ders_kodu: dersData.kod,
      ders_adi: dersData.ad,
      ogretmen_id: null,
      ogretmen_kod: null,
      sinif_id: null,
      sinif_kodu: null,
      renk: dersData.renk || "#4ECDC4",
      cakili: false,
    };

    // Hücreyi güncelle
    this.updateCell(gun, saat);

    // İstatistikleri güncelle
    if (typeof updateStats === "function") {
      updateStats();
    }

    // Log ekle
    if (typeof addLog === "function") {
      addLog(
        `✅ ${dersData.ad} dersi ${gun}. gün ${saat}. saate yerleştirildi`
      );
    }

    // Başarı bildirimi
    if (window.ModernBildirim) {
      ModernBildirim.success(
        "Ders Yerleştirildi",
        `${dersData.ad} dersi programa eklendi`
      );
    }

    // ✅ ÖĞRETMEN ÖNERİSİ GÖSTER
    setTimeout(() => {
      this.ogretmenOneriGoster(gun, saat, dersData.id);
    }, 500);
  }

  // ============================================
  // ÖĞRETMEN DROP İŞLEMİ
  // ============================================

  async dropOgretmen(gun, saat, ogretmenData) {
    console.log("👨‍🏫 Öğretmen atanıyor:", ogretmenData);

    // Hücrede ders var mı?
    if (!programData[gun] || !programData[gun][saat]?.ders_id) {
      if (window.ModernBildirim) {
        ModernBildirim.warning(
          "Hücre Boş",
          "Önce bu hücreye bir ders yerleştirmelisiniz!"
        );
      }
      return;
    }

    const hucre = programData[gun][saat];

    // ✅ KISIT KONTROLÜ (Öğretmen çakışması)
    if (window.ConstraintManager) {
      const kisitSonuc = window.ConstraintManager.kontrolEt(
        gun,
        saat,
        hucre.ders_id,
        ogretmenData.id,
        hucre.sinif_id,
        programData
      );

      if (!kisitSonuc.success) {
        const mesajlar = kisitSonuc.ihlaller
          .map((i) => `• ${i.mesaj}`)
          .join("\n");

        if (window.ModernBildirim) {
          ModernBildirim.warning("⚠️ Kısıt İhlali", mesajlar);
        }

        const onay = confirm(
          `⚠️ KISIT İHLALİ!\n\n${mesajlar}\n\nYine de atamak istiyor musunuz?`
        );

        if (!onay) {
          if (typeof addLog === "function") {
            addLog(
              `❌ ${ogretmenData.ad} öğretmen kısıt ihlali nedeniyle atanamadı`
            );
          }
          return;
        }
      }
    }

    // Öğretmeni ata
    programData[gun][saat].ogretmen_id = ogretmenData.id;
    programData[gun][saat].ogretmen_kod = ogretmenData.kod;
    programData[gun][saat].ogretmen_adi = ogretmenData.ad;

    // Hücreyi güncelle
    this.updateCell(gun, saat);

    // İstatistikleri güncelle
    if (typeof updateStats === "function") {
      updateStats();
    }

    // Log ekle
    if (typeof addLog === "function") {
      addLog(
        `✅ ${ogretmenData.ad} öğretmen ${gun}. gün ${saat}. saate atandı`
      );
    }

    // Başarı bildirimi
    if (window.ModernBildirim) {
      ModernBildirim.success(
        "Öğretmen Atandı",
        `${ogretmenData.ad} derse atandı`
      );
    }
  }

  // ============================================
  // HÜCRE GÜNCELLEME
  // ============================================

  updateCell(gun, saat) {
    const cell = document.querySelector(
      `.cell-content[data-gun="${gun}"][data-saat="${saat}"]`
    );

    if (!cell) {
      console.warn(`❌ Hücre bulunamadı: ${gun}-${saat}`);
      return;
    }

    const data = programData[gun][saat];

    if (!data || !data.ders_id) {
      cell.innerHTML = `<div class="cell-empty">Boş</div>`;
      cell.style.backgroundColor = "";
      cell.classList.remove("filled");
      cell.classList.add("empty");
      return;
    }

    // Ders kartı oluştur
    const dersRengi = data.renk || "#4ECDC4";
    cell.style.backgroundColor = dersRengi;
    cell.classList.remove("empty");
    cell.classList.add("filled");

    cell.innerHTML = `
      <div class="cell-ders">
        <div class="cell-ders-header">
          <span class="cell-ders-kod">${data.ders_kodu}</span>
          ${data.cakili ? '<span class="cell-pin">📌</span>' : ""}
        </div>
        <div class="cell-ders-ad">${data.ders_adi}</div>
        ${
          data.ogretmen_kod
            ? `<div class="cell-ogretmen">${data.ogretmen_kod}</div>`
            : '<div class="cell-ogretmen-yok">Öğretmen atanmadı</div>'
        }
        ${
          data.sinif_kodu
            ? `<div class="cell-sinif">${data.sinif_kodu}</div>`
            : ""
        }
      </div>
    `;

    console.log(`✅ Hücre güncellendi: ${gun}-${saat}`, data);
  }

  // ============================================
  // SAĞ TIK MENÜSÜ
  // ============================================

  showContextMenu(event, gun, saat) {
    console.log("🖱️ Context menü gösteriliyor:", gun, saat);

    // Mevcut menüleri kaldır
    document.querySelectorAll(".context-menu").forEach((m) => m.remove());

    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.position = "fixed";
    menu.style.left = event.clientX + "px";
    menu.style.top = event.clientY + "px";
    menu.style.zIndex = "10000";

    const data = programData[gun][saat];

    menu.innerHTML = `
      <div class="context-menu-item" data-action="pin" data-gun="${gun}" data-saat="${saat}">
        ${data?.cakili ? "📌 Sabitlemeyi Kaldır" : "📍 Sabit Tut"}
      </div>
      <div class="context-menu-item" data-action="edit" data-gun="${gun}" data-saat="${saat}">
        ✏️ Düzenle
      </div>
      <div class="context-menu-item danger" data-action="remove" data-gun="${gun}" data-saat="${saat}">
        🗑️ Sil
      </div>
    `;

    document.body.appendChild(menu);

    // Menü item tıklamalarını dinle
    menu.querySelectorAll(".context-menu-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        const g = item.dataset.gun;
        const s = item.dataset.saat;

        console.log("🖱️ Menü item tıklandı:", action, g, s);

        if (action === "pin") {
          this.pinDers(g, s);
        } else if (action === "edit") {
          this.editDers(g, s);
        } else if (action === "remove") {
          this.removeDers(g, s);
        }

        menu.remove();
      });
    });

    // Dışarı tıklanınca kapat
    setTimeout(() => {
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      document.addEventListener("click", closeMenu);
    }, 100);
  }

  // ============================================
  // HÜCRE İŞLEMLERİ
  // ============================================

  pinDers(gun, saat) {
    console.log("📌 Pin/Unpin:", gun, saat);

    if (!programData[gun] || !programData[gun][saat]) return;

    programData[gun][saat].cakili = !programData[gun][saat].cakili;
    this.updateCell(gun, saat);

    const durum = programData[gun][saat].cakili
      ? "sabitlendi"
      : "serbest bırakıldı";

    if (typeof addLog === "function") {
      addLog(`📌 ${programData[gun][saat].ders_adi} dersi ${durum}`);
    }

    if (window.ModernBildirim) {
      ModernBildirim.success(
        durum === "sabitlendi" ? "Sabitlendi" : "Serbest Bırakıldı",
        `${programData[gun][saat].ders_adi} dersi ${durum}`
      );
    }
  }

  editDers(gun, saat) {
    console.log("✏️ Düzenleme:", gun, saat);

    if (window.ModernBildirim) {
      ModernBildirim.info("Geliştiriliyor", "Bu özellik yakında eklenecek");
    }
  }

  removeDers(gun, saat) {
    console.log("🗑️ Silme:", gun, saat);

    if (!programData[gun] || !programData[gun][saat]) return;

    const dersAdi = programData[gun][saat].ders_adi;

    const onay = confirm(
      `${dersAdi} dersini silmek istediğinize emin misiniz?`
    );
    if (!onay) return;

    delete programData[gun][saat];
    this.updateCell(gun, saat);

    if (typeof updateStats === "function") {
      updateStats();
    }

    if (typeof addLog === "function") {
      addLog(`🗑️ ${dersAdi} dersi silindi`);
    }

    if (window.ModernBildirim) {
      ModernBildirim.success("Silindi", "Ders programdan kaldırıldı");
    }
  }

  // ============================================
  // ÖĞRETMEN ÖNERİSİ
  // ============================================

  ogretmenOneriGoster(gun, saat, dersId) {
    // allOgretmenler global değişkeninden uygun öğretmenleri bul
    if (!window.allOgretmenler || allOgretmenler.length === 0) {
      console.warn("⚠️ Öğretmen listesi bulunamadı");
      return;
    }

    // Dersin branşına uygun öğretmenleri bul
    const ders = allDersler.find((d) => d.id === dersId);
    if (!ders) {
      console.warn("⚠️ Ders bulunamadı:", dersId);
      return;
    }

    const uygunOgretmenler = allOgretmenler.filter(
      (ogr) => ogr.brans === ders.brans
    );

    if (uygunOgretmenler.length === 0) {
      if (window.ModernBildirim) {
        ModernBildirim.info(
          "Öğretmen Bulunamadı",
          "Bu ders için uygun öğretmen bulunamadı"
        );
      }
      return;
    }

    // Modal göster
    const modal = document.createElement("div");
    modal.className = "modern-modal";
    modal.innerHTML = `
      <div class="modern-modal-overlay"></div>
      <div class="modern-modal-content">
        <div class="modern-modal-header">
          <h3>🤖 Öğretmen Önerisi</h3>
          <button class="modern-modal-close">&times;</button>
        </div>
        <div class="modern-modal-body">
          <p>Bu ders için uygun öğretmenler:</p>
          <div class="ogretmen-oneri-liste">
            ${uygunOgretmenler
              .slice(0, 3)
              .map(
                (ogr) => `
              <div class="ogretmen-oneri-item" 
                   data-ogr-id="${ogr.id}"
                   data-ogr-kod="${ogr.ogretmen_kodu}"
                   data-ogr-ad="${ogr.ad_soyad}"
                   data-gun="${gun}"
                   data-saat="${saat}">
                <div class="ogretmen-avatar">${ogr.ad_soyad
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}</div>
                <div class="ogretmen-bilgi">
                  <strong>${ogr.ad_soyad}</strong>
                  <span>${ogr.brans}</span>
                </div>
                <button class="btn-primary-sm btn-select-ogretmen">Seç</button>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Seçim butonlarını dinle
    modal.querySelectorAll(".btn-select-ogretmen").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const item = e.target.closest(".ogretmen-oneri-item");
        this.selectOgretmen(
          item.dataset.gun,
          item.dataset.saat,
          item.dataset.ogrId,
          item.dataset.ogrKod,
          item.dataset.ogrAd
        );
      });
    });

    // Kapatma eventi
    modal.querySelector(".modern-modal-close").onclick = () => modal.remove();
    modal.querySelector(".modern-modal-overlay").onclick = () => modal.remove();
  }

  selectOgretmen(gun, saat, ogretmenId, ogretmenKod, ogretmenAd) {
    console.log("👨‍🏫 Öğretmen seçildi:", ogretmenAd);

    this.dropOgretmen(gun, saat, {
      id: ogretmenId,
      kod: ogretmenKod,
      ad: ogretmenAd,
    });

    // Modal'ı kapat
    document.querySelector(".modern-modal")?.remove();
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  highlightDropZones(show) {
    const cells = document.querySelectorAll(".cell-content:not(.disabled)");
    cells.forEach((cell) => {
      if (show) {
        cell.classList.add("drop-zone-active");
      } else {
        cell.classList.remove("drop-zone-active");
      }
    });
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

const scheduleDragDrop = new ScheduleDragDrop();
window.scheduleDragDrop = scheduleDragDrop; // <-- Bu satır kritik
window.ScheduleDragDrop = ScheduleDragDrop;

console.log("✅ ScheduleDragDrop hazır");
