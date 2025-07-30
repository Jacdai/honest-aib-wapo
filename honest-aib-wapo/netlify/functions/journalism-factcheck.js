const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { articleText } = JSON.parse(event.body);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'OpenAI API key is not configured.' }) };
    }

    // NEW PROMPT: All score and confidence integer fields have been removed.
    const prompt = `
        Analyze the following news article text as the "Honest AIB" integrity engine, based on the Pearlstone Integrity Protocol (PIP). Focus on verifiable facts and observable bias. Do not invent numerical scores.

        Article Text:
        """
        ${articleText}
        """

        Your response MUST be a JSON object with the following exact structure. Do not include any text outside of this JSON object.

        {
            "botAnalysis": {
                "riskLevel": "<string, 'LOW', 'MEDIUM', or 'HIGH'>"
            },
            "claimsAnalysis": [
                {
                    "text": "<string, the specific claim identified>",
                    "verdict": "<string, 'VERIFIED TRUE', 'VERIFIED FALSE', 'MISLEADING', or 'UNVERIFIABLE'>",
                    "reasoning": "<string, brief, factual reasoning for the verdict, citing verifiable logic or a source type like 'historical record' or 'scientific consensus'>"
                }
            ],
            "biasAnalysis": {
                "overallAssessment": "<string, summary of observable bias>",
                "flags": [
                    {
                        "type": "<string, 'Loaded Language', 'Missing Context', or 'Framing'>",
                        "description": "<string, explanation of the bias flag with a quote from the text>"
                    }
                ]
            }
        }
    `;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1, // Lower temperature for more deterministic, factual output
                response_format: { "type": "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            return { statusCode: 502, body: JSON.stringify({ error: 'Failed to get a valid response from AI model.' }) };
        }

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);

        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Handler Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'An internal error occurred.' }) };
    }
};