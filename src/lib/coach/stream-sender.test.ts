import { describe, it, expect, vi } from 'vitest'
import { createStreamSender } from './stream-sender'

const chunk = (text: string) => new TextEncoder().encode(text)

function controllerThatClosesAfter(writes: number) {
  let count = 0
  return {
    enqueue: vi.fn(() => {
      count += 1
      if (count > writes) throw new TypeError('Invalid state: Controller is already closed')
    }),
    close: vi.fn(() => {
      throw new TypeError('Invalid state: Controller is already closed')
    }),
  }
}

describe('createStreamSender', () => {
  it('passes chunks through while the lifter is still on the page', () => {
    const controller = { enqueue: vi.fn(), close: vi.fn() }
    const sender = createStreamSender(controller)

    sender.send(chunk('a'))
    sender.close()

    expect(controller.enqueue).toHaveBeenCalledTimes(1)
    expect(controller.close).toHaveBeenCalledTimes(1)
    expect(sender.isOpen).toBe(false)
  })

  it('stops writing quietly once the lifter has left, so the reply can still be saved', () => {
    const controller = controllerThatClosesAfter(1)
    const sender = createStreamSender(controller)

    sender.send(chunk('first'))
    expect(() => sender.send(chunk('second'))).not.toThrow()
    expect(sender.isOpen).toBe(false)
    expect(() => sender.send(chunk('third'))).not.toThrow()
    expect(controller.enqueue).toHaveBeenCalledTimes(2)
  })

  it('closes without throwing when the stream is already gone', () => {
    const sender = createStreamSender(controllerThatClosesAfter(0))
    sender.send(chunk('x'))
    expect(() => sender.close()).not.toThrow()
  })
})
