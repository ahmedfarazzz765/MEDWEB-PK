// Computed referral rank for the Ambassador Login/Dashboard feature — kept
// entirely separate from AdminAmbassadors.jsx's existing manual `rank`
// dropdown (RANK_OPTIONS), which still drives every public-facing badge
// (AmbassadorCard, AmbassadorProfilePage, etc.) unchanged. This is a
// *different* value (`referralRank`), derived purely from `points` +
// `gender` vs admin-configured thresholds, shown only on the ambassador's
// own dashboard and the admin's referral-performance view — introducing it
// alongside the existing manual rank rather than replacing it, so nothing
// already live on the public site changes behavior.
export const DEFAULT_RANK_THRESHOLDS = {
  male:   { regional: 50, head: 150 },
  female: { regional: 50, head: 150 },
}

const TIERS = ['ambassador', 'regional', 'head']
const TIER_LABELS = {
  ambassador: 'Ambassador',
  regional: 'Regional Ambassador',
  head: 'Head Ambassador',
}

// `gender` is free-text on the ambassador doc; anything not recognized as
// 'female' falls back to the 'male' threshold set (also used when gender is
// unset) rather than throwing or silently using 0 thresholds.
function thresholdsFor(gender, thresholds) {
  const key = String(gender || '').toLowerCase() === 'female' ? 'female' : 'male'
  return thresholds?.[key] || DEFAULT_RANK_THRESHOLDS[key]
}

// Returns { rank, nextRank, pointsToNext } — nextRank/pointsToNext are null
// once the ambassador has hit the top tier (Head Ambassador).
export function computeAmbassadorRank(points, gender, thresholds = DEFAULT_RANK_THRESHOLDS) {
  const p = Number(points) || 0
  const t = thresholdsFor(gender, thresholds)
  const tier = p >= t.head ? 'head' : p >= t.regional ? 'regional' : 'ambassador'
  const tierIdx = TIERS.indexOf(tier)
  const nextTier = TIERS[tierIdx + 1]
  if (!nextTier) return { rank: TIER_LABELS[tier], nextRank: null, pointsToNext: null }
  const nextThreshold = nextTier === 'regional' ? t.regional : t.head
  return { rank: TIER_LABELS[tier], nextRank: TIER_LABELS[nextTier], pointsToNext: Math.max(0, nextThreshold - p) }
}
