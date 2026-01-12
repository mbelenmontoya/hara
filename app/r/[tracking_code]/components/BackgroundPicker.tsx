// Dev-only background picker for testing different backgrounds
// Remove this component before production

'use client'

import { useState } from 'react'

// Available backgrounds (illustrations only)
const BACKGROUNDS = [
  { id: 'none', label: 'Solid Color', path: null },
  { id: 'rizki-1', label: 'Rizki 1', path: '/assets/illustrations/rizki-kurniawan-SSp6eC-LKBU-unsplash.svg' },
  { id: 'rizki-2', label: 'Rizki 2', path: '/assets/illustrations/rizki-kurniawan-iVnWczl8eqg-unsplash.svg' },
  { id: 'denisse', label: 'Denisse', path: '/assets/illustrations/denisse-diaz-hFtlz_mtAPQ-unsplash.svg' },
  { id: 'jo-yee-1', label: 'Jo Yee 1', path: '/assets/illustrations/jo-yee-leong-8ekcOvJnLlo-unsplash.svg' },
  { id: 'jo-yee-2', label: 'Jo Yee 2', path: '/assets/illustrations/jo-yee-leong-FX8yJf4ykCA-unsplash.svg' },
  { id: 'silverfork', label: 'Silverfork', path: '/assets/illustrations/silverfork-studio-MtMPXbN_3-k-unsplash.svg' },
  { id: 'smaili', label: 'Smaili', path: '/assets/illustrations/smaili-aziz-TM1U0qcItKY-unsplash.svg' },
]

interface BackgroundPickerProps {
  currentBackground: string | null
  onBackgroundChange: (path: string | null) => void
}

export function BackgroundPicker({ currentBackground, onBackgroundChange }: BackgroundPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Hidden by default - triple-tap bottom-right corner to show toggle button
  const [isEnabled, setIsEnabled] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  
  const handleSecretTap = () => {
    const newCount = tapCount + 1
    setTapCount(newCount)
    if (newCount >= 3) {
      setIsEnabled(true)
      setTapCount(0)
    }
    // Reset tap count after 1 second
    setTimeout(() => setTapCount(0), 1000)
  }
  
  // If not enabled, show invisible tap target
  if (!isEnabled) {
    return (
      <div
        onClick={handleSecretTap}
        className="fixed bottom-0 right-0 w-16 h-16 z-[100]"
        aria-hidden="true"
      />
    )
  }

  return (
    <>
      {/* Toggle button - fixed bottom right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[100] w-12 h-12 bg-brand text-white rounded-full shadow-strong flex items-center justify-center hover:bg-brand-hover active:scale-95 transition-all"
        aria-label="Toggle background picker"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[100] w-72 bg-surface rounded-2xl shadow-strong border border-outline overflow-hidden">
          <div className="p-4 border-b border-outline bg-surface-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Background Preview</h3>
              <span className="text-xs text-muted bg-warning-weak text-warning px-2 py-0.5 rounded-full">DEV</span>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-2">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => onBackgroundChange(bg.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                  currentBackground === bg.path
                    ? 'bg-brand-weak text-brand font-medium'
                    : 'text-foreground hover:bg-surface-2'
                }`}
              >
                {/* Thumbnail */}
                <div 
                  className="w-10 h-10 rounded-lg border border-outline flex-shrink-0 bg-background"
                  style={{
                    backgroundImage: bg.path ? `url(${bg.path})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <span className="truncate">{bg.label}</span>
                {currentBackground === bg.path && (
                  <svg className="w-4 h-4 ml-auto text-brand flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-outline bg-surface-2">
            <p className="text-xs text-muted text-center">
              Remove this panel before production
            </p>
          </div>
        </div>
      )}
    </>
  )
}
