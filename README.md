# 🚀 AI PostGen - Automated Content Generation Platform

**SEO-optimized article generation powered by Google Gemini AI**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.18-green)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-FREE-purple)](https://ai.google.dev/)

---

## ✨ Features

### 🤖 AI-Powered Generation
- **Google Gemini Pro** - Primary AI provider (FREE)
- **Groq Llama 3.3** - Fallback provider (FREE)  
- Automatic duplicate detection
- Multi-language support (English & Arabic)
- SEO-optimized content (1500+ words)

### 📊 Complete Workflow
1. **Find & Scrape** → Top articles from Google
2. **Extract & Rephrase** → SEO keywords with AI
3. **Generate** → Complete articles with metadata
4. **Review & Edit** → Manual editing or AI regeneration
5. **Schedule & Publish** → Immediate or scheduled publishing

### 🎨 Modern UI/UX
- Custom CSS design (no Tailwind dependency)
- Unique gradient buttons
- Responsive admin dashboard
- Real-time preview
- SEO metadata widgets

### 💯 Smart Features
- Duplicate URL detection
- Automatic keyword extraction
- Internal link generation
- Schema.org markup
- Cost tracking & limits

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Create `.env.local`:
```env
# Google Gemini AI (Primary - FREE)
GOOGLE_API_KEY=your-google-api-key

# Groq AI (Fallback - FREE)  
GROQ_API_KEY=your-groq-api-key

# Database
MONGODB_URI=mongodb://localhost:27017/aipostgen

# Auth
JWT_SECRET=your-secret-key

# Optional: Web Scraping
SERPER_API_KEY=your-serper-key
```

**Get API Keys:**
- **Google Gemini**: https://aistudio.google.com/app/apikey (FREE)
- **Groq**: https://console.groq.com/keys (FREE)
- **Serper**: https://serper.dev/ (2,500 free searches/month)

### 3. Run Development Server
```bash
npm run dev
```

### 4. Login & Start
```
URL: http://localhost:3000/admin/login
Email: admin@example.com
Password: admin123
```

---

## 📋 System Flow

```
1. Search Google → Get top 10 articles
2. Check Database → Skip duplicates
3. Scrape Content → Extract text & metadata
4. Extract Keywords → Google Gemini AI
5. Rephrase Keywords → Natural SEO terms
6. Generate Articles → 1500+ word content
7. Save as Draft → MongoDB
8. Manual Review → Edit or regenerate
9. Publish → Immediate or scheduled
```

---

## 🎨 UI/UX Highlights

### Unique Button Designs
- **Gradient animations** with shimmer effects
- **Hover transformations** (lift & shadow)
- **Color-coded actions** (Primary, Success, Danger, AI)
- **Disabled states** with visual feedback

### Modern Article Editor
- **Tab-based interface** (Edit, Preview, SEO)
- **Real-time markdown preview**
- **Syntax-highlighted code blocks**
- **Responsive grid layout**

### Admin Dashboard
- **Gradient sidebar** with smooth transitions
- **Stats cards** with hover effects
- **Filter tabs** for article status
- **Data tables** with row hover

---

## 💰 Cost (100% FREE)

### Google Gemini Free Tier
- **60 requests/minute**
- **1,500 requests/day**
- **1 million tokens/month**
- **~250 articles/month** for FREE

### Groq Free Tier
- **14,400 requests/day**
- **100% FREE** forever
- Faster than most paid APIs

### Total Cost
```
Per Article:   $0.00 (FREE)
100 Articles:  $0.00 (FREE)
1000 Articles: $0.00 (FREE with limits)
```

---

## 📁 Project Structure

```
aipostgen/
├── src/
│   ├── app/
│   │   ├── admin/              # Admin pages
│   │   │   ├── article/        # Edit & view pages
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── drafts/         # Draft articles
│   │   │   └── published/      # Published articles
│   │   └── api/                # API routes
│   │       ├── articles/       # Article CRUD
│   │       ├── generate/       # AI generation
│   │       └── auto-dentist/   # Auto flow
│   ├── components/             # React components
│   ├── lib/
│   │   ├── llm/               # AI providers
│   │   │   ├── provider.ts    # Main provider
│   │   │   └── prompt.ts      # Prompts
│   │   ├── db/                # MongoDB models
│   │   ├── queue/             # BullMQ jobs
│   │   ├── scrape/            # Web scraping
│   │   └── seo/               # SEO utilities
│   └── styles/
│       ├── admin.css          # Admin styles
│       ├── article.css        # Article pages
│       └── components.css     # Components
├── workers/                    # Background jobs
│   ├── generate.ts            # Article generation
│   ├── scrape.ts              # Web scraping
│   └── updateArticle.ts       # Updates
└── scripts/                    # CLI scripts
    └── autoDentistFlow.ts     # Auto generation
```

---

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - Login

### Articles
- `GET /api/articles/draft/[id]` - Get draft
- `PUT /api/articles/[id]/update` - Update article
- `POST /api/articles/draft/[id]/publish` - Publish
- `POST /api/articles/draft/[id]/schedule` - Schedule
- `POST /api/articles/draft/[id]/reject` - Reject

### Generation
- `POST /api/auto-dentist` - Auto generation flow
- `POST /api/generate` - Generate single article

### Utilities
- `GET /api/test-gpt` - Test AI providers
- `GET /api/sources/list` - List sources
- `POST /api/keywords/import` - Import keywords

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5** - React framework
- **TypeScript 5.9** - Type safety
- **Custom CSS** - Modern design system
- **React Markdown** - Content rendering

### Backend
- **Next.js API Routes** - Serverless functions
- **MongoDB 8.18** - Database
- **BullMQ** - Job queue (Redis)
- **JWT** - Authentication

### AI & Tools
- **Google Gemini Pro** - Primary AI (FREE)
- **Groq Llama 3.3** - Fallback AI (FREE)
- **Serper API** - Google search
- **Cheerio** - Web scraping

---

## 🎮 Usage

### Auto Generate (Recommended)
1. Login to admin panel
2. Go to Dashboard
3. Click "Generate Blog Dentist" tab
4. Click "🚀 Start Auto Generation"
5. Wait 2-3 minutes
6. Review drafts
7. Edit or publish

### Manual Generate
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "AI in dentistry",
    "language": "en",
    "wordCount": 1500
  }'
