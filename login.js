import APIClient from './index.js';

// ==================== CONFIGURAÇÕES ====================
const API_CLIENT = new APIClient();
const AUTH_STATE = {
  isAuthenticated: false,
  user: null,
  tokens: {
    access: null,
    refresh: null,
  },
};

// ==================== VALIDAÇÃO ====================
class ValidationService {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);
    const hasMinLength = password.length >= 8;

    return {
      isValid: hasUpperCase && hasNumber && hasSpecialChar && hasMinLength,
      errors: {
        upperCase: !hasUpperCase ? 'Mínimo 1 letra maiúscula' : null,
        number: !hasNumber ? 'Mínimo 1 número' : null,
        specialChar: !hasSpecialChar ? 'Mínimo 1 caractere especial (!@#$%^&*)' : null,
        minLength: !hasMinLength ? 'Mínimo 8 caracteres' : null,
      },
    };
  }

  static validateName(name) {
    return name.length >= 3 && name.length <= 100;
  }
}

// ==================== UI MANAGER ====================
class UIManager {
  static showLoadingSpinner(show = true) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.style.display = show ? 'flex' : 'none';
    }
  }

  static showError(message, duration = 5000) {
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
      errorContainer.className = 'alert alert-danger';

      setTimeout(() => {
        errorContainer.style.display = 'none';
      }, duration);
    }
  }

  static showSuccess(message, duration = 3000) {
    const successContainer = document.getElementById('success-message');
    if (successContainer) {
      successContainer.textContent = message;
      successContainer.style.display = 'block';
      successContainer.className = 'alert alert-success';

      setTimeout(() => {
        successContainer.style.display = 'none';
      }, duration);
    }
  }

  static updatePasswordStrength(password) {
    const validation = ValidationService.validatePassword(password);
    const strengthBar = document.getElementById('password-strength');
    const strengthText = document.getElementById('password-strength-text');

    if (strengthBar && strengthText) {
      const strength = Object.values(validation.errors).filter(e => e === null).length;
      const percentage = (strength / 4) * 100;

      strengthBar.style.width = percentage + '%';
      strengthBar.className = `password-strength-bar ${
        percentage < 50 ? 'weak' : percentage < 75 ? 'medium' : 'strong'
      }`;

      strengthText.textContent =
        percentage < 50 ? 'Fraca' : percentage < 75 ? 'Média' : 'Forte';
      strengthText.className = `password-strength-text ${
        percentage < 50 ? 'text-danger' : percentage < 75 ? 'text-warning' : 'text-success'
      }`;
    }

    this.updatePasswordErrors(validation.errors);
  }

  static updatePasswordErrors(errors) {
    const errorList = document.getElementById('password-errors');
    if (errorList) {
      const errorMessages = Object.values(errors).filter(e => e !== null);
      errorList.innerHTML = errorMessages
        .map(error => `<small class="text-danger d-block">✗ ${error}</small>`)
        .join('');
    }
  }

  static switchTab(tabName) {
    // Esconde todas as abas
    document.querySelectorAll('[data-tab]').forEach(tab => {
      tab.style.display = 'none';
    });

    // Remove classe ativa dos botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Mostra aba selecionada
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedTab) {
      selectedTab.style.display = 'block';
    }

    // Marca botão como ativo
    event.target.classList.add('active');
  }

  static togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.target;

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }

  static setFormValues(formData) {
    Object.keys(formData).forEach(key => {
      const input = document.getElementById(key);
      if (input) {
        input.value = formData[key];
      }
    });
  }

  static clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
    }
  }
}

