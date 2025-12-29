/**
 * ============================================
 * PROGRAM GÖRÜNTÜLEME SİSTEMİ
 * ============================================
 * Sınıf ve öğretmen programlarını görüntüler
 */

class ScheduleViewer {
  constructor() {
    if (ScheduleViewer.instance) {
      return ScheduleViewer.instance;
    }

    this.currentView = "sinif";
    this.selectedSinifId = null;
    this.selectedOgretmenId = null;
    this.programData = {};

    ScheduleViewer.instance = this;
  }

  // ============================================
  // ANA GÖRÜNÜM BAŞLATMA
  // ============================================

  init() {
    console.log("📊 ScheduleViewer başlatılıyor...");

    this.setupEventListeners();
    this.loadSinifSelector();
    this.loadOgretmenSelector();

    console.log("✅ ScheduleViewer hazır");
  }

  // ============================================
  // EVENT LİSTENERLAR
  // ============================================

  setupEventListeners() {
    const selectSinif = document.getElementById("selectViewSinif");
    if (selectSinif) {
      selectSinif.addEventListener("change", () => {
        this.selectedSinifId = selectSinif.value;
        if (this.selectedSinifId) {
          this.showSinifProgram(this.selectedSinifId);
        }
      });
    }

    const selectOgretmen = document.getElementById("selectViewOgretmen");
    if (selectOgretmen) {
      selectOgretmen.addEventListener("change", () => {
        this.selectedOgretmenId = selectOgretmen.value;
        if (this.selectedOgretmenId) {
          this.showOgretmenProgram(this.selectedOgretmenId);
        }
      });
    }

    const btnViewSinif = document.getElementById("btnViewSinif");
    const btnViewOgretmen = document.getElementById("btnViewOgretmen");

    if (btnViewSinif) {
      btnViewSinif.addEventListener("click", () => this.switchView("sinif"));
    }

    if (btnViewOgretmen) {
      btnViewOgretmen.addEventListener("click", () =>
        this.switchView("ogretmen")
      );
    }

    const btnPrintProgram = document.getElementById("btnPrintProgram");
    if (btnPrintProgram) {
      btnPrintProgram.addEventListener("click", () => this.printProgram());
    }
  }

  // ============================================
  // GÖRÜNÜM DEĞİŞTİRME
  // ============================================

  switchView(view) {
    this.currentView = view;

    const btnViewSinif = document.getElementById("btnViewSinif");
    const btnViewOgretmen = document.getElementById("btnViewOgretmen");

    if (btnViewSinif && btnViewOgretmen) {
      if (view === "sinif") {
        btnViewSinif.classList.add("active");
        btnViewOgretmen.classList.remove("active");
      } else {
        btnViewOgretmen.classList.add("active");
        btnViewSinif.classList.remove("active");
      }
    }

    const sinifView = document.getElementById("sinifProgramView");
    const ogretmenView = document.getElementById("ogretmenProgramView");

    if (sinifView && ogretmenView) {
      if (view === "sinif") {
        sinifView.style.display = "block";
        ogretmenView.style.display = "none";
      } else {
        sinifView.style.display = "none";
        ogretmenView.style.display = "block";
      }
    }

    console.log("📊 Görünüm değişti:", view);
  }

  // ============================================
  // SINIF SEÇİCİ
  // ============================================

  loadSinifSelector() {
    if (!window.ScheduleDataManager) return;

    const select = document.getElementById("selectViewSinif");
    if (!select) return;

    const siniflar = window.ScheduleDataManager.getSiniflar();

    select.innerHTML = '<option value="">-- Sınıf Seçin --</option>';

    siniflar.forEach((sinif) => {
      const option = document.createElement("option");
      option.value = sinif.id;
      option.textContent = sinif.kod;
      select.appendChild(option);
    });

    console.log("✅ Sınıf seçici yüklendi:", siniflar.length, "sınıf");
  }

  // ============================================
  // ÖĞRETMEN SEÇİCİ
  // ============================================

  loadOgretmenSelector() {
    if (!window.ScheduleDataManager) return;

    const select = document.getElementById("selectViewOgretmen");
    if (!select) return;

    const ogretmenler = window.ScheduleDataManager.getOgretmenler();

    select.innerHTML = '<option value="">-- Öğretmen Seçin --</option>';

    ogretmenler.forEach((ogr) => {
      const option = document.createElement("option");
      option.value = ogr.id;
      option.textContent = ogr.tamAd + " (" + (ogr.brans || "Branş Yok") + ")";
      select.appendChild(option);
    });

    console.log("✅ Öğretmen seçici yüklendi:", ogretmenler.length, "öğretmen");
  }

  // ============================================
  // SINIF PROGRAMI GÖSTER
  // ============================================

  showSinifProgram(sinifId) {
    console.log("📊 Sınıf programı gösteriliyor:", sinifId);

    const sinif = window.ScheduleDataManager.sinifBul(sinifId);
    if (!sinif) {
      console.error("❌ Sınıf bulunamadı:", sinifId);
      return;
    }

    const program = this.getSinifProgramFromGlobal(sinifId);
    this.renderSinifTable(sinif, program);
  }

  // ============================================
  // ÖĞRETMEN PROGRAMI GÖSTER
  // ============================================

  showOgretmenProgram(ogretmenId) {
    console.log("📊 Öğretmen programı gösteriliyor:", ogretmenId);

    const ogretmen = window.ScheduleDataManager.ogretmenBul(ogretmenId);
    if (!ogretmen) {
      console.error("❌ Öğretmen bulunamadı:", ogretmenId);
      return;
    }

    const program = this.getOgretmenProgramFromGlobal(ogretmenId);
    this.renderOgretmenTable(ogretmen, program);
  }

