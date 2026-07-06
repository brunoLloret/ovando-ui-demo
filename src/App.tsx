import { AppShell } from "./AppShell";

// The React client — the full tabbed shell. Compose is fully wired to the backend; the other tabs
// land slice by slice during the migration. Run `npm run ui` (backend) alongside `npm run web:dev`.
export function App() {
  return <AppShell />;
}
