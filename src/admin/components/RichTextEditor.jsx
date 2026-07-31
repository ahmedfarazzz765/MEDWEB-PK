import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Subscript as SubIcon, Superscript as SupIcon,
  Link2, Image as ImageIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Quote, Undo2, Redo2,
} from 'lucide-react'
import { uploadToCloudinary } from '../../firebase/cloudinary'

// Curated, not exhaustive — matches the site's own typography (Poppins)
// plus a small set of formal/serif/mono alternates for occasional emphasis.
const FONT_FAMILIES = [
  { label: 'Default (Poppins)', value: '' },
  { label: 'Serif (Georgia)', value: 'Georgia, serif' },
  { label: 'Sans (Arial)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Monospace', value: '"Courier New", monospace' },
]

// Pure text-size, independent of heading level — a 32px "Large" paragraph
// and an H2 are different things, so this no longer conflates the two the
// way the old single "Heading" size option used to (see FORMATS below).
const FONT_SIZES = [
  { label: 'Small', value: 'size-small' },
  { label: 'Normal', value: 'size-normal' },
  { label: 'Large', value: 'size-large' },
]

const SIZE_PX = { 'size-small': '13px', 'size-normal': '16px', 'size-large': '20px' }

// Structural format — paragraph vs. a real heading level — separate from
// FONT_SIZES above (which only ever changes inline text size, never the
// underlying HTML tag).
const FORMATS = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
]

const btnCls = active =>
  `p-2 rounded-lg transition-colors ${active ? 'bg-[#1655c3] text-white' : 'text-gray-600 hover:bg-gray-100'}`

// `contentHeightClass` lets callers opt into a taller/full-height writing
// surface (the full-page blog editor) without changing the compact default
// used anywhere this is embedded in a small modal.
export default function RichTextEditor({ value, onChange, folder = 'medweb/blog/content', contentHeightClass = 'max-h-[400px] overflow-y-auto' }) {
  const fileInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TiptapImage,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
      TextStyle,
      FontFamily,
      FontSize,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'blog-content min-h-[220px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  if (!editor) return null

  const activeFormat = editor.isActive('heading', { level: 2 }) ? 'h2'
    : editor.isActive('heading', { level: 3 }) ? 'h3'
    : 'paragraph'

  const handleFormatChange = e => {
    const val = e.target.value
    if (val === 'h2') editor.chain().focus().setHeading({ level: 2 }).run()
    else if (val === 'h3') editor.chain().focus().setHeading({ level: 3 }).run()
    else editor.chain().focus().setParagraph().run()
  }

  const handleSizeChange = e => {
    editor.chain().focus().setFontSize(SIZE_PX[e.target.value]).run()
  }

  const handleFontFamilyChange = e => {
    const family = e.target.value
    if (family) editor.chain().focus().setFontFamily(family).run()
    else editor.chain().focus().unsetFontFamily().run()
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const handleImageButton = () => fileInputRef.current?.click()
  const handleImageFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadToCloudinary(file, folder)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      alert('Image upload failed: ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  return (
    // No h-full here: this box must size to its own content (height: auto)
    // so a long post grows taller than the viewport and the page around it
    // scrolls to reach it. `h-full` previously clamped this box to its
    // parent's height, and with `overflow-hidden` (kept only to clip the
    // rounded corners) that silently hard-cropped everything past the fold
    // instead of letting it scroll — the full-page editor's exact bug.
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex flex-col">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-white shrink-0">
        <select value={activeFormat} onChange={handleFormatChange} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer">
          {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select onChange={handleSizeChange} defaultValue="size-normal" className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer">
          {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select onChange={handleFontFamilyChange} defaultValue="" className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer">
          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive('bold'))} title="Bold"><Bold size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnCls(editor.isActive('italic'))} title="Italic"><Italic size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnCls(editor.isActive('underline'))} title="Underline"><UnderlineIcon size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnCls(editor.isActive('strike'))} title="Strikethrough"><Strikethrough size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} className={btnCls(editor.isActive('subscript'))} title="Subscript"><SubIcon size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={btnCls(editor.isActive('superscript'))} title="Superscript"><SupIcon size={15} /></button>
        <button type="button" onClick={setLink} className={btnCls(editor.isActive('link'))} title="Link"><Link2 size={15} /></button>
        <button type="button" onClick={handleImageButton} className={btnCls(false)} title="Insert Image"><ImageIcon size={15} /></button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnCls(editor.isActive('bulletList'))} title="Bullet List"><List size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnCls(editor.isActive('orderedList'))} title="Numbered List"><ListOrdered size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnCls(editor.isActive('blockquote'))} title="Blockquote"><Quote size={15} /></button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnCls(editor.isActive({ textAlign: 'left' }))} title="Align Left"><AlignLeft size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnCls(editor.isActive({ textAlign: 'center' }))} title="Align Center"><AlignCenter size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnCls(editor.isActive({ textAlign: 'right' }))} title="Align Right"><AlignRight size={15} /></button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btnCls(false)} title="Undo"><Undo2 size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btnCls(false)} title="Redo"><Redo2 size={15} /></button>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      </div>

      <div className={`bg-white ${contentHeightClass}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
