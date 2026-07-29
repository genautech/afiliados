import { z } from 'zod';

export const knownOperations = [
  'SETUP_EXPERIMENT',
  'SCHEDULE_EXPERIMENT',
  'PROMOTE_EXPERIMENT',
  'GRADUATE_EXPERIMENT',
  'END_EXPERIMENT'
] as const;

export const MutationAuthorizationSchema = z.object({
  confirmed: z.literal(true),
  operation: z.enum(knownOperations),
  resourceId: z.string().min(1),
  revision: z.string().min(1),
  idempotencyKey: z.string().min(10).max(100),
});

export type MutationAuthorization = z.infer<typeof MutationAuthorizationSchema>;

export type AuthorizationContext = {
  operation: typeof knownOperations[number];
  resourceId: string;
  revision: string;
  idempotencyKey: string;
};

export function authorizeMutation(
  payload: unknown,
  expectedOperation: typeof knownOperations[number],
  currentResourceId: string,
  currentRevision: string
): AuthorizationContext {
  const result = MutationAuthorizationSchema.safeParse(payload);
  
  if (!result.success) {
    throw new Error('Falha de autorização: payload inválido, ausente ou não confirmado.');
  }

  const { confirmed, operation, resourceId, revision, idempotencyKey } = result.data;

  if (operation !== expectedOperation) {
    throw new Error(`Falha de autorização: operação divergente (esperado ${expectedOperation}, recebido ${operation}).`);
  }
  
  if (resourceId !== currentResourceId) {
    throw new Error('Falha de autorização: ID do recurso divergente.');
  }
  
  if (revision !== currentRevision) {
    throw new Error('Falha de autorização: revisão do recurso divergente. O recurso pode ter sido modificado por outro processo.');
  }

  return {
    operation,
    resourceId,
    revision,
    idempotencyKey,
  };
}
