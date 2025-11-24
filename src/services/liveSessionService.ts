// src/services/liveSessionService.ts
// خدمة إدارة البث المباشر
// Service for managing live streaming sessions and attendance.

import { supabase } from '@/lib/supabase';
import { ServiceResponse } from '@/types/service';

export interface LiveSession {
  id: string;
  title: string;
  description?: string;
  classroom_id: string;
  teacher_id: string;
  start_time: string;
  end_time: string;
  stream_url: string;
  status: 'scheduled' | 'live' | 'ended';
  classroom?: {
    name: string;
  };
}

export const liveSessionService = {
  /**
   * Get all sessions for the current tenant
   */
  async getSessions(): Promise<ServiceResponse<LiveSession[]>> {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          classroom:classrooms(name)
        `)
        .order('start_time', { ascending: true });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as LiveSession[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Create a new live session
   */
  async createSession(data: Omit<LiveSession, 'id' | 'teacher_id' | 'status' | 'classroom'>): Promise<ServiceResponse<LiveSession>> {
    try {
      const { data: result, error } = await supabase
        .from('live_sessions')
        .insert({
          ...data,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async updateSession(id: string, data: Partial<LiveSession>): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('live_sessions')
        .update(data)
        .eq('id', id);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async deleteSession(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Record student attendance when joining
   */
  async joinSession(sessionId: string, studentId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('live_session_attendance')
        .insert({
          live_session_id: sessionId,
          student_id: studentId,
          join_time: new Date().toISOString()
        });

      // Ignore duplicate join (if student refreshes)
      if (error && error.code !== '23505') {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  }
};
