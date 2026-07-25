// Single source of truth for the "Why MEDWEB style" team category cards.
// Used both as the initial seed (admin-side, teamCategoriesService.ensureDefaults)
// so every card becomes a real editable/deletable Firestore doc, and as a
// last-resort display fallback anywhere categories are read before that
// seed has landed (About.jsx homepage marquee, TeamListPage.jsx).
export const DEFAULT_TEAM_CATEGORIES = [
  {
    name: 'Chief Executive',
    label1: 'Chief',
    label2: 'Executive',
    desc: 'Founders, CEOs, and executive leaders driving MEDWEB strategy and growth.',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80',
    accent: 'green',
    icon: 'Award',
  },
  {
    name: 'Graphic Designer',
    label1: 'Graphic',
    label2: 'Designers',
    desc: 'Creative visual designers crafting UI/UX, branding, and educational media.',
    imageUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&q=80',
    accent: 'blue',
    icon: 'Star',
  },
  {
    name: 'Development Team',
    label1: 'Development',
    label2: 'Team',
    desc: 'Software engineers and platform developers building state-of-the-art tech.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80',
    accent: 'green',
    icon: 'ShieldCheck',
  },
  {
    name: 'Medical Advisory',
    label1: 'Medical',
    label2: 'Advisory',
    desc: 'Licensed physicians, pharmacists, and medical educators overseeing curriculum.',
    imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&q=80',
    accent: 'blue',
    icon: 'UserCheck',
  },
]
