// Early-bird pricing — shared by the public course page, the homepage
// popup, both enrollment form variants, and the admin Enrollments view,
// so "what's the real price right now" is computed exactly once.
export function getCoursePricing(course) {
  const original = Number(course.originalPrice || course.fee || 0)
  const discount = course.discountPrice !== '' && course.discountPrice != null ? Number(course.discountPrice) : null
  const discountEndsAt = course.discountEndsAt || ''
  const discountActive = discount != null && discount > 0 && discountEndsAt && Date.now() < new Date(discountEndsAt).getTime()
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
  if (!course.registrationClosesAt) return false
  const t = new Date(course.registrationClosesAt).getTime()
  return !isNaN(t) && Date.now() > t
}
