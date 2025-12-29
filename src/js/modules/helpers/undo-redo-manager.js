/**
 * ============================================
 * UNDO-REDO MANAGER V2.0
 * ============================================
 * Manuel/otomatik değişiklikleri izler ve geriye/ileriye alma (Undo/Redo)
 * fonksiyonelliği sağlar. Durum (State) olarak programın tüm verisini tutar.
 */

class UndoRedoManager {
  constructor(maxHistorySize = 50) {
    this.maxHistorySize = maxHistorySize;
    this.history = []; // Geçmiş durumlar (snapshotlar)
    this.currentIndex = -1; // Şu anki pozisyon (history dizisinin index'i)
    this.enabled = true;

    // Uygulama başlamadan önceki ilk durumu tutar (genellikle boş program)
    this.initialState = null;

    console.log(`🧠 UndoRedoManager başlatıldı. Max Geçmiş: ${maxHistorySize}`);
  }

  // ============================================
  // TEMEL İŞLEMLER (SAVE, UNDO, REDO)
  // ============================================

  /**
   * Yeni bir durumu geçmişe kaydeder.
   * @param {Object} state - Programın güncel durumu (Derin kopyası alınır)
   * @param {string} action - Kullanıcı dostu işlem adı (Örn: "Ders Taşıma")
   * @returns {boolean} Kayıt başarılıysa true
   */
  saveState(state, action = "Manuel Değişiklik") {
    if (!this.enabled) return false;

    // Durumlar aynıysa kaydetme (gereksiz kopyalamayı ve geçmiş şişmesini önler)
    if (
      this.currentIndex >= 0 &&
      !this.isStateDifferent(state, this.history[this.currentIndex].state)
    ) {
      console.log(`📝 Durum değişmedi, kayıt atlandı: ${action}`);
      return false;
    }

    // Eğer geçmişte geri gidilmişse, ileri durumları (Redo) temizle
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Yeni durumu ekle
    const snapshot = {
      timestamp: Date.now(),
      action: action,
      state: this.deepCopy(state), // ÖNEMLİ: Derin kopyalama yapılır
      description: this.generateDescription(action),
    };

    this.history.push(snapshot);
    this.currentIndex++;

    // Geçmiş boyutunu sınırla (En eski kaydı sil)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    console.log(
      `💾 Durum kaydedildi: ${action} (${this.currentIndex + 1}/${
        this.history.length
      })`
    );

    // localStorage'a kaydet
    this.saveToStorage();

    // Event trigger
    this.triggerEvent("stateChanged", {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historySize: this.history.length,
      currentIndex: this.currentIndex,
    });

