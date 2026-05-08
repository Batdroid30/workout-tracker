'use client'

import { useState } from 'react'
import { ChevronDown, PlayCircle } from 'lucide-react'

interface TutorialVideoProps {
  videoId: string
}

export function TutorialVideo({ videoId }: TutorialVideoProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="fade-up">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-1 mb-3 group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <PlayCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="t-label" style={{ color: 'var(--text-hi)' }}>How to perform</h2>
        </div>
        <ChevronDown
          className="w-4 h-4 transition-transform duration-200"
          style={{
            color: 'var(--text-faint)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div className="glass overflow-hidden" style={{ borderRadius: '12px' }}>
          {/* 16:9 aspect ratio wrapper */}
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
              title="Exercise tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
