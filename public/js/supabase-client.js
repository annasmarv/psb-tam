/**
 * Supabase Client Module
 * Handles all Supabase operations and API calls
 */

const SupabaseClient = {
  client: null,
  initialized: false,
  
  /**
   * Update connection status indicator
   * @param {boolean} connected 
   */
  updateConnectionStatus(connected) {
    const indicator = document.getElementById('connectionIndicator');
    if (indicator) {
      indicator.classList.toggle('connected', connected);
    }
  },

  /**
   * Check database connection
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    try {
      if (!this.client) return false;
      const { data, error } = await this.client.from('settings').select('id').limit(1);
      const isConnected = !error;
      this.updateConnectionStatus(isConnected);
      return isConnected;
    } catch (err) {
      console.error('Connection check failed:', err);
      this.updateConnectionStatus(false);
      return false;
    }
  },

  /**
   * Initialize Supabase client
   * @returns {boolean} Success status
   */
  init() {
    try {
      // Check if Supabase library is loaded
      if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase library not loaded');
        this.updateConnectionStatus(false);
        return false;
      }

      // Get credentials from config
      const url = Config?.supabase?.url;
      const key = Config?.supabase?.anonKey;

      if (!url || !key) {
        console.error('❌ Supabase credentials not configured');
        return false;
      }

      // Validate URL format
      if (!url.includes('supabase.co')) {
        console.warn('⚠️ Invalid Supabase URL format');
        return false;
      }

      // Create client
      this.client = window.supabase.createClient(url, key);
      this.initialized = true;

      if (Config?.isDevelopment()) {
        console.log('✓ Supabase client initialized');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      return false;
    }
  },

  /**
   * Check if client is ready
   * @returns {boolean}
   */
  isReady() {
    return this.initialized && this.client !== null;
  },

  /**
   * Test connection to Supabase
   * @returns {Promise<Object>}
   */
  async testConnection() {
    if (!this.isReady()) {
      return {
        success: false,
        message: 'Client not initialized'
      };
    }

    try {
      const tableName = Config?.database?.tableName || 'registrasi_siswa';

      // Try to select with limit 0 (just to test connection)
      const { error } = await this.client
        .from(tableName)
        .select('id')
        .limit(0);

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error
        };
      }

      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  },

  /**
   * Insert registration data
   * @param {Object} data - Registration data
   * @returns {Promise<Object>}
   */
  async insertRegistration(data) {
    if (!this.isReady()) {
      return {
        success: false,
        message: 'Supabase client not initialized',
        error: new Error('Client not ready')
      };
    }

    try {
      const tableName = Config?.database?.tableName || 'registrasi_siswa';

      // Prepare data
      const registrationData = this.prepareData(data);

      if (Config?.isDevelopment()) {
        console.log('Inserting data to Supabase:', registrationData);
      }

      // Insert to database
      const { data: result, error } = await this.client
        .from(tableName)
        .insert([registrationData])
        .select();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        return {
          success: false,
          message: this.getErrorMessage(error),
          error: error
        };
      }

      if (Config?.isDevelopment()) {
        console.log('✓ Data inserted successfully:', result);
      }

      return {
        success: true,
        message: 'Data berhasil disimpan',
        data: result
      };
    } catch (error) {
      console.error('❌ Unexpected error during insert:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan tidak terduga',
        error: error
      };
    }
  },

  /**
   * Prepare data for insertion
   * @param {Object} rawData - Raw form data
   * @returns {Object} Prepared data
   */
  prepareData(rawData) {
    const prepared = {
      // Set default status
      status: 'submitted',
      created_at: new Date().toISOString()
    };

    // Copy all form fields
    Object.entries(rawData).forEach(([key, value]) => {
      // Skip empty values
      if (value === '' || value === null || value === undefined) {
        return;
      }

      // Convert string numbers to actual numbers for numeric fields
      if (['anak_ke', 'jumlah_saudara'].includes(key)) {
        prepared[key] = parseInt(value, 10) || 0;
      } else if (['tinggi_badan', 'berat_badan'].includes(key)) {
        prepared[key] = parseFloat(value) || 0;
      } else {
        prepared[key] = value;
      }
    });

    return prepared;
  },

  /**
   * Check if registration number exists
   * @param {string} registrationNumber
   * @returns {Promise<boolean>}
   */
  async checkRegistrationExists(registrationNumber) {
    if (!this.isReady()) {
      return false;
    }

    try {
      const tableName = Config?.database?.tableName || 'registrasi_siswa';

      const { data, error } = await this.client
        .from(tableName)
        .select('nomor_registrasi')
        .eq('nomor_registrasi', registrationNumber)
        .limit(1);

      if (error) {
        console.error('Error checking registration:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Unexpected error checking registration:', error);
      return false;
    }
  },

  /**
   * Generate unique registration number
   * @returns {Promise<string>}
   */
  async generateUniqueRegistrationNumber() {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const regNo = Config?.generateRegistrationNumber() ||
                    `PSB${Date.now().toString().slice(-8)}`;

      // Check if exists
      const exists = await this.checkRegistrationExists(regNo);

      if (!exists) {
        return regNo;
      }

      attempts++;
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Fallback: add random suffix
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PSB${timestamp.slice(-8)}${random}`;
  },

  /**
   * Get user-friendly error message
   * @param {Object} error - Supabase error object
   * @returns {string}
   */
  getErrorMessage(error) {
    if (!error) return 'Unknown error';

    // Check for common error codes
    if (error.code === '23505') {
      return 'Data sudah ada (duplicate)';
    }

    if (error.code === '42P01') {
      return 'Tabel database tidak ditemukan';
    }

    if (error.code === '42501') {
      return 'Tidak memiliki akses ke database';
    }

    if (error.message) {
      // Check for network errors
      if (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError')) {
        return 'Koneksi internet bermasalah';
      }

      // Check for auth errors
      if (error.message.includes('JWT') ||
          error.message.includes('invalid API key')) {
        return 'Konfigurasi Supabase tidak valid';
      }

      return error.message;
    }

    return 'Terjadi kesalahan saat menyimpan data';
  },

  /**
   * Get database statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    if (!this.isReady()) {
      return null;
    }

    try {
      const tableName = Config?.database?.tableName || 'registrasi_siswa';

      // Get total count
      const { count, error } = await this.client
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error getting stats:', error);
        return null;
      }

      return {
        totalRegistrations: count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Unexpected error getting stats:', error);
      return null;
    }
  },

  /**
   * Submit form data with retry logic
   * @param {Object} formData - Form data to submit
   * @param {Object} options - Submit options
   * @returns {Promise<Object>}
   */
  async submitWithRetry(formData, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Generate unique registration number
        const registrationNumber = await this.generateUniqueRegistrationNumber();

        // Add registration number to data
        const dataWithRegNo = {
          ...formData,
          nomor_registrasi: registrationNumber
        };

        // Try to insert
        const result = await this.insertRegistration(dataWithRegNo);

        if (result.success) {
          return {
            success: true,
            registrationNumber: registrationNumber,
            data: result.data,
            message: result.message,
            attempt: attempt
          };
        }

        lastError = result.error;

        // Don't retry on certain errors
        if (result.error?.code === '42P01' || // Table not found
            result.error?.code === '42501') { // Permission denied
          break;
        }

      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error);
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    return {
      success: false,
      message: this.getErrorMessage(lastError),
      error: lastError,
      attempts: maxRetries
    };
  },

  /**
   * Batch insert (for future use)
   * @param {Array} dataArray - Array of registration data
   * @returns {Promise<Object>}
   */
  async batchInsert(dataArray) {
    if (!this.isReady()) {
      return {
        success: false,
        message: 'Client not initialized'
      };
    }

    try {
      const tableName = Config?.database?.tableName || 'registrasi_siswa';
      const preparedData = dataArray.map(data => this.prepareData(data));

      const { data: result, error } = await this.client
        .from(tableName)
        .insert(preparedData)
        .select();

      if (error) {
        return {
          success: false,
          message: this.getErrorMessage(error),
          error: error
        };
      }

      return {
        success: true,
        message: `${result.length} data berhasil disimpan`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Batch insert failed',
        error: error
      };
    }
  }
};

// Auto-initialize when config is ready
if (typeof Config !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (Config?.isFeatureEnabled('enableSupabase')) {
        SupabaseClient.init();
      }
    });
  } else {
    if (Config?.isFeatureEnabled('enableSupabase')) {
      SupabaseClient.init();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseClient;
}
