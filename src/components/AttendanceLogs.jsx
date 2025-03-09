// import React, { useState, useEffect } from "react";
// import { Download, Search, Calendar, Filter, Clock } from "lucide-react";
// import { databases } from "../Appwrite/appwriteService";
// import conf from "../conf/conf";
// import { Query } from "appwrite";
// import {  format, subMonths } from "date-fns";
// import showError from "./Notifications/Error";
//   // Add these constants at the top of your component
//   const ATTENDANCE_RULES = {
//     MORNING_SHIFT: {
//       START_TIME: "09:00", // 9:00 AM
//       LATE_THRESHOLD: "09:15", // 15 minutes grace period
//       ABSENT_CUTOFF: "10:00", // Absent if not arrived by noon
//     },
//     AFTERNOON_SHIFT: {
//       START_TIME: "13:00", // 1:00 PM
//       LATE_THRESHOLD: "13:15", // 15 minutes grace period
//       ABSENT_CUTOFF: "14:00", // Absent if not arrived by 4 PM
//     },
//     NIGHT_SHIFT: {
//       START_TIME: "21:00", // 9:00 PM
//       LATE_THRESHOLD: "21:15", // 15 minutes grace period
//       ABSENT_CUTOFF: "22:00", // Absent if not arrived by midnight
//     },
//   };

