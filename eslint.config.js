/// <reference types="eslint" />
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src-tauri/target', 'npm-packages'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 检测未使用的变量和导入（放宽为 warn）
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // 允许 any 类型（保守策略，避免破坏性更改）
      '@typescript-eslint/no-explicit-any': 'off',
      // 放宽 React Hooks 依赖检查
      'react-hooks/exhaustive-deps': 'warn',
      // 允许 case 块中的词法声明
      'no-case-declarations': 'off',
    },
  }
)
