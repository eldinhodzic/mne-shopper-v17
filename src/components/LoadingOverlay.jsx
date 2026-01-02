import { useLanguage } from '../hooks/useLanguage'

export default function LoadingOverlay({ message }) {
  const { t } = useLanguage()
  const displayMessage = message || t('common.loading')
  
  return (
    <div className="fixed inset-0 bg-dark-900/90 flex items-center justify-center z-[1000]">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-dark-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-dark-300 text-sm">{displayMessage}</p>
      </div>
    </div>
  )
}
