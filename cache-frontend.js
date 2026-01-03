/**
 * Sistema de Cache Frontend - LocalStorage/IndexedDB
 * Camada de cache no navegador para performance e modo offline
 */

class FrontendCache {
  constructor() {
    this.CACHE_PREFIX = 'chat_ai_cache_';
    this.MAX_AGE_HOURS = 24;
  }

  /**
   * Salva dados no localStorage com timestamp
   */
  save(key, data, metadata = {}) {
    try {
      const cacheEntry = {
        data,
        metadata,
        timestamp: new Date().toISOString(),
        version: 1
      };
      
      localStorage.setItem(
        this.CACHE_PREFIX + key,
        JSON.stringify(cacheEntry)
      );
      
      console.log(`💾 Cache salvo: ${key} (${this._getSize(data)} items)`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error);
      // Se localStorage cheio, limpar cache antigo
      if (error.name === 'QuotaExceededError') {
        this.clearOld(7); // Remove >7 dias
        // Tenta novamente
        try {
          localStorage.setItem(
            this.CACHE_PREFIX + key,
            JSON.stringify({ data, metadata, timestamp: new Date().toISOString(), version: 1 })
          );
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Busca dados do cache
   */
  get(key) {
    try {
      const cached = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) return null;

      const entry = JSON.parse(cached);
      const age = this._getAgeHours(entry.timestamp);

      // Verifica se está expirado
      if (age > this.MAX_AGE_HOURS) {
        console.log(`⏰ Cache expirado: ${key} (${age.toFixed(1)}h)`);
        this.remove(key);
        return null;
      }

      console.log(`📦 Cache encontrado: ${key} (${age.toFixed(1)}h atrás)`);
      return entry;
    } catch (error) {
      console.error('❌ Erro ao ler cache:', error);
      return null;
    }
  }

  /**
   * Remove item do cache
   */
  remove(key) {
    localStorage.removeItem(this.CACHE_PREFIX + key);
  }

  /**
   * Lista todos os caches
   */
  list() {
    const caches = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.CACHE_PREFIX)) {
        const shortKey = key.replace(this.CACHE_PREFIX, '');
        const entry = this.get(shortKey);
        if (entry) {
          caches.push({
            key: shortKey,
            size: this._getSize(entry.data),
            age: this._getAgeHours(entry.timestamp),
            metadata: entry.metadata
          });
        }
      }
    }
    return caches;
  }

  /**
   * Remove caches mais antigos que X horas
   */
  clearOld(maxAgeHours = 168) { // Padrão: 7 dias
    let removed = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key.startsWith(this.CACHE_PREFIX)) {
        const shortKey = key.replace(this.CACHE_PREFIX, '');
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          const age = this._getAgeHours(entry.timestamp);
          if (age > maxAgeHours) {
            localStorage.removeItem(key);
            removed++;
          }
        } catch (e) {
          // Remove entradas corrompidas
          localStorage.removeItem(key);
          removed++;
        }
      }
    }
    if (removed > 0) {
      console.log(`🗑️ Removidos ${removed} caches antigos`);
    }
    return removed;
  }

  /**
   * Limpa todo o cache
   */
  clearAll() {
    let removed = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
        removed++;
      }
    }
    console.log(`🗑️ Cache limpo: ${removed} items removidos`);
    return removed;
  }

  /**
   * Estatísticas do cache
   */
  getStats() {
    const caches = this.list();
    const totalSize = caches.reduce((sum, c) => sum + c.size, 0);
    const avgAge = caches.length > 0 
      ? caches.reduce((sum, c) => sum + c.age, 0) / caches.length 
      : 0;

    return {
      total: caches.length,
      totalSize,
      avgAge: avgAge.toFixed(1),
      oldestAge: Math.max(...caches.map(c => c.age)).toFixed(1),
      newestAge: Math.min(...caches.map(c => c.age)).toFixed(1),
      caches
    };
  }

  // Helpers privados
  _getSize(data) {
    return Array.isArray(data) ? data.length : 1;
  }

  _getAgeHours(timestamp) {
    const now = new Date();
    const cached = new Date(timestamp);
    return (now - cached) / (1000 * 60 * 60);
  }
}

// Exporta instância global
const frontendCache = new FrontendCache();

// Se usado como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FrontendCache, frontendCache };
}
