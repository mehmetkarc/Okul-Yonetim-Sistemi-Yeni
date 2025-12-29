/**
 * ============================================
 * INTERACTIVE SCHEDULE VIEWER - Etkileşimli Program Görüntüleyici
 * ============================================
 * Programı interaktif olarak görüntüler ve düzenler
 * Bu sürüm, ES6 ve DOM manipülasyon standartlarına uygun olarak güncellenmiştir.
 */

class InteractiveScheduleViewer {
  /**
   * @param {string} containerId - Viewer'ın render edileceği DOM element ID'si.
   * @param {object} [config] - Yapılandırma ayarları.
   */
  constructor(containerId, config = {}) {
    this.containerId = containerId;
    this.config = {
      enableDragDrop: true,
      enableTooltips: true,
      enableFilters: true,
      enableExport: true,
      colorScheme: "default",
      ...config,
    };

    this.solution = null; // Görüntülenecek güncel çözüm
    this.filters = {
      teacherId: null,
      classId: null,
      day: null,
    };

    this.selectedSlot = null;
    this.draggedLesson = null;
    this.tooltipTimer = null; // Tooltip gecikmesi için

    // Geri çağrım mekanizması
    this.callbacks = {
      onSlotClick: [],
      onLessonMove: [],
      onFilterChange: [],
      onLessonDelete: [], // Yeni: Ders silme/kaldırma
    };

    window.logger?.info(
      "InteractiveScheduleViewer başlatıldı",
      { containerId: this.containerId },
      "Viewer"
    );

    // Global erişimi tanımla (HTML event listener'lar için)
    if (typeof window !== "undefined") {
      window.scheduleViewer = this;
    }
  }

  // ============================================
  // RENDER & INITIALIZATION
  // ============================================

  /**
   * Programı (solution) DOM'a çizer.
   * @param {Object} solution - Görüntülenecek çözüm objesi (schedule içerir).
   */
  render(solution) {
    this.solution = solution.schedule || solution; // Eğer doğrudan schedule objesi gelirse de çalışır

    const container = document.getElementById(this.containerId);
    if (!container) {
      window.logger?.error(
        "Container bulunamadı:",
        { id: this.containerId },
        "Viewer"
      );
      return;
    }

    container.innerHTML = "";
    container.className = "interactive-schedule-viewer";

    // CSS'i enjekte et (Performans için bir kez yapılır)
    this.injectCSS();

    // Header (filters ve export)
    const header = document.createElement("div");
    header.className = "schedule-header-controls";
    if (this.config.enableFilters) {
      header.appendChild(this.createFilters());
    }
    if (this.config.enableExport) {
      header.appendChild(this.createExportButton());
    }
    if (header.children.length > 0) {
      container.appendChild(header);
    }

    // Tabloyu yeniden oluştur
    container.appendChild(this.createScheduleTable());

    // Event listeners'ı bağla (Her render'da yenilenmesine gerek yok, ancak filtreler değişince tablo yenilenmeli)
    this.attachEventListeners();

    window.logger?.info(
      "Schedule rendered",
      { classes: this.getFilteredClasses().length },
      "Viewer"
    );
  }

  // ============================================
  // FİLTRE & KONTROLLER
  // ============================================

  createFilters() {
    const filterContainer = document.createElement("div");
    filterContainer.className = "schedule-filters";

    // Öğretmen Filtresi
    const teacherGroup = this.createFilterGroup(
      "filter-teacher",
      "Öğretmen:",
      this.getTeacherOptions(),
      this.filters.teacherId,
      (e) => {
        this.filters.teacherId = e.target.value || null;
        this.applyFilters();
      }
    );
    filterContainer.appendChild(teacherGroup);

    // Sınıf Filtresi
    const classGroup = this.createFilterGroup(
      "filter-class",
      "Sınıf:",
      this.getClassOptions(),
      this.filters.classId,
      (e) => {
        this.filters.classId = e.target.value || null;
        this.applyFilters();
      }
    );
    filterContainer.appendChild(classGroup);

    // Gün Filtresi
    const dayGroup = this.createFilterGroup(
      "filter-day",
      "Gün:",
      this.getDayOptions(),
      this.filters.day,
      (e) => {
        this.filters.day = e.target.value || null;
        this.applyFilters();
      }
    );
    filterContainer.appendChild(dayGroup);

    // Sıfırlama Butonu
    const resetButton = document.createElement("button");
    resetButton.className = "filter-reset";
    resetButton.innerHTML = "🔄 Sıfırla";
    resetButton.onclick = () => this.resetFilters();
    filterContainer.appendChild(resetButton);

    return filterContainer;
  }

