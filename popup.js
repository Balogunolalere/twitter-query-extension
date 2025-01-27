function showAlert(message, type = 'error') {
  const alertContainer = document.createElement('div');
  alertContainer.className = `custom-alert ${type}`;
  
  alertContainer.innerHTML = `
    <div class="alert-content">
      <span>${message}</span>
      <button class="alert-close">×</button>
    </div>
  `;

  document.body.appendChild(alertContainer);
  setTimeout(() => alertContainer.classList.add('visible'), 10);

  const closeBtn = alertContainer.querySelector('.alert-close');
  closeBtn.addEventListener('click', () => {
    alertContainer.classList.remove('visible');
    setTimeout(() => alertContainer.remove(), 300);
  });

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(alertContainer)) {
      alertContainer.classList.remove('visible');
      setTimeout(() => alertContainer.remove(), 300);
    }
  }, 5000);
}

document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('input');
  const generateBtn = document.getElementById('generate');
  const resultContainer = document.querySelector('.result-container');
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copy');
  const themeToggle = document.getElementById('themeToggle');
  const charCount = document.querySelector('.character-count');
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const mainContent = document.querySelector('.input-container');
  const exportBtn = document.getElementById('export');
  const historyBtn = document.getElementById('historyBtn');
  const templatesBtn = document.getElementById('templatesBtn');
  const historyPanel = document.getElementById('historyPanel');
  const templatesPanel = document.getElementById('templatesPanel');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  
  // Check for API key on load
  try {
    const { apiKey } = await browser.storage.sync.get('apiKey');
    if (!apiKey) {
      showApiKeyPrompt();
    }
  } catch (error) {
    showApiKeyPrompt();
  }

  function showApiKeyPrompt() {
    apiKeyContainer.classList.add('visible');
    mainContent.style.display = 'none';
    generateBtn.style.display = 'none';
    resultContainer.style.display = 'none';
  }

  saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    saveApiKeyBtn.disabled = true;
    saveApiKeyBtn.innerHTML = '<div class="loading"><div class="spinner"></div>Validating...</div>';

    if (!apiKey) {
      showAlert('Please enter a valid API key');
      saveApiKeyBtn.disabled = false;
      saveApiKeyBtn.innerHTML = '<i class="fas fa-key"></i> Save API Key';
      return;
    }

    try {
      // Validate key with a test request
      const isValid = await validateApiKey(apiKey);
      if (!isValid) {
        throw new Error('Invalid API key - please check and try again');
      }

      // Save valid key
      await browser.storage.sync.set({ apiKey });
      apiKeyContainer.classList.remove('visible');
      mainContent.style.display = 'block';
      generateBtn.style.display = 'flex';
      resultContainer.style.display = 'none';
    } catch (error) {
      showAlert(`Error: ${error.message}`);
    } finally {
      saveApiKeyBtn.disabled = false;
      saveApiKeyBtn.innerHTML = '<i class="fas fa-key"></i> Save API Key';
    }
  });

  // Add keypress handler for API key input
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveApiKeyBtn.click();
    }
  });

  // Theme Toggle
  themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerHTML = `<i class="fas fa-${isDark ? 'moon' : 'sun'}"></i>`;
  });

  // Character counter
  input.addEventListener('input', () => {
    const count = input.value.length;
    charCount.textContent = `${count}/280`;
    charCount.style.color = count > 280 ? 'var(--error)' : 'var(--border)';
    generateBtn.disabled = !input.value.trim() || count > 280;
  });

  generateBtn.addEventListener('click', async () => {
    const query = input.value.trim();
    if (!query) return;

    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="loading"><div class="spinner"></div>Generating...</div>';
    
    // Reset result container
    resultContainer.style.display = 'none';
    resultContainer.classList.remove('visible');
    
    try {
      const response = await browser.runtime.sendMessage({ action: 'generateQuery', input: query });
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Show result
      resultDiv.textContent = response.query;
      resultContainer.style.display = 'block';
      // Use setTimeout to ensure display:block is applied before adding visible class
      setTimeout(() => resultContainer.classList.add('visible'), 10);
      
      // Open Twitter in new tab
      const twitterSearchUrl = `https://x.com/search?q=${encodeURIComponent(response.query)}`;
      const tab = await browser.tabs.create({ url: twitterSearchUrl });
      
      browser.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          browser.tabs.onUpdated.removeListener(listener);
          browser.tabs.sendMessage(tabId, { 
            action: 'executeSearch', 
            query: response.query 
          }).catch(console.error);
        }
      });

      // Add to history after successful generation
      if (response.query) {
        await addToHistory({
          query: response.query,
          originalInput: query,
          timestamp: new Date().toISOString()
        });
        loadQueryHistory(); // Refresh history display
      }

    } catch (error) {
      console.error('Extension error:', error);
      resultDiv.innerHTML = `<div class="error">⚠️ ${error.message}</div>`;
      resultContainer.style.display = 'block';
      setTimeout(() => resultContainer.classList.add('visible'), 10);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Query';
    }
  });

  // Copy button functionality
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultDiv.textContent);
      const originalContent = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      copyBtn.style.background = 'var(--success)';
      copyBtn.style.borderColor = 'var(--success)';
      copyBtn.style.color = 'white';
      
      setTimeout(() => {
        copyBtn.innerHTML = originalContent;
        copyBtn.style.background = 'transparent';
        copyBtn.style.borderColor = 'var(--primary)';
        copyBtn.style.color = 'var(--primary)';
      }, 2000);
    } catch (err) {
      copyBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
      copyBtn.style.background = 'var(--error)';
      setTimeout(() => copyBtn.innerHTML = originalContent, 2000);
    }
  });

  exportBtn.addEventListener('click', async () => {
    try {
      const query = resultDiv.textContent;
      if (!query) return;

      exportBtn.disabled = true;
      exportBtn.innerHTML = '<div class="loading"><div class="spinner"></div>Collecting...</div>';

      // Get active tab with Twitter search results
      const tabs = await browser.tabs.query({active: true, currentWindow: true});
      const tab = tabs[0];

      // Collect tweets
      const response = await browser.tabs.sendMessage(tab.id, { 
        action: 'collectTweets'
      });

      if (response.tweets && response.tweets.length > 0) {
        // Prepare the data for export
        const exportData = {
          query,
          timestamp: new Date().toISOString(),
          tweets: response.tweets
        };

        // Create and download the file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `twitter-search-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success
        exportBtn.innerHTML = '<i class="fas fa-check"></i> Exported!';
        exportBtn.style.background = 'var(--success)';
        exportBtn.style.borderColor = 'var(--success)';
        exportBtn.style.color = 'white';
      } else {
        throw new Error('No tweets found');
      }
    } catch (error) {
      console.error('Export error:', error);
      exportBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
      exportBtn.style.background = 'var(--error)';
    } finally {
      setTimeout(() => {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Results';
        exportBtn.style.background = 'transparent';
        exportBtn.style.borderColor = 'var(--primary)';
        exportBtn.style.color = 'var(--primary)';
      }, 2000);
    }
  });

  historyBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('visible');
    templatesPanel.classList.remove('visible');
  });

  templatesBtn.addEventListener('click', () => {
    templatesPanel.classList.toggle('visible');
    historyPanel.classList.remove('visible');
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('visible');
    historyPanel.classList.remove('visible');
    templatesPanel.classList.remove('visible');
  });

  // Add close button handlers
  document.querySelectorAll('.close-panel').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.side-panel');
      if (panel) {
        panel.classList.remove('visible');
      }
    });
  });

  // Close panels when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.side-panel') && 
        !e.target.closest('.toolbar-btn')) {
      historyPanel.classList.remove('visible');
      templatesPanel.classList.remove('visible');
      settingsPanel.classList.remove('visible');
    }
  });

  // Escape key to close panels
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      historyPanel.classList.remove('visible');
      templatesPanel.classList.remove('visible');
      settingsPanel.classList.remove('visible');
    }
  });

  // Load history and templates on startup
  loadQueryHistory();
  loadQueryTemplates();
  loadSettings();
});

