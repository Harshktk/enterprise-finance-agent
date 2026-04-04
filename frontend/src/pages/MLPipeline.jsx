import { useState } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader, Btn, Spinner, RiskBadge, MonoVal } from '../components/ui.jsx'
import { Brain, Zap, Search, CheckCircle, AlertCircle } from 'lucide-react'

function StepCard({ num, title, desc, action, result, loading, error }) {
  return (
    <Card>
      <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: result ? 'var(--green-dim)' : 'var(--bg-raised)',
          border: `1px solid ${result ? 'var(--green)' : 'var(--border-light)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
          color: result ? 'var(--green)' : 'var(--text-muted)',
        }}>
          {result ? '✓' : num}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{desc}</div>
          {action}
          {loading && <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}><Spinner size={12} /> Running...</div>}
          {error && <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)', background: 'var(--red-dim)', padding: '8px 12px', borderRadius: 'var(--radius)' }}>{error}</div>}
          {result && <ResultBlock data={result} />}
        </div>
      </div>
    </Card>
  )
}

function ResultBlock({ data }) {
  return (
    <div style={{
      marginTop: 10, background: 'var(--bg-base)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '10px 14px',
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)',
      maxHeight: 200, overflowY: 'auto',
    }}>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export default function MLPipeline() {
  const [trainResult, setTrainResult] = useState(null)
  const [trainLoading, setTrainLoading] = useState(false)
  const [trainError, setTrainError] = useState(null)

  const [scoreResult, setScoreResult] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState(null)

  const [explainId, setExplainId] = useState('')
  const [explainResult, setExplainResult] = useState(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState(null)

  const runTrain = async () => {
    setTrainLoading(true); setTrainError(null); setTrainResult(null)
    try { setTrainResult(await api.trainModel()) }
    catch (e) { setTrainError(e.message) }
    finally { setTrainLoading(false) }
  }

  const runScore = async () => {
    setScoreLoading(true); setScoreError(null); setScoreResult(null)
    try {
      const res = await api.scoreAll()
      const anomalies = res.filter(r => r.is_anomaly === 1).length
      setScoreResult({ total: res.length, anomalies, sample: res.slice(0, 5) })
    }
    catch (e) { setScoreError(e.message) }
    finally { setScoreLoading(false) }
  }

  const runExplain = async () => {
    if (!explainId.trim()) return
    setExplainLoading(true); setExplainError(null); setExplainResult(null)
    try { setExplainResult(await api.explainTxn(explainId.trim())) }
    catch (e) { setExplainError(e.message) }
    finally { setExplainLoading(false) }
  }

  const scored = scoreResult?.sample || []
  const anomalyIds = scored.filter(r => r.is_anomaly === 1).map(r => r.transaction_id)

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      <div>
        <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>ML Pipeline</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Train the Isolation Forest, score transactions, and inspect SHAP explanations
        </p>
      </div>

      <StepCard
        num="1" title="Train anomaly model" loading={trainLoading} result={trainResult} error={trainError}
        desc="Fits IsolationForest on all stored transactions. Builds SHAP TreeExplainer simultaneously."
        action={<Btn variant="accent" onClick={runTrain} disabled={trainLoading}><Brain size={13} /> Train Model</Btn>}
      />

      <StepCard
        num="2" title="Score all transactions" loading={scoreLoading} error={scoreError}
        result={scoreResult ? { total_scored: scoreResult.total, anomalies_found: scoreResult.anomalies } : null}
        desc="Runs all transactions through the trained model. Persists anomaly_score and is_anomaly to the database."
        action={<Btn onClick={runScore} disabled={scoreLoading || !trainResult}><Zap size={13} /> Score Transactions</Btn>}
      />

      {scoreResult && anomalyIds.length > 0 && (
        <Card style={{ borderColor: 'var(--amber)', background: 'var(--amber-dim)' }}>
          <div style={{ padding: '12px 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', marginBottom: 8 }}>
              ANOMALIES DETECTED — copy an ID below to explain
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {anomalyIds.map(id => (
                <button key={id}
                  onClick={() => setExplainId(id)}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    background: 'var(--bg-raised)', color: 'var(--accent)',
                    border: '1px solid var(--border-light)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
                  }}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      <StepCard
        num="3" title="Explain transaction (SHAP)" loading={explainLoading} result={explainResult} error={explainError}
        desc="Returns SHAP feature contributions showing exactly why a transaction was flagged."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={explainId}
              onChange={e => setExplainId(e.target.value)}
              placeholder="Enter transaction ID..."
              style={{ flex: 1, maxWidth: 300 }}
            />
            <Btn onClick={runExplain} disabled={explainLoading || !explainId.trim()}>
              <Search size={13} /> Explain
            </Btn>
          </div>
        }
      />

      {/* SHAP visualization */}
      {explainResult?.feature_contributions && (
        <Card className="animate-in">
          <SectionHeader label={`SHAP contributions — ${explainResult.transaction_id}`} />
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(explainResult.feature_contributions)
              .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
              .map(([feat, val]) => {
                const positive = val >= 0
                const pct = Math.min(Math.abs(val) * 800, 100)
                return (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', width: 160, flexShrink: 0 }}>{feat}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: positive ? 'var(--red)' : 'var(--green)',
                        borderRadius: 3, transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: positive ? 'var(--red)' : 'var(--green)', width: 70, textAlign: 'right',
                    }}>
                      {positive ? '+' : ''}{val.toFixed(4)}
                    </span>
                  </div>
                )
              })}
          </div>
          <div style={{ padding: '8px 20px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            RED = pushes toward anomaly · GREEN = pushes toward normal
          </div>
        </Card>
      )}
    </div>
  )
}
