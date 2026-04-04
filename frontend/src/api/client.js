const BASE = import.meta.env.VITE_API_URL || '/api'

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Health
  health: () => req('GET', '/'),

  // Transactions
  ingestTransaction: (txn) => req('POST', '/transactions/ingest', txn),

  // ML
  trainModel:    () => req('POST', '/ml/train'),
  scoreAll:      () => req('GET',  '/ml/score'),
  explainTxn:    (id) => req('GET', `/ml/explain/${id}`),
  forecast:      (dept, days = 7) => req('GET', `/ml/forecast/${encodeURIComponent(dept)}?days=${days}`),
  retrainFeedback: () => req('POST', '/ml/retrain'),

  // Agent
  investigate:   (id) => req('POST', `/agent/investigate/${id}`),
  autoMonitor:   () => req('POST', '/agent/auto-monitor'),
  getActions:    () => req('GET',  '/agent/actions'),
  getDecisions:  (id) => req('GET', `/agent/decisions/${id}`),
  submitFeedback: (id, verdict, notes) =>
    req('POST', `/agent/feedback/${id}`, { verdict, notes }),
}
