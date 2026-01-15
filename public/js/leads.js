// public/js/leads.js - Script global para manejo de leads

// ✅ FUNCIÓN GLOBAL PARA ENVÍO DE LEADS
window.submitPropertyLead = async function(event) {
  event.preventDefault();
  
  console.log('🚀 submitPropertyLead llamada');
  
  const submitBtn = document.getElementById('submit-lead-btn');
  const submitText = document.getElementById('submit-lead-text');
  const originalText = submitText ? submitText.textContent : 'Contactar Asesor';
  
  // Cambiar estado del botón
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-75');
  }
  if (submitText) {
    submitText.textContent = 'Enviando...';
  }
  
  try {
    // Recopilar datos del formulario
    const formData = new FormData(event.target);
    const leadData = Object.fromEntries(formData.entries());
    
    console.log('📋 Datos del formulario:', leadData);
    
    // Validar campos requeridos
    if (!leadData.cliente_nombre || !leadData.cliente_telefono || !leadData.cliente_email) {
      throw new Error('Por favor completa todos los campos obligatorios');
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.cliente_email)) {
      throw new Error('Por favor ingresa un email válido');
    }
    
    // Agregar datos adicionales automáticamente
    leadData.fecha_creacion = new Date().toISOString();
    leadData.user_agent = navigator.userAgent;
    leadData.referidor_lead = document.referrer || '';
    
    console.log('📤 Enviando lead con datos:', leadData);
    
    // ✅ ENVÍO A EDGE FUNCTION
    const response = await fetch('https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/submit-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNzA4MTEsImV4cCI6MjA0OTk0NjgxMX0.sknz-kLZp77tsm-bGZupzQ'
      },
      body: JSON.stringify(leadData)
    });
    
    console.log('📡 Response status:', response.status);
    
    const result = await response.json();
    console.log('📥 Respuesta del servidor:', result);
    
    if (!response.ok) {
      throw new Error(result.error || result.details || `Error ${response.status}`);
    }
    
    if (!result.success) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    // ✅ ÉXITO
    console.log('✅ Lead enviado exitosamente:', result);
    showSuccessMessage();
    event.target.reset();
    
    // También enviar por WhatsApp como backup
    const whatsappMessage = createWhatsAppMessage(leadData);
    const whatsappUrl = `https://wa.me/18295550100?text=${encodeURIComponent(whatsappMessage)}`;
    
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error enviando lead:', error);
    showErrorMessage(error.message);
  } finally {
    // Restaurar botón
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-75');
    }
    if (submitText) {
      submitText.textContent = originalText;
    }
  }
};

// Función para crear mensaje de WhatsApp
function createWhatsAppMessage(leadData) {
  return `🏠 NUEVO LEAD - ${leadData.property_title || 'Propiedad de interés'}

👤 Cliente: ${leadData.cliente_nombre}
📞 Teléfono: ${leadData.cliente_telefono}
📧 Email: ${leadData.cliente_email}
${leadData.cliente_celular ? `📱 WhatsApp: ${leadData.cliente_celular}` : ''}

💬 Mensaje: ${leadData.mensaje || 'Sin mensaje adicional'}

🔗 Origen: ${leadData.origen} ${leadData.utm_source ? `(${leadData.utm_source})` : ''}
🕒 ${new Date().toLocaleString('es-DO')}`;
}

// Mostrar mensaje de éxito
function showSuccessMessage() {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <div>
        <p class="font-semibold">¡Lead enviado exitosamente!</p>
        <p class="text-sm">Te contactaremos muy pronto</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.remove('translate-x-full'), 100);
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// Mostrar mensaje de error
function showErrorMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <p class="font-semibold">Error al enviar</p>
        <p class="text-sm">${message}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.remove('translate-x-full'), 100);
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  });
}

console.log('🔧 Script de leads cargado correctamente');