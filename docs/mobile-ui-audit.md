# Mobile UI audit — premium refinement

**Date:** 2026-07-24  
**Device:** Samsung Galaxy S25 (gesture navigation)  
**Scope:** Visual/UX only — no shared backend mutations

| Screen / area                      | Current problem                      | Cause                                        | Desired solution                                         | Component(s)                                           | Test status                              |
| ---------------------------------- | ------------------------------------ | -------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| Customer / Partner / Admin tab bar | Broken square glyphs / missing icons | No `tabBarIcon`; empty icon slots            | MaterialCommunityIcons outline/filled + champagne active | `PremiumTabIcon`, role `_layout.tsx`                   | component tests added; device pending    |
| Tab bar safe area                  | Too close to gesture bar             | Default tab style, no inset padding          | `useSafeAreaInsets` + height padding                     | `premiumTabBar.ts`                                     | pending device                           |
| Customer dashboard greeting        | “Hallo Customer A”, oversized        | Seed name + `title` variant                  | Time-based greeting + first name; refined type           | `DashboardGreeting`                                    | component tests                          |
| Dashboard metrics                  | Sparse large cards                   | Inline `View` stats                          | Compact `MetricCard` grid with icons                     | `MetricCard`                                           | component tests                          |
| Project / quote / invoice rows     | Technical seed labels                | Seed fixtures + raw numbers                  | Customer-facing seed copy + commercial cards             | seed + `ProjectSummaryCard` / `CommercialDocumentCard` | component tests                          |
| Header                             | Plain “VDB Digital” text             | Tabs `headerTitle` only                      | Compact `AppHeader` with BrandMark                       | `AppHeader`                                            | pending device                           |
| Debugger banner                    | “Open debugger to view warnings”     | Likely empty tab icons + related RN warnings | Vector tab icons; no `ignoreAllLogs`                     | `PremiumTabIcon`                                       | S25: no banner on dashboard after reload |
| Metric titles                      | Truncated “Openstaande offerte…”     | Long NL labels in 2-col grid                 | Short card titles Offertes/Facturen                      | `customer.json`                                        | verified on S25                          |
| Nested “index” header              | Route name visible                   | Stack default title                          | `headerShown: false` + titles                            | projects/more `_layout`                                | pending recheck                          |
| Empty / loading                    | Large zeros / abrupt empty           | Minimal empty copy                           | Natural empty copy                                       | `EmptyState`                                           | component tests                          |
| Typography / color                 | Coarse hierarchy, little champagne   | Tokens underused                             | Refined tokens + type scale                              | `tokens.ts`, `Text`                                    | in progress                              |
| Quick actions                      | Missing                              | No dashboard actions row                     | Compact icon actions                                     | `QuickAction`                                          | component tests                          |

## Iconset

`@expo/vector-icons` / MaterialCommunityIcons (Expo SDK 57).

| Tab       | Inactive                         | Active                   |
| --------- | -------------------------------- | ------------------------ |
| Home      | `home-variant-outline`           | `home-variant`           |
| Projecten | `folder-outline`                 | `folder`                 |
| Berichten | `message-text-outline`           | `message-text`           |
| Meer      | `dots-horizontal-circle-outline` | `dots-horizontal-circle` |

Colors: bg `#080809`, border `#202023`, active `#C7A66A`, inactive `#7F7F84`.

## Explicitly not done in this pass

- Sibling repos / remote migrations / Git push / Play Store
- Changing financial RLS or payment rules
