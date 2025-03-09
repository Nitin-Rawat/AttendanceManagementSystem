// import React, { useState, useEffect, useRef } from "react";
// import { Camera, User } from "lucide-react";
// import jsQR from "jsqr";
// import { Databases, Query } from "appwrite";
// import { databases } from "../Appwrite/appwriteService";
// import conf from "../conf/conf";
// import showError from "./Notifications/Error";

// const ScanQR = () => {
//   const [scanning, setScanning] = useState(false);
//   const [scannedEmployee, setScannedEmployee] = useState(null);
//   const [error, setError] = useState(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const contextRef = useRef(null);
//   const streamRef = useRef(null);
//   const scanIntervalRef = useRef(null);

//   useEffect(() => {
//     if (scanning && videoRef.current) {
//       const video = videoRef.current;
//       const constraints = { facingMode: "environment" };

//       navigator.mediaDevices
//         .getUserMedia({ video: constraints })
//         .then((stream) => {
//           streamRef.current = stream;
//           video.srcObject = stream;
//           video.play();

//           const canvas = canvasRef.current;
//           const context = canvas.getContext("2d");
//           contextRef.current = context;

//           scanIntervalRef.current = setInterval(() => {
//             if (!scanning) return;
//             context.drawImage(video, 0, 0, canvas.width, canvas.height);
//             const imageData = context.getImageData(
//               0,
//               0,
//               canvas.width,
//               canvas.height
//             );
//             handleScan(imageData);
//           }, 100);
//         })
//         .catch((err) => {
//           showError("Error accessing camera:", err);
//           setError("Error accessing camera");
//         });

//       return () => {
//         if (scanIntervalRef.current) {
//           clearInterval(scanIntervalRef.current);
//         }
//         if (streamRef.current) {
//           streamRef.current.getTracks().forEach((track) => track.stop());
//         }
//       };
//     }
//   }, [scanning]);

//   const handleScan = (imageData) => {
//     if (!canvasRef.current || !videoRef.current) return;

//     const canvas = canvasRef.current;
//     const video = videoRef.current;
//     const ctx = canvas.getContext("2d");

//     // Ensure video feed is active
//     if (video.videoWidth > 0 && video.videoHeight > 0) {
//       canvas.width = video.videoWidth;
//       canvas.height = video.videoHeight;
//       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

//       try {
//         // Extract QR code data
//         const code = jsQR(imageData.data, imageData.width, imageData.height);
//         if (code) {

//           // Avoid processing the same QR code multiple times
//           if (scannedEmployee && scannedEmployee.EmployeeID === code.data) {
          
//             return;
//           }

//           try {
//             const employeeData = JSON.parse(code.data); // Ensure it's valid JSON
//             setScannedEmployee(employeeData);
//             setScanning(false);
//             markAttendance(employeeData); // Call attendance marking function
//           } catch (e) {
//             showError("Invalid QR Code format:", e);
//             setError("Invalid QR code format");
//             setTimeout(() => setError(""), 1000);
//           }
//         } else {
//           console.log("No QR Code detected.");
//         }
//       } catch (e) {
//         showError("Error scanning QR Code:", e);
//         setError("Failed to scan QR Code");
//         setTimeout(() => setError(""), 500);
//       }
//     }
//   };

// const formatTime = (date) => {
//   return date.toLocaleTimeString([], {
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// const markAttendance = async (employee) => {
//   console.log("Marking attendance for:", employee);
//   setIsProcessing(true);

//   try {
//     const now = new Date();
//     const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
//     const timeNow = formatTime(now); // Format to "1:20 AM/PM"

//     const existingRecords = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteAttendanceLogsCollectionId,
//       [
//         Query.equal("EmployeeID", employee.EmployeeID),
//         Query.equal("Date", today),
//       ]
//     );

//     if (existingRecords.documents.length > 0) {
//       const lastEntry = existingRecords.documents[0];
//       console.log("Existing Attendance Record:", lastEntry);

//       if (!lastEntry.OutTime || lastEntry.OutTime === "") {
//         const totalTime = calculateTotalTime(lastEntry.InTime, timeNow);
//         console.log("Updating OutTime and TotalTime:", timeNow, totalTime);

//         await databases.updateDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           lastEntry.$id,
//           {
//             OutTime: timeNow,
//             TotalTime: totalTime, // Store in decimal format
//           }
//         );

//         alert(`✅ ${employee.FullName} checked out successfully`);
//       } else {
//         console.log("⚠️ Already checked out today.");
//       }
//     } else {
//       await databases.createDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         "unique()",
//         {
//           EmployeeID: employee.EmployeeID,
//           FullName: employee.FullName,
//           Shift: employee.Shift,
//           Department: employee.Department,
//           Supervisor: employee.Supervisor,
//           Position: employee.Position,
//           InTime: timeNow,
//           Date: today,
//           OutTime: "",
//           TotalTime: 0,
//           Status: "PRESENT",
//         }
//       );

