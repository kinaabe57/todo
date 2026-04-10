import { useState, useRef, useEffect, useCallback } from 'react'
import { Note, Project } from '../../types'

interface NotesPanelProps {
  notes: Note[]
  projects: Project[]
  onAddNote: (projectId: string | null, content: string, title?: string | null) => Promise<Note>
  onUpdateNote: (id: string, updates: { content?: string; title?: string | null; pinned?: boolean }) => Promise<void>
  onDeleteNote: (id: string) => Promise<void>
  triggerNewNote?: boolean
  onTriggerNewNoteHandled?: () => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Shared DOM helpers ────────────────────────────────────────────────────────

function makeCheckboxDiv(): HTMLDivElement {
  const div = document.createElement('div')
  div.setAttribute('data-type', 'checkbox-line')
  const cb = document.createElement('input')
  cb.type = 'checkbox'
  cb.setAttribute('contenteditable', 'false')
  cb.style.cssText = 'margin-right:5px;cursor:pointer;vertical-align:middle;flex-shrink:0'
  div.appendChild(cb)
  div.appendChild(document.createTextNode(' '))
  return div
}

function serializeContent(el: HTMLDivElement): string {
  // Sync checkbox checked attribute with current checked property before reading innerHTML
  el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const input = cb as HTMLInputElement
    if (input.checked) input.setAttribute('checked', 'checked')
    else input.removeAttribute('checked')
  })
  const html = el.innerHTML
  return html === '<br>' ? '' : html
}

// Inserts a <ul><li> at the cursor's current block, replacing it
function insertBulletAtCursor(editor: HTMLDivElement) {
  const sel = window.getSelection()
  const ul = document.createElement('ul')
  const li = document.createElement('li')
  ul.appendChild(li)

  if (!sel?.rangeCount) {
    editor.appendChild(ul)
  } else {
    const range = sel.getRangeAt(0)
    let block: Node | null = range.startContainer
    while (block && block.parentNode !== editor) block = block.parentNode

    if (block && (block as HTMLElement).tagName === 'UL') {
      // Already in a list — add another item
      const newLi = document.createElement('li')
      ;(block as HTMLElement).appendChild(newLi)
      const r = document.createRange()
      r.setStart(newLi, 0); r.collapse(true)
      sel.removeAllRanges(); sel.addRange(r)
      return
    }

    if (block && block !== editor) {
      const text = block.textContent?.trim() || ''
      if (text) li.textContent = text
      editor.replaceChild(ul, block)
    } else {
      editor.appendChild(ul)
    }
  }

  const r = document.createRange()
  r.setStart(li, 0); r.collapse(true)
  sel?.removeAllRanges(); sel?.addRange(r)
  editor.focus()
}

// Returns true if handled — auto-converts "- " at line start to a bullet list
function tryBulletAutoCreate(e: React.KeyboardEvent<HTMLDivElement>, editor: HTMLDivElement): boolean {
  if (e.key !== ' ') return false
  const sel = window.getSelection()
  if (!sel?.rangeCount) return false
  const range = sel.getRangeAt(0)
  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return false
  const textToCursor = (node.textContent || '').slice(0, range.startOffset)
  if (textToCursor !== '-') return false

  e.preventDefault()
  const del = document.createRange()
  del.setStart(node, 0)
  del.setEnd(node, range.startOffset)
  del.deleteContents()
  insertBulletAtCursor(editor)
  return true
}

