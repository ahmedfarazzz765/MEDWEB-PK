import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import {
  Bold, Italic, Underline as UnderlineIcon, Link2, Image as ImageIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Quote, Undo2, Redo2,
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

const FONT_SIZES = [
  { label: 'Small', value: 'size-small' },
  { label: 'Normal', value: 'size-normal' },
  { label: 'Large', value: 'size-large' },
  { label: 'Heading', value: 'size-heading' },
]

const SIZE_PX = { 'size-small': '13px', 'size-normal': '16px', 'size-large': '20px' }

const btnCls = active =>
  `p-2 rounded-lg transition-colors ${active ? 'bg-[#1655c3] text-white' : 'text-gray-600 hover:bg-gray-100'}`

export default function RichTextEditor({ value, onChange, folder = 'medweb/blog/content' }) {
  const fileInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TiptapImage,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
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

  const handleSizeChange = e => {
    const size = e.target.value
    if (size === 'size-heading') {
      editor.chain().focus().unsetFontSize().toggleHeading({ level: 2 }).run()
    } else {
      editor.chain().focus().setParagraph().setFontSize(SIZE_PX[size]).run()
    }
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
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-white">
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

      <div className="bg-white max-h-[400px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