//       alert(`✅ ${employee.FullName} checked in successfully`);
//     }
//   } catch (error) {
//     showError("🚨 Error marking attendance:", error);
//     setError("Failed to mark attendance. Please try again.");
//     setTimeout(() => setError(""), 1000);
//   } finally {
//     setIsProcessing(false);
//   }
// };


//   // ✅ **Updated `calculateTotalTime` Function**
// const calculateTotalTime = (inTime, outTime) => {

//   if (!inTime || !outTime) {
//     showError("Invalid inTime or outTime");
//     return "0";
//   }

//   const parseTime = (timeStr) => {
//     const [time, modifier] = timeStr.split(" ");
//     let [hours, minutes] = time.split(":").map(Number);

//     if (modifier === "PM" && hours !== 12) hours += 12;
//     if (modifier === "AM" && hours === 12) hours = 0;

//     return { hours, minutes };
//   };

//   const inParsed = parseTime(inTime);
//   const outParsed = parseTime(outTime);

//   const inMinutes = inParsed.hours * 60 + inParsed.minutes;
//   const outMinutes = outParsed.hours * 60 + outParsed.minutes;

//   const totalMinutes = outMinutes - inMinutes;
//   if (totalMinutes < 0) {
//     showError("Invalid time difference detected!");
//     return "0";
//   }

//   // ✅ **Convert to hours with two decimal places**
//   let totalHours = parseFloat((totalMinutes / 60).toFixed(2));

//   return totalHours; // Stored in decimal format (e.g., "8.25")
// };


//   const startScanning = () => {
//     setScanning(true);
//     setScannedEmployee(null);
//     setError(null);
//   };

//   const stopScanning = () => {
//     setScanning(false);
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((track) => track.stop());
//     }
//   };

//   return (
//     <div className="max-w-2xl mx-auto">
//       <div className="bg-white rounded-xl shadow-lg p-8">
//         <h1 className="text-3xl font-bold text-gray-800 mb-6">Scan QR Code</h1>

//         {error && (
//           <div className="my-4 p-4 bg-red-100 text-red-700 rounded-lg">
//             {error}
//           </div>
//         )}

//         <div className="aspect-video bg-gray-100 rounded-lg mb-6">
//           {scanning ? (
//             <>
//               <video ref={videoRef} width="100%" height="auto" />
//               <canvas ref={canvasRef} style={{ display: "none" }} />
//             </>
//           ) : (
//             <div className="h-full flex items-center justify-center">
//               <div className="text-center">
//                 <Camera className="h-16 w-16 text-[#1e4785] mx-auto mb-4" />
//                 <p className="text-[#1e4785] font-semibold">
//                   Camera preview will appear here
//                 </p>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="space-x-4">
//           {!scanning && !isProcessing && (
//             <div className="flex gap-4">
//               <button
//                 onClick={startScanning}
//                 className="flex-1 bg-[#1e4785] text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
//               >
//                 <Camera className="h-5 w-5" />
//                 <span>Start Scanning</span>
//               </button>

//               <button
//                 onClick={stopScanning}
//                 className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
//               >
//                 <span>Stop Scanning</span>
//               </button>
//             </div>
//           )}
//         </div>

//         {scannedEmployee && (
//           <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
//             <div className="flex items-start space-x-4">
//               <div className="bg-green-100 p-3 rounded-full">
//                 <User className="h-6 w-6 text-green-600" />
//               </div>
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-800">
//                   Attendance Marked Successfully
//                 </h3>
//                 <div className="mt-2 space-y-1">
//                   <p className="text-gray-600">
//                     <span className="font-medium">Name:</span>{" "}
//                     {scannedEmployee.name}
//                   </p>
//                   <p className="text-gray-600">
//                     <span className="font-medium">Employee ID:</span>{" "}
//                     {scannedEmployee.EmployeeID}
//                   </p>
//                   <p className="text-gray-600">
//                     <span className="font-medium">Department:</span>{" "}
//                     {scannedEmployee.department}
//                   </p>
//                   <p className="text-gray-600">
//                     <span className="font-medium">Position:</span>{" "}
//                     {scannedEmployee.Position}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ScanQR;






import React, { useState, useEffect, useRef } from "react";
import { Camera, User, RefreshCw } from "lucide-react";
import jsQR from "jsqr";
import { Query } from "appwrite";
import { databases } from "../Appwrite/appwriteService";
import conf from "../conf/conf";
import showError from "./Notifications/Error";

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

  // const handleScan = (imageData) => {
  //   if (!contextRef.current || !videoRef.current || !canvasRef.current) return;

  //   try {
  //     // Extract QR code data
  //     const code = jsQR(
  //       imageData.data,
  //       imageData.width,
  //       imageData.height,
  //       { inversionAttempts: "dontInvert" } // Optimization for performance
  //     );

  //     if (code) {
  //       // Debounce scanning - prevent multiple scans of same code
  //       const now = Date.now();
  //       if (
  //         lastScannedRef.current &&
  //         lastScannedRef.current.code === code.data &&
  //         now - lastScannedRef.current.time < 2000
  //       ) {
  //         return; // Skip if same code scanned within 2 seconds
  //       }

  //       lastScannedRef.current = { code: code.data, time: now };

  //       try {
  //         const employeeData = JSON.parse(code.data);

  //         // Validate the scanned data has required fields
  //         if (!validateQrData(employeeData)) {
  //           throw new Error("Invalid employee data format");
  //         }

  //         // Stop scanning and mark attendance
  //         setScannedEmployee(employeeData);
  //         setScanning(false);
  //         setScanStatus("success");
  //         markAttendance(employeeData);
  //       } catch (e) {
  //         console.error("QR code parse error:", e);
  //         setError("Invalid QR code format. Please try again.");
  //         setScanStatus("error");
  //         setTimeout(() => setError(null), 3000);
  //       }
  //     }
  //   } catch (e) {
  //     console.error("QR scan error:", e);
  //     setError("QR code scanning failed. Please try again.");
  //     setTimeout(() => setError(null), 3000);
  //   }
  // };
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

