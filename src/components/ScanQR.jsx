
import AttendanceService from './services/attendanceService';
import { format } from 'date-fns';
import showError from "./Notifications/Error";
import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, User } from 'lucide-react';
import jsQR from 'jsqr';

const ScanQR = () => {
  const [scanning, setScanning] = useState(false);
  const [scannedEmployee, setScannedEmployee] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle"); // idle, scanning, success, error
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScannedRef = useRef(null);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => cleanupResources();
  }, []);

  // Handle camera setup and scanning
  useEffect(() => {
    if (scanning) {
      setupCamera();
    }
    return () => {
      if (!scanning) {
        cleanupResources();
      }
    };
  }, [scanning]);

  const setupCamera = async () => {
    if (!videoRef.current) return;

    try {
      setScanStatus("scanning");
      const video = videoRef.current;
      // Try environment camera first (back camera on mobile)
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve();
        };
      });

      await video.play();

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      contextRef.current = context;

      // Start scanning at a reasonable interval (every 200ms)
      scanIntervalRef.current = setInterval(() => {
        if (!scanning) return;

        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
          handleScan(imageData);
        } catch (err) {
          console.error("Error during scan interval:", err);
        }
      }, 200);
    } catch (err) {
      console.error("Camera setup error:", err);
      showError(`Error accessing camera: ${err.message || "Unknown error"}`);
      setError(`Camera access denied. Please check permissions and try again.`);
      setScanStatus("error");
      setScanning(false);
    }
  };

  const cleanupResources = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

  const handleScan = (imageData) => {
    if (!contextRef.current || !videoRef.current || !canvasRef.current) return;

    try {
      // Extract QR code data
      const code = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        { inversionAttempts: "dontInvert" } // Optimization for performance
      );

      if (code) {
        // Debounce scanning - prevent multiple scans of same code
        const now = Date.now();
        if (
          lastScannedRef.current &&
          lastScannedRef.current.code === code.data &&
          now - lastScannedRef.current.time < 2000
        ) {
          return; // Skip if same code scanned within 2 seconds
        }

        lastScannedRef.current = { code: code.data, time: now };

        try {
          // Add logging to debug the QR code content
          console.log("QR code data:", code.data);

          // First check if the data is valid JSON
          let employeeData;
          try {
            employeeData = JSON.parse(code.data);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            throw new Error("QR code is not valid JSON format");
          }

          // Log the parsed data for debugging
          console.log("Parsed employee data:", employeeData);

          // Validate the scanned data has required fields
          if (!validateQrData(employeeData)) {
            console.error("Invalid QR data format:", employeeData);
            throw new Error("Invalid employee data format");
          }

          // Stop scanning and mark attendance
          setScannedEmployee(employeeData);
          setScanning(false);
          setScanStatus("success");
          markAttendance(employeeData);
        } catch (e) {
          console.error("QR code parse error:", e);
          setError(`Invalid QR code format: ${e.message}. Please try again.`);
          setScanStatus("error");
          setTimeout(() => setError(null), 5000);
        }
      }
    } catch (e) {
      console.error("QR scan error:", e);
      setError("QR code scanning failed. Please try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const validateQrData = (data) => {
    // Check if data is an object
    if (!data || typeof data !== "object") {
      console.error("QR data is not an object:", data);
      return false;
    }

    // Check required fields exist
    const requiredFields = ["EmployeeID",
      "FullName",
      "Department",
      "Position",];
    const missingFields = requiredFields.filter(
      (field) =>
        !data.hasOwnProperty(field) ||
        data[field] === undefined ||
        data[field] === null
    );

    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      return false;
    }

    return true;
  };


  const markAttendance = async (employee) => {
    console.log("Marking attendance for:", employee);
    setIsProcessing(true);

    try {
      const now = new Date();
      const timeNow = format(now, 'HH:mm');

      // Use AttendanceService to process the scan
      const result = await AttendanceService.processAttendanceScan(
        employee.EmployeeID,
        timeNow
      );

      if (result) {
        // Check if this was a check-in or check-out
        const isCheckIn = !result.OutTime || result.OutTime === '0.00';
        showNotification(
          `${employee.FullName} ${isCheckIn ? 'checked in' : 'checked out'} successfully`
        );
      }
    } catch (error) {
      console.error("Attendance marking error:", error);
      showError(error.message || "Failed to mark attendance");
      setError(error.message || "Failed to mark attendance");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const showNotification = (message, type = "success") => {
    // You could use a proper notification library here
    alert(`${type === "success" ? "" : ""} ${message}`);
  };

  
  const startScanning = () => {
    setScanning(true);
    setScannedEmployee(null);
    setError(null);
    setScanStatus("idle");
    lastScannedRef.current = null;
  };

  const stopScanning = () => {
    setScanning(false);
    cleanupResources();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Employee Attendance Scanner
        </h1>

        {error && (
          <div className="my-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        <div className="aspect-video bg-gray-100 rounded-lg mb-6 overflow-hidden relative">
          {scanning ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-blue-500 rounded-lg opacity-70"></div>
              </div>
              {scanStatus === "scanning" && (
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Scanning...
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-16 w-16 text-[#1e4785] mx-auto mb-4" />
                <p className="text-[#1e4785] font-semibold">
                  {scanStatus === "success"
                    ? "QR Code detected!"
                    : "Position QR code in front of camera"}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Scan employee QR code to mark attendance
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {!isProcessing && (
            <>
              {!scanning ? (
                <button
                  onClick={startScanning}
                  className="flex-1 bg-[#1e4785] text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
                  disabled={isProcessing}
                >
                  <Camera className="h-5 w-5" />
                  <span>Start Scanning</span>
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Stop Camera</span>
                </button>
              )}
            </>
          )}

          {scannedEmployee && !scanning && (
            <button
              onClick={startScanning}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              disabled={isProcessing}
            >
              <Camera className="h-5 w-5" />
              <span>Scan Another</span>
            </button>
          )}
        </div>

        {isProcessing && (
          <div className="my-4 p-4 flex items-center justify-center">
            <RefreshCw className="animate-spin h-6 w-6 mr-3 text-[#1e4785]" />
            <span className="text-gray-700">Processing attendance...</span>
          </div>
        )}

        {scannedEmployee && !scanning && !isProcessing && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <User className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-green-700">
                Employee Scanned Successfully
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Employee ID</p>
                <p className="font-medium">{scannedEmployee.EmployeeID}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{scannedEmployee.FullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{scannedEmployee.Department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Position</p>
                <p className="font-medium">{scannedEmployee.Position}</p>
              </div>
              {scannedEmployee.shift && (
                <div>
                  <p className="text-sm text-gray-500">Shift</p>
                  <p className="font-medium">{scannedEmployee.Shift}</p>
                </div>
              )}
              {scannedEmployee.supervisor && (
                <div>
                  <p className="text-sm text-gray-500">Supervisor</p>
                  <p className="font-medium">{scannedEmployee.Supervisor}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500">
          <p>
            Scan the employee QR code to record attendance. Make sure the QR
            code is clearly visible and well-lit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScanQR;