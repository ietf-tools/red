export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      // Modern API
      await navigator.clipboard.writeText(text)
      console.info(`Successfully copied ${text} to clipboard`)
      return true
    }

    if (document?.execCommand) {
      // execCommand for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      // Prevent zooming on Apple iOS
      textArea.style.fontSize = '12pt'
      // Hide it visually to prevent flickering even though we immediately remove it
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0.0001'
      document.body.appendChild(textArea)
      const previousFocus = document.activeElement
      textArea.select() // steals browser focus
      const successful = document?.execCommand('copy')
      document.body.removeChild(textArea)
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus()
      }
      console.info(`Successfully copied ${text} to clipboard`)
      return successful
    }
  } catch (err) {
    console.error('Failed to copy text:', err)
    return false
  }

  console.error(`Failed to copy text on this platform: ${navigator.userAgent}`)
  return false
}