// Returns true if handled — Enter on an empty <li> exits the list
function tryListExit(e: React.KeyboardEvent<HTMLDivElement>, editor: HTMLDivElement): boolean {
  if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey) return false
  const sel = window.getSelection()
  if (!sel?.rangeCount) return false
  const range = sel.getRangeAt(0)

  let liEl: HTMLElement | null = null
  let cur: Node | null = range.startContainer
  while (cur && cur !== editor) {
    if ((cur as HTMLElement).tagName === 'LI') { liEl = cur as HTMLElement; break }
    cur = cur.parentNode
  }
  if (!liEl || liEl.textContent?.trim()) return false // only exit when li is empty

  e.preventDefault()
  const ul = liEl.parentNode as HTMLElement
  liEl.remove()
  if (ul.childElementCount === 0) ul.remove()

  const newDiv = document.createElement('div')
  newDiv.appendChild(document.createElement('br'))
  if (ul.nextSibling) editor.insertBefore(newDiv, ul.nextSibling)
  else editor.appendChild(newDiv)

  const r = document.createRange()
  r.setStart(newDiv, 0); r.collapse(true)
  sel.removeAllRanges(); sel.addRange(r)
  return true
}

// Returns true if handled — Enter inside a checkbox-line div
function tryCheckboxEnter(
  e: React.KeyboardEvent<HTMLDivElement>,
  editor: HTMLDivElement
): boolean {
  if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey) return false
  const sel = window.getSelection()
  if (!sel?.rangeCount) return false
  const range = sel.getRangeAt(0)

  // Walk up to find a [data-type="checkbox-line"] ancestor
  let cbDiv: HTMLElement | null = null
  let cur: Node | null = range.startContainer
  while (cur && cur !== editor) {
    if (cur.nodeType === Node.ELEMENT_NODE &&
        (cur as HTMLElement).getAttribute('data-type') === 'checkbox-line') {
      cbDiv = cur as HTMLElement
      break
    }
    cur = cur.parentNode
  }
  if (!cbDiv) return false

  e.preventDefault()
  const hasText = cbDiv.textContent?.trim() || ''

  if (!hasText) {
    // Empty checkbox line → replace with a normal empty block
    const newDiv = document.createElement('div')
    newDiv.appendChild(document.createElement('br'))
    cbDiv.parentNode?.insertBefore(newDiv, cbDiv.nextSibling)
    cbDiv.remove()
    const newRange = document.createRange()
    newRange.setStart(newDiv, 0)
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
  } else {
    // Create a new checkbox line after
    const newDiv = makeCheckboxDiv()
    cbDiv.parentNode?.insertBefore(newDiv, cbDiv.nextSibling)
    const newRange = document.createRange()
    newRange.setStart(newDiv.lastChild!, 1)
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
  }
  return true
}

// Inserts a checkbox div after the block containing the cursor
function insertCheckboxAtCursor(editor: HTMLDivElement) {
  const sel = window.getSelection()
  if (!sel?.rangeCount) {
    editor.appendChild(makeCheckboxDiv())
    return
  }
  const range = sel.getRangeAt(0)
  // Find the top-level child of editor that contains the cursor
  let blockNode: Node | null = range.startContainer
  while (blockNode && blockNode.parentNode !== editor) {
    blockNode = blockNode.parentNode
  }
  const newDiv = makeCheckboxDiv()
  if (blockNode) {
    editor.insertBefore(newDiv, blockNode.nextSibling)
  } else {
    editor.appendChild(newDiv)
  }
  // Place cursor right after the space in the new checkbox div
  const newRange = document.createRange()
  newRange.setStart(newDiv.lastChild!, 1)
  newRange.collapse(true)
  sel.removeAllRanges()
  sel.addRange(newRange)
}

// Strips pasted HTML to only allowed formatting (bold/italic/underline/lists)
function sanitizePastedHTML(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const children = Array.from(el.childNodes).map(processNode).join('')
    if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'section', 'article'].includes(tag))
      return `<div>${children}</div>`
    if (tag === 'br') return '<br>'
    if (['ul', 'ol'].includes(tag)) return `<ul>${children}</ul>`
    if (tag === 'li') return `<li>${children}</li>`
    if (['b', 'strong'].includes(tag)) return `<strong>${children}</strong>`
    if (['i', 'em'].includes(tag)) return `<em>${children}</em>`
    if (tag === 'u') return `<u>${children}</u>`
    if (['span', 'font', 'a', 'td', 'th'].includes(tag)) {
      const s = el.style
      let out = children
      if (s.fontWeight === 'bold' || Number(s.fontWeight) >= 700) out = `<strong>${out}</strong>`
      if (s.fontStyle === 'italic') out = `<em>${out}</em>`
      if (s.textDecoration?.includes('underline')) out = `<u>${out}</u>`
      return out
    }
    return children
  }

  return Array.from(div.childNodes).map(processNode).join('')
}

