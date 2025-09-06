import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Camera, X, Download, AlertCircle, CheckCircle, Loader2, ZoomIn, Activity, Terminal, Scan } from 'lucide-react';
import Webcam from 'react-webcam';
import useTTS from '../hooks/useTTS';
import AudioControl from '../components/AudioControl';
import DetectionSummaryPanel from '../components/DetectionSummaryPanel';


const Detection = () => {
  // All hooks at the top
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectionResults, setDetectionResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [systemStatus, setSystemStatus] = useState('READY');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isRealTimeDetection, setIsRealTimeDetection] = useState(false);
  const [realtimeDetections, setRealtimeDetections] = useState([]);
  const { t } = useTranslation();
  const { announceDetection, announceStatus, announceWarning, isSupported, isSpeaking } = useTTS();
  const fileInputRef = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamCanvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Use localhost for local backend (not Docker)
  const BACKEND_URL = 'http://localhost:5000';

  // Helper: send a webcam frame to backend for detection
  const sendWebcamFrameForDetection = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    // Convert base64 to blob
    const res = await fetch(imageSrc);
    const blob = await res.blob();
    const file = new File([blob], 'webcam-live.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`${BACKEND_URL}/detect`, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const result = await response.json();
        setDetectionResults(result);
        setRealtimeDetections(result.detections || []);
      }
    } catch (err) {
      // Optionally handle error
    }
  }, [webcamRef, BACKEND_URL]);

  // Live detection: start interval when webcam is shown and real-time detection is enabled
  useEffect(() => {
    if (showCamera && isRealTimeDetection) {
      detectionIntervalRef.current = setInterval(() => {
        sendWebcamFrameForDetection();
      }, 1000); // 1 FPS, adjust as needed
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [showCamera, isRealTimeDetection, sendWebcamFrameForDetection]);

  // Simulate system initialization
  useEffect(() => {
    const initSequence = [t('detection.status.initializing'), t('detection.status.loading_models'), t('detection.status.calibrating'), t('detection.status.ready')];
    let currentStep = 0;
    const initInterval = setInterval(() => {
      if (currentStep < initSequence.length - 1) {
        currentStep++;
        setSystemStatus(initSequence[currentStep]);
      } else {
        clearInterval(initInterval);
      }
    }, 800);
    return () => clearInterval(initInterval);
  }, [t]);

  // Redraw canvas when detection results change
  useEffect(() => {
    if (detectionResults && detectionResults.detections && detectionResults.detections.length > 0 && imagePreview) {
      setTimeout(() => {
        drawBoundingBoxes(detectionResults.detections);
      }, 200);
    }
  }, [detectionResults, imagePreview]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError(null);
      setDetectionResults(null);
      setSystemStatus('FILE_LOADED');
    }
  };

  // Handle webcam capture
  const captureImage = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Convert base64 to blob
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
          setSelectedImage(file);
          setImagePreview(imageSrc);
          setShowCamera(false);
          setError(null);
          setDetectionResults(null);
          setSystemStatus('CAPTURE_COMPLETE');
        });
    }
  }, [webcamRef]);

  // Send image for detection
  const performDetection = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      if (audioEnabled) {
        announceWarning('detection.errors.uploadFailed');
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setSystemStatus(t('detection.status.processing'));
    setScanProgress(0);

    // Announce detection start
    if (audioEnabled) {
      announceStatus('tts.detectionStarted');
    }

    // Simulate scan progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 100);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch(`${BACKEND_URL}/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.statusText}`);
      }

      const results = await response.json();
      console.log('Detection results:', results); // Debug log
      setDetectionResults(results);
      setScanProgress(100);
      setSystemStatus(t('detection.scanning.complete'));
      
      // Announce detection results
      if (audioEnabled) {
        announceDetection(results);
        
        // Additional announcements for specific scenarios
        if (results.detections && results.detections.length === 0) {
          setTimeout(() => {
            announceStatus('tts.noObjectsDetected');
          }, 1000);
        } else if (results.detections && results.detections.length > 0) {
          setTimeout(() => {
            announceStatus('tts.detectionComplete');
          }, 2000);
        }
      }
      
      // Draw bounding boxes on canvas if detections found
      if (results.detections && results.detections.length > 0) {
        setTimeout(() => {
          drawBoundingBoxes(results.detections);
        }, 100); // Small delay to ensure canvas is ready
      } else {
        console.log('No detections found in results');
      }
      
    } catch (err) {
      setError(err.message);
      setSystemStatus(t('common.error'));
      console.error('Detection error:', err);
      
      // Announce error
      if (audioEnabled) {
        announceWarning('tts.detectionFailed');
      }
    } finally {
      setIsLoading(false);
      clearInterval(progressInterval);
    }
  };

  // Draw bounding boxes on canvas
  const drawBoundingBoxes = (detections) => {
    console.log('Drawing bounding boxes for detections:', detections);
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }
    
    if (!imagePreview) {
      console.error('No image preview available');
      return;
    }
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Could not get canvas context');
          return;
        }
        
        console.log('Image loaded, drawing on canvas. Image size:', img.naturalWidth, 'x', img.naturalHeight);
        
        // Set canvas dimensions to match image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        console.log('Detections to draw:', detections.length);
        
        // Draw bounding boxes
        detections.forEach((detection, index) => {
          const { bbox, class_name, confidence } = detection;
          console.log(`Drawing detection ${index}:`, detection);
          
          if (!bbox || bbox.length !== 4) {
            console.error('Invalid bbox format:', bbox);
            return;
          }
          
          const [x, y, width, height] = bbox;
          
          // Set box style - thinner lines for less obstruction
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'; // Very transparent fill
          
          // Draw bounding box
          ctx.strokeRect(x, y, width, height);
          ctx.fillRect(x, y, width, height);
          
          // Draw corner markers instead of full rectangle outline for less obstruction
          const cornerSize = 20;
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#00ff00';
          
          // Top-left corner
          ctx.beginPath();
          ctx.moveTo(x, y + cornerSize);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerSize, y);
          ctx.stroke();
          
          // Top-right corner
          ctx.beginPath();
          ctx.moveTo(x + width - cornerSize, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + cornerSize);
          ctx.stroke();
          
          // Bottom-left corner
          ctx.beginPath();
          ctx.moveTo(x, y + height - cornerSize);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x + cornerSize, y + height);
          ctx.stroke();
          
          // Bottom-right corner
          ctx.beginPath();
          ctx.moveTo(x + width - cornerSize, y + height);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width, y + height - cornerSize);
          ctx.stroke();
          
          // Draw label - positioned strategically to avoid covering the object
          const label = `${class_name.toUpperCase()} ${(confidence * 100).toFixed(1)}%`;
          ctx.font = 'bold 18px monospace';
          const textMetrics = ctx.measureText(label);
          const labelHeight = 26;
          const labelWidth = textMetrics.width + 16;
          
          // Choose best position for label (above, below, or to the side)
          let labelX = x;
          let labelY = y - 8; // Default: above the box
          
          // If label would go off the top of canvas, place it below the box
          if (labelY - labelHeight < 0) {
            labelY = y + height + labelHeight + 5;
          }
          
          // If label would go off the right of canvas, align it to the right
          if (labelX + labelWidth > canvas.width) {
            labelX = x + width - labelWidth;
          }
          
          // Label background with rounded corners effect
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fillRect(labelX, labelY - labelHeight, labelWidth, labelHeight);
          
          // Label border
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(labelX, labelY - labelHeight, labelWidth, labelHeight);
          
          // Draw label text
          ctx.fillStyle = '#00ff00';
          ctx.fillText(label, labelX + 8, labelY - 6);
          
          console.log(`Drew detection: ${label} at (${x},${y}) size (${width},${height})`);
        });
        
        console.log('Finished drawing all bounding boxes');
      } catch (error) {
        console.error('Error drawing bounding boxes:', error);
      }
    };
    
    img.onerror = (error) => {
      console.error('Error loading image for canvas:', error);
    };
    
    img.src = imagePreview;
  };

  // Reset all states
  const resetDetection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setDetectionResults(null);
    setError(null);
    setShowCamera(false);
    setScanProgress(0);
    setSystemStatus('READY');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download results
  const downloadResults = () => {
    if (detectionResults) {
      const dataStr = JSON.stringify(detectionResults, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'detection_results.json';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Real-time detection functions
  const startRealTimeDetection = () => {
    if (!webcamRef.current) {
      setError('Webcam not available');
      return;
    }
    
    setIsRealTimeDetection(true);
    setSystemStatus('REAL_TIME_SCANNING');
    setError(null); // Clear any previous errors
    
    // Start immediately and then repeat
    detectFromWebcam();
    
    detectionIntervalRef.current = setInterval(async () => {
      if (webcamRef.current && !isLoading) {
        await detectFromWebcam();
      }
    }, 1500); // Detect every 1.5 seconds for better performance
  };

  const stopRealTimeDetection = () => {
    setIsRealTimeDetection(false);
    setRealtimeDetections([]);
    setSystemStatus('READY');
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    // Clear the webcam canvas
    if (webcamCanvasRef.current) {
      const ctx = webcamCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, webcamCanvasRef.current.width, webcamCanvasRef.current.height);
    }
  };

  const detectFromWebcam = async () => {
    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) return;

      // Convert base64 to blob
      const base64Response = await fetch(imageSrc);
      const blob = await base64Response.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'webcam-frame.jpg'); // Changed from 'file' to 'image'

      const response = await fetch(`${BACKEND_URL}/detect`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Real-time detection result:', result); // Debug log
        setRealtimeDetections(result.detections || []);
        drawWebcamBoundingBoxes(result.detections || []);
        
        // Update detection summary with real-time results
        setDetectionResults(result);
        
        // Announce new detections (but less frequently to avoid spam)
        if (result.detections && result.detections.length > 0 && audioEnabled && !isSpeaking()) {
          // Only announce if there are new detections (different count or different objects)
          const currentDetectionCount = result.detections.length;
          const previousDetectionCount = realtimeDetections.length;
          
          // Only announce if detection count increased (new objects detected)
          if (currentDetectionCount > previousDetectionCount) {
            // Only announce the new detections, not all of them
            const newDetections = result.detections.slice(previousDetectionCount);
            if (newDetections.length > 0) {
              // Create a simple result object for the announcement
              const newDetectionResult = {
                detections: newDetections
              };
              announceDetection(newDetectionResult);
            }
          }
        }
      } else {
        console.error('Detection API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Real-time detection error:', error);
      // Optionally show error to user for debugging
      setError(`Real-time detection failed: ${error.message}`);
    }
  };

  const drawWebcamBoundingBoxes = (detections) => {
    const canvas = webcamCanvasRef.current;
    const webcam = webcamRef.current?.video;
    
    if (!canvas || !webcam) {
      console.log('Canvas or webcam not available for drawing');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get the display size of the video element
    const videoRect = webcam.getBoundingClientRect();
    const displayWidth = webcam.offsetWidth;
    const displayHeight = webcam.offsetHeight;
    
    // Set canvas size to match the displayed video size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    console.log('Drawing webcam detections:', detections.length, 'Canvas size:', canvas.width, 'x', canvas.height);
    
    // Draw bounding boxes
    detections.forEach((detection, index) => {
      const { bbox, class_name, confidence } = detection;
      
      if (!bbox || bbox.length !== 4) {
        console.error('Invalid bbox format:', bbox);
        return;
      }
      
      const [x, y, width, height] = bbox;
      
      // The bbox coordinates come from the backend based on the original image size
      // We need to scale them to match the canvas display size
      // Assuming the backend processes at 640x480 or the video's natural resolution
      const naturalWidth = webcam.videoWidth || 640;
      const naturalHeight = webcam.videoHeight || 480;
      
      const scaleX = canvas.width / naturalWidth;
      const scaleY = canvas.height / naturalHeight;
      
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;
      
      console.log(`Detection ${index}: ${class_name} at (${scaledX.toFixed(1)}, ${scaledY.toFixed(1)}) size (${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)})`);
      
      // Set colors based on object type
      let color = '#00ff00'; // Default green
      if (class_name.toLowerCase().includes('fire')) color = '#ff0000'; // Red for fire extinguisher
      if (class_name.toLowerCase().includes('oxygen')) color = '#0099ff'; // Blue for oxygen
      if (class_name.toLowerCase().includes('toolbox')) color = '#ffaa00'; // Orange for toolbox
      
      // Draw bounding box with thicker lines for visibility
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      
      // Draw semi-transparent fill
      ctx.fillStyle = color + '20'; // Add transparency
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      
      // Draw label background
      const label = `${class_name.toUpperCase()} ${(confidence * 100).toFixed(1)}%`;
      ctx.font = 'bold 18px monospace';
      const labelMetrics = ctx.measureText(label);
      const labelWidth = labelMetrics.width + 16;
      const labelHeight = 28;
      
      // Position label above the box, but below if it would go off-screen
      let labelX = scaledX;
      let labelY = scaledY - 8;
      
      if (labelY - labelHeight < 0) {
        labelY = scaledY + scaledHeight + labelHeight;
      }
      
      if (labelX + labelWidth > canvas.width) {
        labelX = canvas.width - labelWidth - 5;
      }
      
      // Draw label background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(labelX, labelY - labelHeight, labelWidth, labelHeight);
      
      // Draw label border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(labelX, labelY - labelHeight, labelWidth, labelHeight);
      
      // Draw label text
      ctx.fillStyle = color;
      ctx.fillText(label, labelX + 8, labelY - 8);
    });
    
    console.log('Finished drawing webcam bounding boxes');
  };

  // Cleanup on component unmount
  React.useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black pt-20 pb-12 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="hexagonal-grid opacity-5"></div>
        <div className="scan-lines">
          <div className="scan-line scan-line-1"></div>
          <div className="scan-line scan-line-2"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl lg:text-7xl font-black mb-6 text-white font-mono tracking-tight">
            {t('detection.title')}
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto font-mono">
            {t('detection.subtitle')}
          </p>
          
          {/* Controls Section */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* System Status */}
            <div className="inline-flex items-center px-6 py-3 bg-gray-900/50 border border-gray-700 backdrop-blur-xl font-mono text-sm">
              <div className={`w-2 h-2 rounded-full mr-3 ${systemStatus === t('common.error') ? 'bg-red-400' : 'bg-green-400'} animate-pulse`}></div>
              <span className="text-gray-300">{t('detection.status.ready')}: </span>
              <span className="text-white ml-2">{systemStatus}</span>
            </div>
            
            {/* Audio Control */}
            {isSupported() && (
              <AudioControl 
                onToggle={setAudioEnabled}
                className="font-mono text-sm"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center font-mono">
                <Terminal className="w-6 h-6 mr-3 text-gray-400" />
                {t('detection.upload.title')}
              </h2>

              {/* Upload Button - Less Colorful, Industrial */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mb-4 p-6 border border-gray-700 hover:border-gray-500 bg-gray-900/30 hover:bg-gray-800/50 transition-all duration-300 group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative z-10">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
                  <p className="text-white font-semibold mb-2 font-mono">{t('detection.upload.title')}</p>
                  <p className="text-gray-500 text-sm font-mono">{t('detection.upload.dragDrop')}</p>
                </div>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Camera Button - Less Colorful, Industrial */}
              <button
                onClick={() => setShowCamera(!showCamera)}
                className="w-full mb-6 p-6 bg-gray-900/30 hover:bg-gray-800/50 border border-gray-700 hover:border-gray-500 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative z-10">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
                  <p className="text-white font-semibold mb-2 font-mono">{t('detection.upload.camera')}</p>
                  <p className="text-gray-500 text-sm font-mono">{t('detection.camera.capture')}</p>
                </div>
              </button>

              {/* Detection Button - Minimalistic */}
              <button
                onClick={performDetection}
                disabled={!selectedImage || isLoading}
                className="w-full bg-white text-black hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-500 font-bold py-4 px-6 transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center font-mono relative overflow-hidden group"
              >
                {!isLoading && (
                  <div className="absolute inset-0 bg-black transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                )}
                <div className="relative z-10 flex items-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('detection.status.processing')}...
                    </>
                  ) : (
                    <>
                      <Scan className="w-5 h-5 mr-2 group-hover:text-white transition-colors" />
                      <span className="group-hover:text-white transition-colors">{t('home.buttons.startDetection')}</span>
                    </>
                  )}
                </div>
              </button>

              {/* Progress Bar */}
              {isLoading && (
                <div className="mt-4">
                  <div className="flex justify-between mb-2 font-mono text-sm">
                    <span className="text-gray-400">{t('detection.scanning.progress')}</span>
                    <span className="text-white">{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2">
                    <div 
                      className="bg-white h-2 transition-all duration-200"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Reset Button */}
              {(selectedImage || detectionResults) && (
                <button
                  onClick={resetDetection}
                  className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 transition-all duration-300 flex items-center justify-center font-mono"
                >
                  <X className="w-5 h-5 mr-2" />
                  {t('common.cancel')}
                </button>
              )}
            </div>

            {/* Results Summary */}
            {detectionResults && (
              <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center font-mono">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                    {t('detection.results.title')}
                  </h3>
                  <button
                    onClick={downloadResults}
                    className="p-2 bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
                    title="Download Results"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">DETECTIONS:</span>
                    <span className="text-white font-semibold">
                      {detectionResults.detections?.length || 0}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">MODEL_ACCURACY:</span>
                    <span className="text-green-400 font-semibold">
                      {detectionResults.detections?.length > 0 ? 
                        `${Math.round(detectionResults.detections.reduce((acc, det) => acc + det.confidence, 0) / detectionResults.detections.length * 100)}%` 
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">NEURAL_STATUS:</span>
                    <span className="text-blue-400 font-semibold">
                      ACTIVE
                    </span>
                  </div>

                  {/* Detection List */}
                  {detectionResults.detections?.map((detection, index) => (
                    <div key={index} className="p-3 bg-gray-800/50 border-l-2 border-white">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium font-mono">{detection.class_name.toUpperCase()}</span>
                        <span className="text-gray-300 font-semibold">
                          {(detection.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Display Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800 p-6 h-full">
              <h2 className="text-2xl font-bold text-white mb-6 font-mono">ANALYSIS_VIEWPORT</h2>

              {/* Camera View */}
              {showCamera && (
                <div className="relative mb-6">
                  <div className="relative">
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full"
                      videoConstraints={{
                        width: 1280,
                        height: 720,
                        facingMode: "user"
                      }}
                    />
                    {/* Canvas overlay for bounding boxes */}
                    <canvas
                      ref={webcamCanvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 10 }}
                    />
                  </div>
                  
                  {/* Real-time detection controls */}
                  <div className="absolute top-4 right-4 flex space-x-2">
                    {!isRealTimeDetection ? (
                      <button
                        onClick={startRealTimeDetection}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded font-mono text-sm"
                      >
                        START LIVE DETECTION
                      </button>
                    ) : (
                      <button
                        onClick={stopRealTimeDetection}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded font-mono text-sm animate-pulse"
                      >
                        STOP LIVE DETECTION
                      </button>
                    )}
                  </div>
                  
                  {/* Real-time detection status */}
                  {isRealTimeDetection && (
                    <div className="absolute top-4 left-4 bg-red-600/80 text-white px-3 py-1 rounded font-mono text-sm animate-pulse">
                      ● LIVE DETECTION ACTIVE
                    </div>
                  )}
                  
                  {/* Live detection stats */}
                  {isRealTimeDetection && (
                    <div className="absolute top-16 left-4 bg-black/80 text-green-400 px-3 py-1 rounded font-mono text-xs">
                      LIVE DETECTIONS: {realtimeDetections.length}
                    </div>
                  )}
                  
                  {/* API Status indicator */}
                  {isRealTimeDetection && (
                    <div className="absolute top-28 left-4 bg-black/80 text-blue-400 px-3 py-1 rounded font-mono text-xs">
                      API: {BACKEND_URL}
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                    <button
                      onClick={captureImage}
                      className="bg-white text-black hover:bg-gray-200 font-bold py-3 px-6 transition-all duration-300 transform hover:scale-105 font-mono"
                    >
                      <Camera className="w-5 h-5 mr-2 inline" />
                      CAPTURE
                    </button>
                    <button
                      onClick={() => {
                        stopRealTimeDetection();
                        setShowCamera(false);
                      }}
                      className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 transition-all duration-300 font-mono"
                    >
                      <X className="w-5 h-5 mr-2 inline" />
                      CLOSE
                    </button>
                  </div>
                </div>
              )}

              {/* Image Display with extra padding for external text */}
              <div className="relative bg-gray-900/50 border border-gray-700 min-h-96 flex items-center justify-center overflow-hidden mt-16 mb-16">
                {/* Status indicators moved OUTSIDE the image area */}
                {imagePreview && (
                  <div className="absolute -top-12 left-0 right-0 flex justify-between items-center px-4 z-20">
                    <div className="bg-black/80 backdrop-blur-sm px-4 py-2 border border-gray-600 font-mono text-xs text-green-400">
                      {detectionResults ? '[COMPLETE] DETECTIONS_FOUND' : '[ACTIVE] NEURAL_ANALYSIS_MODE'}
                    </div>
                    {detectionResults && detectionResults.detections && detectionResults.detections.length > 0 && (
                      <div className="bg-black/80 backdrop-blur-sm px-3 py-2 border border-green-600 font-mono text-xs text-green-400">
                        DETECTED: {detectionResults.detections.length} OBJECTS
                      </div>
                    )}
                  </div>
                )}

                {/* Debug info moved OUTSIDE and below the image area */}
                {detectionResults && (
                  <div className="absolute -bottom-12 left-4 bg-black/80 text-green-400 p-2 text-xs font-mono border border-green-600 z-20">
                    DEBUG: {detectionResults.detections ? detectionResults.detections.length : 0} detections found
                  </div>
                )}

                {imagePreview ? (
                  <div className="relative w-full">
                    {/* HUD Overlay - Only corner brackets, NO TEXT */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                      {/* Corner Brackets */}
                      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white"></div>
                      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white"></div>
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white"></div>
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white"></div>
                    </div>
                    
                    {/* Original Image - Hidden when detections are available */}
                    <img
                      src={imagePreview}
                      alt="Selected"
                      className="w-full max-h-96 object-contain"
                      style={{ display: detectionResults ? 'none' : 'block' }}
                    />
                    
                    {/* Canvas with Bounding Boxes - Only shown when detections are available */}
                    <canvas
                      ref={canvasRef}
                      className="w-full max-h-96 object-contain mx-auto"
                      style={{ 
                        display: detectionResults && detectionResults.detections && detectionResults.detections.length > 0 ? 'block' : 'none',
                        maxWidth: '100%', 
                        height: 'auto',
                        border: detectionResults && detectionResults.detections && detectionResults.detections.length > 0 ? '2px solid #00ff00' : 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium font-mono">NO_IMAGE_LOADED</p>
                    <p className="text-gray-600 text-sm font-mono">UPLOAD FILE OR CAPTURE FROM CAMERA</p>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-800 text-red-400 flex items-center font-mono">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span>ERROR: {error}</span>
                </div>
              )}

              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-12 h-12 text-white animate-pulse mx-auto mb-4" />
                    <p className="text-white text-lg font-semibold font-mono">PROCESSING_IMAGE...</p>
                    <p className="text-gray-400 font-mono">NEURAL_NETWORK_ACTIVE</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detection Summary Panel - Below Viewport */}
        <DetectionSummaryPanel 
          detectionResults={detectionResults}
          systemStatus={systemStatus}
        />
      </div>
    </div>
  );
};

export default Detection;