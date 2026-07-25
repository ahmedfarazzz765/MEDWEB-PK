import { Facebook, Instagram, Linkedin, Youtube, Twitter, MessageCircle, Send, Music2, Globe, Users, Link2 } from 'lucide-react'

// Curated icon set for the Form Builder's "Success Screen Links" feature —
// admin picks one of these per link button (social profile, WhatsApp
// group/channel, generic link, etc). Stored as the `icon` key string on the
// form's successConfig.links[] so it's serializable in Firestore; resolved
// to the actual lucide component wherever the button is rendered.
export const LINK_ICON_OPTIONS = [
  { key: 'whatsapp',  label: 'WhatsApp',  Icon: MessageCircle, color: '#25D366' },
  { key: 'group',     label: 'Group / Community', Icon: Users, color: '#1655c3' },
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,  color: '#1877f2' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram, color: '#e1306c' },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin,  color: '#0a66c2' },
  { key: 'youtube',   label: 'YouTube',   Icon: Youtube,   color: '#ff0000' },
  { key: 'telegram',  label: 'Telegram',  Icon: Send,      color: '#26A5E4' },
  { key: 'twitter',   label: 'Twitter / X', Icon: Twitter, color: '#000000' },
  { key: 'tiktok',    label: 'TikTok',    Icon: Music2,    color: '#000000' },
  { key: 'website',   label: 'Website',   Icon: Globe,     color: '#1655c3' },
  { key: 'link',      label: 'Other Link', Icon: Link2,    color: '#64ac37' },
]

export const getLinkIcon = key => LINK_ICON_OPTIONS.find(o => o.key === key) || LINK_ICON_OPTIONS[LINK_ICON_OPTIONS.length - 1]
