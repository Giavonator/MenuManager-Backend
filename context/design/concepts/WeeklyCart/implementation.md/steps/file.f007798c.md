---
timestamp: 'Fri Oct 24 2025 08:47:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_084711.826089dc.md]]'
content_id: f007798cee8dbad948a72301632eac639c7079e1d9b6a228f87cdefb15cfe116
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}
```