    return true;
  }

  /**
   * Bir önceki duruma döner (Geri al - Undo)
   * @returns {Object|null} Önceki durum nesnesi veya başarısızsa null
   */
  undo() {
    // 0. index'e geri dönmek istiyoruz. Şu anki index'imiz 1 ise, 0'a dönebiliriz.
    if (!this.canUndo()) {
      console.warn("⚠️ Geri alınacak işlem yok (currentIndex 0 veya -1)");
      return null;
    }

    // Geri almak için index'i bir azalt
    this.currentIndex--;

    // Geri alınacak durum
    const previousState = this.history[this.currentIndex];

    console.log(`↩️ Geri alındı: ${previousState.action}`);

    // Event trigger
    this.triggerEvent("undo", {
      action: previousState.action,
      timestamp: previousState.timestamp,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });

    // Durumun kopyasını döndür (UI/uygulama bu kopyayı kullanmalıdır)
    return this.deepCopy(previousState.state);
  }

  /**
   * Bir sonraki duruma ilerler (İleri al - Redo)
   * @returns {Object|null} Sonraki durum nesnesi veya başarısızsa null
   */
  redo() {
    if (!this.canRedo()) {
      console.warn("⚠️ İleri alınacak işlem yok");
      return null;
    }

    this.currentIndex++;
    const nextState = this.history[this.currentIndex];

    console.log(`↪️ İleri alındı: ${nextState.action}`);

    // Event trigger
    this.triggerEvent("redo", {
      action: nextState.action,
      timestamp: nextState.timestamp,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });

    return this.deepCopy(nextState.state);
  }

  // ============================================
  // DURUM KONTROLLERİ
  // ============================================

  /**
   * Geri alınabilir mi? (Index 0'dan büyük olmalı)
   */
  canUndo() {
    // history[0] ilk kaydedilen durumdur. Geri almak için en az 2 durum olmalı veya index > 0 olmalı.
    return this.currentIndex > 0;
  }

  /**
   * İleri alınabilir mi? (Index son durumdan küçük olmalı)
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Mevcut durumu getirir (derin kopyasını).
   * @returns {Object|null}
   */
  getCurrentState() {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      // Geçmiş boşsa veya index geçersizse null dön
      return null;
    }

    return this.deepCopy(this.history[this.currentIndex].state);
  }

  /**
   * Belirli bir duruma git
   * @returns {Object|null}
   */
  goToState(index) {
    if (index < 0 || index >= this.history.length) {
      console.error("❌ Geçersiz index:", index);
      return null;
    }

    const targetState = this.history[index];
    this.currentIndex = index;

    console.log(
      `🎯 Duruma gidildi: ${targetState.action} (${index + 1}/${
        this.history.length
      })`
    );

    this.triggerEvent("stateChanged", {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historySize: this.history.length,
      currentIndex: this.currentIndex,
    });

    return this.deepCopy(targetState.state);
  }

  // ============================================
  // YARDIMCI VE YÖNETİM METOTLARI
  // ============================================

  /**
   * Geçmişi temizle
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
    this.initialState = null;
    this.saveToStorage(); // localStorage'ı da temizle

    console.log("🗑️ Undo/Redo geçmişi temizlendi");

    this.triggerEvent("cleared", {
      canUndo: false,
      canRedo: false,
    });
  }

  /**
   * Geçmiş listesini getir (Sadece meta veriler)
   */
  getHistory() {
    return this.history.map((snapshot, index) => ({
      index: index,
      action: snapshot.action,
      description: snapshot.description,
      timestamp: snapshot.timestamp,
      isCurrent: index === this.currentIndex,
      date: new Date(snapshot.timestamp).toLocaleString("tr-TR"),
    }));
  }

  /**
   * Durum nesnelerinin içerik olarak farklı olup olmadığını kontrol eder.
   * Basit bir JSON.stringify karşılaştırması kullanır.
   */
  isStateDifferent(newState, oldState) {
    // Performans kritik yerlerde daha hızlı, ancak %100 güvenilir olmayan
    // yöntemler (hashing) düşünülebilir, ancak derin kopyalamayı zaten yaptığımız için
    // basit karşılaştırma yeterli:
    if (oldState === null) return true;
    return JSON.stringify(newState) !== JSON.stringify(oldState);
  }

  /**
   * Kullanıcıya gösterilecek açıklama oluşturur.
   */
  generateDescription(action) {
    const descriptions = {
      "İlk Dağıtım": "Otomatik ders dağıtımı yapıldı (Başlangıç)",
      "Manuel Değişiklik": "Kullanıcı tarafından zaman çizelgesi değiştirildi",
      "Ders Ekleme": "Yeni bir ders bloğu eklendi",
      "Ders Silme": "Zaman çizelgesinden ders silindi",
      "Ders Taşıma": "Ders bir slottan başka bir slota taşındı",
      "Toplu Değişiklik": "Birden fazla ders üzerinde toplu işlem yapıldı",
      Optimizasyon: "Otomatik kısıt optimizasyonu uygulandı",
      "Kısıt Güncelleme": "Sınırlayıcı kısıtlar (hard constraints) güncellendi",
      "Tercih Güncelleme":
        "Öğretmen/sınıf tercihleri (soft constraints) güncellendi",
    };

    return descriptions[action] || action;
  }

  // ============================================
  // DEPOLAMA VE İSTATİSTİK
  // ============================================

  /**
   * localStorage'a kaydet (Tarayıcı ortamında)
   */
  saveToStorage() {
    if (typeof localStorage === "undefined") return;

    try {
      // State verisini dahil etmeden, sadece geçmiş meta verilerini ve index'i kaydet (Opsiyonel: State'i de kaydetmek büyük veri yüküne neden olabilir)
      const data = {
        history: this.history, // Tüm snapshot'ları saklar
        currentIndex: this.currentIndex,
        maxHistorySize: this.maxHistorySize,
      };

      localStorage.setItem("undo_redo_history", JSON.stringify(data));
    } catch (error) {
      console.error(
        "❌ Undo/Redo kaydetme hatası (Yerel depolama dolu olabilir):",
        error
      );
    }
  }

  /**
   * localStorage'dan yükle
   */
  loadFromStorage() {
    if (typeof localStorage === "undefined") return false;

    try {
      const saved = localStorage.getItem("undo_redo_history");

      if (saved) {
        const data = JSON.parse(saved);
        this.history = data.history || [];
        this.currentIndex = data.currentIndex ?? -1;
        this.maxHistorySize = data.maxHistorySize || 50;

        console.log(
          `📚 Undo/Redo geçmişi yüklendi: ${this.history.length} kayıt`
        );

        // Yükleme sonrası event tetikle
        this.triggerEvent("stateChanged", {
          canUndo: this.canUndo(),
          canRedo: this.canRedo(),
          historySize: this.history.length,
          currentIndex: this.currentIndex,
        });

        return true;
      }
    } catch (error) {
      console.error("❌ Undo/Redo yükleme hatası (Veri bozuk):", error);
    }

    return false;
  }

  /**
   * İstatistikler
   */
  getStatistics() {
    const actions = {};

    this.history.forEach((snapshot) => {
      actions[snapshot.action] = (actions[snapshot.action] || 0) + 1;
    });

    return {
      totalStates: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      actions: actions,
      oldestState: this.history.length > 0 ? this.history[0].timestamp : null,
      newestState:
        this.history.length > 0
          ? this.history[this.history.length - 1].timestamp
          : null,
    };
  }

  // ============================================
  // KONFİGÜRASYON VE EVENTLER
  // ============================================

  /**
   * Etkinleştir/Devre dışı bırak
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(
      `🔄 Undo/Redo ${enabled ? "etkinleştirildi" : "devre dışı bırakıldı"}`
    );
  }

  /**
   * Geçmiş boyutunu ayarla
   */
  setMaxHistorySize(size) {
    this.maxHistorySize = size;

    // Mevcut geçmiş çok büyükse kırp
    if (this.history.length > size) {
      const removeCount = this.history.length - size;
      this.history = this.history.slice(removeCount);
      // currentIndex'i kaydır
      this.currentIndex = Math.max(0, this.currentIndex - removeCount);
      this.saveToStorage();
    }

    console.log(`📏 Maksimum geçmiş boyutu: ${size}`);
  }

  /**
   * Tarayıcı Event Sistemi ile diğer modülleri bilgilendirir.
   */
  triggerEvent(eventName, data) {
    const event = new CustomEvent(`undoRedo:${eventName}`, {
      detail: data,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(event);
    }
  }

  /**
   * Derin kopyalama (Genellikle JSON metodu kullanılır, ancak büyük verilerde yavaş olabilir)
   * @param {Object} obj
   */
  deepCopy(obj) {
    /** * UYARI: Eğer 'state' nesnesi çok büyükse (örn. 10MB+),
     * JSON.parse(JSON.stringify(obj)) performansı düşürebilir.
     * Bu durumda, daha hızlı kopyalama yöntemleri (structuredClone veya
     * Immutable.js/immer gibi kütüphaneler) düşünülmelidir.
     */
    return JSON.parse(JSON.stringify(obj));
  }
}

// Export
if (typeof window !== "undefined") {
  window.UndoRedoManager = UndoRedoManager;
  // Globalde bir örnek oluştur
  window.undoRedoManager = new UndoRedoManager();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = UndoRedoManager;
}

console.log("✅ UndoRedoManager yüklendi (V2.0 - Performans Optimizasyonu)");
