import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { settingsService } from '../firebase/services'
import { STATS } from '../data/statsConfig'

export default function Stats() {
  const [vals, setVals] = useState({})

  useEffect(() => {
    const unsub = settingsService.listen(s => { if (s) setVals(s) })
    return () => unsub && unsub()
  }, [])

  return (
    <section className="py-8 sm:py-10 px-4 bg-[#f7f9fc]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {STATS.map(({ icon: Icon, label, fallback, color, bg, blob, key }, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ duration:0.4, delay:i*0.08 }}
              whileHover={{ y:-4, boxShadow:'0 14px 28px rgba(22,85,195,0.12)' }}
              className="relative bg-white rounded-2xl p-5 text-center shadow-sm transition-all duration-300 overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-25 pointer-events-none" style={{ background: blob }} />
              <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div className="relative text-xl sm:text-2xl font-black mb-0.5" style={{ color }}>
                {vals[key] || fallback}
              </div>
              <div className="relative text-xs text-gray-500 font-medium">{label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
