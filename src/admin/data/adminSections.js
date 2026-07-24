// Canonical list of every grantable admin section — must mirror
// AdminSidebar.jsx's GROUPS exactly (labels + keys), since this is the
// single source of truth both for the "Add Admin" permission checklist
// and for sidebar/page access enforcement in AdminPanel.jsx.
//
// `key` matches the `id` (or `id:tab` for AdminContent's internal tabs)
// used to gate rendering. Dashboard is deliberately excluded — every
// signed-in admin can always see it, it's not a grantable section.
export const ADMIN_SECTIONS = [
  { key: 'sections',            label: 'Homepage Sections',       group: 'Content' },
  { key: 'content:hero',        label: 'Hero',                     group: 'Content' },
  { key: 'content:founder',     label: 'Founder Message',          group: 'Content' },
  { key: 'content:why',         label: 'Why MEDWEB',               group: 'Content' },
  { key: 'content:partners',    label: 'Trusted Partners',         group: 'Content' },
  { key: 'content:certificate', label: 'Certificate Verification', group: 'Content' },
  { key: 'content:navbar',      label: 'Navbar & WelcomeBar',       group: 'Content' },
  { key: 'content:legal',       label: 'Legal Pages',               group: 'Content' },
  { key: 'footer',              label: 'Footer',                    group: 'Content' },

  { key: 'students',    label: 'Students',       group: 'People' },
  { key: 'team',         label: 'Team',           group: 'People' },
  { key: 'advisory',     label: 'Advisory Board', group: 'People' },
  { key: 'ambassadors',  label: 'Ambassadors',    group: 'People' },

  { key: 'webinars',     label: 'Webinars',     group: 'Programs' },
  { key: 'courses',      label: 'Courses',      group: 'Programs' },
  { key: 'certificates', label: 'Certificates', group: 'Programs' },

  { key: 'testimonials',        label: 'Testimonials',    group: 'Engagement' },
  { key: 'pendingTestimonials', label: 'Pending Reviews', group: 'Engagement' },
  { key: 'blog',                label: 'Blog Posts',      group: 'Engagement' },
  { key: 'forms',                label: 'Form Builder',   group: 'Engagement' },
  { key: 'submissions',          label: 'Submissions',    group: 'Engagement' },

  { key: 'email', label: 'Email Settings', group: 'Settings' },
]

export const ADMIN_SECTION_GROUPS = [...new Set(ADMIN_SECTIONS.map(s => s.group))]
