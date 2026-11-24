// Shared "what happened on this attempt, question by question" builder.
// Mirrors build_review() in public/api/mocktest/_lib/attempt.php exactly —
// that PHP version is what the student's own browser gets (mockTests is
// admin-only in Firestore rules, so it can never read question/answer-key
// data directly). The admin panel already has the full mockTest doc and
// attempt doc via the client SDK (admin role), so it computes the same
// shape locally instead of adding a redundant PHP endpoint for itself.
export function buildMockTestReview(mockTest, attempt) {
  const order = attempt?.questionOrder || []
  const answers = attempt?.answers || {}
  const questions = mockTest?.questions || []
  return order.map((qIndex, pos) => {
    const q = questions[qIndex] || {}
    const a = answers[pos] ?? answers[String(pos)] ?? null
    const selectedIndex = a && typeof a === 'object' ? (a.selected ?? null) : null
    const correctIndex = q.correctIndex
    return {
      position: pos,
      questionText: q.questionText || '',
      options: q.options || [],
      selectedIndex,
      correctIndex,
      correct: selectedIndex !== null && selectedIndex === correctIndex,
      unanswered: selectedIndex === null,
      explanation: q.explanation || '',
    }
  })
}
