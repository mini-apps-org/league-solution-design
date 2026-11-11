# F51 — Sponsor placements

> [Feature specs](../README.md) › [E12 — Growth](README.md) › **F51** · Phase 3

| Phase | Status | Rules |
|---|---|---|
| 3 | 🎯 outline | — |

## Requirements

| ID | Requirement |
|---|---|
| FR-51.1 | Admins define placements: slot (standings header, night breakdown footer, tournament page), sponsor, image, link, start and end dates, target (league, division, venue) |
| FR-51.2 | Placements render only on public and read-only screens, never on the scoring or put-up screens |
| FR-51.3 | Impressions and clicks are counted server-side without personal data; monthly report per sponsor |
| FR-51.4 | Images are uploaded to Cloud Storage and served through the CDN; size and format limits |

## Key rules and assumptions

- No third-party ad scripts (privacy, performance, CSP).
- Counting uses a 1×1 beacon or a redirect endpoint `/s/{placementId}`.

## Diagram

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  ADM(["👤 Admin"]):::actor --> PL[("placements")]:::db
  V(["👤 Visitor"]):::actor --> PG["public page<br/>F35"]:::fe
  PG --> API["GET placements for slot"]:::api --> PL
  PG -. "impression beacon" .-> CT[("counters")]:::db
  PG -- "click /s/{id}" --> RD["redirect + count"]:::api --> SP["sponsor site"]:::ext
  RD --> CT
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

## Open questions

- Which sponsors and slots are in scope? Is revenue shared with venues?

---

[← F50](F50-multi-league.md) · [E12 overview](README.md) · [F52 →](F52-ten-ball-carom.md)
