chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'executeSearch') {
        // Find and populate the search input
        const searchInput = document.querySelector('input[data-testid="SearchBox_Search_Input"]');
        if (searchInput) {
            searchInput.value = request.query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Simulate Enter key press to execute search
            searchInput.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true
            }));
        }
    }
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'executeSearch') {
        // Find and populate the search input
        const searchInput = document.querySelector('input[data-testid="SearchBox_Search_Input"]');
        if (searchInput) {
            searchInput.value = request.query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Simulate Enter key press to execute search
            searchInput.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true
            }));
        }
    }
});
