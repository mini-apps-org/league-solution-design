# F36 — Fees with MoMo / ZaloPay

> [Feature specs](../README.md) › [E11 — Payments & Notifications](README.md) › **F36** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | R-014 (paid member) · [11 §7](../../11-security-and-roles.md) | Phase 1: `memberships.paid` flag set by an admin |

## Requirements

*As a player, I see what I owe and pay it from my phone with MoMo or ZaloPay. As an admin, I see who has paid without chasing cash.*

| ID | Requirement |
|---|---|
| FR-36.1 | Fee schedule per division: membership fee (per session) and weekly fee (per night played). Amounts in VND, integers |
| FR-36.2 | Charges are created by events: membership on roster add (`RosterChanged`), weekly on `TeamMatchFinalized` for each player who played (forfeiting teams still owe, F39b) |
| FR-36.3 | "My fees" lists open charges and history. **Pay** selects one or more charges, then the provider |
| FR-36.4 | Create order server-side with the provider's signed API (HMAC-SHA256 with the partner secret from Secret Manager); `orderId = <payment uuid>`; redirect to the provider deep link or QR |
| FR-36.5 | **Webhook (IPN/callback)** is the only source of truth: verify the signature, check the amount and order ID, update in one transaction, respond in the provider's format. Idempotent by `provider_order_id` |
| FR-36.6 | The browser return page only shows "Checking payment…" and polls our API; it never marks anything paid |
| FR-36.7 | A daily reconciliation job queries the provider for orders pending > 15 min |
| FR-36.8 | Admins can record a manual payment (cash or transfer) or waive a charge, with a reason (audited) |
| FR-36.9 | A membership is paid ⇔ it has no open membership charge. The put-up and roster rules keep using that |
| FR-36.10 | Refunds are manual in the provider portal and recorded by the admin in Phase 2 |

## Logic: webhook handling

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  W(["provider webhook"]):::start --> S{"signature valid?"}
  S -- no --> X1["400 · log security event"]:::bad
  S -- yes --> F{"payment found<br/>by orderId?"}
  F -- no --> X2["ack · alert"]:::warn
  F -- yes --> A{"amount matches?"}
  A -- no --> X3["ack · mark mismatch · alert"]:::bad
  A -- yes --> D{"already final?"}
  D -- yes --> ACK["ack · no-op"]:::ok
  D -- no --> R{"result code"}
  R -- success --> OK["payment succeeded<br/>charges paid · outbox"]:::ok
  R -- failure --> FL["payment failed<br/>charges stay open"]:::warn
  classDef fe fill:#E8F1FF,stroke:#1F6FEB,stroke-width:1.5px,color:#0B1F3A
  classDef api fill:#EAF7EF,stroke:#1E8E3E,stroke-width:1.5px,color:#0B2E16
  classDef db fill:#FFF6E5,stroke:#E0A100,stroke-width:1.5px,color:#3D2E00
  classDef ext fill:#F3EDFF,stroke:#7E57C2,stroke-width:1.5px,color:#25124A
  classDef gap fill:#FDECEC,stroke:#D93025,stroke-width:1.5px,color:#5C0B06
  classDef actor fill:#DCE9FF,stroke:#1F6FEB,stroke-width:2px,color:#0B1F3A,font-weight:bold
  classDef ok fill:#EAF7EF,stroke:#1E8E3E,color:#0B2E16
  classDef warn fill:#FFF6E5,stroke:#E0A100,color:#3D2E00
  classDef bad fill:#FDECEC,stroke:#D93025,color:#5C0B06
  classDef start fill:#E8F1FF,stroke:#1F6FEB,color:#0B1F3A
  classDef planned stroke-dasharray:5 4
```

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant P as 👤 Player
  participant FE as 📱 My fees
  participant API as ⚙️ league-be
  participant M as ☁️ MoMo
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  P->>FE: Pay 2 charges · MoMo
  FE->>API: POST /payments {chargeIds, provider}
  API->>DB: payment pending · amount = Σ charges
  API->>M: create order · signed
  M-->>API: payUrl · deeplink
  API-->>FE: redirect
  FE->>M: open MoMo app
  M->>API: IPN success · signed
  API->>DB: succeeded · charges paid · outbox PaymentSucceeded
  API-->>M: 204
  FE->>API: poll GET /payments/{id}
  API-->>FE: succeeded
  end
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-36.1 | Webhook arrives twice | The second is a no-op |
| EC-36.2 | Webhook arrives before the browser returns | Normal; the return page sees `succeeded` |
| EC-36.3 | Charge waived while a payment is pending | The payment still settles; the admin refunds manually; flagged |
| EC-36.4 | User closes MoMo without paying | Stays pending; reconciliation marks it failed or expired |

## Acceptance criteria

- **AC-36.1** Given a forged webhook, then nothing changes and a security log line exists.
- **AC-36.2** Given a successful MoMo sandbox payment, then the charges are paid and the player becomes put-up eligible.

## Open questions

- Which provider first, MoMo or ZaloPay? Are the fees per night or per session?

---

[E11 overview](README.md) · [F40 →](F40-notifications.md)
