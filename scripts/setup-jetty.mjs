#!/usr/bin/env node
/**
 * One-time Jetty setup for Beluga demo (spec: Routine → Workflow → Runbook).
 *
 * Usage:
 *   node scripts/setup-jetty.mjs              # create collection, task, routine
 *   node scripts/setup-jetty.mjs --run-now    # trigger routine immediately
 *
 * Required env (or .env in repo root — loaded manually below):
 *   JETTY_API_TOKEN
 *   SENSOR_ENDPOINT   — e.g. https://xxx.supabase.co/functions/v1/sensor-state?sensor_id=1
 *   RUNBOOK_URL       — raw GitHub URL to runbook/WATER_ANOMALY.md
 *
 * Optional:
 *   JETTY_COLLECTION=beluga-demo
 *   JETTY_TASK=hourly-water-report
 *   JETTY_ROUTINE=hourly-check
 *   JETTY_API_BASE=https://flows-api.jetty.io/api/v1
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

const token = process.env.JETTY_API_TOKEN
const collection = process.env.JETTY_COLLECTION ?? 'beluga-demo'
const taskName = process.env.JETTY_TASK ?? 'hourly-water-report'
const routineName = process.env.JETTY_ROUTINE ?? 'hourly-check'
const runbookUrl = process.env.RUNBOOK_URL
const sensorEndpoint = process.env.SENSOR_ENDPOINT
const apiBase = (process.env.JETTY_API_BASE ?? 'https://flows-api.jetty.io/api/v1').replace(/\/$/, '')
const runNow = process.argv.includes('--run-now')

if (!token) {
  console.error('Missing JETTY_API_TOKEN')
  process.exit(1)
}

async function jetty(path, options = {}) {
  const url = `${apiBase}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    throw new Error(`${options.method ?? 'GET'} ${url} → ${res.status}: ${text}`)
  }
  return body
}

async function ensureCollection() {
  try {
    await jetty('/collections', {
      method: 'POST',
      body: JSON.stringify({ name: collection }),
    })
    console.log(`✓ Collection "${collection}" created`)
  } catch (e) {
    if (String(e.message).includes('409') || String(e.message).toLowerCase().includes('exist')) {
      console.log(`· Collection "${collection}" already exists`)
    } else {
      throw e
    }
  }
}

async function ensureTask() {
  if (!runbookUrl) {
    console.warn('⚠ RUNBOOK_URL not set — push runbook/WATER_ANOMALY.md to GitHub and set RUNBOOK_URL')
  }

  const payload = {
    name: taskName,
    workflow: {
      steps: [
        {
          id: 'run-runbook',
          type: 'chat_completion',
          config: {
            model: 'claude-sonnet-4-6',
            messages: [
              {
                role: 'user',
                content:
                  'Run the hourly water monitoring report and alert if anomaly detected.',
              },
            ],
            jetty: {
              collection,
              runbook_url: runbookUrl,
            },
          },
        },
      ],
    },
  }

  try {
    await jetty(`/collections/${collection}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    console.log(`✓ Task "${taskName}" created`)
  } catch (e) {
    if (String(e.message).includes('409') || String(e.message).toLowerCase().includes('exist')) {
      console.log(`· Task "${taskName}" may already exist — update in flows.jetty.io if needed`)
    } else {
      throw e
    }
  }
}

async function ensureRoutine() {
  try {
    await jetty(`/routines/${collection}/${taskName}`, {
      method: 'POST',
      body: JSON.stringify({
        name: routineName,
        cadence: '0 * * * *',
      }),
    })
    console.log(`✓ Routine "${routineName}" scheduled (hourly)`)
  } catch (e) {
    if (String(e.message).includes('409') || String(e.message).toLowerCase().includes('exist')) {
      console.log(`· Routine "${routineName}" already exists`)
    } else {
      throw e
    }
  }
}

async function triggerRunNow() {
  await jetty(`/routines/${collection}/${taskName}/${routineName}/run-now`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  console.log(`✓ Routine run-now triggered — watch flows.jetty.io → ${collection} → ${taskName}`)
}

async function main() {
  console.log('Beluga × Jetty setup')
  console.log('────────────────────')
  if (sensorEndpoint) {
    console.log(`SENSOR_ENDPOINT: ${sensorEndpoint}`)
    console.log('Add SENSOR_ENDPOINT + Twilio/Resend secrets in Jetty collection env vars.')
  } else {
    console.warn('⚠ Set SENSOR_ENDPOINT to your deployed sensor-state URL')
  }

  await ensureCollection()
  await ensureTask()
  await ensureRoutine()

  if (runNow) {
    await triggerRunNow()
  } else {
    console.log('\nDemo trigger:')
    console.log(`  npm run jetty:run-now`)
    console.log('  (or press L for leak, then run-now while tab is open)')
  }

  console.log('\nTrajectories: https://flows.jetty.io')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
