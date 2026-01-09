import axios from 'axios'

// === Configuração da URL base ===
// Normaliza para sempre incluir o sufixo '/api' quando VITE_API_BASE_URL estiver definido
// Ex.: 'https://backend.example.com' -> 'https://backend.example.com/api'
//      '/api' (proxy local/unificado) permanece como '/api'
const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const API_BASE_URL = RAW_BASE_URL.endsWith('/api')
  ? RAW_BASE_URL
  : `${RAW_BASE_URL.replace(/\/$/, '')}/api`

console.log('🔗 API_BASE_URL (Container Unificado) =', API_BASE_URL)
console.log('🔧 VITE_API_BASE_URL from env =', import.meta.env.VITE_API_BASE_URL)
console.log('🏠 Current origin =', window.location.origin)

// === Instância principal do Axios ===
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// === Interceptores ===

// Interceptor de requisição - adiciona token e logs detalhados
api.interceptors.request.use(
  (config) => {
    console.log('🚀 Fazendo requisição para:', (config.baseURL || '') + (config.url || ''))
    console.log('🔧 Config completa:', config)
    
    const token =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token')) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('token'))
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('❌ Erro no interceptor de requisição:', error)
    return Promise.reject(error)
  }
)

// Intercepta erros de autenticação (401) e de rede
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('❌ Falha de rede ao conectar com:', API_BASE_URL)
      alert('Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.')
    }

    if (error.response?.status === 401) {
      try {
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
      } catch {}
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

// === Auth ===
export const login = (credentials) => {
  const payload = {
    email: credentials.email,
    senha: credentials.senha ?? credentials.password,
  }
  return api.post('/auth/login', payload)
}

export const register = (userData) => api.post('/auth/register', userData)

// === Supermercados (Admin / Multitenant) ===
export const getSupermarkets = (tenantId = null) => {
  const params = {}
  if (tenantId) params.tenant_id = tenantId
  return api.get('/supermarkets/', { params })
}

export const getSupermarket = (id) => api.get(`/supermarkets/${id}`)
export const getSupermarketIntegrationToken = (id) => api.get(`/supermarkets/${id}/integration-token`)
export const resetSupermarketPassword = (id) => api.post(`/supermarkets/${id}/reset-password`)
export const saveCustomToken = (id, customToken) =>
  api.put(`/supermarkets/${id}/custom-token`, { custom_token: customToken })
export const createSupermarket = (supermarket) => api.post('/supermarkets/', supermarket)
export const updateSupermarket = (id, supermarket) => api.put(`/supermarkets/${id}`, supermarket)

export const deleteSupermarket = (id, options = {}) => {
  const { force = false, adminPassword } = options
  const data = force ? { force: true, admin_password: adminPassword } : undefined
  return api.delete(`/supermarkets/${id}`, data ? { data } : undefined)
}
export const getSupermarketHistory = (id) => api.get(`/supermarkets/${id}/history`)
export const uploadSupermarketLogo = (id, formData) =>
  api.post(`/supermarkets/${id}/upload-logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const getCEP = (cep) => api.get(`/supermarkets/cep/${cep}`)

// Testa integração do agente IA (server-to-server)
export const agentTest = (id, { url, payload, headers } = {}) => {
  return api.post(`/supermarkets/${id}/agent-test`, { url, payload, headers })
}

// === Clientes ===
export const getClients = (tenantId = null) => {
  const params = {}
  if (tenantId) params.tenant_id = tenantId
  return api.get('/clientes/', { params })
}
export const createClient = (client) => api.post('/clientes/', client)
export const updateClient = (id, client) => api.put(`/clientes/${id}`, client)
export const deleteClient = (id) => api.delete(`/clientes/${id}`)

// === Pedidos ===
export const getPedidos = (status = null, tenantId = null) => {
  const params = {}
  if (status) params.status = status
  if (tenantId) params.tenant_id = tenantId
  return api.get('/pedidos/', { params })
}
export const createPedido = (pedido) => api.post('/pedidos/', pedido)

export const createPedidoWithCustomToken = (pedido, customToken) => {
  console.log('🔧 createPedidoWithCustomToken usando API_BASE_URL:', API_BASE_URL)
  
  const customAxios = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customToken}`,
    },
  })
  
  // Adiciona interceptor de resposta para tratar erros de rede
  customAxios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ERR_NETWORK') {
        console.error('❌ Falha de rede ao conectar com:', API_BASE_URL)
        alert('Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.')
      }
      return Promise.reject(error)
    }
  )
  
  console.log('🚀 customAxios baseURL:', customAxios.defaults.baseURL)
  
  return customAxios.post('/pedidos/', pedido)
}

export const updatePedido = (id, pedido) => api.put(`/pedidos/${id}`, pedido)
export const deletePedido = (id) => api.delete(`/pedidos/${id}`)

// === Financeiro (Admin / Multitenant) ===
export const getFinanceiro = (tenantId) => api.get(`/admin/financeiro/${tenantId}`)
export const gerarFatura = (tenantId) => api.post(`/admin/financeiro/${tenantId}/fatura`)

// Exporta base normalizada para uso em páginas (evita duplicações /api/api)
export const API_BASE = API_BASE_URL

export default api
