import { useState } from 'react'
import { login } from '../services/api'
import { ShoppingCart, Mail, Lock, AlertCircle } from 'lucide-react'

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  // Novos estados para rastrear o foco
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Sending login data:', formData) // Debug log
      const response = await login(formData)
      console.log('Login response:', response.data) // Debug log
      onLogin(response.data, rememberMe)
    } catch (err) {
      console.error('Login error:', err) // Debug log
      const detail = err?.response?.data?.detail
      let message = 'Erro ao fazer login'
      if (typeof detail === 'string') {
        message = detail
      } else if (Array.isArray(detail)) {
        message = detail.map(d => d?.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join('; ')
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || JSON.stringify(detail)
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Condições para mostrar os ícones (apenas se não focado E vazio)
  const showEmailIcon = !isEmailFocused && formData.email.length === 0;
  const showPasswordIcon = !isPasswordFocused && formData.password.length === 0;

  return (
    // Fundo da página responsivo
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo-aimerc.png"
            alt="Aimerc"
            className="h-32 mx-auto mb-4 object-contain"
          />
        </div>

        {/* Form */}
        {/* Adicionado padding p-6 para espaçamento interno */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 rounded-lg">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                <span className="text-red-800 dark:text-red-400 text-sm">{String(error)}</span>
              </div>
            )}

            <div>
              {/* Cor do Label */}
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                Email
              </label>
              <div className="relative">
                {/* CORRIGIDO: Ícone só aparece se o campo não estiver focado E estiver vazio */}
                {showEmailIcon && (
                  <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                )}
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  // CORRIGIDO: Padding aplicado nas mesmas condições do ícone E placeholder removido
                  className={`input w-full ${showEmailIcon ? 'pl-10' : ''}`}
                  required
                />
              </div>
            </div>

            <div>
              {/* Cor do Label */}
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                Senha
              </label>
              <div className="relative">
                {/* CORRIGIDO: Ícone só aparece se o campo não estiver focado E estiver vazio */}
                {showPasswordIcon && (
                  <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                )}
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  // CORRIGIDO: Padding aplicado nas mesmas condições do ícone E placeholder removido
                  className={`input w-full ${showPasswordIcon ? 'pl-10' : ''}`}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="rememberMe" className="flex items-center cursor-pointer select-none">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  // Checkbox visível no modo claro
                  className="h-4 w-4 text-blue-600 bg-white border-gray-400 rounded focus:ring-blue-500 dark:bg-dark-800 dark:border-dark-600"
                />
                {/* Cor do texto da opção */}
                <span className="ml-2 text-sm text-gray-700 dark:text-dark-300">Manter conectado</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              // Alterado para usar a classe `button`
              className="button w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Demo Credentials */}
          {/* Fundo e texto responsivos */}
          <div className="mt-6 p-4 bg-gray-100 dark:bg-dark-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Credenciais de Teste:</h3>
            <div className="text-xs text-gray-600 dark:text-dark-300 space-y-1">
              <p><strong>Admin:</strong> admin@admin.com / admin123</p>
              <p><strong>Cliente:</strong> Crie um supermercado primeiro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
