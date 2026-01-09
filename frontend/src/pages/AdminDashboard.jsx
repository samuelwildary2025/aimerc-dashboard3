import { useState, useEffect } from 'react'
import { getSupermarkets, getPedidos } from '../services/api'
import Header from '../components/Header'
import { Users, Store, ShoppingBag, TrendingUp, DollarSign, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const AdminDashboard = () => {
  const [supermarkets, setSupermarkets] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [periodFilter, setPeriodFilter] = useState('hoje') // 'hoje', 'semana', 'mes', 'todos'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('Loading admin dashboard data...') // Debug log
      const [supermarketsResponse, pedidosResponse] = await Promise.all([
        getSupermarkets(),
        getPedidos()
      ])

      console.log('Supermarkets response:', supermarketsResponse) // Debug log
      console.log('Pedidos response:', pedidosResponse) // Debug log

      // Garantir que sempre temos arrays
      const supermarketsData = Array.isArray(supermarketsResponse?.data) ? supermarketsResponse.data : []
      const pedidosData = Array.isArray(pedidosResponse?.data) ? pedidosResponse.data : []

      setSupermarkets(supermarketsData)
      setPedidos(pedidosData)
      setError('')
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setError('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  // Helper para obter nome seguro
  const getDisplayName = (supermarket) => {
    const raw = supermarket?.nome ?? supermarket?.name ?? 'Sem nome'
    return typeof raw === 'string' ? raw : String(raw || 'Sem nome')
  }

  // Verificações de segurança para evitar erros
  const safeSupermarkets = Array.isArray(supermarkets) ? supermarkets : []
  const safePedidos = Array.isArray(pedidos) ? pedidos : []

  // Filtra pedidos por período
  const getFilteredPedidosByPeriod = () => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return safePedidos.filter(pedido => {
      const dateField = pedido.data_pedido || pedido.created_at || new Date().toISOString()
      const pedidoDate = new Date(dateField)

      switch (periodFilter) {
        case 'hoje':
          return pedidoDate >= todayStart
        case 'semana':
          const weekStart = new Date(todayStart)
          weekStart.setDate(weekStart.getDate() - 7)
          return pedidoDate >= weekStart
        case 'mes':
          const monthStart = new Date(todayStart)
          monthStart.setDate(monthStart.getDate() - 30)
          return pedidoDate >= monthStart
        case 'todos':
        default:
          return true
      }
    })
  }

  const filteredPedidos = getFilteredPedidosByPeriod()

  // Estatísticas por supermercado com base no período filtrado
  const getSupermarketStats = () => {
    return safeSupermarkets.map(supermarket => {
      const supermarketPedidos = filteredPedidos.filter(p =>
        p.tenant_id === supermarket.id || p.supermarket_id === supermarket.id
      )
      const revenue = supermarketPedidos.reduce((sum, p) => sum + (p.valor_total || p.total || 0), 0)

      return {
        id: supermarket.id,
        name: getDisplayName(supermarket),
        pedidos: supermarketPedidos.length,
        revenue: revenue,
        ativo: supermarket.ativo
      }
    }).sort((a, b) => b.pedidos - a.pedidos)
  }

  // Estatísticas gerais
  const stats = {
    totalSupermarkets: safeSupermarkets.length,
    activeSupermarkets: safeSupermarkets.filter(s => s.ativo || s.status === 'Ativo').length,
    totalPedidos: safePedidos.length,
    totalRevenue: safePedidos.reduce((sum, p) => sum + (p.valor_total || p.total || 0), 0),
    avgOrderValue: safePedidos.length > 0
      ? safePedidos.reduce((sum, p) => sum + (p.valor_total || p.total || 0), 0) / safePedidos.length
      : 0
  }

  // Dados para gráficos
  const getSupermarketData = () => {
    return safeSupermarkets.map(supermarket => {
      const supermarketPedidos = safePedidos.filter(p =>
        p.tenant_id === supermarket.id || p.supermarket_id === supermarket.id
      )
      const revenue = supermarketPedidos.reduce((sum, p) => sum + (p.valor_total || p.total || 0), 0)

      const nameRaw = getDisplayName(supermarket)
      const name = nameRaw.length > 15 ? nameRaw.substring(0, 15) + '...' : nameRaw

      return {
        name,
        pedidos: supermarketPedidos.length,
        revenue: revenue
      }
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }

  const getMonthlyData = () => {
    const monthlyData = {}

    safePedidos.forEach(pedido => {
      const dateField = pedido.data_pedido || pedido.created_at || new Date().toISOString()
      const date = new Date(dateField)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          revenue: 0,
          pedidos: 0
        }
      }

      monthlyData[monthKey].revenue += (pedido.valor_total || pedido.total || 0)
      monthlyData[monthKey].pedidos += 1
    })

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
  }

  const getRecentSupermarkets = () => {
    return safeSupermarkets
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-white">Carregando dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={loadData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header
        title="Dashboard Administrativo"
        subtitle="Visão geral de todos os supermercados e pedidos"
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Adicionando p-4 para espaçamento interno e text-center/flex-col para alinhamento */}
          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <Store className="text-blue-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Total Supermercados</p>
              <p className="text-2xl font-bold text-white dark:text-white">{stats.totalSupermarkets}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <Activity className="text-green-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Ativos</p>
              <p className="text-2xl font-bold text-green-400 dark:text-green-400">{stats.activeSupermarkets}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <ShoppingBag className="text-purple-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Total Pedidos</p>
              <p className="text-2xl font-bold text-purple-400 dark:text-purple-400">{stats.totalPedidos}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <DollarSign className="text-green-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Receita Total</p>
              <p className="text-2xl font-bold text-green-400 dark:text-green-400">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <TrendingUp className="text-yellow-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Ticket Médio</p>
              <p className="text-2xl font-bold text-yellow-400 dark:text-yellow-400">{formatCurrency(stats.avgOrderValue)}</p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue por Supermercado */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-white dark:text-white mb-4">Top Supermercados por Receita</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getSupermarketData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  // Adicionado para modo claro
                  className="text-dark-900 dark:text-gray-100"
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Receita' : 'Pedidos'
                  ]}
                />
                <Bar dataKey="revenue" fill="#22C55E" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Evolução Mensal */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-white dark:text-white mb-4">Evolução Mensal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Receita' : 'Pedidos'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="pedidos"
                  stroke="#EAB308"
                  strokeWidth={2}
                  dot={{ fill: '#EAB308', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Supermarkets */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white dark:text-white mb-4">Supermercados Recentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  {/* Adicionado padding para centralizar colunas */}
                  <th className="text-left py-3 px-4 text-dark-300">Nome</th>
                  <th className="text-left py-3 px-4 text-dark-300">Email</th>
                  <th className="text-left py-3 px-4 text-dark-300">Telefone</th>
                  <th className="text-left py-3 px-4 text-dark-300">Plano</th>
                  <th className="text-left py-3 px-4 text-dark-300">Status</th>
                  <th className="text-left py-3 px-4 text-dark-300">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {getRecentSupermarkets().map((supermarket) => (
                  <tr key={supermarket.id} className="border-b border-dark-800 hover:bg-dark-700">
                    <td className="py-3 px-4 text-white dark:text-white font-medium">{getDisplayName(supermarket)}</td>
                    <td className="py-3 px-4 text-dark-300">{supermarket.email || supermarket?.email}</td>
                    <td className="py-3 px-4 text-dark-300">{supermarket.telefone || supermarket.phone || ''}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        {supermarket.plano || supermarket.plan || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${supermarket.ativo
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                        }`}>
                        {supermarket.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-dark-300">
                      {new Date(supermarket.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pedidos por Supermercado com Filtro de Período */}
        <div className="card p-4 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-white dark:text-white">
              📊 Pedidos por Supermercado
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-300">Período:</span>
              <div className="flex gap-1">
                {[
                  { key: 'hoje', label: 'Hoje' },
                  { key: 'semana', label: 'Semana' },
                  { key: 'mes', label: 'Mês' },
                  { key: 'todos', label: 'Todos' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPeriodFilter(key)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${periodFilter === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resumo do período */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-dark-700/50 rounded-lg p-3 text-center">
              <p className="text-dark-400 text-xs">Total Pedidos</p>
              <p className="text-xl font-bold text-purple-400">{filteredPedidos.length}</p>
            </div>
            <div className="bg-dark-700/50 rounded-lg p-3 text-center">
              <p className="text-dark-400 text-xs">Receita no Período</p>
              <p className="text-xl font-bold text-green-400">
                {formatCurrency(filteredPedidos.reduce((sum, p) => sum + (p.valor_total || p.total || 0), 0))}
              </p>
            </div>
            <div className="bg-dark-700/50 rounded-lg p-3 text-center">
              <p className="text-dark-400 text-xs">Supermercados Ativos</p>
              <p className="text-xl font-bold text-blue-400">
                {getSupermarketStats().filter(s => s.pedidos > 0).length}
              </p>
            </div>
            <div className="bg-dark-700/50 rounded-lg p-3 text-center">
              <p className="text-dark-400 text-xs">Ticket Médio</p>
              <p className="text-xl font-bold text-yellow-400">
                {formatCurrency(filteredPedidos.length > 0
                  ? filteredPedidos.reduce((sum, p) => sum + (p.valor_total || p.total || 0), 0) / filteredPedidos.length
                  : 0)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-300">Supermercado</th>
                  <th className="text-center py-3 px-4 text-dark-300">Pedidos</th>
                  <th className="text-right py-3 px-4 text-dark-300">Receita</th>
                  <th className="text-center py-3 px-4 text-dark-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {getSupermarketStats().length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-dark-400">
                      Nenhum supermercado cadastrado
                    </td>
                  </tr>
                ) : (
                  getSupermarketStats().map((supermarket) => (
                    <tr key={supermarket.id} className="border-b border-dark-800 hover:bg-dark-700">
                      <td className="py-3 px-4 text-white dark:text-white font-medium">
                        {supermarket.name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${supermarket.pedidos > 0
                            ? 'bg-purple-600/20 text-purple-400'
                            : 'bg-dark-700 text-dark-400'
                          }`}>
                          {supermarket.pedidos}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${supermarket.revenue > 0 ? 'text-green-400' : 'text-dark-400'
                          }`}>
                          {formatCurrency(supermarket.revenue)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${supermarket.ativo
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                          }`}>
                          {supermarket.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
