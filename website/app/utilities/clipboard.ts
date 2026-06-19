export const copyTextToClipboard = async (text: string): Promise<boolean> => {
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
      if (successful) {
        console.info(`Successfully copied ${text} to clipboard`)
        return true
      }
    }
  } catch (err) {
    console.error('Failed to copy text:', err)
    return false
  }

  console.error(`Failed to copy text on this platform: ${navigator.userAgent}`)
  return false
}

export const copyHtmlToClipboard = async (html: string): Promise<boolean> => {
  const blob = new Blob([html], { type: 'text/html' })
  const clipboardItem = new window.ClipboardItem({ 'text/html': blob })
  try {
    await navigator.clipboard.write([clipboardItem])
    return true
  } catch (err) {
    console.error('Failed to copy HTML: ', err, html)
  }
  return false
}
