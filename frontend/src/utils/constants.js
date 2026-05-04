export const API_URL = '/api';
export const ROOT_URL = ''; 
export const TYPE_COLORS = {
  'Preventivo': '#10b981',
  'Correctivo': '#ef4444',
  'Predictivo': '#3b82f6',
  'Diario': '#6366f1',
  'Mensual': '#f59e0b',
  'Fin de año': '#8b5cf6'
};

export const DEFAULT_COLOR = '#64748b';

export function getTypeColor(type) {
  return TYPE_COLORS[type] || DEFAULT_COLOR;
}
