# 🤖 AI Agent Platform

A production-ready AI agentic web application that allows users to autonomously perform complex real-world tasks using multi-agent workflows powered by LangChain, LangGraph, and Groq.

![AI Agent Platform](https://img.shields.io/badge/AI-Agent%20Platform-blue)
![LangChain](https://img.shields.io/badge/LangChain-Powered-green)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

## ✨ Features

- **6 Specialized AI Agents** powered by LangGraph workflows
- **Smart Orchestration** with Meta Agent routing
- **Real-time Streaming** responses with SSE
- **Modern UI** with dark mode support
- **Tool Integration** with Tavily, NewsAPI, and Amadeus

## 🤖 Available Agents

| Agent | Description | Tools Used |
|-------|-------------|------------|
| 🤖 **AI Assistant** | Smart orchestrator that routes to specialized agents | Intent detection |
| ✈️ **Travel Planner** | Complete trip planning with flights, hotels & itineraries | Amadeus, Tavily |
| 📰 **News Analyst** | Real-time news with deep summaries & insights | NewsAPI, Tavily |
| 🏃 **Wellness Coach** | Personalized lifestyle & wellness guidance | LLM-based advice |
| 📈 **Market Analyst** | Stock analysis & market intelligence | Tavily Search |
| 💼 **Interview Coach** | Mock interviews with scoring & feedback | LLM-based evaluation |

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **AI Framework**: LangChain + LangGraph
- **LLM Provider**: Groq (free tier)
- **API Server**: Express.js
- **Tools**: Tavily Search, NewsAPI, Amadeus

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Features**: Dark mode, streaming, responsive design

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- API keys for the following services (all free tier available):

| Service | Purpose | Get API Key |
|---------|---------|-------------|
| Groq | LLM Provider | [console.groq.com](https://console.groq.com) |
| Tavily | Web Search | [tavily.com](https://tavily.com) |
| NewsAPI | News Data | [newsapi.org](https://newsapi.org) |
| Amadeus | Flight/Hotel Data | [developers.amadeus.com](https://developers.amadeus.com) |

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Navigate to the project directory
cd "AI Agent App"
```

### 2. Configure Environment Variables

**Backend** - Create `backend/.env`:
```env
# Groq LLM API Key
GROQ_API_KEY=your_groq_api_key_here

# Tavily Search API Key
TAVILY_API_KEY=your_tavily_api_key_here

# NewsAPI Key
NEWS_API_KEY=your_newsapi_key_here

# Amadeus API Credentials
AMADEUS_CLIENT_ID=your_amadeus_client_id_here
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here

# Server Configuration
PORT=3001
NODE_ENV=development
```

**Frontend** - Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Install Dependencies & Run

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the Application

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
AI Agent App/
├── backend/
│   ├── src/
│   │   ├── agents/           # LangGraph agent workflows
│   │   │   ├── travel/       # Travel Planning Agent
│   │   │   ├── news/         # News Analyst Agent
│   │   │   ├── health/       # Wellness Coach Agent
│   │   │   ├── stock/        # Market Analyst Agent
│   │   │   ├── interview/    # Interview Coach Agent
│   │   │   └── meta/         # Meta Orchestrator Agent
│   │   ├── tools/            # Tool integrations
│   │   ├── routes/           # API endpoints
│   │   ├── llm/              # LLM configuration
│   │   └── config/           # Environment config
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API services
│   │   └── types/            # TypeScript types
│   ├── package.json
│   └── .env.example
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/agents` | List all agents |
| POST | `/api/chat` | Send message to agent |
| POST | `/api/chat/stream` | Stream response from agent |
| GET | `/api/history` | Get chat history |

## 💡 Usage Examples

### Travel Planning
```
"Plan a 5-day trip to Paris for 2 people in March with a $3000 budget"
```

### News Analysis
```
"What are the top tech news today? Focus on AI developments"
```

### Wellness Guidance
```
"Help me create a morning routine for better productivity"
```

### Market Analysis
```
"Analyze the current state of AAPL stock with bull and bear cases"
```

### Interview Practice
```
"Practice a senior React developer interview with system design questions"
```

## ⚠️ Disclaimers

- **Health Agent**: Provides general wellness guidance only, not medical advice
- **Stock Agent**: Provides market analysis only, not investment recommendations
- All agents include appropriate disclaimers in their responses

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Built with ❤️ using LangChain, LangGraph, and Next.js
