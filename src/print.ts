/**
 * Print a generated DANFE with the browser's print dialog, using a hidden iframe so the host page
 * is left untouched. Resolves once the print dialog has been handed over to the browser.
 */
export function printDanfe(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const cleanup = () => {
      URL.revokeObjectURL(url)
      iframe.remove()
    }
    iframe.onload = () => {
      const win = iframe.contentWindow
      if (!win) {
        cleanup()
        reject(new Error('Could not open the print frame'))
        return
      }
      win.addEventListener('afterprint', cleanup, { once: true })
      win.focus()
      win.print()
      resolve()
    }
    iframe.onerror = () => {
      cleanup()
      reject(new Error('Could not load the print frame'))
    }
    iframe.src = url
    document.body.appendChild(iframe)
  })
}
