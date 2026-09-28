// custom/config/index.ts — SEUS campos de config. Viram um card no /config (o dono preenche).
// Exemplo completo em custom/CLAUDE.md. Pra zerar: deixe o array vazio (NÃO delete o arquivo).
import { type ConfigCustom } from '@/server/custom/contrato'

// Exemplo (descomente e ajuste):
//
// import { definirConfigCustom } from '@/server/custom/contrato'
//
// const hottok = definirConfigCustom({ chave: 'custom_hotmart_hottok', rotulo: 'Hottok da Hotmart', tipo: 'segredo' })

export const CONFIGS: ConfigCustom[] = []
