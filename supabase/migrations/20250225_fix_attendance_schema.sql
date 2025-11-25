/*
  # Fix Attendance Records Schema
  
  1. Adds `notes` column to `attendance_records` if it doesn't exist.
  2. This fixes the issue where the table existed from init_schema but lacked the new column.
*/

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'notes') THEN
        ALTER TABLE public.attendance_records ADD COLUMN notes TEXT;
    END IF;
END $$;
