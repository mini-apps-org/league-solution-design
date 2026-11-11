# F3 — CSRF protection

> [Feature specs](../README.md) › [E01 — Identity & Access](README.md) › **F3** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🏗 | ADR-003 | `league-be/internal/platform/middleware/csrf.go` · `league-fe/src/lib/csrf.ts`, `src/api/axios.ts` |

## Requirements

| ID | Requirement |
|---|---|
| FR-3.1 | Double-submit: every non-GET/HEAD/OPTIONS/TRACE request under `/api/v1` must send header `X-CSRF-Token` equal to the `csrf` cookie (constant-time compare) |
| FR-3.2 | A missing cookie returns `40301`; a mismatch returns `40302` |
| FR-3.3 | The FE reads `__Secure-csrf` first and falls back to `csrf` |
| FR-3.4 | GETs carry no custom headers, so they stay CORS-simple (no preflight) |

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant FE as 📱 axios interceptor
  participant MW as ⚙️ csrf.go
  participant H as ⚙️ handler
  rect rgb(247,249,252)
  FE->>FE: method is unsafe → read cookie __Secure-csrf or csrf
  FE->>MW: POST with Cookie csrf=T and header X-CSRF-Token: T
  alt cookie missing
    rect rgb(253,236,236)
    MW-->>FE: 403 · 40301
    end
  else header differs
    rect rgb(253,236,236)
    MW-->>FE: 403 · 40302
    end
  else equal
    rect rgb(234,247,239)
    MW->>H: next
    H-->>FE: 2xx
    end
  end
  end
```

## Acceptance criteria
- **AC-3.1** A POST with no `X-CSRF-Token` returns 403 `40302`, or `40301` if the cookie is absent.
- **AC-3.2** In a browser, `GET /api/v1/me` from `www.` shows no preflight in the Network tab.

## Implementation gaps
- The FE `CLAUDE.md` and README name the cookie `__Host-csrf`, but the code (correctly) uses `__Secure-csrf`. Fix the docs ([Q35](../../14-open-questions.md)).

---

[← F2](F02-sessions-logout.md) · [E01 overview](README.md) · [F4 →](F04-me-role-player.md)
