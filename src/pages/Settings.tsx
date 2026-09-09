import { useState } from 'react'
import { useStore } from '../store/Store'
import { Avatar, Button, PageHeader, Tabs } from '../components/ui'
import type { LeaveType } from '../types'
import { fullName } from '../types'

export function SettingsPage() {
  const { state, currentUser, updateSettings, updateProfile, changePassword, addPosition, deletePosition, updateLeaveTypeDays, resetDemo, toast } = useStore()
  const [tab, setTab] = useState(currentUser?.role === 'admin' ? 'Organisation' : 'Profile')
  const [org, setOrg] = useState(state.settings)
  const [profile, setProfile] = useState({
    phone: currentUser?.phone ?? '',
    address: currentUser?.address ?? '',
    emergencyContact: currentUser?.emergencyContact ?? '',
    emergencyPhone: currentUser?.emergencyPhone ?? '',
  })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pos, setPos] = useState({ title: '', departmentId: state.departments[0]?.id ?? '' })
  const tabs = currentUser?.role === 'admin'
    ? ['Organisation', 'Profile', 'HR', 'System']
    : ['Profile', 'Password', 'Notifications']

  return (
    <>
      <PageHeader kicker="Workspace" title="Settings" lede="Organisation identity, your profile, and the rules that keep HR consistent." />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {(tab === 'Organisation') && currentUser?.role === 'admin' && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); updateSettings(org) }}>
          <div className="row">
            <div className="field"><label>Company name</label><input className="input" value={org.companyName} onChange={(e) => setOrg({ ...org, companyName: e.target.value })} /></div>
            <div className="field"><label>Tagline</label><input className="input" value={org.tagline} onChange={(e) => setOrg({ ...org, tagline: e.target.value })} /></div>
            <div className="field"><label>Email</label><input className="input" value={org.email} onChange={(e) => setOrg({ ...org, email: e.target.value })} /></div>
            <div className="field"><label>Phone</label><input className="input" value={org.phone} onChange={(e) => setOrg({ ...org, phone: e.target.value })} /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Address</label><input className="input" value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Website</label><input className="input" value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} /></div>
          <p className="lede">Logo appears as the Aurelia monogram in the sidebar. Replace via branding in a future release.</p>
          <Button type="submit" variant="gold" style={{ marginTop: 12 }}>Save organisation</Button>
        </form>
      )}
      {(tab === 'Profile' || tab === 'Password') && currentUser && (
        <div className="grid g-2">
          <form className="card" onSubmit={(e) => {
            e.preventDefault()
            updateProfile(currentUser.id, profile)
          }}>
            <div className="person" style={{ marginBottom: 16 }}>
              <Avatar employee={currentUser} size="lg" />
              <div>
                <h3 style={{ margin: 0 }}>{fullName(currentUser)}</h3>
                <p className="lede">{currentUser.email}</p>
              </div>
            </div>
            <div className="field"><label>Phone</label><input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
            <div className="field" style={{ marginTop: 8 }}><label>Address</label><input className="input" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></div>
            <div className="field" style={{ marginTop: 8 }}><label>Emergency contact</label><input className="input" value={profile.emergencyContact} onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })} /></div>
            <div className="field" style={{ marginTop: 8 }}><label>Emergency phone</label><input className="input" value={profile.emergencyPhone} onChange={(e) => setProfile({ ...profile, emergencyPhone: e.target.value })} /></div>
            <Button type="submit" variant="gold" style={{ marginTop: 12 }}>Update profile</Button>
          </form>
          <form className="card" onSubmit={(e) => {
            e.preventDefault()
            if (pw.next !== pw.confirm) {
              toast('New passwords do not match.', 'error')
              return
            }
            const err = changePassword(currentUser.id, pw.current, pw.next)
            if (err) toast(err, 'error')
            else setPw({ current: '', next: '', confirm: '' })
          }}>
            <h3>Password</h3>
            <div className="field"><label>Current</label><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
            <div className="field" style={{ marginTop: 8 }}><label>New</label><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
            <div className="field" style={{ marginTop: 8 }}><label>Confirm</label><input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
            <Button type="submit" variant="gold" style={{ marginTop: 12 }}>Change password</Button>
          </form>
        </div>
      )}
      {tab === 'HR' && currentUser?.role === 'admin' && (
        <div className="grid g-2">
          <div className="card">
            <h3>Leave types (days / year)</h3>
            {(Object.keys(state.leaveTypeDays) as LeaveType[]).map((t) => (
              <div key={t} className="field" style={{ marginTop: 8 }}>
                <label>{t}</label>
                <input className="input" type="number" value={state.leaveTypeDays[t]} onChange={(e) => updateLeaveTypeDays(t, Number(e.target.value))} />
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Positions</h3>
            {state.positions.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>{p.title}</span>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => deletePosition(p.id)}>Remove</button>
              </div>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); addPosition(pos.title, pos.departmentId); setPos({ ...pos, title: '' }) }} style={{ marginTop: 12 }}>
              <input className="input" placeholder="New position" value={pos.title} onChange={(e) => setPos({ ...pos, title: e.target.value })} required />
              <select className="select" style={{ marginTop: 8 }} value={pos.departmentId} onChange={(e) => setPos({ ...pos, departmentId: e.target.value })}>
                {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <Button type="submit" variant="ghost" style={{ marginTop: 8 }}>Add position</Button>
            </form>
            <p className="lede" style={{ marginTop: 16 }}>Departments and employment types are managed in Departments and employee records.</p>
          </div>
        </div>
      )}
      {(tab === 'System' || tab === 'Notifications') && (
        <div className="card">
          {tab === 'System' && currentUser?.role === 'admin' ? (
            <form onSubmit={(e) => { e.preventDefault(); updateSettings(org) }}>
              <div className="row">
                <div className="field">
                  <label>Theme</label>
                  <select className="select" value={org.theme} onChange={(e) => setOrg({ ...org, theme: e.target.value as 'warm' | 'contrast' })}>
                    <option value="warm">Warm linen</option>
                    <option value="contrast">Higher contrast</option>
                  </select>
                </div>
                <div className="field">
                  <label>Date format</label>
                  <select className="select" value={org.dateFormat} onChange={(e) => setOrg({ ...org, dateFormat: e.target.value })}>
                    <option value="dd MMM yyyy">04 Sep 2026</option>
                    <option value="yyyy-mm-dd">2026-09-04</option>
                  </select>
                </div>
                <div className="field">
                  <label>Currency</label>
                  <select className="select" value={org.currency} onChange={(e) => setOrg({ ...org, currency: e.target.value })}>
                    <option value="ZMW">Zambian Kwacha (K)</option>
                  </select>
                </div>
                <div className="field">
                  <label>Work start</label>
                  <input className="input" type="time" value={org.workStart} onChange={(e) => setOrg({ ...org, workStart: e.target.value })} />
                </div>
              </div>
              <Button type="submit" variant="gold" style={{ marginTop: 12 }}>Save system preferences</Button>
              <div style={{ marginTop: 24 }}>
                <Button type="button" variant="danger" onClick={resetDemo}>Restore demo data</Button>
              </div>
            </form>
          ) : (
            <p className="lede">You will receive in-app notices for leave, payroll, training, and announcements. Email delivery can be connected to a backend later.</p>
          )}
        </div>
      )}
    </>
  )
}
