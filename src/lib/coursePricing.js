// Early-bird pricing — shared by the public course page, the homepage
// popup, both enrollment form variants, and the admin Enrollments view,
// so "what's the real price right now" is computed exactly once.
//
// Prefers the `*Ms` epoch-millisecond fields (added so Firestore rules
// can compare a deadline against `request.time.toMillis()`, which can't
// parse an ISO string) and falls back to parsing the ISO string field
// for any course doc saved before those existed.
function deadlineMs(course, msField, isoField) {
  if (course[msField]) return course[msField]
  const t = course[isoField] ? new Date(course[isoField]).getTime() : NaN
  return isNaN(t) ? 0 : t
}

export function getCoursePricing(course) {
  const original = Number(course.originalPrice || course.fee || 0)
  const discount = course.discountPrice !== '' && course.discountPrice != null ? Number(course.discountPrice) : null
  const discountEndsAt = course.discountEndsAt || ''
  const discountEndsAtMs = deadlineMs(course, 'discountEndsAtMs', 'discountEndsAt')
  const discountActive = discount != null && discount > 0 && discountEndsAtMs > 0 && Date.now() < discountEndsAtMs
  return {
    original,
    discount,
    discountEndsAt,
    discountActive,
    // What a registrant actually owes right now.
    amountDue: discountActive ? discount : original,
  }
}

export function isRegistrationClosed(course) {
  const t = deadlineMs(course, 'registrationClosesAtMs', 'registrationClosesAt')
  return t > 0 && Date.now() > t
}