// Strips all inline formatting from current selection back to plain text
function clearFormatting(editor: HTMLDivElement) {
  editor.focus()
  const sel = window.getSelection()
  if (sel && sel.rangeCount && sel.getRangeAt(0).collapsed) {
    // Nothing selected — select all
    const r = document.createRange()
    r.selectNodeContents(editor)
    sel.removeAllRanges()
    sel.addRange(r)
  }
  document.execCommand('removeFormat', false)
  editor.querySelectorAll('font').forEach(font => {
    while (font.firstChild) font.parentNode?.insertBefore(font.firstChild, font)
    font.remove()
  })
  editor.querySelectorAll('[style]').forEach(el => (el as HTMLElement).removeAttribute('style'))
}

// Applies a font size to the current selection
const FONT_SIZES = [
  { label: 'S', px: 11, legacy: '1' },
  { label: 'M', px: 13, legacy: '2' },
  { label: 'L', px: 16, legacy: '3' },
  { label: 'XL', px: 20, legacy: '5' },
]

function applyFontSize(editor: HTMLDivElement, legacy: string, px: number) {
  editor.focus()
  document.execCommand('fontSize', false, legacy)
  editor.querySelectorAll('font[size]').forEach(font => {
    const span = document.createElement('span')
    span.style.fontSize = `${px}px`
    while (font.firstChild) span.appendChild(font.firstChild)
    font.parentNode?.replaceChild(span, font)
  })
}

// Paste handler — sanitizes HTML and handles image data
function handlePaste(e: React.ClipboardEvent<HTMLDivElement>, markDirty?: () => void): boolean {
  // Image paste
  const imageItem = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
  if (imageItem) {
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return true
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      document.execCommand('insertHTML', false,
        `<img src="${dataUrl}" style="max-width:100%;height:auto;border-radius:4px;display:block;margin:4px 0">`)
      markDirty?.()
    }
    reader.readAsDataURL(file)
    return true
  }
  // HTML paste — sanitize
  const html = e.clipboardData.getData('text/html')
  if (html) {
    e.preventDefault()
    const clean = sanitizePastedHTML(html)
    document.execCommand('insertHTML', false, clean)
    markDirty?.()
    return true
  }
  return false
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface NoteToolbarProps {
  onBold: (e: React.MouseEvent) => void
  onItalic: (e: React.MouseEvent) => void
  onUnderline: (e: React.MouseEvent) => void
  onBulletList: (e: React.MouseEvent) => void
  onCheckbox: (e: React.MouseEvent) => void
  onClearFormat: (e: React.MouseEvent) => void
  onFontSize: (legacy: string, px: number) => void
}

