'use client'

// Markdown file upload sub-component for the blog submission form.
// Accepts only .md/.markdown files, parses them, sanitizes the HTML,
// and reports { title, html } to the parent via onParsed.

import { useState } from 'react'
import { parseMarkdownDoc } from './parse-markdown'
import { sanitizeBlogHtml } from '@/lib/sanitize'

const MAX_BODY_CHARS = 50_000

const LABEL_CLASS  = 'block text-sm font-medium text-foreground mb-2'
const HELPER_CLASS = 'text-xs text-muted mt-1.5'

interface ParsedDoc {
  title: string | null
  html: string
}

interface Props {
  onParsed: (doc: ParsedDoc) => void
  onError:  (message: string) => void
}

function isMdFile(name: string): boolean {
  return /\.(md|markdown)$/i.test(name)
}

export function MarkdownUpload({ onParsed, onError }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isMdFile(file.name)) {
      onError('Solo se aceptan archivos .md')
      e.target.value = ''
      return
    }

    setLoading(true)
    setPreview(null)
    setFileName(null)

    try {
      const raw = await file.text()
      const { title, html: rawHtml } = parseMarkdownDoc(raw)
      const html = sanitizeBlogHtml(rawHtml)

      if (!html.trim()) {
        onError('El contenido del archivo está vacío.')
        setLoading(false)
        return
      }

      if (html.length > MAX_BODY_CHARS) {
        onError('El contenido es demasiado largo (límite: 50 000 caracteres).')
        setLoading(false)
        return
      }

      setPreview(html)
      setFileName(file.name)
      onParsed({ title, html })
    } catch {
      onError('No se pudo leer el archivo. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <label className={LABEL_CLASS} htmlFor="md-upload">
        Archivo .md *
      </label>

      <input
        id="md-upload"
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleChange}
        disabled={loading}
        className="w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-brand file:text-white hover:file:bg-brand/90 cursor-pointer disabled:opacity-50"
        aria-label="Subir archivo Markdown"
      />

      <p className={HELPER_CLASS}>
        {loading
          ? 'Procesando...'
          : 'Subí un archivo .md — el título sale del archivo (frontmatter o primer # H1).'}
      </p>

      {fileName && !loading && (
        <p className={HELPER_CLASS}>Cargado: {fileName}</p>
      )}

      {preview && !loading && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Vista previa</p>
          <div
            className="prose prose-sm max-w-none px-4 py-3 bg-surface border border-outline rounded-xl overflow-auto"
            // sanitizeBlogHtml has already stripped disallowed tags/attrs
            dangerouslySetInnerHTML={{ __html: preview }}
          />
          <p className={HELPER_CLASS}>Lo que ves es exactamente lo que se va a guardar.</p>
        </div>
      )}
    </div>
  )
}