  createFilterGroup(id, labelText, optionsHtml, currentValue, onChange) {
    const group = document.createElement("div");
    group.className = "filter-group";

    const label = document.createElement("label");
    label.textContent = labelText;
    label.setAttribute("for", id);
    group.appendChild(label);

    const select = document.createElement("select");
    select.id = id;
    select.className = "filter-select";
    select.innerHTML = `<option value="">Tümü</option>${optionsHtml}`;
    select.value = currentValue || "";
    select.addEventListener("change", onChange);
    group.appendChild(select);

    return group;
  }

  createExportButton() {
    const button = document.createElement("button");
    button.className = "export-button";
    button.innerHTML = "💾 Programı Dışa Aktar (CSV)";
    button.onclick = () => this.exportScheduleCSV();
    return button;
  }

  getTeacherOptions() {
    const teachers = new Set();
    // Schedule'ı tarayarak tüm öğretmen ID'lerini topla
    for (const classId in this.solution) {
      for (const day in this.solution[classId]) {
        for (const time in this.solution[classId][day]) {
          const lesson = this.solution[classId][day][time];
          if (lesson && lesson.teacherId) {
            teachers.add(lesson.teacherId);
          }
        }
      }
    }
    return Array.from(teachers)
      .sort()
      .map((id) => `<option value="${id}">${id}</option>`)
      .join("");
  }

  getClassOptions() {
    return Object.keys(this.solution)
      .sort()
      .map((id) => `<option value="${id}">${id}</option>`)
      .join("");
  }

  getDayOptions() {
    return [
      { value: "1", name: "Pazartesi" },
      { value: "2", name: "Salı" },
      { value: "3", name: "Çarşamba" },
      { value: "4", name: "Perşembe" },
      { value: "5", name: "Cuma" },
    ]
      .map((d) => `<option value="${d.value}">${d.name}</option>`)
      .join("");
  }

  // ============================================
  // TABLO OLUŞTURMA
  // ============================================

  createScheduleTable() {
    const tableContainer = document.createElement("div");
    tableContainer.className = "schedule-table-container";

    const classes = this.getFilteredClasses();

    if (classes.length === 0) {
      tableContainer.innerHTML =
        '<div class="no-results">Seçili filtreye uygun sonuç bulunamadı.</div>';
      return tableContainer;
    }

    for (const classId of classes) {
      tableContainer.appendChild(this.createClassSchedule(classId));
    }

    return tableContainer;
  }

  createClassSchedule(classId) {
    const classSchedule = document.createElement("div");
    classSchedule.className = "class-schedule";

    const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    const headerCells = dayNames.map((day) => `<th>${day}</th>`).join("");

    // Sınıf başlığı
    const header = document.createElement("div");
    header.className = "class-header";
    header.innerHTML = `<h3>${classId}</h3>`;
    classSchedule.appendChild(header);

    // Grid (Tablo) yapısı
    const table = document.createElement("table");
    table.className = "schedule-grid";
    table.innerHTML = `
        <thead>
          <tr>
            <th>Saat</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${this.createScheduleRows(classId)}
        </tbody>
    `;
    classSchedule.appendChild(table);

    return classSchedule;
  }

