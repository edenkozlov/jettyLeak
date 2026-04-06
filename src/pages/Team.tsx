import { Link } from 'react-router'

import useAuth from '@/hooks/auth/useAuth'
import { useTeamPage } from '@/hooks/useTeamPage'

import type { ClientTeamOrganization } from '@/queries/getClientTeam'

function organizationLabel(org: ClientTeamOrganization) {
  const name = [org.first_name, org.last_name].filter(Boolean).join(' ')
  return name || org.email || '—'
}

export default function Team() {
  const { role, client_id, user_id } = useAuth()
  const { team, loading, error } = useTeamPage(role === 'client' && client_id ? client_id : null)

  if (role !== 'client' || !client_id) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-xl font-bold sm:text-2xl">Team</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          This page is available when you are signed in with an organization account.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Return to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold sm:text-2xl">Team</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Organization details and members with access to this account.
      </p>

      {loading && (
        <div className="mt-8 space-y-4">
          <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
          <div className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        </div>
      )}

      {error && !loading && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {team && !loading && (
        <div className="mt-8 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Organization</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                The account your team is associated with.
              </p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {organizationLabel(team.organization)}
                </span>
              </div>
              {team.organization.email && (
                <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Contact email</span>
                  <span className="break-all text-sm font-medium text-gray-900 dark:text-white">
                    {team.organization.email}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Members</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                People with access under this organization.
              </p>
            </div>

            {team.members.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">No members listed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                      <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {team.members.map((m) => (
                      <tr key={m.id}>
                        <td className="px-5 py-3 text-gray-900 dark:text-white">
                          <span className="break-all">{m.email ?? '—'}</span>
                          {m.id === user_id && (
                            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">(You)</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            {m.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
