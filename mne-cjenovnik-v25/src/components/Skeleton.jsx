export function SkeletonCard() {
  return (
    <div className="bg-dark-800 rounded-xl p-4 flex items-center gap-3 border border-white/5">
      <div className="w-11 h-11 rounded-xl skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 skeleton" />
        <div className="h-3 w-1/2 skeleton" />
      </div>
      <div className="h-5 w-16 skeleton" />
    </div>
  )
}

export function SkeletonDealCard() {
  return (
    <div className="bg-dark-800 rounded-xl p-4 flex items-center gap-3 border border-white/5">
      <div className="w-11 h-11 rounded-xl skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 skeleton" />
        <div className="h-3 w-1/3 skeleton" />
      </div>
      <div className="text-right space-y-2">
        <div className="h-5 w-14 skeleton ml-auto" />
        <div className="h-4 w-10 skeleton ml-auto rounded-md" />
      </div>
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="flex gap-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex-1 bg-dark-800/50 rounded-xl px-3 py-3 text-center">
          <div className="w-6 h-6 skeleton rounded-full mx-auto mb-2" />
          <div className="h-4 w-10 skeleton mx-auto mb-1" />
          <div className="h-3 w-12 skeleton mx-auto" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3, type = 'card' }) {
  const Component = type === 'deal' ? SkeletonDealCard : SkeletonCard
  
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="animate-fade-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Component />
        </div>
      ))}
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero skeleton */}
      <div className="bg-dark-800/50 rounded-2xl p-5 border border-white/5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <div className="h-6 w-32 skeleton" />
            <div className="h-4 w-48 skeleton" />
          </div>
          <div className="h-12 w-16 skeleton rounded-xl" />
        </div>
        <SkeletonStats />
      </div>
      
      {/* Section skeleton */}
      <div>
        <div className="h-4 w-28 skeleton mb-3" />
        <SkeletonList count={3} />
      </div>
    </div>
  )
}
