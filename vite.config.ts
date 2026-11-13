import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Пак остаётся локальным, как в Agent Pulse; в git клипы не включаются.
const palsDirectory =
  process.env.AGENT_PALS_DIR ??
  join(homedir(), 'Library/Application Support/AgentPulse/Skins/AgentPals');
const mascotModule = 'virtual:agent-pals';

/** UI собирается в один самодостаточный HTML — Figma iframe не грузит внешние ассеты. */
export default defineConfig({
  root: 'src/ui',
  plugins: [
    {
      name: 'local-agent-pals',
      resolveId(id) {
        if (id === mascotModule) return '\0' + mascotModule;
      },
      load(id) {
        if (id !== '\0' + mascotModule) return;
        const clips = ['Idle', 'Thinking'].map((clip) => {
          const path = join(palsDirectory, 'Cat', `${clip}.json`);
          if (!existsSync(path)) return null;
          return gzipSync(readFileSync(path)).toString('base64');
        });
        return `export default ${JSON.stringify(clips)};`;
      },
    },
    react(),
    viteSingleFile(),
  ],
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
    target: 'es2017',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    reportCompressedSize: false,
  },
});
