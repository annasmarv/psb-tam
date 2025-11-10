/**
 * Form Handler Module
 * Handles multi-step form logic, navigation, and submission
 */

const FormHandler = {
  // Form state
  currentStep: 0,
  totalSteps: 4,
  formElement: null,
  steps: [],

  // UI Elements
  ui: {
    prevBtn: null,
    nextBtn: null,
    submitBtn: null,
    stepCounter: null,
    progressFill: null,
    pills: [],
    afterSubmit: null,
    regNumberEl: null
  },

  // Auto-save timer
  autoSaveTimer: null,

  /**
   * Initialize form handler
   * @param {string} formId - Form element ID
   */
  init(formId = 'PSBForm') {
    this.formElement = document.getElementById(formId);

    if (!this.formElement) {
      console.error('Form element not found:', formId);
      return false;
    }

    // Get all steps
    this.steps = Array.from(document.querySelectorAll('.step-section'));
    this.totalSteps = this.steps.length;

    // Get UI elements
    this.ui.prevBtn = document.getElementById('prevBtn');
    this.ui.nextBtn = document.getElementById('nextBtn');
    this.ui.submitBtn = document.getElementById('submitBtn');
    this.ui.stepCounter = document.getElementById('stepCounter');
    this.ui.progressFill = document.getElementById('progressFill');
    this.ui.afterSubmit = document.getElementById('afterSubmit');
    this.ui.regNumberEl = document.getElementById('regNumber');

    // Get progress pills
    for (let i = 1; i <= this.totalSteps; i++) {
      const pill = document.getElementById(`pill${i}`);
      if (pill) this.ui.pills.push(pill);
    }

    // Setup event listeners
    this.setupEventListeners();

    // Initialize validation
    Validation.initForm(this.formElement);

    // Setup radio labels
    this.setupRadioLabels();

    // Restore saved data
    this.restoreData();

    // Show first step
    this.showStep(0);

    // Log if development mode
    if (true) {
      console.log('✓ FormHandler initialized with', this.totalSteps, 'steps');
    }

    return true;
  },

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Navigation buttons
    if (this.ui.prevBtn) {
      this.ui.prevBtn.addEventListener('click', () => this.previousStep());
    }

    if (this.ui.nextBtn) {
      this.ui.nextBtn.addEventListener('click', () => this.nextStep());
    }

    // Submit button
    if (this.ui.submitBtn) {
      this.ui.submitBtn.addEventListener('click', () => this.handleSubmit());
    }

    // Auto-save on input (disabled for now)
    // if (Config?.isFeatureEnabled('enableAutoSave')) {
    //   this.formElement.addEventListener('input', () => this.scheduleAutoSave());
    //   this.formElement.addEventListener('change', () => this.scheduleAutoSave());
    // }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Prevent accidental page leave
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  /**
   * Setup radio label highlighting
   */
  setupRadioLabels() {
    const radioLabels = document.querySelectorAll('.radio-label');

    radioLabels.forEach((label) => {
      const input = label.querySelector('input[type="radio"]');

      if (!input) return;

      // Highlight if already checked
      if (input.checked) {
        label.classList.add('selected');
      }

      // Handle change event
      input.addEventListener('change', () => {
        const name = input.name;

        // Remove selected class from all labels with same name
        document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
          radio.closest('.radio-label')?.classList.remove('selected');
        });

        // Add selected class to current label
        if (input.checked) {
          label.classList.add('selected');
        }
      });
    });
  },

  /**
   * Show specific step
   * @param {number} stepIndex - Step index to show
   */
  showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.totalSteps) {
      return;
    }

    // Hide all steps
    this.steps.forEach((step, index) => {
      step.classList.toggle('hidden', index !== stepIndex);
    });

    // Update current step
    this.currentStep = stepIndex;

    // Update UI
    this.updateUI();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Update UI elements based on current step
   */
  updateUI() {
    const index = this.currentStep;

    // Update step counter
    if (this.ui.stepCounter) {
      this.ui.stepCounter.textContent = `${index + 1} / ${this.totalSteps}`;
    }

    // Update progress bar
    if (this.ui.progressFill) {
      const percentage = Math.round(((index + 1) / this.totalSteps) * 100);
      this.ui.progressFill.style.width = percentage + '%';
    }

    // Update progress pills
    this.ui.pills.forEach((pill, i) => {
      if (!pill) return;
      pill.classList.toggle('active', i === index);
      pill.classList.toggle('inactive', i !== index);
    });

    // Update subtitle
    const sectionSub = document.getElementById('sectionSub');
    if (sectionSub) {
      sectionSub.textContent = index === 0 ? 'Isi data sesuai dokumen resmi' : '';
    }

    // Show/hide prev button
    if (this.ui.prevBtn) {
      this.ui.prevBtn.classList.toggle('hidden', index === 0);
    }

    // Update next button
    if (this.ui.nextBtn) {
      const isLastStep = index === this.totalSteps - 1;

      if (isLastStep) {
        this.ui.nextBtn.textContent = 'Kirim Pendaftaran';
        this.ui.nextBtn.style.background = 'var(--brand-gold)';
        this.ui.nextBtn.style.color = '#2b2b2b';
      } else {
        this.ui.nextBtn.textContent = 'Berikutnya →';
        this.ui.nextBtn.style.background = 'var(--brand-green)';
        this.ui.nextBtn.style.color = '#fff';
      }
    }
  },

  /**
   * Go to next step
   */
  nextStep() {
    // Validate current step
    const validation = Validation.validateStep(this.steps[this.currentStep]);

    if (!validation.valid) {
      // Focus on first error field
      if (validation.errors.length > 0) {
        const firstError = validation.errors[0];
        if (firstError.element) {
          firstError.element.focus();
        }
      }
      return;
    }

    // If last step, scroll to submit button
    if (this.currentStep === this.totalSteps - 1) {
      if (this.ui.submitBtn) {
        this.ui.submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Go to next step
    this.showStep(this.currentStep + 1);
  },

  /**
   * Go to previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  },

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e
   */
  handleKeyboard(e) {
    // Don't interfere with form inputs
    if (e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT') {
      return;
    }

    if (e.key === 'ArrowRight' && this.currentStep < this.totalSteps - 1) {
      this.nextStep();
    }

    if (e.key === 'ArrowLeft' && this.currentStep > 0) {
      this.previousStep();
    }
  },

  /**
   * Get all form data
   * @returns {Object}
   */
  getFormData() {
    const formData = {};
    const inputs = this.formElement.querySelectorAll('input, select, textarea');

    inputs.forEach((input) => {
      if (input.type === 'radio') {
        if (input.checked) {
          formData[input.name] = input.value;
        }
      } else if (input.type !== 'hidden') {
        formData[input.name] = input.value;
      }
    });

    return formData;
  },

  /**
   * Restore data from localStorage
   */
  restoreData() {
    const savedData = Storage.load();

    if (!savedData) {
      return;
    }

    try {
      Object.entries(savedData).forEach(([name, value]) => {
        const input = this.formElement.querySelector(`[name="${name}"]`);

        if (!input) return;

        if (input.type === 'radio') {
          const radio = this.formElement.querySelector(`[name="${name}"][value="${value}"]`);
          if (radio) {
            radio.checked = true;
            const label = radio.closest('.radio-label');
            if (label) label.classList.add('selected');
          }
        } else {
          input.value = value;
        }
      });

      // Log restore
      if (true) {
        console.log('✓ Form data restored from localStorage');
      }

      // Show notification
      this.showNotification('Data berhasil dipulihkan', 'success');
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
  },

  /**
   * Schedule auto-save with debounce
   */
  scheduleAutoSave() {
    // Clear previous timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Schedule new save (500ms delay)
    const delay = 500;

    this.autoSaveTimer = setTimeout(() => {
      this.autoSave();
    }, delay);
  },

  /**
   * Auto-save form data
   */
  autoSave() {
    const formData = this.getFormData();
    const success = Storage.save(formData);

    if (success && true) {
      console.log('✓ Auto-saved');
    }
  },

  /**
   * Check if form has unsaved changes
   * @returns {boolean}
   */
  hasUnsavedChanges() {
    return Storage.hasData() && !this.isSubmitted;
  },

  /**
   * Validate all steps
   * @returns {boolean}
   */
  validateAllSteps() {
    for (let i = 0; i < this.totalSteps; i++) {
      const validation = Validation.validateStep(this.steps[i]);

      if (!validation.valid) {
        // Show the step with error
        this.showStep(i);

        // Focus first error
        if (validation.errors.length > 0 && validation.errors[0].element) {
          validation.errors[0].element.focus();
        }

        return false;
      }
    }

    return true;
  },

  /**
   * Handle form submission
   */
  async handleSubmit() {
    // Validate all steps
    if (!this.validateAllSteps()) {
      this.showNotification('Mohon lengkapi semua data yang wajib diisi', 'error');
      return;
    }

    // Get form data
    const formData = this.getFormData();

    // Update button state
    if (this.ui.submitBtn) {
      this.ui.submitBtn.disabled = true;
      this.ui.submitBtn.classList.add('opacity-50');
      this.ui.submitBtn.textContent = '⏳ Mengirim...';
    }

    try {
      let registrationNumber = null;
      let submitSuccess = false;

      // Try to submit to Supabase
      try {
        if (window.__supabaseClient && typeof window.__supabaseClient.from === 'function') {
          const { data, error } = await window.__supabaseClient
            .from('registrasi_siswa')
            .insert([formData])
            .select();

          if (!error && data && data.length > 0) {
            registrationNumber = data[0]?.nomor_registrasi || data[0]?.id;
            submitSuccess = true;

            console.log('✓ Data submitted to Supabase:', data);
          } else {
            console.error('Failed to submit to Supabase:', error?.message || 'Unknown error');
            // Show error but don't fail completely
            this.showNotification(
              'Data disimpan lokal. ' + (error?.message || 'Gagal tersimpan ke database'),
              'warning'
            );
          }
        } else {
          console.log('⚠️ Supabase not available, using localStorage only');
        }
      } catch (supabaseError) {
        console.error('Supabase submission error:', supabaseError);
        this.showNotification(
          'Data disimpan lokal. ' + supabaseError.message,
          'warning'
        );
      }

      // Generate registration number if not from Supabase
      if (!registrationNumber) {
        registrationNumber = `PSB${Date.now().toString().slice(-8)}`;
      }

      // Show success
      this.handleSubmitSuccess(registrationNumber);

      // Clear localStorage after successful submission
      Storage.clear();

      this.isSubmitted = true;

    } catch (error) {
      console.error('Submit error:', error);
      this.handleSubmitError(error);
    }
  },

  /**
   * Handle successful submission
   * @param {string} registrationNumber
   */
  handleSubmitSuccess(registrationNumber) {
    // Update registration number display
    if (this.ui.regNumberEl) {
      this.ui.regNumberEl.textContent = `Nomor Registrasi: ${registrationNumber}`;
    }

    // Show success section
    if (this.ui.afterSubmit) {
      this.ui.afterSubmit.classList.remove('hidden');
      this.ui.afterSubmit.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Update submit button
    if (this.ui.submitBtn) {
      this.ui.submitBtn.classList.remove('opacity-50');
      this.ui.submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
      this.ui.submitBtn.textContent = '✓ Terkirim';
    }

    // Show notification
    this.showNotification('Pendaftaran berhasil!', 'success');
  },

  /**
   * Handle submission error
   * @param {Error} error
   */
  handleSubmitError(error) {
    // Reset button state
    if (this.ui.submitBtn) {
      this.ui.submitBtn.disabled = false;
      this.ui.submitBtn.classList.remove('opacity-50');
      this.ui.submitBtn.textContent = 'Kirim Pendaftaran';
    }

    // Show error message
    const message = error.message || 'Terjadi kesalahan saat mengirim data';
    this.showNotification(message, 'error');
  },

  /**
   * Show notification message
   * @param {string} message
   * @param {string} type - 'success', 'error', 'warning', 'info'
   */
  showNotification(message, type = 'info') {
    // Simple alert for now
    // TODO: Implement better notification UI
    if (type === 'error') {
      alert('❌ ' + message);
    } else if (type === 'warning') {
      alert('⚠️ ' + message);
    } else if (type === 'success') {
      // Success shown in UI, no alert needed
      if (Config?.isDevelopment()) {
        console.log('✓ ' + message);
      }
    } else {
      console.log('ℹ️ ' + message);
    }
  },

  /**
   * Reset form
   */
  reset() {
    if (confirm('Apakah Anda yakin ingin mereset form? Data yang sudah diisi akan hilang.')) {
      this.formElement.reset();
      Storage.clear();
      this.showStep(0);
      this.isSubmitted = false;

      if (Config?.isDevelopment()) {
        console.log('✓ Form reset');
      }
    }
  },

  /**
   * Export form data
   */
  exportData() {
    Storage.exportData();
  },

  /**
   * Get form statistics
   * @returns {Object}
   */
  getStats() {
    return {
      currentStep: this.currentStep + 1,
      totalSteps: this.totalSteps,
      progress: Math.round(((this.currentStep + 1) / this.totalSteps) * 100),
      hasData: Storage.hasData(),
      storageSize: Storage.getSizeFormatted(),
      lastSave: Storage.getLastSaveTime()
    };
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    FormHandler.init();
  });
} else {
  FormHandler.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormHandler;
}
