# PowerBill Manual Responsive Checklist

Use this checklist once on a **real phone** and once on a **laptop**, then repeat the marked viewport checks in browser DevTools. Record Pass/Fail and a short note for the project report.

## Viewports

- [ ] 360 × 800 — small phone
- [ ] 390 × 844 — primary phone target
- [ ] 768 × 1024 — tablet
- [ ] 1024 × 768 — small laptop/tablet landscape
- [ ] 1280 × 800 — laptop
- [ ] 1440 × 900 — desktop

## Navigation

- [ ] Public navbar never causes horizontal page scrolling.
- [ ] Public mobile navigation remains reachable with one hand.
- [ ] Authenticated phone layouts show the bottom navigation above the safe-area inset.
- [ ] Desktop authenticated layouts show the role-appropriate sidebar.
- [ ] Customer cannot navigate to staff/admin functionality through the UI.
- [ ] Keyboard focus is always visible and follows a logical order.
- [ ] Every actionable control has a comfortable ~44px touch target.

## Forms

- [ ] Login and registration are single-column on phones.
- [ ] Every input has a visible label.
- [ ] Password requirements update live during registration.
- [ ] Meter-reading field opens a numeric/decimal keyboard on a real phone.
- [ ] Validation messages remain beside the relevant fields and do not shift content off-screen.
- [ ] Primary submit buttons are full width where useful on phones.
- [ ] Loading/disabled states prevent double submission.

## Bills and data tables

- [ ] My Bills uses stacked bill cards on phone widths.
- [ ] Desktop/tablet tables stay within the content container.
- [ ] Status filters and month filters wrap rather than overflow.
- [ ] Long meter IDs, payment references and email addresses wrap or truncate safely.
- [ ] Money and meter readings use tabular/monospaced numerals consistently.

## Dashboard and charts

- [ ] Dashboard stat tiles reflow cleanly at all target widths.
- [ ] Six-month usage chart remains readable on phone and does not cause page-level horizontal scrolling.
- [ ] Outstanding balance, unpaid count and recent bills are readable without zooming.

## Receipt / printing

- [ ] Receipt fits a 390px phone without page-level horizontal scrolling.
- [ ] PAID seal, reference number and itemised values remain legible.
- [ ] Print preview hides navigation and app chrome.
- [ ] Printed receipt uses a clean white background and does not clip content.

## Errors and edge states

- [ ] 403, 404, 429, 500 and Session Expired pages fit every target width.
- [ ] Empty, loading and error states preserve page structure.
- [ ] Reduced-motion OS setting disables marquee/count-up motion appropriately.

## Physical-device evidence for the report

Record:

| Device / Browser | Width | Navigation | Forms | Tables/Cards | Receipt/Print | Horizontal Scroll | Result |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Real phone |  |  |  |  |  |  |  |
| Laptop |  |  |  |  |  |  |  |
| DevTools phone | 390 |  |  |  |  |  |  |
| DevTools tablet | 768 |  |  |  |  |  |  |
| DevTools desktop | 1440 |  |  |  |  |  |  |
