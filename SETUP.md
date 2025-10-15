# Quick Setup Guide

## Prerequisites

1. **Bun** - Install from [bun.sh](https://bun.sh/)
2. **PostgreSQL** - Running instance (local or cloud)
3. **OpenAI API Key** - Get from [platform.openai.com](https://platform.openai.com/)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your credentials
# Required variables:
# - DATABASE_URL: Your PostgreSQL connection string
# - OPENAI_API_KEY: Your OpenAI API key
```

Example `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cogna_db
OPENAI_API_KEY=sk-proj-xxxxx
```

### 3. Setup Database

```bash
# Push schema to database
bun run db:push

# Seed initial validators
bun run db:seed
```

### 4. Start the Server

```bash
bun run dev
```

Server will start on `http://localhost:3000`

## Verify Installation

### Test with curl

```bash
curl -X POST http://localhost:3000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is AI?",
    "answer": "AI stands for Artificial Intelligence, which refers to computer systems that can perform tasks requiring human intelligence.",
    "sources": [
      {
        "url": "https://example.com",
        "content": "Artificial Intelligence (AI) is intelligence demonstrated by machines."
      }
    ]
  }'
```
