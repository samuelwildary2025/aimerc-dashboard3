import { Bell, Search, Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

const Header = ({ title, subtitle }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-dark-800/80
                 border-b border-gray-200 dark:border-dark-700 shadow-sm transition-all duration-300"
    >
      <div className="flex justify-between items-center px-6 py-4">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-dark-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center space-x-4">
          {/* Campo de busca */}
          <div className="relative group">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-400 transition-colors"
            />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-9 w-64 bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-100
                         border border-gray-300 dark:border-dark-600 rounded-lg py-2
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         placeholder:text-gray-400 dark:placeholder:text-gray-500
                         transition-all duration-300"
            />
          </div>

          {/* Botão de alternância de tema */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-200
                       hover:bg-gray-300 dark:hover:bg-dark-600 shadow-sm transition-all duration-300
                       active:scale-95"
            title={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notificações */}
          <button
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700
                       text-gray-500 dark:text-gray-300 transition-all duration-300"
            title="Notificações"
          >
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
