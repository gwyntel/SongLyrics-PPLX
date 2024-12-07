import express, { Request, Response, RequestHandler } from 'express';
import path from 'path';
import { LyricsService } from '../services/lyrics.service';
import * as dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    'OPENROUTER_API_KEY',
    'YOUR_SITE_URL',
    'APIFY_API_KEY'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

const app = express();
const port = process.env.PORT || 3000;

// Initialize LyricsService
const lyricsService = new LyricsService(
    process.env.OPENROUTER_API_KEY!,
    process.env.YOUR_SITE_URL!,
    process.env.YOUR_APP_NAME || 'SongLyrics-PPLX',
    process.env.APIFY_API_KEY!
);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Type definitions
interface LyricsRequest extends Request {
    body: {
        query: string;
    };
}

// Route handlers
const handleRoot: RequestHandler = (_req: Request, res: Response): void => {
    res.sendFile(path.join(__dirname, 'index.html'));
};

const handleLyricsSearch: RequestHandler = async (req: LyricsRequest, res: Response): Promise<void> => {
    const { query } = req.body;
    
    if (!query) {
        res.status(400).json({ error: 'Query is required' });
        return;
    }

    try {
        const lyrics = await lyricsService.getLyrics(query);
        res.json(lyrics);
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        res.status(500).json({ error: 'Failed to fetch lyrics' });
    }
};

// Routes
app.get('/', handleRoot);
app.post('/api/lyrics', handleLyricsSearch);

// Start server
const server = app.listen(port, () => {
    console.log(`Web server running at http://localhost:${port}`);
});

export default server;
