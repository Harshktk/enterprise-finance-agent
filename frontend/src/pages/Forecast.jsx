import { useState } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader, Btn, Spinner } from '../components/ui.jsx'
import { BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const DEPARTMENTS = ['Engineering', 'Finance', 'Marketing', 'Operations', 'HR', 'Sales']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border-light)',
      borderRadius: 6, padding: '8px 12px',
      fontFamily: 'var(--font-mono)', fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Day {label}</div>
      <div style={{ color: 'var(--accent)' }}>${payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
  )
}

export default function Forecast() {
  const [dept, setDept] = useState('Engineering')
  const [days, setDays] = useState(7)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async () => {
    setLoading(true); setError(null); setResult(null)
    try { setResult(await api.forecast(dept, days)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const chartData = result
    ? Object.entries(result.predicted_spend).map(([day, val]) => ({ day: `D+${day}`, value: val }))
    : []

  const total = chartData.reduce((s, d) => s + d.value, 0)
  const peak  = Math.max(...chartData.map(d => d.value))

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 }}>
      <div>
        <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Spend Forecast</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          ARIMA-based department spend forecasting
        </p>
      </div>

      <Card>
        <SectionHeader label="Forecast parameters" />
        <div style={{ padding: '20px', display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Department</label>
            <select value={dept} onChange={e => setDept(e.target.value)} style={{ width: 180 }}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Forecast Days</label>
            <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 120 }}>
              {[3,7,14,30].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <Btn variant="accent" onClick={run} disabled={loading}>
            {loading ? <><Spinner size={13} /> Running ARIMA...</> : <><BarChart3 size={13} /> Run Forecast</>}
          </Btn>
        </div>
      </Card>

      {error && (
        <Card style={{ borderColor: 'var(--red)', background: 'var(--red-dim)' }}>
          <div style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>{error}</div>
        </Card>
      )}

      {result && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[
              { label: 'Department',    value: result.department },
              { label: 'Projected total', value: `$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
              { label: 'Peak day',      value: `$${peak.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            ].map(({ label, value }) => (
              <Card key={label} style={{ padding: '16px 20px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card className="animate-in">
            <SectionHeader label={`${result.department} — ${result.forecast_days}-day forecast`} />
            <div style={{ padding: '20px 20px 12px', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Raw data table */}
          <Card>
            <SectionHeader label="Raw forecast values" />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Day', 'Predicted Spend'].map(h => (
                    <th key={h} style={{ padding: '8px 20px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.predicted_spend).map(([day, val]) => (
                  <tr key={day} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>Day +{day}</td>
                    <td style={{ padding: '9px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                      ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
