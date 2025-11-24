// src/services/examService.ts
// خدمة إدارة الاختبارات والأسئلة
// Service for managing exams, questions, and submissions.

import { supabase } from '@/lib/supabase';
import { ServiceResponse } from '@/types/service';

export interface Exam {
  id: string;
  title: string;
  description: string;
  classroom_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_marks: number;
  status: 'draft' | 'published' | 'completed';
  _count?: {
    questions: number;
    submissions: number;
  };
  classroom?: {
    name: string;
  };
}

export interface ExamQuestion {
  id?: string;
  question_text: string;
  question_type: 'MCQ' | 'TrueFalse' | 'ShortAnswer' | 'Essay';
  options?: string[]; // For UI handling
  correct_answer: string;
  points: number;
  order: number;
}

export const examService = {
  /**
   * Fetch all exams for the current tenant
   */
  async getExams(): Promise<ServiceResponse<Exam[]>> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          classroom:classrooms(name),
          questions:exam_questions(count),
          submissions:exam_submissions(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }

      const exams = data.map(exam => ({
        ...exam,
        _count: {
          questions: exam.questions[0]?.count || 0,
          submissions: exam.submissions[0]?.count || 0
        }
      }));

      return { success: true, data: exams };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Create a new exam with questions
   */
  async createExam(
    examData: Omit<Exam, 'id' | '_count' | 'classroom' | 'status'>,
    questions: ExamQuestion[]
  ): Promise<ServiceResponse<Exam>> {
    try {
      // 1. Create Exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          title: examData.title,
          description: examData.description,
          classroom_id: examData.classroom_id,
          start_time: examData.start_time,
          end_time: examData.end_time,
          duration_minutes: examData.duration_minutes,
          total_marks: examData.total_marks,
          status: 'published' // Auto publish for now
        })
        .select()
        .single();

      if (examError) {
        return { success: false, error: { message: examError.message, code: examError.code } };
      }

      // 2. Create Questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((q, index) => ({
          exam_id: exam.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ? JSON.stringify(q.options) : null, // Store as JSON
          correct_answer: q.correct_answer,
          points: q.points,
          order: index + 1
        }));

        const { error: qError } = await supabase
          .from('exam_questions')
          .insert(questionsToInsert);

        if (qError) {
          // If questions fail, we should probably delete the exam or return partial success?
          // For now, return error but note exam was created.
          // Ideally we would use a transaction (RPC) for this.
          return { success: false, error: { message: qError.message, code: qError.code } };
        }
      }

      return { success: true, data: exam };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async updateExam(id: string, data: Partial<Exam>): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('exams')
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

  async deleteExam(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('exams')
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
   * Get full exam details with questions
   */
  async getExamById(id: string): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          classroom:classrooms(name),
          questions:exam_questions(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }

      // Parse options JSON back to array
      if (data.questions) {
        data.questions = data.questions.map((q: any) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : []
        })).sort((a: any, b: any) => a.order - b.order);
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  }
};
