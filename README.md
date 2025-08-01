# GPX Noise Removal

A web application to remove noise from GPX files for perfect Strava uploads.

## Features

- Upload GPX files and clean GPS noise
- Optimize tracks for Strava compatibility
- Web-based interface for easy file processing
- Serverless deployment on Vercel

## Project Structure

- `gpx_cleaner_frontend.js` - Frontend JavaScript for the web interface
- `gpx_processor_api.js` - Backend API for GPX processing
- `index.html` - Main HTML file for the web application
- `package.json` - Node.js dependencies and scripts
- `vercel.json` - Vercel deployment configuration

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Vercel CLI (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/2ta/gpx-noise-removal.git
cd gpx-noise-removal
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

### Deployment

This project is configured for deployment on Vercel. To deploy:

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

## Usage

1. Open the web application in your browser
2. Upload a GPX file
3. The application will process the file and remove GPS noise
4. Download the cleaned GPX file
5. Upload to Strava for perfect tracking

## Technologies Used

- **Frontend**: Vanilla JavaScript, HTML5
- **Backend**: Node.js, Vercel Functions
- **File Processing**: xml2js, formidable
- **Deployment**: Vercel

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Author

GPX Cleaner 