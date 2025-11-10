/**
 * LocalStorage Management Module
 * Handles all localStorage operations for form data persistence
 */

const Storage = {
  // Get storage key from config
  get key() {
    return Config?.storage?.formDataKey || 'psb_form_data';
  },

  get lastSaveKey() {
    return Config?.storage?.lastSaveKey || 'psb_last_save';
  },

  /**
   * Save form data to localStorage
   * @param {Object} data - Form data object
   * @returns {boolean} Success status
   */
  save(data) {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(this.key, jsonData);
      localStorage.setItem(this.lastSaveKey, new Date().toISOString());

      if (Config?.isDevelopment()) {
        console.log('✓ Data saved to localStorage:', Object.keys(data).length, 'fields');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error);

      // Check if quota exceeded
      if (error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
      }

      return false;
    }
  },

  /**
   * Load form data from localStorage
   * @returns {Object|null} Form data or null if not found
   */
  load() {
    try {
      const data = localStorage.getItem(this.key);

      if (!data) {
        if (Config?.isDevelopment()) {
          console.log('No saved data found in localStorage');
        }
        return null;
      }

      const parsed = JSON.parse(data);
      const lastSave = localStorage.getItem(this.lastSaveKey);

      if (Config?.isDevelopment()) {
        console.log('✓ Data loaded from localStorage:', Object.keys(parsed).length, 'fields');
        if (lastSave) {
          console.log('Last saved:', new Date(lastSave).toLocaleString('id-ID'));
        }
      }

      return parsed;
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
      return null;
    }
  },

  /**
   * Clear form data from localStorage
   * @returns {boolean} Success status
   */
  clear() {
    try {
      localStorage.removeItem(this.key);
      localStorage.removeItem(this.lastSaveKey);

      if (Config?.isDevelopment()) {
        console.log('✓ localStorage cleared');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to clear localStorage:', error);
      return false;
    }
  },

  /**
   * Check if saved data exists
   * @returns {boolean}
   */
  hasData() {
    return localStorage.getItem(this.key) !== null;
  },

  /**
   * Get last save timestamp
   * @returns {Date|null}
   */
  getLastSaveTime() {
    const timestamp = localStorage.getItem(this.lastSaveKey);
    return timestamp ? new Date(timestamp) : null;
  },

  /**
   * Get storage size in bytes
   * @returns {number}
   */
  getSize() {
    try {
      const data = localStorage.getItem(this.key);
      return data ? new Blob([data]).size : 0;
    } catch (error) {
      console.error('Failed to get storage size:', error);
      return 0;
    }
  },

  /**
   * Get human-readable storage size
   * @returns {string}
   */
  getSizeFormatted() {
    const bytes = this.getSize();

    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Handle storage quota exceeded
   */
  handleQuotaExceeded() {
    console.warn('⚠️ LocalStorage quota exceeded!');

    // Try to show user-friendly message
    if (typeof showNotification === 'function') {
      showNotification(
        'Penyimpanan penuh! Data mungkin tidak tersimpan. Silakan submit formulir sesegera mungkin.',
        'warning'
      );
    } else {
      alert('Penyimpanan browser penuh! Silakan submit formulir Anda.');
    }
  },

  /**
   * Check if localStorage is available
   * @returns {boolean}
   */
  isAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.warn('⚠️ localStorage not available:', error.message);
      return false;
    }
  },

  /**
   * Get all storage info
   * @returns {Object}
   */
  getInfo() {
    return {
      available: this.isAvailable(),
      hasData: this.hasData(),
      size: this.getSize(),
      sizeFormatted: this.getSizeFormatted(),
      lastSave: this.getLastSaveTime(),
      key: this.key
    };
  },

  /**
   * Export data as JSON file
   * @param {string} filename - Optional filename
   */
  exportData(filename = 'psb-data-backup.json') {
    try {
      const data = this.load();

      if (!data) {
        console.warn('No data to export');
        return false;
      }

      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      URL.revokeObjectURL(url);

      console.log('✓ Data exported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      return false;
    }
  },

  /**
   * Import data from JSON
   * @param {Object} data - Data to import
   * @returns {boolean}
   */
  importData(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      const success = this.save(data);

      if (success) {
        console.log('✓ Data imported successfully');
      }

      return success;
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      return false;
    }
  },

  /**
   * Debug: Log storage contents
   */
  debug() {
    if (!Config?.isDevelopment()) {
      console.warn('Debug mode only available in development');
      return;
    }

    console.group('🔍 LocalStorage Debug Info');
    console.log('Key:', this.key);
    console.log('Data:', this.load());
    console.log('Size:', this.getSizeFormatted());
    console.log('Last Save:', this.getLastSaveTime());
    console.log('Available:', this.isAvailable());
    console.groupEnd();
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
