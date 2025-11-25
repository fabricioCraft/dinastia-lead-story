import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useFilters } from '@/contexts/FilterContext'

export default function ActiveFilters() {
  const { filters, clearCategoricalFilter, clearAllCategoricalFilters } = useFilters()
  const cf = filters.categoricalFilters

  const items = [
    cf.campaign ? { key: 'campaign', label: 'Campanha', value: cf.campaign } : null,
    cf.source ? { key: 'source', label: 'Fonte', value: cf.source } : null,
    cf.content ? { key: 'content', label: 'Conteúdo', value: cf.content } : null,
    cf.classification ? { key: 'classification', label: 'Classificação', value: cf.classification } : null,
  ].filter(Boolean) as Array<{ key: keyof typeof cf; label: string; value: string }>

  if (items.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map(item => (
        <Badge key={String(item.key)} variant="secondary" className="flex items-center gap-2">
          <span>{item.label}: {item.value}</span>
          <button onClick={() => clearCategoricalFilter(item.key)} aria-label="Remover filtro">
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Button variant="outline" size="sm" onClick={() => clearAllCategoricalFilters()}>Limpar filtros</Button>
    </div>
  )
}