// ==================== AUTENTICAÇÃO ====================
class AuthService {
  static async login(email, password, rememberMe = false) {
    // Validação
    if (!ValidationService.validateEmail(email)) {
      UIManager.showError('Email inválido');
      return false;
    }

    if (!password) {
      UIManager.showError('Senha é obrigatória');
      return false;
    }

    try {
      UIManager.showLoadingSpinner(true);

      const response = await API_CLIENT.login(email, password, rememberMe);

      AUTH_STATE.isAuthenticated = true;
      AUTH_STATE.user = {
        email: email,
        user_id: response.user_id,
      };
      AUTH_STATE.tokens = {
        access: response.access_token,
        refresh: response.refresh_token,
      };

      // Salva no localStorage ou sessionStorage dependendo do "lembre de mim"
      if (rememberMe) {
        localStorage.setItem('auth_state', JSON.stringify(AUTH_STATE));
        localStorage.setItem('remember_me', 'true');
      } else {
        sessionStorage.setItem('auth_state', JSON.stringify(AUTH_STATE));
        localStorage.removeItem('remember_me');
      }

      UIManager.showSuccess('Login realizado com sucesso!');
      
      // Redireciona após 1s
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);

      return true;
    } catch (error) {
      UIManager.showError(error.response?.data?.detail || 'Erro ao fazer login');
      return false;
    } finally {
      UIManager.showLoadingSpinner(false);
    }
  }

  static async register(email, password, confirmPassword, name) {
    // Validações
    if (!ValidationService.validateEmail(email)) {
      UIManager.showError('Email inválido');
      return false;
    }

    if (!ValidationService.validateName(name)) {
      UIManager.showError('Nome deve ter entre 3 e 100 caracteres');
      return false;
    }

    const passwordValidation = ValidationService.validatePassword(password);
    if (!passwordValidation.isValid) {
      const errors = Object.values(passwordValidation.errors)
        .filter(e => e !== null)
        .join(', ');
      UIManager.showError(`Senha fraca: ${errors}`);
      return false;
    }

    if (password !== confirmPassword) {
      UIManager.showError('As senhas não conferem');
      return false;
    }

    try {
      UIManager.showLoadingSpinner(true);

      const response = await API_CLIENT.register(email, password, name);

      UIManager.showSuccess('Cadastro realizado! Faça login com suas credenciais.');
      
      // Limpa formulário e volta à aba de login
      setTimeout(() => {
        UIManager.clearForm('register-form');
        UIManager.switchTab('login');
      }, 1500);

      return true;
    } catch (error) {
      UIManager.showError(error.response?.data?.detail || 'Erro ao registrar');
      return false;
    } finally {
      UIManager.showLoadingSpinner(false);
    }
  }

  static async logout() {
    try {
      await API_CLIENT.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      AUTH_STATE.isAuthenticated = false;
      AUTH_STATE.user = null;
      AUTH_STATE.tokens = { access: null, refresh: null };
      
      // Limpa ambos os storages
      localStorage.removeItem('auth_state');
      localStorage.removeItem('remember_me');
      sessionStorage.removeItem('auth_state');
      
      window.location.href = '/login.html';
    }
  }

  static async requestPasswordReset(email) {
    if (!ValidationService.validateEmail(email)) {
      UIManager.showError('Email inválido');
      return false;
    }

    try {
      UIManager.showLoadingSpinner(true);

      const response = await API_CLIENT.client.post('/auth/password-reset', {
        email,
      });

      UIManager.showSuccess('Link de reset enviado ao seu email');
      return true;
    } catch (error) {
      UIManager.showError('Erro ao solicitar reset de senha');
      return false;
    } finally {
      UIManager.showLoadingSpinner(false);
    }
  }

  static async confirmPasswordReset(token, newPassword, confirmPassword) {
    const passwordValidation = ValidationService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      UIManager.showError('Senha não atende aos requisitos de segurança');
      return false;
    }

    if (newPassword !== confirmPassword) {
      UIManager.showError('As senhas não conferem');
      return false;
    }

    try {
      UIManager.showLoadingSpinner(true);

      const response = await API_CLIENT.client.post('/auth/password-reset-confirm', {
        token,
        new_password: newPassword,
      });

      UIManager.showSuccess('Senha alterada com sucesso!');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1500);

      return true;
    } catch (error) {
      UIManager.showError('Erro ao redefinir senha');
      return false;
    } finally {
      UIManager.showLoadingSpinner(false);
    }
  }

  static isAuthenticated() {
    // Verifica primeiro localStorage (remember_me), depois sessionStorage
    let savedState = localStorage.getItem('auth_state');
    if (!savedState) {
      savedState = sessionStorage.getItem('auth_state');
    }
    
    if (savedState) {
      Object.assign(AUTH_STATE, JSON.parse(savedState));
      return AUTH_STATE.isAuthenticated;
    }
    return false;
  }

  static getAuthState() {
    return AUTH_STATE;
  }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  // Login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const rememberMe = document.getElementById('remember-me')?.checked || false;
      await AuthService.login(email, password, rememberMe);
    });
  }

  // Registro
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('register-email').value;
      const name = document.getElementById('register-name').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      await AuthService.register(email, password, confirmPassword, name);
    });
  }

  // Validação de senha em tempo real
  const passwordInput = document.getElementById('register-password');
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      UIManager.updatePasswordStrength(e.target.value);
    });
  }

  // Alternância de abas
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = btn.getAttribute('data-tab-target');
      UIManager.switchTab(tabName);
    });
  });

  // Visibilidade de senha
  const toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const inputId = btn.getAttribute('data-toggle');
      UIManager.togglePasswordVisibility(inputId);
    });
  });

  // Reset de senha
  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('reset-email').value;
      await AuthService.requestPasswordReset(email);
    });
  }

  // Redireciona se já autenticado
  if (AuthService.isAuthenticated() && window.location.pathname.includes('login')) {
    window.location.href = '/dashboard.html';
  }
});

// ==================== EXPORTAR ====================
export { AuthService, ValidationService, UIManager, AUTH_STATE };