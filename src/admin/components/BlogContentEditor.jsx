import { useState } from 'react'
import { ArrowLeft, Eye, Pencil, Settings2 } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import AdminButton from './AdminButton'
import PostArticleView from '../../components/PostArticleView'

// Full-page (not modal) writing surface for a blog post's content —
// step 2 of the New/Edit Post flow, reached after basic details are saved
// in the small AdminBlog.jsx popup. Rendered as a fixed full-viewport
// overlay so the writing area gets the whole screen, Medium/WordPress-style,
// rather than being squeezed into the admin's sidebar+table layout.
export default function BlogContentEditor({ post, content, onChangeContent, onEditDetails, onBack, onSaveDraft, onPublish, saving }) {
  const [view, setView] = useState('write') // 'write' | 'preview'

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-100 shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#1655c3] transition-colors shrink-0">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          <span className="text-sm font-bold text-[#1a1a1a] truncate">{post.title || 'Untitled Post'}</span>
          <button onClick={onEditDetails} title="Edit basic details" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1655c3] shrink-0">
            <Settings2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setView('write')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'write' ? 'bg-white text-[#1655c3] shadow-sm' : 'text-gray-500'}`}
            >
              <Pencil size={13} /> Write
            </button>
            <button
              onClick={() => setView('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'preview' ? 'bg-white text-[#1655c3] shadow-sm' : 'text-gray-500'}`}
            >
              <Eye size={13} /> Preview
            </button>
          </div>
          <AdminButton variant="ghost" size="sm" onClick={onSaveDraft} disabled={saving}>
            {saving ? 'Saving…' : 'Save Draft'}
          </AdminButton>
          <AdminButton variant="primary" size="sm" onClick={onPublish} disabled={saving}>
            {post.status === 'Published' ? 'Update' : 'Publish'}
          </AdminButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {view === 'write' ? (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <RichTextEditor
              value={content}
              onChange={onChangeContent}
              contentHeightClass="min-h-[60vh]"
            />
          </div>
        ) : (
          <PostArticleView post={{ ...post, content }} />
        )}
      </div>
    </div>
  )
}
