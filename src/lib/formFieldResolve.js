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
