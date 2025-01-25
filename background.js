const PROMPT_TEMPLATE = `Convert this natural language query into a comprehensive Twitter Advanced Search query. Use these operators:

Basic Search Operators:
- keywords (space between words means AND)
- "exact phrase match" (use quotes)
- OR between terms (parentheses grouping)
- - before term to exclude (e.g. -filter:retweets)
- #hashtag
- @mentions
- $cashtag

User Filters:
- from:username (tweets from account)
- to:username (replies to account)
- (@username) (mentions of account)

Content Filters:
- filter:media (has media)
- filter:images (has images)
- filter:twimg (native images)
- filter:videos (has videos)
- filter:links (has links)
- filter:replies (only replies)
- -filter:replies (exclude replies)
- filter:quote (quote tweets)
- filter:retweets (only retweets)
- -filter:retweets (exclude retweets)
- ? (contains question)

Engagement Filters:
- min_retweets:number
- min_faves:number
- min_replies:number
- is:verified (from verified accounts)

Time and Location:
- since:YYYY-MM-DD
- until:YYYY-MM-DD
- near:location
- within:Xmi/km (radius)

Language:
- lang:xx (e.g. lang:en for English)

Combine multiple operators to create precise searches. For example:
"breaking news" from:reuters filter:links -filter:replies lang:en

Return ONLY the optimized search query without explanations.

Input: {INPUT}`;

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateQuery') {
    generateQuery(request.input)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
    return true;  // Will respond asynchronously
  }
});

async function generateQuery(input) {
  try {
    const { apiKey } = await browser.storage.sync.get('apiKey');
    if (!apiKey) {
      throw new Error('Please set your Gemini API key in the extension settings');
    }

    const fullPrompt = PROMPT_TEMPLATE.replace('{INPUT}', input);
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid API response format');
    }

    return {
      query: data.candidates[0].content.parts[0].text.trim()
    };
  } catch (error) {
    console.error('Query generation error:', error);
    throw new Error(`Failed to generate query: ${error.message}`);
  }
}