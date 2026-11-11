# E11 — Payments & Notifications

> [Feature specs](../README.md) › **E11**

| | |
|---|---|
| **Goal** | Collect membership and weekly fees through the wallets Vietnamese players already use, and reach players where they already are (Zalo) |
| **Phase** | 2 |
| **Status** | 🎯 Not started. Phase 1 has only a manual `paid` flag on membership, set by an admin, which gates put-up and roster adds |
| **Actors** | Player, Captain, Admin, MoMo / ZaloPay, Zalo Official Account |
| **Related** | [04 §3](../../04-domain-rules.md) · [11 security](../../11-security-and-roles.md) · [E06-F42 worker](../E06-platform-delivery/F42-worker-outbox-redis.md) |

## Features by phase

### Phase 1

A manual paid flag. An admin marks a membership paid after cash or bank transfer, and unpaid players can't be put up.

### Phase 2

| # | Feature | Status |
|---|---|---|
| F36 | [Fees with MoMo / ZaloPay](F36-fees-payments.md) | 🎯 |
| F40 | [Notifications](F40-notifications.md) | 🎯 |

## Phase 2 deep dive

### Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  PL(["👤 Player"]):::actor
  ADM(["👤 Admin"]):::actor
  subgraph FE["📱 league-fe"]
    direction TB
    FEE["<b>My fees</b><br/>balance · Pay"]:::fe
    AF["<b>Admin › Fees</b><br/>ledger · manual payment"]:::fe
    NS["<b>Settings › Notifications</b>"]:::fe
  end
  subgraph BE["⚙️ league-be"]
    direction TB
    PAY["<b>payments</b><br/>create order · webhook"]:::api
    LED["<b>fee ledger</b><br/>charges · payments"]:::api
    WRK["<b>worker</b><br/>outbox handlers"]:::api
    NOT["<b>notifier</b><br/>templates · preferences"]:::api
  end
  subgraph EXT["☁️ Providers"]
    direction TB
    MOMO["MoMo"]:::ext
    ZP["ZaloPay"]:::ext
    ZOA["Zalo OA · ZNS"]:::ext
  end
  DB[("🗄️ fee_charges · payments · notifications · outbox")]:::db
  PL ==> FEE ==> PAY == "create order" ==> MOMO
  PAY --> ZP
  MOMO -- "IPN webhook" --> PAY
  ZP -- "callback" --> PAY
  PAY --> LED --> DB
  ADM --> AF --> LED
  DB -. "outbox" .-> WRK --> NOT --> ZOA
  NS --> NOT
  class FEE,AF,NS,PAY,LED,WRK,NOT,MOMO,ZP,ZOA planned
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

### Money and message path for one night

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant W as ⚙️ worker
  participant DB as 🗄️ Postgres
  participant Z as ☁️ Zalo OA
  participant P as 👤 Player
  participant M as ☁️ MoMo
  participant API as ⚙️ league-be
  rect rgb(247,249,252)
  W->>DB: TeamMatchFinalized → weekly fee charge per player who played
  W->>Z: "Result 9–5 · weekly fee 50,000₫ due"
  Z-->>P: Zalo message with Pay link
  P->>API: Pay with MoMo
  API->>M: create order (signed)
  M-->>P: MoMo app confirms
  M->>API: IPN signed · success
  API->>DB: payment succeeded · charge settled · outbox PaymentSucceeded
  W->>Z: receipt
  end
```

### Data delta

| Object | Purpose |
|---|---|
| `fee_schedules (division_id, kind membership|weekly, amount_vnd, due_rule)` | Fee configuration |
| `fee_charges (id, player_id, team_match_id NULL, kind, amount_vnd, status open|paid|waived, due_at)` | What's owed |
| `payments (id, provider, provider_order_id UNIQUE, amount_vnd, status, raw jsonb, charge_ids uuid[])` | What's paid; the webhook is idempotent on `provider_order_id` |
| `memberships.paid` | Becomes derived: paid ⇔ no open membership charge |
| `notification_prefs (user_id, channel, kind, enabled)`, `notifications (id, user_id, kind, channel, payload, status, sent_at)` | F40 |
