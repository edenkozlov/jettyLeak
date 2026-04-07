import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { useClientsPage } from '@/hooks/useClientsPage'
import { UPDATE_CLIENT } from '@/mutations/clientMutations'
import { UPDATE_USER_ROLE, DELETE_USER } from '@/mutations/userMutations'
import type { Client } from '@/types'
import { formatDate } from '@/utils/formatDate'

const IC = 'h-3.5 w-3.5 shrink-0'

function PersonIcon({ className = IC }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function PenIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function clientName(c: Client): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
}

function buildingCount(c: Client): number {
  return c.buildings_aggregate?.aggregate?.count ?? c.buildings?.length ?? 0
}

function totalSensors(c: Client): number {
  return (
    c.buildings?.reduce(
      (sum, b) => sum + (b.sensors_aggregate?.aggregate?.count ?? 0),
      0,
    ) ?? 0
  )
}

function avgBhi(c: Client): { avg: number; label: string } | null {
  const scored = c.buildings?.filter((b) => b.bhi != null) ?? []
  if (scored.length === 0) return null
  const avg = Math.round(scored.reduce((s, b) => s + b.bhi!, 0) / scored.length)
  const label =
    avg >= 85 ? 'healthy' : avg >= 70 ? 'watch' : avg >= 50 ? 'investigate' : 'critical'
  return { avg, label }
}

const BHI_COLORS: Record<string, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  watch: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  investigate: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  critical: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

function AvgBhiBadge({ client }: { client: Client }) {
  const bhi = avgBhi(client)
  if (!bhi) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
  const color = BHI_COLORS[bhi.label] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {bhi.avg}
    </span>
  )
}

const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/[0.06]'

function Bone({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-gray-200/70 dark:bg-gray-700/50 ${shimmer} ${className}`} />
}

function RowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-28" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-40" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-8" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-8" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-8" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-10" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-20" /></td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Edit Client Modal
// ---------------------------------------------------------------------------

function EditClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client
  onClose: () => void
  onSaved: () => void
}) {
  const [firstName, setFirstName] = useState(client.first_name ?? '')
  const [lastName, setLastName] = useState(client.last_name ?? '')
  const [email, setEmail] = useState(client.email ?? '')
  const [saving, setSaving] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await UPDATE_CLIENT({ id: client.id, first_name: firstName, last_name: lastName, email })
      onSaved()
    } catch { /* ignore */ }
    setSaving(false)
  }, [client.id, firstName, lastName, email, onSaved])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Client</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">First name</label>
              <input
                ref={firstRef}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edit User Modal
// ---------------------------------------------------------------------------

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: { id: string; role: string; email: string | null }
  onClose: () => void
  onSaved: () => void
}) {
  const [role, setRole] = useState<'admin' | 'client'>(user.role === 'admin' ? 'admin' : 'client')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await UPDATE_USER_ROLE(user.id, role)
      onSaved()
    } catch { /* ignore */ }
    setSaving(false)
  }, [user.id, role, onSaved])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await DELETE_USER(user.id)
      onSaved()
    } catch { /* ignore */ }
    setDeleting(false)
  }, [user.id, onSaved])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email ?? user.id.slice(0, 8)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.id}</p>
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'client')}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove user
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Confirm remove'}
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Clients() {
  const { clients, loading, error, refetch } = useClientsPage()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editingUser, setEditingUser] = useState<{ id: string; role: string; email: string | null } | null>(null)

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">Clients</h1>
        {!loading && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {clients.length}
          </span>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 sm:px-6"><span className="inline-flex items-center gap-1.5"><PersonIcon />Name</span></th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  Email
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  Buildings
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" /></svg>
                  Sensors
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.997M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                  Users
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  Avg Health
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                  Created
                </span>
              </th>
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : clients.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">No clients found</td></tr>
            ) : (
              clients.map((client) => {
                const isExpanded = expandedId === client.id
                const users = client.users ?? []
                return (
                  <Fragment key={client.id}>
                    <tr
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={() => setExpandedId(isExpanded ? null : client.id)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-6 sm:py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {(client.first_name?.[0] ?? client.email?.[0] ?? '?').toUpperCase()}
                          </span>
                          {clientName(client)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">{client.email ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums sm:px-6 sm:py-4">{buildingCount(client)}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums sm:px-6 sm:py-4">{totalSensors(client)}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums sm:px-6 sm:py-4">{client.users_count ?? 0}</td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4"><AvgBhiBadge client={client} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">{formatDate(client.created_at)}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingClient(client) }}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title="Edit client"
                        >
                          <PenIcon />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 px-6 py-4 dark:bg-gray-800/50">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Users ({users.length})
                          </div>
                          {users.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500">No users linked to this client.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {users.map((u) => (
                                <div key={u.id} className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    {(u.email?.[0] ?? '?').toUpperCase()}
                                  </span>
                                  <span className="text-sm text-gray-900 dark:text-white">{u.email ?? u.id.slice(0, 8)}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                    {u.role}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingUser(u) }}
                                    className="ml-auto rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                    title="Edit user"
                                  >
                                    <PenIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Bone className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2"><Bone className="h-4 w-28" /><Bone className="h-3 w-40" /></div>
                </div>
                <div className="mt-3 flex gap-4"><Bone className="h-3 w-20" /><Bone className="h-3 w-16" /></div>
              </div>
            ))
          : clients.map((client) => {
              const isExpanded = expandedId === client.id
              const users = client.users ?? []
              return (
                <div
                  key={client.id}
                  className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <div
                    className="cursor-pointer p-4"
                    onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {(client.first_name?.[0] ?? client.email?.[0] ?? '?').toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{clientName(client)}</p>
                        {client.email && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{client.email}</p>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingClient(client) }}
                        className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      >
                        <PenIcon />
                      </button>
                      <div className="shrink-0"><AvgBhiBadge client={client} /></div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                      <span>{buildingCount(client)} building{buildingCount(client) !== 1 ? 's' : ''}</span>
                      <span>{totalSensors(client)} sensor{totalSensors(client) !== 1 ? 's' : ''}</span>
                      <span>{users.length} user{users.length !== 1 ? 's' : ''}</span>
                      <span className="ml-auto">{formatDate(client.created_at)}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Users ({users.length})
                      </div>
                      {users.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500">No users linked to this client.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {users.map((u) => (
                            <div key={u.id} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                {(u.email?.[0] ?? '?').toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-900 dark:text-white">{u.email ?? u.id.slice(0, 8)}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                {u.role}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingUser(u) }}
                                className="ml-auto rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              >
                                <PenIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700">
            <PersonIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No clients found</p>
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={() => { setEditingClient(null); refetch() }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); refetch() }}
        />
      )}
    </div>
  )
}
