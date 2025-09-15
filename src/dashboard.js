// Dashboard functionality and Supabase integration
import { supabase, signOut, getCurrentUser } from './supabase.js'

class DashboardManager {
  constructor() {
    this.currentUser = null
    this.students = []
    this.init()
  }

  async init() {
    // Check authentication
    const { data: { user }, error } = await getCurrentUser()
    
    if (error || !user) {
      // Redirect to login if not authenticated
      window.location.href = 'index.html'
      return
    }
    
    this.currentUser = user
    this.loadUserInfo()
    await this.loadStudents()
    this.updateStats()
  }

  loadUserInfo() {
    const userName = this.currentUser?.user_metadata?.full_name || 'Teacher'
    const schoolName = this.currentUser?.user_metadata?.school_name || 'School'
    
    document.getElementById('user-name').textContent = userName
    document.getElementById('user-school').textContent = schoolName
  }

  async loadStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', this.currentUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading students:', error)
        this.showMessage('Error loading students', 'error')
        return
      }

      this.students = data || []
      this.renderStudents()
    } catch (error) {
      console.error('Error loading students:', error)
      this.showMessage('Error loading students', 'error')
    }
  }

  async saveStudent(studentData) {
    try {
      const dataToSave = {
        ...studentData,
        teacher_id: this.currentUser.id
      }

      let result
      if (studentData.id) {
        // Update existing student
        result = await supabase
          .from('students')
          .update(dataToSave)
          .eq('id', studentData.id)
          .eq('teacher_id', this.currentUser.id)
          .select()
      } else {
        // Create new student
        delete dataToSave.id // Remove id for new records
        result = await supabase
          .from('students')
          .insert([dataToSave])
          .select()
      }

      if (result.error) {
        throw result.error
      }

      await this.loadStudents()
      this.updateStats()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error saving student:', error)
      return { success: false, error }
    }
  }

  async deleteStudent(studentId) {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('teacher_id', this.currentUser.id)

      if (error) {
        throw error
      }

      await this.loadStudents()
      this.updateStats()
      return { success: true }
    } catch (error) {
      console.error('Error deleting student:', error)
      return { success: false, error }
    }
  }

  renderStudents() {
    const content = document.getElementById('students-content')
    
    if (this.students.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-user-graduate"></i>
          <h3>No students yet</h3>
          <p>Add your first student to get started</p>
        </div>
      `
      return
    }

    const tableHTML = `
      <table class="students-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Grade</th>
            <th>Subject</th>
            <th>Parent/Guardian</th>
            <th>Contact</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.students.map(student => `
            <tr>
              <td>
                <div class="student-info">
                  <div class="student-avatar">
                    ${student.name.charAt(0).toUpperCase()}
                  </div>
                  <div class="student-details">
                    <h4>${student.name}</h4>
                    <p>${student.email}</p>
                  </div>
                </div>
              </td>
              <td>${student.grade}</td>
              <td>${student.subject || '--'}</td>
              <td>${student.parent || '--'}</td>
              <td>${student.phone || '--'}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-small btn-secondary" onclick="dashboardManager.editStudent('${student.id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-small btn-danger" onclick="dashboardManager.confirmDeleteStudent('${student.id}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    
    content.innerHTML = tableHTML
  }

  updateStats() {
    document.getElementById('total-students').textContent = this.students.length
    
    const uniqueGrades = new Set(this.students.map(s => s.grade))
    document.getElementById('active-classes').textContent = uniqueGrades.size
    
    // Placeholder values - in a real app, these would come from your database
    document.getElementById('total-assignments').textContent = Math.floor(Math.random() * 20) + 5
    document.getElementById('average-grade').textContent = 'B+'
  }

  editStudent(studentId) {
    const student = this.students.find(s => s.id === studentId)
    if (!student) return

    window.editingStudentId = studentId
    document.getElementById('modal-title').textContent = 'Edit Student'
    document.getElementById('save-btn').textContent = 'Update Student'
    
    // Populate form
    document.getElementById('student-id').value = student.id
    document.getElementById('student-name').value = student.name
    document.getElementById('student-email').value = student.email
    document.getElementById('student-grade').value = student.grade
    document.getElementById('student-subject').value = student.subject || ''
    document.getElementById('student-parent').value = student.parent || ''
    document.getElementById('student-phone').value = student.phone || ''
    document.getElementById('student-notes').value = student.notes || ''
    
    document.getElementById('student-modal').classList.add('active')
  }

  async confirmDeleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
      const result = await this.deleteStudent(studentId)
      if (result.success) {
        this.showMessage('Student deleted successfully', 'success')
      } else {
        this.showMessage('Error deleting student', 'error')
      }
    }
  }

  async handleStudentForm(formData) {
    const result = await this.saveStudent(formData)
    
    if (result.success) {
      const message = formData.id ? 'Student updated successfully' : 'Student added successfully'
      this.showMessage(message, 'success')
      this.closeModal()
    } else {
      this.showMessage('Error saving student', 'error')
    }
  }

  closeModal() {
    document.getElementById('student-modal').classList.remove('active')
  }

  async handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      try {
        const { error } = await signOut()
        if (error) {
          throw error
        }
        
        this.showMessage('Logging out...', 'info')
        setTimeout(() => {
          window.location.href = 'index.html'
        }, 1000)
      } catch (error) {
        console.error('Logout error:', error)
        this.showMessage('Error logging out', 'error')
      }
    }
  }

  showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessage = document.querySelector('.dashboard-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    // Create new message
    const messageDiv = document.createElement('div')
    messageDiv.className = `dashboard-message ${type}`
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
      z-index: 1001;
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
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove()
      }
    }, 3000)
  }
}

// Create global dashboard manager instance
window.dashboardManager = new DashboardManager()

// Global functions for HTML onclick handlers
window.openAddStudentModal = function() {
  window.editingStudentId = null
  document.getElementById('modal-title').textContent = 'Add New Student'
  document.getElementById('save-btn').textContent = 'Save Student'
  document.getElementById('student-form').reset()
  document.getElementById('student-modal').classList.add('active')
}

window.closeModal = function() {
  window.dashboardManager.closeModal()
}

window.handleLogout = function() {
  window.dashboardManager.handleLogout()
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
  const studentForm = document.getElementById('student-form')
  if (studentForm) {
    studentForm.addEventListener('submit', async function(e) {
      e.preventDefault()
      
      const formData = {
        id: window.editingStudentId || null,
        name: document.getElementById('student-name').value,
        email: document.getElementById('student-email').value,
        grade: document.getElementById('student-grade').value,
        subject: document.getElementById('student-subject').value,
        parent: document.getElementById('student-parent').value,
        phone: document.getElementById('student-phone').value,
        notes: document.getElementById('student-notes').value
      }

      await window.dashboardManager.handleStudentForm(formData)
    })
  }

  // Close modal when clicking outside
  const modal = document.getElementById('student-modal')
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        window.closeModal()
      }
    })
  }
})