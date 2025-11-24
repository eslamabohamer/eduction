// src/services/whatsappService.ts
// خدمة إرسال رسائل واتساب (محاكاة)
// Mock service for sending WhatsApp notifications via external API.

import { toast } from 'sonner';

export const whatsappService = {
  /**
   * Send a message to a single number
   */
  async sendMessage(phone: string, message: string) {
    // In a real app, this would call an API like Twilio, Meta Cloud API, or a local gateway
    console.log(`[WhatsApp Mock] Sending to ${phone}: ${message}`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    });
  },

  /**
   * Send bulk messages
   */
  async sendBulkMessage(phones: string[], message: string) {
    console.log(`[WhatsApp Mock] Sending bulk to ${phones.length} recipients: ${message}`);
    
    // Simulate processing time
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, count: phones.length });
      }, 1500);
    });
  }
};