function NoteToolbar({ onBold, onItalic, onUnderline, onBulletList, onCheckbox, onClearFormat, onFontSize }: NoteToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 pb-2 border-b border-white/8">
      <ToolBtn title="Bold (⌘B)" onMouseDown={onBold}><strong className="text-xs">B</strong></ToolBtn>
      <ToolBtn title="Italic (⌘I)" onMouseDown={onItalic}><em className="text-xs">I</em></ToolBtn>
      <ToolBtn title="Underline (⌘U)" onMouseDown={onUnderline}><u className="text-xs">U</u></ToolBtn>
      <div className="w-px h-4 bg-white/12 mx-1" />
      <ToolBtn title={'Bullet list — or type "- " then space'} onMouseDown={onBulletList}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="7" r="1.5" fill="currentColor" />
          <line x1="9" y1="7" x2="20" y2="7" strokeWidth="2" strokeLinecap="round" />
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <line x1="9" y1="12" x2="20" y2="12" strokeWidth="2" strokeLinecap="round" />
          <circle cx="5" cy="17" r="1.5" fill="currentColor" />
          <line x1="9" y1="17" x2="20" y2="17" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Checkbox — Enter for next, empty Enter to exit" onMouseDown={onCheckbox}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12l3 3 5-5" />
        </svg>
      </ToolBtn>
      <div className="w-px h-4 bg-white/12 mx-1" />
      <select
        onMouseDown={e => e.stopPropagation()}
        onChange={e => {
          const opt = FONT_SIZES.find(s => s.label === e.target.value)
          if (opt) onFontSize(opt.legacy, opt.px)
          e.target.value = ''
        }}
        defaultValue=""
        title="Font size"
        className="h-6 text-[11px] text-slate-500 bg-transparent border border-slate-200 rounded px-0.5 cursor-pointer hover:border-slate-400 focus:outline-none"
      >
        <option value="" disabled>Aa</option>
        {FONT_SIZES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
      </select>
      <ToolBtn title="Clear formatting" onMouseDown={onClearFormat}>
        <span className="text-[10px] font-mono leading-none">Tx</span>
      </ToolBtn>
    </div>
  )
}

function ToolBtn({ children, title, onMouseDown }: {
  children: React.ReactNode
  title: string
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <button
      title={title}
      onMouseDown={onMouseDown}
      className="w-6 h-6 flex items-center justify-center rounded text-white/45 hover:bg-white/10 hover:text-white/80 transition-colors"
    >
      {children}
    </button>
  )
}

// ── New note inline card ──────────────────────────────────────────────────────

interface NewNoteCardProps {
  onSave: (title: string | null, content: string) => Promise<void>
  onCancel: () => void
}

function NewNoteCard({ onSave, onCancel }: NewNoteCardProps) {
  const [title, setTitle] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef(false)

  useEffect(() => { editorRef.current?.focus() }, [])

  const getContent = () => editorRef.current ? serializeContent(editorRef.current) : ''

  const commitSave = async () => {
    if (savedRef.current) return
    const content = getContent()
    if (!content.trim() && !title.trim()) { onCancel(); return }
    savedRef.current = true
    await onSave(title.trim() || null, content)
  }

  const handleBlur = (e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null
    if (cardRef.current?.contains(related)) return // focus stayed inside card
    commitSave()
  }

  const toolbar: NoteToolbarProps = {
    onBold:        (e) => { e.preventDefault(); document.execCommand('bold', false) },
    onItalic:      (e) => { e.preventDefault(); document.execCommand('italic', false) },
    onUnderline:   (e) => { e.preventDefault(); document.execCommand('underline', false) },
    onBulletList:  (e) => { e.preventDefault(); if (editorRef.current) insertBulletAtCursor(editorRef.current) },
    onCheckbox:    (e) => { e.preventDefault(); if (editorRef.current) insertCheckboxAtCursor(editorRef.current) },
    onClearFormat: (e) => { e.preventDefault(); if (editorRef.current) clearFormatting(editorRef.current) },
    onFontSize:    (legacy, px) => { if (editorRef.current) applyFontSize(editorRef.current, legacy, px) },
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold', false); return }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic', false); return }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline', false); return }
    }
    if (editorRef.current && tryBulletAutoCreate(e, editorRef.current)) return
    if (editorRef.current && tryListExit(e, editorRef.current)) return
    if (editorRef.current && tryCheckboxEnter(e, editorRef.current)) return
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div ref={cardRef} className="mac-raised overflow-hidden">
      <div className="px-2 py-1.5 mac-panel-header border-b border-[#8090b0] flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleBlur}
          placeholder="Title (optional)"
          className="flex-1 text-xs font-bold text-[#1a2a3a] bg-transparent focus:outline-none placeholder:text-[#7090b0] uppercase tracking-wide"
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); onCancel() }}
          className="text-[#6080a0] hover:text-[#1a2a3a] transition-colors flex-shrink-0"
          title="Discard"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-2.5 bg-[#f0f4f8]">
        <NoteToolbar {...toolbar} />
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={(e) => handlePaste(e)}
          data-placeholder="Write your note…"
          className="text-xs text-[#1a2a3a] min-h-[80px] focus:outline-none leading-relaxed note-editor mt-2"
        />
      </div>
    </div>
  )
}

