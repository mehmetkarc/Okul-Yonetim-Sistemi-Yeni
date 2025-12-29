/**
 * ============================================
 * REINFORCEMENT LEARNING (Q-Learning)
 * ============================================
 * Pekiştirmeli Öğrenme: Ders programı yerleştirme kararlarının (State-Action)
 * zaman içindeki değerini (Q-Value) hesaplayarak optimizasyon sürecine rehberlik eder.
 */

class ReinforcementLearning {
  /**
   * @param {object} config - RL parametreleri (learningRate, discountFactor, explorationRate)
   */
  constructor(config = {}) {
    // ✅ Config varsayılan değerlerle oluştur
    this.config = {
      learningRate: 0.1, // α: Öğrenme hızı (Yeni bilginin eskisine etkisi)
      discountFactor: 0.9, // γ: İndirim faktörü (Gelecekteki ödüllerin şimdiki değeri)
      explorationRate: 0.3, // ε: Keşfetme oranı (Rastgele hareket etme olasılığı)
      decayRate: 0.9995, // Keşfetme oranını azaltma hızı
      ...config, // Gelen config ile override et
    };

    this.qTable = {}; // {stateKey: {actionKey: QValue}}
    this.episodeCount = 0;
    this.saveKey = "rl_qtable";

    console.log("🧠 ReinforcementLearning başlatıldı.");
  }

  /**
   * LocalStorage'dan Q-Table'ı yükler (Asenkron taklit).
   */
  async load() {
    try {
      const saved = localStorage.getItem(this.saveKey);
      if (saved) {
        this.qTable = JSON.parse(saved);
        console.log(
          `📚 RL Q-Table yüklendi: ${Object.keys(this.qTable).length} durum`
        );
      }
    } catch (error) {
      console.error("❌ RL yükleme hatası:", error);
    }
  }

  /**
   * Bir optimizasyon adımından (episode) öğrenme yapar.
   * @param {object} solution - Çözüm (Ders programı yapısı)
   * @param {number} fitness - Çözümün genel fitness skoru
   */
  async learn(solution, fitness) {
    this.episodeCount++;

    // Her ders yerleşimini bir "state-action-reward" olarak işle
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];

          if (!lesson) continue; // ✅ Boş slot kontrolü

          // Lesson.classId'nin çözüm yapısından alınması daha doğru
          const state = this.getState(classId, day, time, lesson);
          const action = `${day}_${time}`;
          const reward = this.calculateReward(
            solution,
            lesson,
            day,
            time,
            fitness
          );

