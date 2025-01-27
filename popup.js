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
      alert('Please enter a valid API key');
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
      alert(`Error: ${error.message}`);
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