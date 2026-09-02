// Prefer tailwind.config.js (loaded by PostCSS). Keep this file aligned for tooling.
import type { Config } from 'tailwindcss'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const shared = require('./tailwind.config.js') as Config

export default shared