async function validateApiKey(apiKey) {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'test' }]
        }]
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function addToHistory(entry) {
  const { queryHistory = [] } = await browser.storage.local.get('queryHistory');
  queryHistory.unshift(entry);
  // Keep last 50 queries
  queryHistory.splice(50);
  await browser.storage.local.set({ queryHistory });
}

async function loadQueryHistory() {
  const historyList = document.getElementById('historyList');
  const { queryHistory = [] } = await browser.storage.local.get('queryHistory');
  
  historyList.innerHTML = queryHistory.map(entry => `
    <div class="history-item">
      <div class="history-content">
        <div class="history-query">${entry.query}</div>
        <div class="history-meta">
          <span>${new Date(entry.timestamp).toLocaleString()}</span>
          <span class="history-original">${entry.originalInput}</span>
        </div>
      </div>
      <div class="history-actions">
        <button class="icon-button use-query" title="Use Query">
          <i class="fas fa-arrow-right"></i>
        </button>
        <button class="icon-button save-template" title="Save as Template">
          <i class="fas fa-bookmark"></i>
        </button>
        <button class="icon-button delete-history" title="Delete from History">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Add event listeners to history items
  historyList.querySelectorAll('.use-query').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      input.value = queryHistory[index].originalInput;
      resultDiv.textContent = queryHistory[index].query;
      resultContainer.style.display = 'block';
      resultContainer.classList.add('visible');
    });
  });

  // Add template save functionality
  historyList.querySelectorAll('.save-template').forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      const { queryHistory = [] } = await browser.storage.local.get('queryHistory');
      const entry = queryHistory[index];
      
      // Create template with name
      const templateName = prompt('Enter a name for this template:');
      if (templateName) {
        const { templates = [] } = await browser.storage.local.get('templates');
        templates.push({
          name: templateName,
          query: entry.query,
          originalInput: entry.originalInput,
          created: new Date().toISOString()
        });
        await browser.storage.local.set({ templates });
        loadQueryTemplates();
      }
    });
  });

  // Add delete functionality
  historyList.querySelectorAll('.delete-history').forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this item from history?')) {
        const { queryHistory = [] } = await browser.storage.local.get('queryHistory');
        queryHistory.splice(index, 1);
        await browser.storage.local.set({ queryHistory });
        loadQueryHistory(); // Refresh the history display
      }
    });
  });
}

async function loadQueryTemplates() {
  const templatesList = document.getElementById('templatesList');
  const { templates = [] } = await browser.storage.local.get('templates');
  
  templatesList.innerHTML = templates.map(template => `
    <div class="template-item">
      <div class="template-content">
        <div class="template-name">${template.name}</div>
        <div class="template-query">${template.query}</div>
        <div class="template-meta">
          <span>${new Date(template.created).toLocaleString()}</span>
        </div>
      </div>
      <div class="template-actions">
        <button class="icon-button use-template" title="Use Template">
          <i class="fas fa-arrow-right"></i>
        </button>
        <button class="icon-button delete-template" title="Delete Template">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Add template action listeners
  templatesList.querySelectorAll('.use-template').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      input.value = templates[index].originalInput;
      resultDiv.textContent = templates[index].query;
      resultContainer.style.display = 'block';
      resultContainer.classList.add('visible');
      templatesPanel.classList.remove('visible');
    });
  });

  templatesList.querySelectorAll('.delete-template').forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this template?')) {
        templates.splice(index, 1);
        await browser.storage.local.set({ templates });
        loadQueryTemplates();
      }
    });
  });
}