// Enhance the validation function to provide more detailed errors
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
 

  const formatTime = (date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };


  const determineStatus = (totalTime) => {
    if (totalTime >= 8) return "OVERTIME";
    if (totalTime < 4) return "HALF-DAY";
    return "PRESENT";
  };


  const markAttendance = async (employee) => {
    console.log("Marking attendance for:", employee);
    setIsProcessing(true);

    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeNow = formatTime(now);

      // Map QR code data structure to our database structure
      const employeeRecord = {
        EmployeeID: employee.EmployeeID,
        FullName: employee.FullName,
        Department: employee.Department,
        Position: employee.Position,
        // Use default values if these fields are missing
        Shift: employee.Shift || "Day",
        Supervisor: employee.Supervisor || "",
      };

      const existingRecords = await databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        [
          Query.equal("EmployeeID", employeeRecord.EmployeeID),
          Query.equal("Date", today),
        ]
      );

      if (existingRecords.documents.length > 0) {
        const lastEntry = existingRecords.documents[0];

        if (!lastEntry.OutTime || lastEntry.OutTime === "") {
          // Calculate hours worked
          const totalTime = calculateTotalTime(lastEntry.InTime, timeNow);

          await databases.updateDocument(
            conf.appwriteDatabaseId,
            conf.appwriteAttendanceLogsCollectionId,
            lastEntry.$id,
            {
              OutTime: timeNow,
              TotalTime: totalTime,
              Status:determineStatus(totalTime),
            }
          );

          showNotification(
            `${employeeRecord.FullName} checked out successfully`
          );
        } else {
          showNotification(
            `${employeeRecord.FullName} has already checked out today`,
            "warning"
          );
        }
      } else {
        await databases.createDocument(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          "unique()",
          {
            EmployeeID: employee.EmployeeID,
            FullName: employee.FullName,
            Shift: employee.Shift,
            Department: employee.Department,
            Supervisor: employee.Supervisor,
            Position: employee.Position,
            InTime: timeNow,
            Date: today,
            OutTime: "",
            TotalTime: 0,
            Status: "PRESENT",
          }
        );

        showNotification(`${employeeRecord.FullName} checked in successfully`);
      }
    } catch (error) {
      console.error("Attendance marking error:", error);
      showError(
        `Error marking attendance: ${error.message || "Unknown error"}`
      );
      setError("Failed to mark attendance. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show user-friendly notification
  const showNotification = (message, type = "success") => {
    // You could use a proper notification library here
    alert(`${type === "success" ? "✅" : "⚠️"} ${message}`);
  };

  const calculateTotalTime = (inTime, outTime) => {
    if (!inTime || !outTime) {
      console.error("Invalid inTime or outTime", { inTime, outTime });
      return 0;
    }

    try {
      const parseTime = (timeStr) => {
        // Handle various time formats
        const timeRegex = /(\d{1,2}):(\d{2})\s?(AM|PM)/i;
        const match = timeStr.match(timeRegex);

        if (!match) {
          throw new Error(`Invalid time format: ${timeStr}`);
        }

        let [_, hours, minutes, modifier] = match;
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        modifier = modifier.toUpperCase();

        if (modifier === "PM" && hours !== 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;

        return { hours, minutes };
      };

      const inParsed = parseTime(inTime);
      const outParsed = parseTime(outTime);

      // Calculate minutes elapsed
      let inMinutes = inParsed.hours * 60 + inParsed.minutes;
      let outMinutes = outParsed.hours * 60 + outParsed.minutes;

      // Handle overnight shifts (when outTime is on the next day)
      if (outMinutes < inMinutes) {
        outMinutes += 24 * 60; // Add a full day in minutes
      }

      const totalMinutes = outMinutes - inMinutes;
      if (totalMinutes < 0) {
        console.error("Invalid time calculation", {
          inTime,
          outTime,
          totalMinutes,
        });
        return 0;
      }

      // Convert to hours with two decimal places
      return parseFloat((totalMinutes / 60).toFixed(2));
    } catch (error) {
      console.error("Error calculating total time:", error);
      return 0;
    }
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