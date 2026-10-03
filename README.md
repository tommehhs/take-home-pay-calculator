# Take-Home Pay Calculator

Compare your current job against a job offer by what each one actually pays **per hour of your life**, not just the headline salary.

Built for Australian tax (ATO FY 2025–26 framing). Covers:

- **Salary + salary sacrifice**: sacrifice (e.g. novated car lease) reduces taxable income; shows the real after-tax cost of the sacrifice
- **Tax breakdown**: income tax, LITO, Medicare levy (toggle), effective and marginal rates
- **Time commitment**: contracted hours, commute, WFH days, unpaid overtime
- **Job costs** (from *Your Money or Your Life*): transport, food & coffee, clothing/PPE, decompression spending
- **Results**: effective hourly rate (after tax and time) and true hourly rate (after job costs too)
- **Side-by-side table** and a **verdict** on which job pays more per hour
- Mobile-friendly layout (stacks to one column under 640px)

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

## Project layout

```
index.html        page shell
src/main.jsx      React entry point
src/App.jsx       the whole calculator (tax logic + UI)
```

## Known issues

- Tax brackets in `itax()` and `marginal()` are the **pre-Stage 3** rates (19% / 32.5% / 37% / 45%). FY 2025–26 uses 16% / 30% / 37% / 45% with thresholds at $45k, $135k and $190k, so results currently overstate tax.
- Super is shown at 11.5%; the guarantee rate is 12% from 1 July 2025.

Not financial advice.
