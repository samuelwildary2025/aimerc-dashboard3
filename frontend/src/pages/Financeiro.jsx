import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { getSupermarkets, getFinanceiro, gerarFatura } from '../services/api'

export default function Financeiro({ user, onLogout }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [financeItem, setFinanceItem] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSupermarkets()
        setClientes(res.data || [])
      } catch (e) {
        console.error('Erro ao carregar clientes para financeiro', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const kpis = useMemo(() => {
    const total = clientes.length
    const ativos = clientes.filter(c => (c.status ?? (c.ativo ? 'Ativo' : 'Inativo')) === 'Ativo').length
    const inativos = total - ativos
    const faturamentoMensal = clientes.reduce((sum, c) => {
      const valor = c?.valor_mensal != null ? Number(c.valor_mensal) : Number(c.monthly_value)
      return sum + (isNaN(valor) ? 0 : valor)
    }, 0)
    return { total, ativos, inativos, faturamentoMensal }
  }, [clientes])

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

  const openFinance = async (cliente) => {
    setFinanceItem({ ...cliente, invoices: [], loading: true })
    try {
      const res = await getFinanceiro(cliente.tenant_id || cliente.id)
      setFinanceItem(prev => ({ ...prev, invoices: (res.data?.invoices || []), loading: false }))
    } catch (e) {
      console.error('Erro ao carregar financeiro do cliente', e)
      setFinanceItem(prev => ({ ...prev, loading: false }))
    }
  }

  const handleGerarFatura = async () => {
    if (!financeItem) return
    try {
      await gerarFatura(financeItem.tenant_id || financeItem.id)
      const res = await getFinanceiro(financeItem.tenant_id || financeItem.id)
      setFinanceItem(prev => ({ ...prev, invoices: (res.data?.invoices || []) }))
    } catch (e) {
      console.error('Erro ao gerar fatura', e)
      alert('Erro ao gerar fatura')
    }
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header title="Financeiro" subtitle="Acompanhe KPIs de cobrança e receita" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Total de Clientes</p>
                <p className="text-2xl font-bold text-white">{kpis.total}</p>
              </div>
              <span className="text-blue-400">📊</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Ativos</p>
                <p className="text-2xl font-bold text-green-400">{kpis.ativos}</p>
              </div>
              <span className="text-green-400">✅</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Inativos</p>
                <p className="text-2xl font-bold text-red-400">{kpis.inativos}</p>
              </div>
              <span className="text-red-400">⛔</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Faturamento Mensal</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(kpis.faturamentoMensal)}</p>
              </div>
              <span className="text-emerald-400">💵</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Clientes</h3>
          {loading ? (
            <div className="text-dark-400">Carregando...</div>
          ) : clientes.length === 0 ? (
            <div className="text-dark-400">Nenhum cliente encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700 text-left">
                    <th className="py-3 px-4 text-dark-300">Nome</th>
                    <th className="py-3 px-4 text-dark-300">Plano</th>
                    <th className="py-3 px-4 text-dark-300">Valor mensal</th>
                    <th className="py-3 px-4 text-dark-300">Status</th>
                    <th className="py-3 px-4 text-dark-300">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id} className="border-b border-dark-800">
                      <td className="py-3 px-4 text-white">{c.name || c.nome}</td>
                      <td className="py-3 px-4 text-dark-300">{c.plan || c.plano}</td>
                      <td className="py-3 px-4 text-emerald-400">{formatCurrency(c?.valor_mensal ?? c?.monthly_value)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${((c.status ?? (c.ativo ? 'Ativo' : 'Inativo')) === 'Ativo') ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                          {c.status ?? (c.ativo ? 'Ativo' : 'Inativo')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => openFinance(c)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm">Ver Financeiro</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Financeiro por Cliente */}
      {financeItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-lg w-full max-w-3xl">
            <div className="flex items-center justify-between border-b border-dark-700 p-4">
              <h3 className="text-lg font-semibold text-white">Financeiro - {(financeItem.name || financeItem.nome)}</h3>
              <button onClick={() => setFinanceItem(null)} className="text-dark-300">✖</button>
            </div>

            <div className="p-4 space-y-4">
              {financeItem.loading ? (
                <div className="text-dark-400">Carregando...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-dark-700 p-4 rounded">
                      <div className="text-dark-400 text-sm">Valor Mensal</div>
                      <div className="text-xl font-semibold text-emerald-400">{formatCurrency(financeItem?.valor_mensal ?? financeItem?.monthly_value)}</div>
                    </div>
                    <div className="bg-dark-700 p-4 rounded">
                      <div className="text-dark-400 text-sm">Plano</div>
                      <div className="text-xl font-semibold text-white">{financeItem.plan || financeItem.plano}</div>
                    </div>
                    <div className="bg-dark-700 p-4 rounded">
                      <div className="text-dark-400 text-sm">Status</div>
                      <div className="text-xl font-semibold text-white">{financeItem.status ?? (financeItem.ativo ? 'Ativo' : 'Inativo')}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded border border-dark-700">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-dark-300 text-xs">
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Valor</th>
                          <th className="px-3 py-2">Mês</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Vencimento</th>
                          <th className="px-3 py-2">Pagamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(financeItem.invoices || []).map(inv => (
                          <tr key={inv.id} className="border-t border-dark-700">
                            <td className="px-3 py-2">{inv.id}</td>
                            <td className="px-3 py-2 text-emerald-400">{formatCurrency(inv.valor)}</td>
                            <td className="px-3 py-2">{inv.mes_referencia}</td>
                            <td className="px-3 py-2">{inv.status}</td>
                            <td className="px-3 py-2">{inv.data_vencimento ? new Date(inv.data_vencimento).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="px-3 py-2">{inv.data_pagamento ? new Date(inv.data_pagamento).toLocaleDateString('pt-BR') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-dark-700 p-4">
              <button onClick={handleGerarFatura} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded">Gerar fatura</button>
              <button onClick={() => setFinanceItem(null)} className="px-3 py-2 bg-dark-700 rounded">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}