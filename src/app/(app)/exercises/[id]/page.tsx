export default function ExerciseDetail({ params }: { params: { id: string } }) {
  // Format the ID back to a display name for the mockup
  const displayName = params.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  
  return (
    <div className="p-4 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold font-sans mb-1">{displayName}</h1>
      <p className="text-zinc-500 font-mono text-sm mb-8 uppercase tracking-widest">Chest • Barbell</p>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-bold mb-4 font-sans text-zinc-300">Records</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <p className="text-sm text-zinc-400 font-medium">1RM (est)</p>
              <p className="text-2xl font-bold font-mono text-brand mt-1">105 kg</p>
            </div>
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <p className="text-sm text-zinc-400 font-medium">Best Volume</p>
              <p className="text-2xl font-bold font-mono text-brand mt-1">3200 kg</p>
            </div>
          </div>
        </section>
        
        <section>
          <h2 className="text-lg font-bold mb-4 font-sans text-zinc-300">History</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
            {/* Mock History Row */}
            <div className="p-4">
              <p className="text-sm font-bold text-white mb-3">Today</p>
              <div className="flex font-mono text-base text-zinc-300">
                <span className="w-8 text-zinc-600">1</span>
                <span>100 kg × 5</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
