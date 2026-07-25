// Form-Builder field keys are random uids, not semantic names — this
// resolves a value out of a submission by field type/label/key heuristics,
// falling back to common flat key names. Same priority order already used
// ad-hoc in DynamicForm.jsx / WebinarRegisterModal.jsx for name/email, just
// generalized so it can also resolve phone/university/degree for ambassador
// application submissions.
export function resolveFormField(fields, clean, { type, labelRegex, keyRegex, flatKeys = [] }) {
  const list = fields || []
  const field =
    (type && list.find(f => f.type === type)) ||
    (labelRegex && list.find(f => labelRegex.test(f.label || ''))) ||
    (keyRegex && list.find(f => keyRegex.test(f.key || '')))

  if (field && clean[field.key]) return String(clean[field.key])
  for (const k of flatKeys) if (clean[k]) return String(clean[k])
  return ''
}

export function toTitleCase(str) {
  return String(str || '').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// Finds whichever field represents "name" in a form submission (same
// heuristic used throughout this app to resolve name/email) and returns a
// new values object with that field's value Title-Cased — so a name typed
// in ALL CAPS or all lowercase is never the value actually stored in
// Firestore, regardless of which form/page collected it.
export function applyNameTitleCase(fields, clean) {
  const list = fields || []
  const nameField =
    list.find(f => f.type !== 'email' && /name/i.test(f.label || '')) ||
    list.find(f => f.type !== 'email' && /name/i.test(f.key || '')) ||
    list.find(f => f.type === 'text' && /full|student|participant/i.test(f.label || ''))
  const key = nameField?.key || (clean.name !== undefined ? 'name' : clean.fullName !== undefined ? 'fullName' : null)
  if (!key || !clean[key]) return clean
  return { ...clean, [key]: toTitleCase(clean[key]) }
}
