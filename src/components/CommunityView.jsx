import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../hooks/useLanguage'

// Reuse categories from ShoppingListView
const CATEGORIES = [
  { id: 'dairy', icon: '🥛', keywords: ['mlijeko', 'milk', 'sir', 'cheese', 'jogurt', 'yogurt', 'maslac', 'butter', 'pavlaka', 'cream'] },
  { id: 'meat', icon: '🥩', keywords: ['meso', 'meat', 'piletina', 'chicken', 'junetina', 'beef', 'svinjetina', 'pork', 'riba', 'fish', 'kobasica', 'sausage'] },
  { id: 'bakery', icon: '🍞', keywords: ['hljeb', 'bread', 'pecivo', 'pastry', 'kifla', 'croissant', 'burek', 'pita'] },
  { id: 'fruits', icon: '🥬', keywords: ['voće', 'fruit', 'povrće', 'vegetable', 'jabuka', 'apple', 'banana', 'paradajz', 'tomato', 'krompir', 'potato', 'luk', 'onion'] },
  { id: 'drinks', icon: '🥤', keywords: ['voda', 'water', 'sok', 'juice', 'pivo', 'beer', 'vino', 'wine', 'kafa', 'coffee', 'čaj', 'tea', 'cola'] },
  { id: 'snacks', icon: '🍪', keywords: ['čips', 'chips', 'čokolada', 'chocolate', 'keks', 'biscuit', 'slatkiši', 'candy', 'grickalice', 'snack'] },
  { id: 'hygiene', icon: '🧴', keywords: ['sapun', 'soap', 'šampon', 'shampoo', 'pasta', 'toothpaste', 'toalet', 'toilet', 'pelene', 'diaper'] },
  { id: 'household', icon: '🧹', keywords: ['deterdžent', 'detergent', 'sredstvo', 'cleaner', 'smeće', 'garbage', 'folija', 'foil'] }
]

