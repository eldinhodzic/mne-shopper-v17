import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { useLanguage } from '../hooks/useLanguage'
import { 
  getFavoritesWithDetails, 
  removeFromFavorites, 
  setPriceAlert, 
  removePriceAlert,
  getTriggeredAlerts
} from '../lib/db'

export default function FavoritesView({ onClose, onViewProducts, onViewProduct }) {
  const { t } = useLanguage()
  const [favorites, setFavorites] = useState([])
  const [triggeredAlerts, setTriggeredAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingAlert, setEditingAlert] = useState(null)
  const [alertPrice, setAlertPrice] = useState('')

  useEffect(() => {
    loadFavorites()
  }, [])

  async function loadFavorites() {
    setLoading(true)
    try {
      const favs = await getFavoritesWithDetails()
      setFavorites(favs)
      
      const triggered = await getTriggeredAlerts()
      setTriggeredAlerts(triggered)
    } catch (err) {
      console.error('Error loading favorites:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveFavorite(code) {
    await removeFromFavorites(code)
    setFavorites(prev => prev.filter(f => f.code !== code))
  }

  async function handleSetAlert(code, currentPrice) {
    if (editingAlert === code) {
      // Save the alert
      const price = parseFloat(alertPrice)
      if (price > 0 && price < currentPrice) {
        await setPriceAlert(code, price)
        await loadFavorites()
      }
      setEditingAlert(null)
      setAlertPrice('')
    } else {
      // Start editing
      setEditingAlert(code)
      setAlertPrice((currentPrice * 0.9).toFixed(2)) // Default to 10% less
    }
  }

  async function handleRemoveAlert(code) {
    await removePriceAlert(code)
    await loadFavorites()
  }

  // Calculate summary stats
  const stats = {
    total: favorites.length,
    increases: favorites.filter(f => f.priceChange?.direction === 'up').length,
    decreases: favorites.filter(f => f.priceChange?.direction === 'down').length,
    alerts: favorites.filter(f => f.alert).length,
    triggered: triggeredAlerts.length
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4 text-sm"
      >
        <Icons.ChevronLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{t('favorites.title')}</h1>
          <p className="text-sm text-dark-400">{t('favorites.subtitle')}</p>
        </div>
        
        {favorites.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {stats.increases > 0 && (
              <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400">
                ↑ {stats.increases}
              </span>
            )}
            {stats.decreases > 0 && (
              <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400">
                ↓ {stats.decreases}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Triggered Alerts Banner */}
      {triggeredAlerts.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-xl p-4 border border-green-500/30 animate-pulse-subtle">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎉</span>
            <span className="font-semibold text-green-400">
              {t('favorites.alertTriggered')}
            </span>
          </div>
          <div className="space-y-1">
            {triggeredAlerts.map(alert => (
              <div key={alert.code} className="text-sm text-dark-300">
                {alert.product?.name} - €{alert.currentPrice?.toFixed(2)} 
                <span className="text-dark-500"> (target: €{alert.targetPrice?.toFixed(2)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && favorites.length === 0 && (
        <div className="bg-dark-800/50 rounded-2xl p-8 text-center border border-dashed border-dark-700">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⭐</span>
          </div>
          <h3 className="text-base font-semibold mb-2">{t('favorites.empty')}</h3>
          <p className="text-sm text-dark-400 mb-4">
            {t('favorites.emptyHint')}
          </p>
          <button
            onClick={onViewProducts}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors"
          >
            <Icons.Package className="w-4 h-4" />
            {t('favorites.addFromProducts')}
          </button>
        </div>
      )}

      {/* Favorites List */}
      {!loading && favorites.length > 0 && (
        <div className="space-y-3">
          {favorites.map(product => (
            <FavoriteCard
              key={product.code}
              product={product}
              onRemove={() => handleRemoveFavorite(product.code)}
              onSetAlert={() => handleSetAlert(product.code, product.latestPrice)}
              onRemoveAlert={() => handleRemoveAlert(product.code)}
              onViewProduct={() => onViewProduct(product.code)}
              isEditingAlert={editingAlert === product.code}
              alertPrice={alertPrice}
              onAlertPriceChange={setAlertPrice}
              onCancelAlert={() => { setEditingAlert(null); setAlertPrice('') }}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {!loading && favorites.length > 0 && (
        <div className="mt-6 p-4 bg-dark-800/50 rounded-xl border border-white/5">
          <h3 className="text-sm font-semibold mb-2">{t('favorites.priceChanges')}</h3>
          {stats.increases === 0 && stats.decreases === 0 ? (
            <p className="text-sm text-green-400">{t('favorites.allStable')}</p>
          ) : (
            <div className="flex gap-4 text-sm">
              {stats.increases > 0 && (
                <span className="text-red-400">
                  ↑ {stats.increases} {t('favorites.increases')}
                </span>
              )}
              {stats.decreases > 0 && (
                <span className="text-green-400">
                  ↓ {stats.decreases} {t('favorites.decreases')}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FavoriteCard({ 
  product, 
  onRemove, 
  onSetAlert, 
  onRemoveAlert, 
  onViewProduct,
  isEditingAlert,
  alertPrice,
  onAlertPriceChange,
  onCancelAlert,
  t 
}) {
  const latestHistory = product.history?.[0]
  const hasHistory = product.history?.length > 0
  
  return (
    <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
      {/* Main Content - Clickable */}
      <div 
        onClick={onViewProduct}
        className="p-4 cursor-pointer hover:bg-dark-750 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Price Change Indicator */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            product.priceChange?.direction === 'up' 
              ? 'bg-red-500/20 text-red-400'
              : product.priceChange?.direction === 'down'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-dark-700 text-dark-400'
          }`}>
            {product.priceChange?.direction === 'up' && <Icons.TrendUp />}
            {product.priceChange?.direction === 'down' && <Icons.TrendDown />}
            {!product.priceChange && <Icons.Package className="w-5 h-5" />}
          </div>
          
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{product.name}</h3>
            
            {hasHistory ? (
              <div className="mt-1">
                <p className="text-xs text-dark-400">
                  {t('favorites.lastPrice')}: 
                  <span className="text-cyan-400 font-mono ml-1">
                    €{latestHistory.price?.toFixed(2)}
                  </span>
                  <span className="text-dark-500 ml-1">
                    {t('favorites.at')} {latestHistory.store}
                  </span>
                </p>
                
                {/* Price Change Badge */}
                {product.priceChange && (
                  <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-xs ${
                    product.priceChange.direction === 'up'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {product.priceChange.direction === 'up' ? '↑' : '↓'}
                    {Math.abs(product.priceChange.percentChange).toFixed(1)}%
                    <span className="text-dark-500 ml-1">{t('favorites.thisWeek')}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-dark-500 mt-1">
                {t('favorites.noHistory')} - {t('favorites.scanToTrack')}
              </p>
            )}
          </div>
          
          {/* Current Price */}
          {hasHistory && (
            <div className="text-right flex-shrink-0">
              <p className={`text-lg font-bold font-mono ${
                product.priceChange?.direction === 'up' 
                  ? 'text-red-400'
                  : product.priceChange?.direction === 'down'
                    ? 'text-green-400'
                    : 'text-cyan-400'
              }`}>
                €{product.latestPrice?.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Alert Section */}
      {product.alert && !isEditingAlert && (
        <div className="px-4 py-2 bg-cyan-500/10 border-t border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <Icons.Bell className="w-3.5 h-3.5" />
            <span>{t('favorites.alertWhen')} €{product.alert.targetPrice?.toFixed(2)}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemoveAlert() }}
            className="text-xs text-dark-400 hover:text-red-400 transition-colors"
          >
            {t('favorites.removeAlert')}
          </button>
        </div>
      )}
      
      {/* Alert Editor */}
      {isEditingAlert && (
        <div className="px-4 py-3 bg-dark-700/50 border-t border-white/5">
          <p className="text-xs text-dark-400 mb-2">{t('favorites.alertWhen')}</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">€</span>
              <input
                type="number"
                step="0.01"
                value={alertPrice}
                onChange={(e) => onAlertPriceChange(e.target.value)}
                className="w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-2 pl-7 text-sm font-mono focus:border-cyan-500/50 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onSetAlert() }}
              className="px-3 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors"
            >
              {t('common.save')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCancelAlert() }}
              className="px-3 py-2 bg-dark-600 text-dark-300 rounded-lg text-sm hover:bg-dark-500 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
        {!product.alert && !isEditingAlert && hasHistory && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetAlert() }}
            className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-cyan-400 transition-colors"
          >
            <Icons.Bell className="w-3.5 h-3.5" />
            {t('favorites.alert')}
          </button>
        )}
        
        {(product.alert || isEditingAlert || !hasHistory) && <div />}
        
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-red-400 transition-colors"
        >
          <Icons.Trash className="w-3.5 h-3.5" />
          {t('favorites.remove')}
        </button>
      </div>
    </div>
  )
}
