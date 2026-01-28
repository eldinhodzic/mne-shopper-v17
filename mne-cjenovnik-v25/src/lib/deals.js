import { supabase } from './supabase'

const LAST_VISIT_KEY = 'mne_cjenovnik_last_visit'

/**
 * Get and update last visit timestamp
 */
export function getLastVisit() {
  const last = localStorage.getItem(LAST_VISIT_KEY)
  return last ? new Date(last) : null
}

export function updateLastVisit() {
  localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString())
}

/**
 * Fetch deals and price changes
 */
export async function getDealsAndChanges() {
  const lastVisit = getLastVisit()
  
  try {
    // Get all latest prices grouped by product
    const { data: allPrices, error } = await supabase
      .from('latest_prices')
      .select('*')
    
    if (error) throw error
    
    // Group by product
    const productData = {}
    
    allPrices?.forEach(p => {
      const code = p.product_code
      if (!code) return
      
      if (!productData[code]) {
        productData[code] = {
          code,
          name: p.product_name,
          prices: []
        }
      }
      
      productData[code].prices.push({
        price: parseFloat(p.price),
        store: p.store_name,
        city: p.store_city,
        date: p.scanned_at
      })
    })
    
    // Find deals (products with big price differences between stores)
    const deals = []
    
    Object.values(productData).forEach(product => {
      if (product.prices.length < 2) return
      
      const prices = product.prices.map(p => p.price)
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length
      
      const savingPercent = ((max - min) / max * 100)
      
      // If cheapest is >15% below most expensive, it's a deal
      if (savingPercent > 15 && (max - min) > 0.20) {
        const cheapestStore = product.prices.find(p => p.price === min)
        
        deals.push({
          code: product.code,
          name: product.name,
          minPrice: min,
          maxPrice: max,
          avgPrice: avg,
          savingPercent: savingPercent.toFixed(0),
          savingAmount: (max - min).toFixed(2),
          cheapestStore: cheapestStore?.store || 'Nepoznato',
          cheapestCity: cheapestStore?.city,
          storeCount: product.prices.length,
          type: 'deal'
        })
      }
    })
    
    // Sort by saving percentage
    deals.sort((a, b) => b.savingPercent - a.savingPercent)
    
    return {
      deals: deals.slice(0, 15),
      totalProducts: Object.keys(productData).length,
      lastVisit,
      hasNews: deals.length > 0
    }
    
  } catch (err) {
    console.error('Error fetching deals:', err)
    return {
      deals: [],
      totalProducts: 0,
      lastVisit,
      hasNews: false
    }
  }
}

/**
 * Calculate personal inflation based on local product history
 */
export async function getPersonalInflation(localProducts = []) {
  if (localProducts.length < 3) return null
  
  try {
    // Get products that have been seen multiple times
    const validProducts = localProducts.filter(p => p.history && p.history.length >= 2)
    
    if (validProducts.length < 2) return null
    
    const changes = []
    let totalOld = 0
    let totalNew = 0
    
    validProducts.forEach(product => {
      const history = product.history.sort((a, b) => new Date(b.date) - new Date(a.date))
      const latest = history[0]
      const oldest = history[history.length - 1]
      
      if (latest && oldest && latest.price !== oldest.price) {
        const change = ((latest.price - oldest.price) / oldest.price * 100)
        
        changes.push({
          code: product.code,
          name: product.name,
          oldPrice: oldest.price,
          newPrice: latest.price,
          change,
          daysBetween: Math.round((new Date(latest.date) - new Date(oldest.date)) / (1000 * 60 * 60 * 24))
        })
        
        totalOld += oldest.price
        totalNew += latest.price
      }
    })
    
    if (changes.length === 0 || totalOld === 0) return null
    
    const overallInflation = ((totalNew - totalOld) / totalOld * 100)
    
    // Sort by change
    changes.sort((a, b) => b.change - a.change)
    
    return {
      overallInflation: overallInflation.toFixed(1),
      direction: overallInflation > 0 ? 'up' : overallInflation < 0 ? 'down' : 'stable',
      topIncreases: changes.filter(c => c.change > 1).slice(0, 5),
      topDecreases: changes.filter(c => c.change < -1).slice(0, 5),
      productsAnalyzed: changes.length,
      periodDays: Math.max(...changes.map(c => c.daysBetween), 1)
    }
    
  } catch (err) {
    console.error('Error calculating inflation:', err)
    return null
  }
}

/**
 * Generate shareable stats for social sharing
 */
export function generateShareableStats(stats) {
  const { totalScans, totalSaved, topCategory, inflation } = stats
  
  return {
    title: 'Moja MNE Cjenovnik statistika',
    text: `🛒 Skenirao sam ${totalScans} računa\n💰 Uštedio sam ${totalSaved}€\n📊 Inflacija mojih proizvoda: ${inflation}%`,
    hashtags: ['MNECjenovnik', 'Ušteda', 'CrnaGora']
  }
}

/**
 * Get welcome stats for the welcome modal
 */
export async function getWelcomeStats() {
  try {
    const { deals, totalProducts } = await getDealsAndChanges()
    
    // Get community stats
    const { data: statsData } = await supabase
      .from('stats')
      .select('*')
      .single()
    
    // Get recent price drops from all prices
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentPrices } = await supabase
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
    
    // Find price drops
    const productPrices = {}
    recentPrices?.forEach(p => {
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
    
    const priceDrops = []
    Object.values(productPrices).forEach(product => {
      if (product.prices.length < 2) return
      product.prices.sort((a, b) => b.date - a.date)
      
      const latest = product.prices[0]
      const older = product.prices.slice(1)
      const avgOlder = older.reduce((s, p) => s + p.price, 0) / older.length
      
      const drop = avgOlder - latest.price
      const dropPercent = (drop / avgOlder) * 100
      
      if (dropPercent >= 5 && drop >= 0.10) {
        priceDrops.push({
          code: product.code,
          name: product.name,
          currentPrice: latest.price,
          previousPrice: avgOlder,
          dropPercent,
          store: latest.store
        })
      }
    })
    
    priceDrops.sort((a, b) => b.dropPercent - a.dropPercent)
    
    return {
      priceDrops: priceDrops.slice(0, 5),
      deals: deals.slice(0, 5),
      totalProducts: statsData?.total_products || totalProducts,
      totalStores: statsData?.total_stores || 0,
      totalPrices: statsData?.total_price_records || 0
    }
    
  } catch (err) {
    console.error('Error fetching welcome stats:', err)
    return {
      priceDrops: [],
      deals: [],
      totalProducts: 0,
      totalStores: 0,
      totalPrices: 0
    }
  }
}
