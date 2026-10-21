import {z} from 'zod';
export const idSchema=z.string().uuid();
const date=z.string().refine(v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v),'Invalid date');
export const recordSchema=z.object({
 type:z.enum(['task','project','asset','colour','template','note']),title:z.string().trim().min(1).max(150),
 body:z.string().max(20000).default(''),status:z.enum(['Backlog','In progress','Review','Done']).default('Backlog'),
 priority:z.enum(['Low','Normal','High','Urgent']).default('Normal'),due:date.default(''),
 projectId:z.union([idSchema,z.literal('')]).default(''),folder:z.string().trim().max(80).default('General'),
 tags:z.array(z.string().trim().min(1).max(30)).max(12).default([]),
 hex:z.string().regex(/^#[a-fA-F0-9]{6}$/).default('#BBA6FF'),
 favourite:z.boolean().default(false),archived:z.boolean().default(false),
 checklist:z.array(z.object({id:idSchema,text:z.string().trim().min(1).max(250),done:z.boolean()})).max(100).default([])
}).strict();
export function validateRecord(input){return recordSchema.parse(input)}

// Shared, editable workspace preferences (stored in MongoDB, not in a build).
export const preferencesSchema=z.object({
  workspaceName:z.string().trim().min(2).max(48),
  userName:z.string().trim().min(2).max(60),
  tagline:z.string().trim().min(2).max(100),
  accent:z.string().regex(/^#[a-fA-F0-9]{6}$/)
}).strict();
