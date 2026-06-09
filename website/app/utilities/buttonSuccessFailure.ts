export type Message = { type: 'big', innerText: string } | { type: 'medium', innerText: string }

type Success = { type: 'success', message: Message[], timeoutMs: number }
type Error = { type: 'error', message: Message[], timeoutMs: number }
export type ButtonResult = Success | Error

export type ButtonResulClickHandler = () => Promise<ButtonResult>

// The duration is an accessibility issue. Please research before updating.
export const BUBBLE_DURATION_MS = 4000