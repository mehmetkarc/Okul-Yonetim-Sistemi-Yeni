// ==========================================
// 📊 CANLI DAĞITIM - GRID MANAGER
// ==========================================

class CanliDagitimGridManager {
  // ✅ DEĞİŞTİ
  constructor(main) {
    this.main = main;
    this.gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    console.log("✅ GridManager oluşturuldu");
  }

  // Grid'i render et
  render() {
    console.log("📊 Grid render ediliyor...");

    const gridContainer = document.getElementById("canliProgramGrid");
    if (!gridContainer) {
      console.error("❌ canliProgramGrid bulunamadı!");
      return;
    }

    if (this.main.goruntulemeModu === "ogretmen") {
      gridContainer.innerHTML = this.renderOgretmenGorunumu();
    } else {
      gridContainer.innerHTML = this.renderSinifGorunumu();
    }

    console.log("✅ Grid render tamamlandı");
  }

  // Öğretmen Görünümü
  renderOgretmenGorunumu() {
    if (!this.main.aktifOgretmen && this.main.ogretmenler.length > 0) {
      this.main.aktifOgretmen = this.main.ogretmenler[0];
    }

    if (!this.main.aktifOgretmen) {
      return `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 60px; text-align: center;">
          <div>
            <div style="font-size: 80px; margin-bottom: 20px;">👨‍🏫</div>
            <h3 style="font-size: 22px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px;">Öğretmen Seçilmedi</h3>
            <p style="font-size: 15px; color: #6c757d;">Sol panelden bir öğretmen seçin</p>
          </div>
        </div>
      `;
    }

    const ogretmen = this.main.aktifOgretmen;
    const ogretmenBloklar = this.main.bloklar.filter(
      (b) => b.ogretmen_id === ogretmen.id
    );

    return `
      <div style="padding: 20px; background: #f8f9fa; border-bottom: 3px solid #e9ecef;">
        <h2 style="font-size: 24px; font-weight: 900; color: #1a1a1a; margin-bottom: 8px;">
          ${ogretmen.kod || ogretmen.ad} - ${ogretmen.tamAd}
        </h2>
        <p style="font-size: 15px; color: #6c757d;">
          ${ogretmen.brans || "—"} • Haftalık: ${ogretmenBloklar.length} blok
        </p>
      </div>
      
      <div style="overflow: auto; height: calc(100% - 100px);">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr>
              <th style="background: #dc3545; color: white; padding: 16px 12px; font-weight: 900; position: sticky; top: 0; z-index: 10; min-width: 100px; font-size: 15px;">SAAT</th>
              ${this.gunler
                .map(
                  (gun) =>
                    `<th style="background: #dc3545; color: white; padding: 16px 12px; font-weight: 900; position: sticky; top: 0; z-index: 10; font-size: 15px;">${gun}</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${this.renderOgretmenSatirlar(ogretmen)}
          </tbody>
        </table>
      </div>
    `;
  }

  // Öğretmen Satırları
  renderOgretmenSatirlar(ogretmen) {
    let html = "";

    for (let saat = 1; saat <= 8; saat++) {
      html += `<tr>`;
      html += `<td style="font-weight: 900; background: #fff3e0; color: #1a1a1a; padding: 12px; text-align: center; border: 2px solid #e9ecef; font-size: 16px;">${saat}. DERS</td>`;

      this.gunler.forEach((gun) => {
        const blok = this.main.bloklar.find(
          (b) =>
            b.ogretmen_id === ogretmen.id &&
            b.gun === gun && // ✅ Artık eşleşir
            b.saat_no === saat
        );

        if (blok) {
          html += `
            <td style="background: ${blok.renk}40; border: 3px solid ${blok.renk}; padding: 8px; position: relative;">
              <div style="background: white; color: #1a1a1a; border-left: 5px solid ${blok.renk}; padding: 10px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                   onclick="canliDagitimGrid.blokTiklandi(${blok.id})"
                   draggable="true"
                   ondragstart="canliDagitimGrid.dragStart(event, ${blok.id})">
                <div style="font-weight: 900; font-size: 14px; margin-bottom: 4px; color: #1a1a1a;">
                  ${blok.sinif_kodu}
                </div>
                <div style="font-size: 12px; color: #495057; font-weight: 600;">
                  ${blok.ders_kodu}
                </div>
                <div style="font-size: 11px; color: #6c757d; margin-top: 4px;">
                  Blok ${blok.blok_no}/${blok.toplam_blok} (${blok.blok_saat}s)
                </div>
              </div>
            </td>
          `;
        } else {
          html += `
            <td style="background: white; border: 2px solid #e9ecef; padding: 8px;"
                ondrop="canliDagitimGrid.drop(event, '${gun}', ${saat})"
                ondragover="canliDagitimGrid.allowDrop(event)"
                ondragenter="canliDagitimGrid.dragEnter(event)"
                ondragleave="canliDagitimGrid.dragLeave(event)">
              <div style="height: 70px; display: flex; align-items: center; justify-content: center; color: #dee2e6; font-size: 20px; font-weight: 900;">
                BOŞ
              </div>
            </td>
          `;
        }
      });

      html += `</tr>`;
    }

    return html;
  }

  // Sınıf Görünümü
  renderSinifGorunumu() {
    if (!this.main.aktifSinif && this.main.siniflar.length > 0) {
      this.main.aktifSinif = this.main.siniflar[0];
    }

    if (!this.main.aktifSinif) {
      return `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 60px; text-align: center;">
          <div>
            <div style="font-size: 80px; margin-bottom: 20px;">🏫</div>
            <h3 style="font-size: 22px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px;">Sınıf Seçilmedi</h3>
            <p style="font-size: 15px; color: #6c757d;">Sol panelden bir sınıf seçin</p>
          </div>
        </div>
      `;
    }

    const sinif = this.main.aktifSinif;
    const sinifBloklar = this.main.bloklar.filter(
      (b) => b.sinif_id === sinif.id
    );

    return `
      <div style="padding: 20px; background: #f8f9fa; border-bottom: 3px solid #e9ecef;">
        <h2 style="font-size: 24px; font-weight: 900; color: #1a1a1a; margin-bottom: 8px;">
          ${sinif.kod}
        </h2>
        <p style="font-size: 15px; color: #6c757d;">
          Seviye ${sinif.seviye} • ${sinif.ogrenciSayisi || 0} öğrenci • ${
      sinifBloklar.length
    } blok
        </p>
      </div>
      
      <div style="overflow: auto; height: calc(100% - 100px);">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr>
              <th style="background: #dc3545; color: white; padding: 16px 12px; font-weight: 900; position: sticky; top: 0; z-index: 10; min-width: 100px; font-size: 15px;">SAAT</th>
              ${this.gunler
                .map(
                  (gun) =>
                    `<th style="background: #dc3545; color: white; padding: 16px 12px; font-weight: 900; position: sticky; top: 0; z-index: 10; font-size: 15px;">${gun}</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${this.renderSinifSatirlar(sinif)}
          </tbody>
        </table>
      </div>
    `;
  }

  // Sınıf Satırları
  renderSinifSatirlar(sinif) {
    let html = "";

    for (let saat = 1; saat <= 8; saat++) {
      html += `<tr>`;
      html += `<td style="font-weight: 900; background: #fff3e0; color: #1a1a1a; padding: 12px; text-align: center; border: 2px solid #e9ecef; font-size: 16px;">${saat}. DERS</td>`;

      this.gunler.forEach((gun) => {
        const blok = this.main.bloklar.find(
          (b) => b.sinif_id === sinif.id && b.gun === gun && b.saat_no === saat
        );

        if (blok) {
          html += `
            <td style="background: ${blok.renk}40; border: 3px solid ${blok.renk}; padding: 8px;">
              <div style="background: white; color: #1a1a1a; border-left: 5px solid ${blok.renk}; padding: 10px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                   onclick="canliDagitimGrid.blokTiklandi(${blok.id})">
                <div style="font-weight: 900; font-size: 14px; margin-bottom: 4px;">
                  ${blok.ders_kodu}
                </div>
                <div style="font-size: 12px; color: #495057; font-weight: 600;">
                  ${blok.ogretmen_kod}
                </div>
              </div>
            </td>
          `;
        } else {
          html += `
            <td style="background: white; border: 2px solid #e9ecef; padding: 8px;">
              <div style="height: 70px; display: flex; align-items: center; justify-content: center; color: #dee2e6; font-size: 20px; font-weight: 900;">
                BOŞ
              </div>
            </td>
          `;
        }
      });

      html += `</tr>`;
    }

    return html;
  }

  // Blok tıklandı
  blokTiklandi(blokId) {
    console.log("🖱️ Blok tıklandı:", blokId);
    if (this.main.blokManager) {
      this.main.blokManager.blokSec(blokId);
    }
  }

  // Drag & Drop
  dragStart(event, blokId) {
    event.dataTransfer.setData("blokId", blokId);
    event.target.style.opacity = "0.5";
  }

  allowDrop(event) {
    event.preventDefault();
  }

  dragEnter(event) {
    event.preventDefault();
    event.currentTarget.style.background = "#e3f2fd";
  }

  dragLeave(event) {
    event.currentTarget.style.background = "white";
  }

  drop(event, gun, saatNo) {
    event.preventDefault();
    event.currentTarget.style.background = "white";

    const blokId = parseInt(event.dataTransfer.getData("blokId"));
    if (this.main.blokManager) {
      this.main.blokManager.blokYerlestir(blokId, gun, saatNo);
    }
  }

  // Öğretmen değiştir
  ogretmenDegistir(ogretmenId) {
    this.main.aktifOgretmen = this.main.ogretmenler.find(
      (o) => o.id === ogretmenId
    );
    this.render();
  }

  // Sınıf değiştir
  sinifDegistir(sinifId) {
    this.main.aktifSinif = this.main.siniflar.find((s) => s.id === sinifId);
    this.render();
  }
}

// Export
window.CanliDagitimGridManager = CanliDagitimGridManager; // ✅ DEĞİŞTİ
window.canliDagitimGrid = null;

console.log("✅ Canlı Dağıtım Grid Manager yüklendi");
