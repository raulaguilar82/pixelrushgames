import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  // 1) Reglas base de JavaScript
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
  },
  // 2) Modo CommonJS para archivos .js
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
  // 3) Variables globales para browser + Node
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  // 4) Prettier al final para formatear y desactivar reglas en conflicto
  eslintPluginPrettierRecommended,
]);
