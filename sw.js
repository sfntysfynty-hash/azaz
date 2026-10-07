// ═══════════════════════════════════════════════════════════
// Service Worker - HAMIDO EXCHANGE
// يقرأ وقت التحديث من Firebase ويمسح الكاش تلقائياً
// ═══════════════════════════════════════════════════════════

// استخدم وقت التثبيت الحقيقي
const CACHE_VERSION = 'hamido-v' + Date.now();
const CACHE_NAME = 'hamido-cache-' + CACHE_VERSION;

// ═══════════════════════════════════════════════════════════
// تثبيت Service Worker جديد
// ═══════════════════════════════════════════════════════════
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            console.log('🗑️ حذف كاش قديم:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// ═══════════════════════════════════════════════════════════
// تنشيط Service Worker
// ═══════════════════════════════════════════════════════════
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ═══════════════════════════════════════════════════════════
// استقبال الرسائل
// ═══════════════════════════════════════════════════════════
self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ═══════════════════════════════════════════════════════════
// استراتيجية Fetch - Network First (شبكة أولاً)
// 🔥 مهم: لا تخزّن index.html أبداً لضمان التحديث الفوري
// ═══════════════════════════════════════════════════════════
self.addEventListener('fetch', function(event) {
  // تجاهل الطلبات غير GET
  if (event.request.method !== 'GET') return;
  
  var url = event.request.url;
  
  // تجاهل Firebase و Google
  if (url.indexOf('firebase') > -1 || 
      url.indexOf('googleapis') > -1 ||
      url.indexOf('gstatic') > -1 ||
      url.indexOf('unpkg') > -1 ||
      url.indexOf('jsdelivr') > -1 ||
      url.indexOf('qrserver') > -1) {
    return;
  }
  
  // 🔥 مهم جداً: لا تخزّن index.html أو الصفحة الرئيسية
  if (url.indexOf('index.html') > -1 || 
      url.endsWith('/azaz/') || 
      url.endsWith('/azaz') ||
      url.endsWith('/')) {
    // اجلب مباشرة من الشبكة (بدون كاش)
    event.respondWith(fetch(event.request));
    return;
  }
  
  // للباقي: Network First
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});