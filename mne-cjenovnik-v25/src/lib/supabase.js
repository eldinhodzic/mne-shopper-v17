import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rnvlcaeqymlphemzhnbt.supabase.co'
const supabaseAnonKey = 'sb_publishable_y7qkjfhYPfgdraUDI2Stmg_TPREYUhj'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Submit receipt data to community database
 */
export async function submitReceiptToCommunity(invoice) {
  const results = []
  
  const storeTin = invoice.seller?.idNum || invoice.issuerTaxNumber || ''
  const storeName = invoice.seller?.name || 'Nepoznata prodavnica'
  const storeAddress = invoice.seller?.address || null
  const storeCity = invoice.seller?.town || null
  const scannedAt = invoice.dateTimeCreated
  
  // Validate store TIN
  if (!storeTin) {
    console.warn('No store TIN found, skipping community submission')
    return results
  }
  
  for (const item of invoice.items || []) {
    // Skip items without valid code
    if (!item || !item.code) {
      console.warn('Skipping item without code:', item)
      continue
    }
    
    const code = String(item.code).trim()
    if (!code || code === 'null' || code === 'undefined') {
      console.warn('Skipping item with invalid code:', item)
      continue
    }
    
    try {
      const { data, error } = await supabase.rpc('submit_price', {
        p_product_code: code,
        p_product_name: item.name || 'Nepoznat proizvod',
        p_product_unit: item.unit || 'KOM',
        p_store_tin: String(storeTin),
        p_store_name: storeName,
        p_store_address: storeAddress,
        p_store_city: storeCity,
        p_price: item.unitPriceAfterVat || 0,
        p_price_without_vat: item.unitPriceBeforeVat || 0,
        p_vat_rate: item.vatRate || 0,
        p_scanned_at: scannedAt
      })
      
      if (error) {
        console.warn('Failed to submit price for', code, error)
        results.push({ code, success: false, error: error.message })
      } else {
        results.push({ code, success: true })
      }
    } catch (err) {
      console.error('Error submitting price:', err)
      results.push({ code, success: false, error: err.message })
    }
  }
  
  return results
}

/**
 * Get latest prices for a product from all stores
 */
export async function getCommunityPrices(productCode) {
  const { data, error } = await supabase
    .from('latest_prices')
    .select('*')
    .eq('product_code', productCode)
    .order('price', { ascending: true })
  
  if (error) {
    console.error('Error fetching community prices:', error)
    return []
  }
  
  return data || []
}

/**
 * Search products in community database
 */
export async function searchCommunityProducts(query, limit = 20) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(limit)
  
  if (error) {
    console.error('Error searching products:', error)
    return []
  }
  
  return data || []
}

/**
 * Get all prices for a product (history across all stores)
 */
export async function getProductPriceHistory(productCode, days = 30) {
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('prices')
    .select(`
      id,
      price,
      scanned_at,
      products!inner(code, name),
      stores!inner(name, city)
    `)
    .eq('products.code', productCode)
    .gte('scanned_at', fromDate.toISOString())
    .order('scanned_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching price history:', error)
    return []
  }
  
  return data || []
}

/**
 * Get community statistics
 */
export async function getCommunityStats() {
  const { data, error } = await supabase
    .from('stats')
    .select('*')
    .single()
  
  if (error) {
    console.error('Error fetching stats:', error)
    return null
  }
  
  return data
}

/**
 * Get cheapest stores for a list of products
 */
export async function findCheapestStores(productCodes) {
  const { data, error } = await supabase
    .from('latest_prices')
    .select('*')
    .in('product_code', productCodes)
  
  if (error) {
    console.error('Error finding cheapest stores:', error)
    return []
  }
  
  // Group by store and calculate totals
  const storeGroups = {}
  
  for (const price of data || []) {
    const storeKey = price.store_name
    if (!storeGroups[storeKey]) {
      storeGroups[storeKey] = {
        store_name: price.store_name,
        store_city: price.store_city,
        products: [],
        total: 0
      }
    }
    storeGroups[storeKey].products.push(price)
    storeGroups[storeKey].total += parseFloat(price.price)
  }
  
  return Object.values(storeGroups).sort((a, b) => a.total - b.total)
}
