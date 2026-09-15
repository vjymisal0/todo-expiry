# todo-expiry

Fail CI when `TODO` or `FIXME` comments with due dates expire.

No dependencies. Works across common text/code files.

## Usage

```sh
npx todo-expiry
```

Check specific paths:

```sh
npx todo-expiry src README.md
```

## Supported comment formats

```js
// TODO[2026-01-31] remove fallback after migration
// FIXME due: 2026-01-31 handle retry edge case
// TODO expires 2026-01-31 delete temporary workaround
```

If the date is older than today, `todo-expiry` prints the file and line, then exits with code `1`.

## CI example

```json
{
  "scripts": {
    "check:todos": "todo-expiry"
  }
}
```

## Why

Normal TODO scanners list every TODO. This tool only cares about promises with dates, so teams can add temporary workarounds without letting them silently become permanent.

## License

MIT
