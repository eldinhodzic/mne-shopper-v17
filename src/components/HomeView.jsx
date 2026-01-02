import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { supabase } from '../lib/supabase'
import { SkeletonList } from './Skeleton'
import { useLanguage } from '../hooks/useLanguage'

export default function HomeView({ 
  receipts, 
  priceChanges,
  communityStats,
  onViewReceipt, 
  onViewProducts, 
  onViewChange,
  onViewInflation,
  onViewShare
}) {
  const { t } = useLanguage()
  const [deals, setDeals] = useState([])
  const [inflation, setInflation] = useState(null)
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [lastVisit, setLastVisit] = useState(null)

  useEffect(() => {
    loadDealsAndInflation()
    trackVisit()
  }, [])

  function trackVisit() {
    const last = localStorage.getItem('mne_last_visit')
    if (last) {
      setLastVisit(new Date(last))
    }
    localStorage.setItem('mne_last_visit', new Date().toISOString())
  }

  async function loadDealsAndInflation() {
    setLoadingDeals(true)
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: pricesData } = await supabase
        .from('prices')
        .select(`
          price,
          scanned_at,
          products(code, name),
          stores(name, city)
        `)
        .gte('scanned_at', sevenDaysAgo.toISOString())
        .order('scanned_at', { ascending: false })
        .limit(500)
      
      if (pricesData) {
        const productPrices = {}
        pricesData.forEach(p => {
          const code = p.products?.code
          if (!code) return
          if (!productPrices[code]) {
            productPrices[code] = {
              name: p.products.name,
              code,
              prices: []
            }
          }
          productPrices[code].prices.push({
            price: parseFloat(p.price),
            date: new Date(p.scanned_at),
            store: p.stores?.name
          })
        })

        const foundDeals = []
        Object.values(productPrices).forEach(product => {
          if (product.prices.length < 2) return
          product.prices.sort((a, b) => b.date - a.date)
          
          const latest = product.prices[0]
          const older = product.prices.slice(1)
          const avgOlder = older.reduce((s, p) => s + p.price, 0) / older.length
          
          const drop = avgOlder - latest.price
          const dropPercent = (drop / avgOlder) * 100
          
          if (dropPercent >= 5 && drop >= 0.10) {
            foundDeals.push({
              code: product.code,
              name: product.name,
              currentPrice: latest.price,
              previousPrice: avgOlder,
              dropPercent,
              store: latest.store,
              date: latest.date
            })
          }
        })

        foundDeals.sort((a, b) => b.dropPercent - a.dropPercent)
        setDeals(foundDeals.slice(0, 5))
      }

      // Calculate personal inflation
      if (receipts.length >= 2) {
        const now = new Date()
        const thisMonth = receipts.filter(r => {
          const d = new Date(r.date)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        
        const lastMonth = receipts.filter(r => {
          const d = new Date(r.date)
          const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          return d.getMonth() === lastM.getMonth() && d.getFullYear() === lastM.getFullYear()
        })
        
        if (thisMonth.length > 0 && lastMonth.length > 0) {
          const thisMonthTotal = thisMonth.reduce((s, r) => s + (r.total || 0), 0)
          const lastMonthTotal = lastMonth.reduce((s, r) => s + (r.total || 0), 0)
          
          const avgThis = thisMonthTotal / thisMonth.length
          const avgLast = lastMonthTotal / lastMonth.length
          
          const change = ((avgThis - avgLast) / avgLast) * 100
          
          setInflation({
            current: avgThis,
            previous: avgLast,
            change,
            thisMonthCount: thisMonth.length,
            lastMonthCount: lastMonth.length
          })
        }
      }
    } catch (err) {
      console.error('Error loading deals:', err)
    } finally {
      setLoadingDeals(false)
    }
  }

  const hasNewDeals = lastVisit && deals.some(deal => {
    const dealDate = new Date(deal.date)
    return dealDate > lastVisit
  })

  return (
    <div className="animate-fade-in space-y-5">
      
      {/* Welcome Hero */}
      <section className="bg-gradient-to-br from-blue-600/15 via-cyan-600/10 to-emerald-600/5 rounded-2xl p-5 border border-cyan-500/20 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-xl text-heading mb-1">{t('home.welcome')} 👋</h1>
            <p className="text-sm text-dark-400">
              {receipts.length === 0 
                ? t('home.scanFirst')
                : t('home.tracking', { count: communityStats?.total_products || 0 })
              }
            </p>
          </div>
          {communityStats && (
            <div className="bg-dark-900/60 rounded-xl px-3 py-2 text-right backdrop-blur-sm border border-white/5">
              <p className="text-xl text-price text-cyan-400">
                {communityStats.total_stores || 0}
              </p>
              <p className="text-caption text-dark-500">{t('common.stores')}</p>
            </div>
          )}
        </div>
        
        {/* Quick Stats */}
        {receipts.length > 0 && (
          <div className="flex gap-3 mt-4">
            <QuickStat 
              icon="🧾" 
              value={receipts.length} 
              label={t('home.receipts')} 
            />
            <QuickStat 
              icon="📦" 
              value={new Set(receipts.flatMap(r => r.items?.map(i => i.code) || [])).size} 
              label={t('home.products')} 
            />
            <QuickStat 
              icon="💰" 
              value={`€${receipts.reduce((s, r) => s + (r.total || 0), 0).toFixed(0)}`} 
              label={t('home.total')} 
            />
          </div>
        )}
      </section>

      {/* Personal Inflation Card */}
      {inflation && (
        <section className="animate-slide-up">
          <InflationCard inflation={inflation} t={t} />
        </section>
      )}

      {/* Hot Deals Section */}
      {deals.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <h2 className="text-sm font-semibold">{t('home.deals')}</h2>
              {hasNewDeals && (
                <span className="animate-pop-in bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  {t('home.newDeals')}
                </span>
              )}
            </div>
            <span className="text-xs text-dark-400">{t('home.last7days')}</span>
          </div>
          
          <div className="space-y-2 stagger-children">
            {deals.map((deal) => (
              <DealCard key={deal.code} deal={deal} />
            ))}
          </div>
        </section>
      )}

      {/* Loading State for Deals - Skeleton */}
      {loadingDeals && deals.length === 0 && (
        <section className="animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="skeleton w-6 h-6 rounded" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
          <SkeletonList count={3} type="deal" />
        </section>
      )}

      {/* Price Changes Section */}
      {priceChanges.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-caption text-dark-400 mb-3 flex items-center gap-2">
            <Icons.TrendUp className="w-4 h-4" />
            {t('home.priceChanges')}
          </h2>
          <div className="space-y-2 stagger-children">
            {priceChanges.slice(0, 4).map((change) => (
              <PriceChangeCard 
                key={change.code} 
                change={change} 
                onClick={() => onViewChange(change)} 
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      {receipts.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onViewInflation}
              className="card-interactive bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20 text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📊</span>
                <span className="text-sm font-semibold">{t('home.inflation')}</span>
              </div>
              <p className="text-xs text-dark-400">{t('home.inflationDesc')}</p>
            </button>
            
            <button
              onClick={onViewShare}
              className="card-interactive bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20 text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📤</span>
                <span className="text-sm font-semibold">{t('home.share')}</span>
              </div>
              <p className="text-xs text-dark-400">{t('home.shareStats')}</p>
            </button>
          </div>
        </section>
      )}

      {/* Recent Receipts */}
      <section className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h2 className="text-caption text-dark-400 mb-3 flex items-center gap-2">
          <Icons.Receipt className="w-4 h-4" />
          {t('home.recentReceipts')}
        </h2>
        {receipts.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          <div className="space-y-2 stagger-children">
            {receipts.slice(0, 4).map((receipt) => (
              <ReceiptCard 
                key={receipt.id} 
                receipt={receipt} 
                onClick={() => onViewReceipt(receipt)}
                t={t}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function QuickStat({ icon, value, label }) {
  return (
    <div className="flex-1 bg-dark-800/50 rounded-xl px-3 py-2.5 text-center animate-scale-in">
      <span className="text-lg">{icon}</span>
      <p className="text-base text-price mt-1 number-pop">{value}</p>
      <p className="text-caption text-dark-500 mt-0.5">{label}</p>
    </div>
  )
}

function InflationCard({ inflation, t }) {
  const isUp = inflation.change > 0
  const absChange = Math.abs(inflation.change)
  
  return (
    <div className={`rounded-2xl p-4 border ${
      isUp 
        ? 'bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20' 
        : 'bg-gradient-to-br from-green-500/10 to-cyan-500/5 border-green-500/20'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{isUp ? '📈' : '📉'}</span>
            <h3 className="text-sm text-heading">{t('inflation.title')}</h3>
          </div>
          <p className="text-sm text-dark-400">
            {t('inflation.avgReceipt')}: <span className="text-price-sm">€{inflation.current.toFixed(2)}</span> {t('inflation.vs')} <span className="text-price-sm text-dark-500">€{inflation.previous.toFixed(2)}</span>
          </p>
        </div>
        
        <div className={`text-right px-3 py-2 rounded-xl ${
          isUp ? 'bg-red-500/20' : 'bg-green-500/20'
        }`}>
          <p className={`text-2xl text-price ${
            isUp ? 'text-red-400' : 'text-green-400'
          }`}>
            {isUp ? '+' : '-'}{absChange.toFixed(1)}%
          </p>
          <p className="text-caption text-dark-500 mt-0.5">{t('inflation.thisMonth')}</p>
        </div>
      </div>
    </div>
  )
}

function DealCard({ deal }) {
  return (
    <div className="card-glow card-interactive bg-gradient-to-r from-green-500/10 via-dark-850 to-dark-800 rounded-xl p-4 border border-green-500/25 hover:border-green-400/50">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
          <Icons.TrendDown />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium truncate">{deal.name}</p>
          <p className="text-sm text-dark-400 mt-0.5">{deal.store}</p>
        </div>
        
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-dark-500 line-through">
              €{deal.previousPrice.toFixed(2)}
            </span>
            <span className="text-lg text-price text-green-400 success-glow">
              €{deal.currentPrice.toFixed(2)}
            </span>
          </div>
          <span className="deal-pulse inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-green-500/25 text-green-400 border border-green-500/30">
            -{deal.dropPercent.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function PriceChangeCard({ change, onClick }) {
  const isUp = change.direction === 'up'
  
  return (
    <div
      onClick={onClick}
      className="card-interactive bg-dark-800 rounded-xl p-4 flex items-center gap-3 cursor-pointer border border-white/5 hover:border-cyan-500/30"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        isUp ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
      }`}>
        {isUp ? <Icons.TrendUp /> : <Icons.TrendDown />}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{change.name}</p>
        <p className="text-xs text-dark-400 mt-0.5">{change.store}</p>
      </div>
      
      <div className="text-right">
        <p className={`text-sm font-semibold ${isUp ? 'text-red-400' : 'text-green-400'}`}>
          {isUp ? '+' : ''}{change.changePercent?.toFixed(0) || 0}%
        </p>
        <p className="text-xs text-dark-500">
          €{change.oldPrice?.toFixed(2)} → €{change.newPrice?.toFixed(2)}
        </p>
      </div>
    </div>
  )
}

function ReceiptCard({ receipt, onClick, t }) {
  const date = new Date(receipt.date)
  
  return (
    <div
      onClick={onClick}
      className="card-glow bg-dark-800 rounded-xl p-4 cursor-pointer border border-white/5 hover:border-cyan-500/30 hover:bg-dark-750 active:scale-[0.98] transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 flex-shrink-0">
          <Icons.Store />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium truncate">{receipt.store}</p>
          <p className="text-sm text-dark-400 mt-0.5">
            {date.toLocaleDateString('sr-Latn-ME', { 
              day: 'numeric', 
              month: 'short'
            })}
            <span className="mx-1.5 text-dark-600">•</span>
            {receipt.items?.length || 0} {t('home.items')}
          </p>
        </div>
        
        <div className="text-right flex-shrink-0">
          <p className="text-lg text-price font-bold text-cyan-400">
            €{receipt.total?.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ t }) {
  return (
    <div className="bg-dark-800/50 rounded-2xl p-8 text-center border border-dashed border-dark-700">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
        <Icons.Scan className="w-8 h-8 text-cyan-400" />
      </div>
      <h3 className="text-base font-semibold mb-2">{t('empty.startScanning')}</h3>
      <p className="text-sm text-dark-400 mb-4">
        {t('empty.scanDescription')}
      </p>
      <p className="text-xs text-dark-500">
        {t('empty.pressScan')} ↓
      </p>
    </div>
  )
}
