/**
 * Parses without throwing errors, instead when errors occur it logs them returns `undefined`.
 */
export const safeJsonParse = (
  jsonString: string
): ReturnType<typeof JSON.parse> | undefined => {
  try {
    return JSON.parse(jsonString)
  } catch (e: unknown) {
    console.error(`Failed to parse JSON. Error:`, e)
  }
  return
}
