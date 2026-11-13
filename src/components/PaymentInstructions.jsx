import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { getCoursePricing } from '../lib/coursePricing'

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  const copy = () => {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100">
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-[#1a1a1a] truncate">{value}</div>
      </div>
      <button type="button" onClick={copy} className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#1655c3] hover:underline">
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  )
}

// Shown above BOTH registration form variants (built-in and Form-
// Builder-linked) for a Paid course — extracted out of the built-in
// form so it isn't duplicated a second time for the linked-form path.
export default function PaymentInstructions({ course }) {
  const payment = {
    bankName: course.paymentBankName, accountTitle: course.paymentAccountTitle,
    accountNumber: course.paymentAccountNumber, iban: course.paymentIban,
    jazzcashEasypaisa: course.paymentJazzcashEasypaisa,
  }
  const hasPaymentInfo = Object.values(payment).some(Boolean)
  if (!hasPaymentInfo) return null
  const { amountDue } = getCoursePricing(course)

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
      <h4 className="font-black text-[#1a1a1a] text-sm mb-3">Payment Instructions</h4>
      <div className="space-y-2">
        <CopyField label="Bank" value={payment.bankName} />
        <CopyField label="Account Title" value={payment.accountTitle} />
        <CopyField label="Account Number" value={payment.accountNumber} />
        <CopyField label="IBAN" value={payment.iban} />
        <CopyField label="JazzCash / Easypaisa" value={payment.jazzcashEasypaisa} />
      </div>
      {amountDue > 0 && (
        <p className="text-sm text-[#1655c3] font-bold mt-3">Amount to pay: PKR {amountDue.toLocaleString()}</p>
      )}
    </div>
  )
}
