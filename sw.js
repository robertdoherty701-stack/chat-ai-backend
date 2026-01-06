const CACHE_NAME = 'chat-ai-pro-v1';
const urlsToCache = [
  '/app-v3-pro.html',
  '/upload-imagem.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cacheando arquivos');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event - Network First, fallback to Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone da resposta
        const responseClone = response.clone();
        
        // Adicionar ao cache
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        
        return response;
      })
      .catch(() => {
        // Se falhar, buscar do cache
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          // Fallback para página offline
          if (event.request.destination === 'document') {
            return caches.match('/app-v3-pro.html');
          }
        });
      })
  );
});

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  console.log('Service Worker: Sincronizando mensagens...');
  
  // Buscar mensagens pendentes do IndexedDB
  const messages = await getPendingMessages();
  
  // Enviar para o servidor
  for (const message of messages) {
    try {
      await fetch('https://chat-ai-backend-lox5.onrender.com/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${message.token}`
        },
        body: JSON.stringify(message.data)
      });
      
      // Remover da fila após sucesso
      await removePendingMessage(message.id);
    } catch (error) {
      console.error('Erro ao sincronizar mensagem:', error);
    }
  }
}

async function getPendingMessages() {
  // Implementar leitura do IndexedDB
  return [];
}

async function removePendingMessage(id) {
  // Implementar remoção do IndexedDB
  console.log('Mensagem removida:', id);
}

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nova mensagem recebida',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/app-v3-pro.html'
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Chat AI Pro', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Message from client
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => caches.delete(cache))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
