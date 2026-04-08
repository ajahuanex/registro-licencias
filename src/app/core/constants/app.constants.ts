export const ESTADOS_SISTEMA = [
  'EN PROCESO',
  'IMPRESO',
  'VERIFICADO',
  'ENTREGADO',
  'OBSERVADO',
  'RECHAZADO',
  'ANULADO',
  'ATENDIDO'
] as const;

export type EstadoExpediente = typeof ESTADOS_SISTEMA[number];


export const PERFILES_SISTEMA = [
  'REGISTRADOR',
  'IMPRESOR',
  'SUPERVISOR',
  'ENTREGADOR',
  'DIRECTIVO',
  'ADMINISTRADOR',
  'OTI',
  'BLOQUEADO'
] as const;

export type PerfilSistema = typeof PERFILES_SISTEMA[number];

export const ESTADOS_POR_PERFIL: Record<string, string[]> = {
  REGISTRADOR:      ['EN PROCESO', 'OBSERVADO', 'RECHAZADO'],
  IMPRESOR:         ['IMPRESO', 'OBSERVADO', 'EN PROCESO'],
  SUPERVISOR:       ['VERIFICADO', 'OBSERVADO', 'RECHAZADO', 'ANULADO', 'EN PROCESO'],
  ENTREGADOR:       ['ENTREGADO', 'OBSERVADO'],
  DIRECTIVO:        [],
  ADMINISTRADOR:    [...ESTADOS_SISTEMA],
  OTI:              [...ESTADOS_SISTEMA],
};
