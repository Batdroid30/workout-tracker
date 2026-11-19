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

  it('exempts the ui primitives folder', async () => {
    const messages = await designMessages(BAD_COMPONENT, 'src/components/ui/Ok.tsx')

    expect(messages).toHaveLength(0)
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
