import { signUp, signIn, signOut, getCurrentUser, onAuthStateChange } from './supabase.js'

class AuthManager {
  constructor() {
    this.currentUser = null
    this.authStateListeners = []
    this.init()
  }

  async init() {
    // Check for existing session
    const { data: { user } } = await getCurrentUser()
    this.currentUser = user
    
    // Listen for auth state changes
    onAuthStateChange((event, session) => {
      this.currentUser = session?.user || null
      this.notifyListeners(event, session)
      
      if (event === 'SIGNED_IN') {
        this.redirectToDashboard()
      } else if (event === 'SIGNED_OUT') {
        this.redirectToLogin()
      }
    })
  }

  async handleLogin(email, password) {
    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        throw error
      }
      
      this.showMessage('Login successful! Redirecting...', 'success')
      return { success: true, data }
    } catch (error) {
      this.showMessage(error.message, 'error')
      return { success: false, error }
    }
  }

  async handleSignup(email, password, fullName, schoolName) {
    try {
      const { data, error } = await signUp(email, password, fullName, schoolName)
      
      if (error) {
        throw error
      }
      
      this.showMessage('Account created successfully! Please check your email to verify your account.', 'success')
      return { success: true, data }
    } catch (error) {
      this.showMessage(error.message, 'error')
      return { success: false, error }
    }
  }

  async handleLogout() {
    try {
      const { error } = await signOut()
      
      if (error) {
        throw error
      }
      
      this.showMessage('Logged out successfully', 'success')
      return { success: true }
    } catch (error) {
      this.showMessage(error.message, 'error')
      return { success: false, error }
    }
  }

  showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessage = document.querySelector('.auth-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    // Create new message
    const messageDiv = document.createElement('div')
    messageDiv.className = `auth-message ${type}`
    messageDiv.textContent = message
    
    // Style the message
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 1000;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
    `
    
    // Set background color based on type
    switch (type) {
      case 'success':
        messageDiv.style.background = '#10b981'
        break
      case 'error':
        messageDiv.style.background = '#ef4444'
        break
      default:
        messageDiv.style.background = '#3b82f6'
    }
    
    document.body.appendChild(messageDiv)
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove()
      }
    }, 5000)
  }

  redirectToDashboard() {
    setTimeout(() => {
      window.location.href = 'dashboard.html'
    }, 1000)
  }

  redirectToLogin() {
    // Reset forms and show login tab
    document.getElementById('login-form').reset()
    document.getElementById('signup-form').reset()
    showForm('login')
  }

  onAuthStateChange(callback) {
    this.authStateListeners.push(callback)
  }

  notifyListeners(event, session) {
    this.authStateListeners.forEach(callback => callback(event, session))
  }

  isAuthenticated() {
    return !!this.currentUser
  }

  getUser() {
    return this.currentUser
  }
}

// Create global auth manager instance
window.authManager = new AuthManager()

// Add CSS animation
const style = document.createElement('style')
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`
document.head.appendChild(style)