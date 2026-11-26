# Input
A text field with a visible label above it, an optional hint and an error below.

**Anatomy:** label (`label`, muted) · box (40px, `control` border, `radius-sm`) · hint or error (`meta`).
**States:** rest, hover, focus (border `focus` + 3px halo), error (border `danger` + message), disabled.

## Rules
- Every field has a visible label; placeholders only show a format ("https://…").
- Validate on blur; clear the error as soon as the value is valid.
- Errors say what to do: "Add an address that starts with http or https."
- Addresses use `mono` only inside the field when editing.

## In code
`ui-input`, `ui-textarea` (Signal Forms `[formField]`).

## Dense form variant
The New view dialog uses a dense form: 32px controls, 14px `secondary` text, 12px 500 row labels in a 96px column.