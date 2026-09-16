/**
 * Amoha SMS Fallback System
 * Critical medication reminder delivery when offline delivery isn't possible
 * Integrates with SMS gateways (Twilio, MSG91) for Indian numbers
 * Connects Blue module to Purple module (encryption standards)
 */

 // Configuration - should be loaded from env variables in production
 export const SMS_CONFIG = {
   // Twilio SMS API
   twilio: {
     accountSid: process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
     authToken: process.env.TWILIO_AUTH_TOKEN || 'your_auth_token',
     messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
     fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890', // Twilio verified number
   },
   
   // MSG91 SMS API (popular in India)
   msg91: {
     authKey: process.env.MSG91_AUTH_KEY || 'your_auth_key',
     sender: process.env.MSG91_SENDER || 'AMOHA', // Sender ID
     country: process.env.MSG91_COUNTRY || '91', // India country code
   },
 };

 /**
  * Format phone number to Indian format
  * Accepts: +91XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX
  * Returns: +91XXXXXXXXXX
  */
 export const formatIndianPhone = (phone) => {
   if (!phone) return null;
   
   // Remove any whitespace, dashes, parentheses
   const cleaned = phone.replace(/\s|-|\(|\)/g, '');
   
   // If already in international format
   if (cleaned.startsWith('+91')) return `+91${cleaned.slice(3)}`;
   if (cleaned.startsWith('91')) return `+${cleaned}`;
   
   // If 10-digit Indian number, prepend +91
   if (cleaned.length === 10) return `+91${cleaned}`;
   
   return cleaned;
 };

 /**
  * Send SMS via Twilio API
  * @param {string} toPhone - Recipient phone number
  * @param {string} message - SMS message body
  * @returns {Promise<object>} Send result
  */
 export const sendSMSTwilio = async (toPhone, message) => {
   const formattedPhone = formatIndianPhone(toPhone);
   if (!formattedPhone) {
     throw new Error('Invalid phone number format');
   }

   try {
     // In production, would use actual Twilio SDK
     // const client = require('twilio')(SMS_CONFIG.twilio.accountSid, SMS_CONFIG.twilio.authToken);
     // const message = await client.messages.create({
     //   body: message,
     //   from: SMS_CONFIG.twilio.fromNumber,
     //   to: formattedPhone,
     // });
     
     // Mock successful response for development
     console.log(`[Twilio] SMS sent to ${formattedPhone}: ${message}`);
     
     return {
       status: 'sent',
       provider: 'twilio',
       to: formattedPhone,
       message,
     };
   } catch (error) {
     console.error('[Twilio] SMS send failed:', error.message);
     throw error;
   }
 };

 /**
  * Send SMS via MSG91 API (India-focused)
  * @param {string} toPhone - Recipient phone number
  * @param {string} message - SMS message body
  * @returns {Promise<object>} Send result
  */
 export const sendSMSGMSG91 = async (toPhone, message) => {
   const formattedPhone = formatIndianPhone(toPhone);
   if (!formattedPhone) {
     throw new Error('Invalid phone number format');
   }

   try {
     // MSG91 API endpoint
     // const endpoint = `https://control.msg91.com/api/sendhttp.php`;
     // const params = new URLSearchParams({
     //   authkey: SMS_CONFIG.msg91.authKey,
     //   mobile: formattedPhone.replace('+', ''),
     //   sender: SMS_CONFIG.msg91.sender,
     //   text: message,
     //   country: SMS_CONFIG.msg91.country,
     // });
     
     // Mock successful response for development
     console.log(`[MSG91] SMS sent to ${formattedPhone}: ${message}`);
     
     return {
       status: 'sent',
       provider: 'msg91',
       to: formattedPhone,
       message,
     };
   } catch (error) {
     console.error('[MSG91] SMS send failed:', error.message);
     throw error;
   }
 };

 /**
  * Priority SMS sending with fallback between providers
  * Tries Twilio first, then MSG91 if fails
  * @param {string} toPhone - Recipient phone number
  * @param {string} message - SMS message body
  * @param {object} options - Additional options
  * @returns {Promise<object>} Send result from best provider
  */
 export const sendPrioritySMS = async (toPhone, message, options = {}) => {
   const { providerPreference = ['twilio', 'msg91'] } = options;
   
   for (const provider of providerPreference) {
     try {
       let result;
       
       if (provider === 'twilio') {
         result = await sendSMSTwilio(toPhone, message);
       } else if (provider === 'msg91') {
         result = await sendSMSGMSG91(toPhone, message);
       } else {
         console.warn(`Unknown SMS provider: ${provider}`);
         continue;
       }
       
       if (result && result.status === 'sent') {
         return {
           status: 'sent',
           provider,
           ...result,
         };
       }
     } catch (error) {
       console.warn(`${provider} SMS failed, trying next provider...`);
       continue;
     }
   }
   
   // All providers failed
   return {
     status: 'failed',
     provider: 'none',
     message,
     error: 'All SMS providers unavailable',
   };
 };

 /**
  * Care log entry that triggers SMS fallback
  * Creates a medication reminder with SMS flag and triggers SMS sending
  * @param {object} careLogData - The care log data
  * @param {string} caregiverPhone - Caregiver's phone number
  * @returns {Promise<object>} SMS send result
  */
 export const triggerSMSForCriticalReminder = async (careLogData, caregiverPhone) => {
   // Determine if SMS is needed based on alert level and tags
   const { alert_level, tags = [] } = careLogData;
   const tagNames = tags.map(t => t.name);
   
   // SMS triggers for high-priority alerts
   const triggersSMS = 
     alert_level === 'caregiver_review' ||
     tagNames.includes('med_missed') ||
     tagNames.includes('agitation') ||
     tagNames.includes('sleep_issue');
   
   if (!triggersSMS) {
     return {
       status: 'skipped',
       reason: 'Alert level and tags do not require SMS escalation',
     };
   }
   
   // Construct SMS message
   const careRecipientName = careLogData.care_recipient_id || 'care recipient';
   const entryText = careLogData.entry_text || 'care log entry';
   const suggestion = careLogData.suggestion || 'Please review the care plan';
   
   const smsMessage = `🔔 Amoha Care Alert: ${entryText}. ${suggestion}. Please check care plan for ${careRecipientName}.`;
   
   // Send SMS via priority gateway
   const sendResult = await sendPrioritySMS(caregiverPhone, smsMessage, {
     providerPreference: ['twilio', 'msg91'],
   });
   
   // Log the SMS trigger result
   console.log(`SMS trigger result: ${sendResult.status} (${sendResult.provider})`);
   
   return {
     triggered: true,
     alertLevel: alert_level,
     smsResult: sendResult,
     message: smsMessage,
   };
 };

 /**
  * Batch SMS sending for multiple pending reminders
  * Uses the sync protocol to send queued SMS-capable reminders
  */
 export const sendBatchSMSReminders = async () => {
  // In a full implementation, this would query IndexedDB for pending med reminders
  // For now, returns a mock structure
  return {
    status: 'ready',
    message: 'Batch SMS reminders ready to send when IndexedDB available',
  };
 };