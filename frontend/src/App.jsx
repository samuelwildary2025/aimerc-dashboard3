import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import PainelPedidos from './pages/PainelPedidos'
import Analytics from './pages/Analytics'
import Clientes from './pages/Clientes'
import AdminDashboard from './pages/AdminDashboard'
import Supermarkets from './pages/Supermarkets'
import AdminLayout from './components/AdminLayout'
import Financeiro from './pages/Financeiro'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token')) || localStorage.getItem('token')
    const userData = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user')) || localStorage.getItem('user')
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (err) {
        try { sessionStorage.removeItem('token'); sessionStorage.removeItem('user') } catch {}
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setError('Dados de usuário corrompidos. Faça login novamente.')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData, rememberMe = false) => {
    setUser(userData.user)
    const storage = rememberMe ? localStorage : sessionStorage
    const otherStorage = rememberMe ? sessionStorage : localStorage
    storage.setItem('token', userData.access_token)
    storage.setItem('user', JSON.stringify(userData.user))
    try { otherStorage.removeItem('token'); otherStorage.removeItem('user') } catch {}
    setError('')
  }

  const handleLogout = () => {
    setUser(null)
    try { sessionStorage.removeItem('token'); sessionStorage.removeItem('user') } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-gray-900">Carregando...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => {
              setError('')
              window.location.reload()
            }}
            className="btn-primary"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? (
                (() => {
                  const redirectPath = user.role === 'admin' ? '/admin/dashboard' : 
                                     user.role === 'supermarket' ? '/pedidos' : '/pedidos'
                  return <Navigate to={redirectPath} replace />
                })()
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />

          {/* Rotas do Admin com layout compartilhado */}
          <Route 
            path="/admin" 
            element={
              user && user.role === 'admin' ? (
                <AdminLayout user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route index element={<AdminDashboard user={user} onLogout={handleLogout} />} />
            <Route path="dashboard" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
            <Route path="supermarkets" element={<Supermarkets user={user} onLogout={handleLogout} />} />
            <Route path="finance" element={<Financeiro user={user} onLogout={handleLogout} />} />
          </Route>

          {/* Rotas do Supermercado com Sidebar */}
          <Route 
            path="/" 
            element={
              user && (user.role === 'cliente' || user.role === 'supermarket') ? (
                <AdminLayout user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route index element={<Navigate to="/pedidos" replace />} />
            <Route path="pedidos" element={<PainelPedidos user={user} onLogout={handleLogout} />} />
            <Route path="clientes" element={<Clientes user={user} onLogout={handleLogout} />} />
            <Route path="analytics" element={<Analytics user={user} onLogout={handleLogout} />} />
          </Route>

          {/* Removidas rotas duplicadas de /pedidos e /analytics no topo */}
          {/* Rota padrão removida, pois o índice do layout do cliente já redireciona */}
        </Routes>
      </div>
    </Router>
  )
}

export default App
