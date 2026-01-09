import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Home, ShoppingCart, BarChart3, Building2, DollarSign, LogOut, ChevronLeft, ChevronRight, Users } from 'lucide-react'

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  const adminMenuItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { to: '/admin/supermarkets', label: 'Supermercados', icon: <Building2 size={18} /> },
    { to: '/admin/finance', label: 'Financeiro', icon: <DollarSign size={18} /> }
  ]

  const clientMenuItems = [
    { to: '/pedidos', label: 'Pedidos', icon: <ShoppingCart size={18} /> },
    { to: '/clientes', label: 'Clientes', icon: <Users size={18} /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> }
  ]

  const items = user?.role === 'admin' ? adminMenuItems : clientMenuItems

  return (
    <aside
      // CORRIGIDO: h-full (para layout fixo)
      className={`bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 
                  ${isCollapsed ? 'w-20' : 'w-64'} h-full flex flex-col transition-all duration-300`}
    >
      {/* Header da Sidebar */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2">
          <img
            src="/logo-aimerc.png"
            alt="Aimerc"
            className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'h-12'}`}
          />
        </div>

        {/* Ícone de Chevron */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-full text-gray-500 dark:text-gray-300 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          aria-label="Alternar largura da sidebar"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Usuário */}
      {/* CORRIGIDO: Padding vertical aumentado (py-5) para "baixar" a linha e alinhar com o Header */}
      <div className="px-4 py-5 border-b border-gray-200 dark:border-dark-700">
        <div className="truncate text-sm font-medium text-gray-600 dark:text-gray-300">
          {user?.nome || user?.email || 'admin@admin.com'}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-all duration-200 ${isActive
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-blue-500'
              }`
            }
          >
            {item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé / Logout */}
      <div className="p-3 mt-auto border-t border-gray-200 dark:border-dark-700">
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md 
                     text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 
                     hover:text-red-600 dark:hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
