import { useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, DataTable, FormActions, Modal, PageHeader, RowActions, statusTone } from '../components/ui'
import { fullName, roleLabel } from '../types'

export function AdminsPage() {
  const { state, currentUser, createAdminAccount, resendAdminCredentials, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('Administrator')
  const [password, setPassword] = useState('')

  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return state.employees.filter((e) => {
      if (e.role !== 'admin') return false
      if (!s) return true
      return `${fullName(e)} ${e.email}`.toLowerCase().includes(s)
    })
  }, [q, state.employees])

  if (!currentUser || currentUser.role !== 'super_admin') {
    return (
      <div className="card empty">
        <h3>Access Denied</h3>
        <p>Only Super Administrators can create and manage Administrator accounts.</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        kicker="Administration"
        title="Admin Management"
        lede="Create Administrator accounts. Set a temporary password here. It is stored as a hash and is not shown again."
        actions={<Button variant="gold" onClick={() => setOpen(true)}>Create Admin</Button>}
      />
      <div className="filters">
        <input className="input" placeholder="Search administrators" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <DataTable empty={rows.length === 0} emptyTitle="No administrators" emptyBody="Create an Administrator to manage employees.">
        <thead>
          <tr>
            <th>Admin</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td>
                <div className="person">
                  <Avatar employee={e} size="sm" />
                  <strong style={{ color: 'var(--ink)' }}>{fullName(e)}</strong>
                </div>
              </td>
              <td>{e.email}</td>
              <td><Badge tone="gold">{roleLabel(e.role)}</Badge></td>
              <td><Badge tone={statusTone(e.status)}>{e.status}</Badge></td>
              <td>
                <RowActions
                  items={[
                    {
                      label: 'Resend Login Credentials',
                      onClick: async () => {
                        const result = await resendAdminCredentials(e.id)
                        if (result.error) toast(result.error, 'error')
                      },
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <Modal open={open} title="Create Administrator" onClose={() => !busy && setOpen(false)}>
        <form
          onSubmit={async (ev) => {
            ev.preventDefault()
            setBusy(true)
            if (password.length < 8) {
              setBusy(false)
              toast('Temporary password must be at least 8 characters.', 'error')
              return
            }
            const result = await createAdminAccount({
              firstName,
              lastName,
              email,
              phone,
              position,
              password,
            })
            setBusy(false)
            if (result.error) {
              toast(result.error, 'error')
              return
            }
            setOpen(false)
            setFirstName('')
            setLastName('')
            setEmail('')
            setPhone('')
            setPosition('Administrator')
            setPassword('')
          }}
        >
          <div className="row">
            <div className="field"><label>First name</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div className="field"><label>Last name</label><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Position</label><input className="input" value={position} onChange={(e) => setPosition(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Temporary password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" /></div>
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            Share this temporary password directly. It is hashed before storage and the new administrator must change it at first sign-in.
          </p>
          <FormActions onCancel={() => setOpen(false)} submitLabel={busy ? 'Creating…' : 'Create Admin'} />
        </form>
      </Modal>
    </>
  )
}
