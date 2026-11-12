// Suspense fallback for a lazy-loaded route/section — deliberately minimal
// (no layout, no brand chrome) since it's only ever visible for the brief
// moment a code-split chunk is downloading, not a real loading state.
export default function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#1655c3] rounded-full animate-spin" />
    </div>
  )
}
