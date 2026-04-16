// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt([
  { ignores: ['**/generated/'] },
  {
    rules: {
      'vue/comma-dangle': 'off',
      'vue/no-v-html': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/operator-linebreak': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'nuxt/nuxt-config-keys-order': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/indent': 'off',
      '@stylistic/quotes': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/quote-props': 'off',
      '@stylistic/brace-style': 'off',
      '@stylistic/arrow-parens': 'off',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/indent-binary-ops': 'off',
      '@stylistic/eol-last': 'off',
      'no-loss-of-precision': 'off',
      '@stylistic/member-delimiter-style': [
        'error',
        {
          singleline: {
            delimiter: 'semi',
            requireLast: false
          },
          multiline: {
            delimiter: 'none',
            requireLast: false
          },
          multilineDetection: 'brackets'
        }
      ]
    }
  }
])
