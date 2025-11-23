// src/services/liveSessionService.ts
// خدمة إدارة البث المباشر
// Service for managing live streaming sessions and attendance.

import { supabase } from '@/lib/supabase';

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
  async getSessions() {
    const { data, error } = await supabase
      .from('live_sessions')
      .select(`
        *,
        classroom:classrooms(name)
      `)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data as LiveSession[];
  },

  /**
   * Create a new live session
   */
  async createSession(data: Omit<LiveSession, 'id' | 'teacher_id' | 'status' | 'classroom'>) {
    const { data: result, error } = await supabase
      .from('live_sessions')
      .insert({
        ...data,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  /**
   * Record student attendance when joining
   */
  async joinSession(sessionId: string, studentId: string) {
    const { error } = await supabase
      .from('live_session_attendance')
      .insert({
        live_session_id: sessionId,
        student_id: studentId,
        join_time: new Date().toISOString()
      });

    // Ignore duplicate join (if student refreshes)
    if (error && error.code !== '23505') throw error;
  }
};