// Add real-time preview functionality
let previewTimeout;
input.addEventListener('input', () => {
  // ...existing character count code...

  // Add preview functionality
  clearTimeout(previewTimeout);
  previewTimeout = setTimeout(async () => {
    const query = input.value.trim();
    if (query.length > 3) { // Only preview if more than 3 characters
      try {
        const response = await browser.runtime.sendMessage({
          action: 'generatePreview',
          input: query
        });
        
        if (response.preview) {
          const previewDiv = document.getElementById('queryPreview');
          previewDiv.textContent = response.preview;
          previewDiv.style.display = 'block';
        }
      } catch (error) {
        console.error('Preview generation error:', error);
      }
    }
  }, 500); // Delay preview by 500ms to avoid too many API calls
});

// Load and save settings
async function loadSettings() {
  const { settings = defaultSettings } = await browser.storage.local.get('settings');
  updateSettingsUI(settings);
}

async function saveSettings(newSettings) {
  await browser.storage.local.set({ settings: newSettings });
  updateSettingsUI(newSettings);
}

const defaultSettings = {
  maxHistory: 50,
  autoOpenTwitter: true,
  theme: 'system',
  previewEnabled: true
};

// Update settings UI based on current settings
function updateSettingsUI(settings) {
  document.getElementById('maxHistory').value = settings.maxHistory;
  document.getElementById('autoOpenTwitter').checked = settings.autoOpenTwitter;
  document.getElementById('themeSelect').value = settings.theme;
  document.getElementById('previewEnabled').checked = settings.previewEnabled;
}

// Settings form submit handler
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newSettings = {
    maxHistory: parseInt(document.getElementById('maxHistory').value),
    autoOpenTwitter: document.getElementById('autoOpenTwitter').checked,
    theme: document.getElementById('themeSelect').value,
    previewEnabled: document.getElementById('previewEnabled').checked
  };
  await saveSettings(newSettings);
  settingsPanel.classList.remove('visible');
});

// Load settings on startup
loadSettings();