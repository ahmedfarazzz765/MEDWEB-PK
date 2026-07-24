// Shared stat definitions — sourced from the single `settings/site` Firestore doc
// (via settingsService). Both Stats.jsx and WhyMedweb.jsx import this so the
// numbers can never drift out of sync between sections.
import { GraduationCap, Monitor, UserCheck, MapPin, Award, BookOpen } from 'lucide-react'

export const STATS = [
  { icon: GraduationCap, label: 'Students Trained',    fallback: '15,000+', color: '#1655c3', bg: '#eff6ff', blob: '#93c5fd', key: 'studentsCount' },
  { icon: Monitor,       label: 'Webinars Hosted',     fallback: '100+',    color: '#1655c3', bg: '#eff6ff', blob: '#93c5fd', key: 'webinarsCount' },
  { icon: UserCheck,     label: 'Expert Instructors',  fallback: '20+',     color: '#64ac37', bg: '#f0fdf4', blob: '#86efac', key: 'instructorsCount' },
  { icon: MapPin,        label: 'Cities Reached',      fallback: '50+',     color: '#1655c3', bg: '#eff6ff', blob: '#93c5fd', key: 'citiesCount' },
  { icon: Award,         label: 'Certificates Issued', fallback: '25,000+', color: '#64ac37', bg: '#f0fdf4', blob: '#86efac', key: 'certificatesCount' },
  { icon: BookOpen,      label: 'Courses Available',   fallback: '15+',     color: '#1655c3', bg: '#eff6ff', blob: '#93c5fd', key: 'coursesCount' },
]
