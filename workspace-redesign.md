# Workspace Visual Cleanup Plan

The workspace does not need fewer panels; it needs a consistent visual system. Right now the main issues are dozens of one-off font sizes—from **9.5px to 16px**—mixed font stacks, tiny click targets, and panel headers ranging from **26px to 36px**.

## 1. Establish a compact design system

Add shared tokens in `global.css` and gradually replace component-specific values:

- **Typography**
  - UI body: `13px / 1.5`, weight `400`
  - Secondary text: `12px`, weight `400`
  - Controls and tabs: `12px`, weight `500`
  - Panel titles: `12px`, weight `600`
  - Major headings: `16px`, weight `600`
  - Reserve `700` for exceptional emphasis only
- **Spacing:** use a 4px scale: `4, 8, 12, 16, 24`
- **Control heights:** `28px` compact, `32px` standard, `36px` primary
- **Radii:** `4px` controls, `6px` grouped controls, `8px` cards
- **Icons:** normally `14px`; `16px` for primary actions
- Add reusable tokens for panel headers, toolbar buttons, icon buttons, tabs, and keyboard keycaps.

Avoid values like `9.5px`, `10.5px`, `11.5px`, and scattered custom weights.

## 2. Make typography deterministic

The app currently imports Inter from Google Fonts, which can fail or load differently in an offline Electron environment.

- Bundle one UI font locally, or use a deliberate system stack.
- Use the UI font for labels, buttons, explanations, and navigation.
- Use `--font-mono` only for:
  - Editor content
  - Terminal commands and output
  - File paths
  - Inline code
- Remove direct `Inter`, `Consolas`, and `JetBrains Mono` declarations from individual components.
- Reduce uppercase labels and wide letter spacing; keep them only for compact section eyebrows or status labels.

## 3. Standardize panel chrome without removing panels

Keep all existing panels and their collapsed rails:

```text
┌──────────────────────── Unified 36px title bar ────────────────────────┐
├──────────┬─────────────────────┬────────────┬──────────────────────────┤
│ Guide /  │ Editor              │ Preview /  │ Explanation              │
│ Explorer │                     │ Console    │                          │
│ resizable│ flexible primary    │ resizable  │ resizable                │
├──────────┴─────────────────────┴────────────┴──────────────────────────┤
│ Resizable Terminal                                                  ▲ │
└────────────────────────────────────────────────────────────────────────┘
```

- Give every panel a consistent **36px header**.
- Use the same title size, icon size, divider color, and header padding.
- Keep collapsed rails at `32px`, but enlarge their clickable contents.
- Make resize handles visually discoverable on hover and keyboard-focusable.
- Preserve saved panel widths and collapse states.
- Give the editor remaining flexible space instead of allowing side panels to squeeze it below a usable width.
- On narrow windows, keep the current stacked layout rather than hiding functionality.

## 4. Simplify the title bar

The current 32px title bar contains mode navigation, panel toggles, branding, updates, settings, and profile controls.

- Raise it to **36–40px**.
- Keep mode navigation on the left and account/profile actions on the right.
- Reduce the centered brand's letter spacing so it does not compete with navigation.
- Give icon buttons a minimum `28×28px` hit area.
- Make active mode and active panel states obvious through background and contrast—not font weight alone.
- Collapse profile text before compressing navigation at narrower widths.

## 5. Normalize buttons and controls

Define three clear button styles:

1. **Primary:** Generate, Run, Continue
2. **Secondary:** Save, Editable, Retry
3. **Icon:** collapse, refresh, clear, settings

Rules:

- Minimum compact hit area: `28×28px`
- Main actions: at least `32px` high
- Consistent icon-to-label gap: `6px`
- Use weight `500` for normal controls and `600` for primary actions
- Give every interactive state a visible hover, active, disabled, and keyboard-focus style
- Replace tiny `2–4px` padded icon buttons, especially in the explorer and terminal
- Do not use stronger font weight as the only indication of selection

## 6. Apply consistent panel spacing

Use density based on purpose:

- Toolbars and tab strips: `8px` horizontal spacing
- Panel content: `16px`
- Dense lists such as files and lessons: `8px` vertical rows
- Explanatory reading content: `16–20px` between sections
- Cards: `12px` internal padding

Specific adjustments:

- Reduce the explanation sidebar's current `28px` gaps to a predictable `16–20px`.
- Increase cramped file explorer action targets while keeping rows compact.
- Align instruction, preview, explanation, and terminal headings to the same baseline.
- Give empty states a shared width, icon treatment, heading size, and body line-height.
- Keep long explanation text around `1.6` line-height rather than mixing `1.4–1.85`.

## 7. Clean up editor toolbar density

The editor toolbar currently mixes tabs, font controls, Run, Save, and edit state in one strip.

- Keep tabs left and actions right.
- Standardize all actions to one height.
- Present font scaling as one compact grouped control.
- Keep **Run** visually primary only when the active language is runnable.
- Render Save as an icon-only action when already saved; show text only for a dirty file if space permits.
- Move lower-priority actions into an overflow menu at narrow widths instead of shrinking text.
- Preserve horizontal scrolling for many open tabs.

## 8. Add a small, predictable keyboard model

Retain existing shortcuts and add only high-value ones:

| Action | Shortcut |
|---|---|
| Run active code | `Ctrl+Enter` |
| Toggle file explorer | `Ctrl+B` |
| Toggle terminal | `Ctrl+\`` |
| Save active file | `Ctrl+S` |
| Increase editor text | `Ctrl++` |
| Decrease editor text | `Ctrl+-` |
| Reset editor text | `Ctrl+0` |
| Clear focused terminal | `Ctrl+L` |
| Cycle through visible panels | `F6` |
| Close menu, modal, or drawer | `Esc` |

Discoverability:

- Show shortcuts as styled `<kbd>` labels in tooltips and menus.
- Add a compact "Keyboard shortcuts" section to Settings.
- Ensure shortcuts do not trigger while typing in unrelated inputs.
- Do not add shortcuts for every panel until there is a command palette or shortcut editor.

## 9. Improve hierarchy through color, not extra weight

- Use one primary text color, one secondary color, and one muted color consistently.
- Keep accent color for:
  - Primary action
  - Focus ring
  - Current selection
  - Meaningful status
- Avoid giving every card and label a different accent.
- Increase surface separation slightly in the green theme; several backgrounds are currently close enough to merge visually.
- Keep syntax colors and semantic success/error colors unchanged.

## 10. Implement in reviewable stages

1. **Foundation:** typography, spacing, control, and header tokens.
2. **Workspace shell:** title bar, panel headers, rails, and resize handles.
3. **Primary workflow:** instruction panel, editor tabs, toolbar, Run, and Save.
4. **Secondary panels:** explorer, preview/console, explanation, and terminal.
5. **Keyboard layer:** shortcuts, focus movement, and shortcut hints.
6. **Responsive pass:** test common widths without removing panels.
7. **Accessibility pass:** focus visibility, contrast, hit targets, and zoom.

## Acceptance criteria

- No normal workspace text below `11px`.
- No standard icon action smaller than `28×28px`.
- No more than five standard UI font sizes.
- Every panel remains available, resizable, and collapsible.
- Panel headers align and share one height.
- The editor remains usable when all panels are open.
- Existing shortcuts continue to work and new shortcuts are discoverable.
- The workspace remains functional at 100%, 125%, and 150% display scaling.
- Typecheck and build pass after each logical implementation stage.
