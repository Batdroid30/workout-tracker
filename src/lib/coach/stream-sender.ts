type StreamController = Pick<ReadableStreamDefaultController<Uint8Array>, 'enqueue' | 'close'>

export interface StreamSender {
  send(chunk: Uint8Array): void
  close(): void
  readonly isOpen: boolean
}

// Writes to the reply stream until the lifter leaves the page. After that the
// stream is closed and writing throws; the sender goes quiet instead, so the
// route can still finish the reply and save it.
export function createStreamSender(controller: StreamController): StreamSender {
  let open = true

  return {
    send(chunk) {
      if (!open) return
      try {
        controller.enqueue(chunk)
      } catch {
        // The client disconnected; nothing left to write to.
        open = false
      }
    },
    close() {
      if (!open) return
      open = false
      try {
        controller.close()
      } catch {
        // Already closed by the client going away.
      }
    },
    get isOpen() {
      return open
    },
  }
}
