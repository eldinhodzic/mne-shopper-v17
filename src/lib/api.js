const API_URL = 'https://mapr.tax.gov.me/ic/api/verifyInvoice'

/**
 * Fetch invoice data from Montenegro Tax Administration
 */
export async function fetchInvoice(iic, dateTimeCreated, tin) {
  const formData = new FormData()
  formData.append('iic', iic)
  formData.append('dateTimeCreated', dateTimeCreated)
  formData.append('tin', tin)
  
  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Parse QR code URL from Montenegro fiscal receipt
 * Example URL: https://mapr.tax.gov.me/ic/#/verify?iic=XXX&tin=XXX&crtd=XXX&ord=XXX&bu=XXX&cr=XXX&sw=XXX&prc=XXX
 */
export function parseQRUrl(url) {
  try {
    // Handle both formats: with hash (#/verify?) and without
    let searchString = ''
    
    if (url.includes('#/verify?')) {
      searchString = url.split('#/verify?')[1]
    } else if (url.includes('?')) {
      searchString = url.split('?')[1]
    } else {
      return null
    }
    
    const params = new URLSearchParams(searchString)
    
    const iic = params.get('iic')
    const tin = params.get('tin')
    const crtd = params.get('crtd')
    
    if (!iic || !tin || !crtd) {
      return null
    }
    
    return {
      iic,
      tin,
      dateTimeCreated: decodeURIComponent(crtd),
      ordinalNumber: params.get('ord'),
      businessUnit: params.get('bu'),
      cashRegister: params.get('cr'),
      software: params.get('sw'),
      totalPrice: params.get('prc')
    }
  } catch (error) {
    console.error('Failed to parse QR URL:', error)
    return null
  }
}

/**
 * Check if URL is a valid Montenegro fiscal receipt QR code
 */
export function isValidFiscalQR(url) {
  return url && (
    url.includes('mapr.tax.gov.me') || 
    url.includes('efi.tax.gov.me') ||
    url.includes('efitest.tax.gov.me')
  )
}
