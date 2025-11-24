import { supabase } from '@/lib/supabase';
import { ServiceResponse } from '@/types/service';
import { FinancialRecord } from '@/types';
import { activityLogService } from './activityLogService';

export interface FeeStructure {
    id: string;
    name: string;
    amount: number;
    grade: string;
    level: string;
    type: 'tuition' | 'bus' | 'books' | 'uniform' | 'activity' | 'other';
    tenant_id: string;
    classroom_id?: string;
}

export interface FinancialStats {
    total_revenue: number;
    total_pending: number;
    total_overdue: number;
    monthly_revenue: number;
}

export const financeService = {
    /**
     * Get Dashboard Statistics
     */
    async getStats(): Promise<ServiceResponse<FinancialStats>> {
        try {
            const { data, error } = await supabase.rpc('get_financial_stats');
            if (error) return { success: false, error: { message: error.message, code: error.code } };
            return { success: true, data: data[0] };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    },

    /**
     * Get Transactions with filters
     */
    async getTransactions(filters?: {
        type?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        studentId?: string;
    }): Promise<ServiceResponse<FinancialRecord[]>> {
        try {
            let query = supabase
                .from('financial_records')
                .select(`
          *,
          student:student_profiles(
            id,
            student_code,
            user:users(name)
          )
        `)
                .order('date', { ascending: false });

            if (filters?.type) query = query.eq('type', filters.type);
            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.startDate) query = query.gte('date', filters.startDate);
            if (filters?.endDate) query = query.lte('date', filters.endDate);
            if (filters?.studentId) query = query.eq('student_id', filters.studentId);

            const { data, error } = await query;

            if (error) return { success: false, error: { message: error.message, code: error.code } };
            return { success: true, data: data as any[] };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    },

    /**
     * Create a new transaction (Invoice or Payment)
     */
    async createTransaction(data: Partial<FinancialRecord> & { student_id: string; amount: number; type: string }): Promise<ServiceResponse<FinancialRecord>> {
        try {
            // Generate Invoice Number if payment
            let invoice_number = data.invoice_number;
            if (data.type === 'payment' && !invoice_number) {
                invoice_number = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            }

            const { data: result, error } = await supabase
                .from('financial_records')
                .insert({ ...data, invoice_number })
                .select()
                .single();

            if (error) return { success: false, error: { message: error.message, code: error.code } };

            // Log Activity
            await activityLogService.logAction('record_payment', 'financial_record', result.id, {
                amount: data.amount,
                type: data.type,
                student_id: data.student_id
            });

            return { success: true, data: result as FinancialRecord };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    },

    /**
     * Fee Structure Management
     */
    async getFeeStructures(): Promise<ServiceResponse<FeeStructure[]>> {
        try {
            const { data, error } = await supabase
                .from('fee_structures')
                .select(`
                    *,
                    classroom:classrooms(name)
                `)
                .order('created_at', { ascending: false });

            if (error) return { success: false, error: { message: error.message, code: error.code } };
            return { success: true, data: data as FeeStructure[] };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    },

    async createFeeStructure(data: Omit<FeeStructure, 'id' | 'tenant_id'>): Promise<ServiceResponse<FeeStructure>> {
        try {
            const { data: result, error } = await supabase
                .from('fee_structures')
                .insert(data)
                .select()
                .single();

            if (error) return { success: false, error: { message: error.message, code: error.code } };

            // Log Activity
            await activityLogService.logAction('create_fee', 'fee_structure', result.id, {
                name: data.name,
                amount: data.amount
            });

            return { success: true, data: result as FeeStructure };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    },

    async deleteFeeStructure(id: string): Promise<ServiceResponse<void>> {
        try {
            const { error } = await supabase.from('fee_structures').delete().eq('id', id);
            if (error) return { success: false, error: { message: error.message, code: error.code } };
            return { success: true };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    },

    async assignFeeToStudents(feeStructureId: string, classroomId?: string, grade?: string, level?: string): Promise<ServiceResponse<number>> {
        try {
            const { data, error } = await supabase.rpc('assign_fee_to_students', {
                p_fee_structure_id: feeStructureId,
                p_classroom_id: classroomId || null,
                p_grade: grade || null,
                p_level: level || null
            });

            if (error) return { success: false, error: { message: error.message, code: error.code } };

            // Log Activity
            await activityLogService.logAction('assign_fee', 'fee_structure', feeStructureId, {
                classroomId,
                grade,
                level,
                affected_students: data
            });

            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
        }
    }
};
