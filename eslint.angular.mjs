import nx from '@nx/eslint-plugin';

const decoratorBan = (name, instead) => ({
  selector: `Decorator > CallExpression[callee.name='${name}']`,
  message: `@${name}() is forbidden. ${instead}`,
});

/**
 * Angular rules shared by every Angular project (apps/web, libs/ui): legacy API bans,
 * security bans (PROJECT.md 5.8) and template rules. Spread after the root config.
 *
 * @param {{ prefix: string }} options selector prefix of the project (`app`, `ui`)
 */
export default function angularConfig({ prefix }) {
  return [
    ...nx.configs['flat/angular'],
    ...nx.configs['flat/angular-template'],
    {
      files: ['**/*.ts'],
      rules: {
        '@angular-eslint/directive-selector': [
          'error',
          { type: 'attribute', prefix, style: 'camelCase' },
        ],
        '@angular-eslint/component-selector': [
          'error',
          { type: 'element', prefix, style: 'kebab-case' },
        ],
        '@angular-eslint/prefer-on-push-component-change-detection': 'error',
        '@angular-eslint/prefer-signals': 'error',
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'zone.js', message: 'The app is zoneless.' },
              {
                name: '@angular/animations',
                message: 'Use CSS with animate.enter / animate.leave.',
              },
              {
                name: '@angular/common',
                importNames: ['CommonModule'],
                message: 'Import only what you use; no CommonModule.',
              },
              {
                name: '@angular/forms',
                importNames: ['ReactiveFormsModule', 'FormsModule'],
                message: 'Use Signal Forms.',
              },
            ],
            patterns: [{ group: ['zone.js/*'], message: 'The app is zoneless.' }],
          },
        ],
        'no-restricted-syntax': [
          'error',
          decoratorBan('Injectable', 'Use @Service().'),
          decoratorBan('Input', 'Use input() / input.required().'),
          decoratorBan('Output', 'Use output().'),
          decoratorBan('HostBinding', 'Use the host: {} metadata.'),
          decoratorBan('HostListener', 'Use the host: {} metadata.'),
          {
            selector: 'Identifier[name=/^bypassSecurityTrust/]',
            message: 'DomSanitizer.bypassSecurityTrust* is forbidden (XSS).',
          },
          {
            selector: 'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]',
            message: 'Assigning innerHTML / outerHTML is forbidden (XSS). Use textContent.',
          },
          {
            selector: 'CallExpression[callee.property.name=/^(insertAdjacentHTML|write|writeln)$/]',
            message: 'insertAdjacentHTML / document.write are forbidden (XSS).',
          },
        ],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
      },
    },
    {
      files: ['**/*.html'],
      rules: {
        '@angular-eslint/template/prefer-control-flow': 'error',
        '@angular-eslint/template/prefer-self-closing-tags': 'error',
        'no-restricted-syntax': [
          'error',
          {
            selector: "BoundAttribute[name='innerHTML'], BoundAttribute[name='outerHTML']",
            message: 'innerHTML / outerHTML bindings are forbidden (XSS). Render text only.',
          },
        ],
      },
    },
  ];
}
