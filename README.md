# Relay Operations Console

Relay is a local-first demo of an agent-coordinated business workflow. It takes a business request, turns it into a visible task plan, and simulates handoffs between intake, research, CRM, outreach, and coordination agents.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Create a production build with `npm run build`.

## Demo workflow

- Enter a request in the workflow builder and select **Plan workflow** to create an inspectable task sequence.
- Select **Run workflow** to advance tasks and see each agent/tool handoff.
- The outbound email pauses at a human approval gate. Approving it allows the run to resume; rejecting it stops the workflow without sending.
- Enable **Test failure recovery** before running to simulate a CRM timeout. Retry the failed step, then resume execution.
- The integrations shown are simulated. No CRM, email, or third-party API calls are made, and no credentials are required.

## Implementation

The demo orchestration state lives in `src/App.tsx`; the interface uses React, TypeScript, Vite, Lucide icons, and plain CSS. The current task planner is a deterministic demo flow rather than a connected LLM agent runtime. Replace the simulated tool actions with authenticated server-side integrations before using it with real business data or sending external messages.