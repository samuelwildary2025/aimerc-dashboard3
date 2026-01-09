import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { getClients } from '../services/api'
import { Users, Phone, MapPin, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'

const Clientes = () => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    setLoading(true)
    try {
      const response = await getClients()
      const data = response?.data ?? response
      setClientes(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
      setError('Não foi possível carregar a lista de clientes.')
    } finally {
      setLoading(false)
    }
  }

  const filteredClientes = useMemo(() => {
    if (!search.trim()) return clientes
    const term = search.toLowerCase()
    return clientes.filter((cliente) => {
      const nome = (cliente?.nome ?? '').toLowerCase()
      const telefone = (cliente?.telefone ?? '').toLowerCase()
      const endereco = (cliente?.endereco ?? '').toLowerCase()
      return nome.includes(term) || telefone.includes(term) || endereco.includes(term)
    })
  }, [clientes, search])

  const getEmailLabel = (email) => {
    if (!email) return null
    if (email.endsWith('@contatos.supermercado')) return null
    return email
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600 dark:text-dark-300">
          <Loader2 className="animate-spin mb-4" size={32} />
          <span>Carregando clientes...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-3 text-red-500" size={32} />
          <p className="text-gray-700 dark:text-dark-200 mb-4">{error}</p>
          <button onClick={loadClientes} className="button">
            Tentar novamente
          </button>
        </div>
      )
    }

    if (filteredClientes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600 dark:text-dark-300">
          <Users className="mb-3" size={32} />
          <span>Nenhum cliente encontrado para os filtros informados.</span>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-700 text-left text-gray-500 dark:text-dark-300 uppercase tracking-wide text-xs">
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Telefone</th>
              <th className="py-3 px-4">Endereço</th>
              <th className="py-3 px-4">Pedidos realizados</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.map((cliente) => (
              <tr key={cliente.id} className="border-b border-gray-100 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="text-gray-900 dark:text-white font-medium">{cliente.nome}</span>
                    <span className="text-xs text-gray-500 dark:text-dark-300">
                      
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-dark-200">
                    <Phone size={16} />
                    <span>{cliente.telefone || '—'}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
                    <MapPin size={16} className="mt-0.5" />
                    <div className="flex flex-col">
                      <span>{cliente.endereco || 'Não informado'}</span>
                      {cliente.bairro && (
                        <span className="text-xs text-gray-500 dark:text-dark-300">
                          {cliente.bairro}{cliente.cidade ? ` • ${cliente.cidade}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold">{cliente.total_pedidos ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <Header
        title="Clientes"
        subtitle="Acompanhe os contatos que chegam pelos pedidos"
      />

      <div className="p-6 space-y-6">
        <div className="card p-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-dark-300">Clientes únicos</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{clientes.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone ou endereço"
              className="input w-64"
            />
            <button onClick={loadClientes} className="button-outline flex items-center gap-2">
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="card p-0">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default Clientes
