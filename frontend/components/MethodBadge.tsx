import React from 'react';
import { Method } from '../types';

const methodColors: Record<Method, string> = {
  [Method.GET]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [Method.POST]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  [Method.PUT]: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  [Method.DELETE]: 'bg-red-500/10 text-red-400 border-red-500/20',
  [Method.PATCH]: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export const MethodBadge: React.FC<{ method: Method; className?: string }> = ({ method, className = '' }) => {
  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider border ${methodColors[method]} ${className}`}>
      {method}
    </span>
  );
};