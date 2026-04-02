import { useState, useEffect } from 'react'
import { AppSettings, AppTheme } from '../../types'

interface UpdateInfo {
  hasUpdate: boolean
  latestVersion?: string
  phase?: 'available' | 'downloading' | 'downloaded' | 'error'
  percent?: number
}

interface SettingsModalProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => Promise<void>
  onClose: () => void
  updateInfo: UpdateInfo | null
  onDownloadUpdate: () => void
  onInstallUpdate: () => void
}

export default function SettingsModal({ settings, onSave, onClose, updateInfo, onDownloadUpdate, onInstallUpdate }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [granolaApiKey, setGranolaApiKey] = useState(settings.granolaApiKey ?? '')
  const [userName, setUserName] = useState(settings.userName ?? '')
  const [celebrationSound, setCelebrationSound] = useState(settings.celebrationSoundEnabled)
  const [theme, setTheme] = useState<AppTheme>(settings.theme ?? 'classic')
  const [isSaving, setIsSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showGranolaKey, setShowGranolaKey] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  useEffect(() => {
    window.electronAPI.getAppVersion().then(setAppVersion)
  }, [])

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true)
    try {
      await window.electronAPI.checkForUpdates()
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        apiKey,
        celebrationSoundEnabled: celebrationSound,
        granolaApiKey: granolaApiKey || undefined,
        userName: userName || undefined,
        theme
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Settings</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* API Key Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Anthropic API Key
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Required to chat with Claude. Get your key from{' '}
              <a
                href="https://console.anthropic.com/account/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600"
              >
                console.anthropic.com
              </a>
            </p>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Granola Integration */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your name
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Used to filter meeting todos to only those assigned to you.
              </p>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Kina"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Granola API Key
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Optional. Automatically creates todos from your meetings. Get your key from Granola → Settings → API.
            </p>
            <div className="relative">
              <input
                type={showGranolaKey ? 'text' : 'password'}
                value={granolaApiKey}
                onChange={(e) => setGranolaApiKey(e.target.value)}
                placeholder="grn_..."
                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowGranolaKey(!showGranolaKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGranolaKey ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            </div>
          </div>

          {/* Theme Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'classic', label: 'Classic', colors: ['#b8c8d8', '#f0f4f8', '#2563eb'] },
                { id: 'dark', label: 'Dark Tech', colors: ['#0e1117', '#161b22', '#58a6ff'] },
                { id: 'glass', label: 'Glassmorphism', colors: ['#1a1040', '#312070', '#a78bfa'] },
                { id: 'anime', label: 'Anime', colors: ['#fde8f0', '#ede8fb', '#7c3aed'] },
              ] as { id: AppTheme; label: string; colors: string[] }[]).map(({ id, label, colors }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left ${
                    theme === id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex gap-0.5 shrink-0">
                    {colors.map((c, i) => (
                      <div key={i} className="w-3 h-6 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-slate-700">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Celebration Settings */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Preferences
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={celebrationSound}
                onChange={(e) => setCelebrationSound(e.target.checked)}
                className="w-4 h-4 text-primary-500 border-slate-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-600">
                Enable celebration animation when completing todos
              </span>
            </label>
          </div>

          {/* About Section */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-2">About</h4>
            <p className="text-xs text-slate-500 mb-3">
              Smart Todo v{appVersion || '...'}
              <br />
              An intelligent todo app powered by Claude AI.
              <br />
              Your data is stored locally on your computer.
            </p>
            <div className="text-xs text-slate-400 bg-slate-50 rounded p-2 mb-3">
              <p className="font-medium text-slate-500 mb-1">How to update the app</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click <span className="text-slate-500 font-medium">Check for updates</span> below — if an update is available, download it</li>
                <li>Or go to GitHub releases and download the latest <code className="text-slate-500">.dmg</code> file</li>
                <li>Open the DMG, drag <span className="text-slate-500 font-medium">Smart Todo</span> into Applications (replace the existing one)</li>
                <li>Eject the DMG</li>
                <li>Open Terminal and run:<br />
                  <code className="text-slate-500 select-all">xattr -cr "/Applications/Smart Todo.app"</code>
                </li>
                <li>Open Smart Todo from Applications</li>
              </ol>
              <p className="mt-1.5 text-slate-400">Step 5 is required every time — macOS flags unsigned apps as damaged.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={isCheckingUpdate || updateInfo?.phase === 'downloading'}
                className="text-xs text-primary-600 hover:text-primary-700 disabled:text-slate-400"
              >
                {isCheckingUpdate ? 'Checking...' : 'Check for updates'}
              </button>
              {updateInfo?.phase === 'available' && (
                <button
                  type="button"
                  onClick={onDownloadUpdate}
                  className="text-xs text-green-600 hover:text-green-700"
                >
                  v{updateInfo.latestVersion} available — Download
                </button>
              )}
              {updateInfo?.phase === 'downloading' && (
                <span className="text-xs text-blue-600">
                  Downloading… {updateInfo.percent ?? 0}%
                </span>
              )}
              {updateInfo?.phase === 'downloaded' && (
                <button
                  type="button"
                  onClick={onInstallUpdate}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Restart to update
                </button>
              )}
              {updateInfo?.phase === 'error' && (
                <span className="text-xs text-red-500">Update failed</span>
              )}
              {updateInfo && !updateInfo.hasUpdate && updateInfo.phase !== 'error' && (
                <span className="text-xs text-slate-400">You're up to date!</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
