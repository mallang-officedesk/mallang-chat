export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, targetLang } = req.body;
  if (!text || !targetLang) return res.status(400).json({ error: 'Missing text or targetLang' });

  // 한국어→한국어는 번역 불필요
  if (targetLang === 'ko') {
    // 원문이 한국어인지 간단 체크 (한글 포함 여부)
    const hasKorean = /[가-힣]/.test(text);
    if (hasKorean) return res.status(200).json({ translated: text });
  }

  const langMap = {
    ko: 'Korean',
    en: 'English', 
    zh: 'Chinese (Simplified)',
    ja: 'Japanese',
    th: 'Thai',
    vi: 'Vietnamese'
  };
  const langName = langMap[targetLang] || 'English';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `Translate the following text to ${langName}. Output ONLY the translation, nothing else.

CRITICAL RULES:
- Translate word-for-word as accurately as possible
- NEVER add your own words, explanations, responses, or interpretations
- NEVER answer or respond to the message - just translate it
- For example: "在吗" → "계세요?" (NOT an answer to the question)
- Keep proper nouns unchanged: MALLANG, PayPal, WeChat, Instagram, 小红书
- Keep all URLs, links, tags like [CENTER], [WECHAT_QR], [DIRECTIONS_BTN], [INSTAGRAM_BTN], [XIAOHONGSHU_BTN] unchanged
- Keep numbers, prices (₩, won, USD, 円), dates, times unchanged
- Keep emoji unchanged
- If already in ${langName}, return unchanged
- Use polite/formal tone`
          },
          {
            role: 'user',
            content: text
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const translated = data.choices?.[0]?.message?.content?.trim() || text;
    return res.status(200).json({ translated });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
