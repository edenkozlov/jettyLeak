#!/usr/bin/env node
/**
 * Jetty setup: collection + runbook workflow task + hourly routine.
 *
 *   node scripts/setup-jetty.mjs              # create / update task
 *   node scripts/setup-jetty.mjs --run-now    # trigger routine (after task is valid)
 *   node scripts/setup-jetty.mjs --delete-task  # remove broken task before recreate
 *
 * Manual trigger: npm run jetty:run  (chat/completions runbook mode)
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
const collection = process.env.JETTY_COLLECTION ?? 'beluga-water'
const taskName = process.env.JETTY_TASK ?? 'hourly-water-report'
const routineName = process.env.JETTY_ROUTINE ?? 'hourly-check'
const runbookUrl = process.env.RUNBOOK_URL
const sensorEndpoint = process.env.SENSOR_ENDPOINT
const apiBase = (process.env.JETTY_API_BASE ?? 'https://flows-api.jetty.io/api/v1').replace(/\/$/, '')
const runNow = process.argv.includes('--run-now')
const deleteTask = process.argv.includes('--delete-task')

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
  if (!res.ok) {
    throw new Error(`${options.method ?? 'GET'} ${url} → ${res.status}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

function buildWorkflow() {
  const stepConfig = {
    activity: 'runbook',
    agent: 'claude-code',
    model: 'claude-sonnet-4-6',
    snapshot: 'python312-uv',
  }
  if (runbookUrl) {
    stepConfig.runbook_url = runbookUrl
  }

  return {
    init_params: {
      user_message:
        'Run the hourly water monitoring report. Fetch sensor state, analyze flow, email if anomaly detected.',
    },
    step_configs: {
      run: stepConfig,
    },
    steps: ['run'],
  }
}

async function ensureCollection() {
  try {
    const list = await jetty('/collections')
    if (Array.isArray(list) && list.some((c) => c.name === collection)) {
      console.log(`· Collection "${collection}" already exists`)
      return
    }
  } catch {
    // fall through to create attempt
  }
  try {
    await jetty('/collections', {
      method: 'POST',
      body: JSON.stringify({ name: collection }),
    })
    console.log(`✓ Collection "${collection}" created`)
  } catch (e) {
    if (
      String(e.message).includes('409') ||
      String(e.message).includes('403') ||
      String(e.message).toLowerCase().includes('exist')
    ) {
      console.log(`· Using existing collection "${collection}"`)
    } else {
      throw e
    }
  }
}

async function deleteExistingTask() {
  try {
    await jetty(`/tasks/${collection}/${taskName}`, { method: 'DELETE' })
    console.log(`✓ Deleted task "${taskName}"`)
  } catch (e) {
    if (e.message.includes('404')) {
      console.log(`· Task "${taskName}" not found (nothing to delete)`)
    } else {
      throw e
    }
  }
}

async function ensureTask() {
  if (!runbookUrl) {
    console.warn('⚠ RUNBOOK_URL not set — task will need runbook_url in Jetty UI')
  }

  const payload = {
    name: taskName,
    workflow: buildWorkflow(),
  }

  try {
    await jetty(`/collections/${collection}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    console.log(`✓ Task "${taskName}" created (runbook workflow)`)
  } catch (e) {
    if (String(e.message).includes('409') || String(e.message).toLowerCase().includes('exist')) {
      console.log(`· Task exists — use --delete-task then re-run setup to replace broken task`)
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
        cadence: { type: 'hourly' },
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
  console.log(`✓ Routine run-now triggered`)
}

async function main() {
  console.log('Jetty water monitoring setup')
  console.log('────────────────────────────')
  if (sensorEndpoint) {
    console.log(`SENSOR_ENDPOINT: ${sensorEndpoint}`)
  }

  await ensureCollection()

  if (deleteTask) {
    await deleteExistingTask()
  }

  await ensureTask()
  await ensureRoutine()

  if (runNow) {
    await triggerRunNow()
  }

  console.log('\nManual run: npm run jetty:run')
  console.log('Runs: https://flows.jetty.io')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
