// ScrollLater Browser Extension - Content Script
// Extracts page metadata and article content

(function() {
  'use strict';

  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_METADATA') {
      const metadata = extractPageMetadata();
      sendResponse(metadata);
    }
    return true;
  });

  // Extract comprehensive page metadata
  function extractPageMetadata() {
    const metadata = {
      url: window.location.href,
      title: getTitle(),
      description: getDescription(),
      author: getAuthor(),
      publishedDate: getPublishedDate(),
      siteName: getSiteName(),
      image: getMainImage(),
      favicon: getFavicon(),
      content: getArticleContent(),
      readingTime: null,
      tags: getTags(),
      type: getPageType(),
      canonical: getCanonicalUrl()
    };

    // Calculate reading time
    if (metadata.content) {
      const wordCount = metadata.content.split(/\s+/).length;
      metadata.readingTime = Math.ceil(wordCount / 200); // Assume 200 WPM
    }

    return metadata;
  }

  // Get page title
  function getTitle() {
    // Try Open Graph title first
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    if (ogTitle) return ogTitle;

    // Try Twitter title
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content;
    if (twitterTitle) return twitterTitle;

    // Fall back to document title
    return document.title || '';
  }

  // Get page description
  function getDescription() {
    const selectors = [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]'
    ];

    for (const selector of selectors) {
      const meta = document.querySelector(selector);
      if (meta?.content) return meta.content;
    }

    return '';
  }

  // Get author
  function getAuthor() {
    const selectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '[rel="author"]',
      '.author',
      '[itemprop="author"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.content || element.textContent?.trim() || '';
      }
    }

    return '';
  }

  // Get published date
  function getPublishedDate() {
    const selectors = [
      'meta[property="article:published_time"]',
      'meta[name="publication_date"]',
      'time[datetime]',
      '[itemprop="datePublished"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.content || element.getAttribute('datetime') || '';
      }
    }

    return '';
  }

  // Get site name
  function getSiteName() {
    const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.content;
    if (ogSiteName) return ogSiteName;

    // Try to extract from URL
    return window.location.hostname.replace('www.', '');
  }

  // Get main image
  function getMainImage() {
    const selectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'article img',
      '.post-thumbnail img',
      '.featured-image img'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const src = element.content || element.src;
        if (src && !src.includes('avatar') && !src.includes('logo')) {
          return src;
        }
      }
    }

    return '';
  }

  // Get favicon
  function getFavicon() {
    const link = document.querySelector('link[rel="icon"]') ||
                 document.querySelector('link[rel="shortcut icon"]');
    if (link?.href) return link.href;

    return `${window.location.origin}/favicon.ico`;
  }

  // Get article content
  function getArticleContent() {
    // Try to find article content using various selectors
    const articleSelectors = [
      'article',
      '[role="article"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      'main',
      '#content'
    ];

    for (const selector of articleSelectors) {
      const article = document.querySelector(selector);
      if (article) {
        // Clone to avoid modifying the page
        const clone = article.cloneNode(true);

        // Remove unwanted elements
        const unwanted = clone.querySelectorAll(
          'script, style, nav, aside, footer, .sidebar, .comments, .ad, .advertisement, .social-share'
        );
        unwanted.forEach(el => el.remove());

        // Get text content
        const text = clone.textContent
          ?.replace(/\s+/g, ' ')
          .trim();

        if (text && text.length > 100) {
          return text.substring(0, 5000); // Limit content length
        }
      }
    }

    // Fall back to body text
    const bodyText = document.body.textContent
      ?.replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);

    return bodyText || '';
  }

  // Get tags/keywords
  function getTags() {
    const tags = [];

    // Get keywords meta
    const keywords = document.querySelector('meta[name="keywords"]')?.content;
    if (keywords) {
      tags.push(...keywords.split(',').map(k => k.trim()));
    }

    // Get article tags
    const articleTags = document.querySelectorAll('[rel="tag"], .tag, .tags a');
    articleTags.forEach(tag => {
      const text = tag.textContent?.trim();
      if (text && !tags.includes(text)) {
        tags.push(text);
      }
    });

    return tags.slice(0, 10); // Limit to 10 tags
  }

  // Determine page type
  function getPageType() {
    const ogType = document.querySelector('meta[property="og:type"]')?.content;
    if (ogType) return ogType;

    // Heuristics
    if (window.location.hostname.includes('youtube.com') ||
        window.location.hostname.includes('vimeo.com')) {
      return 'video';
    }

    if (document.querySelector('article')) {
      return 'article';
    }

    return 'website';
  }

  // Get canonical URL
  function getCanonicalUrl() {
    const canonical = document.querySelector('link[rel="canonical"]');
    return canonical?.href || window.location.href;
  }

  // Inject save button if enabled
  function injectSaveButton() {
    chrome.storage.local.get(['showFloatingButton'], (result) => {
      if (!result.showFloatingButton) return;

      const button = document.createElement('div');
      button.id = 'scrolllater-save-button';
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
      button.title = 'Save to ScrollLater';

      button.addEventListener('click', async () => {
        const metadata = extractPageMetadata();
        button.classList.add('saving');

        try {
          await chrome.runtime.sendMessage({
            type: 'SAVE_CONTENT',
            data: { ...metadata, source: 'floating_button' }
          });
          button.classList.remove('saving');
          button.classList.add('saved');
          setTimeout(() => button.classList.remove('saved'), 2000);
        } catch (error) {
          button.classList.remove('saving');
          button.classList.add('error');
          setTimeout(() => button.classList.remove('error'), 2000);
        }
      });

      document.body.appendChild(button);
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSaveButton);
  } else {
    injectSaveButton();
  }
})();
