/**
 * Form Validation Module
 * Handles all validation logic for the registration form
 */

const Validation = {
  /**
   * Validate a single field
   * @param {HTMLElement} field - Input element to validate
   * @returns {Object} { valid: boolean, message: string }
   */
  validateField(field) {
    if (!field) {
      return { valid: false, message: 'Field not found' };
    }

    // Skip hidden and disabled fields
    if (field.type === 'hidden' || field.disabled) {
      return { valid: true, message: '' };
    }

    const value = field.value?.trim() || '';
    const name = field.name;
    const type = field.type;

    // Check required fields
    if (field.required && !value) {
      return {
        valid: false,
        message: 'Field ini wajib diisi'
      };
    }

    // Skip validation if field is empty and not required
    if (!value && !field.required) {
      return { valid: true, message: '' };
    }

    // Type-specific validation
    switch (type) {
      case 'email':
        return this.validateEmail(value);

      case 'tel':
      case 'phone':
        return this.validatePhone(value);

      case 'number':
        return this.validateNumber(value, field);

      case 'date':
        return this.validateDate(value);

      default:
        // Name-specific validation
        return this.validateByName(name, value, field);
    }
  },

  /**
   * Validate by field name
   * @param {string} name - Field name
   * @param {string} value - Field value
   * @param {HTMLElement} field - Input element
   * @returns {Object}
   */
  validateByName(name, value, field) {
    // NIK validation (16 digits)
    if (['nik_siswa', 'nik_ayah', 'nik_ibu'].includes(name)) {
      if (!/^\d{16}$/.test(value)) {
        return {
          valid: false,
          message: Config?.errors?.invalidNIK || 'NIK harus 16 digit angka'
        };
      }
    }

    // NISN validation (10 digits)
    if (name === 'nisn') {
      if (!/^\d{10}$/.test(value)) {
        return {
          valid: false,
          message: Config?.errors?.invalidNISN || 'NISN harus 10 digit angka'
        };
      }
    }

    // KK validation (16 digits)
    if (name === 'no_kk') {
      if (!/^\d{16}$/.test(value)) {
        return {
          valid: false,
          message: Config?.errors?.invalidKK || 'Nomor KK harus 16 digit angka'
        };
      }
    }

    // Phone validation
    if (name === 'hp' || name === 'no_hp' || name === 'telepon') {
      return this.validatePhone(value);
    }

    // HTML5 native validation
    if (field && !field.checkValidity()) {
      return {
        valid: false,
        message: field.validationMessage || 'Input tidak valid'
      };
    }

    return { valid: true, message: '' };
  },

  /**
   * Validate email
   * @param {string} email
   * @returns {Object}
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return {
        valid: false,
        message: 'Format email tidak valid'
      };
    }

    return { valid: true, message: '' };
  },

  /**
   * Validate phone number
   * @param {string} phone
   * @returns {Object}
   */
  validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const minLength = Config?.validation?.phoneMinLength || 10;
    const maxLength = Config?.validation?.phoneMaxLength || 13;

    if (cleaned.length < minLength || cleaned.length > maxLength) {
      return {
        valid: false,
        message: Config?.errors?.invalidPhone || `Nomor HP harus ${minLength}-${maxLength} digit`
      };
    }

    return { valid: true, message: '' };
  },

  /**
   * Validate number
   * @param {string} value
   * @param {HTMLElement} field
   * @returns {Object}
   */
  validateNumber(value, field) {
    const num = parseFloat(value);

    if (isNaN(num)) {
      return {
        valid: false,
        message: 'Harus berupa angka'
      };
    }

    if (field.min && num < parseFloat(field.min)) {
      return {
        valid: false,
        message: `Minimal ${field.min}`
      };
    }

    if (field.max && num > parseFloat(field.max)) {
      return {
        valid: false,
        message: `Maksimal ${field.max}`
      };
    }

    return { valid: true, message: '' };
  },

  /**
   * Validate date
   * @param {string} dateStr
   * @returns {Object}
   */
  validateDate(dateStr) {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return {
        valid: false,
        message: 'Format tanggal tidak valid'
      };
    }

    // Check if date is not in the future
    if (date > new Date()) {
      return {
        valid: false,
        message: 'Tanggal tidak boleh di masa depan'
      };
    }

    return { valid: true, message: '' };
  },

  /**
   * Validate radio group
   * @param {string} name - Radio group name
   * @param {HTMLElement} container - Container element
   * @returns {Object}
   */
  validateRadioGroup(name, container) {
    const checked = container.querySelector(`input[name="${name}"]:checked`);

    if (!checked) {
      return {
        valid: false,
        message: 'Pilih salah satu opsi'
      };
    }

    return { valid: true, message: '' };
  },

  /**
   * Validate an entire step
   * @param {HTMLElement} stepElement - Step container element
   * @returns {Object} { valid: boolean, errors: Array }
   */
  validateStep(stepElement) {
    if (!stepElement) {
      return { valid: false, errors: ['Step element not found'] };
    }

    const errors = [];
    const fields = Array.from(stepElement.querySelectorAll('input, select, textarea'));
    const radioGroups = new Set();

    // Clear previous error displays
    this.clearStepErrors(stepElement);

    // Validate each field
    fields.forEach(field => {
      // Handle radio buttons separately
      if (field.type === 'radio') {
        const groupName = field.name;

        // Skip if already validated
        if (radioGroups.has(groupName)) {
          return;
        }

        radioGroups.add(groupName);

        // Validate radio group
        if (field.required) {
          const result = this.validateRadioGroup(groupName, stepElement);

          if (!result.valid) {
            errors.push({
              field: groupName,
              message: result.message,
              element: field
            });
            this.showFieldError(field, result.message);
          }
        }

        return;
      }

      // Validate non-radio fields
      const result = this.validateField(field);

      if (!result.valid) {
        errors.push({
          field: field.name,
          message: result.message,
          element: field
        });
        this.showFieldError(field, result.message);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Show error message for a field
   * @param {HTMLElement} field
   * @param {string} message
   */
  showFieldError(field, message) {
    if (!field) return;

    // Add invalid class to field
    field.classList.add('invalid');

    // Find or create error message element
    let errorElement;

    // For radio buttons, find the message element by name
    if (field.type === 'radio') {
      const msgId = `${field.name}_msg`;
      errorElement = document.getElementById(msgId);
    } else {
      // For other fields, find in parent or sibling
      errorElement = field.parentElement?.querySelector('.invalid-msg');

      if (!errorElement) {
        errorElement = document.getElementById(`${field.name}_msg`);
      }
    }

    // Show error message
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    } else {
      // Create error element if not found
      errorElement = document.createElement('div');
      errorElement.className = 'invalid-msg';
      errorElement.textContent = message;
      errorElement.style.display = 'block';

      if (field.parentElement) {
        field.parentElement.appendChild(errorElement);
      }
    }
  },

  /**
   * Clear all errors in a step
   * @param {HTMLElement} stepElement
   */
  clearStepErrors(stepElement) {
    if (!stepElement) return;

    // Remove invalid class from all fields
    stepElement.querySelectorAll('.invalid').forEach(el => {
      el.classList.remove('invalid');
    });

    // Hide all error messages
    stepElement.querySelectorAll('.invalid-msg').forEach(msg => {
      msg.style.display = 'none';
    });
  },

  /**
   * Clear error for a specific field
   * @param {HTMLElement} field
   */
  clearFieldError(field) {
    if (!field) return;

    field.classList.remove('invalid');

    // Find and hide error message
    let errorElement;

    if (field.type === 'radio') {
      errorElement = document.getElementById(`${field.name}_msg`);
    } else {
      errorElement = field.parentElement?.querySelector('.invalid-msg');

      if (!errorElement) {
        errorElement = document.getElementById(`${field.name}_msg`);
      }
    }

    if (errorElement) {
      errorElement.style.display = 'none';
    }
  },

  /**
   * Sanitize input value
   * @param {string} value
   * @param {string} type - Type of sanitization
   * @returns {string}
   */
  sanitize(value, type = 'text') {
    if (!value) return '';

    let sanitized = value.trim();

    switch (type) {
      case 'numeric':
        // Remove all non-numeric characters
        sanitized = sanitized.replace(/\D/g, '');
        break;

      case 'alphanumeric':
        // Keep only letters and numbers
        sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
        break;

      case 'phone':
        // Remove non-numeric and limit length
        sanitized = sanitized.replace(/\D/g, '').slice(0, 13);
        break;

      case 'nik':
        // Exactly 16 digits
        sanitized = sanitized.replace(/\D/g, '').slice(0, 16);
        break;

      case 'nisn':
        // Exactly 10 digits
        sanitized = sanitized.replace(/\D/g, '').slice(0, 10);
        break;

      case 'text':
      default:
        // Basic HTML escape
        sanitized = sanitized
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
        break;
    }

    return sanitized;
  },

  /**
   * Setup auto-sanitization for numeric fields
   * @param {HTMLElement} field
   * @param {number} maxLength
   */
  setupNumericOnly(field, maxLength) {
    if (!field) return;

    field.addEventListener('input', (e) => {
      const cleaned = e.target.value.replace(/\D/g, '').slice(0, maxLength);
      if (e.target.value !== cleaned) {
        e.target.value = cleaned;
      }
    });
  },

  /**
   * Setup real-time validation for a field
   * @param {HTMLElement} field
   */
  setupRealtimeValidation(field) {
    if (!field) return;

    // Validate on blur
    field.addEventListener('blur', () => {
      const result = this.validateField(field);

      if (!result.valid) {
        this.showFieldError(field, result.message);
      } else {
        this.clearFieldError(field);
      }
    });

    // Clear error on input
    field.addEventListener('input', () => {
      if (field.classList.contains('invalid')) {
        this.clearFieldError(field);
      }
    });
  },

  /**
   * Initialize validation for all fields in a form
   * @param {HTMLElement} formElement
   */
  initForm(formElement) {
    if (!formElement) return;

    const fields = formElement.querySelectorAll('input, select, textarea');

    fields.forEach(field => {
      // Setup realtime validation
      this.setupRealtimeValidation(field);

      // Setup numeric-only for specific fields
      if (['nik_siswa', 'nik_ayah', 'nik_ibu', 'no_kk'].includes(field.name)) {
        this.setupNumericOnly(field, 16);
      } else if (field.name === 'nisn') {
        this.setupNumericOnly(field, 10);
      } else if (['hp', 'no_hp', 'telepon'].includes(field.name)) {
        this.setupNumericOnly(field, 13);
      }
    });

    if (Config?.isDevelopment()) {
      console.log('✓ Validation initialized for', fields.length, 'fields');
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validation;
}