// ── Note card ─────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note
  projectName?: string
  onUpdate: (id: string, updates: { content?: string; title?: string | null; pinned?: boolean }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function NoteCard({ note, projectName, onUpdate, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(note.title || '')
  const editorRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isDirtyRef = useRef(false)

  useEffect(() => {
    if (!editing) setTitle(note.title || '')
  }, [note.title, editing])

  useEffect(() => {
    if (editing && editorRef.current) {
      editorRef.current.innerHTML = note.content || ''
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(editorRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
      editorRef.current.focus()
    }
  }, [editing])

  const getContent = useCallback(() =>
    editorRef.current ? serializeContent(editorRef.current) : note.content
  , [note.content])

  const saveAndClose = useCallback(async () => {
    if (!isDirtyRef.current) { setEditing(false); return }
    await onUpdate(note.id, { content: getContent(), title: title.trim() || null })
    isDirtyRef.current = false
    setEditing(false)
  }, [note.id, title, onUpdate, getContent])

  // Auto-save when focus leaves the card
  const handleBlur = useCallback((e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null
    if (cardRef.current?.contains(related)) return // focus moved within card
    saveAndClose()
  }, [saveAndClose])

  const toolbar: NoteToolbarProps = {
    onBold:        (e) => { e.preventDefault(); document.execCommand('bold', false); isDirtyRef.current = true },
    onItalic:      (e) => { e.preventDefault(); document.execCommand('italic', false); isDirtyRef.current = true },
    onUnderline:   (e) => { e.preventDefault(); document.execCommand('underline', false); isDirtyRef.current = true },
    onBulletList:  (e) => { e.preventDefault(); if (editorRef.current) { insertBulletAtCursor(editorRef.current); isDirtyRef.current = true } },
    onCheckbox:    (e) => { e.preventDefault(); if (editorRef.current) { insertCheckboxAtCursor(editorRef.current); isDirtyRef.current = true } },
    onClearFormat: (e) => { e.preventDefault(); if (editorRef.current) { clearFormatting(editorRef.current); isDirtyRef.current = true } },
    onFontSize:    (legacy, px) => { if (editorRef.current) { applyFontSize(editorRef.current, legacy, px); isDirtyRef.current = true } },
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold', false); isDirtyRef.current = true; return }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic', false); isDirtyRef.current = true; return }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline', false); isDirtyRef.current = true; return }
    }
    if (editorRef.current && tryBulletAutoCreate(e, editorRef.current)) { isDirtyRef.current = true; return }
    if (editorRef.current && tryListExit(e, editorRef.current)) { isDirtyRef.current = true; return }
    if (editorRef.current && tryCheckboxEnter(e, editorRef.current)) { isDirtyRef.current = true; return }
    if (e.key === 'Escape') { saveAndClose(); return }
    isDirtyRef.current = true
  }

  const handleViewClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement
    if (target.tagName === 'INPUT' && target.type === 'checkbox') {
      e.stopPropagation()
      const container = e.currentTarget
      const allCbs = Array.from(container.querySelectorAll('input[type="checkbox"]'))
      const idx = allCbs.indexOf(target)
      if (idx === -1) return
      const tmp = document.createElement('div')
      tmp.innerHTML = note.content
      const stored = Array.from(tmp.querySelectorAll('input[type="checkbox"]'))
      if (stored[idx]) {
        const cb = stored[idx] as HTMLInputElement
        if (cb.checked || cb.hasAttribute('checked')) cb.removeAttribute('checked')
        else cb.setAttribute('checked', 'checked')
        await onUpdate(note.id, { content: tmp.innerHTML })
      }
      return
    }
    setEditing(true)
  }

  return (
    <div
      ref={cardRef}
      className={`mac-raised overflow-hidden transition-colors ${note.pinned ? 'outline outline-2 outline-amber-500' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1 mac-panel-header border-b border-[#8090b0]">
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
          className={`p-0.5 transition-colors flex-shrink-0 ${note.pinned ? 'text-amber-600' : 'text-[#6080a0] hover:text-amber-500'}`}
          title={note.pinned ? 'Unpin' : 'Pin note'}
        >
          <svg className="w-3.5 h-3.5" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        {projectName && (
          <span className="text-xs px-1.5 py-0.5 bg-primary-500 text-white font-medium rounded-md truncate max-w-[90px]">
            {projectName}
          </span>
        )}
        <span className="text-xs text-[#4a6080] ml-auto flex-shrink-0">{formatDate(note.createdAt)}</span>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={() => onDelete(note.id)}
          className="p-0.5 text-[#6080a0] hover:text-red-600 transition-colors flex-shrink-0 ml-1"
          title="Delete note"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-2.5 bg-[#f0f4f8]">
        {editing ? (
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); isDirtyRef.current = true }}
            onBlur={handleBlur}
            placeholder="Title (optional)"
            className="w-full text-xs font-bold text-[#1a2a3a] bg-transparent border-b border-[#8090b0] focus:outline-none focus:border-primary-500 pb-1 mb-2 placeholder:text-[#7090b0] uppercase tracking-wide"
          />
        ) : note.title ? (
          <p className="text-xs font-bold text-[#1a2a3a] mb-1.5 uppercase tracking-wide">{note.title}</p>
        ) : null}

        {editing && <NoteToolbar {...toolbar} />}

        {editing ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onPaste={(e) => handlePaste(e, () => { isDirtyRef.current = true })}
            data-placeholder="Write your note…"
            className="text-xs text-[#1a2a3a] min-h-[60px] focus:outline-none leading-relaxed note-editor mt-2"
          />
        ) : (
          <div
            className="text-xs text-[#1a2a3a] leading-relaxed note-content cursor-text"
            dangerouslySetInnerHTML={{ __html: note.content || '<span style="color:#909090;font-style:italic">Click to edit…</span>' }}
            onClick={handleViewClick}
          />
        )}
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function NotesPanel({ notes, projects, onAddNote, onUpdateNote, onDeleteNote, triggerNewNote, onTriggerNewNoteHandled }: NotesPanelProps) {
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (triggerNewNote) {
      setIsCreating(true)
      onTriggerNewNoteHandled?.()
    }
  }, [triggerNewNote])

  const handleSaveNew = async (title: string | null, content: string) => {
    await onAddNote(null, content, title)
    setIsCreating(false)
  }

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

  return (
    <div className="flex flex-col h-full t-panel-bg">
      <div className="flex items-center justify-between px-3 py-2 mac-panel-header">
        <h2 className="text-[11px] font-semibold text-white/45 uppercase tracking-[0.1em]">Notes</h2>
        <button
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-primary-600/80 text-white rounded-lg hover:bg-primary-500/80 disabled:opacity-50 transition-colors backdrop-blur-sm"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Note
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isCreating && (
          <NewNoteCard onSave={handleSaveNew} onCancel={() => setIsCreating(false)} />
        )}

        {notes.length === 0 && !isCreating && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <svg className="w-10 h-10 text-[#6080a0] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs font-bold text-[#3a5070]">No notes yet</p>
            <p className="text-xs text-[#5070a0] mt-1">Click "New Note" to start</p>
          </div>
        )}

        {notes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            projectName={note.projectId ? projectMap[note.projectId] : undefined}
            onUpdate={onUpdateNote}
            onDelete={onDeleteNote}
          />
        ))}
      </div>
    </div>
  )
}
