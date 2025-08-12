const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests
app.use(cors());

// The browser instance is launched once at startup to save resources
let browser;

const initializeBrowser = async () => {
    try {
        browser = await puppeteer.launch({
            // Use an environment variable for the executable path,
            // which Render provides for a pre-installed Chromium
            executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Puppeteer browser launched successfully.');
    } catch (error) {
        console.error('Failed to launch browser:', error);
        process.exit(1);
    }
};

initializeBrowser();

// The main endpoint to handle image downloads
app.get('/download-image', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl) {
        return res.status(400).send('Image URL is required.');
    }

    if (!browser) {
        return res.status(503).send('Browser is not yet initialized. Please try again in a moment.');
    }

    let page;
    try {
        page = await browser.newPage();
        
        // Block unnecessary requests to speed up page load
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.resourceType() === 'document' || request.resourceType() === 'image') {
                request.continue();
            } else {
                request.abort();
            }
        });

        const response = await page.goto(imageUrl, { waitUntil: 'domcontentloaded' });
        
        if (!response || !response.ok()) {
            throw new Error(`Failed to navigate to image URL: ${response ? response.status() : 'No response'}`);
        }

        // Get the image buffer
        const imageBuffer = await response.buffer();
        
        // Extract the content type from the response headers
        const contentType = response.headers()['content-type'];
        
        // Set the appropriate headers to force a download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${imageUrl.split('/').pop()}"`);
        
        // Send the image buffer as the response
        res.send(imageBuffer);

    } catch (error) {
        console.error('Error downloading image with Puppeteer:', error);
        res.status(500).send('An error occurred while trying to download the image.');
    } finally {
        if (page) {
            await page.close();
        }
    }
});

// Endpoint to check if the server is running
app.get('/', (req, res) => {
    res.send('Image proxy server is running.');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Puppeteer-based proxy server running on port ${PORT}`);
});
