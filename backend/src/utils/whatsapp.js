// ==================== إرسال رسالة واتساب ====================
export async function sendWhatsAppMessage(phone, message) {
  try {
    console.log('🔵 [WhatsApp] بدء الإرسال إلى:', phone);

    const apiUrl = process.env.GREEN_API_URL;
    const instance = process.env.GREEN_API_INSTANCE;
    const token = process.env.GREEN_API_TOKEN;

    console.log('🔵 [WhatsApp] API URL:', apiUrl);
    console.log('🔵 [WhatsApp] Instance:', instance);
    console.log('🔵 [WhatsApp] Token:', token ? 'موجود' : 'مفقود');

    if (!apiUrl || !instance || !token) {
      console.warn('⚠️ [WhatsApp] Green-API غير مُعدّ');
      return { success: false, reason: 'not_configured' };
    }

    // تنسيق الرقم
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '967' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('967')) {
      formattedPhone = '967' + formattedPhone;
    }

    console.log('🔵 [WhatsApp] الرقم المنسق:', formattedPhone);

    const url = `${apiUrl}/waInstance${instance}/sendMessage/${token}`;
    console.log('🔵 [WhatsApp] URL النهائي:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${formattedPhone}@c.us`,
        message,
      }),
    });

    console.log('🔵 [WhatsApp] Response status:', response.status);

    const data = await response.json();
    console.log('🔵 [WhatsApp] Response data:', data);

    if (!response.ok) {
      console.error('❌ [WhatsApp] فشل الإرسال:', data);
      return { success: false, reason: 'api_error', data };
    }

    console.log('✅ [WhatsApp] تم الإرسال إلى:', formattedPhone);
    return { success: true, data };
  } catch (err) {
    console.error('❌ [WhatsApp] خطأ:', err.message);
    console.error('❌ [WhatsApp] Stack:', err.stack);
    return { success: false, reason: 'exception', error: err.message };
  }
}