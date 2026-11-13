import { getCoursePricing } from '../lib/coursePricing'
import { formatKarachiDisplay } from '../lib/karachiTime'

// Early-bird-aware price display — shared by the course page, the
// registration form header, and the homepage popup, so the same rule
// ("before discountEndsAt show struck-through original + discount with
// an Early Bird note; after it, original only") renders identically
// everywhere instead of three separate copies of the same conditional.
export default function CoursePriceTag({ course, className = '' }) {
  if (course.type !== 'Paid') return null
  const { original, discountActive, discount, discountEndsAt } = getCoursePricing(course)
  if (!original && !discountActive) return null

  return (
    <div className={className}>
      {discountActive ? (
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-gray-400 line-through text-sm">PKR {original.toLocaleString()}</span>
          <span className="font-black text-[#1655c3] text-lg">PKR {discount.toLocaleString()}</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            Early Bird until {formatKarachiDisplay(discountEndsAt)}
          </span>
        </div>
      ) : (
        <span className="font-black text-[#1655c3] text-lg">PKR {original.toLocaleString()}</span>
      )}
    </div>
  )
}
