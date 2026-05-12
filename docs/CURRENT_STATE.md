# Le Cockpit — État actuel des données (avant migration Supabase)

Généré le 2026-05-11. Référence pour la Phase 3A.

## Architecture actuelle

**Stack** : Vite + React 19 + JSX (pas Next.js)  
**Persistence** : `localStorage` via une seule clé `cockpit_state` (JSON sérialisé)  
**State management** : `useReducer` + Context (`src/store/useStore.jsx`)  
**Preferences locales** (resteront en localStorage, ne migrent PAS) :
- `cockpit_theme` — `'light'` | `'dark'`
- `cockpit:dashboard:layout:journee` — ordre des widgets drag & drop
- `cockpit:view:{contextId}` — vue active par contexte (kanban/list/etc.)

---

## Schéma de `cockpit_state`

```
{
  _version: 3,
  energy: number (1-5),
  settings: { endOfWorkday: "HH:MM" },
  projects: Project[],
  tasks: Task[],
  sessions: Session[],
  resources: Resource[],
  learningResources: LearningResource[],
  calendarEvents: CalendarEvent[],
  inbox: InboxItem[],
  clients: Client[],
  clientNotes: ClientNote[],
  clientDocuments: ClientDocument[],
  clientInvoices: ClientInvoice[],
  appointments: Appointment[],
}
```

---

## Types de données détaillés

### Project
```js
{
  id: string,              // 'p1' | 'p2' | 'p3' | 'p4' (slugs fixes)
  name: string,
  tier: number,            // 1 | 2 | 3 | 4
  color: string,           // hex '#A8E6BD'
  emoji: string,
  northStar: string,
  northStarProgress: number, // 0–100
  notes?: Note[],          // notes rattachées au projet (inline dans le projet)
}
```

### Task
```js
{
  id: string,              // nanoid 8 chars
  title: string,
  projectId: string,       // refs Project.id
  clientId?: string,       // refs Client.id (optionnel)
  status: 'todo' | 'inprogress' | 'done',   // ⚠ 'inprogress' sans underscore
  impact: 'high' | 'low',
  ship80: boolean,         // flag "livrer à 80%"
  ship80Delivered: boolean,
  today: boolean,          // épinglé en priorité du jour
  dueDate: string | null,  // 'YYYY-MM-DD'
  startDate: string | null,
  notes: string,           // description / notes
  tags: string[],
  orderIndex: number,
  coverUrl: string | null,
  createdAt: string,       // ISO 8601
  completedAt: string | null,
}
```

### Session
```js
{
  id: string,
  projectId: string,
  taskId: string | null,
  duration: number,        // secondes ⚠ (colonne SQL sera duration_seconds)
  note: string,            // ⚠ (colonne SQL sera log_message)
  date: string,            // ISO 8601 (sera started_at en SQL)
}
```

### Resource (Hub Ressources)
```js
{
  id: string,
  type: 'prompt' | 'template' | 'link',
  title: string,           // ⚠ (colonne SQL sera name)
  projectId: string | null,
  tag: string,             // ⚠ (sera category en SQL, pas de champ tag séparé)
  category: string,
  description: string,
  content: string,         // texte intégral pour prompt/template
  url: string,
}
```

### LearningResource (Formation)
```js
{
  id: string,
  type: 'livre' | 'video' | 'article' | 'podcast' | 'framework',
                           // ⚠ 'livre' → 'book' en SQL
  title: string,
  author: string,
  category: string,
  status: 'done' | 'en_cours' | 'à_voir',
                           // ⚠ mapping SQL: done→done, en_cours→in_progress, à_voir→to_watch
  url: string,
  notes: string,
  takeaways: string[],     // JSONB en SQL
  citations: string[],     // JSONB en SQL
}
```

### InboxItem
```js
{
  id: string,
  text: string,            // ⚠ (colonne SQL sera content)
  type: 'task' | 'idea' | 'note',
  createdAt: string,       // ⚠ (sera captured_at en SQL)
}
```

### Client
```js
{
  id: string,
  name: string,
  shortName: string,       // ⚠ short_name en SQL
  city: string,
  activityType: string,    // ⚠ activity_type en SQL
  status: 'prospect' | 'onboarding' | 'active' | 'paused' | 'completed' | 'archived',
  startDate: string,       // ⚠ start_date en SQL, format 'YYYY-MM-DD'
  accentColor: string,     // ⚠ accent_color en SQL
  createdAt: string,
  projectId?: string,      // Ulycom = 'p1' par défaut
}
```

### ClientNote
```js
{
  id: string,
  clientId: string,        // ⚠ client_id en SQL
  title: string,
  content: string,
  createdAt: string,
  updatedAt: string,
}
```

### ClientDocument
```js
{
  id: string,
  clientId: string,
  name: string,
  type: string,
  description: string,
  url: string,
  createdAt: string,
}
```

### ClientInvoice
```js
{
  id: string,
  clientId: string,
  invoiceNumber: string,   // ⚠ invoice_number en SQL
  date: string,
  amountHT: number,        // ⚠ amount_ht en SQL
  vatRate: number,         // ⚠ vat_rate en SQL
  amountTTC: number,       // ⚠ amount_ttc en SQL
  description: string,
  status: 'to_emit' | 'sent' | 'paid' | 'overdue',
  paidAt: string | null,   // ⚠ paid_at en SQL
}
```

### Appointment
```js
{
  id: string,
  clientId: string,
  projectId: string | null,
  title: string,
  description: string,
  date: string,            // 'YYYY-MM-DD' → sera starts_at en SQL (datetime)
  time?: string,           // 'HH:MM'
  duration: number,        // minutes → duration_minutes en SQL
  location: string,
  createdAt: string,
}
```

### CalendarEvent
```js
{
  id: string,
  title: string,
  date: string,            // 'YYYY-MM-DD'
  startTime?: string,
  endTime?: string,
  color?: string,
  projectId?: string,
}
```

---

## Mappings critiques localStorage → SQL

| Champ localStorage | Colonne SQL | Transformation |
|---|---|---|
| `task.status = 'inprogress'` | `status = 'inprogress'` | ⚠ CHECK doit inclure 'inprogress' |
| `session.duration` (s) | `duration_seconds` | rename |
| `session.note` | `log_message` | rename |
| `session.date` (ISO) | `started_at` | rename (ended_at = started_at + duration_seconds) |
| `resource.title` | `name` | rename |
| `resource.tag` | `category` | merge avec category |
| `learningResource.type = 'livre'` | `type = 'book'` | rename |
| `learningResource.status = 'en_cours'` | `status = 'in_progress'` | rename |
| `learningResource.status = 'à_voir'` | `status = 'to_watch'` | rename |
| `inboxItem.text` | `content` | rename |
| `inboxItem.createdAt` | `captured_at` | rename |
| `project.id = 'p1'` | `slug = 'p1'` | id legacy → slug |
| `project.tier: number` | `tier: text 'T1'...'T4'` | `T${tier}` |
| `project.color` | `accent_color` | rename |
| `client.shortName` | `short_name` | rename |
| `client.activityType` | `activity_type` | rename |
| `client.accentColor` | `accent_color` | rename |
| `task.ship80` | `ship_at_80` | rename |
| `task.today` | `is_priority_today` | rename |
| `task.notes` | `description` | rename |
