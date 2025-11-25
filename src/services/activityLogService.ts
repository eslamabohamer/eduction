import { supabase } from '@/lib/supabase';

export interface ActivityLog {
    id: string;
    user_id: string;
    action_type: string;
    entity_type: string;
    entity_id: string | null;
    details: any;
    created_at: string;
    tenant_id: string;
    user?: {
        name: string;
        role: string;
    };
}

import { ServiceResponse } from '@/types/service';

export const activityLogService = {
    async logAction(
        action_type: string,
        entity_type: string,
        entity_id: string | null,
        details: any = {}
    ): Promise<ServiceResponse<void>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: { message: 'User not authenticated' } };

            // Get tenant_id from user metadata or profile
            const { data: userProfile } = await supabase
                .from('users')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!userProfile) return { success: false, error: { message: 'User profile not found' } };

            const { error } = await supabase.from('activity_logs').insert({
                user_id: user.id,
                action_type,
                entity_type,
                entity_id,
                details,
                tenant_id: userProfile.tenant_id
            });

            if (error) {
                console.error('Error logging activity:', error);
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true };
        } catch (error: any) {
            console.error('Error logging activity:', error);
            // Don't throw, just log error so we don't block the main action
            return { success: false, error: { message: error.message } };
        }
    },

    async getLogs(filters?: { role?: string; limit?: number }): Promise<ServiceResponse<ActivityLog[]>> {
        try {
            let query = supabase
                .from('activity_logs')
                .select(`
            *,
            user:users!activity_logs_user_id_fkey (
              name,
              role
            )
          `)
                .order('created_at', { ascending: false });

            if (filters?.limit) {
                query = query.limit(filters.limit);
            } else {
                query = query.limit(100);
            }

            const { data, error } = await query;

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }

            // Client-side filtering for role if needed, or we can improve the query later
            let logs = data as ActivityLog[];
            if (filters?.role && logs) {
                logs = logs.filter((log: any) => log.user?.role === filters.role);
            }

            return { success: true, data: logs };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    }
};