  createScheduleRows(classId) {
    const rows = [];
    // Program saat aralığını dinamik olarak bulabiliriz (örneğin 1'den 8'e)
    for (let time = 1; time <= 8; time++) {
      let row = `<tr><td class="time-cell">${time}. Saat</td>`;

      for (let day = 1; day <= 5; day++) {
        const dayStr = day.toString();
        const timeStr = time.toString();

        // Gün filtresi kontrolü
        if (this.filters.day && this.filters.day !== dayStr) {
          row += '<td class="filtered-out"></td>';
          continue;
        }

        // Programdaki dersi al
        const lesson = this.solution[classId]?.[dayStr]?.[timeStr];

        if (lesson) {
          // Öğretmen filtresi kontrolü
          if (
            this.filters.teacherId &&
            lesson.teacherId !== this.filters.teacherId
          ) {
            row += '<td class="filtered-out"></td>';
            continue;
          }

          const cellClass = this.getCellClass(lesson);
          const cellColor = this.getCellColor(lesson);

          row += `
            <td class="${cellClass}"
                data-class="${classId}"
                data-day="${dayStr}"
                data-time="${timeStr}"
                data-lesson-id="${lesson.lessonId}"
                style="background-color: ${cellColor}"
                ${this.config.enableDragDrop ? 'draggable="true"' : ""}>
              <div class="lesson-content">
                <div class="lesson-subject">${
                  lesson.subjectName || "Ders"
                }</div>
                <div class="lesson-teacher">👨‍🏫 ${lesson.teacherId}</div>
                ${
                  lesson.blockSize && lesson.blockSize > 1
                    ? `<div class="lesson-block-badge">📦 Blok: ${
                        lesson.blockIndex + 1
                      }/${lesson.blockSize}</div>`
                    : ""
                }
              </div>
            </td>
          `;
        } else {
          // Boş slot
          row += `
            <td class="empty-cell" 
                data-class="${classId}" 
                data-day="${dayStr}" 
                data-time="${timeStr}">
            </td>
          `;
        }
      }

      row += "</tr>";
      rows.push(row);
    }

    return rows.join("");
  }

  // ============================================
  // STYLING YARDIMCILARI
  // ============================================

  getCellClass(lesson) {
    const classes = ["lesson-cell"];

    if (lesson.blockSize && lesson.blockSize > 1) {
      classes.push("block-lesson");
      if (lesson.blockIndex === 0) classes.push("block-start");
      if (lesson.blockIndex === lesson.blockSize - 1) classes.push("block-end");
    }

    // Ek bilgi: Kural ihlali varsa "conflict-cell" ekleyebiliriz (Örn: lesson.isConflict)

    return classes.join(" ");
  }

  getCellColor(lesson) {
    // Öğretmene göre tutarlı renk ataması (HSL kullanılarak)
    // Aynı öğretmen, farklı yerlerde aynı renkte görünür
    const teacherId = lesson.teacherId || "empty";
    let hash = 0;
    for (let i = 0; i < teacherId.length; i++) {
      hash = teacherId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;

    return `hsl(${hue}, 70%, 85%)`; // Açık pastel tonlar
  }

  // ============================================
  // EVENT LISTENERS & HANDLERS
  // ============================================

  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Filter change listeners'ı, filtreler oluşturulduğunda zaten eklenmiş olmalı.

    // Sadece tablo hücreleri için event delegation kullan
    container.removeEventListener("click", this._clickDelegate);
    this._clickDelegate = (e) => this.handleCellClick(e);
    container.addEventListener("click", this._clickDelegate);

    if (this.config.enableDragDrop) {
      // Drag & Drop event'leri
      container.removeEventListener("dragstart", this._dragStartDelegate);
      this._dragStartDelegate = (e) => this.handleDragStart(e);
      container.addEventListener("dragstart", this._dragStartDelegate);

      container.removeEventListener("dragover", this._dragOverDelegate);
      this._dragOverDelegate = (e) => this.handleDragOver(e);
      container.addEventListener("dragover", this._dragOverDelegate);

      container.removeEventListener("drop", this._dropDelegate);
      this._dropDelegate = (e) => this.handleDrop(e);
      container.addEventListener("drop", this._dropDelegate);

      container.removeEventListener("dragend", this._dragEndDelegate);
      this._dragEndDelegate = (e) => this.handleDragEnd(e);
      container.addEventListener("dragend", this._dragEndDelegate);
    }

    if (this.config.enableTooltips) {
      container.removeEventListener("mouseover", this._mouseEnterDelegate);
      this._mouseEnterDelegate = (e) => this.handleMouseEnter(e);
      container.addEventListener("mouseover", this._mouseEnterDelegate);

      container.removeEventListener("mouseout", this._mouseLeaveDelegate);
      this._mouseLeaveDelegate = (e) => this.handleMouseLeave(e);
      container.addEventListener("mouseout", this._mouseLeaveDelegate);
    }
  }

