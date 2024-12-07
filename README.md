# SongLyrics Project

A TypeScript-based lyrics search service using Genius API and AI-powered enhancements.

## Configuration

### Environment Variables

The application uses the following environment variables:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
GENIUS_API_KEY=your_genius_api_key
SITE_URL=https://your-site-url.com
APP_NAME=SongLyrics

# Optional - Helicone Integration
HELICONE_ENABLED=false
HELICONE_API_KEY=your_helicone_api_key
```

### Helicone Integration

This project supports optional Helicone monitoring for LLM API requests. Helicone provides:
- Request logging and analytics
- Cost tracking
- Performance monitoring

To enable Helicone:

1. Sign up at [Helicone](https://www.helicone.ai)
2. Get your API key
3. Set environment variables:
   ```bash
   HELICONE_ENABLED=true
   HELICONE_API_KEY=your_helicone_api_key
   ```

#### Heroku Deployment

To configure Helicone on Heroku:

```bash
heroku config:set HELICONE_ENABLED=true
heroku config:set HELICONE_API_KEY=your_helicone_api_key
```

## Installation & Usage

[Rest of existing README content...]
