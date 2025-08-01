const express = require('express');
const path = require('path');
const processGpxHandler = require('./api/process-gpx');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('.'));
app.use(express.json());

// API endpoint
app.post('/api/process-gpx', async (req, res) => {
    console.log('API endpoint called via Express');
    try {
        await processGpxHandler(req, res);
    } catch (error) {
        console.error('Error in API handler:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${__dirname}`);
    console.log(`🔧 API endpoint: http://localhost:${PORT}/api/process-gpx`);
}); 