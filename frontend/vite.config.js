import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Carrega variáveis de ambiente
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('🔧 Vite mode:', mode)
  console.log('🔧 VITE_API_BASE_URL from loadEnv:', env.VITE_API_BASE_URL)
  
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true
    },
    define: {
      // Força a definição da variável se não estiver sendo carregada
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        // No deploy unificado, o frontend e backend compartilham o mesmo host.
        // Portanto, o fallback deve ser relativo: '/api'.
        env.VITE_API_BASE_URL || '/api'
      )
    }
  }
})