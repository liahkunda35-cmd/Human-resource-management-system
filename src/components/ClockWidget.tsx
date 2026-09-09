import { useEffect, useState } from 'react'
import { useStore } from '../store/Store'
import { Button } from './ui'
import { formatDate, nowTime, todayISO } from '../lib/format'

export function ClockWidget() {
  const { currentUser, clockIn, clockOut, state } = useStore()
  const [time, setTime] = useState(nowTime())
  useEffect(() => {
    const t = window.setInterval(() => setTime(nowTime()), 1000)
    return () => window.clearInterval(t)
  }, [])
  if (!currentUser) return null
  const today = todayISO()
  const rec = state.attendance.find((a) => a.employeeId === currentUser.id && a.date === today)
  const canIn = !rec?.clockIn
  const canOut = Boolean(rec?.clockIn && !rec.clockOut)

  return (
    <div className="card clock-panel">
      <div>
        <div className="kicker">{formatDate(new Date(), true)}</div>
        <div className="clock-time">{time}</div>
        <p className="lede">
          {rec?.clockIn ? `Clocked in at ${rec.clockIn}` : 'You have not clocked in yet.'}
          {rec?.clockOut ? ` · Out ${rec.clockOut}` : ''}
          {rec?.hours ? ` · ${rec.hours}h logged` : ''}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button variant="gold" disabled={!canIn} onClick={() => clockIn(currentUser.id)}>Clock in</Button>
          <Button variant="ghost" disabled={!canOut} onClick={() => clockOut(currentUser.id)}>Clock out</Button>
        </div>
      </div>
      <div>
        <div className="label">Today</div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 28, margin: '6px 0' }}>{rec?.status ?? 'Awaiting clock-in'}</h3>
        <p className="lede">Break allowance 45 minutes · Core hours from {state.settings.workStart}.</p>
      </div>
    </div>
  )
}

export function AttendanceCalendar({ employeeId }: { employeeId: string }) {
  const { state } = useStore()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ d: number | null; cls: string }> = []
  for (let i = 0; i < startPad; i++) cells.push({ d: null, cls: '' })
  for (let d = 1; d <= days; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const rec = state.attendance.find((a) => a.employeeId === employeeId && a.date === iso)
    let cls = ''
    if (rec?.status === 'Present' || rec?.status === 'Remote') cls = 'present'
    else if (rec?.status === 'Late') cls = 'late'
    else if (rec?.status === 'On Leave') cls = 'leave'
    else if (rec?.status === 'Absent') cls = 'absent'
    if (iso === todayISO()) cls += ' today'
    cells.push({ d, cls })
  }
  const monthName = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  return (
    <div>
      <div className="kicker" style={{ marginBottom: 8 }}>{monthName}</div>
      <div className="cal">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((h, i) => <span key={i} className="h">{h}</span>)}
        {cells.map((c, i) => (
          <span key={i} className={c.cls}>{c.d ?? ''}</span>
        ))}
      </div>
    </div>
  )
}
