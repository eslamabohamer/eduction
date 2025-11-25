/*
  # Create Chat System Schema
  Creates messages table and enables realtime communication.

  ## Query Description:
  1. Creates 'messages' table for storing chat history.
  2. Enables RLS for security.
  3. Adds policies so users can only see their own messages.
  4. Enables Supabase Realtime for the messages table.

  ## Metadata:
  - Schema-Category: "Feature"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table: messages (id, sender_id, receiver_id, content, created_at, is_read)
*/

-- Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can read messages where they are the sender OR the receiver
CREATE POLICY "Users can read their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update 'is_read' status for messages they received
CREATE POLICY "Users can update read status"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Grant permissions
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
