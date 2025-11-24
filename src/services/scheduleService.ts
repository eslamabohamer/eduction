import { supabase } from '@/lib/supabase';
import { ServiceResponse } from '@/types/service';

export interface LessonSchedule {
    id: string;
    grade: string;
    level: string;
    subject_name: string;
    day_of_week: number; // 0-6
    start_time: string; // HH:mm:ss
    end_time: string; // HH:mm:ss
    tenant_id: string;
}

export const scheduleService = {
    /**
     * Get schedules for a specific grade and level
     */
    async getSchedules(grade: string, level: string): Promise<ServiceResponse<LessonSchedule[]>> {
        try {
            const { data, error } = await supabase
                .from('lesson_schedules')
                .select('*')
                .eq('grade', grade)
                .eq('level', level)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true, data: data as LessonSchedule[] };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    },

    /**
     * Create a new schedule
     */
    async createSchedule(schedule: Omit<LessonSchedule, 'id' | 'tenant_id'>): Promise<ServiceResponse<LessonSchedule>> {
        try {
            const { data, error } = await supabase
                .from('lesson_schedules')
                .insert(schedule)
                .select()
                .single();

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true, data: data as LessonSchedule };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    },

    /**
     * Delete a schedule
     */
    async deleteSchedule(id: string): Promise<ServiceResponse<void>> {
        try {
            const { error } = await supabase
                .from('lesson_schedules')
                .delete()
                .eq('id', id);

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    }
};
