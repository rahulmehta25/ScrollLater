// ScrollLater Browser Extension - Background Service Worker

const API_BASE_URL = 'https://scrolllater.com'; // Change to localhost:3000 for development

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to ScrollLater',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to ScrollLater',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'save-selection',
    title: 'Save selection to ScrollLater',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'save-image',
    title: 'Save image to ScrollLater',
    contexts: ['image']
  });

  console.log('ScrollLater extension installed');
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let data = {
    url: tab.url,
    title: tab.title,
    source: 'extension_context_menu'
  };

  switch (info.menuItemId) {
    case 'save-link':
      data.url = info.linkUrl;
      data.title = info.linkUrl;
      break;
    case 'save-selection':
      data.content = info.selectionText;
      break;
    case 'save-image':
      data.url = info.srcUrl;
      data.metadata = { type: 'image', imageUrl: info.srcUrl };
      break;
  }

  // Get page metadata from content script
  if (tab.id) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' });
      if (response) {
        data = { ...data, ...response };
      }
    } catch (e) {
      console.log('Could not get page metadata:', e);
    }
  }

  await saveContent(data);
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-save') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await quickSave(tab);
    }
  }
});

// Quick save function
async function quickSave(tab) {
  let data = {
    url: tab.url,
    title: tab.title,
    source: 'extension_keyboard_shortcut'
  };

  // Get page metadata from content script
  if (tab.id) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' });
      if (response) {
        data = { ...data, ...response };
      }
    } catch (e) {
      console.log('Could not get page metadata:', e);
    }
  }

  await saveContent(data);
  showNotification('Saved!', `"${data.title}" saved to ScrollLater`);
}

// Save content to API
async function saveContent(data) {
  try {
    // Get auth token from storage
    const { authToken, apiUrl } = await chrome.storage.local.get(['authToken', 'apiUrl']);

    if (!authToken) {
      showNotification('Sign in required', 'Please sign in to ScrollLater first');
      chrome.action.openPopup();
      return { success: false, error: 'Not authenticated' };
    }

    const baseUrl = apiUrl || API_BASE_URL;

    const response = await fetch(`${baseUrl}/api/save-from-extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to save content:', error);
    showNotification('Error', 'Failed to save content. Please try again.');
    return { success: false, error: error.message };
  }
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: title,
    message: message
  });
}

// Message handler from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_CONTENT') {
    saveContent(request.data).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.type === 'GET_AUTH_STATUS') {
    chrome.storage.local.get(['authToken', 'user']).then(sendResponse);
    return true;
  }

  if (request.type === 'SET_AUTH') {
    chrome.storage.local.set({
      authToken: request.token,
      user: request.user
    }).then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.type === 'LOGOUT') {
    chrome.storage.local.remove(['authToken', 'user']).then(() => sendResponse({ success: true }));
    return true;
  }
});

// Badge update on save
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.recentSaveCount) {
    const count = changes.recentSaveCount.newValue || 0;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
  }
});
