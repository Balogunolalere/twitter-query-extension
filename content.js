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

// Add new message handler for data collection
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'collectTweets') {
        collectTweetsWithScroll().then(tweets => {
            sendResponse({ tweets });
        });
        return true; // Will respond asynchronously
    }
});

async function collectTweetsWithScroll(maxTweets = 1000) {
    const tweets = new Set();
    let lastHeight = 0;
    let noNewTweetsCount = 0;
    const maxNoNewTweets = 3; // Stop if no new tweets after 3 scrolls

    while (tweets.size < maxTweets) {
        // Extract tweets from current view
        const currentTweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
            .map(tweet => {
                const tweetText = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
                const username = tweet.querySelector('[data-testid="User-Name"]')?.textContent || '';
                const timestamp = tweet.querySelector('time')?.getAttribute('datetime') || '';
                const likes = tweet.querySelector('[data-testid="like"]')?.textContent || '0';
                const retweets = tweet.querySelector('[data-testid="retweet"]')?.textContent || '0';
                
                return {
                    text: tweetText,
                    username,
                    timestamp,
                    metrics: {
                        likes,
                        retweets
                    },
                    url: tweet.querySelector('a[href*="/status/"]')?.href
                };
            });

        // Add new tweets to set
        const initialSize = tweets.size;
        currentTweets.forEach(tweet => {
            if (tweet.url) { // Only add tweets with valid URLs
                tweets.add(JSON.stringify(tweet));
            }
        });

        // Check if we got new tweets
        if (tweets.size === initialSize) {
            noNewTweetsCount++;
            if (noNewTweetsCount >= maxNoNewTweets) {
                break;
            }
        } else {
            noNewTweetsCount = 0;
        }

        // Scroll and wait for new content
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 2000));

        // Check if we've hit the bottom
        const newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight) {
            break;
        }
        lastHeight = newHeight;
    }

    return Array.from(tweets).map(t => JSON.parse(t));
}
