#!/usr/bin/env node
/**
 * Run WATER_ANOMALY runbook via Jetty Chat Completions (runbook mode).
 *
 *   npm run jetty:run
 *
 * Runbooks take 2–3 min. Cloudflare may return 524 in the terminal — the run
 * still completes on flows.jetty.io. Watch the trajectory there.
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
const collection = process.env.JETTY_COLLECTION ?? 'myorg123'
const task = process.env.JETTY_TASK ?? 'hourly-water-report'
const runbookUrl = process.env.RUNBOOK_URL
const useGithub = process.env.USE_GITHUB_RUNBOOK === '1'
const localRunbook = resolve(root, 'runbook/WATER_ANOMALY.md')

if (!token) {
  console.error('Missing JETTY_API_TOKEN in .env')
  process.exit(1)
}

async function loadRunbook() {
  if (useGithub && runbookUrl) {
    console.log(`Fetching runbook: ${runbookUrl}`)
    const res = await fetch(runbookUrl)
    if (res.ok) return res.text()
    console.warn(`Runbook URL ${res.status} — falling back to local file`)
  }
  if (existsSync(localRunbook)) {
    console.log(`Using local runbook: ${localRunbook}`)
    return readFileSync(localRunbook, 'utf8')
  }
  throw new Error('Keep runbook/WATER_ANOMALY.md locally or set USE_GITHUB_RUNBOOK=1')
}

function isCloudflareTimeout(text) {
  return text.includes('524') || text.includes('A timeout occurred')
}

async function main() {
  const runbook = await loadRunbook()

  console.log('Launching Jetty runbook (2–3 min sandbox run)…')
  console.log('If terminal shows 524, check flows.jetty.io — run may still succeed.\n')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)

  let text = ''
  try {
    const res = await fetch('https://flows-api.jetty.io/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        stream: false,
        messages: [
          { role: 'system', content: runbook },
          {
            role: 'user',
            content:
              'Execute the runbook. Fetch SENSOR_ENDPOINT, analyze, write /app/results/report.json, email if alert_required.',
          },
        ],
        jetty: {
          runbook: true,
          collection,
          task,
          agent: 'claude-code',
        },
      }),
    })
    text = await res.text()

    if (!res.ok && !isCloudflareTimeout(text)) {
      console.error('Jetty error:', text.slice(0, 800))
      process.exit(1)
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('⏱ Request timed out locally (90s) — normal for long runbooks.')
      console.log(`→ Open https://flows.jetty.io → collection "${collection}" → task "${task}"`)
      console.log('→ Watch the newest trajectory (runs ~2–3 min)')
      process.exit(0)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }

  if (isCloudflareTimeout(text)) {
    console.log('⏱ Cloudflare 524 — Jetty is still running in the background.')
    console.log(`→ Open https://flows.jetty.io → "${collection}" → "${task}"`)
    process.exit(0)
  }

  let body
  try {
    body = JSON.parse(text)
  } catch {
    console.log(text.slice(0, 500))
    process.exit(0)
  }

  const trajectoryId = body.jetty_metadata?.trajectory_id ?? body.trajectory_id
  const content = body.choices?.[0]?.message?.content

  console.log('\n✓ Runbook finished')
  if (trajectoryId) {
    console.log(`  Trajectory ID: ${trajectoryId}`)
    console.log(`  https://flows.jetty.io → ${collection} → ${task}`)
  }
  if (content) {
    console.log('\n--- preview ---')
    console.log(content.slice(0, 500))
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
