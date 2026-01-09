import { useState, useEffect } from 'react'
import { getSupermarkets, getSupermarket, createSupermarket, updateSupermarket, deleteSupermarket, getSupermarketIntegrationToken, resetSupermarketPassword, createPedidoWithCustomToken, saveCustomToken, API_BASE as API_BASE_URL } from '../services/api'
import { agentTest } from '../services/api'
import Header from '../components/Header'
import { Plus, Edit, Trash2, Store, Mail, Phone, Calendar, Activity, MapPin, Clock, CreditCard, Package, Upload, AlertCircle, CheckCircle, Loader, Search, Filter, Eye, History, ChevronLeft, ChevronRight, X, Copy } from 'lucide-react'

const Supermarkets = () => {
  const [supermarkets, setSupermarkets] = useState([])
  const [manualIntegrationToken, setManualIntegrationToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordModalMode, setPasswordModalMode] = useState('create') // 'create' | 'reset'
  const [showForceDeleteModal, setShowForceDeleteModal] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [isDeletingForced, setIsDeletingForced] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [editingSupermarket, setEditingSupermarket] = useState(null)
  const [selectedSupermarket, setSelectedSupermarket] = useState(null)
  const [supermarketHistory, setSupermarketHistory] = useState([])
  const [validationErrors, setValidationErrors] = useState({})
  const [isValidating, setIsValidating] = useState({})
  const [cepLoading, setCepLoading] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  // Integração do agente IA
  const [integrationUrl, setIntegrationUrl] = useState('')
  const [integrationResult, setIntegrationResult] = useState(null)
  const [isTestingIntegration, setIsTestingIntegration] = useState(false)
  const [integrationToken, setIntegrationToken] = useState('')
  const [isLoadingIntegrationToken, setIsLoadingIntegrationToken] = useState(false)
  // Usa base normalizada para evitar duplicações '/api/api'
  const systemOrderUrl = `${API_BASE_URL}/pedidos/`
  
  // CORRIGIDO: Adicionado telefone, endereco, forma e observacao ao payload de exemplo
  const systemOrderExampleBody = {
    nome_cliente: 'Agente IA',
    telefone: '85999999999', // Exemplo de telefone
    endereco: 'Rua Principal, 123 - Centro', // Exemplo de endereço
    forma: 'Pix', // Exemplo de forma de pagamento
    observacao: 'Pedido de teste enviado pelo Painel Administrativo.', // Exemplo de observação
    itens: [
      { nome_produto: 'Arroz 5kg', quantidade: 1, preco_unitario: 25.9 },
      { nome_produto: 'Feijão 1kg', quantidade: 2, preco_unitario: 8.5 },
    ],
  }

  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planoFilter, setPlanoFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)

  const [formData, setFormData] = useState({
    // Dados básicos
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    
    // Endereço
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    
    // Dados operacionais
    horario_funcionamento: {
      segunda: { abertura: '08:00', fechamento: '18:00', fechado: false },
      terca: { abertura: '08:00', fechamento: '18:00', fechado: false },
      quarta: { abertura: '08:00', fechamento: '18:00', fechado: false },
      quinta: { abertura: '08:00', fechamento: '18:00', fechado: false },
      sexta: { abertura: '08:00', fechamento: '18:00', fechado: false },
      sabado: { abertura: '08:00', fechamento: '18:00', fechado: false },
      domingo: { abertura: '08:00', fechamento: '18:00', fechado: true }
    },
    metodos_pagamento: ['dinheiro', 'cartao'],
    categorias_produtos: ['alimenticios', 'limpeza', 'higiene'],
    
    // Plano do sistema
    plano: 'basico',
    valor_mensal: 0,
    dia_vencimento: 5,
    ativo: true,
    logo_url: ''
  })

  // Carregar supermercados
  const loadSupermarkets = async () => {
    try {
      setLoading(true)
      const response = await getSupermarkets()
      console.log('Response from getSupermarkets:', response)
      // A resposta pode vir como response.data ou diretamente como array
      const data = response.data || response
      setSupermarkets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar supermercados:', error)
      setSupermarkets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSupermarkets()
  }, [])

  // Filtrar supermercados
  const filteredSupermarkets = supermarkets.filter(supermarket => {
    const matchesSearch = supermarket.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supermarket.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && supermarket.ativo) ||
                         (statusFilter === 'inactive' && !supermarket.ativo)
    
    const matchesPlano = planoFilter === 'all' || supermarket.plano === planoFilter
    
    return matchesSearch && matchesStatus && matchesPlano
  })

  // Paginação
  const totalPages = Math.ceil(filteredSupermarkets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSupermarkets = filteredSupermarkets.slice(startIndex, startIndex + itemsPerPage)

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, planoFilter])

  // Abrir modal
  const openModal = (supermarket = null) => {
    if (supermarket) {
      setEditingSupermarket(supermarket)
      setFormData({
        nome: supermarket.nome || '',
        cnpj: supermarket.cnpj || '',
        email: supermarket.email || '',
        telefone: supermarket.telefone || '',
        cep: supermarket.cep || '',
        endereco: supermarket.endereco || '',
        numero: supermarket.numero || '',
        complemento: supermarket.complemento || '',
        bairro: supermarket.bairro || '',
        cidade: supermarket.cidade || '',
        estado: supermarket.estado || '',
        horario_funcionamento: supermarket.horario_funcionamento || {
          segunda: { abertura: '08:00', fechamento: '18:00', fechado: false },
          terca: { abertura: '08:00', fechamento: '18:00', fechado: false },
          quarta: { abertura: '08:00', fechamento: '18:00', fechado: false },
          quinta: { abertura: '08:00', fechamento: '18:00', fechado: false },
          sexta: { abertura: '08:00', fechamento: '18:00', fechado: false },
          sabado: { abertura: '08:00', fechamento: '18:00', fechado: false },
          domingo: { abertura: '08:00', fechamento: '18:00', fechado: true }
        },
        metodos_pagamento: supermarket.metodos_pagamento || ['dinheiro', 'cartao'],
        categorias_produtos: supermarket.categorias_produtos || ['alimenticios', 'limpeza', 'higiene'],
        plano: supermarket.plano || 'basico',
        valor_mensal: supermarket.valor_mensal ?? 0,
        dia_vencimento: supermarket.dia_vencimento ?? 5,
        ativo: supermarket.ativo !== undefined ? supermarket.ativo : true,
        logo_url: supermarket.logo_url || ''
      })
      if (supermarket.logo_url) {
        setLogoPreview(supermarket.logo_url)
      }
    } else {
      setEditingSupermarket(null)
      setFormData({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        horario_funcionamento: {
          segunda: { abertura: '08:00', fechamento: '18:00', fechado: false },
          terca: { abertura: '08:00', fechamento: '18:00', fechado: false },
          quarta: { abertura: '08:00', fechamento: '18:00', fechado: false },
          quinta: { abertura: '08:00', fechamento: '18:00', fechado: false },
          sexta: { abertura: '08:00', fechamento: '18:00', fechado: false },
          sabado: { abertura: '08:00', fechamento: '18:00', fechado: false },
          domingo: { abertura: '08:00', fechamento: '18:00', fechado: true }
        },
        metodos_pagamento: ['dinheiro', 'cartao'],
        categorias_produtos: ['alimenticios', 'limpeza', 'higiene'],
        plano: 'basico',
        valor_mensal: 0,
        dia_vencimento: 5,
        ativo: true,
        logo_url: ''
      })
      setLogoPreview('')
    }
    setValidationErrors({})
    setLogoFile(null)
    setShowModal(true)
  }

  // Fechar modal
  const closeModal = () => {
    setShowModal(false)
    setEditingSupermarket(null)
    setValidationErrors({})
    setLogoFile(null)
    setLogoPreview('')
  }

  // Validação de campos
  const validateField = (name, value) => {
    switch (name) {
      case 'cnpj':
        if (value && value.replace(/\D/g, '').length !== 14) {
          return 'CNPJ deve ter 14 dígitos'
        }
        break
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Email inválido'
        }
        break
      case 'telefone':
        if (value && value.replace(/\D/g, '').length < 10) {
          return 'Telefone deve ter pelo menos 10 dígitos'
        }
        break
      case 'cep':
        if (value && value.replace(/\D/g, '').length !== 8) {
          return 'CEP deve ter 8 dígitos'
        }
        break
      case 'capacidade_estocagem':
        if (value && (isNaN(value) || value <= 0)) {
          return 'Capacidade deve ser um número positivo'
        }
        break
      default:
        return null
    }
    return null
  }

  // Buscar endereço por CEP
  const fetchAddressByCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      setCepLoading(true)
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }))
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error)
      } finally {
        setCepLoading(false)
      }
    }
  }

  // Formatação
  const formatCNPJ = (value) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  const formatCEP = (value) => {
    return value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Sem validação de campos no frontend

    try {
      setLoading(true)
      
      let logoUrl = formData.logo_url
      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        
        // Upload do logo (implementar endpoint no backend)
        // const logoResponse = await uploadLogo(logoFormData)
        // logoUrl = logoResponse.url
      }

      // Transformar horario_funcionamento para o formato aceito pelo backend (mapa de strings)
      const rawHorario = formData.horario_funcionamento
      let horario_funcionamento
      if (rawHorario && typeof rawHorario === 'object') {
        horario_funcionamento = {}
        Object.keys(rawHorario).forEach((dia) => {
          const v = rawHorario[dia]
          if (v && typeof v === 'object') {
            horario_funcionamento[dia] = v.fechado ? 'fechado' : `${v.abertura}-${v.fechamento}`
          } else if (typeof v === 'string') {
            horario_funcionamento[dia] = v
          }
        })
      }

      // Omitir capacidade_estocagem e normalizar números
      const { capacidade_estocagem, ...restForm } = formData
      const supermarketData = {
        ...restForm,
        horario_funcionamento,
        logo_url: logoUrl,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        telefone: formData.telefone.replace(/\D/g, ''),
        cep: formData.cep.replace(/\D/g, ''),
        valor_mensal: restForm.valor_mensal !== '' && restForm.valor_mensal !== undefined
          ? Number(restForm.valor_mensal)
          : undefined,
        dia_vencimento: restForm.dia_vencimento !== '' && restForm.dia_vencimento !== undefined
          ? parseInt(restForm.dia_vencimento, 10)
          : undefined
      }

      if (editingSupermarket) {
        await updateSupermarket(editingSupermarket.id, supermarketData)
      } else {
        const response = await createSupermarket(supermarketData)
        // Capturar a senha gerada da resposta (compatível com axios)
        const data = response?.data || response
        if (data?.senha_gerada) {
          setGeneratedPassword(data.senha_gerada)
          setPasswordModalMode('create')
          setShowPasswordModal(true)
        }
      }
      
      await loadSupermarkets()
      closeModal()
    } catch (error) {
      console.error('Erro ao salvar supermercado:', error)
      const detail = error?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => d?.msg || d?.detail || JSON.stringify(d)).join('; ')
        : (typeof detail === 'string' ? detail : (error?.message || 'Erro ao salvar supermercado'))
      window.alert(`Erro ao salvar: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!editingSupermarket) return
    const confirm = window.confirm('Confirmar redefinição da senha de acesso ao painel?')
    if (!confirm) return
    try {
      setIsResettingPassword(true)
      const resp = await resetSupermarketPassword(editingSupermarket.id)
      const data = resp?.data || resp
      if (data?.senha_gerada) {
        setGeneratedPassword(data.senha_gerada)
        setPasswordModalMode('reset')
        setShowPasswordModal(true)
        // Fechar modal de edição para evitar sobreposição de camadas
        closeModal()
      } else {
        window.alert('Senha redefinida, mas resposta inesperada do servidor.')
      }
    } catch (e) {
      console.error('Erro ao resetar senha:', e)
      const msg = e?.response?.data?.detail || e?.message || 'Falha ao redefinir senha'
      window.alert(msg)
    } finally {
      setIsResettingPassword(false)
    }
  }

  // Criação rápida via botão "Novo Supermercado"
  const handleQuickCreate = async () => {
    try {
      setLoading(true)
      const ts = Date.now()

      const defaultData = {
        // Dados básicos
        nome: `Supermercado ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
        cnpj: '12345678000199',
        email: `novo-super-${ts}@example.com`,
        telefone: '11987654321',

        // Endereço
        cep: '01001000',
        endereco: 'Praça da Sé',
        numero: '100',
        complemento: '',
        bairro: 'Sé',
        cidade: 'São Paulo',
        estado: 'SP',

        // Operacional
        horario_funcionamento: {
          segunda: '08:00-18:00',
          terca: '08:00-18:00',
          quarta: '08:00-18:00',
          quinta: '08:00-18:00',
          sexta: '08:00-18:00',
          sabado: '08:00-18:00',
          domingo: 'fechado'
        },
        metodos_pagamento: ['dinheiro', 'cartao'],
        categorias_produtos: ['alimenticios', 'limpeza', 'higiene'],

        // Plano
        capacidade_estocagem: 1000,
        plano: 'basico',
        ativo: true,
        logo_url: ''
      }

      const response = await createSupermarket(defaultData)
      const data = response?.data || response
      if (data?.senha_gerada) {
        setGeneratedPassword(data.senha_gerada)
        setShowPasswordModal(true)
      }
      await loadSupermarkets()
    } catch (error) {
      console.error('Erro ao criar supermercado rapidamente:', error)
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        const msg = Array.isArray(detail)
          ? detail.map(d => d?.msg || d?.detail || JSON.stringify(d)).join('; ')
          : (typeof detail === 'string' ? detail : (error?.message || 'Erro ao criar'))
        window.alert(`Erro ao criar: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (name === 'cnpj') {
      setFormData(prev => ({ ...prev, [name]: formatCNPJ(value) }))
    } else if (name === 'telefone') {
      setFormData(prev => ({ ...prev, [name]: formatTelefone(value) }))
    } else if (name === 'cep') {
      const formattedCep = formatCEP(value)
      setFormData(prev => ({ ...prev, [name]: formattedCep }))
      if (formattedCep.replace(/\D/g, '').length === 8) {
        fetchAddressByCep(formattedCep)
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Limpar erro do campo quando usuário começar a digitar
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este supermercado?')) {
      try {
        const res = await deleteSupermarket(id)
        // Feedback de sucesso
        const msg = res?.data?.message || 'Supermercado excluído com sucesso'
        window.alert(msg)
        await loadSupermarkets()
      } catch (error) {
        console.error('Erro ao excluir supermercado:', error)
        const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message
        const isRelatedError = typeof detail === 'string' && detail.toLowerCase().includes('registros relacionados')
        if (isRelatedError) {
          const proceedForce = window.confirm('Existem registros relacionados (usuários/clientes/pedidos). Deseja fazer exclusão FORÇADA?')
          if (proceedForce) {
            setPendingDeleteId(id)
            setAdminPasswordInput('')
            setShowForceDeleteModal(true)
          }
        } else {
          window.alert(`Não foi possível excluir: ${detail}`)
        }
      }
    }
  }

  const confirmForceDelete = async () => {
    if (!adminPasswordInput) {
      window.alert('Informe a senha de administrador.')
      return
    }
    try {
      setIsDeletingForced(true)
      const resForce = await deleteSupermarket(pendingDeleteId, { force: true, adminPassword: adminPasswordInput })
      const msgForce = resForce?.data?.message || 'Exclusão forçada concluída.'
      window.alert(msgForce)
      setShowForceDeleteModal(false)
      setPendingDeleteId(null)
      setAdminPasswordInput('')
      await loadSupermarkets()
    } catch (err2) {
      const detail2 = err2?.response?.data?.detail || err2?.response?.data?.message || err2?.message
      window.alert(`Exclusão forçada falhou: ${detail2}`)
    } finally {
      setIsDeletingForced(false)
    }
  }

  const openDetailsModal = (supermarket) => {
    setSelectedSupermarket(supermarket)
    // Carrega URL salva (localStorage) para facilitar integração por supermercado
    try {
      const savedUrl = localStorage.getItem(`integration_url_${supermarket.id}`)
      setIntegrationUrl(savedUrl || '')
    } catch {}
    setIntegrationResult(null)
    setShowDetailsModal(true)
  }

  // Carrega o token de integração e custom_token quando o modal de detalhes é aberto
  useEffect(() => {
    const fetchTokens = async () => {
      if (!showDetailsModal || !selectedSupermarket) return
      try {
        setIsLoadingIntegrationToken(true)
        setIntegrationToken('')
        setManualIntegrationToken('')
        
        // Carrega o token de integração JWT
        const tokenRes = await getSupermarketIntegrationToken(selectedSupermarket.id)
        const token = tokenRes?.data?.access_token || tokenRes?.access_token
        if (token) setIntegrationToken(token)
        
        // Carrega os dados completos do supermercado incluindo custom_token
        const supermarketRes = await getSupermarket(selectedSupermarket.id)
        const customToken = supermarketRes?.data?.custom_token
        if (customToken) {
          setManualIntegrationToken(customToken)
        } else {
          // Fallback para localStorage se não houver no banco
          const localToken = localStorage.getItem(`manual_integration_token_${selectedSupermarket.id}`)
          if (localToken) setManualIntegrationToken(localToken)
        }
      } catch (e) {
        console.error('Erro ao obter tokens:', e)
      } finally {
        setIsLoadingIntegrationToken(false)
      }
    }
    fetchTokens()
  }, [showDetailsModal, selectedSupermarket])

  // Quando abrir o modal de detalhes, se houver URL salva, dispara teste automaticamente
  useEffect(() => {
    if (showDetailsModal && selectedSupermarket && integrationUrl) {
      handleIntegrationTest()
    }
  }, [showDetailsModal, selectedSupermarket])

  const handleIntegrationTest = async () => {
    if (!selectedSupermarket) return
    if (!integrationUrl) {
      window.alert('Informe a URL de integração (POST) do supermercado.')
      return
    }
    try {
      setIsTestingIntegration(true)
      setIntegrationResult(null)
      const res = await agentTest(selectedSupermarket.id, { url: integrationUrl })
      setIntegrationResult(res?.data || { ok: true, status: 200, response: { message: 'Testado com sucesso' } })
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Falha ao testar integração'
      setIntegrationResult({ ok: false, status: e?.response?.status || 500, response: { error: detail } })
    } finally {
      setIsTestingIntegration(false)
    }
  }

  const saveIntegrationUrl = () => {
    if (!selectedSupermarket) return
    try {
      localStorage.setItem(`integration_url_${selectedSupermarket.id}`, integrationUrl || '')
      window.alert('URL de integração salva localmente para este supermercado.')
    } catch {}
  }

  const handleOrderTest = async () => {
    if (!selectedSupermarket) return
    // Usar APENAS o token manual inserido pelo usuário
    if (!manualIntegrationToken) {
      window.alert('Token manual não inserido. Por favor, insira o token do supermercado no campo acima.')
      return
    }
    
    try {
      setIsTestingIntegration(true)
      setIntegrationResult(null)
      
      // Usar o exemplo de pedido do modal
      const testOrder = systemOrderExampleBody
      
      const res = await createPedidoWithCustomToken(testOrder, manualIntegrationToken)
      setIntegrationResult({ 
        ok: true, 
        status: 200, 
        response: { 
          message: 'Pedido criado com sucesso!', 
          pedido: res.data 
        } 
      })
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Falha ao criar pedido'
      setIntegrationResult({ 
        ok: false, 
        status: e?.response?.status || 500, 
        response: { error: detail } 
      })
    } finally {
      setIsTestingIntegration(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <div>
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Supermercados</h1>
                <p className="text-dark-400">Gerencie os supermercados cadastrados</p>
              </div>
              
              <button
                onClick={() => openModal()}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={20} />
                <span>Novo Supermercado</span>
              </button>
            </div>

            {/* Filtros */}
            <div className="card mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Busca */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input pl-10 w-full"
                    />
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input min-w-[120px]"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>

                  <select
                    value={planoFilter}
                    onChange={(e) => setPlanoFilter(e.target.value)}
                    className="input min-w-[120px]"
                  >
                    <option value="all">Todos os Planos</option>
                    <option value="basico">Básico</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                {/* Contador */}
                <div className="flex items-center text-dark-300">
                  <Filter size={16} className="mr-2" />
                  <span>{filteredSupermarkets.length} resultado(s)</span>
                </div>
              </div>
            </div>

            {/* Lista de supermercados */}
            {paginatedSupermarkets.length === 0 ? (
              <div className="text-center py-12">
                <Store size={64} className="mx-auto text-dark-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchTerm || statusFilter !== 'all' || planoFilter !== 'all' 
                    ? 'Nenhum supermercado encontrado' 
                    : 'Nenhum supermercado cadastrado'
                  }
                </h3>
                <p className="text-dark-400 mb-6">
                  {searchTerm || statusFilter !== 'all' || planoFilter !== 'all'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Comece cadastrando seu primeiro supermercado'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && planoFilter === 'all' && (
                  <button
                    onClick={() => openModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Cadastrar Supermercado
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {paginatedSupermarkets.map((supermarket) => (
                    <div key={supermarket.id} className="card p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {supermarket.logo_url ? (
                            <img 
                              src={supermarket.logo_url} 
                              alt={supermarket.nome}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center">
                              <Store size={24} className="text-dark-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-white">
                                {supermarket.nome}
                              </h3>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              supermarket.ativo 
                                ? 'bg-green-900 text-green-300' 
                                : 'bg-red-900 text-red-300'
                            }`}>
                              {supermarket.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openDetailsModal(supermarket)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openModal(supermarket)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(supermarket.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-dark-300">
                          <Mail size={14} className="mr-2" />
                          <span>{supermarket.email}</span>
                        </div>
                        <div className="flex items-center text-dark-300">
                          <Phone size={14} className="mr-2" />
                          <span>{formatTelefone(supermarket.telefone)}</span>
                        </div>
                        <div className="flex items-center text-dark-300">
                          <MapPin size={14} className="mr-2" />
                          <span>{supermarket.cidade}, {supermarket.estado}</span>
                        </div>
                        <div className="flex items-center text-dark-300">
                          <Package size={14} className="mr-2" />
                          <span className="capitalize">{supermarket.plano}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                      <ChevronLeft size={16} />
                      <span>Anterior</span>
                    </button>

                    <div className="flex space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-dark-700 hover:bg-dark-600 text-white'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                      <span>Próxima</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de cadastro/edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-lg w-full max-w-3xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingSupermarket ? 'Editar Supermercado' : 'Novo Supermercado'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-dark-300 hover:text-white transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Dados básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nome</label>
                    <input
                      className="input w-full"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      placeholder="Nome do supermercado"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input w-full"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="contato@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="label">Telefone</label>
                    <input
                      className="input w-full"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="label">CNPJ</label>
                    <input
                      className="input w-full"
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleChange}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">CEP</label>
                    <input
                      className="input w-full"
                      name="cep"
                      value={formData.cep}
                      onChange={handleChange}
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <label className="label">Endereço</label>
                    <input
                      className="input w-full"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleChange}
                      placeholder="Rua/Av"
                    />
                  </div>
                  <div>
                    <label className="label">Número</label>
                    <input
                      className="input w-full"
                      name="numero"
                      value={formData.numero}
                      onChange={handleChange}
                      placeholder="Nº"
                    />
                  </div>
                  <div>
                    <label className="label">Complemento</label>
                    <input
                      className="input w-full"
                      name="complemento"
                      value={formData.complemento}
                      onChange={handleChange}
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="label">Bairro</label>
                    <input
                      className="input w-full"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleChange}
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="label">Cidade</label>
                    <input
                      className="input w-full"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <label className="label">Estado</label>
                    <input
                      className="input w-full"
                      name="estado"
                      value={formData.estado}
                      onChange={handleChange}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>

                {/* Gestão */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Plano</label>
                    <input
                      className="input w-full"
                      name="plano"
                      value={formData.plano}
                      onChange={handleChange}
                      placeholder="basico"
                    />
                  </div>
                  <div>
                    <label className="label">Valor do Plano (R$)</label>
                    <input
                      className="input w-full"
                      name="valor_mensal"
                      type="number"
                      step="0.01"
                      value={formData.valor_mensal}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="label">Dia de Vencimento</label>
                    <input
                      className="input w-full"
                      name="dia_vencimento"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dia_vencimento}
                      onChange={handleChange}
                      placeholder="5"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="ativo"
                      type="checkbox"
                      name="ativo"
                      checked={!!formData.ativo}
                      onChange={handleChange}
                      className="checkbox"
                    />
                    <label htmlFor="ativo" className="label">Ativo</label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    {editingSupermarket && (
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={isResettingPassword}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded"
                        title="Redefinir senha de acesso ao painel"
                      >
                        {isResettingPassword ? 'Resetando…' : 'Resetar senha do painel'}
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </form>
            </div>
           </div>
        </div>
      )}

      {/* Modal de senha gerada */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <CheckCircle size={24} className="mr-2 text-green-500" />
                  {passwordModalMode === 'reset' ? 'Senha Redefinida!' : 'Supermercado Criado!'}
                </h2>
              </div>

              <div className="space-y-4">
                <div className="bg-dark-700 p-4 rounded-lg border border-green-500">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {passwordModalMode === 'reset' ? 'Nova Senha de Acesso' : 'Senha de Acesso Gerada'}
                  </h3>
                  <p className="text-dark-300 text-sm mb-3">
                    {passwordModalMode === 'reset'
                      ? 'A senha do painel foi redefinida com sucesso. Compartilhe esta nova senha com o supermercado.'
                      : 'Uma senha foi gerada automaticamente para o supermercado. Anote esta senha, pois ela será necessária para o primeiro acesso.'}
                  </p>
                  <div className="bg-dark-900 p-3 rounded border-2 border-dashed border-green-500">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-mono text-lg font-bold">
                        {generatedPassword}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedPassword)}
                        className="text-green-400 hover:text-green-300 transition-colors"
                        title="Copiar senha"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-900/30 border border-yellow-600 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle size={20} className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-400 font-semibold text-sm">Importante!</h4>
                      <p className="text-yellow-300 text-sm mt-1">
                        Guarde esta senha em local seguro. O supermercado precisará dela para fazer o primeiro login no sistema.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setGeneratedPassword('')
                  }}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
                >
                  Entendi, Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do supermercado + integração do agente IA */}
{showDetailsModal && selectedSupermarket && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2">
    <div className="bg-dark-800 rounded-lg w-full max-w-lg md:max-w-2xl shadow-xl overflow-hidden">

      {/* Cabeçalho */}
      <div className="p-4 border-b border-dark-700 flex items-center justify-between sticky top-0 bg-dark-800 z-10">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center">
          <Eye size={20} className="mr-2 text-blue-500" />
          Detalhes do Supermercado
        </h2>
        <button
          onClick={() => setShowDetailsModal(false)}
          className="text-dark-300 hover:text-white"
        >
          <X size={18} />
        </button>
       </div>

      {/* Corpo com scroll interno */}
      <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800">

        {/* Informações principais */}
        <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
          <h3 className="text-base font-semibold text-white mb-2">Informações</h3>
          <div className="space-y-1 text-dark-200 text-sm">
            <p><span className="text-dark-400">Nome:</span> {selectedSupermarket?.nome}</p>
            <p><span className="text-dark-400">Email:</span> {selectedSupermarket?.email}</p>
            <p><span className="text-dark-400">CNPJ:</span> {selectedSupermarket?.cnpj || '—'}</p>
            <p><span className="text-dark-400">Plano:</span> {selectedSupermarket?.plano || '—'}</p>
            <p><span className="text-dark-400">Valor Mensal:</span> R$ {Number(selectedSupermarket?.valor_mensal ?? selectedSupermarket?.monthly_value ?? 0).toFixed(2)}</p>
            <p><span className="text-dark-400">Ativo:</span> {selectedSupermarket?.ativo ? 'Sim' : 'Não'}</p>
          </div>
        </div>

        {/* Requisição do sistema */}
        <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
          <h3 className="text-base font-semibold text-white mb-2">
            Requisição do Sistema (POST /api/pedidos)
          </h3>
          <p className="text-dark-300 text-sm mb-3">
            Gere pedidos diretamente na tela de pedidos deste supermercado.
          </p>

          <div className="space-y-3">
            <div className="bg-dark-800 p-3 rounded border border-dark-700">
              <p className="text-dark-200 text-sm mb-1">
                <span className="text-dark-400">URL:</span> {systemOrderUrl}
              </p>
              <p className="text-dark-200 text-sm mb-1">
                <span className="text-dark-400">Método:</span> POST
              </p>

              {/* 🧩 Headers - corrigido */}
              <p className="text-dark-200 text-sm mb-2 break-words whitespace-pre-wrap leading-relaxed">
                <span className="text-dark-400">Headers:</span>{' '}
                <code className="text-xs bg-dark-900 px-1 py-0.5 rounded">
                  Content-Type: application/json
                </code>{' '}
                e{' '}
                <code className="text-xs bg-dark-900 px-1 py-0.5 rounded">
                  Authorization: Bearer {integrationToken ? '...' : '<TOKEN_DO_SUPERMERCADO>'}
                </code>
              </p>

              {/* Token */}
              <div className="p-2 rounded bg-dark-900 border border-dark-700 text-sm">
                <p className="text-dark-200 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>
                    <span className="text-dark-400">Token do Supermercado:</span>{' '}
                    <input
                      type="text"
                      className="bg-dark-700 text-white px-2 py-1 rounded border border-dark-600 ml-2 w-64"
                      value={manualIntegrationToken !== undefined ? manualIntegrationToken : (integrationToken || '')}
                      onChange={e => setManualIntegrationToken(e.target.value)}
                      placeholder="Digite ou cole o token aqui"
                    />
                  </span>
                  <button
                    onClick={() => {
                      const tokenToCopy = manualIntegrationToken || integrationToken
                      if (tokenToCopy) {
                        navigator.clipboard.writeText(tokenToCopy)
                        window.alert('Token do supermercado copiado!')
                      } else {
                        window.alert('Token não disponível no momento.')
                      }
                    }}
                    className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white rounded flex items-center justify-center text-xs"
                  >
                    <Copy size={14} className="mr-1" /> Copiar
                  </button>
                  <button
                    onClick={async () => {
                      if (!manualIntegrationToken) {
                        window.alert('Por favor, insira um token antes de salvar.')
                        return
                      }
                      
                      try {
                        await saveCustomToken(selectedSupermarket.id, manualIntegrationToken)
                        // Também salva no localStorage como backup
                        localStorage.setItem(`manual_integration_token_${selectedSupermarket.id}`, manualIntegrationToken)
                        window.alert('Token salvo com sucesso no sistema!')
                      } catch (error) {
                        console.error('Erro ao salvar token:', error)
                        window.alert('Erro ao salvar token: ' + (error?.response?.data?.detail || error.message))
                      }
                    }}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded flex items-center justify-center text-xs"
                  >
                    Salvar Token
                  </button>
                </p>
                <p className="text-dark-400 text-xs">
                  Este token identifica o supermercado para o agente. Você pode editar manualmente.
                </p>
              </div>

              {/* JSON Body */}
              <p className="text-dark-200 text-sm mt-3">
                <span className="text-dark-400">Body (JSON):</span>
              </p>
              <pre className="mt-2 text-xs text-dark-200 overflow-auto max-h-48 whitespace-pre-wrap bg-dark-900 rounded p-2 border border-dark-700">
                {JSON.stringify(systemOrderExampleBody, null, 2)}
              </pre>
            </div>

            {/* Botões */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOrderTest}
                disabled={isTestingIntegration}
                className="px-3 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white rounded text-sm flex items-center gap-2"
              >
                {isTestingIntegration ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Testar Pedido
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const token = integrationToken || '<TOKEN_DO_SUPERMERCADO>'
                  // Copia cURL em uma única linha para evitar problemas com barras e quebras de linha
                  const curl = [
                    'curl -X POST',
                    `'${systemOrderUrl}'`,
                    "-H 'Content-Type: application/json'",
                    `-H 'Authorization: Bearer ${token}'`,
                    `-d '${JSON.stringify(systemOrderExampleBody)}'`
                  ].join(' ')
                  navigator.clipboard.writeText(curl)
                  window.alert('Comando cURL copiado!')
                }}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded text-sm"
              >
                Copiar cURL
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(systemOrderUrl)
                  window.alert('URL copiada!')
                }}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded text-sm"
              >
                Copiar URL
              </button>
            </div>

            <p className="text-dark-400 text-xs mt-2">
              Para obter o token, faça login como o usuário do supermercado em{' '}
              <code>{API_BASE_URL}/api/auth/login</code> e use o <code>access_token</code> retornado no header <code>Authorization</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="p-3 border-t border-dark-700 flex justify-end bg-dark-800 sticky bottom-0">
        <button
          onClick={() => setShowDetailsModal(false)}
          className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
)}


      {/* Modal de senha para exclusão forçada */}
      {showForceDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-white">Confirmar exclusão forçada</h3>
              <button
                className="text-dark-300 hover:text-white"
                onClick={() => { setShowForceDeleteModal(false); setPendingDeleteId(null); setAdminPasswordInput('') }}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-dark-300">Para continuar, digite a senha do administrador.</p>
              <input
                type="password"
                className="w-full bg-dark-700 text-white px-3 py-2 rounded border border-dark-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Senha do administrador"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-dark-700">
              <button
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded"
                onClick={() => { setShowForceDeleteModal(false); setPendingDeleteId(null); setAdminPasswordInput('') }}
              >
                Cancelar
              </button>
              <button
                className={`px-3 py-2 rounded text-white ${isDeletingForced ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={isDeletingForced}
                onClick={confirmForceDelete}
              >
                {isDeletingForced ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Supermarkets
