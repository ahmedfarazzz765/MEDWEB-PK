// The ONLY accounts with unconditional full access — everyone else needs
// a real `adminUsers/{email}` doc (Editor or Viewer) to get into /admin
// at all. Must be kept byte-for-byte in sync with the SUPER_ADMINS list
// in docs/firestore.rules.proposed — Firestore rules can't import this
// file, so the two are necessarily two separate hardcoded copies. If you
// add/remove a Super Admin, update both.
export const SUPER_ADMINS = ['medwebpk@gmail.com']
