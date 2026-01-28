import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Icons } from './Icons'
import { isValidFiscalQR } from '../lib/api'
import { useLanguage } from '../hooks/useLanguage'

export default function Scanner({ onScan, onClose }) {
  const { t } = useLanguage()
  const [hasPermission, setHasPermission] = useState(null)
  const [error, setError] = useState(null)
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)

  useEffect(() => {
    startScanner()
    return () => stopScanner()
  }, [])

  async function startScanner() {
    try {
      html5QrCodeRef.current = new Html5Qrcode('qr-reader')
      
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          if (isValidFiscalQR(decodedText)) {
            stopScanner()
            onScan(decodedText)
          }
        },
        () => {}
      )
      
      setHasPermission(true)
    } catch (err) {
      console.error('Scanner error:', err)
      setHasPermission(false)
      setError(err.message)
    }
  }

  async function stopScanner() {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  function handleClose() {
    stopScanner()
    onClose()
  }

  return (
    <div className="animate-fade-in relative">
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute -top-2 right-0 z-10 w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-white hover:bg-dark-600 transition-colors"
      >
        <Icons.Close className="w-5 h-5" />
      </button>

      <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5">
        {/* Scanner Area */}
        <div className="relative">
          <div 
            id="qr-reader" 
            ref={scannerRef}
            className="w-full aspect-square bg-black"
          />
          
          {/* Scan Overlay */}
          {hasPermission && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="w-[70%] aspect-square border-2 border-cyan-400 rounded-2xl relative"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
              >
                {/* Scanning line */}
                <div 
                  className="absolute left-[10%] right-[10%] h-0.5 bg-cyan-400"
                  style={{ 
                    boxShadow: '0 0 10px #06b6d4',
                    animation: 'scan 2s linear infinite'
                  }}
                />
                
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-5 h-5 border-l-[3px] border-t-[3px] border-cyan-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-5 h-5 border-r-[3px] border-t-[3px] border-cyan-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-l-[3px] border-b-[3px] border-cyan-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-r-[3px] border-b-[3px] border-cyan-400 rounded-br-xl" />
              </div>
            </div>
          )}

          {/* Permission Error */}
          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-900/90 p-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Icons.Camera className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('scan.denied')}</h3>
                <p className="text-sm text-dark-400 mb-4">
                  {error || t('scan.enableCamera')}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  {t('errors.tryAgain')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-5 text-center">
          <h3 className="text-base font-semibold mb-2">
            {t('scan.title')}
          </h3>
          <p className="text-sm text-dark-400">
            {t('scan.subtitle')}
          </p>
        </div>
      </div>
    </div>
  )
}