          // Q-value güncelle
          this.updateQValue(state, action, reward);
        }
      }
    }

    // Keşif oranını azalt (Zamanla daha az rastgele hareket)
    this.config.explorationRate = Math.max(
      0.01,
      this.config.explorationRate * this.config.decayRate
    );

    // Kaydet
    if (this.episodeCount % 10 === 0) {
      // Her 10 episode'da bir kaydet
      this.save();
    }

    console.log(
      `🧠 RL Episode ${this.episodeCount}: ${
        Object.keys(this.qTable).length
      } durum öğrenildi. (ε: ${this.config.explorationRate.toFixed(4)})`
    );
  }

  /**
   * Q-Table için durumu (State) temsil eden bir anahtar oluşturur.
   * State: Dersin özellikleri + (ihtiyaç varsa) anlık çevresel özellikler.
   * @param {string} classId - Sınıf ID'si
   * @param {string} day - Gün ID'si
   * @param {string} time - Saat ID'si
   * @param {object} lesson - Ders objesi
   * @returns {string} - State anahtarı
   */
  getState(classId, day, time, lesson) {
    // State: Dersin özellikleri + Sınıf (Bu dersin bu sınıfta olması bir durumdur)
    // Bu, "Öğretmen X'in Y dersini Z sınıfında işlemesi" durumunu temsil eder.
    return `${lesson.teacherId}_${lesson.subjectId}_${classId}`;
  }

  /**
   * Q-learning formülünü kullanarak Q-Value'yu günceller.
   * Q(s, a) = Q(s, a) + α * [r + γ * max(Q(s', a')) - Q(s, a)]
   * @param {string} state - Mevcut durum anahtarı
   * @param {string} action - Yapılan eylem anahtarı
   * @param {number} reward - Alınan ödül
   */
  updateQValue(state, action, reward) {
    this.qTable[state] = this.qTable[state] || {};

    const oldQ = this.qTable[state][action] || 0;

    // Basitleştirilmiş RL'de bir sonraki durumun ödülü maxFutureQ yerine 0 alınabilir,
    // ancak tam Q-Learning için bir sonraki durumu (s') simüle etmek gerekir.
    // Şimdilik, gelecekteki ödülü, mevcut durumdan yapılabilen en iyi eylem olarak alalım.
    const maxFutureQ = this.getMaxQValue(state);

    // Q-learning formülü
    const newQ =
      oldQ +
      this.config.learningRate *
        (reward + this.config.discountFactor * maxFutureQ - oldQ);

    this.qTable[state][action] = newQ;
  }

  /**
   * Bir durum için mümkün olan en yüksek Q-Value'yu döndürür.
   * @param {string} state - Durum anahtarı
   * @returns {number} - Maksimum Q-Value
   */
  getMaxQValue(state) {
    if (!this.qTable[state]) return 0;

    const values = Object.values(this.qTable[state]);
    return values.length > 0 ? Math.max(...values) : 0;
  }

  /**
   * Bir ders yerleşimi için öğrenilmiş Q-Value'yu döndürür.
   * @param {object} lesson - Ders objesi
   * @param {string} day - Gün
   * @param {string} time - Saat
   * @returns {number} - Q-Value
   */
  getQValue(lesson, day, time) {
    // solution yerine lesson objesinden classId'yi almalıyız
    const classId = lesson.classId;
    const state = this.getState(classId, day, time, lesson);
    const action = `${day}_${time}`;

    return this.qTable[state]?.[action] || 0;
  }

  /**
   * Dersin belirli bir slota yerleştirilmesi için anlık ödülü hesaplar.
   * @param {object} solution - Çözümün mevcut durumu
   * @param {object} lesson - Yerleştirilen ders
   * @param {string} day - Gün
   * @param {string} time - Saat
   * @param {number} globalFitness - Çözümün genel fitness'ı
   * @returns {number} - Ödül değeri
   */
  calculateReward(solution, lesson, day, time, globalFitness = 0) {
    let reward = 0;

    // 1. Öğretmen Tercihi Uyumu (Yüksek Ödül)
    // Global PreferenceManager'ın varlığı kontrol edilir.
    if (typeof window.PreferenceManager !== "undefined") {
      // Ödül: Tercih edilen saate yerleşirse +100, tercih edilmeyene yerleşirse -100
      // Varsayım: PreferenceManager.isAvailable(teacherId, day, time) mevcut.
      if (
        window.PreferenceManager.isAvailable &&
        window.PreferenceManager.isAvailable(lesson.teacherId, day, time)
      ) {
        reward += 100;
      } else {
        reward -= 100;
      }
    }

    // 2. Boşluk (Gap) Kontrolü (Orta Ödül)
    // Bu yerleşim, o sınıf/öğretmen için boşluk oluşturuyor mu?
    // Basitçe: Yerleştirildiği gün, dersten hemen önce/sonra boşluk varsa cezalandır.
    const gaps = this.calculateGapsForLesson(solution, lesson, day, time);
    reward -= gaps * 50;

    // 3. Genel Başarı (Düşük Ödül)
    // Global fitness'ı normalize ederek (örneğin 1000'e bölerek) son ödülü ekle.
    // Bu, ajanın başarılı çözümlerden de genel bir pozitif geri bildirim almasını sağlar.
    reward += globalFitness / 1000;

    return reward;
  }

  /**
   * Yerleştirilen dersin o gün yarattığı boşluk sayısını hesaplar.
   * @param {object} solution - Çözüm
   * @param {object} lesson - Ders
   * @param {string} day - Gün
   * @param {string} time - Saat
   * @returns {number} - Toplam boşluk (gap) sayısı
   */
  calculateGapsForLesson(solution, lesson, day, currentTime) {
    let gaps = 0;
    const classSchedule = solution[lesson.classId][day];

    if (!classSchedule) return 0;

    const times = Object.keys(classSchedule)
      .map(Number)
      .sort((a, b) => a - b);
    const index = times.indexOf(Number(currentTime));

    if (index === -1) return 0;

    // Önceki slota bak
    if (index > 0) {
      const prevTime = times[index - 1];
      // Eğer aradaki fark 1'den büyükse, yani boşluk varsa (prevTime + 1 != currentTime)
      if (Number(currentTime) - prevTime > 1) {
        gaps += Number(currentTime) - prevTime - 1;
      }
    }
    // Sonraki slota bak
    if (index < times.length - 1) {
      const nextTime = times[index + 1];
      // Eğer aradaki fark 1'den büyükse, yani boşluk varsa (currentTime + 1 != nextTime)
      if (nextTime - Number(currentTime) > 1) {
        // Gelecekteki boşluklar için ceza uygulamayız, bu yerleşimin kendisinin boşluk yaratıp yaratmadığına bakarız.
        // Ancak RL'de sonraki state'i etkileyeceği için tutmak faydalı olabilir. Şimdilik basitleştirelim.
      }
    }
    return gaps;
  }

  /**
   * Q-Table'ı LocalStorage'a kaydeder (Asenkron taklit).
   */
  save() {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(this.qTable));
    } catch (error) {
      console.error("❌ RL kaydetme hatası (Boyut aşımı olabilir):", error);
    }
  }
}

// Global erişim
if (typeof window !== "undefined") {
  window.ReinforcementLearning = ReinforcementLearning;
  console.log("✅ ReinforcementLearning yüklendi");
}
