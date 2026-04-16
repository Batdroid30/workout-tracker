import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
const MOCK_EXERCISES = ['Barbell Bench Press', 'Incline Dumbbell Press', 'Cable Fly', 'Dips']

export default function ExercisesPage() {
  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Heavy-style sticky header with search */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur pb-4 pt-4 px-4 space-y-4 border-b border-zinc-900">
        <h1 className="text-2xl font-bold font-sans">Exercises</h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input 
            placeholder="Search exercise..." 
            className="pl-10 pb-0 pt-0 !h-12"
          />
        </div>

        {/* Scrollable chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 items-center">
          {MUSCLE_GROUPS.map((mg, i) => (
            <button 
              key={mg}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-colors shrink-0 ${
                i === 0 ? 'bg-brand text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {mg}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of exercise mockups */}
      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="space-y-3">
          {MOCK_EXERCISES.map((ex) => (
            <Link href={`/exercises/${ex.toLowerCase().replace(/ /g, '-')}`} key={ex}>
              <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-xl cursor-pointer active:scale-[0.98] mb-3">
                <div>
                  <p className="font-bold text-white font-sans text-lg">{ex}</p>
                  <p className="text-sm text-zinc-500 font-mono mt-1">Chest • Barbell</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
