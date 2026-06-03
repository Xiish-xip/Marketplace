## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for focused concepts, and `graphify affected "<symbol>"` before editing shared utilities, auth, API clients, Prisma access, routing, layout, or other high-fanout code. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

Context protocol:
- Treat Graphify as the first context filter. Start with a narrow query, then open only the files and symbols surfaced by the graph.
- Prefer `graphify explain "<symbol-or-file>"` over reading entire folders when investigating one service, component, hook, route, model, or helper.
- Prefer `graphify path "<A>" "<B>"` when connecting frontend behavior to backend routes, services, Prisma models, shared stores, or API clients.
- Prefer `graphify affected "<symbol>" --depth 2` or `--depth 3` before changing shared abstractions so downstream impact is visible before edits.
- Use `rg` only after Graphify has narrowed the search area, or when looking for exact text that Graphify cannot answer.
- Avoid loading broad files such as `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, whole feature folders, or generated/build output into the AI context unless a scoped Graphify command is insufficient.

Semantic enrichment:
- The default workflow is local AST-only Graphify: `graphify update .`. It requires no API key, external model, or local model download.
- Do not run `graphify extract . --backend ...`, `graphify label . --backend ...`, pull Ollama models, install local models, or send the project to an external LLM backend unless the user explicitly asks for semantic enrichment.
- If semantic enrichment is requested, first report the backend/model that will be used, whether code leaves the machine, and expected cost or local resource impact. Then proceed only with the user's confirmation.
