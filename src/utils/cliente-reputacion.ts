export interface ClienteReputacion {
  tipo: 'VIP' | 'CONFIABLE' | 'REGULAR' | 'RIESGO' | 'MOROSO';
  label: string;
  badgeClass: string;
  icon: string;
  descripcion: string;
  colorTexto: string;
}

export function getClienteReputacion(c: {
  score?: number;
  scoringCredito?: number;
  nivelCredito?: string;
  totalCompras?: number;
  comprasSinAtraso?: number;
  atrasoConsecutivo?: number;
  activo?: boolean;
} | null | undefined): ClienteReputacion {
  if (!c) {
    return {
      tipo: 'REGULAR',
      label: 'Cliente Regular',
      badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
      icon: '👤',
      descripcion: 'Sin historial crediticio suficiente',
      colorTexto: 'text-slate-600 dark:text-slate-400',
    };
  }

  const score = Number(c.score ?? c.scoringCredito ?? 100);
  const totalCompras = Number(c.totalCompras ?? 0);
  const comprasSinAtraso = Number(c.comprasSinAtraso ?? 0);
  const atrasos = Number(c.atrasoConsecutivo ?? 0);
  const nivel = c.nivelCredito || 'SIN_CREDITO';
  const activo = c.activo !== false;

  // 1. Moroso / Bloqueado / Alto riesgo
  if (!activo || atrasos >= 2 || score < 40) {
    return {
      tipo: 'MOROSO',
      label: 'Moroso / Alto Riesgo',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-extrabold shadow-2xs',
      icon: '🚨',
      descripcion: atrasos > 0 ? `${atrasos} pagos atrasados consecutivos` : 'Score crediticio en nivel crítico',
      colorTexto: 'text-rose-600 dark:text-rose-400',
    };
  }

  // 2. Con atrasos / Riesgo moderado
  if (atrasos === 1 || score < 65) {
    return {
      tipo: 'RIESGO',
      label: 'Riesgo / Con Atrasos',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold shadow-2xs',
      icon: '⚠️',
      descripcion: 'Presenta atraso reciente en pagos',
      colorTexto: 'text-amber-600 dark:text-amber-400',
    };
  }

  // 3. Cliente VIP / Excelente
  if (totalCompras >= 5 && (comprasSinAtraso >= 3 || nivel === 'NIVEL_3' || nivel === 'NIVEL_4' || score >= 85)) {
    return {
      tipo: 'VIP',
      label: 'Cliente VIP / Excelente',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-extrabold shadow-2xs',
      icon: '⭐',
      descripcion: `${totalCompras} compras realizadas • Pagos puntuales garantizados`,
      colorTexto: 'text-emerald-600 dark:text-emerald-400',
    };
  }

  // 4. Buen Cliente / Confiable
  if (totalCompras >= 2 || comprasSinAtraso >= 2 || nivel === 'NIVEL_2' || score >= 75) {
    return {
      tipo: 'CONFIABLE',
      label: 'Buen Cliente / Confiable',
      badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 font-bold shadow-2xs',
      icon: '🟢',
      descripcion: `${totalCompras > 0 ? `${totalCompras} compras • ` : ''}Historial positivo y cumplido`,
      colorTexto: 'text-teal-600 dark:text-teal-400',
    };
  }

  // 5. Cliente Nuevo / Regular
  return {
    tipo: 'REGULAR',
    label: 'Cliente Nuevo / Regular',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 font-semibold shadow-2xs',
    icon: '👤',
    descripcion: totalCompras > 0 ? `${totalCompras} compra registrada` : 'Cliente nuevo en la plataforma',
    colorTexto: 'text-blue-600 dark:text-blue-400',
  };
}
