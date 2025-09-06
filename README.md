<div align="center">
  <h1>Eleven11 – Spot. Detect. Protect.</h1>
  <p>
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
    <img src="https://img.shields.io/badge/Python-3.10+-blue?style=flat&logo=python" alt="Python 3.10+">
    <img src="https://img.shields.io/badge/Backend-Flask-black?style=flat&logo=flask" alt="Backend: Flask">
    <img src="https://img.shields.io/badge/Frontend-React-blue?style=flat&logo=react" alt="Frontend: React">
    <img src="https://img.shields.io/badge/Model-YOLOv8-blueviolet?style=flat" alt="Model: YOLOv8">
    <img src="https://img.shields.io/badge/Styling-TailwindCSS-cyan?style=flat&logo=tailwindcss" alt="Styling: TailwindCSS">
    <img src="https://img.shields.io/badge/Feature-Multilingual-green?style=flat" alt="Multilingual Support">
    <img src="https://img.shields.io/badge/Feature-TTS-orange?style=flat" alt="Text-to-Speech">
  </p>
</div>


##  Overview

**Eleven11** is a web-based safety gear detection platform that uses a YOLOv8 model to identify **O₂ cylinders**, **toolkits**, and **fire extinguishers** from uploaded images or live video feeds.  
It supports real-time detection, multilingual user interface, text-to-speech alerts, and a detection summary panel for enhanced usability in high-stakes environments like space stations.

##  Demo
https://drive.google.com/file/d/1OlAeJzVPzBKHzg_n6E8b3zvB2-Cpm8P9/view?usp=sharing

##  Features

-  **Real-time Object Detection**
-  **Multilingual UI** (English, Hindi, Spanish, French, Chinese, Arabic, Russian, German)
-  **Text-to-Speech (TTS)** Alerts using Web Speech API
-  **Detection Summary Panel**
-  Upload / Live Camera Detection
-  Clean UI with external labels and confidence scores
-  Fully responsive design

##  Setup Instructions

###  Backend

```bash
cd backend
pip install -r requirements.txt


## Setup Instructions

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Place your YOLO model weights in `model weights/best.pt`

4. Start the backend server:
   ```bash
   python main.py
   ```
   Backend will be available at http://localhost:5000

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   Frontend will be available at http://localhost:3000

## Usage
1. Start both backend and frontend servers
2. Open http://localhost:3000 in your browser
3. Upload an image or use camera to capture
4. Click "RUN DETECTION" to analyze safety equipment
5. View results with enhanced bounding boxes and confidence scores

## Tech Stack
### Frontend
- **React.js**: Modern UI framework
- **TailwindCSS**: Utility-first styling
- **Lucide Icons**: Modern icon library
- **Canvas API**: Enhanced detection visualization

### Backend
- **Python 3.10+**: Core programming language
- **Flask**: Web framework for REST API
- **YOLOv8 (Ultralytics)**: Custom-trained object detection model
- **OpenCV**: Image processing and annotation
- **PIL**: Image handling and manipulation

## API Endpoints
- `GET /` - Health check endpoint
- `POST /detect` - Image detection endpoint

### POST /detect
Uploads an image file and returns detection results with annotated image.

**Response Format:**
```json
{
  "detections": [
    {
      "class_name": "ToolBox",
      "confidence": 0.85,
      "bbox": [x, y, width, height]
    }
  ],
  "annotated_image": "data:image/jpeg;base64,..."
}
```

## Project Structure
```
eleven11/
├── backend/
├── frontend/
│   ├── node_modules/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── i18n/ # Multilingual support config (translations folder)
│       ├── lib/
│       └── pages/
├── model weights/ # Trained YOLOv8 weight file

```
<div align="center">
  <h4> made with ‪‪❤︎‬ by team 11:11 crew !!</h4>
</div>