export default function CommunityView({ onProductClick, onClose }) {
  const { t } = useLanguage()
  const [stats, setStats] = useState({ products: 0, stores: 0, prices: 0 })
  const [topSavings, setTopSavings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryProducts, setCategoryProducts] = useState([])
  const [loadingCategory, setLoadingCategory] = useState(false)

  useEffect(() => {
    loadCommunityData()
  }, [])

  // Search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchProducts(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function loadCommunityData() {
    setLoading(true)
    try {
      // Get stats
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
      
      const { count: storeCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })
      
      const { count: priceCount } = await supabase
        .from('prices')
        .select('*', { count: 'exact', head: true })
      
      setStats({
        products: productCount || 0,
        stores: storeCount || 0,
        prices: priceCount || 0
      })

      // Get top savings (products with biggest price differences)
      const { data: pricesData } = await supabase
        .from('latest_prices')
        .select('*')
        .order('product_name')
      
      if (pricesData) {
        // Group by product and calculate savings
        const productMap = {}
        pricesData.forEach(p => {
          if (!productMap[p.product_code]) {
            productMap[p.product_code] = {
              code: p.product_code,
              name: p.product_name,
              prices: [],
              minPrice: Infinity,
              maxPrice: 0,
              cheapestStore: ''
            }
          }
          const price = parseFloat(p.price)
          productMap[p.product_code].prices.push(price)
          if (price < productMap[p.product_code].minPrice) {
            productMap[p.product_code].minPrice = price
            productMap[p.product_code].cheapestStore = p.store_name
          }
          if (price > productMap[p.product_code].maxPrice) {
            productMap[p.product_code].maxPrice = price
          }
        })

        // Calculate savings percentage and sort
        const withSavings = Object.values(productMap)
          .filter(p => p.prices.length > 1 && p.maxPrice > p.minPrice)
          .map(p => ({
            ...p,
            savingsPercent: Math.round((1 - p.minPrice / p.maxPrice) * 100)
          }))
          .sort((a, b) => b.savingsPercent - a.savingsPercent)
          .slice(0, 6)

        setTopSavings(withSavings)
      }
    } catch (err) {
      console.error('Error loading community data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function searchProducts(query) {
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('code, name, unit')
        .ilike('name', `%${query}%`)
        .limit(10)
      
      if (!error && data) {
        setSearchResults(data)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }

  async function loadCategoryProducts(category) {
    setLoadingCategory(true)
    setSelectedCategory(category)
    
    try {
      const keywords = category.keywords
      let allProducts = []
      
      for (const keyword of keywords.slice(0, 3)) {
        const { data, error } = await supabase
          .from('products')
          .select('code, name, unit')
          .ilike('name', `%${keyword}%`)
          .limit(15)
        
        if (!error && data) {
          allProducts = [...allProducts, ...data]
        }
      }
      
      // Remove duplicates
      const unique = allProducts.filter((p, i, arr) => 
        arr.findIndex(x => x.code === p.code) === i
      )
      
      setCategoryProducts(unique)
    } catch (err) {
      console.error('Error loading category:', err)
    } finally {
      setLoadingCategory(false)
    }
  }

  function handleProductClick(product) {
    onProductClick({
      code: product.code,
      name: product.name,
      unit: product.unit
    })
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm"
        >
          <Icons.ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Icons.Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold">{t('community.title')}</h1>
          <p className="text-xs text-dark-400">{t('community.subtitle')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="bg-dark-800 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-white/5 focus-within:border-cyan-500/30 transition-colors">
          <Icons.Search className="w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder={t('community.searchProducts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-dark-500 text-sm"
          />
          {searching && (
            <div className="w-4 h-4 border-2 border-dark-600 border-t-cyan-400 rounded-full animate-spin" />
          )}
          {searchQuery && !searching && (
            <button onClick={() => setSearchQuery('')} className="text-dark-400 hover:text-white">
              <Icons.Close className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 rounded-xl border border-white/10 overflow-hidden z-10 shadow-xl max-h-64 overflow-y-auto">
            {searchResults.map(product => (
              <button
                key={product.code}
                onClick={() => {
                  handleProductClick(product)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="w-full px-4 py-3 text-left hover:bg-dark-700 transition-colors flex items-center gap-3"
              >
                <Icons.ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-sm truncate">{product.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Community Stats */}
      <div className="bg-dark-800/50 rounded-xl px-4 py-3 mb-4 flex items-center justify-center gap-4 text-sm border border-white/5">
        <span className="text-dark-300">
          <span className="text-cyan-400 font-semibold">{stats.products}</span> {t('community.products').toLowerCase()}
        </span>
        <span className="text-dark-600">•</span>
        <span className="text-dark-300">
          <span className="text-cyan-400 font-semibold">{stats.stores}</span> {t('community.stores').toLowerCase()}
        </span>
        <span className="text-dark-600">•</span>
        <span className="text-dark-300">
          <span className="text-cyan-400 font-semibold">{stats.prices >= 1000 ? `${(stats.prices/1000).toFixed(1)}k` : stats.prices}</span> {t('community.pricesCount')}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-dark-700 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Savings */}
          {topSavings.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span>🔥</span> {t('community.topSavings')}
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {topSavings.map(product => (
                  <button
                    key={product.code}
                    onClick={() => handleProductClick(product)}
                    className="flex-shrink-0 bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-xl p-3 min-w-[140px] text-left hover:border-green-500/40 transition-all active:scale-95"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-green-400 text-xs font-bold">-{product.savingsPercent}%</span>
                    </div>
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-dark-400 mt-0.5 truncate">{product.cheapestStore}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span>📁</span> {t('compare.categories')}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => loadCategoryProducts(category)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-dark-800 hover:bg-dark-750 border border-white/5 hover:border-cyan-500/30 rounded-xl transition-all active:scale-95"
                >
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-[10px] text-dark-300 text-center leading-tight">{t(`category.${category.id}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stores Quick Links */}
          <div>
            <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span>🏪</span> {t('community.stores')}
            </h3>
            <p className="text-sm text-dark-500">{t('community.storesHint')}</p>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCategory(null)} />
          <div className="relative bg-dark-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[70vh] overflow-hidden border border-white/10">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedCategory.icon}</span>
                <h3 className="text-sm font-semibold">{t(`category.${selectedCategory.id}`)}</h3>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="text-dark-400 hover:text-white">
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[50vh] p-2">
              {loadingCategory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-dark-600 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="text-center py-8 text-dark-400 text-sm">
                  {t('compare.noData')}
                </div>
              ) : (
                <div className="space-y-1">
                  {categoryProducts.map(product => (
                    <button
                      key={product.code}
                      onClick={() => {
                        handleProductClick(product)
                        setSelectedCategory(null)
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-dark-800 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <Icons.ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-sm truncate">{product.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