  handleCellClick(e) {
    const cell = e.target.closest("td");
    if (!cell || !cell.dataset.class) return;

    // Önceki seçimi kaldır
    document
      .querySelectorAll(`#${this.containerId} .selected-cell`)
      .forEach((c) => {
        c.classList.remove("selected-cell");
      });

    cell.classList.add("selected-cell");

    const slotInfo = {
      classId: cell.dataset.class,
      day: cell.dataset.day,
      time: cell.dataset.time,
    };
    this.selectedSlot = slotInfo;

    const lesson =
      this.solution[slotInfo.classId]?.[slotInfo.day]?.[slotInfo.time];

    // Callback
    this.triggerCallbacks("onSlotClick", {
      slot: slotInfo,
      lesson,
    });

    window.logger?.debug(
      "Slot seçildi:",
      { slot: slotInfo, lesson: lesson?.lessonId },
      "Viewer"
    );
  }

  handleDragStart(e) {
    const cell = e.target.closest("td.lesson-cell");
    if (!cell) return;

    this.draggedLesson = {
      classId: cell.dataset.class,
      day: cell.dataset.day,
      time: cell.dataset.time,
      lesson:
        this.solution[cell.dataset.class]?.[cell.dataset.day]?.[
          cell.dataset.time
        ],
    };

    cell.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(this.draggedLesson)); // Tarayıcılar arası uyumluluk için
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const cell = e.target.closest("td");

    document
      .querySelectorAll(`#${this.containerId} .drop-target`)
      .forEach((c) => c.classList.remove("drop-target"));

