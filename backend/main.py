from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from ultralytics import YOLO
import numpy as np
import cv2
from PIL import Image
import io
import os
import base64

app = Flask(__name__)
CORS(app)

from flask_cors import CORS

# Load YOLOv8 model - Docker-compatible path
CORS(app)
model_path = os.path.join("model_weights", "best.pt")
if not os.path.exists(model_path):
    # Fallback to original path structure
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model weights", "best.pt")

print(f"Loading model from: {model_path}")
if os.path.exists(model_path):
    model = YOLO(model_path)
    print("✅ Model loaded successfully")
else:
    print("❌ Model file not found!")
    model = None

@app.route('/detect', methods=['POST'])
def detect_gear():
    print('--- /detect endpoint called ---')
    import traceback
    try:
        if model is None:
            print('Model is not loaded!')
            return jsonify({'error': 'Model not loaded on server'}), 500

        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        image_file = request.files['image']
        image_bytes = image_file.read()
        image_np = np.array(Image.open(io.BytesIO(image_bytes)).convert('RGB'))

        # Run detection
        results = model(image_np)[0]

        # Extract bounding boxes and labels
        detections = []
        annotated_img = image_np.copy()

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            conf = float(box.conf[0])

            # Convert x1,y1,x2,y2 to x,y,width,height format for frontend
            width = x2 - x1
            height = y2 - y1

            detections.append({
                "class_name": label,
                "confidence": conf,
                "bbox": [x1, y1, width, height]
            })

            # Draw boxes on the image
            color = (0, 255, 0)
            cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated_img, f'{label} {conf:.2f}', (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Save annotated image to buffer
        _, img_encoded = cv2.imencode('.jpg', annotated_img)
        img_bytes = img_encoded.tobytes()

        return {
            "detections": detections,
            "annotated_image": "data:image/jpeg;base64," + 
                base64.b64encode(img_bytes).decode('utf-8')
        }
    except Exception as e:
        print('Exception in /detect:', e)
        print(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for deployment platforms"""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "timestamp": os.environ.get('DEPLOYMENT_TIME', 'unknown')
    })

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        "message": "Eleven11 Detection API",
        "version": "1.0",
        "endpoints": ["/detect", "/health"]
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
