// LinkedIn's share-offsite URL only ever auto-populates the link preview
// (image/title/description) by reading THAT URL's Open Graph tags — it
// never accepts pre-filled post body text or a directly-passed image. So
// the actual post text has to be handed to the person another way: this
// builds a ready-made caption and copies it to their clipboard the moment
// they click Share, so they can just paste it into the LinkedIn composer
// that opens.
export function buildLinkedInShareUrl(certificateUrl) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateUrl)}`
}

export function buildCertificateCaption({ studentName, courseTitle }) {
  const who = studentName ? `I'm proud to share that ${studentName} has` : "I'm proud to share that I've"
  const course = courseTitle ? `"${courseTitle}"` : 'this program'
  return [
    `${who} completed ${course} through MEDWEB-PK — Pakistan's medical education platform, founded by Dr. Shahroz Abbas. 🎓`,
    '',
    'Grateful for the opportunity to keep growing in medical education, pharmacy, and healthcare training.',
    '',
    '#MEDWEBPK #MedicalEducationPakistan #Pharmacy #HealthcareTraining #ContinuingMedicalEducation #MedEd #ShahrozAbbas',
  ].join('\n')
}
