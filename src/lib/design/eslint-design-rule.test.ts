import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'

const eslint = new ESLint({ cwd: process.cwd() })

async function designMessages(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath })
  return result.messages.filter((message) => message.message.startsWith('Design:'))
}

const BAD_COMPONENT = `
export function Bad() {
  return <div style={{ color: '#ff0000', background: 'rgba(0,0,0,0.5)' }} className="text-[10px] bg-zinc-800 bg-[#123456]" />
}
`

describe('design guard lint rule', { timeout: 30000 }, () => {
  it('warns on raw colours, pixel font sizes and off-palette greys in feature code', async () => {
    const messages = await designMessages(BAD_COMPONENT, 'src/components/x/Bad.tsx')

    const texts = messages.map((message) => message.message)
    for (const category of ['raw hex', 'raw rgb', 'pixel font size', 'off-palette grey', 'arbitrary colour']) {
      expect(texts.some((text) => text.includes(category)), category).toBe(true)
    }
    expect(messages.every((message) => message.severity === 1)).toBe(true)
  })

  it('exempts the ui primitive files but lints other files in ui/', async () => {
    expect(await designMessages(BAD_COMPONENT, 'src/components/ui/Button.tsx')).toHaveLength(0)
    expect((await designMessages(BAD_COMPONENT, 'src/components/ui/BodyMap/Chart.tsx')).length).toBeGreaterThan(0)
  })

  it('lints plain .ts files but not test files', async () => {
    const code = "export const COLOUR = '#f59e0b'"

    expect(await designMessages(code, 'src/lib/data/badges.ts')).toHaveLength(1)
    expect(await designMessages(code, 'src/lib/data/badges.test.ts')).toHaveLength(0)
  })

  it('warns on Tailwind palette colours but allows black overlays', async () => {
    const palette = await designMessages('export const A = () => <div className="text-red-400 bg-white" />', 'src/components/x/A.tsx')
    expect(palette.some((message) => message.message.includes('palette colour'))).toBe(true)

    const overlay = await designMessages('export const B = () => <div className="bg-black/60" />', 'src/components/x/B.tsx')
    expect(overlay).toHaveLength(0)
  })

  it('warns on legacy tokens but not on current ones', async () => {
    const legacy = await designMessages("export const c = 'var(--accent)'", 'src/components/x/c.ts')
    expect(legacy.map((message) => message.message).some((text) => text.includes('legacy token'))).toBe(true)

    const current = await designMessages("export const c = 'var(--text-primary)'", 'src/components/x/c.ts')
    expect(current).toHaveLength(0)
  })

  it('warns once on an rgba string literal', async () => {
    const code = `export const Box = () => <div style={{ background: 'rgba(0,0,0,0.5)' }} />`
    const messages = await designMessages(code, 'src/components/x/Box.tsx')

    expect(messages).toHaveLength(1)
  })

  it('warns on hex colours inside template literals', async () => {
    const code = 'export const Box = ({ x }: { x: string }) => <div className={`bg-[#fff] ${x}`} />'
    const messages = await designMessages(code, 'src/components/x/Box.tsx')

    expect(messages.length).toBeGreaterThanOrEqual(1)
  })

  it('warns on pixel font sizes and off-palette greys inside template literals', async () => {
    const code = 'export const Box = ({ x }: { x: string }) => <div className={`text-[10px] bg-zinc-800 ${x}`} />'
    const texts = (await designMessages(code, 'src/components/x/Box.tsx')).map((message) => message.message)

    expect(texts.some((text) => text.includes('pixel font size'))).toBe(true)
    expect(texts.some((text) => text.includes('off-palette grey'))).toBe(true)
  })

  it('accepts token-based classes', async () => {
    const code = `export const Ok = () => <div className="text-xs bg-surface text-primary" />`
    const messages = await designMessages(code, 'src/components/x/Ok.tsx')

    expect(messages).toHaveLength(0)
  })
})
