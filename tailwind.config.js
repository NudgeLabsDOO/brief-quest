/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        must: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          border: '#fca5a5',
        },
        should: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          border: '#fcd34d',
        },
        could: {
          DEFAULT: '#3b82f6',
          light: '#dbeafe',
          border: '#93c5fd',
        },
        remove: {
          DEFAULT: '#6b7280',
          light: '#f3f4f6',
          border: '#d1d5db',
        },
      },
    },
  },
  plugins: [],
}

