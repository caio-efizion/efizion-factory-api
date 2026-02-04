import { z } from 'zod';

// Schema para criação de task
export const createTaskSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z.string()
    .max(5000, 'Description must not exceed 5000 characters')
    .optional()
    .or(z.literal('')),  // Aceita string vazia
});

// Schema para parâmetros de rota com ID
export const taskIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number'),
});

// Schema para atualização de task (campos opcionais)
export const updateTaskSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .optional(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters')
    .optional(),
  status: z.enum(['pending', 'running', 'done', 'error']).optional(),
});

// Tipos inferidos dos schemas
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
