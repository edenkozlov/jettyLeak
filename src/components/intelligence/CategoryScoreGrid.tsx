import type { CategoryScore } from '@/lib/scoring'

import { CategoryScoreCard } from './CategoryScoreCard'

interface CategoryScoreGridProps {
  categories: CategoryScore[]
}

export function CategoryScoreGrid({ categories }: CategoryScoreGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {categories.map((c, i) => (
        <CategoryScoreCard key={c.key} category={c} index={i} />
      ))}
    </div>
  )
}
