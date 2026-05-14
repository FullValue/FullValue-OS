import { z } from 'zod'

// Accept any string for project_slug — resolution to project IDs happens in useBulkImport
const projectSlugSchema = z.string().optional()

const ChecklistItemSchema = z.object({
  label: z.string().min(1),
  done: z.boolean().default(false),
})

export const TaskImportSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  project_slug: projectSlugSchema,
  client_id: z.string().optional(),
  impact: z.enum(['high', 'low']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  estimated_minutes: z.number().positive().optional(),
  ship_at_80: z.boolean().default(false),
  tags: z.array(z.string()).optional().default([]),
  is_priority_today: z.boolean().default(false),
  // TrelloCardsView premium fields
  card_color: z.string().optional(),
  card_image_url: z.string().url().optional(),
  inline_note: z.string().max(120).optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
})

export const NoteImportSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  project_slug: projectSlugSchema,
  client_id: z.string().optional(),
})

export const AppointmentImportSchema = z.object({
  title: z.string().min(1),
  // Accept HH:mm or HH:mm:ss
  starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  duration_minutes: z.number().positive().optional(),
  description: z.string().optional(),
  project_slug: projectSlugSchema,
  client_id: z.string().optional(),
  location: z.string().optional(),
})

export const ResourceImportSchema = z.object({
  name: z.string().min(1),
  // Accept 'link' as alias for 'lien'
  type: z.enum(['prompt', 'template', 'link', 'lien']),
  content: z.string().optional(),
  url: z.string().optional(),
  project_slug: projectSlugSchema,
  category: z.string().optional(),
  description: z.string().optional(),
})

export const InboxItemImportSchema = z.object({
  content: z.string().min(1),
})

export const CalendarEventImportSchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  event_type: z.enum(['meeting', 'focus', 'admin', 'personnel', 'client_meeting']).optional().default('meeting'),
  emoji: z.string().max(4).optional(),
  notes: z.string().optional(),
  image_url: z.string().url().optional(),
  project_slug: projectSlugSchema,
  client_id: z.string().optional(),
})

export const BulkImportSchema = z.object({
  project_slug: projectSlugSchema,
  tasks: z.array(TaskImportSchema).optional().default([]),
  notes: z.array(NoteImportSchema).optional().default([]),
  appointments: z.array(AppointmentImportSchema).optional().default([]),
  resources: z.array(ResourceImportSchema).optional().default([]),
  inbox_items: z.array(InboxItemImportSchema).optional().default([]),
  calendar_events: z.array(CalendarEventImportSchema).optional().default([]),
}).refine(
  (data) =>
    (data.tasks?.length ?? 0) +
    (data.notes?.length ?? 0) +
    (data.appointments?.length ?? 0) +
    (data.resources?.length ?? 0) +
    (data.inbox_items?.length ?? 0) +
    (data.calendar_events?.length ?? 0) > 0,
  { message: "Au moins une entité doit être présente dans l'import" }
)

export function formatZodError(err) {
  if (!err?.issues?.length) return 'Erreur de validation inconnue'
  const first = err.issues[0]
  const path = first.path.join(' → ')
  return path ? `${path} : ${first.message}` : first.message
}
