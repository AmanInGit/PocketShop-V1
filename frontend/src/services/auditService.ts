import { supabase } from '@/lib/supabaseClient';

export type AuditActionType =
  | 'ORDER_CREATED'
  | 'STATUS_UPDATE'
  | 'PAYMENT_RECEIVED'
  | 'ORDER_UPDATED';

type Snapshot = Record<string, unknown> | null;

type LogAuditEntryInput = {
  entityTable: string;
  entityId: string;
  actionType: AuditActionType;
  stateBefore: Snapshot;
  stateAfter: Snapshot;
};

async function getActorId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? 'system';
  } catch {
    return 'system';
  }
}

export async function logAuditEntry(input: LogAuditEntryInput): Promise<void> {
  const actorId = await getActorId();
  try {
    const { error } = await supabase.from('audit_logs').insert({
      entity_table: input.entityTable,
      entity_id: input.entityId,
      action_type: input.actionType,
      actor_id: actorId,
      state_before: input.stateBefore,
      state_after: input.stateAfter,
    });

    if (error) {
      // Keep business operations non-blocking if audit table is unavailable.
      console.warn('Audit log write failed:', error.message);
    }
  } catch (error: any) {
    console.warn('Audit log write error:', error?.message ?? error);
  }
}

