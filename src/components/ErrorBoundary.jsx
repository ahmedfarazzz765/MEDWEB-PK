import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

// Wraps <Routes> in App.jsx so a render crash on any one page shows a real
// "something went wrong" screen instead of a blank white page — the exact
// symptom reported for /contact (a missing route, not a thrown error, but
// the same blank-screen failure mode a genuine component crash elsewhere
// would also produce with nothing catching it).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('MEDWEB ErrorBoundary caught a render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="font-poppins min-h-screen flex items-center justify-center bg-[#f7f9fc] px-4 text-center">
          <div>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={30} className="text-red-500" />
            </div>
            <h1 className="text-xl font-black text-[#1a1a1a] mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-6">This page hit an unexpected error. Try going back to the homepage.</p>
            <a href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
              Back to Home
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
