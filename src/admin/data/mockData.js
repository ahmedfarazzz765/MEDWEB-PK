// ── MEDWEB ADMIN — Mock Data ──────────────────────────────────────────────

export const students = [
  { id: 'STU-001', name: 'Fatima Zahra',    email: 'fatima@uhs.edu.pk',    city: 'Lahore',     course: 'Clinical Pharmacy Masterclass', enrolled: '2025-01-10', status: 'Active',   certified: true  },
  { id: 'STU-002', name: 'Ali Hassan',       email: 'ali@dow.edu.pk',       city: 'Karachi',    course: 'Drug Therapy Series',           enrolled: '2025-01-18', status: 'Active',   certified: false },
  { id: 'STU-003', name: 'Mahnoor Tariq',    email: 'mahnoor@qau.edu.pk',   city: 'Islamabad',  course: '100 Vital Drugs',               enrolled: '2025-02-03', status: 'Active',   certified: true  },
  { id: 'STU-004', name: 'Usman Siddiqui',   email: 'usman@comsats.edu.pk', city: 'Islamabad',  course: 'How to Treat Series',           enrolled: '2025-02-14', status: 'Inactive', certified: false },
  { id: 'STU-005', name: 'Sana Khalid',      email: 'sana@kemu.edu.pk',     city: 'Lahore',     course: 'Clinical Pharmacy Masterclass', enrolled: '2025-03-01', status: 'Active',   certified: true  },
  { id: 'STU-006', name: 'Hamza Iftikhar',   email: 'hamza@pu.edu.pk',      city: 'Lahore',     course: 'Drug Therapy Series',           enrolled: '2025-03-10', status: 'Active',   certified: false },
  { id: 'STU-007', name: 'Zainab Raza',      email: 'zainab@aku.edu.pk',    city: 'Karachi',    course: '100 Vital Drugs',               enrolled: '2025-03-22', status: 'Active',   certified: true  },
  { id: 'STU-008', name: 'Bilal Qureshi',    email: 'bilal@nust.edu.pk',    city: 'Islamabad',  course: 'How to Treat Series',           enrolled: '2025-04-05', status: 'Inactive', certified: false },
  { id: 'STU-009', name: 'Ayesha Malik',     email: 'ayesha@uhs.edu.pk',    city: 'Lahore',     course: 'Clinical Pharmacy Masterclass', enrolled: '2025-04-12', status: 'Active',   certified: false },
  { id: 'STU-010', name: 'Omar Farooq',      email: 'omar@kmu.edu.pk',      city: 'Peshawar',   course: 'Drug Therapy Series',           enrolled: '2025-04-20', status: 'Active',   certified: true  },
  { id: 'STU-011', name: 'Nadia Rehman',     email: 'nadia@fumc.edu.pk',    city: 'Faisalabad', course: '100 Vital Drugs',               enrolled: '2025-05-01', status: 'Active',   certified: false },
  { id: 'STU-012', name: 'Tariq Mehmood',    email: 'tariq@rmc.edu.pk',     city: 'Rawalpindi', course: 'How to Treat Series',           enrolled: '2025-05-08', status: 'Active',   certified: true  },
]

export const webinars = [
  { id: 'WEB-001', topic: 'Rational Drug Use in Clinical Practice',           speaker: 'Dr. Amina Khan',    date: '2025-04-15', time: '7:00 PM', type: 'Free', registered: 245, attended: 198, status: 'Completed' },
  { id: 'WEB-002', topic: 'Antibiotic Stewardship in Pakistan',               speaker: 'Dr. Bilal Akhtar',  date: '2025-04-22', time: '6:30 PM', type: 'Free', registered: 312, attended: 270, status: 'Completed' },
  { id: 'WEB-003', topic: 'Drug Interactions: What Every Pharmacist Must Know', speaker: 'Dr. Sara Malik',  date: '2025-05-01', time: '7:30 PM', type: 'Paid', registered: 189, attended: 175, status: 'Completed' },
  { id: 'WEB-004', topic: 'Clinical Assessment for Allied Health',             speaker: 'Dr. Usman Farooq', date: '2025-05-10', time: '6:00 PM', type: 'Free', registered: 150, attended: 0,   status: 'Upcoming'  },
  { id: 'WEB-005', topic: 'Pediatric Drug Dosing & Safety',                   speaker: 'Dr. Nadia Rehman', date: '2025-05-18', time: '7:30 PM', type: 'Free', registered: 98,  attended: 0,   status: 'Upcoming'  },
  { id: 'WEB-006', topic: 'Oncology Pharmacy: Chemo Protocols',               speaker: 'Dr. Bilal Qureshi',date: '2025-06-01', time: '6:00 PM', type: 'Paid', registered: 64,  attended: 0,   status: 'Upcoming'  },
]

export const courses = [
  { id: 'CRS-001', title: 'Clinical Pharmacy Masterclass', instructor: 'Dr. Sara Malik',    students: 4200, revenue: 'PKR 2,100,000', status: 'Active',   type: 'Paid', rating: 4.9 },
  { id: 'CRS-002', title: 'Drug Therapy Series',           instructor: 'Dr. Amina Khan',    students: 3800, revenue: 'PKR 0',          status: 'Active',   type: 'Free', rating: 4.8 },
  { id: 'CRS-003', title: '100 Vital Drugs',               instructor: 'Dr. Omar Farooq',   students: 5100, revenue: 'PKR 1,530,000', status: 'Active',   type: 'Paid', rating: 4.7 },
  { id: 'CRS-004', title: 'How to Treat Series',           instructor: 'Dr. Usman Farooq',  students: 2900, revenue: 'PKR 0',          status: 'Active',   type: 'Free', rating: 4.6 },
  { id: 'CRS-005', title: 'Pharmacovigilance Basics',      instructor: 'Dr. Nadia Rehman',  students: 1200, revenue: 'PKR 360,000',   status: 'Draft',    type: 'Paid', rating: 0   },
]

