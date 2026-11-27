import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run dev:phone`: testen op je telefoon via wifi. HTTPS is nodig omdat de telefoon
  // anders geen locatie en camera toestaat (alleen localhost mag dat zonder HTTPS).
  const phone = mode === 'phone';
  return {
    logLevel: 'error', // Suppress warnings, only show errors
    server: {
      host: true,
      port: phone ? 5180 : 5173,
    },
    plugins: [
      react(),
      ...(phone ? [basicSsl()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
