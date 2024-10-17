# no-unwrapped-strings

Warns for unwrapped cyrillic strings.

## Rule Details

Autofix will add import of `i18n` module as well as wrap all the strings into proper function call.

Examples of **incorrect** code for this rule:

```js
'строка на русском';
```

Examples of **correct** code for this rule:

```js
import { i18n } from './SomeComponent.i18n'

i18n('строка на русском');
```
