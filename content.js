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
                
                // Fix username extraction
                const userNameElement = tweet.querySelector('[data-testid="User-Name"]');
                const displayName = userNameElement?.querySelector('span')?.textContent || '';
                const username = userNameElement?.textContent.match(/@[\w]+/)?.[0] || '';
                
                const timestamp = tweet.querySelector('time')?.getAttribute('datetime') || '';
                const likes = tweet.querySelector('[data-testid="like"]')?.textContent || '0';
                const retweets = tweet.querySelector('[data-testid="retweet"]')?.textContent || '0';
                
                // Enhanced media extraction
                const media = {
                    images: [],
                    videos: [],
                    gifs: [],
                    links: []
                };

                // Find all media containers
                const mediaContainers = tweet.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="tweetGif"]');
                
                mediaContainers.forEach(container => {
                    // Handle images
                    const image = container.querySelector('img[src*="/media/"]');
                    if (image) {
                        media.images.push({
                            url: image.src.replace(/\&name=.+$/, '&name=orig'), // Get original size
                            alt: image.alt
                        });
                    }

                    // Handle videos
                    const video = container.querySelector('video');
                    if (video) {
                        const videoData = {
                            url: video.src,
                            poster: video.poster,
                            duration: video.duration,
                            type: 'video'
                        };

                        // Check if it's a GIF
                        if (container.getAttribute('data-testid') === 'tweetGif') {
                            videoData.type = 'gif';
                            media.gifs.push(videoData);
                        } else {
                            media.videos.push(videoData);
                        }
                    }

                    // Handle video players without direct video element
                    const playButton = container.querySelector('[data-testid="playButton"]');
                    if (playButton && !video) {
                        const posterImage = container.querySelector('img');
                        media.videos.push({
                            poster: posterImage?.src,
                            type: 'video',
                            needsExpansion: true, // Indicates video needs to be clicked to load
                            url: container.closest('a')?.href
                        });
                    }
                });

                // Extract external links
                const links = Array.from(tweet.querySelectorAll('a[href]:not([href*="/status/"]):not([href^="#"]):not([href*="/media/"])'));
                media.links = links.map(link => ({
                    url: link.href,
                    text: link.textContent,
                    isCard: link.closest('[data-testid="card.wrapper"]') !== null
                })).filter(link => !link.url.includes('/hashtag/') && !link.url.includes('/search?q='));

                // Get quote tweet if present
                const quoteTweet = tweet.querySelector('div[data-testid="quotedTweet"]');
                const quoteTweetData = quoteTweet ? {
                    text: quoteTweet.querySelector('[data-testid="tweetText"]')?.textContent,
                    author: quoteTweet.querySelector('[data-testid="User-Name"]')?.textContent,
                    link: quoteTweet.querySelector('a[href*="/status/"]')?.href,
                    hasMedia: quoteTweet.querySelector('[data-testid="tweetPhoto"], [data-testid="videoPlayer"]') !== null
                } : null;
                
                return {
                    text: tweetText,
                    displayName,
                    username,
                    timestamp,
                    metrics: {
                        likes,
                        retweets
                    },
                    url: tweet.querySelector('a[href*="/status/"]')?.href,
                    media,
                    quoteTweet: quoteTweetData,
                    isRetweet: !!tweet.querySelector('[data-testid="socialContext"]'),
                    hasMedia: Object.values(media).some(arr => arr.length > 0)
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