export const ambassadors = [
  { id: 'AMB-001', name: 'Ali Khan',        university: 'NUST Islamabad',   city: 'Islamabad',  role: 'Campus Ambassador',  rank: 'Gold',     students: 45, status: 'Active'   },
  { id: 'AMB-002', name: 'Sara Ahmed',      university: 'UHS Lahore',       city: 'Lahore',     role: 'Regional Lead',      rank: 'Platinum', students: 89, status: 'Active'   },
  { id: 'AMB-003', name: 'Usman Tariq',     university: 'Dow University',   city: 'Karachi',    role: 'Content Ambassador', rank: 'Silver',   students: 23, status: 'Active'   },
  { id: 'AMB-004', name: 'Ayesha Malik',    university: 'KEMU Lahore',      city: 'Lahore',     role: 'Social Media Rep',   rank: 'Bronze',   students: 12, status: 'Inactive' },
  { id: 'AMB-005', name: 'Hamza Iftikhar',  university: 'COMSATS',          city: 'Islamabad',  role: 'Webinar Moderator',  rank: 'Gold',     students: 38, status: 'Active'   },
  { id: 'AMB-006', name: 'Zain Ali',        university: 'Agha Khan Karachi',city: 'Karachi',    role: 'Community Mentor',   rank: 'Platinum', students: 102,status: 'Active'   },
  { id: 'AMB-007', name: 'Fatima Noor',     university: 'QAU Islamabad',    city: 'Islamabad',  role: 'Campus Ambassador',  rank: 'Silver',   students: 19, status: 'Active'   },
  { id: 'AMB-008', name: 'Bilal Chaudhry',  university: 'PU Lahore',        city: 'Lahore',     role: 'Regional Lead',      rank: 'Gold',     students: 56, status: 'Active'   },
]

export const certificates = [
  { id: 'CERT-MW-2025-0001', student: 'Fatima Zahra',  course: 'Clinical Pharmacy Masterclass', issued: '2025-02-15', status: 'Valid',   verifications: 3 },
  { id: 'CERT-MW-2025-0002', student: 'Mahnoor Tariq', course: '100 Vital Drugs',               issued: '2025-03-10', status: 'Valid',   verifications: 1 },
  { id: 'CERT-MW-2025-0003', student: 'Sana Khalid',   course: 'Clinical Pharmacy Masterclass', issued: '2025-04-05', status: 'Valid',   verifications: 5 },
  { id: 'CERT-MW-2025-0004', student: 'Zainab Raza',   course: '100 Vital Drugs',               issued: '2025-04-20', status: 'Valid',   verifications: 2 },
  { id: 'CERT-MW-2025-0005', student: 'Omar Farooq',   course: 'Drug Therapy Series',           issued: '2025-05-01', status: 'Valid',   verifications: 0 },
  { id: 'CERT-MW-2025-0006', student: 'Tariq Mehmood', course: 'How to Treat Series',           issued: '2025-05-08', status: 'Revoked', verifications: 1 },
]

export const blogPosts = [
  { id: 'BLG-001', title: 'Understanding Beta-Blockers',          author: 'Dr. Ayesha Malik', category: 'Pharmacology',       published: '2025-03-28', views: 4200, status: 'Published' },
  { id: 'BLG-002', title: 'Top 10 Drug Interactions to Know',     author: 'Dr. Omar Farooq',  category: 'Clinical Practice',  published: '2025-03-21', views: 3800, status: 'Published' },
  { id: 'BLG-003', title: 'Getting Your First Hospital Job',       author: 'MEDWEB Team',      category: 'Career Guide',       published: '2025-03-14', views: 6100, status: 'Published' },
  { id: 'BLG-004', title: 'Antibiotic Resistance in Pakistan',     author: 'Dr. Bilal Akhtar', category: 'Pharmacology',       published: '2025-04-02', views: 2900, status: 'Published' },
  { id: 'BLG-005', title: 'Pharmacokinetics Made Simple',          author: 'Dr. Sara Malik',   category: 'Education',          published: '',           views: 0,    status: 'Draft'     },
]

export const teamMembers = [
  { id: 'TEAM-001', name: 'Dr. Shahroz Abbas',     role: 'Founder & CEO',                        email: 'ceo@medweb.pk',       status: 'Active' },
  { id: 'TEAM-002', name: 'Shujaat Ali Khan',       role: 'Director',                             email: 'director@medweb.pk',  status: 'Active' },
  { id: 'TEAM-003', name: 'Dr. Sana',               role: 'PhD Scholar — Chief Advisory Member',  email: 'sana@medweb.pk',      status: 'Active' },
  { id: 'TEAM-004', name: 'Dr. Muhammad Ali Qazi',  role: 'Associate Professor — Senior Advisor', email: 'mqazi@medweb.pk',     status: 'Active' },
  { id: 'TEAM-005', name: 'Dr. Saad',               role: 'Clinical Pharmacist — Advisor',        email: 'saad@medweb.pk',      status: 'Active' },
  { id: 'TEAM-006', name: 'Dr. Maria',              role: 'Neuropharmacologist — Senior Writer',  email: 'maria@medweb.pk',     status: 'Active' },
]

export const revenueData = [
  { month: 'Jan', revenue: 180000, students: 820  },
  { month: 'Feb', revenue: 240000, students: 1100 },
  { month: 'Mar', revenue: 310000, students: 1450 },
  { month: 'Apr', revenue: 280000, students: 1320 },
  { month: 'May', revenue: 420000, students: 1890 },
  { month: 'Jun', revenue: 390000, students: 1750 },
]
