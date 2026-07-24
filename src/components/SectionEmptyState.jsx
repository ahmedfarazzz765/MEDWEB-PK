// Shown once a Firestore listener has confirmed there is no real
// admin-entered data for a section — never a stand-in for missing content.
export default function SectionEmptyState({ message = 'Nothing here yet — check back soon.' }) {
  return (
    <div className="text-center py-10 text-gray-400 text-sm">
      {message}
    </div>
  )
}
