/**
 * ============================================
 * PERFORMANCE MONITOR - Performans İzleyici
 * ============================================
 * Algoritma performansını izler ve raporlar
 *
 * Özellikler:
 * - Real-time performance tracking
 * - Memory usage monitoring
 * - CPU time measurement
 * - Bottleneck detection
 * - Performance profiling
 */

class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      enableMemoryTracking: true,
      enableTimeTracking: true,
      sampleInterval: 100, // ms
      maxSamples: 1000,
      autoReport: false,
      ...config,
    };

    this.sessions = new Map();
    this.currentSession = null;
    this.samples = [];

    this.metrics = {
      totalTime: 0,
      avgTime: 0,
      maxTime: 0,
      minTime: Infinity,
      operations: 0,
      errors: 0,
    };

    console.log("⚡ PerformanceMonitor başlatıldı");
  }

  // ============================================
  // SESSION YÖNETİMİ
  // ============================================

  startSession(name = "default") {
    const sessionId = `${name}_${Date.now()}`;

    const session = {
      id: sessionId,
      name,
      startTime: Date.now(),
      startMemory: this.getMemoryUsage(),
      endTime: null,
      endMemory: null,
      duration: null,
      operations: [],
      samples: [],
      metrics: {},
    };

    this.sessions.set(sessionId, session);
    this.currentSession = session;

    // Sampling başlat
    if (this.config.sampleInterval > 0) {
      this.startSampling(sessionId);
    }

    console.log(`🎬 Session başlatıldı: ${name}`);

    return sessionId;
  }

  endSession(sessionId = null) {
    const session = sessionId
      ? this.sessions.get(sessionId)
      : this.currentSession;

    if (!session) {
      console.warn("⚠️ Aktif session yok");
      return null;
    }

    session.endTime = Date.now();
    session.endMemory = this.getMemoryUsage();
    session.duration = session.endTime - session.startTime;

    // Sampling durdur
    this.stopSampling(session.id);

    // Metrikleri hesapla
    session.metrics = this.calculateSessionMetrics(session);

    if (this.currentSession?.id === session.id) {
      this.currentSession = null;
    }

    console.log(
      `🏁 Session tamamlandı: ${session.name} (${session.duration}ms)`
    );

    if (this.config.autoReport) {
      this.printSessionReport(session.id);
    }

    return session;
  }

  // ============================================
  // OPERATION TRACKING
  // ============================================

  startOperation(name, metadata = {}) {
    if (!this.currentSession) {
      console.warn("⚠️ Aktif session yok, operation başlatılamadı");
      return null;
    }

    const operation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
      endTime: null,
      endMemory: null,
      duration: null,
      metadata,
      children: [],
    };

    this.currentSession.operations.push(operation);
    this.metrics.operations++;

    return operation.id;
  }

  endOperation(operationId) {
    if (!this.currentSession) return;

    const operation = this.currentSession.operations.find(
      (op) => op.id === operationId
    );

    if (!operation) {
      console.warn("⚠️ Operation bulunamadı:", operationId);
      return;
    }

    operation.endTime = performance.now();
    operation.endMemory = this.getMemoryUsage();
    operation.duration = operation.endTime - operation.startTime;

    // Metrikleri güncelle
    this.metrics.totalTime += operation.duration;
    this.metrics.maxTime = Math.max(this.metrics.maxTime, operation.duration);
    this.metrics.minTime = Math.min(this.metrics.minTime, operation.duration);
    this.metrics.avgTime = this.metrics.totalTime / this.metrics.operations;

    return operation;
  }

  measure(name, fn, metadata = {}) {
    const opId = this.startOperation(name, metadata);

    try {
      const result = fn();
      this.endOperation(opId);
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.endOperation(opId);
      throw error;
    }
  }

  async measureAsync(name, fn, metadata = {}) {
    const opId = this.startOperation(name, metadata);

    try {
      const result = await fn();
      this.endOperation(opId);
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.endOperation(opId);
      throw error;
    }
  }

  // ============================================
  // SAMPLING
  // ============================================

  startSampling(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.samplingInterval = setInterval(() => {
      const sample = {
        timestamp: Date.now() - session.startTime,
        memory: this.getMemoryUsage(),
        operations: this.currentSession?.operations.length || 0,
        fps: this.estimateFPS(),
      };

      session.samples.push(sample);

      // Limit samples
      if (session.samples.length > this.config.maxSamples) {
        session.samples.shift();
      }
    }, this.config.sampleInterval);
  }

  stopSampling(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.samplingInterval) return;

    clearInterval(session.samplingInterval);
    session.samplingInterval = null;
  }

  // ============================================
  // MEMORY TRACKING
  // ============================================

  getMemoryUsage() {
    if (!this.config.enableMemoryTracking) {
      return { used: 0, total: 0, limit: 0 };
    }

    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      };
    }

    return { used: 0, total: 0, limit: 0 };
  }

  formatMemory(bytes) {
    if (!bytes || bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // ============================================
  // FPS ESTIMATION
  // ============================================

  estimateFPS() {
    // Basit FPS tahmini (gerçek implementasyonda requestAnimationFrame kullanılır)
    return 60;
  }

  // ============================================
  // METRİK HESAPLAMA
  // ============================================

  calculateSessionMetrics(session) {
    const operations = session.operations.filter((op) => op.duration !== null);

    if (operations.length === 0) {
      return {
        totalOperations: 0,
        totalTime: session.duration || 0,
        avgOperationTime: 0,
        maxOperationTime: 0,
        minOperationTime: 0,
        opsPerSecond: 0,
        memoryDelta: 0,
        slowestOperations: [],
        operationsByType: {},
      };
    }

    const durations = operations.map((op) => op.duration);
    const totalOpTime = durations.reduce((sum, d) => sum + d, 0);

    // Memory delta hesapla
    let memoryDelta = 0;
    if (session.endMemory && session.startMemory) {
      memoryDelta = session.endMemory.used - session.startMemory.used;
    }

    return {
      totalOperations: operations.length,
      totalTime: session.duration || 0,
      avgOperationTime: totalOpTime / operations.length,
      maxOperationTime: Math.max(...durations),
      minOperationTime: Math.min(...durations),
      opsPerSecond:
        session.duration > 0
          ? (operations.length / session.duration) * 1000
          : 0,
      memoryDelta: memoryDelta,
      slowestOperations: this.findSlowestOperations(operations, 5),
      operationsByType: this.groupOperationsByType(operations),
    };
  }

  findSlowestOperations(operations, count = 5) {
    if (!operations || operations.length === 0) {
      return [];
    }

    return operations
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
      .map((op) => ({
        name: op.name,
        duration: op.duration.toFixed(2) + "ms",
        metadata: op.metadata,
      }));
  }

  groupOperationsByType(operations) {
    if (!operations || operations.length === 0) {
      return {};
    }

    const groups = {};

    for (const op of operations) {
      if (!groups[op.name]) {
        groups[op.name] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          maxTime: 0,
          minTime: Infinity,
        };
      }

      const group = groups[op.name];
      group.count++;
      group.totalTime += op.duration;
      group.maxTime = Math.max(group.maxTime, op.duration);
      group.minTime = Math.min(group.minTime, op.duration);
      group.avgTime = group.totalTime / group.count;
    }

    return groups;
  }

  // ============================================
  // BOTTLENECK DETECTION
  // ============================================

  detectBottlenecks(sessionId = null) {
    const session = sessionId
      ? this.sessions.get(sessionId)
      : this.currentSession;

    if (!session || !session.operations) return [];

    const bottlenecks = [];
    const operations = session.operations.filter((op) => op.duration !== null);

    if (operations.length === 0) return bottlenecks;

    const avgDuration =
      operations.reduce((sum, op) => sum + op.duration, 0) / operations.length;
    const threshold = avgDuration * 2; // 2x ortalama

    for (const op of operations) {
      if (op.duration > threshold) {
        bottlenecks.push({
          operation: op.name,
          duration: op.duration.toFixed(2) + "ms",
          avgDuration: avgDuration.toFixed(2) + "ms",
          factor: (op.duration / avgDuration).toFixed(2) + "x",
          severity: op.duration > threshold * 2 ? "high" : "medium",
          metadata: op.metadata,
        });
      }
    }

    return bottlenecks.sort(
      (a, b) => parseFloat(b.factor) - parseFloat(a.factor)
    );
  }

  // ============================================
  // PROFILING
  // ============================================

  profile(name, iterations = 100) {
    console.log(`\n🔬 PROFILING: ${name} (${iterations} iterations)`);
    console.log("=".repeat(50));

    const sessionId = this.startSession(`profile_${name}`);
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const opId = this.startOperation(name, { iteration: i });

      // Operation burada çalışır (callback ile)
      // Bu örnekte sadece timing yapıyoruz

      this.endOperation(opId);

      const op =
        this.currentSession.operations[
          this.currentSession.operations.length - 1
        ];
      results.push(op.duration);
    }

    const session = this.endSession(sessionId);

    // İstatistikler
    const sorted = results.sort((a, b) => a - b);
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    console.log(`\n📊 Sonuçlar:`);
    console.log(`  • Iterations: ${iterations}`);
    console.log(`  • Avg: ${avg.toFixed(2)}ms`);
    console.log(`  • Median: ${median.toFixed(2)}ms`);
    console.log(`  • Min: ${Math.min(...results).toFixed(2)}ms`);
    console.log(`  • Max: ${Math.max(...results).toFixed(2)}ms`);
    console.log(`  • P95: ${p95.toFixed(2)}ms`);
    console.log(`  • P99: ${p99.toFixed(2)}ms`);
    console.log("=".repeat(50) + "\n");

    return {
      name,
      iterations,
      avg,
      median,
      min: Math.min(...results),
      max: Math.max(...results),
      p95,
      p99,
      results,
    };
  }

  // ============================================
  // RAPORLAMA - DÜZELTİLDİ! ✅
  // ============================================

  printSessionReport(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn("⚠️ Session bulunamadı:", sessionId);
      return;
    }

    // Metrics yoksa hesapla
    if (!session.metrics || Object.keys(session.metrics).length === 0) {
      session.metrics = this.calculateSessionMetrics(session);
    }

    console.log(`\n⚡ PERFORMANCE REPORT: ${session.name}`);
    console.log("=".repeat(60));

    console.log("\n⏱️ Genel:");
    console.log(`  • Duration: ${session.duration || 0}ms`);
    console.log(`  • Operations: ${session.metrics.totalOperations || 0}`);
    console.log(
      `  • Ops/sec: ${(session.metrics.opsPerSecond || 0).toFixed(2)}`
    );

    if (
      this.config.enableMemoryTracking &&
      session.startMemory &&
      session.endMemory
    ) {
      console.log("\n💾 Memory:");
      console.log(`  • Start: ${this.formatMemory(session.startMemory.used)}`);
      console.log(`  • End: ${this.formatMemory(session.endMemory.used)}`);
      console.log(
        `  • Delta: ${this.formatMemory(session.metrics.memoryDelta || 0)}`
      );
    }

    console.log("\n📊 Operation Stats:");
    console.log(
      `  • Avg Time: ${(session.metrics.avgOperationTime || 0).toFixed(2)}ms`
    );
    console.log(
      `  • Max Time: ${(session.metrics.maxOperationTime || 0).toFixed(2)}ms`
    );
    console.log(
      `  • Min Time: ${(session.metrics.minOperationTime || 0).toFixed(2)}ms`
    );

    // Slowest operations kontrolü - DÜZELTİLDİ! ✅
    if (
      session.metrics.slowestOperations &&
      Array.isArray(session.metrics.slowestOperations) &&
      session.metrics.slowestOperations.length > 0
    ) {
      console.log("\n🐌 En Yavaş Operations:");
      session.metrics.slowestOperations.forEach((op, i) => {
        console.log(`  ${i + 1}. ${op.name}: ${op.duration}`);
      });
    }

    // Bottlenecks kontrolü - DÜZELTİLDİ! ✅
    const bottlenecks = this.detectBottlenecks(sessionId);
    if (bottlenecks && Array.isArray(bottlenecks) && bottlenecks.length > 0) {
      console.log("\n⚠️ Darboğazlar:");
      bottlenecks.slice(0, 5).forEach((b, i) => {
        console.log(
          `  ${i + 1}. [${b.severity}] ${b.operation}: ${b.duration} (${
            b.factor
          })`
        );
      });
    }

    // Operation types kontrolü - DÜZELTİLDİ! ✅
    if (
      session.metrics.operationsByType &&
      Object.keys(session.metrics.operationsByType).length > 0
    ) {
      console.log("\n📈 Operation Types:");
      Object.entries(session.metrics.operationsByType).forEach(
        ([type, stats]) => {
          console.log(`  • ${type}:`);
          console.log(`    - Count: ${stats.count || 0}`);
          console.log(`    - Avg: ${(stats.avgTime || 0).toFixed(2)}ms`);
          console.log(`    - Total: ${(stats.totalTime || 0).toFixed(2)}ms`);
        }
      );
    }

    console.log("=".repeat(60) + "\n");
  }

  getReport(sessionId = null) {
    const session = sessionId
      ? this.sessions.get(sessionId)
      : this.currentSession;

    if (!session) return null;

    // Metrics yoksa hesapla
    if (!session.metrics || Object.keys(session.metrics).length === 0) {
      session.metrics = this.calculateSessionMetrics(session);
    }

    return {
      session: {
        id: session.id,
        name: session.name,
        duration: session.duration || 0,
        startTime: session.startTime,
        endTime: session.endTime,
      },
      metrics: session.metrics,
      bottlenecks: this.detectBottlenecks(sessionId),
      samples: session.samples || [],
    };
  }

  // ============================================
  // EXPORT
  // ============================================

  exportSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Metrics yoksa hesapla
    if (!session.metrics || Object.keys(session.metrics).length === 0) {
      session.metrics = this.calculateSessionMetrics(session);
    }

    return {
      session: {
        id: session.id,
        name: session.name,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration || 0,
      },
      operations: session.operations || [],
      samples: session.samples || [],
      metrics: session.metrics,
      exportedAt: new Date().toISOString(),
    };
  }

  exportAll() {
    const sessions = [];

    for (const [id, session] of this.sessions.entries()) {
      sessions.push(this.exportSession(id));
    }

    return {
      sessions,
      globalMetrics: this.metrics,
      exportedAt: new Date().toISOString(),
    };
  }

  // ============================================
  // RESET
  // ============================================

  reset() {
    // Stop all active sampling
    for (const [id, session] of this.sessions.entries()) {
      this.stopSampling(id);
    }

    this.sessions.clear();
    this.currentSession = null;
    this.samples = [];
    this.metrics = {
      totalTime: 0,
      avgTime: 0,
      maxTime: 0,
      minTime: Infinity,
      operations: 0,
      errors: 0,
    };

    console.log("🔄 PerformanceMonitor reset edildi");
  }

  // ============================================
  // SAFE ACCESS HELPERS
  // ============================================

  safeAccess(obj, path, defaultValue = null) {
    try {
      return (
        path.split(".").reduce((acc, part) => acc && acc[part], obj) ||
        defaultValue
      );
    } catch {
      return defaultValue;
    }
  }
}

// Global export
if (typeof window !== "undefined") {
  window.PerformanceMonitor = PerformanceMonitor;
  window.perfMonitor = new PerformanceMonitor();
  console.log("✅ PerformanceMonitor yüklendi");
}

// 🌍 Global erişim
window.PerformanceMonitor = PerformanceMonitor;
window.perfMonitor = new PerformanceMonitor();
console.log("📦 PerformanceMonitor global erişim aktif!");
