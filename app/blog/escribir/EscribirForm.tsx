'use client'

// Blog post submission form.
// TipTap WYSIWYG editor for the body; title / name / email / images as plain inputs.
// Body HTML is read from the editor at submit time; all structural fields must be
// filled before the submit button is enabled. Body emptiness is validated on submit.

import { useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { Alert } from '@/app/components/ui/Alert'
import { PageBackground } from '@/app/components/ui/PageBackground'

const INPUT_CLASS   = 'w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all'
const LABEL_CLASS   = 'block text-sm font-medium text-foreground mb-2'
const HELPER_CLASS  = 'text-xs text-muted mt-1.5'

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function EscribirForm() {
  const [title,        setTitle]        = useState('')
  const [authorName,   setAuthorName]   = useState('')
  const [authorEmail,  setAuthorEmail]  = useState('')
  const [coverFile,    setCoverFile]    = useState<File | null>(null)
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [submitted,    setSubmitted]    = useState(false)

  const coverRef     = useRef<HTMLInputElement>(null)
  const secondaryRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none',
        'aria-label': 'Contenido del post',
      },
    },
  })

  const isFormValid =
    title.trim().length >= 4 &&
    title.trim().length <= 140 &&
    authorName.trim().length > 0 &&
    validateEmail(authorEmail) &&
    !!coverFile

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid || submitting) return

    const bodyHtml = editor?.getHTML() ?? ''
    if (!coverFile) {
      setError('La imagen de portada es requerida.')
      return
    }

    setSubmitting(true)
    setError(null)

    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('body_html', bodyHtml)
    fd.append('author_name', authorName.trim())
    fd.append('author_email', authorEmail.trim())
    fd.append('cover_image', coverFile)
    if (secondaryFile) fd.append('secondary_image', secondaryFile)

    try {
      const res = await fetch('/api/blog', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'Hubo un error. Intentá de nuevo.')
        setSubmitting(false)
        return
      }
      setSubmitted(true)
    } catch {
      setError('Error de red. Revisá tu conexión e intentá de nuevo.')
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="relative z-10 container-public pt-8 pb-12 text-center">
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-8 max-w-lg mx-auto">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Recibimos tu nota
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            La revisamos antes de publicarla. Si todo está bien, te escribimos cuando esté online.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 container-public pt-8 pb-12">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Escribí tu nota
      </h1>
      <p className="text-sm text-muted mb-8 leading-relaxed">
        Compartí tu perspectiva sobre bienestar holístico. La revisamos antes de publicarla.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Title */}
        <div>
          <label className={LABEL_CLASS} htmlFor="blog-title">Título *</label>
          <input
            id="blog-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de tu nota"
            maxLength={140}
            className={INPUT_CLASS}
          />
          <p className={HELPER_CLASS}>{title.length}/140 caracteres</p>
        </div>

        {/* Rich text editor */}
        <div>
          <label className={LABEL_CLASS}>Contenido *</label>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 mb-1 p-2 bg-surface-2 border border-outline rounded-t-xl">
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`px-2 py-1 text-xs font-bold rounded transition-all ${editor?.isActive('bold') ? 'bg-brand text-white' : 'hover:bg-outline'}`}>
              B
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`px-2 py-1 text-xs italic rounded transition-all ${editor?.isActive('italic') ? 'bg-brand text-white' : 'hover:bg-outline'}`}>
              I
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`px-2 py-1 text-xs underline rounded transition-all ${editor?.isActive('underline') ? 'bg-brand text-white' : 'hover:bg-outline'}`}>
              U
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-2 py-1 text-xs rounded transition-all ${editor?.isActive('heading', { level: 2 }) ? 'bg-brand text-white' : 'hover:bg-outline'}`}>
              H2
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1 text-xs rounded transition-all ${editor?.isActive('bulletList') ? 'bg-brand text-white' : 'hover:bg-outline'}`}>
              •
            </button>
          </div>
          <div className="border border-outline border-t-0 rounded-b-xl bg-surface overflow-hidden">
            <EditorContent editor={editor} />
          </div>
          <p className={HELPER_CLASS}>Usá el editor para dar formato a tu nota.</p>
        </div>

        {/* Author name */}
        <div>
          <label className={LABEL_CLASS} htmlFor="author-name">Tu nombre *</label>
          <input
            id="author-name"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Nombre completo"
            className={INPUT_CLASS}
          />
        </div>

        {/* Author email */}
        <div>
          <label className={LABEL_CLASS} htmlFor="author-email">Tu email *</label>
          <input
            id="author-email"
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="tu@email.com"
            className={INPUT_CLASS}
          />
          <p className={HELPER_CLASS}>Si sos profesional de Hara, vinculamos tu nota a tu perfil.</p>
        </div>

        {/* Cover image (required) */}
        <div>
          <label className={LABEL_CLASS} htmlFor="cover-image">Imagen de portada *</label>
          <input
            id="cover-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={coverRef}
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-brand file:text-white hover:file:bg-brand/90 cursor-pointer"
            aria-label="Imagen de portada"
          />
          {coverFile && (
            <p className={HELPER_CLASS}>Seleccionada: {coverFile.name}</p>
          )}
          <p className={HELPER_CLASS}>JPG, PNG o WebP · máx. 5 MB</p>
        </div>

        {/* Secondary image (optional) */}
        <div>
          <label className={LABEL_CLASS} htmlFor="secondary-image">Imagen secundaria (opcional)</label>
          <input
            id="secondary-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={secondaryRef}
            onChange={(e) => setSecondaryFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-surface-2 file:text-foreground hover:file:bg-outline cursor-pointer"
          />
          {secondaryFile && (
            <p className={HELPER_CLASS}>Seleccionada: {secondaryFile.name}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!isFormValid || submitting}
          className="w-full px-6 py-4 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-50"
        >
          {submitting ? 'Enviando...' : 'Publicar nota'}
        </button>

        <p className="text-xs text-muted text-center">
          Al enviar tu nota aceptás que Hara la revise antes de publicarla.
        </p>
      </form>
    </div>
  )
}
