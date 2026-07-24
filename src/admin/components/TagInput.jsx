import { useState } from 'react'
import { X } from 'lucide-react'

// Type a tag, press Enter or comma to add it as a chip; click a chip's X to remove it.
export default function TagInput({ value = [], onChange, label = 'Tags', placeholder = 'Type a tag and press Enter…' }) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const tag = draft.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  const removeAt = i => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex flex-wrap items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-[#1655c3]/30 focus-within:border-[#1655c3]">
        {value.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-[#1655c3]">
            {tag}
            <button type="button" onClick={() => removeAt(i)} className="hover:text-red-500"><X size={11} /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={value.length ? '' : placeholder}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>
    </div>
  )
}
