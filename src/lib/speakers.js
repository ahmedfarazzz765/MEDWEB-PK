// Derives a de-duplicated speaker roster from existing webinar records
// (webinarsService already collects speaker name/qualification/photo per
// webinar — see AdminWebinars.jsx's "Speaker Name"/"Speaker Qualification"/
// "Speaker Image" fields) instead of a separate admin-maintained Speakers
// collection. Reusing this avoids the admin re-entering the same person
// twice, and there's already exactly one speaker per webinar today.
//
// Trade-off worth knowing: a speaker only shows up here once they've been
// attached to at least one webinar — there's no way to list an upcoming
// speaker who hasn't been scheduled into a webinar yet. If that becomes a
// real need, a small standalone "Speakers" admin section would be the fix.
export function deriveSpeakersFromWebinars(webinars) {
  const seen = new Map() // normalized name -> speaker record

  // webinars are already ordered newest-first (createdAt desc) by
  // webinarsService.listen(), so the first entry seen per name is that
  // speaker's most recent webinar appearance.
  for (const w of webinars || []) {
    const name = (w.speaker || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.set(key, {
      name,
      role: w.role || '',
      imageUrl: w.speakerImage || '',
    })
  }

  return Array.from(seen.values())
}
