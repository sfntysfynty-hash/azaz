// ============================================================
// Service Worker - نظام التحديث التلقائي
// ============================================================
const CACHE_VERSION = 'hamido-v5'; // ⚠️ غيّر الرقم في كل تحديث!
const CACHE_NAME = 'hamido-cache-' + CACHE_VERSION;

// عند تثبيت Service Worker جديد
self.addEventListener('install', function(e) {
  self.skipWaiting(); // فعّل SW الجديد فوراً
});

// عند تنشيط Service Worker
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            console.log('🗑️ حذف كاش قديم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim(); // سيطر على العملاء فوراً
    })
  );
});

// إخطار جميع الصفحات المفتوحة بالتحديث
function notifyClients() {
  self.clients.matchAll({ type: 'window' }).then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'NEW_VERSION' });
    });
  });
}

// عند استقبال رسالة
self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// استراتيجية Fetch - Network First (شبكة أولاً)
self.addEventListener('fetch', function(e) {
  // تجاهل الطلبات غير GET
  if (e.request.method !== 'GET') return;
  
  // تجاهل الطلبات من Firebase و Google
  var url = e.request.url;
  if (url.indexOf('firebase') > -1 || 
      url.indexOf('googleapis') > -1 ||
      url.indexOf('gstatic') > -1 ||
      url.indexOf('unpkg') > -1 ||
      url.indexOf('jsdelivr') > -1) {
    return;
  }
  
  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // خزّن نسخة جديدة من الصفحة
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // إذا فشل الاتصال، استخدم الكاش
        return caches.match(e.request);
      })
  );
});