import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold, Italic, Highlighter, List, AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from 'lucide-react'

// Tiptap ships no official line-height extension — this adds a `lineHeight`
// attribute (rendered as an inline style) to paragraphs and list items, the
// only two block types the letter body actually uses.
const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return { types: ['paragraph', 'listItem'] }
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: el => el.style.lineHeight || null,
          renderHTML: attrs => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
        },
      },
    }]
  },
  addCommands() {
    return {
      setLineHeight: lineHeight => ({ commands }) =>
        this.options.types.every(type => commands.updateAttributes(type, { lineHeight })),
    }
  },
})

const LINE_HEIGHTS = [
  { label: 'Single', value: '1' },
  { label: '1.5×', value: '1.5' },
  { label: 'Double', value: '2' },
]

const btnCls = active =>
  `p-2 rounded-lg transition-colors ${active ? 'bg-[#1655c3] text-white' : 'text-gray-600 hover:bg-gray-100'}`

// Rich-text editor for the Ambassador Letter body. A deliberately smaller
// toolbar than the blog RichTextEditor.jsx (bold/highlight/italic/line
// spacing/bullets/alignment only) — this is one formal letter body, not a
// blog post, so headings/links/images/blockquotes don't apply here.
// {name}/{code}/etc. placeholders are just plain text inside the editor —
// fillTokens() in ambassadorLetterGenerator.js substitutes them by regex
// over the saved HTML string, same as it did over plain text before.
export default function LetterBodyRichEditor({ value, onChange, onBlur }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Highlight,
      TextAlign.configure({ types: ['paragraph', 'listItem'], alignments: ['left', 'center', 'right', 'justify'] }),
      LineHeight,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'letter-body min-h-[200px] px-4 py-3 focus:outline-none',
      },
    },
    // Local state (and therefore the live preview box) updates on every
    // keystroke; the actual Firestore write only happens on blur, same
    // cadence as the plain textarea this replaced.
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
  })

  if (!editor) return null

  const activeLineHeight = LINE_HEIGHTS.find(l => editor.isActive('paragraph', { lineHeight: l.value }))?.value || '1'

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-white">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive('bold'))} title="Bold"><Bold size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnCls(editor.isActive('italic'))} title="Italic"><Italic size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnCls(editor.isActive('highlight'))} title="Highlight"><Highlighter size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnCls(editor.isActive('bulletList'))} title="Bullet List"><List size={15} /></button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnCls(editor.isActive({ textAlign: 'left' }))} title="Align Left"><AlignLeft size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnCls(editor.isActive({ textAlign: 'center' }))} title="Align Center"><AlignCenter size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnCls(editor.isActive({ textAlign: 'right' }))} title="Align Right"><AlignRight size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnCls(editor.isActive({ textAlign: 'justify' }))} title="Justify"><AlignJustify size={15} /></button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <select
          value={activeLineHeight}
          onChange={e => editor.chain().focus().setLineHeight(e.target.value).run()}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer"
          title="Line spacing"
        >
          {LINE_HEIGHTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      <div className="bg-white max-h-[360px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
