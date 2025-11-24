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

export const activityLogService = {
    async logAction(
        action_type: string,
        entity_type: string,
        entity_id: string | null,
        details: any = {}
    ) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get tenant_id from user metadata or profile
            const { data: userProfile } = await supabase
                .from('users')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!userProfile) return;

            await supabase.from('activity_logs').insert({
                user_id: user.id,
                action_type,
                entity_type,
                entity_id,
                details,
                tenant_id: userProfile.tenant_id
            });
        } catch (error) {
            console.error('Error logging activity:', error);
            // Don't throw, just log error so we don't block the main action
        }
    },

    async getLogs(filters?: { role?: string; limit?: number }) {
        let query = supabase
            .from('activity_logs')
            .select(`
        *,
        user:users (
          name,
          role
        )
      `)
            .order('created_at', { ascending: false });

        if (filters?.role) {
            // This requires filtering on the joined table which Supabase supports
            // but sometimes needs specific syntax.
            // Alternatively, we can filter in memory or use !inner join if supported by the client lib easily.
            // For now, let's fetch and filter or rely on the UI to filter.
            // Actually, let's try to filter by the user role if possible.
            // Supabase: .eq('user.role', filters.role) might not work directly without !inner
            // Let's just fetch all and filter in UI or use a more complex query if needed.
            // But wait, we want to monitor Secretaries.
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        } else {
            query = query.limit(100);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Client-side filtering for role if needed, or we can improve the query later
        if (filters?.role && data) {
            return data.filter((log: any) => log.user?.role === filters.role);
        }

        return data as ActivityLog[];
    }
};
