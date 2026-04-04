import { useState, useEffect } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader, Btn, Spinner, RiskBadge, ActionBadge, MonoVal, EmptyState } from '../components/ui.jsx'
import { ShieldAlert, Search, Play, Zap } from 'lucide-react'

function DecisionDetail({ decision, onFeedback }) {
  const [fbOpen, setFbOpen] = useState(false)
  const [verdict, setVerdict] = useState('correct')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fbResult, setFbResult] = useState(null)

  const submitFb = async () => {
    setSubmitting(true)
    try {
      await api.submitFeedback(decision.transaction_id, verdict, notes)
      setFbResult('Feedback recorded')
      setFbOpen(false)
      onFeedback?.()
    } catch(e) { setFbResult(e.message) }
    finally { setSubmitting(false) }
  }

  const shap = decision.signals?.shap || []
  const llm  = decision.signals?.llm  || []

  return (
    <div className="animate-in" style={{
      background: 'var(--bg-base)', border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius)', padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8,
    }}>
      {/* Summary */}
      {decision.summary && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            LLM Summary
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{decision.summary}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* SHAP signals */}
        {shap.length > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              SHAP signals
            </div>
            {shap.sort((a,b) => Math.abs(b.impact) - Math.abs(a.impact)).map(s => (
              <div key={s.feature} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <MonoVal>{s.feature}</MonoVal>
                <MonoVal>{s.impact > 0 ? '+' : ''}{s.impact?.toFixed(4)}</MonoVal>
              </div>
            ))}
          </div>
        )}

        {/* LLM signals */}
        {llm.length > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              LLM signals
            </div>
            {(Array.isArray(llm) ? llm : []).map((sig, i) => (
              <div key={i} style={{
                fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0',
                borderBottom: '1px solid var(--border)', lineHeight: 1.4,
              }}>
                · {typeof sig === 'string' ? sig : sig.signal || JSON.stringify(sig)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          Recommended: <span style={{ color: 'var(--amber)' }}>{decision.recommended_action}</span>
          {decision.feedback && <span style={{ marginLeft: 16, color: 'var(--green)' }}>Feedback: {decision.feedback}</span>}
          {fbResult && <span style={{ marginLeft: 12, color: 'var(--green)' }}>{fbResult}</span>}
        </div>
        <Btn small ghost onClick={() => setFbOpen(o => !o)}>
          {fbOpen ? 'Cancel' : 'Submit feedback'}
        </Btn>
      </div>

      {fbOpen && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>VERDICT</label>
            <select value={verdict} onChange={e => setVerdict(e.target.value)} style={{ width: 160 }}>
              <option value="correct">correct</option>
              <option value="false_positive">false_positive</option>
              <option value="missed">missed</option>
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>NOTES</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
          <Btn variant="accent" onClick={submitFb} disabled={submitting} small>
            {submitting ? <Spinner size={12} /> : 'Submit'}
          </Btn>
        </div>
      )}
    </div>
  )
}

export default function AgentDecisions() {
  const [actions, setActions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [monitorLoading, setMonitorLoading] = useState(false)
  const [monitorResult, setMonitorResult] = useState(null)
  const [investigateId, setInvestigateId] = useState('')
  const [investigateLoading, setInvestigateLoading] = useState(false)
  const [investigateResult, setInvestigateResult] = useState(null)
  const [investigateError, setInvestigateError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    api.getActions()
      .then(setActions)
      .catch(() => setActions([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const runMonitor = async () => {
    setMonitorLoading(true); setMonitorResult(null)
    try {
      const r = await api.autoMonitor()
      setMonitorResult(r)
      load()
    } catch(e) { setMonitorResult({ error: e.message }) }
    finally { setMonitorLoading(false) }
  }

  const runInvestigate = async () => {
    if (!investigateId.trim()) return
    setInvestigateLoading(true); setInvestigateError(null); setInvestigateResult(null)
    try {
      const r = await api.investigate(investigateId.trim())
      setInvestigateResult(r)
      load()
    } catch(e) { setInvestigateError(e.message) }
    finally { setInvestigateLoading(false) }
  }

  const filtered = (actions || []).filter(a => {
    if (filter === 'all') return true
    if (filter === 'high') return a.risk_level === 'High'
    if (filter === 'blocked') return a.action_taken === 'BLOCK_AND_ALERT'
    if (filter === 'no-feedback') return !a.feedback
    return true
  })

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Agent Decisions</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Investigate transactions and review LLM-powered risk decisions
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Card style={{ flex: 1, minWidth: 280, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Investigate single transaction
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={investigateId} onChange={e => setInvestigateId(e.target.value)} placeholder="Transaction ID..." />
            <Btn variant="accent" onClick={runInvestigate} disabled={investigateLoading || !investigateId.trim()}>
              {investigateLoading ? <Spinner size={13} /> : <Search size={13} />}
            </Btn>
          </div>
          {investigateError && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' }}>{investigateError}</div>}
          {investigateResult && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)' }}>
              Done · Risk: {investigateResult.risk_level} · Action: {investigateResult.action_taken}
            </div>
          )}
        </Card>

        <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Auto-monitor all anomalies
          </div>
          <Btn onClick={runMonitor} disabled={monitorLoading}>
            {monitorLoading ? <><Spinner size={13} /> Running...</> : <><Zap size={13} /> Run Auto-Monitor</>}
          </Btn>
          {monitorResult && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: monitorResult.error ? 'var(--red)' : 'var(--green)' }}>
              {monitorResult.error || `Processed: ${monitorResult.processed?.length ?? 0} transactions`}
            </div>
          )}
        </Card>
      </div>

      {/* Decision table */}
      <Card>
        <SectionHeader label={`decisions · ${filtered.length}`}>
          {['all','high','blocked','no-feedback'].map(f => (
            <Btn key={f} small ghost onClick={() => setFilter(f)}
              style={{ borderColor: filter === f ? 'var(--accent)' : undefined, color: filter === f ? 'var(--accent)' : undefined }}>
              {f}
            </Btn>
          ))}
          <Btn small ghost onClick={load}>Refresh</Btn>
        </SectionHeader>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🛡" message="No decisions found — run auto-monitor or investigate a transaction" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((d, i) => (
              <div key={d.id}>
                <div
                  onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 100px 180px 180px 80px 80px',
                    gap: 8, padding: '11px 20px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', alignItems: 'center',
                    background: expanded === d.id ? 'var(--bg-hover)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (expanded !== d.id) e.currentTarget.style.background = 'var(--bg-raised)' }}
                  onMouseLeave={e => { if (expanded !== d.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{d.transaction_id}</span>
                  <RiskBadge level={d.risk_level} />
                  <ActionBadge action={d.action_taken} />
                  <ActionBadge action={d.policy_action} />
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: d.feedback ? 'var(--green)' : 'var(--text-muted)',
                  }}>
                    {d.feedback || '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    {expanded === d.id ? '▲' : '▼'}
                  </span>
                </div>
                {expanded === d.id && (
                  <div style={{ padding: '0 20px 16px' }}>
                    <DecisionDetail decision={d} onFeedback={load} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
