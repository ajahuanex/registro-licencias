export const ESTADOS_SISTEMA = [
  'EN PROCESO',
  'IMPRESO',
  'ATENDIDO',
  'ENTREGADO',
  'OBSERVADO',
  'RECHAZADO',
  'ANULADO'
] as const;

export type EstadoExpediente = typeof ESTADOS_SISTEMA[number];

export const PERFILES_SISTEMA = [
  'REGISTRADOR',
  'OPERADOR',
  'SUP_IMPRESION',
  'SUP_CALIDAD',
  'SUPERVISOR',
  'ENTREGADOR',
  'ADMINISTRADOR',
  'OTI'
] as const;

export type PerfilSistema = typeof PERFILES_SISTEMA[number];

export const ESTADOS_POR_PERFIL: Record<string, string[]> = {
  REGISTRADOR:      ['EN PROCESO', 'OBSERVADO', 'RECHAZADO'],
  OPERADOR:         ['EN PROCESO', 'OBSERVADO', 'RECHAZADO'],
  SUP_IMPRESION:    ['IMPRESO', 'OBSERVADO', 'RECHAZADO'],
  SUP_CALIDAD:      ['ATENDIDO', 'OBSERVADO', 'RECHAZADO'],
  SUPERVISOR:       ['EN PROCESO', 'IMPRESO', 'ATENDIDO', 'OBSERVADO', 'RECHAZADO', 'ANULADO'],
  ENTREGADOR:       ['ENTREGADO'],
  ADMINISTRADOR:    [...ESTADOS_SISTEMA],
  OTI:              [...ESTADOS_SISTEMA],
};
