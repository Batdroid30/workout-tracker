// Column labels shared by every set row (see SET_GRID in SetRow).
export const SET_GRID = 'grid grid-cols-[28px_52px_1fr_1fr_44px] items-center gap-2'

export function SetTableHeader() {
  return (
    <div className={`${SET_GRID} t-caption pb-1`} aria-hidden="true">
      <span>Set</span>
      <span>Last time</span>
      <span className="text-center">kg</span>
      <span className="text-center">Reps</span>
      <span />
    </div>
  )
}
