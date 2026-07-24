# MEDWEB — Changes (Round 8): Full Certificate System

A complete, backend-managed certificate system with selectable designs, customizable
content (linked to webinars/courses), a public shareable certificate page, and PDF download.

## 4 Certificate Designs
`src/components/CertificateTemplate.jsx` — one reusable renderer with 4 templates:
- **Classic Blue** — bordered, formal, blue+green
- **Modern Gradient** — full blue→teal→green gradient, white text
- **Elegant Gold** — double-border gold, serif, premium look
- **Minimal Clean** — white, top gradient bar, modern

All render at a fixed 1000×707 (A4 landscape) and scale responsively.

## Admin → Certificates (rebuilt)  `src/admin/pages/AdminCertificates.jsx`
Issue a certificate with:
- **Design picker** (the 4 templates)
- **Customizable content**: recipient name + email, certificate title, body/description,
  signatory name + title, issue date, status
- **Link to a Webinar or Course** — selecting one auto-fills the title (or type a custom title)
- **Live preview** that updates as you type
- Per-row actions: **Preview**, **Copy public link**, **Download/Print**, **Edit**, **Revoke**
- Auto-generated unique certificate code (CERT-MW-YYYY-XXXXX)

## Public Certificate Page  `/certificate/:code`  `src/pages/CertificatePage.jsx`
- Anyone with the link sees the actual rendered certificate (the recipient's "copy").
- **Verified** banner if valid; clear **Not Found / Revoked** states otherwise.
- **Download / Print PDF** (uses the browser print dialog → "Save as PDF", A4 landscape,
  certificate only — nav/buttons hidden in print).
- **Share Link** button.
- Opening with `?print=1` auto-triggers the print dialog (used by the admin Download button).

## Homepage verification
The Certificate Verification box now shows a **"View Certificate →"** button on a valid
result, linking to `/certificate/<code>`.

## Data model (Firestore `certificates`)
New fields: `template, recipient, recipientEmail, sourceType, sourceId, title, body,
signatoryName, signatoryTitle`. Old `student`/`course` still read as fallbacks, so existing
certificates keep working.

## ⚠️ Firestore rule note
The public certificate page increments a "verifications" counter via an update to
`certificates`, which your rules restrict to admins. That increment is best-effort
(wrapped in catch) so **verification/viewing still works for the public** even if the
count doesn't go up. If you WANT public views to increment the counter, change the
certificates rule to allow a narrow update, e.g.:

```
match /certificates/{docId} {
  allow read:   if true;
  allow create, delete: if request.auth != null;
  // allow admins full update, or anyone to bump only the verifications field:
  allow update: if request.auth != null
    || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['verifications']);
}
```
(Optional — only if you care about the public view count.)

Build verified: `npm run build` succeeds.