// const AttendanceLogs = () => {
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedDate, setSelectedDate] = useState(
//     new Date().toISOString().split("T")[0]
//   );
//   const [selectedPosition, setSelectedPosition] = useState("");
//   const [selectedStatus, setSelectedStatus] = useState(""); // New state for status filter
//   const [selectedRange, setSelectedRange] = useState("1 Month");
//   const [logs, setLogs] = useState([]);
//   const [positions, setPositions] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [offset, setOffset] = useState(0);
//   const dateRanges = ["1 Month", "2 Months", "3 Months"];
//   const startDate = format(subMonths(new Date(), 1), "yyyy-MM-dd"); // 1 month ago
//   const endDate = format(new Date(), "yyyy-MM-dd"); // Today
//   const PAGE_SIZE = 50; // Number of logs per request

//   // Function to check if time is after the specified time
//   const isTimeAfter = (time1, time2) => {
//     const [hours1, minutes1] = time1.split(":").map(Number);
//     const [hours2, minutes2] = time2.split(":").map(Number);

//     return hours1 > hours2 || (hours1 === hours2 && minutes1 > minutes2);
//   };
//   // Replace the multiple useEffect hooks for data fetching with this:

//   const loadLogs = async () => {
//     setIsLoading(true);
//     try {
//       // Try to get cached data first
//       const cachedData = localStorage.getItem("attendanceLogs");
//       if (cachedData && !selectedDate) {
//         const parsed = JSON.parse(cachedData);
//         if (parsed.timestamp && parsed.data) {
//           const { timestamp, data } = parsed;
//           const oneDay = 24 * 60 * 60 * 1000;
//           if (Date.now() - timestamp < oneDay) {
//             setLogs(data);

//             // Extract positions from cached data
//             if (data.length > 0) {
//               const uniquePositions = Array.from(
//                 new Set(data.map((log) => log.Position?.trim()).filter(Boolean))
//               ).sort();
//               setPositions(uniquePositions);
//             }

//             setIsLoading(false);
//             return;
//           }
//         }
//       }

//       // If cache not available or selectedDate changed, fetch data
//       let fetchedLogs;
//       if (selectedDate) {
//         fetchedLogs = await fetchAttendanceLogs(selectedDate);
//       } else {
//         fetchedLogs = await fetchAttendanceLogs();
//         // Only cache the full dataset, not filtered by date
//         localStorage.setItem(
//           "attendanceLogs",
//           JSON.stringify({ timestamp: Date.now(), data: fetchedLogs })
//         );
//       }

//       // Remove duplicate logs based on EmployeeID and Date
//       const uniqueLogsMap = new Map();
//       fetchedLogs.forEach((log) => {
//         const key = `${log.EmployeeID}_${log.Date}`;
//         // Only keep the latest entry (assuming entries have timestamps or IDs)
//         if (
//           !uniqueLogsMap.has(key) ||
//           (log.$id &&
//             (!uniqueLogsMap.get(key).$id ||
//               log.$id > uniqueLogsMap.get(key).$id))
//         ) {
//           uniqueLogsMap.set(key, log);
//         }
//       });

//       const uniqueLogs = Array.from(uniqueLogsMap.values());
//       setLogs(uniqueLogs);
//       setOffset(0); // Reset offset when data changes

//       // Extract positions
//       if (uniqueLogs.length > 0) {
//         const uniquePositions = Array.from(
//           new Set(uniqueLogs.map((log) => log.Position?.trim()).filter(Boolean))
//         ).sort();
//         setPositions(uniquePositions);
//       }

//       // For today's date, mark missing employees as absent
//       if (
//         selectedDate === format(new Date(), "yyyy-MM-dd") &&
//         uniqueLogs.length > 0
//       ) {
//         markMissingEmployeesAsAbsent(uniqueLogs);
//       }
//     } catch (error) {
//       showError("Error loading logs!");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Consolidate your data fetching logic to prevent conflicts

//   const loadMoreLogs = async () => {
//     setIsLoading(true);

//     try {
//       const newLogs = await fetchAttendanceLogs(
//         null,
//         startDate,
//         endDate,
//         offset + PAGE_SIZE
//       );

//       if (newLogs.length > 0) {
//         // Deduplicate logs before adding to the existing logs
//         const existingLogKeys = new Set(
//           logs.map((log) => `${log.EmployeeID}_${log.Date}`)
//         );

//         const uniqueNewLogs = newLogs.filter((log) => {
//           const key = `${log.EmployeeID}_${log.Date}`;
//           return !existingLogKeys.has(key);
//         });

//         if (uniqueNewLogs.length > 0) {
//           setLogs((prevLogs) => [...prevLogs, ...uniqueNewLogs]);
//           setOffset((prevOffset) => prevOffset + PAGE_SIZE);
//         }
//       }
//     } catch (error) {
//       showError("Error loading more logs!");
//     } finally {
//       setIsLoading(false);
//     }
//   };
//   const fetchAttendanceLogs = async (
//     date = null,
//     startDate = null,
//     endDate = null,
//     offset = 0
//   ) => {
//     try {
//       const queries = [
//         Query.limit(PAGE_SIZE),
//         Query.offset(offset),
//         Query.orderAsc("EmployeeID"), // Sort by Employee ID ascending
//       ];

//       if (date) {
//         queries.push(Query.equal("Date", date));
//       } else if (startDate && endDate) {
//         queries.push(Query.between("Date", startDate, endDate));
//       }

//       const response = await databases.listDocuments(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         queries
//       );

//       return response.documents || [];
//     } catch (error) {
//       showError("Error fetching attendance logs!");
//       return []; // Return an empty array to prevent errors
//     }
//   };
//   // Add this function to your component
//   const markMissingEmployeesAsAbsent = async (currentLogs) => {
//     // Only process for today's date
//     const today = format(new Date(), "yyyy-MM-dd");
//     if (selectedDate !== today) return;

//     try {
//       // Use the logs passed in or the current state
//       const todaysLogs = currentLogs || logs;

//       // Only fetch employees once
//       const employeesResponse = await databases.listDocuments(
//         conf.appwriteDatabaseId,
//         conf.appwriteEmployeeCollectionId
//       );

//       const allEmployees = employeesResponse.documents || [];

//       // Create a set of employee IDs who already have records
//       const recordedEmployeeIds = new Set(
//         todaysLogs
//           .filter((log) => log.Date === today)
//           .map((log) => log.EmployeeID)
//       );

//       // Find employees without records
//       const missingEmployees = allEmployees.filter(
//         (emp) => !recordedEmployeeIds.has(emp.EmployeeID)
//       );

//       if (missingEmployees.length === 0) return;

//       // Get current time
//       const currentTime = format(new Date(), "HH:mm");

//       // Create absent logs for missing employees
//       const absentLogs = missingEmployees.map((emp) => {
//         const shift = emp.Shift || "MORNING";
//         const shiftRules =
//           ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;

//         // Only mark as absent if past the absent cutoff time
//         const status = isTimeAfter(currentTime, shiftRules.ABSENT_CUTOFF)
//           ? "ABSENT"
//           : "PENDING";
//         return {
//           EmployeeID: emp.EmployeeID,
//           FullName: emp.FullName || "",
//           Position: emp.Position || "",
//           Department: emp.Department || "",
//           Shift: emp.Shift || "MORNING",
//           Supervisor: emp.Supervisor || "",
//           Date: today,
//           InTime: "0.00",
//           OutTime: "0.00",
//           TotalTime: 0.0,
//           Status: status,
//         };
//       });

//       // Before adding to the database, check if any exist
//       for (const log of absentLogs) {
//         // Check if this record already exists in the database
//         const existingRecords = await databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           [
//             Query.equal("EmployeeID", log.EmployeeID),
//             Query.equal("Date", log.Date),
//           ]
//         );

//         if (existingRecords.documents.length === 0) {
//           // Only create if it doesn't exist yet
//           await databases.createDocument(
//             conf.appwriteDatabaseId,
//             conf.appwriteAttendanceLogsCollectionId,
//             "unique()",
//             log
//           );
//         }
//       }

//       // Update the logs state with the new absent records
//       setLogs((prevLogs) => {
//         // Deduplicate before adding new logs
//         const existingKeys = new Set(
//           prevLogs.map((log) => `${log.EmployeeID}_${log.Date}`)
//         );

//         const uniqueAbsentLogs = absentLogs.filter((log) => {
//           const key = `${log.EmployeeID}_${log.Date}`;
//           return !existingKeys.has(key);
//         });

//         return [...prevLogs, ...uniqueAbsentLogs];
//       });
//     } catch (error) {
//       console.error("Error marking absent employees:", error);
//       showError("Error processing absent employees!");
//     }
//   };

//   // Add this function to automatically check attendance status
//   const determineAttendanceStatus = (inTime, employeeShift) => {
//     if (!inTime || inTime === "0.00") return "ABSENT";

//     // Convert inTime from "HH.mm" format to "HH:mm" format
//     const [hours, minutes] = inTime.split(".").map(Number);
//     const formattedInTime = `${String(hours).padStart(2, "0")}:${String(
//       minutes || 0
//     ).padStart(2, "0")}`;

//     const shift = employeeShift || "MORNING";
//     const shiftRules =
//       ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;

//     if (isTimeAfter(formattedInTime, shiftRules.LATE_THRESHOLD)) {
//       return "LATE";
//     } else if (isTimeAfter(formattedInTime, shiftRules.START_TIME)) {
//       return "SLIGHTLY_LATE";
//     } else {
//       return "PRESENT";
//     }
//   };

//   // Assuming you have a function like this:
//   const processAttendanceScan = async (employeeId, scanTime) => {
//     try {
//       // Fetch employee details
//       const employeeResponse = await databases.listDocuments(
//         conf.appwriteDatabaseId,
//         conf.appwriteEmployeeCollectionId,
//         [Query.equal("EmployeeID", employeeId)]
//       );

//       if (employeeResponse.documents.length === 0) {
//         showError("Employee not found!");
//         return;
//       }

//       const employee = employeeResponse.documents[0];
//       const today = format(new Date(), "yyyy-MM-dd");

//       // Format scanTime as "HH.mm"
//       const timeFormatted = format(new Date(scanTime), "HH.mm");

//       // Determine status based on scan time and employee shift
//       const status = determineAttendanceStatus(timeFormatted, employee.Shift);

//       // Check if a record already exists
//       const existingRecords = await databases.listDocuments(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         [Query.equal("EmployeeID", employeeId), Query.equal("Date", today)]
//       );

//       if (existingRecords.documents.length > 0) {
//         // Update existing record
//         const existingLog = existingRecords.documents[0];

//         // If this is a check-out scan (assuming employee already checked in)
//         if (existingLog.InTime && existingLog.InTime !== "0.00") {
//           // Calculate total time (hours)
//           const inTimeParts = existingLog.InTime.split(".").map(Number);
//           const outTimeParts = timeFormatted.split(".").map(Number);

//           const inTimeHours = inTimeParts[0] + (inTimeParts[1] || 0) / 60;
//           const outTimeHours = outTimeParts[0] + (outTimeParts[1] || 0) / 60;

//           let totalTime = outTimeHours - inTimeHours;
//           if (totalTime < 0) totalTime += 24; // Handle overnight shifts

//           await databases.updateDocument(
//             conf.appwriteDatabaseId,
//             conf.appwriteAttendanceLogsCollectionId,
//             existingLog.$id,
//             {
//               OutTime: timeFormatted,
//               TotalTime: totalTime.toFixed(2),
//             }
//           );
//         } else {
//           // This is a late check-in
//           await databases.updateDocument(
//             conf.appwriteDatabaseId,
//             conf.appwriteAttendanceLogsCollectionId,
//             existingLog.$id,
//             {
//               InTime: timeFormatted,
//               Status: status,
//             }
//           );
//         }
//       } else {
//         // Create new record
//         const newLogData = {
//           EmployeeID: employee.EmployeeID,
//           FullName: employee.FullName || "",
//           Position: employee.Position || "",
//           Department: employee.Department || "",
//           Shift: employee.Shift || "MORNING",
//           Supervisor: employee.Supervisor || "",
//           Date: today,
//           InTime: timeFormatted,
//           OutTime: "0.00",
//           TotalTime: 0.0,
//           Status: status,
//         };

//         await databases.createDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           "unique()",
//           newLogData
//         );
//       }

//       // Refresh logs
//       loadLogs();
//     } catch (error) {
//       console.error("Error processing attendance scan:", error);
//       showError("Failed to process attendance scan!");
//     }
//   };

//   // Add this scheduler function to run periodically
//   const scheduleAttendanceCheck = () => {
//     // Run every hour
//     const checkAbsentInterval = setInterval(() => {
//       if (format(new Date(), "HH:mm") === "12:00") {
//         // At noon, mark employees as absent if they haven't checked in
//         markMissingEmployeesAsAbsent();
//       }
//     }, 60 * 1000); // Check every minute

//     // Clean up interval on component unmount
//     return () => clearInterval(checkAbsentInterval);
//   };

//   // Add this to your useEffect hooks
//   useEffect(() => {
//     const cleanup = scheduleAttendanceCheck();
//     return cleanup;
//   }, []);

//   const updateEmployeeStatus = async (employeeId, date, newStatus) => {
//     try {
//       // Find existing log in state
//       const existingLogIndex = logs.findIndex(
//         (log) => log.EmployeeID === employeeId && log.Date === date
//       );

//       let updatedLogs = [...logs];

//       if (existingLogIndex >= 0) {
//         // Optimistic UI update
//         updatedLogs[existingLogIndex] = {
//           ...updatedLogs[existingLogIndex],
//           Status: newStatus,
//         };
//         setLogs(updatedLogs);

//         // Update in database if log exists
//         const logData = updatedLogs[existingLogIndex];
//         if (logData.$id) {
//           await databases.updateDocument(
//             conf.appwriteDatabaseId,
//             conf.appwriteAttendanceLogsCollectionId,
//             logData.$id,
//             { Status: newStatus }
//           );
//         } else {
//           // Create new document if it doesn't have an ID
//           await databases.createDocument(
//             conf.appwriteDatabaseId,
//             conf.appwriteAttendanceLogsCollectionId,
//             "unique()",
//             {
//               ...logData,
//               Status: newStatus,
//             }
//           );
//         }
//       } else {
//         // Fetch employee info only if needed
//         const employeeResponse = await databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteEmployeeCollectionId,
//           [Query.equal("EmployeeID", employeeId)]
//         );

//         if (employeeResponse.documents.length === 0) {
//           showError("Employee not found!");
//           return;
//         }

//         const employee = employeeResponse.documents[0];

//         // Create new log only if it doesn't exist
//         const newLogData = {
//           EmployeeID: employee.EmployeeID,
//           FullName: employee.FullName || "",
//           Position: employee.Position || "",
//           Department: employee.Department || "",
//           Shift: "MORNING",
//           Supervisor: employee.Supervisor,
//           Date: date,
//           InTime: "0.00",
//           OutTime: "0.00",
//           TotalTime: 0.0,
//           Status: newStatus,
//         };

//         setLogs((prev) => [...prev, newLogData]);

//         // Save to database
//         await databases.createDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           "unique()",
//           newLogData
//         );
//       }
//     } catch (error) {
//       console.error("Error updating status:", error);
//       showError("Failed to update status!");
//     }
//   };

//   // Main data loading effect
//   useEffect(() => {
//     if (!logs.length) loadLogs();
//   }, [selectedDate]); // Only reload when date changes

//   // Effect for marking absent employees
//   useEffect(() => {
//     if (selectedDate === format(new Date(), "yyyy-MM-dd") && logs.length > 0) {
//       markMissingEmployeesAsAbsent(logs);
//     }
//   }, [logs, selectedDate]);

//   const filteredLogs = logs.filter((log) => {
//     const matchesSearch =
//       !searchTerm ||
//       log.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       log.EmployeeID?.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchesDate = !selectedDate || log.Date === selectedDate;

//     const matchesPosition =
//       !selectedPosition || log.Position?.trim() === selectedPosition;

//     const matchesStatus =
//       !selectedStatus ||
//       log.Status?.toUpperCase() === selectedStatus.toUpperCase();

//     return matchesSearch && matchesDate && matchesPosition && matchesStatus;
//   });

//   const fillMissingDates = (logs, startDate, endDate) => {
//     const allDates = [];
//     let currentDate = new Date(startDate);

//     while (currentDate <= new Date(endDate)) {
//       allDates.push(format(currentDate, "yyyy-MM-dd"));
//       currentDate.setDate(currentDate.getDate() + 1);
//     }

//     // Get a unique list of employees from logs
//     const employeeIDs = [...new Set(logs.map((log) => log.EmployeeID))];

//     // Convert logs to a map for faster lookup (key = date + employee ID)
//     const logMap = new Map(
//       logs.map((log) => [`${log.Date}_${log.EmployeeID}`, log])
//     );

//     // Generate a complete log ensuring every employee has an entry for every date
//     const completeLogs = [];
//     allDates.forEach((date) => {
//       employeeIDs.forEach((empID) => {
//         completeLogs.push(
//           logMap.get(`${date}_${empID}`) || {
//             Date: date,
//             Status: "Absent",
//             EmployeeID: empID,
//           }
//         );
//       });
//     });

//     return completeLogs;
//   };

//   // Update the export function to preserve header order
//   const exportLogsToCSV = (logs, startDate, endDate) => {
//     if (!logs.length) {
//       alert("No records found for the selected date range.");
//       return;
//     }

//     // Define the headers in the exact order you want them to appear
//     const headerOrder = [
//       "EmployeeID",
//       "FullName",
//       "Position",
//       "Department",
//       "Date",
//       "InTime",
//       "OutTime",
//       "TotalTime",
//       "Status",
//     ];

//     // Create the CSV header row using the defined order
//     const headerRow = headerOrder.join(",");

//     // Map each log to a CSV row with values in the same order as headers
//     const csvData = logs.map((log) => {
//       return headerOrder
//         .map((header) => {
//           const value = log[header] || "";
//           // Ensure values with commas are properly quoted
//           return value.toString().includes(",") ? `"${value}"` : value;
//         })
//         .join(",");
//     });

//     // Combine header and data rows
//     const csvContent = [headerRow, ...csvData].join("\n");

//     // Create and trigger download
//     const blob = new Blob([csvContent], { type: "text/csv" });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `attendance_logs_${startDate}_to_${endDate}.csv`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     window.URL.revokeObjectURL(url);
//   };

//   const handleExport = async () => {
//     setIsLoading(true);

//     // Parse the number of months from the selected range
//     const months = parseInt(selectedRange.split(" ")[0]);

//     // Calculate date range based on selected months
//     const endDate = format(new Date(), "yyyy-MM-dd");
//     const startDate = format(subMonths(new Date(), months), "yyyy-MM-dd");

//     try {
//       // Explicitly fetch the logs only when the export button is clicked
//       const fetchedLogs = await fetchAttendanceLogs(null, startDate, endDate);

//       if (!fetchedLogs.length) {
//         alert(`No records found for the last ${months} month(s).`);
//         return;
//       }

//       // Deduplicate logs before filling missing dates
//       const uniqueLogsMap = new Map();
//       fetchedLogs.forEach((log) => {
//         const key = `${log.EmployeeID}_${log.Date}`;
//         uniqueLogsMap.set(key, log);
//       });

//       const uniqueLogs = Array.from(uniqueLogsMap.values());

//       // Fill in any missing dates to ensure complete data
//       const completeLogs = fillMissingDates(uniqueLogs, startDate, endDate);

//       // Export the data to CSV with preserved header order
//       exportLogsToCSV(completeLogs, startDate, endDate);
//     } catch (error) {
//       showError("Failed to export logs. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="max-w-7xl mx-auto p-8">
//         <div className="bg-white rounded-xl shadow-lg p-8">
//           <div className="flex justify-center items-center h-64">
//             <div className="text-black text-2xl ">
//               Loading attendance logs...
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-[85rem] mx-auto">
//       <div className="bg-white border rounded-xl shadow-lg mb-5 p-8">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-3xl font-bold text-black">Attendance Logs</h1>

//           <div className="flex items-center gap-2">
//             <span className="text-black font-medium">Date Range:</span>
//             <select
//               value={selectedRange}
//               onChange={(e) => setSelectedRange(e.target.value)}
//               className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1e4785] focus:border-[#e2e2e2]"
//             >
//               {dateRanges.map((range) => (
//                 <option key={range} value={range}>
//                   {range}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Export Button */}
//           <button
//             onClick={handleExport}
//             className="bg-[#2f5fa6] text-white px-4 py-2 rounded-lg hover:bg-[#1e4785] transition-colors flex items-center space-x-2"
//             disabled={isLoading}
//           >
//             <Download className="h-5 w-5" />
//             <span>Export {selectedRange} Data</span>
//           </button>
//         </div>
//       </div>

//       <div className="grid md:grid-cols-3 gap-4 mb-6">
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
//           <input
//             type="text"
//             placeholder="Search by name or ID..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//           />
//         </div>
//         <div className="relative">
//           <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
//           <input
//             type="date"
//             value={selectedDate}
//             onChange={(e) => setSelectedDate(e.target.value)}
//             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//           />
//         </div>
//         <div className="relative">
//           <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
//           <select
//             value={selectedPosition}
//             onChange={(e) => setSelectedPosition(e.target.value)}
//             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//           >
//             <option value="">All positions</option>
//             {positions.map((position) => (
//               <option key={position} value={position}>
//                 {position}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       <div className="overflow-x-auto w-full">
//         <table className="min-w-full divide-y divide-gray-200">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Employee Name
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Employee ID
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Position
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Department
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Supervisor
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Shift
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Date
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 In Time
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Out Time
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 Total Time
//               </th>
//               <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
//                 <select
//                   value={selectedStatus}
//                   onChange={(e) => setSelectedStatus(e.target.value)}
//                   className="border p-2 rounded-md"
//                 >
//                   <option value="">All Status</option>
//                   <option value="Present">Present</option>
//                   <option value="Absent">Absent</option>
//                   <option value="On Leave">On Leave</option>
//                 </select>
//               </th>
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-200">
//             {filteredLogs.map((log) => (
//               <tr key={log.EmployeeID} className="hover:bg-gray-50">
//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
//                   {log.FullName}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {log.EmployeeID}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {log.Position}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {log.Department}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {log.Supervisor}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {log.Shift}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {new Date(log.Date).toLocaleDateString("en-GB")}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {log.InTime || "N/A"}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {log.OutTime || "N/A"}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
//                   {log.TotalTime}
//                 </td>

//                 <td className="px-2 py-2 my-2 whitespace-nowrap">
//                   <select
//                     value={log.Status}
//                     onChange={(e) =>
//                       updateEmployeeStatus(
//                         log.EmployeeID,
//                         log.Date,
//                         e.target.value
//                       )
//                     }
//                     className={`text-sm font-semibold rounded-full text-center text-white py-1 ${
//                       log.Status === "PRESENT"
//                         ? "bg-green-500 "
//                         : log.Status === "ABSENT"
//                         ? "bg-red-500 text-white"
//                         : log.Status === "ON LEAVE"
//                         ? "bg-blue-500 "
//                         : log.Status === "PAID LEAVE"
//                         ? "bg-sky-400 "
//                         : log.Status === "HOLIDAY"
//                         ? "bg-[#1e4785] "
//                         : log.Status === "OTHER LEAVE"
//                         ? "bg-yellow-500 "
//                         : log.Status === "LATE"
//                         ? "bg-black "
//                         : log.Status === "WEEKEND"
//                         ? "bg-gray-500 "
//                         : log.Status === "EARLY CHECKOUT"
//                         ? "bg-emerald-400 "
//                         : log.Status === "OVERTIME"
//                         ? "bg-green-950  "
//                         : "bg-yellow-100 text-yellow-800"
//                     }`}
//                   >
//                     <option value="PRESENT">PRESENT</option>
//                     <option value="ABSENT">ABSENT</option>
//                     <option value="ON LEAVE">ON LEAVE</option>
//                     <option value="PAID LEAVE">PAID LEAVE</option>
//                     <option value="HOLIDAY">HOLIDAY</option>
//                     <option value="OTHER LEAVE">OTHER LEAVE</option>
//                     <option value="LATE">LATE</option>
//                     <option value="WEEKEND">WEEKEND</option>
//                     <option value="EARLY CHECKOUT">EARLY CHECKOUT</option>
//                     <option value="OVERTIME">OVERTIME</option>
//                     <option value="HALF-DAY">HALF-DAY</option>
//                   </select>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         {logs.length > 0 && (
//           <button
//             onClick={loadMoreLogs}
//             className="bg-[#25549a] text-white px-4 py-2 rounded-lg hover:bg-[#1e4785] transition-colors"
//           >
//             Load More
//           </button>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AttendanceLogs;

















// AttendanceLogs.js
import React, { useState, useEffect, useCallback } from "react";
import AttendanceHeader from "./attendance/AttendanceHeader";
import AttendanceFilters from "./attendance/AttendanceFilters";
import AttendanceTable from "./attendance/AttendanceTable"; 
import showError from "./Notifications/Error";
import { format, subMonths } from "date-fns";
import AttendanceService from './services/attendanceService';
 
import { debounce } from 'lodash';
import EmployeeDateRangeFilter from "./attendance/EmployeeDateRangeFilter";

const AttendanceLogs = () => {
  // State variables
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRange, setSelectedRange] = useState("1 Month");
  const [logs, setLogs] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const dateRanges = ["1 Month", "2 Months", "3 Months"];
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [logsProcessedForToday, setLogsProcessedForToday] = useState(false);

  // New state for employee-specific data
  const [employeeSpecificMode, setEmployeeSpecificMode] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [employeeDataDateRange, setEmployeeDataDateRange] = useState({
    start: null,
    end: null,
  });
  const [statusUpdateRun, setStatusUpdateRun] = useState(false);

  // And in the scheduler function
  const setupStatusUpdateScheduler = () => {
    // Run status updates at specific intervals
    const updateInterval = setInterval(() => {
      // Update all statuses at 6:00 PM (end of typical workday)
      const currentTime = format(new Date(), "HH:mm");
      if (currentTime === "18:00" && !statusUpdateRun) {
        setStatusUpdateRun(true);
        AttendanceService.updateAllStatuses()
          .then(() => {
            // Refresh logs to show updated statuses
            loadLogs();
          })
          .catch((error) => {
            console.error("Scheduled status update failed:", error);
          });
      } else if (currentTime !== "18:00") {
        setStatusUpdateRun(false); // Reset for the next day
      }
    }, 60 * 1000); // Check every minute

    // Clean up interval on component unmount
    return () => clearInterval(updateInterval);
  }; 

  // Update the useEffect for attendance checking to use the enhanced version
  useEffect(() => {
    if (
      selectedDate === format(new Date(), "yyyy-MM-dd") &&
      logs.length > 0 &&
      !logsProcessedForToday
    ) {
      setLogsProcessedForToday(true);
      AttendanceService.markMissingEmployeesAsAbsent(logs).then(
        (absentLogs) => {
          if (absentLogs.length > 0) {
            setLogs((prevLogs) => {
              const uniqueLogsMap = new Map();

              prevLogs.forEach((log) => {
                const key = `${log.EmployeeID}_${log.Date}`;
                uniqueLogsMap.set(key, log);
              });

              absentLogs.forEach((log) => {
                const key = `${log.EmployeeID}_${log.Date}`;
                if (!uniqueLogsMap.has(key)) {
                  uniqueLogsMap.set(key, log);
                }
              });

              return Array.from(uniqueLogsMap.values());
            });
          }
        }
      );
    }
  }, [selectedDate, logs.length]);

  // Add this to the main component's useEffect initialization
  useEffect(() => {
    const cleanupAttendanceCheck = scheduleAttendanceCheck();
    const cleanupStatusUpdate = setupStatusUpdateScheduler();

    return () => {
      cleanupAttendanceCheck();
      cleanupStatusUpdate();
    };
  }, []);

  // Handler for data changes from EmployeeDateRangeFilter
  const handleEmployeeDataChange = ({ logs, employeeId, dateRange }) => {
    if (logs && logs.length > 0) {
      setLogs(logs);
      setCurrentEmployeeId(employeeId);
      setEmployeeDataDateRange(dateRange);

      // Reset filters to show only this employee's data
      setSearchTerm(employeeId);
      setSelectedDate(""); // Clear date filter to show all dates in range
      setSelectedPosition(""); // Clear position filter
      setSelectedStatus(""); // Clear status filter
    }
  };

  // Handler for mode changes from EmployeeDateRangeFilter
  const handleEmployeeModeChange = (isEmployeeMode) => {
    setEmployeeSpecificMode(isEmployeeMode);

    if (!isEmployeeMode) {
      // Reset to default view
      setCurrentEmployeeId(null);
      setEmployeeDataDateRange({ start: null, end: null });
      setSearchTerm("");
      setSelectedDate(new Date().toISOString().split("T")[0]); // Today's date
      setOffset(0);
      loadLogs(); // Reload all logs
    }
  };
  // Main function to load attendance logs
  const loadLogs = async () => {
    // if (initialLoadComplete && !selectedDate) {
    //   return; // Skip redundant loads
    // }

    setIsLoading(true);
    try {
      // Try to get cached data first
      const cachedData = localStorage.getItem("attendanceLogs");
      if (cachedData && !selectedDate) {
        const parsed = JSON.parse(cachedData);
        if (parsed.timestamp && parsed.data) {
          const { timestamp, data } = parsed;
          const oneDay = 24 * 60 * 60 * 1000;
          if (Date.now() - timestamp < oneDay) {
            setLogs(data);

            // Extract positions from cached data
            if (data.length > 0) {
              const uniquePositions = Array.from(
                new Set(data.map((log) => log.Position?.trim()).filter(Boolean))
              ).sort();
              setPositions(uniquePositions);
            }

            setIsLoading(false);
            return;
          }
        }
      }

      // If cache not available or selectedDate changed, fetch data
      let fetchedLogs;
      if (selectedDate) {
        fetchedLogs = await AttendanceService.fetchAttendanceLogs(selectedDate);
      } else {
        fetchedLogs = await AttendanceService.fetchAttendanceLogs();
        // Only cache the full dataset, not filtered by date
        localStorage.setItem(
          "attendanceLogs",
          JSON.stringify({ timestamp: Date.now(), data: fetchedLogs })
        );
      }

      // Remove duplicate logs based on EmployeeID and Date
      const uniqueLogsMap = new Map();
      fetchedLogs.forEach((log) => {
        const key = `${log.EmployeeID}_${log.Date}`;
        // Only keep the latest entry (assuming entries have timestamps or IDs)
        if (
          !uniqueLogsMap.has(key) ||
          (log.$id &&
            (!uniqueLogsMap.get(key).$id ||
              log.$id > uniqueLogsMap.get(key).$id))
        ) {
          uniqueLogsMap.set(key, log);
        }
      });

      const uniqueLogs = Array.from(uniqueLogsMap.values());
      setLogs(uniqueLogs);
      setOffset(0); // Reset offset when data changes

      // Extract positions
      if (uniqueLogs.length > 0) {
        const uniquePositions = Array.from(
          new Set(uniqueLogs.map((log) => log.Position?.trim()).filter(Boolean))
        ).sort();
        setPositions(uniquePositions);
      }

      // For today's date, mark missing employees as absent
      if (
        selectedDate === format(new Date(), "yyyy-MM-dd") &&
        uniqueLogs.length > 0
      ) {
        const absentLogs = await AttendanceService.markMissingEmployeesAsAbsent(
          uniqueLogs
        );

        if (absentLogs.length > 0) {
          // Update state with new absent logs
          setLogs((prevLogs) => {
            // Create a Set of existing unique keys to avoid duplicates
            const existingKeys = new Set(
              prevLogs.map((log) => `${log.EmployeeID}_${log.Date}`)
            );

            // Filter out any duplicate logs before adding
            const newAbsentLogs = absentLogs.filter((log) => {
              const key = `${log.EmployeeID}_${log.Date}`;
              return !existingKeys.has(key);
            });

            return [...prevLogs, ...newAbsentLogs];
          });
        }
      }
      setInitialLoadComplete(true);
    } catch (error) {
      showError("Error loading logs!");
    } finally {
      setIsLoading(false);
    }
  };

  // Load more logs for infinite scrolling/pagination
  const loadMoreLogs = async () => {
    setIsLoading(true);

    try {
      // Calculate date range based on selected range
      const months = parseInt(selectedRange.split(" ")[0]);
      const startDate = format(subMonths(new Date(), months), "yyyy-MM-dd");
      const endDate = format(new Date(), "yyyy-MM-dd");

      // Include current filters in the fetch
      const dateFilter = selectedDate || null;

      // This is the key change - use your current filters when fetching more
      const newLogs = await AttendanceService.fetchAttendanceLogs(
        dateFilter,
        startDate,
        endDate,
        offset + AttendanceService.PAGE_SIZE
      );
      if (newLogs.length > 0) {
        // Use a more robust approach to deduplication
        setLogs((prevLogs) => {
          // Create a Map to track unique entries by ID+Date
          const uniqueLogsMap = new Map();

          // First add all existing logs to the map
          prevLogs.forEach((log) => {
            const key = `${log.EmployeeID}_${log.Date}`;
            uniqueLogsMap.set(key, log);
          });

          // Then add new logs, overwriting duplicates if needed
          newLogs.forEach((log) => {
            const key = `${log.EmployeeID}_${log.Date}`;
            // Only add if not already in the map
            if (!uniqueLogsMap.has(key)) {
              uniqueLogsMap.set(key, log);
            }
          });

          // Convert map values back to array
          return Array.from(uniqueLogsMap.values());
        });

        setOffset((prevOffset) => prevOffset + AttendanceService.PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading more logs:", error);
      showError("Error loading more logs!");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle exporting attendance data
  const handleExport = async () => {
    setIsLoading(true);

    try {
      // Parse the number of months from the selected range
      const months = parseInt(selectedRange.split(" ")[0]);

      // Calculate date range based on selected months
      const endDate = format(new Date(), "yyyy-MM-dd");
      const startDate = format(subMonths(new Date(), months), "yyyy-MM-dd");

      // Explicitly fetch the logs only when the export button is clicked
      const fetchedLogs = await AttendanceService.fetchAttendanceLogs(
        null,
        startDate,
        endDate
      );

      if (!fetchedLogs.length) {
        alert(`No records found for the last ${months} month(s).`);
        return;
      }

      // Deduplicate logs before filling missing dates
      const uniqueLogsMap = new Map();
      fetchedLogs.forEach((log) => {
        const key = `${log.EmployeeID}_${log.Date}`;
        uniqueLogsMap.set(key, log);
      });

      const uniqueLogs = Array.from(uniqueLogsMap.values());

      // Fill in any missing dates to ensure complete data
      const completeLogs = AttendanceService.fillMissingDates(
        uniqueLogs,
        startDate,
        endDate
      );

      // Export the data to CSV
      const exported = AttendanceService.exportLogsToCSV(
        completeLogs,
        startDate,
        endDate
      );

      if (!exported) {
        showError("No data to export");
      }
    } catch (error) {
      showError("Failed to export logs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (employeeId, date, newStatus) => {
    try {
      // Find existing log in state
      const existingLogIndex = logs.findIndex(
        (log) => log.EmployeeID === employeeId && log.Date === date
      );

      // Optimistic UI update
      if (existingLogIndex >= 0) {
        setLogs((prevLogs) => {
          const updatedLogs = [...prevLogs];
          updatedLogs[existingLogIndex] = {
            ...updatedLogs[existingLogIndex],
            Status: newStatus,
          };
          return updatedLogs;
        });
      }

      // Update in database
      await AttendanceService.updateEmployeeStatus(employeeId, date, newStatus);
    } catch (error) {
      showError("Failed to update status!");
      // Revert optimistic update
      loadLogs();
    }
  };

  // Initialize attendance check scheduler
  const scheduleAttendanceCheck = () => {
    // Run every hour
    const checkAbsentInterval = setInterval(() => {
      if (format(new Date(), "HH:mm") === "12:00") {
        // At noon, mark employees as absent if they haven't checked in
        AttendanceService.markMissingEmployeesAsAbsent(logs)
          .then((absentLogs) => {
            if (absentLogs.length > 0) {
              setLogs((prevLogs) => [...prevLogs, ...absentLogs]);
            }
          })
          .catch((error) => {
            console.error("Scheduled attendance check failed:", error);
          });
      }
    }, 60 * 1000); // Check every minute

    // Clean up interval on component unmount
    return () => clearInterval(checkAbsentInterval);
  };

  // Filter logs based on search/filter criteria
  const getFilteredLogs = () => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchTerm ||
        log.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.EmployeeID?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = !selectedDate || log.Date === selectedDate;

      const matchesPosition =
        !selectedPosition || log.Position?.trim() === selectedPosition;

      const matchesStatus =
        !selectedStatus ||
        log.Status?.toUpperCase() === selectedStatus.toUpperCase();

      // For employee-specific mode, only filter by status and date if needed
      if (employeeSpecificMode && currentEmployeeId) {
        if (log.EmployeeID !== currentEmployeeId) return false;
        return (
          (!selectedDate || log.Date === selectedDate) &&
          (!selectedStatus ||
            log.Status?.toUpperCase() === selectedStatus.toUpperCase())
        );
      }

      return matchesSearch && matchesDate && matchesPosition && matchesStatus;
    });
  };
  // Replace your existing useEffect for selectedDate with this:
  useEffect(() => {
    // Clear any previous debouncing
    if (debouncedLoadLogs.cancel) {
      debouncedLoadLogs.cancel();
    }

    // Call loadLogs directly when date changes (no debouncing)
    loadLogs();
  }, [selectedDate]); // Only selectedDate as dependency
  // useEffect(() => {
  //   // Only load logs when filters change (not when offset changes)
  //   if (!logs.length) loadLogs();

  //   // }, [selectedDate, selectedPosition, selectedStatus, selectedRange]); // Remove offset from dependencies
  // }, [selectedDate, selectedRange]); // Remove offset from dependencies
  // useEffect(() => {
  //   if (selectedDate || selectedPosition || selectedStatus) {
  //     debouncedLoadLogs();
  //   }
  // }, [selectedDate, selectedPosition, selectedStatus]);

  useEffect(() => {
    // Only run for today's date and when logs are loaded
    if (
      selectedDate === format(new Date(), "yyyy-MM-dd") &&
      logs.length > 0 &&
      // Add a flag to prevent repeated calls
      !logsProcessedForToday
    ) {
      setLogsProcessedForToday(true);
      AttendanceService.markMissingEmployeesAsAbsent(logs).then(
        (absentLogs) => {
          if (absentLogs.length > 0) {
            // Use the deduplication logic here
            setLogs((prevLogs) => {
              const uniqueLogsMap = new Map();

              prevLogs.forEach((log) => {
                const key = `${log.EmployeeID}_${log.Date}`;
                uniqueLogsMap.set(key, log);
              });

              absentLogs.forEach((log) => {
                const key = `${log.EmployeeID}_${log.Date}`;
                if (!uniqueLogsMap.has(key)) {
                  uniqueLogsMap.set(key, log);
                }
              });

              return Array.from(uniqueLogsMap.values());
            });
          }
        }
      );
    }
  }, [selectedDate, logs.length]);

  useEffect(() => {
    const cleanup = scheduleAttendanceCheck();
    return cleanup;
  }, []);

  // Get filtered logs
  const filteredLogs = getFilteredLogs();
  // Create a debounced version of loadLogs
  const debouncedLoadLogs = useCallback(
    debounce(() => {
      loadLogs();
    }, 300),
    [loadLogs]
  );
  // Loading state
  if (isLoading && logs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-black text-2xl">
              Loading attendance logs...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[85rem] mx-auto">
      {/* Employee-specific date range filter */}
      <EmployeeDateRangeFilter
        onDataChange={handleEmployeeDataChange}
        onModeChange={handleEmployeeModeChange}
        isEmployeeSpecificMode={employeeSpecificMode}
        currentEmployeeId={currentEmployeeId}
        employeeDataDateRange={employeeDataDateRange}
      />
      {/* Header with date range and export */}
      <AttendanceHeader
        selectedRange={selectedRange}
        setSelectedRange={setSelectedRange}
        dateRanges={dateRanges}
        handleExport={handleExport}
        isLoading={isLoading}
      />

      {/* Search and filters */}
      <AttendanceFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedPosition={selectedPosition}
        setSelectedPosition={setSelectedPosition}
        positions={positions}
      />
      {/* Table displaying attendance logs */}
      <AttendanceTable
        logs={filteredLogs}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        handleStatusUpdate={handleStatusUpdate}
        loadMoreLogs={loadMoreLogs}
        hasLogs={logs.length > 0}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AttendanceLogs;