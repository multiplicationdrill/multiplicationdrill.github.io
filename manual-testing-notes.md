# Manual Testing Checklist

Test in current Chrome, Edge, Firefox and Safari, desktop and mobile.

## Idle

- [ ] Shows "Press Start Quiz", timer "Ready", counters 0, grade buttons hidden, sliders enabled.
- [ ] Dark theme by default; 🌓 toggles light (animated gradient) and persists across reload.

## Quiz

- [ ] Start: button reads "Stop Quiz", status "Running", sliders disabled, grade buttons visible but disabled.
- [ ] Question phase shows `a × b`, green progress bar, `Question: N.Ns`.
- [ ] Answer phase shows `a × b = c`, orange progress bar, grade buttons enabled.
- [ ] Ungraded answers advance automatically.
- [ ] ✓ / ✗, `→`/`C`, `←`/`X` grade once, update the counter and advance immediately.
- [ ] Modifier-key combinations (e.g. `Ctrl+C`) do not grade.
- [ ] Stop returns to idle; restarting resets counters.

## Settings

- [ ] Question and answer time 1–30 s; labels and screen-reader value text update.
- [ ] Difficulty 1–4 shows Easy / Medium / Hard / Expert.
- [ ] Settings persist across reload.

## Spaced repetition

- [ ] No immediate repeats.
- [ ] A problem graded ✗ returns within about a minute; ✓ parks it longer.
- [ ] Progress survives reload; corrupting `mathQuizProgress` or `mathQuizSettings` in DevTools resets cleanly.

## Accessibility and layout

- [ ] Everything reachable by keyboard with a visible focus ring.
- [ ] Reduced-motion preference stops animations.
- [ ] No horizontal scroll at 375 px; grade buttons at least 44 px tall.
- [ ] No console errors.
