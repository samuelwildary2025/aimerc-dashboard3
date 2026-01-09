import { useState, useEffect, useMemo, useRef } from 'react'
import { getPedidos, updatePedido, getSupermarket } from '../services/api'
import axios from 'axios'
import Header from '../components/Header'
import PedidoCard from '../components/PedidoCard'
import {
  Plus, TrendingUp, Clock, CheckCircle, DollarSign, X, Phone, MapPin,
  CreditCard, MessageSquare, Calendar, Check, Printer, ChevronLeft, ChevronRight, Save,
  Package, Truck
} from 'lucide-react'

const PainelPedidos = () => {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    separados: 0,
    entregues: 0,
    valorTotal: 0
  })
  const [selectedPedido, setSelectedPedido] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [editObservacao, setEditObservacao] = useState('')
  const [concluidosPage, setConcluidosPage] = useState(0)
  const CONCLUIDOS_PAGE_SIZE = 15
  const todayKey = useMemo(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()), [])
  const [concluidosDateFilter, setConcluidosDateFilter] = useState(todayKey)
  const datePickerRef = useRef(null)

  // Snapshot anterior para detectar alterações vindas de PUT externos
  const previousSnapshotRef = useRef(new Map())
  // Mantém destaque "alterado" de forma persistente até faturar
  const stickyAlteredIdsRef = useRef(new Set())
  // Rastreia IDs que mudaram nesta atualização para autoabrir modal uma vez
  const recentlyChangedIdsRef = useRef(new Set())
  const autoOpenDoneRef = useRef(new Set())
  const [whatsappToken, setWhatsappToken] = useState(null)

  // Obtém supermarketId do usuário logado (se houver)
  const getSupermarketId = () => {
    try {
      const raw = localStorage.getItem('user')
      const user = raw ? JSON.parse(raw) : null
      return user?.supermarket_id || null
    } catch (e) {
      return null
    }
  }

  // ===== Persistência do destaque "alterado" entre reloads =====
  const stickyStorageKey = (supermarketId) => `stickyAlteredIds:${supermarketId ?? 'global'}`
  const loadStickyFromStorage = (supermarketId) => {
    try {
      const raw = localStorage.getItem(stickyStorageKey(supermarketId))
      const arr = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(arr) ? arr : [])
    } catch {
      return new Set()
    }
  }
  const saveStickyToStorage = (supermarketId, set) => {
    try {
      const arr = Array.from(set || [])
      localStorage.setItem(stickyStorageKey(supermarketId), JSON.stringify(arr))
    } catch {
      // ignore
    }
  }

  // Carrega os IDs persistidos uma única vez ao montar
  useEffect(() => {
    const smId = getSupermarketId()
    stickyAlteredIdsRef.current = loadStickyFromStorage(smId)
  }, [])

  useEffect(() => {
    loadPedidos()
    loadSupermarketData()
  }, [])

  const loadSupermarketData = async () => {
    try {
      const smId = getSupermarketId()
      if (smId) {
        const response = await getSupermarket(smId)
        if (response.data && response.data.whatsapp_instance_token) {
          setWhatsappToken(response.data.whatsapp_instance_token)
          console.log('✅ Token WhatsApp carregado:', response.data.whatsapp_instance_token)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do supermercado:', error)
    }
  }

  // Atualização automática (polling) para refletir novos pedidos sem recarregar
  const refreshPedidos = async () => {
    try {
      const supermarketId = getSupermarketId()
      const response = await getPedidos(null, supermarketId)
      // Marca automaticamente pedidos alterados (server-side via foi_alterado ou diff local)
      setPedidos(applyAlteredFlagFromChanges(response.data))
    } catch (error) {
      console.error('Erro ao atualizar pedidos:', error)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      refreshPedidos()
    }, 4000) // atualiza a cada 4s
    return () => clearInterval(interval)
  }, [])

  // Sincroniza o pedido selecionado quando a lista é atualizada
  useEffect(() => {
    if (selectedPedido) {
      const atual = pedidos.find(p => p.id === selectedPedido.id)
      // Só atualiza se não estiver editando para evitar overwrite do input
      // Mas idealmente queremos ver novos itens. Como é edição local, vamos manter o local se estiver editando.
      // Para simplificar, atualizamos apenas se status mudou ou se não houve alteração local pendente de salvar
      if (atual && !selectedPedido.foi_alterado) {
        // setSelectedPedido(atual) // Desativado para não perder edição em andamento
      }
    }
  }, [pedidos])

  useEffect(() => {
    calculateStats()
  }, [pedidos])

  const loadPedidos = async () => {
    try {
      const supermarketId = getSupermarketId()
      const response = await getPedidos(null, supermarketId)
      // Inicializa snapshot e aplica flag de alteração quando houver diffs
      setPedidos(applyAlteredFlagFromChanges(response.data))
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateKey = (date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)

  const getPedidoDate = (pedido) => {
    const raw = pedido?.data_pedido || pedido?.created_at || pedido?.updated_at
    if (!raw) return null
    const parsed = new Date(raw)
    return Number.isNaN(parsed.valueOf()) ? null : parsed
  }

  const getPedidoDateKey = (pedido) => {
    const date = getPedidoDate(pedido)
    return date ? formatDateKey(date) : null
  }

  const openDatePicker = () => {
    const input = datePickerRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.focus()
      input.click()
    }
  }

  // Helper para calcular total do pedido de forma robusta
  const orderTotal = (pedido) => {
    const itens = Array.isArray(pedido?.itens) ? pedido.itens : (Array.isArray(pedido?.items) ? pedido.items : [])
    return itens.reduce((sum, item) => {
      const rawPreco = (item?.preco_unitario ?? item?.unit_price ?? 0)
      const rawQtd = (item?.quantidade ?? item?.quantity ?? 0)
      const preco = typeof rawPreco === 'string' ? parseFloat(rawPreco.replace(',', '.')) : Number(rawPreco) || 0
      const qtd = typeof rawQtd === 'string' ? parseFloat(String(rawQtd).replace(',', '.')) : Number(rawQtd) || 0
      return sum + preco * qtd
    }, 0)
  }

  // Assinatura normalizada do pedido para detectar alterações relevantes
  // IMPORTANTE: NÃO incluir 'status' pois mudança de coluna não é alteração de conteúdo
  const makePedidoSignature = (p) => {
    const itensOrig = Array.isArray(p?.itens) ? p.itens : (Array.isArray(p?.items) ? p.items : [])
    const itensNorm = itensOrig.map((it) => ({
      name: it?.nome_produto ?? it?.product_name ?? '',
      qty: Number(it?.quantidade ?? it?.quantity ?? 0),
      price: Number(it?.preco_unitario ?? it?.unit_price ?? 0),
    }))
    // Ordena para garantir assinatura estável independente da ordem dos itens
    itensNorm.sort((a, b) => a.name.localeCompare(b.name))
    const total = (p?.valor_total ?? p?.total ?? itensNorm.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0))
    const obs = p?.observacao ?? p?.observacoes ?? ''
    // Inclui campos básicos que o usuário pode alterar no modal (exceto status)
    const nomeCliente = p?.cliente_nome ?? p?.nome_cliente ?? p?.client_name ?? ''
    const forma = p?.forma ?? p?.payment_method ?? ''
    const endereco = p?.endereco ?? p?.address ?? ''
    const telefone = p?.telefone ?? p?.phone ?? ''
    return JSON.stringify({ obs, nomeCliente, forma, endereco, telefone, itens: itensNorm, total })
  }

  // Aplica flag foi_alterado quando detecta diffs em relação ao snapshot anterior
  const applyAlteredFlagFromChanges = (data) => {
    const prevSig = previousSnapshotRef.current || new Map()
    const nextSig = new Map()
    const smId = getSupermarketId()
    // Garante que o sticky atual esteja sincronizado com o storage
    const persisted = loadStickyFromStorage(smId)
    const sticky = stickyAlteredIdsRef.current || new Set()
    if (sticky.size === 0 && persisted.size > 0) {
      stickyAlteredIdsRef.current = new Set(persisted)
    }
    const recently = new Set()
    const arr = Array.isArray(data) ? data : []

    const normalized = arr.map((p) => {
      const sig = makePedidoSignature(p)
      const changed = prevSig.has(p.id) && prevSig.get(p.id) !== sig
      const serverFlag = Boolean(p.foi_alterado)

      // Atualiza assinatura
      nextSig.set(p.id, sig)

      // Gerencia persistência de destaque
      if (['faturado', 'entregue'].includes(p.status)) {
        sticky.delete(p.id) // ao finalizar, limpa destaque
      } else if (changed || serverFlag) {
        sticky.add(p.id) // qualquer mudança marca para persistir
      }

      if (changed) {
        recently.add(p.id)
      }

      const shouldStick = sticky.has(p.id)
      return { ...p, foi_alterado: shouldStick || changed || serverFlag }
    })

    previousSnapshotRef.current = nextSig
    stickyAlteredIdsRef.current = sticky
    recentlyChangedIdsRef.current = recently
    // Persiste após aplicar
    saveStickyToStorage(smId, sticky)
    return normalized
  }

  // DESABILITADO: Auto-open do modal causava confusão ao mudar status entre colunas
  // O modal agora só abre quando o usuário clica no pedido
  // useEffect(() => {
  //   if (showDetails) return
  //   const recently = recentlyChangedIdsRef.current || new Set()
  //   const opened = autoOpenDoneRef.current || new Set()
  //   const targetId = Array.from(recently).find((id) => !opened.has(id))
  //   if (!targetId) return
  //   const target = pedidos.find((p) => p.id === targetId)
  //   if (target && !['faturado', 'entregue'].includes(target.status)) {
  //     openDetails(target)
  //     opened.add(targetId)
  //     autoOpenDoneRef.current = opened
  //   }
  // }, [pedidos, showDetails])

  const calculateStats = () => {
    const pedidosHoje = pedidos.filter((p) => getPedidoDateKey(p) === todayKey)
    const pendentesHoje = pedidosHoje.filter((p) => p.status === 'pendente')
    const separadosHoje = pedidosHoje.filter((p) => p.status === 'separado')
    const entreguesHoje = pedidosHoje.filter((p) => ['entregue', 'faturado'].includes(p.status))
    const valorTotal = entreguesHoje.reduce((sum, p) => sum + orderTotal(p), 0)

    setStats({
      total: pedidosHoje.length,
      pendentes: pendentesHoje.length,
      separados: separadosHoje.length,
      entregues: entreguesHoje.length,
      valorTotal,
    })
  }



  const handleStatusChange = async (pedidoId, newStatus) => {
    const current = pedidos.find(p => p.id === pedidoId)

    // Monta payload completo para o backend simples (evita perda de campos)
    const itensOrig = Array.isArray(current?.itens) ? current.itens : (Array.isArray(current?.items) ? current.items : [])
    const itensNorm = itensOrig.map((it) => ({
      id: it?.id,
      product_name: it?.nome_produto ?? it?.product_name ?? 'Item',
      quantity: it?.quantidade ?? it?.quantity ?? 0,
      unit_price: it?.preco_unitario ?? it?.unit_price ?? 0
    }))
    const totalNorm = itensNorm.reduce((sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0), 0)

    const payload = {
      client_name: current?.cliente_nome ?? current?.nome_cliente ?? current?.client_name ?? 'Cliente',
      total: totalNorm || current?.total || 0,
      status: newStatus ?? current?.status,
      created_at: current?.data_pedido ?? current?.created_at,
      items: itensNorm,
      telefone: current?.telefone ?? current?.phone ?? null,
      address: current?.endereco ?? current?.address ?? null,
      payment_method: current?.forma ?? current?.payment_method ?? null,
      observacoes: current?.observacao ?? current?.observacoes ?? null,
      supermarket_id: current?.supermarket_id ?? getSupermarketId() ?? 1
    }

    if (newStatus === 'faturado') {
      setConcluidosPage(0)
    }

    try {
      await updatePedido(pedidoId, payload)
      // Mudança de status NÃO é alteração de conteúdo, então foi_alterado = false
      setPedidos(pedidos.map(p =>
        p.id === pedidoId ? { ...p, status: newStatus, foi_alterado: false } : p
      ))
      // Remove do destaque ao mudar qualquer status (incluindo separado)
      const smId = getSupermarketId()
      const sticky = stickyAlteredIdsRef.current || new Set()
      sticky.delete(pedidoId)
      stickyAlteredIdsRef.current = sticky
      saveStickyToStorage(smId, sticky)

      // Envia notificação WhatsApp para o cliente (Frontend Direct Call)
      if (['separado', 'entregue'].includes(newStatus) && whatsappToken && current?.telefone) {
        sendDirectWhatsApp(current, newStatus, whatsappToken)
      }

      // Fecha o modal se estiver aberto e for o mesmo pedido
      if (selectedPedido && selectedPedido.id === pedidoId) {
        closeDetails()
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      setPedidos(pedidos.map(p =>
        p.id === pedidoId ? { ...p, status: newStatus, foi_alterado: false } : p
      ))
    }
  }

  const sendDirectWhatsApp = async (pedido, status, token) => {
    const telefone = pedido.telefone
    if (!telefone) return

    let msg = ''
    const numeroPedido = pedido.numero_pedido || pedido.id
    if (status === 'separado') {
      msg = `📦 Olá ${pedido.cliente_nome || pedido.nome_cliente || 'Cliente'}! Seu pedido #${numeroPedido} está sendo separado e logo estará pronto para entrega!`
    } else if (status === 'entregue') {
      msg = `🚚 Boa notícia ${pedido.cliente_nome || pedido.nome_cliente || 'Cliente'}! Seu pedido #${numeroPedido} saiu para entrega! Aguarde nosso entregador.`
    }

    if (!msg) return

    console.log('🚀 Tentando enviar mensagem via Frontend:', { telefone, token, msg })

    // Normalização básica do telefone (apenas números)
    const phoneDigits = telefone.replace(/\D/g, '')

    try {
      const response = await axios.post(
        'https://sistema-whatsapp-api.5mos1l.easypanel.host/message/text',
        {
          to: phoneDigits,
          text: msg
        },
        {
          headers: {
            'X-Instance-Token': token,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('✅ WhatsApp enviado com sucesso!', response.data)
      alert("Notificação WhatsApp enviada!")
    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp:', error)
      alert("Erro ao enviar notificação WhatsApp (ver console)")
    }
  }

  // Função para atualizar itens localmente durante a pesagem
  const handleItemChange = (index, field, value) => {
    if (!selectedPedido) return

    // Detecta a chave correta (itens vs items)
    const key = Array.isArray(selectedPedido.itens) ? 'itens' : 'items'
    const currentItems = selectedPedido[key] || []
    const newItems = [...currentItems]

    // Atualiza o item
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalcula total
    const newTotal = newItems.reduce((sum, item) => {
      const qtd = Number(item.quantidade ?? item.quantity ?? 0)
      const price = Number(item.preco_unitario ?? item.unit_price ?? 0)
      return sum + (qtd * price)
    }, 0)

    // Atualiza estado local para feedback visual imediato
    setSelectedPedido(prev => ({
      ...prev,
      [key]: newItems,
      valor_total: newTotal,
      total: newTotal,
      foi_alterado: true
    }))
  }

  const handleSaveAlteracoes = async () => {
    if (!selectedPedido) return
    const current = selectedPedido

    // Monta payload completo com os itens atualizados (pesos reais)
    const itensOrig = Array.isArray(current?.itens) ? current.itens : (Array.isArray(current?.items) ? current.items : [])
    const itensNorm = itensOrig.map((it) => ({
      id: it?.id,
      product_name: it?.nome_produto ?? it?.product_name ?? 'Item',
      quantity: Number(it?.quantidade ?? it?.quantity ?? 0), // Quantidade atualizada
      unit_price: Number(it?.preco_unitario ?? it?.unit_price ?? 0)
    }))

    const totalNorm = itensNorm.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0)

    const payload = {
      client_name: current?.cliente_nome ?? current?.nome_cliente ?? current?.client_name ?? 'Cliente',
      total: totalNorm,
      status: current?.status,
      created_at: current?.data_pedido ?? current?.created_at,
      items: itensNorm, // Envia itens corrigidos
      telefone: current?.telefone ?? current?.phone ?? null,
      address: current?.endereco ?? current?.address ?? null,
      payment_method: current?.forma ?? current?.payment_method ?? null,
      observacao: editObservacao ?? current?.observacao ?? null,
      observacoes: editObservacao ?? current?.observacoes ?? null,
      supermarket_id: current?.supermarket_id ?? getSupermarketId() ?? 1
    }

    try {
      await updatePedido(current.id, payload)

      // Atualiza lista principal
      setPedidos(prev => prev.map(p => p.id === current.id ? {
        ...p,
        ...payload,
        itens: itensNorm,
        items: itensNorm,
        valor_total: totalNorm,
        foi_alterado: true
      } : p))

      // Atualiza modal
      setSelectedPedido(prev => ({
        ...prev,
        valor_total: totalNorm,
        foi_alterado: true
      }))

      // Persiste destaque
      const smId = getSupermarketId()
      const sticky = stickyAlteredIdsRef.current || new Set()
      sticky.add(current.id)
      stickyAlteredIdsRef.current = sticky
      saveStickyToStorage(smId, sticky)

      alert("Alterações de peso/quantidade salvas com sucesso!")
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
      alert("Erro ao salvar alterações.")
    }
  }

  const openDetails = (pedido) => {
    setSelectedPedido(pedido)
    setShowDetails(true)
    setChatMessages([])
    setChatInput('')
    setEditObservacao(pedido?.observacao ?? pedido?.observacoes ?? '')
  }

  const closeDetails = () => {
    setShowDetails(false)
    setSelectedPedido(null)
    setChatMessages([])
    setChatInput('')
  }

  const parsePedidoDate = (pedido) => getPedidoDate(pedido) || new Date(0)

  const pendentesPedidos = pedidos.filter((p) => p.status === 'pendente')

  const separadosPedidos = pedidos.filter((p) => p.status === 'separado')

  const concluidosPedidos = useMemo(() => {
    return pedidos
      .filter((p) => ['entregue', 'faturado'].includes(p.status))
      .sort((a, b) => parsePedidoDate(b) - parsePedidoDate(a))
  }, [pedidos])

  const filteredConcluidos = useMemo(() => {
    if (!concluidosDateFilter) return concluidosPedidos
    return concluidosPedidos.filter((pedido) => getPedidoDateKey(pedido) === concluidosDateFilter)
  }, [concluidosPedidos, concluidosDateFilter])

  const totalConcluidosPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredConcluidos.length / CONCLUIDOS_PAGE_SIZE))
  }, [filteredConcluidos.length])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredConcluidos.length / CONCLUIDOS_PAGE_SIZE) - 1)
    if (concluidosPage > maxPage) {
      setConcluidosPage(maxPage)
    }
  }, [filteredConcluidos.length, concluidosPage])

  useEffect(() => {
    setConcluidosPage(0)
  }, [concluidosDateFilter])

  const paginatedConcluidos = useMemo(() => {
    const start = concluidosPage * CONCLUIDOS_PAGE_SIZE
    return filteredConcluidos.slice(start, start + CONCLUIDOS_PAGE_SIZE)
  }, [filteredConcluidos, concluidosPage])

  const formatCurrency = (value) => {
    const num = typeof value === 'number' && !Number.isNaN(value) ? value : 0
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num)
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    setChatMessages((prev) => [...prev, { id: Date.now(), text: chatInput.trim() }])
    setChatInput('')
  }

  const handlePrint = (pedido) => {
    const clienteNome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente Desconhecido';
    const numeroPedido = pedido?.numero_pedido ?? pedido?.id;
    const clienteTelefone = pedido?.telefone || pedido?.phone || 'Não informado';
    const clienteEndereco = pedido?.endereco || pedido?.address || 'Não informado';
    const clienteFormaPagamento = pedido?.forma || pedido?.payment_method || 'Não informada';

    const itens = (Array.isArray(pedido?.itens) ? pedido.itens : pedido?.items || [])
      .map(item => {
        const nome = item?.nome_produto || item?.product_name || 'Item';
        const qtd = Number(item?.quantidade ?? item?.quantity) || 0;
        const unit = Number(item?.preco_unitario ?? item?.unit_price) || 0;
        const subtotal = qtd * unit;
        return `${nome} x${qtd.toFixed(3)} - R$ ${subtotal.toFixed(2)}`;
      }).join('\n');

    const comprovante = `
SUPERMERCADO
-----------------------------
PEDIDO #${numeroPedido}
DATA: ${pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }) : '-'}
-----------------------------
CLIENTE: ${clienteNome}
TELEFONE: ${clienteTelefone}
ENDEREÇO: ${clienteEndereco}
PAGAMENTO: ${clienteFormaPagamento}
-----------------------------
ITENS:
${itens}
-----------------------------
TOTAL: R$ ${orderTotal(pedido).toFixed(2)}
-----------------------------
${(pedido?.observacao || pedido?.observacoes) ? 'OBS: ' + (pedido?.observacao || pedido?.observacoes) + '\n-----------------------------' : ''}
Obrigado pela preferência!
`
    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`<pre style='font-size:16px;'>${comprovante}</pre>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      alert("A janela de impressão foi bloqueada pelo navegador. Verifique as configurações de pop-up.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="text-gray-900 dark:text-white">Carregando...</div>
      </div>
    )
  }

  const KpiCard = ({ title, value, icon: Icon, color }) => (
    <div className="card p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm text-gray-500 dark:text-dark-400">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>
            {value}
          </p>
        </div>
        <div className={`p-2 rounded-full ${color}/20 flex items-center justify-center`}>
          <Icon className={color} size={24} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <Header
        title="Painel de Pedidos"
        subtitle="Gerencie todos os pedidos do seu supermercado"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KpiCard title="Total de Pedidos" value={stats.total} icon={TrendingUp} color="text-blue-600 dark:text-blue-400" />
          <KpiCard title="Pendentes" value={stats.pendentes} icon={Clock} color="text-yellow-600 dark:text-yellow-400" />
          <KpiCard title="Separados" value={stats.separados} icon={Package} color="text-blue-600 dark:text-blue-400" />
          <KpiCard title="Entregues" value={stats.entregues} icon={CheckCircle} color="text-green-600 dark:text-green-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Pendentes */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-semibold">Pedidos Pendentes</h3>
              <span className="text-sm text-yellow-600 dark:text-yellow-400">{pendentesPedidos.length}</span>
            </div>
            {pendentesPedidos.length === 0 ? (
              <p className="text-gray-500 dark:text-dark-400">Nenhum pedido pendente.</p>
            ) : (
              <div className="space-y-3">
                {pendentesPedidos.map((pedido, index) => {
                  const clienteNome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente'
                  const data = pedido?.data_pedido || pedido?.created_at
                  const hasUpdates = Boolean(pedido?.foi_alterado)
                  const isFirst = index === 0 // Apenas o primeiro pode separar
                  return (
                    <div
                      key={pedido.id}
                      onClick={() => openDetails(pedido)}
                      className={`w-full rounded-lg border shadow-sm cursor-pointer p-3 ${hasUpdates
                        ? 'bg-red-50 hover:bg-red-100 border-red-400 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:border-red-500 shake-alert'
                        : 'bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 border-gray-300 dark:border-dark-700'} ${selectedPedido?.id === pedido.id ? 'ring-2 ring-yellow-400 border-yellow-600' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{clienteNome}</p>
                        <span className={`${hasUpdates ? 'text-red-700 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold text-sm whitespace-nowrap ml-2`}>{formatCurrency(orderTotal(pedido))}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-xs ${hasUpdates ? 'text-red-700 dark:text-red-300 font-medium' : 'text-gray-500 dark:text-dark-400'}`}>{data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }) : '-'}</p>
                        {hasUpdates && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">Alterado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isFirst ? (
                          // Primeiro pedido: mostra botão Separar + Imprimir
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(pedido.id, 'separado') }}
                              className="flex-1 px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center gap-1"
                            >
                              <Package size={12} />
                              Separar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePrint(pedido) }}
                              className="p-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                            >
                              <Printer size={14} />
                            </button>
                          </>
                        ) : (
                          // Demais pedidos: mostra apenas botão Imprimir
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrint(pedido) }}
                            className="flex-1 px-2 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center justify-center gap-1"
                          >
                            <Printer size={14} />
                            Imprimir
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Coluna 2: Separados */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-semibold">Separados</h3>
              <span className="text-sm text-blue-600 dark:text-blue-400">{separadosPedidos.length}</span>
            </div>
            {separadosPedidos.length === 0 ? (
              <p className="text-gray-500 dark:text-dark-400">Nenhum pedido separado.</p>
            ) : (
              <div className="space-y-3">
                {separadosPedidos.map((pedido) => {
                  const clienteNome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente'
                  const data = pedido?.data_pedido || pedido?.created_at
                  return (
                    <div
                      key={pedido.id}
                      onClick={() => openDetails(pedido)}
                      className={`w-full rounded-lg border shadow-sm cursor-pointer p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-blue-300 dark:border-blue-700 ${selectedPedido?.id === pedido.id ? 'ring-2 ring-blue-400 border-blue-600' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{clienteNome}</p>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm whitespace-nowrap ml-2">{formatCurrency(orderTotal(pedido))}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-dark-400 mb-2">{data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }) : '-'}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(pedido.id, 'entregue') }}
                          className="flex-1 px-2 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center gap-1"
                        >
                          <Truck size={12} />
                          Saiu p/ Entrega
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePrint(pedido) }}
                          className="p-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Coluna 3: Entregues */}
          <div className="card p-4">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-gray-900 dark:text-white font-semibold">Entregues</h3>
                  <span className="text-sm text-green-600 dark:text-green-400">{filteredConcluidos.length}</span>
                </div>
                {filteredConcluidos.length > CONCLUIDOS_PAGE_SIZE && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConcluidosPage((page) => Math.max(0, page - 1))}
                      disabled={concluidosPage === 0}
                      className={`p-1 rounded border border-gray-200 dark:border-dark-600 transition-colors ${concluidosPage === 0
                        ? 'text-gray-300 dark:text-dark-500 cursor-not-allowed'
                        : 'text-gray-600 dark:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-700'
                        }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-gray-500 dark:text-dark-300">
                      {concluidosPage + 1} / {totalConcluidosPages}
                    </span>
                    <button
                      onClick={() => setConcluidosPage((page) => Math.min(totalConcluidosPages - 1, page + 1))}
                      disabled={concluidosPage >= totalConcluidosPages - 1}
                      className={`p-1 rounded border border-gray-200 dark:border-dark-600 transition-colors ${concluidosPage >= totalConcluidosPages - 1
                        ? 'text-gray-300 dark:text-dark-500 cursor-not-allowed'
                        : 'text-gray-600 dark:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-700'
                        }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={openDatePicker}
                    className="button-outline px-3 py-1 flex items-center justify-center text-sm"
                  >
                    <Calendar size={16} />
                  </button>
                  <input
                    ref={datePickerRef}
                    type="date"
                    value={concluidosDateFilter || ''}
                    onChange={(e) => setConcluidosDateFilter(e.target.value)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    tabIndex={-1}
                  />
                </div>
                <button onClick={() => setConcluidosDateFilter(todayKey)} className="button-outline text-xs px-3 py-1">Hoje</button>
                <button onClick={() => setConcluidosDateFilter('')} className="button-outline text-xs px-3 py-1">Todos</button>
              </div>
            </div>
            {filteredConcluidos.length === 0 ? (
              <p className="text-gray-500 dark:text-dark-400">Nenhum pedido entregue.</p>
            ) : (
              <div className="space-y-3">
                {paginatedConcluidos.map((pedido) => (
                  <PedidoCard
                    key={pedido.id}
                    pedido={pedido}
                    onStatusChange={handleStatusChange}
                    onOpen={() => openDetails(pedido)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalhes do Pedido (Modal) */}
        {showDetails && selectedPedido && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2">
            <div className="bg-white dark:bg-dark-800 w-full max-w-4xl rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                  {`Pedido de ${selectedPedido?.cliente_nome || selectedPedido?.nome_cliente || selectedPedido?.client_name || 'Cliente'}`}
                </h3>
                {Boolean(selectedPedido?.foi_alterado) && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-600 text-white">Pedido alterado</span>
                )}
                <button className="text-gray-500 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white" onClick={closeDetails}>
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto">
                <div className="space-y-4 lg:col-span-2">
                  {/* Informações do Cliente */}
                  <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-gray-500 dark:text-dark-400" />
                      Informações do Cliente
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
                        <Phone size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
                        <span>{selectedPedido?.telefone || selectedPedido?.phone || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
                        <MapPin size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
                        <span>{selectedPedido?.endereco || selectedPedido?.address || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
                        <CreditCard size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
                        <div className="flex flex-col">
                          <span>{selectedPedido?.forma || selectedPedido?.payment_method || '—'}</span>
                          {selectedPedido?.comprovante_pix && (
                            <a
                              href={selectedPedido.comprovante_pix}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 flex items-center gap-1"
                            >
                              <span>📎 Ver Comprovante</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Itens do Pedido (EDITÁVEIS) */}
                  <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-3 flex justify-between items-center">
                      <span>Itens do Pedido</span>
                      <span className="text-xs text-blue-500 font-normal">
                        {selectedPedido.status === 'pendente' ? '✏️ Edite o peso/qtd abaixo' : '🔒 Pedido fechado'}
                      </span>
                    </h4>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {(Array.isArray(selectedPedido.itens) ? selectedPedido.itens : selectedPedido.items || []).map((item, idx) => {
                        // Extração segura de valores
                        const nome = item?.nome_produto || item?.product_name || 'Item'
                        const qtd = Number(item?.quantidade ?? item?.quantity ?? 0)
                        const unit = Number(item?.preco_unitario ?? item?.unit_price ?? 0)
                        const subtotal = qtd * unit

                        return (
                          <div key={idx} className="flex flex-col p-3 bg-white dark:bg-dark-800 rounded border border-gray-200 dark:border-dark-700">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-gray-900 dark:text-white font-medium text-sm">{nome}</span>
                              <span className="text-gray-500 dark:text-dark-400 text-xs font-mono">
                                R$ {unit.toFixed(2)}/un
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Qtd / Peso (Kg)</label>
                                {selectedPedido.status === 'pendente' ? (
                                  <input
                                    type="number"
                                    step="0.001"
                                    value={qtd}
                                    onChange={(e) => handleItemChange(idx, Array.isArray(selectedPedido.itens) ? 'quantidade' : 'quantity', e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                                ) : (
                                  <span className="block text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-dark-700 px-2 py-1 rounded">
                                    {qtd.toFixed(3)}
                                  </span>
                                )}
                              </div>

                              <div className="text-right">
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Subtotal</label>
                                <p className="text-gray-900 dark:text-white font-bold text-sm py-1">
                                  {formatCurrency(subtotal)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Total e Botão Salvar */}
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-dark-700">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600 dark:text-dark-300">Total Final</span>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(selectedPedido.valor_total)}
                        </span>
                      </div>

                      {/* Botão de Salvar Alterações */}
                      {selectedPedido.status === 'pendente' && selectedPedido.foi_alterado && (
                        <button
                          onClick={handleSaveAlteracoes}
                          className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                          <Save size={18} />
                          Salvar Pesagem / Alterações
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Observações */}
                  {(selectedPedido?.observacao || selectedPedido?.observacoes) && (
                    <div className="rounded-lg p-4 border bg-amber-100 dark:bg-amber-800/30 border-amber-400 dark:border-amber-700/40">
                      <h4 className="text-amber-800 dark:text-white font-medium mb-2">Observações</h4>
                      <p className="text-amber-800 dark:text-amber-100 text-sm">{selectedPedido?.observacao || selectedPedido?.observacoes}</p>
                    </div>
                  )}

                  {selectedPedido?.status !== 'faturado' && (
                    <button
                      onClick={() => handleStatusChange(selectedPedido.id, 'faturado')}
                      className="w-full button flex items-center justify-center gap-2 py-3 mt-4"
                    >
                      <CheckCircle size={18} />
                      Enviar para Faturamento
                    </button>
                  )}
                </div>

                {/* Coluna Direita - Chat */}
                <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700 flex flex-col">
                  <h4 className="text-gray-900 dark:text-white font-medium mb-3 flex items-center gap-2">
                    <MessageSquare size={18} className="text-gray-500 dark:text-dark-400" />
                    Chat com Cliente
                  </h4>
                  <div className="flex-1 rounded bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-700 p-3 overflow-y-auto min-h-[200px]">
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-dark-300 text-sm h-full justify-center">
                        <Check size={16} className="text-green-600 dark:text-green-400" />
                        Nenhuma mensagem ainda
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chatMessages.map((m) => (
                          <div key={m.id} className="bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-dark-100 text-sm p-2 rounded">{m.text}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat() }}
                      className="input flex-1"
                      placeholder="Digite sua mensagem..."
                    />
                    <button
                      onClick={handleSendChat}
                      className="button px-4 py-2"
                      title="Enviar mensagem"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PainelPedidos