    if (cell && cell.dataset.class) {
      cell.classList.add("drop-target");
    }
  }

  handleDrop(e) {
    e.preventDefault();

    const targetCell = e.target.closest("td");
    if (!targetCell || !targetCell.dataset.class || !this.draggedLesson) {
      window.logger?.warn(
        "Drop işlemi başarısız: Geçersiz hedef veya ders bilgisi eksik.",
        null,
        "Viewer"
      );
      return;
    }

    const targetSlot = {
      classId: targetCell.dataset.class,
      day: targetCell.dataset.day,
      time: targetCell.dataset.time,
    };

    // Aynı slot'a bırakılmışsa işlem yapma
    if (
      targetSlot.classId === this.draggedLesson.classId &&
      targetSlot.day === this.draggedLesson.day &&
      targetSlot.time === this.draggedLesson.time
    ) {
      window.logger?.debug(
        "Ders aynı slota bırakıldı, işlem yapılmadı.",
        targetSlot,
        "Viewer"
      );
      return;
    }

    // Callback
    this.triggerCallbacks("onLessonMove", {
      from: {
        classId: this.draggedLesson.classId,
        day: this.draggedLesson.day,
        time: this.draggedLesson.time,
      },
      to: targetSlot,
      lesson: this.draggedLesson.lesson,
    });

    // Görüntüleyiciyi güncellemek için dışarıdan gelen onLessonMove callback'inin
    // bu metot bittikten sonra solution objesini güncellemesi ve render'ı çağırması beklenir.

    window.logger?.info(
      "Ders taşıma talebi tetiklendi.",
      { from: this.draggedLesson, to: targetSlot },
      "Viewer"
    );
  }

  handleDragEnd(e) {
    document
      .querySelectorAll(`#${this.containerId} .dragging`)
      .forEach((c) => c.classList.remove("dragging"));
    document
      .querySelectorAll(`#${this.containerId} .drop-target`)
      .forEach((c) => c.classList.remove("drop-target"));
    this.draggedLesson = null;
    this.hideTooltip();
  }

  handleMouseEnter(e) {
    const cell = e.target.closest("td.lesson-cell");
    if (!cell || !this.config.enableTooltips) return;

    const lesson =
      this.solution[cell.dataset.class]?.[cell.dataset.day]?.[
        cell.dataset.time
      ];
    if (!lesson) return;

    // Tooltip'i gecikmeli göster
    this.tooltipTimer = setTimeout(() => {
      this.showTooltip(cell, lesson);
    }, 300); // 300ms gecikme
  }

  handleMouseLeave(e) {
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
    }
    this.hideTooltip();
  }

  // ============================================
  // TOOLTIP YÖNETİMİ
  // ============================================

  showTooltip(cell, lesson) {
    let tooltip = document.getElementById("schedule-tooltip");

    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "schedule-tooltip";
      tooltip.className = "schedule-tooltip";
      document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = `
      <div class="tooltip-header">${lesson.subjectName || "Ders"} (ID: ${
      lesson.lessonId
    })</div>
      <div class="tooltip-body">
        <div><strong>Öğretmen:</strong> ${lesson.teacherId}</div>
        <div><strong>Sınıf:</strong> ${
          lesson.className || cell.dataset.class
        }</div>
        <div><strong>Gün/Saat:</strong> ${this.getDayName(
          parseInt(cell.dataset.day)
        )}, ${cell.dataset.time}. Saat</div>
        ${
          lesson.blockSize > 1
            ? `<div><strong>Blok:</strong> ${lesson.blockIndex + 1}/${
                lesson.blockSize
              }</div>`
            : ""
        }
      </div>
    `;

    // Konumlandırma
    const rect = cell.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;

    // Hücrenin üst merkezine konumlandır
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top + scrollY - 10}px`; // 10px yukarı ofset

    tooltip.style.display = "block";
    tooltip.style.visibility = "visible"; // CSS'te hidden'dan göster
  }

  hideTooltip() {
    const tooltip = document.getElementById("schedule-tooltip");
    if (tooltip) {
      tooltip.style.visibility = "hidden";
    }
  }

  // ============================================
  // FİLTRELEME & EXPORT
  // ============================================

  applyFilters() {
    this.render(this.solution);
    this.triggerCallbacks("onFilterChange", this.filters);
    window.logger?.info(
      "Filtreler uygulandı. Program yeniden çizildi.",
      this.filters,
      "Viewer"
    );
  }

  resetFilters() {
    this.filters = { teacherId: null, classId: null, day: null };

    // DOM elementlerini sıfırla
    const teacherSelect = document.getElementById("filter-teacher");
    if (teacherSelect) teacherSelect.value = "";

    const classSelect = document.getElementById("filter-class");
    if (classSelect) classSelect.value = "";

    const daySelect = document.getElementById("filter-day");
    if (daySelect) daySelect.value = "";

    this.applyFilters();
  }

  getFilteredClasses() {
    let classes = Object.keys(this.solution);
    if (this.filters.classId) {
      classes = classes.filter((id) => id === this.filters.classId);
    }
    return classes.sort();
  }

  exportScheduleCSV() {
    const csvRows = [];
    const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    const headers = ["Sınıf", "Saat"].concat(dayNames);
    csvRows.push(headers.join(";")); // Başlıklar

    const classes = Object.keys(this.solution).sort();
    const maxHour = 8;

    for (const classId of classes) {
      for (let time = 1; time <= maxHour; time++) {
        const row = [`"${classId}"`, time];
        for (let day = 1; day <= 5; day++) {
          const lesson =
            this.solution[classId]?.[day.toString()]?.[time.toString()];
          const cellContent = lesson
            ? `${lesson.subjectName} (${lesson.teacherId})`
            : "";
          row.push(`"${cellContent}"`);
        }
        csvRows.push(row.join(";"));
      }
    }

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const filename = `program_cizelgesi_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    if (navigator.msSaveBlob) {
      // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.logger?.info(
          `Program CSV olarak dışa aktarıldı: ${filename}`,
          null,
          "Viewer"
        );
      }
    }
  }

  // ============================================
  // CALLBACK YÖNETİMİ
  // ============================================

  onSlotClick(callback) {
    this.callbacks.onSlotClick.push(callback);
    return this;
  }

  onLessonMove(callback) {
    this.callbacks.onLessonMove.push(callback);
    return this;
  }

  onLessonDelete(callback) {
    this.callbacks.onLessonDelete.push(callback);
    return this;
  }

  onFilterChange(callback) {
    this.callbacks.onFilterChange.push(callback);
    return this;
  }

  triggerCallbacks(event, data) {
    const callbacks = this.callbacks[event] || [];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        window.logger?.error(`Callback error in ${event}:`, error, "Viewer");
      }
    }
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR & CSS
  // ============================================

  getDayName(day) {
    const days = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    return days[day] || day;
  }

  injectCSS() {
    if (document.getElementById("schedule-viewer-styles")) return;

    const style = document.createElement("style");
    style.id = "schedule-viewer-styles";
    style.textContent = `
      .interactive-schedule-viewer {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        background: #f4f7f6;
      }
      
      .schedule-header-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
      }

      .schedule-filters {
        display: flex;
        gap: 15px;
        padding: 15px;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        flex-wrap: wrap;
      }
      
      .filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .filter-group label {
        font-weight: 500;
        font-size: 14px;
        color: #333;
      }
      
      .filter-select {
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 14px;
        background: #fff;
        cursor: pointer;
      }
      
      .filter-reset, .export-button {
        padding: 8px 15px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
        align-self: flex-start;
      }
      .export-button {
          background: #28a745;
      }
      
      .filter-reset:hover { background: #c82333; }
      .export-button:hover { background: #218838; }
      
      .class-schedule {
        margin-bottom: 30px;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      
      .class-header {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;
        padding: 15px 20px;
      }
      
      .class-header h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }
      
      .schedule-grid {
        width: 100%;
        border-collapse: collapse;
        background: white;
      }
      
      .schedule-grid th {
        background: #e9ecef;
        padding: 12px;
        text-align: center;
        font-weight: 600;
        border: 1px solid #dee2e6;
        color: #333;
      }
      
      .schedule-grid td {
        padding: 10px;
        border: 1px solid #dee2e6;
        text-align: center;
        min-width: 120px;
        height: 70px;
        vertical-align: top;
        transition: all 0.2s;
        position: relative;
      }
      
      .time-cell {
        background: #f8f9fa;
        font-weight: 600;
        color: #555;
      }
      
      .lesson-cell {
        cursor: grab;
        position: relative;
        color: #333;
        font-size: 13px;
        transition: transform 0.2s, box-shadow 0.2s;
        border: 1px solid #ccc !important;
      }
      
      .lesson-cell:hover {
        transform: scale(1.03);
        z-index: 10;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        cursor: grab;
      }
      
      .lesson-cell.dragging {
        opacity: 0.4;
        border: 2px dashed #007bff !important;
      }
      
      .lesson-cell.selected-cell {
        outline: 3px solid #ffc107;
        outline-offset: -3px;
      }
      
      .empty-cell {
        background: #fafafa;
      }
      
      .drop-target {
        background: #cce5ff !important;
        outline: 2px dashed #007bff;
        outline-offset: -2px;
      }
      
      .filtered-out {
        background: #e9ecef;
        opacity: 0.5;
      }
      
      .lesson-content {
        line-height: 1.3;
      }
      
      .lesson-subject {
        font-weight: 700;
        margin-bottom: 2px;
      }
      
      .lesson-teacher {
        color: #5a5a5a;
        font-size: 11px;
      }
      
      .lesson-block-badge {
        margin-top: 4px;
        font-size: 10px;
        color: #007bff;
        font-weight: 600;
        background: rgba(0, 123, 255, 0.1);
        padding: 2px 5px;
        border-radius: 3px;
        display: inline-block;
      }
      
      .schedule-tooltip {
        position: fixed;
        background: #343a40;
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        padding: 0;
        z-index: 10000;
        display: none; 
        visibility: hidden; /* display:none yerine visibility:hidden kullan */
        transform: translate(-50%, -100%) translateY(-10px); /* Üstte ve ortada */
        min-width: 220px;
        pointer-events: none; /* Tooltip'in diğer elementleri engellemesini önle */
        transition: opacity 0.2s;
      }
      
      .tooltip-header {
        background: #007bff;
        padding: 10px;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
        font-size: 15px;
      }
      
      .tooltip-body {
        padding: 10px;
        font-size: 13px;
      }
      
      .tooltip-body div {
        margin: 4px 0;
      }
      
      .no-results {
        text-align: center;
        padding: 40px;
        color: #999;
        font-size: 16px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
    `;

    document.head.appendChild(style);
  }
}

// Global export
if (typeof window !== "undefined") {
  window.InteractiveScheduleViewer = InteractiveScheduleViewer;
  window.scheduleViewer =
    window.scheduleViewer ||
    new InteractiveScheduleViewer("schedule-container-default"); // Varsayılan ID
  window.logger?.info(
    "InteractiveScheduleViewer yüklendi ve varsayılan örnek oluşturuldu.",
    null,
    "Viewer"
  );
}
