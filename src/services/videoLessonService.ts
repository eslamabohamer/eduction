// src/services/videoLessonService.ts
// خدمة إدارة الدروس المسجلة
// Service for managing video lessons and tracking views.

import { supabase } from '@/lib/supabase';
import { ServiceResponse } from '@/types/service';

export interface VideoLesson {
  id: string;
  title: string;
  description?: string;
  classroom_id: string;
  video_url: string;
  provider_type: 'youtube' | 'vimeo' | 'custom';
  created_at: string;
  classroom?: {
    name: string;
  };
}

export const videoLessonService = {
  async getVideos(): Promise<ServiceResponse<VideoLesson[]>> {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select(`
          *,
          classroom:classrooms(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as VideoLesson[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async createVideo(data: Omit<VideoLesson, 'id' | 'created_at' | 'classroom'>): Promise<ServiceResponse<VideoLesson>> {
    try {
      const { data: result, error } = await supabase
        .from('video_lessons')
        .insert(data)
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

  async updateVideo(id: string, data: Partial<VideoLesson>): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('video_lessons')
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

  async deleteVideo(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('video_lessons')
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
   * Track video progress
   */
  async updateProgress(videoId: string, studentId: string, secondsWatched: number): Promise<ServiceResponse<void>> {
    try {
      // Upsert view record
      const { error } = await supabase
        .from('video_views')
        .upsert({
          video_lesson_id: videoId,
          student_id: studentId,
          watch_seconds: secondsWatched,
          last_updated: new Date().toISOString()
        }, { onConflict: 'video_lesson_id, student_id' });

      if (error) {
        console.error('Failed to track video progress', error);
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  }
};
