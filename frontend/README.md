# Informatica to DBT Converter - Frontend

A beautiful, modern React dashboard for converting Informatica XML files to DBT models.

## Features

- 🎨 **Dark/Light Mode** - Beautiful theme switcher with smooth transitions
- 📁 **Drag & Drop Upload** - Easy XML file upload with visual feedback
- ⚙️ **Conversion Settings** - Configure format type (PowerCenter/IMX) and LLM provider
- 📝 **Monaco Editor** - Professional code editor for viewing/editing DBT models
- 💾 **Download Options** - Download individual models or all results as ZIP
- 🚀 **Real-time Processing** - Live conversion status with progress indicators
- ✨ **Modern UI** - Gradient backgrounds, glassmorphism effects, and smooth animations

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API running on `http://localhost:8000` (see backend setup)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` if your backend runs on a different URL:
```
REACT_APP_API_URL=http://localhost:8000
```

## Running the Application

Start the development server:
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Usage

1. **Upload XML Files**
   - Drag and drop XML files or click to browse
   - Supports both PowerCenter and IMX formats

2. **Configure Settings**
   - Select format type (PowerCenter or IMX)
   - Choose LLM provider (OpenAI, Triton, or Stub)
   - Toggle "Skip LLM" for metadata-only conversion

3. **Generate Models**
   - Click "Generate DBT Models" to process files
   - View conversion progress in real-time

4. **View & Download**
   - Click on generated models to view in Monaco Editor
   - Download individual models or all results as ZIP

## API Integration

The frontend communicates with the FastAPI backend through:

- `POST /convert` - Convert XML files to DBT models
- `GET /download/{job_id}` - Download conversion results
- `DELETE /cleanup/{job_id}` - Clean up temporary files

See [src/services/api.js](src/services/api.js) for full API implementation.

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Technologies Used

- **React** - UI framework
- **Tailwind CSS** - Styling and theming
- **Monaco Editor** - Code editor component
- **Axios** - HTTP client
- **React Icons** - Icon library

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.js      # Main dashboard component
│   │   └── FileUpload.js     # File upload component
│   ├── services/
│   │   └── api.js            # API service layer
│   ├── App.js                # Root component
│   └── index.css             # Global styles
├── public/                   # Static assets
├── .env                      # Environment variables
└── package.json              # Dependencies
```

## Troubleshooting

**CORS Errors:**
- Ensure backend has CORS configured for `http://localhost:3000`
- Check that backend is running on the correct port

**API Connection Failed:**
- Verify `REACT_APP_API_URL` in `.env` matches your backend URL
- Restart the development server after changing `.env`

**File Upload Issues:**
- Only `.xml` files are accepted
- Check file size limits in backend configuration

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
