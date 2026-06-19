export default function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1
        const done    = idx < current
        const active  = idx === current
        const pending = idx > current
        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                done    ? 'bg-forest-500 text-white' :
                active  ? 'bg-earth-500  text-white ring-4 ring-earth-200' :
                          'bg-parchment  text-forest-400 border-2 border-forest-200'
              }`}>
                {done ? '✓' : idx}
              </div>
              <span className={`text-xs mt-1 text-center max-w-16 ${
                active ? 'text-earth-700 font-semibold' : 'text-forest-400'
              }`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? 'bg-forest-400' : 'bg-forest-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
