import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import Ingest from './pages/Ingest.jsx'
import MLPipeline from './pages/MLPipeline.jsx'
import AgentDecisions from './pages/AgentDecisions.jsx'
import Forecast from './pages/Forecast.jsx'
import Feedback from './pages/Feedback.jsx'
import { api } from './api/client.js'

export default function App() {
  const [apiOk, setApiOk] = useState(false)

  useEffect(() => {
    api.health()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [])

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar apiOk={apiOk} />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)' }}>
          {!apiOk && (
            <div style={{
              background: 'var(--red-dim)', borderBottom: '1px solid var(--red)',
              padding: '8px 28px',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
              API OFFLINE — set VITE_API_URL or ensure backend is running at localhost:8000
            </div>
          )}
          <Routes>
            <Route path="/"         element={<Overview />} />
            <Route path="/ingest"   element={<Ingest />} />
            <Route path="/ml"       element={<MLPipeline />} />
            <Route path="/agent"    element={<AgentDecisions />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
