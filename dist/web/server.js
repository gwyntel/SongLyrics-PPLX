"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const lyrics_service_1 = require("../services/lyrics.service");
const dotenv = __importStar(require("dotenv"));
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
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Initialize LyricsService
const lyricsService = new lyrics_service_1.LyricsService(process.env.OPENROUTER_API_KEY, process.env.YOUR_SITE_URL, process.env.YOUR_APP_NAME || 'SongLyrics-PPLX', process.env.APIFY_API_KEY);
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname)));
// Route handlers
const handleRoot = (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'index.html'));
};
const handleLyricsSearch = async (req, res) => {
    const { query } = req.body;
    if (!query) {
        res.status(400).json({ error: 'Query is required' });
        return;
    }
    try {
        const lyrics = await lyricsService.getLyrics(query);
        res.json(lyrics);
    }
    catch (error) {
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
exports.default = server;
