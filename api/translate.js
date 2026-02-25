export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, targetLang, context } = req.body;
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

  const contextInfo = context === 'staff_to_customer' 
    ? 'The message is from a beauty salon STAFF replying TO a customer.' 
    : context === 'customer_to_staff'
    ? 'The message is from a CUSTOMER writing TO beauty salon staff.'
    : 'The message is from a beauty salon chat.';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `다음 문장을 ${langName}로 번역해줘. 번역 결과만 출력하고 다른 말은 하지 마.

${contextInfo}

규칙:
- 번역 결과만 출력 (설명, 인사, 답변 금지)
- 美妆 is NOT correct for makeup - always use 化妆 for makeup in Chinese
- MALLANG, PayPal, WeChat, Instagram, 小红书 등 고유명사 유지
- URL, [CENTER], [WECHAT_QR], [DIRECTIONS_BTN], [INSTAGRAM_BTN], [XIAOHONGSHU_BTN] 태그 유지
- 숫자, 가격(₩, won, USD, 円), 날짜, 시간 유지
- 이모지 유지
- 정중한 존댓말 사용

번역할 문장: ${text}`
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
