const STEPS = ['Start', 'Items', 'Reason', 'Method', 'Review'];

export default function ProgressBar({ currentStep }) {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200 z-0">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          {STEPS.map((label, idx) => {
            const done = idx < currentStep;
            const active = idx === currentStep;
            return (
              <div key={label} className="flex flex-col items-center z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                    done
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : active
                      ? 'bg-white border-indigo-600 text-indigo-600'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium hidden sm:block ${
                    active ? 'text-indigo-600' : done ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
