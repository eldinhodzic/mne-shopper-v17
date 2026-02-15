import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../hooks/useLanguage'

// Category definitions with keywords for search
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

export default function ShoppingListView({ onClose }) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [shoppingList, setShoppingList] = useState([])
  const [strategies, setStrategies] = useState(null)
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [popularProducts, setPopularProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryProducts, setCategoryProducts] = useState([])
  const [loadingCategory, setLoadingCategory] = useState(false)

  // Load popular products on mount
  useEffect(() => {
    loadPopularProducts()
  }, [])

  async function loadPopularProducts() {
    try {
      // Get most common products from prices table
      const { data, error } = await supabase
        .from('products')
        .select('code, name, unit')
        .limit(8)
      
      if (!error && data) {
        setPopularProducts(data)
      }
    } catch (err) {
      console.error('Error loading popular products:', err)
    }
  }

  async function loadCategoryProducts(category) {
    setLoadingCategory(true)
    setSelectedCategory(category)
    
    try {
      // Search products matching category keywords
      const keywords = category.keywords
      let allProducts = []
      
      // Search for each keyword
      for (const keyword of keywords.slice(0, 3)) {
        const { data, error } = await supabase
          .from('products')
          .select('code, name, unit')
          .ilike('name', `%${keyword}%`)
          .limit(10)
        
        if (!error && data) {
          allProducts = [...allProducts, ...data]
        }
      }
      
      // Remove duplicates and filter already added
      const uniqueProducts = allProducts.filter((p, index, self) => 
        index === self.findIndex(t => t.code === p.code) &&
        !shoppingList.some(item => item.code === p.code)
      ).slice(0, 15)
      
      setCategoryProducts(uniqueProducts)
    } catch (err) {
      console.error('Error loading category products:', err)
    } finally {
      setLoadingCategory(false)
    }
  }

  // Search products
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

  async function searchProducts(query) {
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('code, name, unit')
        .ilike('name', `%${query}%`)
        .limit(10)
      
      if (!error && data) {
        const filtered = data.filter(p => 
          !shoppingList.some(item => item.code === p.code)
        )
        setSearchResults(filtered)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }

  function addToList(product) {
    setShoppingList(prev => [...prev, { ...product, quantity: 1 }])
    setSearchQuery('')
    setSearchResults([])
    setStrategies(null)
    setSelectedStrategy(null)
    // Remove from category products if shown
    setCategoryProducts(prev => prev.filter(p => p.code !== product.code))
  }

  function removeFromList(code) {
    setShoppingList(prev => prev.filter(item => item.code !== code))
    setStrategies(null)
    setSelectedStrategy(null)
  }

  function updateQuantity(code, delta) {
    setShoppingList(prev => prev.map(item => {
      if (item.code === code) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) }
      }
      return item
    }))
    setStrategies(null)
    setSelectedStrategy(null)
  }

  async function calculateStrategies() {
    if (shoppingList.length === 0) return
    
    setLoading(true)
    try {
      const codes = shoppingList.map(item => item.code)
      
      console.log('Calculating strategies for products:', codes)
      
      // Get all prices for all products
      const { data, error } = await supabase
        .from('latest_prices')
        .select('*')
        .in('product_code', codes)
      
      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }
      
      console.log('Received price data:', data)
      
      // Check if we have any data
      if (!data || data.length === 0) {
        console.log('No price data found for products')
        setStrategies({
          single: null,
          double: null,
          optimal: null,
          baseline: 0,
          noData: true
        })
        return
      }
      
      // Build price matrix: product -> store -> price
      const priceMatrix = {}
      const allStores = new Set()
      
      data.forEach(price => {
        if (!priceMatrix[price.product_code]) {
          priceMatrix[price.product_code] = {}
        }
        priceMatrix[price.product_code][price.store_name] = {
          price: parseFloat(price.price),
          store: price.store_name,
          city: price.store_city
        }
        allStores.add(price.store_name)
      })
      
      console.log('Price matrix:', priceMatrix)
      console.log('All stores:', Array.from(allStores))
      
      const storeList = Array.from(allStores)
      
      // Check how many products we have prices for
      const productsWithPrices = Object.keys(priceMatrix).length
      const missingProducts = codes.filter(code => !priceMatrix[code])
      
      console.log(`Products with prices: ${productsWithPrices}/${codes.length}`)
      if (missingProducts.length > 0) {
        console.log('Missing products:', missingProducts)
      }
      
      // STRATEGY 1: Single store (best complete store)
      const singleStoreStrategy = calculateSingleStore(shoppingList, priceMatrix, storeList)
      console.log('Single store strategy:', singleStoreStrategy)
      
      // STRATEGY 2: Two stores optimal split
      const twoStoreStrategy = calculateTwoStores(shoppingList, priceMatrix, storeList)
      console.log('Two store strategy:', twoStoreStrategy)
      
      // STRATEGY 3: Optimal (each product at cheapest)
      const optimalStrategy = calculateOptimal(shoppingList, priceMatrix)
      console.log('Optimal strategy:', optimalStrategy)
      
      setStrategies({
        single: singleStoreStrategy,
        double: twoStoreStrategy,
        optimal: optimalStrategy,
        baseline: singleStoreStrategy?.total || 0,
        missingProducts: missingProducts.length > 0 ? missingProducts : null
      })
      
      // Auto-select best practical strategy
      if (twoStoreStrategy && singleStoreStrategy) {
        const savingsDouble = singleStoreStrategy.total - twoStoreStrategy.total
        if (savingsDouble > 1) { // More than €1 savings
          setSelectedStrategy('double')
        } else {
          setSelectedStrategy('single')
        }
      } else if (singleStoreStrategy) {
        setSelectedStrategy('single')
      } else if (optimalStrategy && optimalStrategy.stores.length > 0) {
        setSelectedStrategy('optimal')
      }
      
    } catch (err) {
      console.error('Strategy calculation error:', err)
      setStrategies({
        single: null,
        double: null,
        optimal: null,
        baseline: 0,
        error: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  function calculateSingleStore(list, priceMatrix, stores) {
    let bestStore = null
    let bestTotal = Infinity
    let bestDetails = null
    
    for (const store of stores) {
      let total = 0
      let foundAll = true
      const items = []
      
      for (const item of list) {
        const priceInfo = priceMatrix[item.code]?.[store]
        if (priceInfo) {
          const itemTotal = priceInfo.price * item.quantity
          total += itemTotal
          items.push({
            ...item,
            price: priceInfo.price,
            itemTotal
          })
        } else {
          foundAll = false
          break
        }
      }
      
      if (foundAll && total < bestTotal) {
        bestTotal = total
        bestStore = store
        bestDetails = items
      }
    }
    
    if (!bestStore) return null
    
    return {
      type: 'single',
      stores: [bestStore],
      total: bestTotal,
      items: { [bestStore]: bestDetails },
      complete: true
    }
  }

  function calculateTwoStores(list, priceMatrix, stores) {
    if (stores.length < 2) return null
    
    let bestCombo = null
    let bestTotal = Infinity
    let bestSplit = null
    
    // Try all pairs of stores
    for (let i = 0; i < stores.length; i++) {
      for (let j = i + 1; j < stores.length; j++) {
        const storeA = stores[i]
        const storeB = stores[j]
        
        let total = 0
        let foundAll = true
        const splitA = []
        const splitB = []
        
        for (const item of list) {
          const priceA = priceMatrix[item.code]?.[storeA]?.price
          const priceB = priceMatrix[item.code]?.[storeB]?.price
          
          if (priceA === undefined && priceB === undefined) {
            foundAll = false
            break
          }
          
          // Choose cheaper store for this item
          if (priceA !== undefined && (priceB === undefined || priceA <= priceB)) {
            const itemTotal = priceA * item.quantity
            total += itemTotal
            splitA.push({ ...item, price: priceA, itemTotal })
          } else {
            const itemTotal = priceB * item.quantity
            total += itemTotal
            splitB.push({ ...item, price: priceB, itemTotal })
          }
        }
        
        if (foundAll && total < bestTotal) {
          bestTotal = total
          bestCombo = [storeA, storeB]
          bestSplit = { [storeA]: splitA, [storeB]: splitB }
        }
      }
    }
    
    if (!bestCombo) return null
    
    // Filter out empty store splits
    const activeStores = bestCombo.filter(s => bestSplit[s].length > 0)
    
    return {
      type: 'double',
      stores: activeStores,
      total: bestTotal,
      items: bestSplit,
      complete: true
    }
  }

  function calculateOptimal(list, priceMatrix) {
    const storeItems = {}
    let total = 0
    let foundAll = true
    const storesUsed = new Set()
    
    for (const item of list) {
      const prices = priceMatrix[item.code]
      if (!prices || Object.keys(prices).length === 0) {
        foundAll = false
        continue
      }
      
      // Find cheapest store for this item
      let cheapestStore = null
      let cheapestPrice = Infinity
      
      for (const [store, info] of Object.entries(prices)) {
        if (info.price < cheapestPrice) {
          cheapestPrice = info.price
          cheapestStore = store
        }
      }
      
      if (cheapestStore) {
        if (!storeItems[cheapestStore]) {
          storeItems[cheapestStore] = []
        }
        const itemTotal = cheapestPrice * item.quantity
        storeItems[cheapestStore].push({ ...item, price: cheapestPrice, itemTotal })
        total += itemTotal
        storesUsed.add(cheapestStore)
      }
    }
    
    return {
      type: 'optimal',
      stores: Array.from(storesUsed),
      total,
      items: storeItems,
      complete: foundAll
    }
  }

  const activeStrategy = strategies?.[selectedStrategy]

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

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
          <Icons.ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold">{t('compare.title')}</h1>
          <p className="text-xs text-dark-400">{t('compare.subtitle')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="bg-dark-800 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-white/5 focus-within:border-cyan-500/30 transition-colors">
          <Icons.Search className="w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder={t('compare.addProduct')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-dark-500 text-sm"
          />
          {searching && (
            <div className="w-4 h-4 border-2 border-dark-600 border-t-cyan-400 rounded-full animate-spin" />
          )}
        </div>
        
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 rounded-xl border border-white/10 overflow-hidden z-10 shadow-xl max-h-64 overflow-y-auto">
            {searchResults.map(product => (
              <button
                key={product.code}
                onClick={() => addToList(product)}
                className="w-full px-4 py-3 text-left hover:bg-dark-700 transition-colors flex items-center gap-3"
              >
                <Icons.Plus className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-sm truncate">{product.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
                        addToList(product)
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-dark-800 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <Icons.Plus className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-sm truncate">{product.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopping List */}
      {shoppingList.length === 0 ? (
        <div className="space-y-4">
          {/* Popular Products */}
          {popularProducts.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span>⭐</span> {t('compare.popular')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularProducts.filter(p => !shoppingList.some(item => item.code === p.code)).slice(0, 8).map(product => (
                  <button
                    key={product.code}
                    onClick={() => addToList(product)}
                    className="px-3 py-2 bg-dark-800 hover:bg-dark-750 border border-white/5 hover:border-cyan-500/30 rounded-xl text-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Icons.Plus className="w-3 h-3 text-cyan-400" />
                    <span className="truncate max-w-[120px]">{product.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories Grid */}
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

          {/* Empty state hint */}
          <div className="bg-dark-800/50 rounded-xl p-4 text-center border border-dashed border-dark-700">
            <Icons.ShoppingCart className="w-8 h-8 mx-auto mb-2 text-dark-600" />
            <p className="text-sm text-dark-400">{t('compare.emptyCart')}</p>
            <p className="text-xs text-dark-500 mt-1">{t('compare.emptyCartHint')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Products List */}
          <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5 mb-4">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t('community.products')} ({shoppingList.length})</h3>
              <button
                onClick={() => {
                  setShoppingList([])
                  setStrategies(null)
                  setSelectedStrategy(null)
                }}
                className="text-xs text-dark-400 hover:text-red-400"
              >
                {t('common.deleteAll')}
              </button>
            </div>
            
            <div className="divide-y divide-white/[0.03] max-h-48 overflow-y-auto">
              {shoppingList.map(item => (
                <div key={item.code} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.name}</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.code, -1)}
                      className="w-6 h-6 rounded-md bg-dark-700 flex items-center justify-center text-dark-400 hover:text-white"
                    >
                      <Icons.Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-mono">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.code, 1)}
                      className="w-6 h-6 rounded-md bg-dark-700 flex items-center justify-center text-dark-400 hover:text-white"
                    >
                      <Icons.Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeFromList(item.code)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-dark-500 hover:text-red-400"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add from Categories (when list has items) */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wide mb-2">{t('compare.categories')}</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => loadCategoryProducts(category)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-dark-800 hover:bg-dark-750 border border-white/5 hover:border-cyan-500/30 rounded-lg transition-all whitespace-nowrap flex-shrink-0"
                >
                  <span>{category.icon}</span>
                  <span className="text-xs text-dark-300">{t(`category.${category.id}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateStrategies}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('compare.calculating')}
              </>
            ) : (
              <>
                <Icons.TrendingUp className="w-5 h-5" />
                {t('compare.calculate')}
              </>
            )}
          </button>
        </>
      )}

      {/* Strategy Results */}
      {strategies && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-dark-300">{t('compare.strategies')}</h3>
          
          {/* Single Store Strategy */}
          {strategies.single && (
            <StrategyCard
              icon="🏪"
              title={t('compare.oneStore')}
              subtitle={strategies.single.stores[0]}
              total={strategies.single.total}
              savings={0}
              isSelected={selectedStrategy === 'single'}
              onClick={() => setSelectedStrategy('single')}
              tag={t('compare.simplest')}
              tagColor="blue"
            />
          )}
          
          {/* Two Store Strategy */}
          {strategies.double && strategies.single && (
            <StrategyCard
              icon="🏪🏪"
              title={t('compare.twoStores')}
              subtitle={strategies.double.stores.join(' + ')}
              total={strategies.double.total}
              savings={strategies.single.total - strategies.double.total}
              isSelected={selectedStrategy === 'double'}
              onClick={() => setSelectedStrategy('double')}
              tag={t('compare.recommended')}
              tagColor="green"
              highlight={strategies.single.total - strategies.double.total > 1}
            />
          )}
          
          {/* Optimal Strategy */}
          {strategies.optimal && strategies.single && (
            <StrategyCard
              icon="🎯"
              title={t('compare.maxSavings')}
              subtitle={`${strategies.optimal.stores.length} ${t('common.stores')}`}
              total={strategies.optimal.total}
              savings={strategies.single.total - strategies.optimal.total}
              isSelected={selectedStrategy === 'optimal'}
              onClick={() => setSelectedStrategy('optimal')}
              tag={strategies.optimal.stores.length > 3 ? t('compare.impractical') : null}
              tagColor="orange"
            />
          )}
          
          {/* No strategies available */}
          {!strategies.single && !strategies.double && !strategies.optimal && (
            <div className="bg-dark-800 rounded-xl p-6 text-center border border-white/5">
              {strategies.error ? (
                <>
                  <p className="text-red-400">⚠️ {t('compare.error')}</p>
                  <p className="text-xs text-dark-500 mt-1">{strategies.error}</p>
                </>
              ) : strategies.noData ? (
                <>
                  <p className="text-dark-400">📭 {t('compare.noData')}</p>
                  <p className="text-xs text-dark-500 mt-1">{t('compare.scanMore')}</p>
                </>
              ) : (
                <>
                  <p className="text-dark-400">{t('compare.noData')}</p>
                  <p className="text-xs text-dark-500 mt-1">{t('compare.scanMore')}</p>
                </>
              )}
            </div>
          )}
          
          {/* Missing products warning */}
          {strategies.missingProducts && strategies.missingProducts.length > 0 && (strategies.single || strategies.optimal) && (
            <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20 mt-3">
              <p className="text-sm text-orange-400">
                ⚠️ {t('compare.missingProducts', { count: strategies.missingProducts.length })}
              </p>
              <p className="text-xs text-dark-400 mt-1">
                {t('compare.missingProductsHint')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selected Strategy Details */}
      {activeStrategy && (
        <div className="mt-4 animate-fade-in">
          <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5">
            <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <h3 className="text-sm font-semibold">{t('compare.shoppingPlan')}</h3>
              <p className="text-xs text-dark-400 mt-0.5">
                {activeStrategy.stores.length === 1 
                  ? t('compare.buyEverywhere')
                  : t('compare.splitPurchase', { count: activeStrategy.stores.length })
                }
              </p>
            </div>
            
            {activeStrategy.stores.map(store => {
              const items = activeStrategy.items[store] || []
              if (items.length === 0) return null
              
              const storeTotal = items.reduce((sum, item) => sum + item.itemTotal, 0)
              
              return (
                <div key={store} className="border-b border-white/[0.03] last:border-0">
                  <div className="px-4 py-3 bg-dark-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.Store className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium">{store}</span>
                      <span className="text-xs text-dark-500">({items.length} proizvoda)</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-cyan-400">
                      {storeTotal.toFixed(2)} €
                    </span>
                  </div>
                  
                  <div className="px-4 py-2 space-y-1.5">
                    {items.map(item => (
                      <div key={item.code} className="flex items-center justify-between text-xs">
                        <span className="text-dark-400 truncate flex-1 mr-2">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-dark-300 font-mono">
                          {item.itemTotal.toFixed(2)} €
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            
            {/* Total */}
            <div className="px-4 py-4 bg-gradient-to-r from-green-500/10 to-cyan-500/10 flex items-center justify-between">
              <span className="text-sm font-semibold">{t('compare.totalLabel')}</span>
              <span className="text-xl font-bold font-mono text-green-400">
                {activeStrategy.total.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StrategyCard({ icon, title, subtitle, total, savings, isSelected, onClick, tag, tagColor, highlight }) {
  const { t } = useLanguage()
  const tagColors = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400'
  }
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected 
          ? 'bg-cyan-500/10 border-cyan-500/30' 
          : highlight
            ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
            : 'bg-dark-800 border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{title}</span>
            {tag && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${tagColors[tagColor]}`}>
                {tag}
              </span>
            )}
          </div>
          <p className="text-xs text-dark-400 mt-0.5 truncate">{subtitle}</p>
        </div>
        
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-bold font-mono ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
            {total.toFixed(2)} €
          </p>
          {savings > 0.01 && (
            <p className="text-xs text-green-400">
              {t('compare.savings', { amount: savings.toFixed(2) })}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
