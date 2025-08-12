const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests
app.use(cors());

let browser;

const initializeBrowser = async () => {
    try {
        browser = await puppeteer.launch({
            // Puppeteer will now automatically download a compatible Chromium
            // and find its path. The no-sandbox flag is required for Render.
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

        const imageBuffer = await response.buffer();
        
        const contentType = response.headers()['content-type'];
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${imageUrl.split('/').pop()}"`);
        
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

app.get('/', (req, res) => {
    res.send('Image proxy server is running.');
});

app.listen(PORT, () => {
    console.log(`Puppeteer-based proxy server running on port ${PORT}`);
});
