const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
// Render provides a port via an environment variable. We use a fallback for local testing.
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests to avoid any issues with your frontend.
app.use(cors());

// The main endpoint to handle image downloads
app.get('/download-image', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl) {
        return res.status(400).send('Image URL is required.');
    }

    try {
        // Create headers to mimic a browser request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        // Fetch the image from the external URL with the new headers
        const response = await fetch(imageUrl, { headers });
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // Extract the content type from the response headers
        const contentType = response.headers.get('content-type');
        
        // Set the appropriate headers to force a download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${imageUrl.split('/').pop()}"`);
        
        // Pipe the image data directly to the response
        response.body.pipe(res);

    } catch (error) {
        console.error('Error downloading image:', error);
        res.status(500).send('An error occurred while trying to download the image.');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
