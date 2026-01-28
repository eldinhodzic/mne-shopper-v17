import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { useLanguage } from '../hooks/useLanguage'
import { addToFavorites, removeFromFavorites, isFavorite } from '../lib/db'

export default function ProductsView({ products, onProductClick, onClose }) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteStates, setFavoriteStates] = useState({})
  
  // Load favorite states for all products
  useEffect(() => {
    async function loadFavoriteStates() {
      const states = {}
      for (const product of products) {
        states[product.code] = await isFavorite(product.code)
      }
      setFavoriteStates(states)
    }
    if (products?.length > 0) {
      loadFavoriteStates()
    }
  }, [products])
  
  async function toggleFavorite(e, code) {
    e.stopPropagation() // Prevent triggering product click
    
    if (favoriteStates[code]) {
      await removeFromFavorites(code)
      setFavoriteStates(prev => ({ ...prev, [code]: false }))
    } else {
      await addToFavorites(code)
      setFavoriteStates(prev => ({ ...prev, [code]: true }))
    }
  }
  
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.includes(searchQuery)
  )

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4 text-sm"
      >
        <Icons.ChevronLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      {/* Search */}
      <div className="bg-dark-800 rounded-xl p-3 flex items-center gap-3 mb-4 border border-white/5">
        <Icons.Search className="text-dark-400" />
        <input
          type="text"
          placeholder={t('common.search') + '...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-dark-500 text-[15px]"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="text-dark-400 hover:text-white"
          >
            <Icons.Close className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <EmptyState 
          icon={<Icons.Package className="w-8 h-8" />}
          title={searchQuery ? t('common.error') : t('favorites.empty')}
          description={searchQuery 
            ? t('errors.tryAgain')
            : t('favorites.emptyHint')
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product, i) => (
            <div
              key={product.id}
              onClick={() => onProductClick(product.code)}
              className="bg-dark-800 rounded-xl p-4 border border-white/5 hover:bg-dark-700 transition-colors cursor-pointer"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex justify-between items-center">
                {/* Favorite Toggle */}
                <button
                  onClick={(e) => toggleFavorite(e, product.code)}
                  className={`mr-3 p-1 rounded-lg transition-all ${
                    favoriteStates[product.code]
                      ? 'text-yellow-400 bg-yellow-500/20'
                      : 'text-dark-500 hover:text-yellow-400 hover:bg-yellow-500/10'
                  }`}
                >
                  {favoriteStates[product.code] 
                    ? <Icons.StarFilled className="w-5 h-5" />
                    : <Icons.Star className="w-5 h-5" />
                  }
                </button>
                
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-dark-400 font-mono mt-1">
                    {product.code}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[15px] font-semibold font-mono text-cyan-400">
                    {product.latestPrice?.toFixed(2)} €
                  </p>
                  <Icons.ChevronRight className="text-dark-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="bg-dark-800 rounded-2xl p-10 text-center border border-dashed border-dark-600">
      <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mx-auto mb-4 text-dark-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-dark-400 max-w-[240px] mx-auto">
        {description}
      </p>
    </div>
  )
}
