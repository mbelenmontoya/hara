// Hará Match - Vitest Global Setup
// Purpose: Start Next.js dev server for integration tests
// Only runs once before all tests

import { spawn, ChildProcess } from 'child_process'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') })

let serverProcess: ChildProcess | null = null

export async function setup() {
  console.log('Starting Next.js dev server for integration tests...')

  // Start dev server with explicit env vars
  serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      // Ensure NODE_ENV is set for dev mode
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  })

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server failed to start within 60 seconds'))
    }, 60000)

    serverProcess!.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      if (output.includes('Local:') || output.includes('localhost:3000')) {
        clearTimeout(timeout)
        console.log('Next.js dev server is ready')
        // Wait a bit more for server to be fully ready
        setTimeout(resolve, 2000)
      }
    })

    serverProcess!.stderr?.on('data', (data: Buffer) => {
      console.error('Server error:', data.toString())
    })

    serverProcess!.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })

  return () => {
    // This function will be called by teardown
  }
}

export async function teardown() {
  if (serverProcess) {
    console.log('Stopping Next.js dev server...')
    serverProcess.kill('SIGTERM')

    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      serverProcess!.on('exit', () => {
        console.log('Next.js dev server stopped')
        resolve()
      })

      // Force kill after 5 seconds
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL')
        }
        resolve()
      }, 5000)
    })
  }
}
