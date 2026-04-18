// ScrollLater Browser Extension - Popup Script

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sanitizeImageUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)) {
    return url;
  }
  return '';
}

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const authView = document.getElementById('auth-view');
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  const pagePreview = document.getElementById('page-preview');
  const saveBtn = document.getElementById('save-btn');
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const userInfo = document.getElementById('user-info');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const notesInput = document.getElementById('notes');
  const tagsInput = document.getElementById('tags');
  const priorityBtns = document.querySelectorAll('.priority-btn');

  let currentTab = null;
  let pageMetadata = null;
  let selectedPriority = 3;

  // Check auth status
  const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });

  if (authStatus?.authToken) {
    showMainView();
    if (authStatus.user) {
      showUserInfo(authStatus.user);
    }
    loadPageInfo();
  } else {
    showAuthView();
  }

  // Event Listeners
  document.getElementById('sign-in-btn').addEventListener('click', handleSignIn);
  document.getElementById('settings-btn').addEventListener('click', showSettingsView);
  document.getElementById('back-btn').addEventListener('click', () => showMainView());
  saveBtn.addEventListener('click', handleSave);
  document.getElementById('retry-btn').addEventListener('click', handleRetry);
  document.getElementById('sign-out-btn').addEventListener('click', handleSignOut);

  // Priority selection
  priorityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      priorityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPriority = parseInt(btn.dataset.priority);
    });
  });

  // Load settings
  loadSettings();

  // Functions
  function showAuthView() {
    authView.classList.remove('hidden');
    mainView.classList.add('hidden');
    settingsView.classList.add('hidden');
    userInfo.classList.add('hidden');
  }

  function showMainView() {
    authView.classList.add('hidden');
    mainView.classList.remove('hidden');
    settingsView.classList.add('hidden');
    successMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');
    document.querySelector('.save-form').style.display = 'flex';
    pagePreview.style.display = 'block';
  }

  function showSettingsView() {
    authView.classList.add('hidden');
    mainView.classList.add('hidden');
    settingsView.classList.remove('hidden');
  }

  function showUserInfo(user) {
    if (user.avatar) {
      userAvatar.src = user.avatar;
    } else {
      userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=f97316&color=fff`;
    }
    userName.textContent = user.name || user.email;
    userInfo.classList.remove('hidden');
  }

  async function loadPageInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;

      // Get metadata from content script
      try {
        pageMetadata = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' });
      } catch {
        // Content script not loaded, use basic info
        pageMetadata = {
          url: tab.url,
          title: tab.title,
          favicon: tab.favIconUrl
        };
      }

      renderPagePreview();
    } catch (error) {
      console.error('Failed to load page info:', error);
      pagePreview.innerHTML = `
        <div class="preview-content">
          <div class="preview-info">
            <div class="preview-title">Unable to load page info</div>
            <div class="preview-url">Please refresh and try again</div>
          </div>
        </div>
      `;
    }
  }

  function renderPagePreview() {
    const favicon = pageMetadata.favicon || `https://www.google.com/s2/favicons?domain=${new URL(pageMetadata.url).hostname}`;
    const image = pageMetadata.image;
    const hostname = new URL(pageMetadata.url).hostname;

    const safeFavicon = sanitizeImageUrl(favicon) || 'icons/icon-16.svg';
    const safeImage = sanitizeImageUrl(image);

    let meta = '';
    if (pageMetadata.readingTime) {
      meta += `<span>${escapeHtml(String(pageMetadata.readingTime))} min read</span>`;
    }
    if (pageMetadata.author) {
      meta += `<span>by ${escapeHtml(pageMetadata.author)}</span>`;
    }

    pagePreview.innerHTML = `
      <div class="preview-content">
        ${safeImage ? `<img class="preview-image" src="${escapeHtml(safeImage)}" alt="">` : ''}
        <div class="preview-info">
          <div class="preview-title">${escapeHtml(pageMetadata.title || 'Untitled')}</div>
          <div class="preview-url">
            <img src="${escapeHtml(safeFavicon)}" alt="">
            ${escapeHtml(hostname)}
          </div>
          ${meta ? `<div class="preview-meta">${meta}</div>` : ''}
        </div>
      </div>
    `;
  }

  async function handleSignIn() {
    // Open ScrollLater in a new tab for authentication
    // After auth, the user will need to get a token to use here
    chrome.tabs.create({ url: 'https://scrolllater.com/?extension=true' });
  }

  async function handleSave() {
    if (!pageMetadata) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner"></div> Saving...';

    const data = {
      url: pageMetadata.url,
      title: pageMetadata.title,
      content: pageMetadata.content || pageMetadata.description || '',
      original_input: pageMetadata.url,
      source: 'browser_extension',
      priority: selectedPriority,
      user_notes: notesInput.value.trim() || null,
      user_tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
      metadata: {
        favicon: pageMetadata.favicon,
        image: pageMetadata.image,
        author: pageMetadata.author,
        publishedDate: pageMetadata.publishedDate,
        readingTime: pageMetadata.readingTime,
        siteName: pageMetadata.siteName,
        pageType: pageMetadata.type
      }
    };

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SAVE_CONTENT',
        data
      });

      if (result.success) {
        showSuccess();
      } else {
        showError(result.error || 'Failed to save');
      }
    } catch (error) {
      showError(error.message);
    }
  }

  function showSuccess() {
    document.querySelector('.save-form').style.display = 'none';
    pagePreview.style.display = 'none';
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
  }

  function showError(message) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
      Save to ScrollLater
    `;
    errorText.textContent = message;
    document.querySelector('.save-form').style.display = 'none';
    pagePreview.style.display = 'none';
    errorMessage.classList.remove('hidden');
  }

  function handleRetry() {
    showMainView();
    loadPageInfo();
  }

  async function handleSignOut() {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    showAuthView();
  }

  async function loadSettings() {
    const settings = await chrome.storage.local.get([
      'showFloatingButton',
      'autoExtract',
      'showNotifications',
      'apiUrl'
    ]);

    document.getElementById('floating-button').checked = settings.showFloatingButton ?? true;
    document.getElementById('auto-extract').checked = settings.autoExtract ?? true;
    document.getElementById('notifications').checked = settings.showNotifications ?? true;
    document.getElementById('api-url').value = settings.apiUrl || '';

    // Save settings on change
    document.getElementById('floating-button').addEventListener('change', (e) => {
      chrome.storage.local.set({ showFloatingButton: e.target.checked });
    });

    document.getElementById('auto-extract').addEventListener('change', (e) => {
      chrome.storage.local.set({ autoExtract: e.target.checked });
    });

    document.getElementById('notifications').addEventListener('change', (e) => {
      chrome.storage.local.set({ showNotifications: e.target.checked });
    });

    document.getElementById('api-url').addEventListener('blur', (e) => {
      chrome.storage.local.set({ apiUrl: e.target.value.trim() });
    });
  }
});
