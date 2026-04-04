import { useState, useEffect } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader, Btn, Spinner, EmptyState, MonoVal } from '../components/ui.jsx'
import { MessageSquare, RefreshCw } from 'lucide-react'

function FeedbackBar({ label, count, total, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>{count}</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-raised)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${total ? (count / total) * 100 : 0}%`,
          background: color, borderRadius: 2, transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

export default function Feedback() {
  const [actions, setActions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrainResult, setRetrainResult] = useState(null)
  const [retrainLoading, setRetrainLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.getActions()
      .then(setActions)
      .catch(() => setActions([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const runRetrain = async () => {
    setRetrainLoading(true); setRetrainResult(null)
    try { setRetrainResult(await api.retrainFeedback()) }
    catch (e) { setRetrainResult({ error: e.message }) }
    finally { setRetrainLoading(false) }
  }

  const withFeedback   = (actions || []).filter(a => a.feedback)
  const correct        = withFeedback.filter(a => a.feedback === 'correct').length
  const falsePositive  = withFeedback.filter(a => a.feedback === 'false_positive').length
  const missed         = withFeedback.filter(a => a.feedback === 'missed').length
  const total          = withFeedback.length
  const pending        = (actions || []).filter(a => !a.feedback).length

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 }}>
      <div>
        <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Feedback Loop</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Analyst feedback drives model improvement over time
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'With feedback', value: total,        color: 'var(--text-primary)' },
          { label: 'Correct',       value: correct,      color: 'var(--green)'  },
          { label: 'False positive',value: falsePositive,color: 'var(--amber)'  },
          { label: 'Missed',        value: missed,       color: 'var(--red)'    },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
              {loading ? <Spinner size={18} /> : value}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Distribution */}
        <Card>
          <SectionHeader label="Feedback distribution" />
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FeedbackBar label="Correct"        count={correct}       total={total} color="var(--green)" />
            <FeedbackBar label="False positive" count={falsePositive} total={total} color="var(--amber)" />
            <FeedbackBar label="Missed"         count={missed}        total={total} color="var(--red)"   />
          </div>
        </Card>

        {/* Retrain */}
        <Card>
          <SectionHeader label="Retraining signals" />
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Aggregate analyst feedback to surface threshold retraining signals. High false-positive rates suggest the contamination parameter should be reduced.
            </p>
            <Btn onClick={runRetrain} disabled={retrainLoading || total === 0}>
              {retrainLoading ? <><Spinner size={13} /> Reviewing...</> : <><RefreshCw size={13} /> Review Feedback</>}
            </Btn>
            {retrainResult && (
              <div style={{
                background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '10px 14px',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)',
              }}>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(retrainResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Feedback log */}
      <Card>
        <SectionHeader label={`feedback log · ${total} reviewed`}>
          <Btn small ghost onClick={load}>Refresh</Btn>
        </SectionHeader>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : withFeedback.length === 0 ? (
          <EmptyState icon="💬" message="No feedback yet — go to Agent Decisions to submit verdicts" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Transaction ID', 'Risk', 'Verdict', 'Notes', 'Submitted'].map(h => (
                  <th key={h} style={{
                    padding: '8px 16px', textAlign: 'left',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.08em', fontWeight: 400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withFeedback.map((d, i) => {
                const verdictColor = d.feedback === 'correct' ? 'var(--green)' : d.feedback === 'false_positive' ? 'var(--amber)' : 'var(--red)'
                return (
                  <tr key={d.id} style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                      {d.transaction_id}
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {d.risk_level}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                        color: verdictColor, background: `${verdictColor}22`,
                        padding: '2px 8px', borderRadius: 4,
                      }}>
                        {d.feedback}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.feedback_notes || <MonoVal dim>—</MonoVal>}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <MonoVal dim>{d.feedback_at ? new Date(d.feedback_at).toLocaleString() : '—'}</MonoVal>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Pending feedback */}
      {pending > 0 && (
        <Card style={{ borderColor: 'var(--amber)', background: 'var(--amber-dim)' }}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber)' }}>
              {pending} decision{pending > 1 ? 's' : ''} still awaiting analyst feedback
            </div>
            <a href="/agent" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', textDecoration: 'underline' }}>
              Go to Agent Decisions →
            </a>
          </div>
        </Card>
      )}
    </div>
  )
}