```

---

## 🔒 Security Features

- ✅ No hardcoded API keys
- ✅ Environment variables only
- ✅ JWT authentication
- ✅ Input validation (Zod)
- ✅ Error handling
- ✅ Rate limiting
- ✅ XSS protection

---

## 📊 Key Features

### Duplicate Prevention
- Checks database before scraping
- Skips existing URLs automatically
- Searches multiple pages if needed
- Always returns unique articles

### SEO Optimization
- Meta title & description
- Keywords optimization
- Schema.org markup
- Internal linking
- 1500+ word articles
- FAQ sections

### Smart Generation
- Context-aware prompts
- Multi-language support
- Custom instructions
- AI regeneration
- Quality validation

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel
# Add environment variables in dashboard
vercel --prod
```

### Docker
```bash
docker build -t aipostgen .
docker run -p 3000:3000 aipostgen
```

### PM2
```bash
npm run build
pm2 start npm --name aipostgen -- start
```

---

## 📝 Environment Variables

### Required
```env
GOOGLE_API_KEY=           # Google Gemini API
MONGODB_URI=              # MongoDB connection
JWT_SECRET=               # Auth secret
```

### Optional
```env
GROQ_API_KEY=             # Groq fallback
SERPER_API_KEY=           # Google search
REDIS_URL=                # Job queue
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file

---

## 🎯 Status

✅ **Production Ready**  
✅ **100% FREE AI**  
✅ **Modern UI/UX**  
✅ **No Tailwind**  
✅ **Fully Documented**

---

## 📞 Support

- **Issues**: https://github.com/yourrepo/issues
- **Discussions**: https://github.com/yourrepo/discussions

---

## 🌟 Highlights

- 🎨 **Unique UI Design** - Custom CSS with gradient buttons
- 🤖 **100% FREE AI** - Google Gemini + Groq
- 🚫 **No Duplicates** - Smart URL detection
- 📊 **Complete Dashboard** - Stats, filters, actions
- ✏️ **Rich Editor** - Markdown with live preview
- 🔄 **Auto Generation** - End-to-end automation
- 🌐 **Multilingual** - English & Arabic support
- 📱 **Responsive** - Mobile-friendly admin
- ⚡ **Fast** - Optimized performance
- 🔒 **Secure** - Production-ready

---

**Start generating articles for FREE! 🚀**

```bash
npm install
# Add GOOGLE_API_KEY to .env.local
npm run dev
```
#   A i P o s t G e n  
 #   A i P o s t G e n  
 