const GIS_SRC = 'https://accounts.google.com/gsi/client'

type GoogleProfile = {
  email: string
  name: string
  picture?: string
}

type GoogleAuthResult =
  | { ok: true; profile: GoogleProfile }
  | { ok: false; error: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

let gisLoading: Promise<void> | null = null

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoading) return gisLoading

  gisLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')))
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'))
    document.head.appendChild(script)
  })

  return gisLoading
}

export function getGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ''
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(getGoogleClientId())
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const clientId = getGoogleClientId()
  if (!clientId) {
    return {
      ok: false,
      error: 'Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.',
    }
  }

  try {
    await loadGoogleIdentityServices()
  } catch {
    return { ok: false, error: 'Could not load Google sign-in. Check your network and try again.' }
  }

  if (!window.google?.accounts?.oauth2) {
    return { ok: false, error: 'Google sign-in is unavailable in this browser.' }
  }

  return new Promise((resolve) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: async (response) => {
        if (response.error || !response.access_token) {
          resolve({
            ok: false,
            error: response.error_description || response.error || 'Google sign-in was cancelled.',
          })
          return
        }

        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` },
          })
          if (!res.ok) {
            resolve({ ok: false, error: 'Could not read your Google profile.' })
            return
          }
          const data = (await res.json()) as { email?: string; name?: string; picture?: string }
          if (!data.email) {
            resolve({ ok: false, error: 'Google did not return an email address.' })
            return
          }
          resolve({
            ok: true,
            profile: {
              email: data.email,
              name: data.name?.trim() || data.email.split('@')[0] || 'Google User',
              picture: data.picture,
            },
          })
        } catch {
          resolve({ ok: false, error: 'Google sign-in failed. Please try again.' })
        }
      },
    })

    client.requestAccessToken()
  })
}

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.3 44 33 44 24c0-1.3-.1-2.7-.4-3.9z" />
    </svg>
  )
}
