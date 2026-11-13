import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import { courseEnrollmentsService } from '../firebase/services'
import { isRegistrationClosed } from '../lib/coursePricing'

// Shared "is registration actually open right now" check — used by both
// the built-in enrollment form and the Form-Builder-linked one, so the
// three closed-reasons (admin toggle, seat limit, registrationClosesAt
// deadline) are only ever evaluated once.
export default function CourseRegistrationGate({ course, children }) {
  const [seatCount, setSeatCount] = useState(null)

  useEffect(() => {
    if (!course.seatLimit) { setSeatCount(0); return }
    courseEnrollmentsService.getByCourse(course.id)
      .then(rows => setSeatCount(rows.filter(r => r.status !== 'Rejected').length))
      .catch(() => setSeatCount(0))
  }, [course.id, course.seatLimit])

  const registrationClosed = isRegistrationClosed(course)
  const enrollmentClosed = course.enrollmentOpen === false
  const seatsFull = course.seatLimit > 0 && seatCount !== null && seatCount >= course.seatLimit

  if (registrationClosed || enrollmentClosed || seatsFull) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
        <Lock size={22} className="text-amber-500 mx-auto mb-2" />
        <p className="text-amber-700 font-semibold text-sm">
          {registrationClosed ? 'Registration closed.'
            : enrollmentClosed ? 'Enrollment for this workshop is currently closed.'
            : 'This workshop is fully booked — all seats have been taken.'}
        </p>
        <p className="text-amber-600/80 text-xs mt-1">Contact us on WhatsApp at +92 329 1692899 if you have questions.</p>
      </div>
    )
  }

  return children
}
