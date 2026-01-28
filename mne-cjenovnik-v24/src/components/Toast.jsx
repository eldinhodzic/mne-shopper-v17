import { Icons } from './Icons'

export default function Toast({ message, type = 'error', onClose }) {
  const bgClass = type === 'error' 
    ? 'bg-gradient-to-r from-red-500 to-orange-500'
    : 'bg-gradient-to-r from-green-500 to-cyan-500'

  return (
    <div className={`fixed bottom-24 left-5 right-5 ${bgClass} rounded-xl p-4 z-[1000] animate-slide-up shadow-lg`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {type === 'error' ? (
            <Icons.AlertCircle className="w-5 h-5" />
          ) : (
            <Icons.Check className="w-5 h-5" />
          )}
        </div>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button 
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <Icons.Close className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
