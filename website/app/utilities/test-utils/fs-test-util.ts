import fsPromises from 'node:fs/promises'

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fsPromises.stat(filePath)
    return true
  } catch {
    return false
  }
}
