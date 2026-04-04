import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader, RiskBadge, ActionBadge, Spinner, Btn, MonoVal } from '../components/ui.jsx'
import { ShieldAlert, Zap, AlertTriangle, CheckCircle, TrendingUp, Activity } from 'lucide-react'

function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        {Icon && <Icon size={14} color={accent || 'var(--text-muted)'} />}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: accent || 'var(--text-primary)', lineHeight: 1 }}>
        {value ?? <Spinner size={20} />}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </Card>
  )
}

export default function Overview() {
  const [actions, setActions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getActions()
      .then(setActions)
      .catch(() => setActions([]))
      .finally(() => setLoading(false))
  }, [])

  const high   = actions?.filter(a => a.risk_level === 'High').length ?? 0
  const medium = actions?.filter(a => a.risk_level === 'Medium').length ?? 0
  const low    = actions?.filter(a => a.risk_level === 'Low').length ?? 0
  const blocked = actions?.filter(a => a.action_taken === 'BLOCK_AND_ALERT').length ?? 0
  const recent = actions ? [...actions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8) : []

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Operations Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Real-time financial risk monitoring and agent decision summary
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Total Decisions" value={loading ? null : actions?.length} icon={Activity} />
        <StatCard label="High Risk" value={loading ? null : high} accent="var(--red)" icon={AlertTriangle} />
        <StatCard label="Blocked" value={loading ? null : blocked} accent="var(--red)" icon={ShieldAlert} />
        <StatCard label="Auto-Approved" value={loading ? null : low} accent="var(--green)" icon={CheckCircle} />
      </div>

      {/* Risk breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <SectionHeader label="Risk distribution" />
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'High',   count: high,   color: 'var(--red)',   total: actions?.length || 1 },
              { label: 'Medium', count: medium, color: 'var(--amber)', total: actions?.length || 1 },
              { label: 'Low',    count: low,    color: 'var(--green)', total: actions?.length || 1 },
            ].map(({ label, count, color, total }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>{count}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-raised)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(count / total) * 100}%`,
                    background: color, borderRadius: 2,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader label="Quick actions" />
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: '→ Train anomaly model', to: '/ml' },
              { label: '→ Score transactions',  to: '/ml' },
              { label: '→ Run auto-monitor',    to: '/agent' },
              { label: '→ Ingest transactions', to: '/ingest' },
              { label: '→ View forecasts',      to: '/forecast' },
            ].map(({ label, to }) => (
              <a key={label} href={to} style={{
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--accent)', padding: '6px 0',
                borderBottom: '1px solid var(--border)',
                display: 'block',
                transition: 'color 0.12s',
              }}>
                {label}
              </a>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent decisions */}
      <Card>
        <SectionHeader label="Recent agent decisions" />
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : recent.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            No decisions yet — run the ML pipeline to get started
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Transaction ID', 'Risk', 'Action', 'Policy', 'Model', 'Time'].map(h => (
                  <th key={h} style={{
                    padding: '8px 16px', textAlign: 'left',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((d, i) => (
                <tr key={d.id} style={{
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                    {d.transaction_id}
                  </td>
                  <td style={{ padding: '10px 16px' }}><RiskBadge level={d.risk_level} /></td>
                  <td style={{ padding: '10px 16px' }}><ActionBadge action={d.action_taken} /></td>
                  <td style={{ padding: '10px 16px' }}><ActionBadge action={d.policy_action} /></td>
                  <td style={{ padding: '10px 16px' }}><MonoVal>{d.model_version}</MonoVal></td>
                  <td style={{ padding: '10px 16px' }}>
                    <MonoVal dim>{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</MonoVal>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