  // ============================================
  // GLOBAL programData'DAN VERİ ÇEK
  // ============================================

  getSinifProgramFromGlobal(sinifId) {
    const program = {};

    if (window.programData) {
      for (const gun in window.programData) {
        program[gun] = {};
        for (const saat in window.programData[gun]) {
          const hucre = window.programData[gun][saat];
          if (hucre.sinif_id === sinifId) {
            program[gun][saat] = hucre;
          }
        }
      }
    }

    return program;
  }

  getOgretmenProgramFromGlobal(ogretmenId) {
    const program = {};

    if (window.programData) {
      for (const gun in window.programData) {
        program[gun] = {};
        for (const saat in window.programData[gun]) {
          const hucre = window.programData[gun][saat];
          if (hucre.ogretmen_id === ogretmenId) {
            program[gun][saat] = hucre;
          }
        }
      }
    }

    return program;
  }
  // ============================================
  // SINIF TABLOSU RENDER
  // ============================================

  renderSinifTable(sinif, program) {
    const container = document.getElementById("sinifProgramTable");
    if (!container) return;

    const gunler = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    let html = '<div class="program-header">';
    html += "<h2>" + sinif.kod + " SINIFI DERS PROGRAMI</h2>";
    html += "<p>Öğrenci Sayısı: " + (sinif.ogrenciSayisi || "-") + "</p>";
    html += "</div>";
    html += '<table class="program-table"><thead><tr>';
    html += '<th class="saat-col">SAAT</th>';

    for (let gun = 1; gun <= 5; gun++) {
      html += '<th class="gun-col">' + gunler[gun] + "</th>";
    }

    html += "</tr></thead><tbody>";

    for (let saat = 1; saat <= 8; saat++) {
      html += '<tr><td class="saat-cell">' + saat + "</td>";

      for (let gun = 1; gun <= 5; gun++) {
        const hucre = program[gun] ? program[gun][saat] : null;

        if (hucre) {
          const ders = window.ScheduleDataManager.dersBul(hucre.ders_id);
          const ogretmen = window.ScheduleDataManager.ogretmenBul(
            hucre.ogretmen_id
          );

          html +=
            '<td class="ders-cell" style="background-color: ' +
            (hucre.renk || "#4ECDC4") +
            '">';
          html +=
            '<div class="ders-kod">' +
            (hucre.ders_kodu || (ders ? ders.kod : "?")) +
            "</div>";
          html +=
            '<div class="ogretmen-kod">' +
            (ogretmen ? ogretmen.kod : "?") +
            "</div>";
          html += "</td>";
        } else {
          html += '<td class="bos-cell">-</td>';
        }
      }

      html += "</tr>";
    }

    html += "</tbody></table>";

    container.innerHTML = html;
    console.log("✅ Sınıf tablosu render edildi");
  }

  // ============================================
  // ÖĞRETMEN TABLOSU RENDER
  // ============================================

  renderOgretmenTable(ogretmen, program) {
    const container = document.getElementById("ogretmenProgramTable");
    if (!container) return;

    const gunler = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    let html = '<div class="program-header">';
    html += "<h2>" + ogretmen.tamAd + " - DERS PROGRAMI</h2>";
    html +=
      "<p>Branş: " +
      (ogretmen.brans || "-") +
      " | Haftalık Yük: " +
      (ogretmen.dersYuku || 0) +
      " saat</p>";
    html += "</div>";
    html += '<table class="program-table"><thead><tr>';
    html += '<th class="saat-col">SAAT</th>';

    for (let gun = 1; gun <= 5; gun++) {
      html += '<th class="gun-col">' + gunler[gun] + "</th>";
    }

    html += "</tr></thead><tbody>";

    for (let saat = 1; saat <= 8; saat++) {
      html += '<tr><td class="saat-cell">' + saat + "</td>";

      for (let gun = 1; gun <= 5; gun++) {
        const hucre = program[gun] ? program[gun][saat] : null;

        if (hucre) {
          const ders = window.ScheduleDataManager.dersBul(hucre.ders_id);
          const sinif = window.ScheduleDataManager.sinifBul(hucre.sinif_id);

          html +=
            '<td class="ders-cell" style="background-color: ' +
            (hucre.renk || "#4ECDC4") +
            '">';
          html +=
            '<div class="ders-kod">' +
            (hucre.ders_kodu || (ders ? ders.kod : "?")) +
            "</div>";
          html +=
            '<div class="sinif-kod">' + (sinif ? sinif.kod : "?") + "</div>";
          html += "</td>";
        } else {
          html += '<td class="bos-cell">-</td>';
        }
      }

      html += "</tr>";
    }

    html += "</tbody></table>";

    container.innerHTML = html;
    console.log("✅ Öğretmen tablosu render edildi");
  }

  // ============================================
  // YAZDIR
  // ============================================

  printProgram() {
    window.print();
    console.log("🖨️ Yazdırma işlemi başlatıldı");
  }

  // ============================================
  // PROGRAMI GÜNCELLE
  // ============================================

  updateProgram(newProgramData) {
    this.programData = newProgramData;

    if (this.currentView === "sinif" && this.selectedSinifId) {
      this.showSinifProgram(this.selectedSinifId);
    } else if (this.currentView === "ogretmen" && this.selectedOgretmenId) {
      this.showOgretmenProgram(this.selectedOgretmenId);
    }

    console.log("🔄 Program güncellendi");
  }
}

// ============================================
// EXPORT
// ============================================

const scheduleViewer = new ScheduleViewer();
window.ScheduleViewer = scheduleViewer;

console.log("✅ ScheduleViewer hazır");
