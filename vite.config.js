import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    plugins: [
        preact(),
        viteSingleFile() // Inline all assets into a single HTML file
    ],
    root: './demo',
    base: './', // Use relative paths for assets
    build: {
        outDir: '../dist-demo',
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'demo/index.html'),
        },
        // Ensure assets are inlined for standalone use
        assetsInlineLimit: 1000000000, // Inline all assets
    },
    resolve: {
        alias: {
            // Ensure proper resolution of local modules
        }
    }
});

