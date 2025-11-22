const rules = [
  { kw: ['netflix','spotify','apple','google india','play store','prime'], cat: 'Leisure' },
  { kw: ['railtel','electric','water','gas','utility','wifi','broadband'], cat: 'Utilities' },
  { kw: ['groww','zerodha','broker','mutual fund','sip','nifty','mf'], cat: 'Investment' },
  { kw: ['rent','lease','apartment','flat','society'], cat: 'Housing' },
  { kw: ['salary','payroll','wages'], cat: 'Salary' },
  { kw: ['uber','ola','taxi','metro','bus','rail'], cat: 'Transport' },
  { kw: ['grocery','supermarket','mart','food','restaurant','swiggy','zomato'], cat: 'Food' },
  { kw: ['medical','hospital','pharma','doctor'], cat: 'Healthcare' },
  { kw: ['edu','school','college','tuition','course'], cat: 'Education' }
]

export default function categorize(desc) {
  const t = String(desc || '').toLowerCase()
  for (const r of rules) {
    if (r.kw.some(k => t.includes(k))) return r.cat
  }
  return 'Misc'
}