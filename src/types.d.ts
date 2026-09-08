/** mammoth ships types for its node entry only; the browser build has none. */
declare module 'mammoth/mammoth.browser' {
  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer },
  ): Promise<{ value: string; messages: unknown[] }>
}
