import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AdminLayout({ user, onLogout }) {
  return (
    // CORRIGIDO: Trocado min-h-screen por h-screen e adicionado overflow-hidden
    <div className="layout flex h-screen overflow-hidden transition-colors duration-500">
      {/* Sidebar (agora fixo na altura da tela) */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Conteúdo principal */}
      {/* CORRIGIDO: Adicionado overflow-y-auto para permitir rolagem interna */}
      <div className="flex-1 bg-gray-50 text-gray-900 dark:bg-dark-900 dark:text-gray-100 transition-colors duration-500 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
