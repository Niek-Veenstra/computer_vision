function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function printableContent(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement
  clone.classList.add('pdf-document-content')
  clone.removeAttribute('contenteditable')
  clone.removeAttribute('role')
  clone.removeAttribute('aria-label')
  clone.removeAttribute('aria-multiline')
  clone.querySelectorAll('[contenteditable]').forEach((child) => {
    child.removeAttribute('contenteditable')
  })
  clone.querySelectorAll('.ProseMirror-selectednode').forEach((child) => {
    child.classList.remove('ProseMirror-selectednode')
  })
  return clone.outerHTML
}

function pageStyles(): string {
  return [...document.querySelectorAll('style, link[rel="stylesheet"]')]
    .map((element) => element.outerHTML)
    .join('\n')
}

export async function toPdf(title: string, element: HTMLElement): Promise<void> {
  const documentTitle = title.trim() || 'Untitled document'
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.left = '-10000px'
  frame.style.top = '0'
  frame.style.width = '210mm'
  frame.style.height = '297mm'
  frame.style.border = '0'

  const loaded = new Promise<void>((resolve) => {
    frame.addEventListener('load', () => resolve(), { once: true })
  })
  frame.srcdoc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <base href="${escapeHtml(document.baseURI)}">
    <title>${escapeHtml(documentTitle)}</title>
    ${pageStyles()}
    <style>
      @page { size: A4; margin: 20mm; }
      html, body { background: white; color: #111827; }
      body { margin: 0; font-family: Arial, sans-serif; }
      .pdf-document-title { margin: 0 0 1.5rem; font-size: 2rem; font-weight: 600; }
      .pdf-document-content { line-height: 1.75; }
      .pdf-document-content.ProseMirror { min-height: 0; padding: 0; outline: none; }
      .pdf-document-content .ProseMirror-selectednode { outline: none; }
    </style>
  </head>
  <body>
    <main>
      <h1 class="pdf-document-title">${escapeHtml(documentTitle)}</h1>
      ${printableContent(element)}
    </main>
  </body>
</html>`
  document.body.append(frame)
  await loaded

  const printWindow = frame.contentWindow
  if (!printWindow) {
    frame.remove()
    throw new Error('The PDF print frame could not be opened')
  }

  await printWindow.document.fonts?.ready
  const removeFrame = () => frame.remove()
  printWindow.addEventListener('afterprint', removeFrame, { once: true })
  printWindow.focus()
  printWindow.print()
  window.setTimeout(removeFrame, 60_000)
}
