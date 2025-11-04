import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: Check if API keys are configured
  console.log('\n🔍 Testing API Configuration...\n');
  
  const groqKey = process.env.GROQ_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  
  console.log('Google Gemini API Key:', googleKey ? 'Loaded' : 'Missing');
  console.log('Groq API Key:', groqKey ? 'Loaded' : 'Missing');
  
  results.tests.apiKeys = {
    google: googleKey ? '✅ Configured' : '❌ Missing',
    groq: groqKey ? '✅ Configured' : '❌ Missing'
  };

  // Test 2: Try Groq
  if (groqKey) {
    try {
      console.log('🤖 Testing Groq API...');
      const groq = new Groq({ apiKey: groqKey });
      
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say 'Groq API is working!' in one sentence." }
        ],
        max_tokens: 50,
        temperature: 0.7,
      });

      const message = response.choices[0].message?.content;
      results.tests.groq = {
        status: '✅ Success',
        model: 'llama-3.3-70b-versatile',
        message,
        usage: response.usage
      };
      console.log('✅ Groq test passed!');
    } catch (err: any) {
      results.tests.groq = {
        status: '❌ Failed',
        error: err.message,
        code: err.code || err.status
      };
      console.error('❌ Groq test failed:', err.message);
    }
  }

  // Test 3: Try Google Gemini (Primary)
  if (googleKey) {
    try {
      console.log('🤖 Testing Google Gemini API...');
      const genAI = new GoogleGenerativeAI(googleKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Say 'Google Gemini API is working!' in one sentence." }] }],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.7,
        },
      });

      const message = result.response.text();
      results.tests.google = {
        status: '✅ Success',
            model: 'gemini-2.5-flash',
        message,
        note: '🎉 FREE & High Quality!'
      };
      console.log('✅ Google Gemini test passed!');
    } catch (err: any) {
      results.tests.google = {
        status: '❌ Failed',
        error: err.message,
        code: err.code || err.status
      };
      console.error('❌ Google Gemini test failed:', err.message);
    }
  }

  // Summary
  const hasGroq = results.tests.groq?.status === '✅ Success';
  const hasGoogle = results.tests.google?.status === '✅ Success';
  
  results.summary = {
    overall: (hasGroq || hasGoogle) ? '✅ At least one provider working' : '❌ No providers working',
    recommendation: hasGoogle
      ? '🎉 Google Gemini is working - FREE & High Quality!'
      : hasGroq 
        ? '✅ Groq is working - FREE & Fast!'
        : '❌ Configure at least one API key',
    cost: hasGoogle || hasGroq ? 'FREE' : 'N/A',
    providers: {
      primary: hasGoogle ? 'Google Gemini ✅' : 'Not configured',
      fallback: hasGroq ? 'Groq ✅' : 'Not configured'
    }
  };

  console.log('\n📊 Test Summary:', results.summary.overall);
  
  return NextResponse.json(results, { 
    status: (hasGroq || hasGoogle) ? 200 : 500 
  });
}
