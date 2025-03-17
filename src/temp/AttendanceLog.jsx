
// // AttendanceLogs.js
// import React, { useState, useEffect, useCallback } from "react";
// import AttendanceHeader from "./attendance/AttendanceHeader";
// import AttendanceFilters from "./attendance/AttendanceFilters";
// import AttendanceTable from "./attendance/AttendanceTable"; 
// import showError from "./Notifications/Error";
// import { format, subMonths } from "date-fns";
// import AttendanceService from './services/attendanceService';
 
// import { debounce } from 'lodash';
// import EmployeeDateRangeFilter from "./attendance/EmployeeDateRangeFilter";

// const AttendanceLogs = () => {
//   // State variables
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedDate, setSelectedDate] = useState(
//     new Date().toISOString().split("T")[0]
//   );
//   const [selectedPosition, setSelectedPosition] = useState("");
//   const [selectedStatus, setSelectedStatus] = useState("");
//   const [selectedRange, setSelectedRange] = useState("1 Month");
//   const [logs, setLogs] = useState([]);
//   const [positions, setPositions] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [offset, setOffset] = useState(0);
//   const dateRanges = ["1 Month", "2 Months", "3 Months"];
//   const [initialLoadComplete, setInitialLoadComplete] = useState(false);
//   const [logsProcessedForToday, setLogsProcessedForToday] = useState(false);

//   // New state for employee-specific data
//   const [employeeSpecificMode, setEmployeeSpecificMode] = useState(false);
//   const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
//   const [employeeDataDateRange, setEmployeeDataDateRange] = useState({
//     start: null,
//     end: null,
//   });
//   const [statusUpdateRun, setStatusUpdateRun] = useState(false);

//   // And in the scheduler function
//   const setupStatusUpdateScheduler = () => {
//     // Run status updates at specific intervals
//     const updateInterval = setInterval(() => {
//       // Update all statuses at 6:00 PM (end of typical workday)
//       const currentTime = format(new Date(), "HH:mm");
//       if (currentTime === "18:00" && !statusUpdateRun) {
//         setStatusUpdateRun(true);
//         AttendanceService.updateAllStatuses()
//           .then(() => {
//             // Refresh logs to show updated statuses
//             loadLogs();
//           })
//           .catch((error) => {
//             console.error("Scheduled status update failed:", error);
//           });
//       } else if (currentTime !== "18:00") {
//         setStatusUpdateRun(false); // Reset for the next day
//       }
//     }, 60 * 1000); // Check every minute

//     // Clean up interval on component unmount
//     return () => clearInterval(updateInterval);
//   }; 

//   // Update the useEffect for attendance checking to use the enhanced version
//   useEffect(() => {
//     if (
//       selectedDate === format(new Date(), "yyyy-MM-dd") &&
//       logs.length > 0 &&
//       !logsProcessedForToday
//     ) {
//       setLogsProcessedForToday(true);
//       AttendanceService.markMissingEmployeesAsAbsent(logs).then(
//         (absentLogs) => {
//           if (absentLogs.length > 0) {
//             setLogs((prevLogs) => {
//               const uniqueLogsMap = new Map();

//               prevLogs.forEach((log) => {
//                 const key = `${log.EmployeeID}_${log.Date}`;
//                 uniqueLogsMap.set(key, log);
//               });

//               absentLogs.forEach((log) => {
//                 const key = `${log.EmployeeID}_${log.Date}`;
//                 if (!uniqueLogsMap.has(key)) {
//                   uniqueLogsMap.set(key, log);
//                 }
//               });

//               return Array.from(uniqueLogsMap.values());
//             });
//           }
//         }
//       );
//     }
//   }, [selectedDate, logs.length]);

//   // Add this to the main component's useEffect initialization
//   useEffect(() => {
//     const cleanupAttendanceCheck = scheduleAttendanceCheck();
//     const cleanupStatusUpdate = setupStatusUpdateScheduler();

//     return () => {
//       cleanupAttendanceCheck();
//       cleanupStatusUpdate();
//     };
//   }, []);

//   // Handler for data changes from EmployeeDateRangeFilter
//   const handleEmployeeDataChange = ({ logs, employeeId, dateRange }) => {
//     if (logs && logs.length > 0) {
//       setLogs(logs);
//       setCurrentEmployeeId(employeeId);
//       setEmployeeDataDateRange(dateRange);

//       // Reset filters to show only this employee's data
//       setSearchTerm(employeeId);
//       setSelectedDate(""); // Clear date filter to show all dates in range
//       setSelectedPosition(""); // Clear position filter
//       setSelectedStatus(""); // Clear status filter
//     }
//   };

//   // Handler for mode changes from EmployeeDateRangeFilter
//   const handleEmployeeModeChange = (isEmployeeMode) => {
//     setEmployeeSpecificMode(isEmployeeMode);

//     if (!isEmployeeMode) {
//       // Reset to default view
//       setCurrentEmployeeId(null);
//       setEmployeeDataDateRange({ start: null, end: null });
//       setSearchTerm("");
//       setSelectedDate(new Date().toISOString().split("T")[0]); // Today's date
//       setOffset(0);
//       loadLogs(); // Reload all logs
//     }
//   };
//   // Main function to load attendance logs
//   const loadLogs = async () => {
//     // if (initialLoadComplete && !selectedDate) {
//     //   return; // Skip redundant loads
//     // }

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
//         fetchedLogs = await AttendanceService.fetchAttendanceLogs(selectedDate);
//       } else {
//         fetchedLogs = await AttendanceService.fetchAttendanceLogs();
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
//         const absentLogs = await AttendanceService.markMissingEmployeesAsAbsent(
//           uniqueLogs
//         );

//         if (absentLogs.length > 0) {
//           // Update state with new absent logs
//           setLogs((prevLogs) => {
//             // Create a Set of existing unique keys to avoid duplicates
//             const existingKeys = new Set(
//               prevLogs.map((log) => `${log.EmployeeID}_${log.Date}`)
//             );

//             // Filter out any duplicate logs before adding
//             const newAbsentLogs = absentLogs.filter((log) => {
//               const key = `${log.EmployeeID}_${log.Date}`;
//               return !existingKeys.has(key);
//             });

//             return [...prevLogs, ...newAbsentLogs];
//           });
//         }
//       }
//       setInitialLoadComplete(true);
//     } catch (error) {
//       showError("Error loading logs!");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Load more logs for infinite scrolling/pagination
//   const loadMoreLogs = async () => {
//     setIsLoading(true);

//     try {
//       // Calculate date range based on selected range
//       const months = parseInt(selectedRange.split(" ")[0]);
//       const startDate = format(subMonths(new Date(), months), "yyyy-MM-dd");
//       const endDate = format(new Date(), "yyyy-MM-dd");

//       // Include current filters in the fetch
//       const dateFilter = selectedDate || null;

//       // This is the key change - use your current filters when fetching more
//       const newLogs = await AttendanceService.fetchAttendanceLogs(
//         dateFilter,
//         startDate,
//         endDate,
//         offset + AttendanceService.PAGE_SIZE
//       );
//       if (newLogs.length > 0) {
//         // Use a more robust approach to deduplication
//         setLogs((prevLogs) => {
//           // Create a Map to track unique entries by ID+Date
//           const uniqueLogsMap = new Map();

//           // First add all existing logs to the map
//           prevLogs.forEach((log) => {
//             const key = `${log.EmployeeID}_${log.Date}`;
//             uniqueLogsMap.set(key, log);
//           });

//           // Then add new logs, overwriting duplicates if needed
//           newLogs.forEach((log) => {
//             const key = `${log.EmployeeID}_${log.Date}`;
//             // Only add if not already in the map
//             if (!uniqueLogsMap.has(key)) {
//               uniqueLogsMap.set(key, log);
//             }
//           });

//           // Convert map values back to array
//           return Array.from(uniqueLogsMap.values());
//         });

//         setOffset((prevOffset) => prevOffset + AttendanceService.PAGE_SIZE);
//       }
//     } catch (error) {
//       console.error("Error loading more logs:", error);
//       showError("Error loading more logs!");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Handle exporting attendance data
//   const handleExport = async () => {
//     setIsLoading(true);

//     try {
//       // Parse the number of months from the selected range
//       const months = parseInt(selectedRange.split(" ")[0]);

//       // Calculate date range based on selected months
//       const endDate = format(new Date(), "yyyy-MM-dd");
//       const startDate = format(subMonths(new Date(), months), "yyyy-MM-dd");

//       // Explicitly fetch the logs only when the export button is clicked
//       const fetchedLogs = await AttendanceService.fetchAttendanceLogs(
//         null,
//         startDate,
//         endDate
//       );

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
//       const completeLogs = AttendanceService.fillMissingDates(
//         uniqueLogs,
//         startDate,
//         endDate
//       );

//       // Export the data to CSV
//       const exported = AttendanceService.exportLogsToCSV(
//         completeLogs,
//         startDate,
//         endDate
//       );

//       if (!exported) {
//         showError("No data to export");
//       }
//     } catch (error) {
//       showError("Failed to export logs. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Handle status update
//   const handleStatusUpdate = async (employeeId, date, newStatus) => {
//     try {
//       // Find existing log in state
//       const existingLogIndex = logs.findIndex(
//         (log) => log.EmployeeID === employeeId && log.Date === date
//       );

//       // Optimistic UI update
//       if (existingLogIndex >= 0) {
//         setLogs((prevLogs) => {
//           const updatedLogs = [...prevLogs];
//           updatedLogs[existingLogIndex] = {
//             ...updatedLogs[existingLogIndex],
//             Status: newStatus,
//           };
//           return updatedLogs;
//         });
//       }

//       // Update in database
//       await AttendanceService.updateEmployeeStatus(employeeId, date, newStatus);
//     } catch (error) {
//       showError("Failed to update status!");
//       // Revert optimistic update
//       loadLogs();
//     }
//   };

//   // Initialize attendance check scheduler
//   const scheduleAttendanceCheck = () => {
//     // Run every hour
//     const checkAbsentInterval = setInterval(() => {
//       if (format(new Date(), "HH:mm") === "12:00") {
//         // At noon, mark employees as absent if they haven't checked in
//         AttendanceService.markMissingEmployeesAsAbsent(logs)
//           .then((absentLogs) => {
//             if (absentLogs.length > 0) {
//               setLogs((prevLogs) => [...prevLogs, ...absentLogs]);
//             }
//           })
//           .catch((error) => {
//             console.error("Scheduled attendance check failed:", error);
//           });
//       }
//     }, 60 * 1000); // Check every minute

//     // Clean up interval on component unmount
//     return () => clearInterval(checkAbsentInterval);
//   };

//   // Filter logs based on search/filter criteria
//   const getFilteredLogs = () => {
//     return logs.filter((log) => {
//       const matchesSearch =
//         !searchTerm ||
//         log.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         log.EmployeeID?.toLowerCase().includes(searchTerm.toLowerCase());

//       const matchesDate = !selectedDate || log.Date === selectedDate;

//       const matchesPosition =
//         !selectedPosition || log.Position?.trim() === selectedPosition;

//       const matchesStatus =
//         !selectedStatus ||
//         log.Status?.toUpperCase() === selectedStatus.toUpperCase();

//       // For employee-specific mode, only filter by status and date if needed
//       if (employeeSpecificMode && currentEmployeeId) {
//         if (log.EmployeeID !== currentEmployeeId) return false;
//         return (
//           (!selectedDate || log.Date === selectedDate) &&
//           (!selectedStatus ||
//             log.Status?.toUpperCase() === selectedStatus.toUpperCase())
//         );
//       }

//       return matchesSearch && matchesDate && matchesPosition && matchesStatus;
//     });
//   };
//   // Replace your existing useEffect for selectedDate with this:
//   useEffect(() => {
//     // Clear any previous debouncing
//     if (debouncedLoadLogs.cancel) {
//       debouncedLoadLogs.cancel();
//     }

//     // Call loadLogs directly when date changes (no debouncing)
//     loadLogs();
//   }, [selectedDate]); // Only selectedDate as dependency
 

//   useEffect(() => {
//     // Only run for today's date and when logs are loaded
//     if (
//       selectedDate === format(new Date(), "yyyy-MM-dd") &&
//       logs.length > 0 &&
//       // Add a flag to prevent repeated calls
//       !logsProcessedForToday
//     ) {
//       setLogsProcessedForToday(true);
//       AttendanceService.markMissingEmployeesAsAbsent(logs).then(
//         (absentLogs) => {
//           if (absentLogs.length > 0) {
//             // Use the deduplication logic here
//             setLogs((prevLogs) => {
//               const uniqueLogsMap = new Map();

//               prevLogs.forEach((log) => {
//                 const key = `${log.EmployeeID}_${log.Date}`;
//                 uniqueLogsMap.set(key, log);
//               });

//               absentLogs.forEach((log) => {
//                 const key = `${log.EmployeeID}_${log.Date}`;
//                 if (!uniqueLogsMap.has(key)) {
//                   uniqueLogsMap.set(key, log);
//                 }
//               });

//               return Array.from(uniqueLogsMap.values());
//             });
//           }
//         }
//       );
//     }
//   }, [selectedDate, logs.length]);

//   useEffect(() => {
//     const cleanup = scheduleAttendanceCheck();
//     return cleanup;
//   }, []);

//   // Get filtered logs
//   const filteredLogs = getFilteredLogs();
//   // Create a debounced version of loadLogs
//   const debouncedLoadLogs = useCallback(
//     debounce(() => {
//       loadLogs();
//     }, 300),
//     [loadLogs]
//   );
//   // Loading state
//   if (isLoading && logs.length === 0) {
//     return (
//       <div className="max-w-7xl mx-auto p-8">
//         <div className="bg-white rounded-xl shadow-lg p-8">
//           <div className="flex justify-center items-center h-64">
//             <div className="text-black text-2xl">
//               Loading attendance logs...
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-[85rem] mx-auto">
//       {/* Employee-specific date range filter */}
//       <EmployeeDateRangeFilter
//         onDataChange={handleEmployeeDataChange}
//         onModeChange={handleEmployeeModeChange}
//         isEmployeeSpecificMode={employeeSpecificMode}
//         currentEmployeeId={currentEmployeeId}
//         employeeDataDateRange={employeeDataDateRange}
//       />
//       {/* Header with date range and export */}
//       <AttendanceHeader
//         selectedRange={selectedRange}
//         setSelectedRange={setSelectedRange}
//         dateRanges={dateRanges}
//         handleExport={handleExport}
//         isLoading={isLoading}
//       />

//       {/* Search and filters */}
//       <AttendanceFilters
//         searchTerm={searchTerm}
//         setSearchTerm={setSearchTerm}
//         selectedDate={selectedDate}
//         setSelectedDate={setSelectedDate}
//         selectedPosition={selectedPosition}
//         setSelectedPosition={setSelectedPosition}
//         positions={positions}
//       />
//       {/* Table displaying attendance logs */}
//       <AttendanceTable
//         logs={filteredLogs}
//         selectedStatus={selectedStatus}
//         setSelectedStatus={setSelectedStatus}
//         handleStatusUpdate={handleStatusUpdate}
//         loadMoreLogs={loadMoreLogs}
//         hasLogs={logs.length > 0}
//         isLoading={isLoading} 
//       />
//     </div>
//   );
// };

// export   AttendanceLogs;
























// import { databases } from "../../Appwrite/appwriteService";
// import conf from "../../conf/conf";
// import { Query } from "appwrite";
// import { format, subMonths } from "date-fns";
// import showError from "../Notifications/Error";

// const PAGE_SIZE = 30; // Number of logs per request
// const ATTENDANCE_RULES = {
//   MORNING_SHIFT: {
//     START_TIME: "09:00", // 9:00 AM
//     END_TIME: "17:00", // 5:00 PM
//     LATE_THRESHOLD: "09:15", // 15 minutes grace period
//     ABSENT_CUTOFF: "13:00", // Absent if not arrived by this time
//     EARLY_CHECKOUT_TIME: "16:30", // Early if leaving before this time
//     STANDARD_HOURS: 8, // Standard shift hours
//     OVERTIME_THRESHOLD: 9, // Hours for overtime qualification
//     HALF_DAY_HOURS: 4, // Hours for half-day qualification
//   },
//   AFTERNOON_SHIFT: {
//     START_TIME: "13:00", // 1:00 PM
//     END_TIME: "21:00", // 9:00 PM
//     LATE_THRESHOLD: "13:15", // 15 minutes grace period
//     ABSENT_CUTOFF: "17:00", // Absent if not arrived by this time
//     EARLY_CHECKOUT_TIME: "20:30", // Early if leaving before this time
//     STANDARD_HOURS: 8, // Standard shift hours
//     OVERTIME_THRESHOLD: 9, // Hours for overtime qualification
//     HALF_DAY_HOURS: 4, // Hours for half-day qualification
//   },
//   NIGHT_SHIFT: {
//     START_TIME: "21:00", // 9:00 PM
//     END_TIME: "05:00", // 5:00 AM next day
//     LATE_THRESHOLD: "21:15", // 15 minutes grace period
//     ABSENT_CUTOFF: "00:00", // Absent if not arrived by midnight
//     EARLY_CHECKOUT_TIME: "04:30", // Early if leaving before this time
//     STANDARD_HOURS: 8, // Standard shift hours
//     OVERTIME_THRESHOLD: 9, // Hours for overtime qualification
//     HALF_DAY_HOURS: 4, // Hours for half-day qualification
//   },
// };

// // Enhanced cache implementation with more features
// const cache = {
//   employees: null,
//   employeesByID: new Map(),
//   logs: new Map(), // Cache for attendance logs
//   statusResults: new Map(), // Cache for status determination results
//   expiryTime: 5 * 60 * 1000, // 5 minutes
//   lastFetch: {
//     employees: 0,
//     logs: new Map(), // Track last fetch time for each date/query
//   },

//   async getEmployees() {
//     const now = Date.now();
//     if (!this.employees || now - this.lastFetch.employees > this.expiryTime) {
//       try {
//         const response = await databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteEmployeeCollectionId
//         );
//         this.employees = response.documents || [];
//         this.employeesByID = new Map(
//           this.employees.map((emp) => [emp.EmployeeID, emp])
//         );
//         this.lastFetch.employees = now;
//       } catch (error) {
//         showError("Error fetching employees cache");
//         // Keep old data on error
//         if (!this.employees) this.employees = [];
//       }
//     }
//     return this.employees;
//   },

//   async getEmployee(employeeId) {
//     if (this.employeesByID.has(employeeId)) {
//       return this.employeesByID.get(employeeId);
//     }

//     // Refresh cache if employee not found
//     await this.getEmployees();
//     return this.employeesByID.get(employeeId);
//   },

//   async getLogs(date, startDate, endDate, offset = 0) {
//     const cacheKey = `${date || ""}_${startDate || ""}_${
//       endDate || ""
//     }_${offset}`;
//     const now = Date.now();

//     if (
//       !this.logs.has(cacheKey) ||
//       now - (this.lastFetch.logs.get(cacheKey) || 0) > this.expiryTime
//     ) {
//       const logs = await fetchAttendanceLogsRaw(
//         date,
//         startDate,
//         endDate,
//         offset
//       );
//       this.logs.set(cacheKey, logs);
//       this.lastFetch.logs.set(cacheKey, now);
//     }

//     return this.logs.get(cacheKey);
//   },

//   cacheStatus(inTime, outTime, totalTime, employeeShift, dateString, result) {
//     const key = `${inTime}-${outTime}-${totalTime}-${employeeShift}-${dateString}`;
//     this.statusResults.set(key, result);

//     // Limit status cache size to 500 entries
//     if (this.statusResults.size > 500) {
//       const firstKey = this.statusResults.keys().next().value;
//       this.statusResults.delete(firstKey);
//     }
//   },

//   getStatus(inTime, outTime, totalTime, employeeShift, dateString) {
//     const key = `${inTime}-${outTime}-${totalTime}-${employeeShift}-${dateString}`;
//     return this.statusResults.get(key);
//   },

//   clearCache(type = "all") {
//     if (type === "all" || type === "employees") {
//       this.employees = null;
//       this.employeesByID.clear();
//       this.lastFetch.employees = 0;
//     }
//     if (type === "all" || type === "logs") {
//       this.logs.clear();
//       this.lastFetch.logs.clear();
//     }
//     if (type === "all" || type === "status") {
//       this.statusResults.clear();
//     }
//   },

//   invalidateDate(date) {
//     // Remove cache entries for specific date
//     for (const key of this.logs.keys()) {
//       if (key.includes(date)) {
//         this.logs.delete(key);
//         this.lastFetch.logs.delete(key);
//       }
//     }
//   },
// };

// // Raw fetch function - lower level implementation
// const fetchAttendanceLogsRaw = async (
//   date = null,
//   startDate = null,
//   endDate = null,
//   offset = 0
// ) => {
//   try {
//     const queries = [
//       Query.limit(PAGE_SIZE),
//       Query.offset(offset),
//       Query.orderAsc("EmployeeID"),
//     ];

//     if (date) {
//       queries.push(Query.equal("Date", date));
//     } else if (startDate && endDate) {
//       queries.push(Query.between("Date", startDate, endDate));
//     }

//     const response = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteAttendanceLogsCollectionId,
//       queries
//     );

//     return response.documents || [];
//   } catch (error) {
//     showError("Error fetching attendance logs!");
//     return [];
//   }
// };

// // Fetch attendance logs with caching
// const fetchAttendanceLogs = async (
//   date = null,
//   startDate = null,
//   endDate = null,
//   offset = 0
// ) => {
//   return cache.getLogs(date, startDate, endDate, offset);
// };

// // Fetch employees from cache
// const fetchEmployees = async () => {
//   return cache.getEmployees();
// };

// // Optimized update employee status with batch processing capability
// const updateEmployeeStatus = async (
//   employeeId,
//   date,
//   newStatus,
//   batchMode = false
// ) => {
//   try {
//     // Find existing log in database
//     const existingLogsResponse = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteAttendanceLogsCollectionId,
//       [Query.equal("EmployeeID", employeeId), Query.equal("Date", date)]
//     );

//     if (existingLogsResponse.documents.length > 0) {
//       // Update the existing record
//       const existingLog = existingLogsResponse.documents[0];
//       const result = await databases.updateDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         existingLog.$id,
//         { Status: newStatus }
//       );

//       // Invalidate cache for this date
//       if (!batchMode) cache.invalidateDate(date);

//       return result;
//     } else {
//       // Get employee from cache
//       const employee = await cache.getEmployee(employeeId);

//       if (!employee) {
//         showError("Employee not found!");
//         return null;
//       }

//       // Create new log
//       const newLogData = {
//         EmployeeID: employee.EmployeeID,
//         FullName: employee.FullName || "",
//         Position: employee.Position || "",
//         Department: employee.Department || "",
//         Shift: employee.Shift || "MORNING",
//         Supervisor: employee.Supervisor || "",
//         Date: date,
//         InTime: "0.00",
//         OutTime: "0.00",
//         TotalTime: 0.0,
//         Status: newStatus,
//       };

//       const result = await databases.createDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         "unique()",
//         newLogData
//       );

//       // Invalidate cache for this date
//       if (!batchMode) cache.invalidateDate(date);

//       return result;
//     }
//   } catch (error) {
//     showError("Failed to update status!");
//     return null;
//   }
// };

// // Batch update multiple employee statuses
// const batchUpdateStatuses = async (updates) => {
//   if (!updates || updates.length === 0) return [];

//   const results = [];
//   const affectedDates = new Set();

//   for (const update of updates) {
//     const result = await updateEmployeeStatus(
//       update.employeeId,
//       update.date,
//       update.status,
//       true // batch mode = true
//     );
//     results.push(result);
//     affectedDates.add(update.date);
//   }

//   // Invalidate cache for all affected dates at once
//   affectedDates.forEach((date) => cache.invalidateDate(date));

//   return results;
// };

// // Fill missing dates for complete reporting
// const fillMissingDates = (logs, startDate, endDate) => {
//   const allDates = [];
//   let currentDate = new Date(startDate);

//   while (currentDate <= new Date(endDate)) {
//     allDates.push(format(currentDate, "yyyy-MM-dd"));
//     currentDate.setDate(currentDate.getDate() + 1);
//   }

//   // Get a unique list of employees from logs
//   const employeeIDs = [...new Set(logs.map((log) => log.EmployeeID))];

//   // Convert logs to a map for faster lookup (key = date + employee ID)
//   const logMap = new Map(
//     logs.map((log) => [`${log.Date}_${log.EmployeeID}`, log])
//   );

//   // Generate a complete log ensuring every employee has an entry for every date
//   const completeLogs = [];
//   allDates.forEach((date) => {
//     employeeIDs.forEach((empID) => {
//       completeLogs.push(
//         logMap.get(`${date}_${empID}`) || {
//           Date: date,
//           Status: "Absent",
//           EmployeeID: empID,
//         }
//       );
//     });
//   });

//   return completeLogs;
// };

// // Export logs to CSV
// const exportLogsToCSV = (logs, startDate, endDate) => {
//   if (!logs.length) {
//     return false;
//   }

//   // Define the headers in the exact order you want them to appear
//   const headerOrder = [
//     "EmployeeID",
//     "FullName",
//     "Position",
//     "Department",
//     "Date",
//     "InTime",
//     "OutTime",
//     "TotalTime",
//     "Status",
//   ];

//   // Create the CSV header row using the defined order
//   const headerRow = headerOrder.join(",");

//   // Map each log to a CSV row with values in the same order as headers
//   const csvData = logs.map((log) => {
//     return headerOrder
//       .map((header) => {
//         const value = log[header] || "";
//         // Ensure values with commas are properly quoted
//         return value.toString().includes(",") ? `"${value}"` : value;
//       })
//       .join(",");
//   });

//   // Combine header and data rows
//   const csvContent = [headerRow, ...csvData].join("\n");

//   // Create and trigger download
//   const blob = new Blob([csvContent], { type: "text/csv" });
//   const url = window.URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `attendance_logs_${startDate}_to_${endDate}.csv`;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   window.URL.revokeObjectURL(url);

//   return true;
// };

// // Helper function to check if a date is a weekend
// const isWeekend = (dateString) => {
//   const date = new Date(dateString);
//   const day = date.getDay();
//   // return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
//   if (day === 0 || day === 6) {
//     return { nonWorking: true, reason: "WEEKEND" };
//   }
//   // Add holiday check (would need to be configured with your holidays)
//   const holidays = {
//     // Format: 'YYYY-MM-DD': 'Holiday Name'
//     "2025-01-01": "New Year",
//     "2025-12-25": "Christmas",
//     // Add more holidays as needed
//   };

//   if (holidays[dateString]) {
//     return { nonWorking: true, reason: `HOLIDAY-${holidays[dateString]}` };
//   }

//   return { nonWorking: false };
// };

// // Enhanced helper function to check if one time is after another, handling overnight shifts
// const isTimeAfter = (time1, time2, isOvernightShift = false) => {
//   // Convert HH:MM format to comparable values
//   const [hours1, minutes1] = time1.split(":").map(Number);
//   const [hours2, minutes2] = time2.split(":").map(Number);

//   // For overnight shifts, adjust the logic
//   if (isOvernightShift) {
//     // If both times are in the same "day half" (both before or both after midnight)
//     const time1BeforeMidnight = hours1 >= 12;
//     const time2BeforeMidnight = hours2 >= 12;

//     if (time1BeforeMidnight !== time2BeforeMidnight) {
//       // If time1 is after midnight and time2 is before midnight, time1 is later
//       // If time1 is before midnight and time2 is after midnight, time1 is earlier
//       return !time1BeforeMidnight;
//     }
//   }

//   // Standard comparison
//   if (hours1 > hours2) return true;
//   if (hours1 < hours2) return false;

//   // If hours are equal, compare minutes
//   return minutes1 > minutes2;
// };

//  // Enhanced processAttendanceScan that handles all scenarios 
// const processAttendanceScan = async (employeeId, scanTime) => {
//   try {
//     // Get employee from cache - Remain same
//     const employee = await cache.getEmployee(employeeId);
//     if (!employee) {
//       showError("Employee not found!");
//       return null;
//     }

//     // Initialize date variables - Remain same
//     const now = new Date(scanTime);
//     const today = format(now, "yyyy-MM-dd");
//     const yesterday = format(subMonths(now, 0), "yyyy-MM-dd");
//     const tomorrow = format(new Date(now.getTime() + 86400000), "yyyy-MM-dd");
//     const timeFormatted = format(now, "HH.mm");

//     // Parse scan time once - Remain same
//     const scanTimeParts = timeFormatted.split(".");
//     const scanHour = parseInt(scanTimeParts[0], 10);
//     const scanMinute = parseInt(scanTimeParts[1], 10);
//     const scanTimeMinutes = scanHour * 60 + scanMinute;

//     // Get shift information - Remain same
//     const shift = employee.Shift || "MORNING";
//     const shiftRules =
//       ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;
//     const isNightShift = shift === "NIGHT";

//     // Parse shift times once - Remain same
//     const shiftStartTime = shiftRules.START_TIME.split(":").map(Number);
//     const shiftEndTime = shiftRules.END_TIME.split(":").map(Number);
//     const shiftStartMinutes = shiftStartTime[0] * 60 + shiftStartTime[1];
//     const shiftEndMinutes = shiftEndTime[0] * 60 + shiftEndTime[1];
//     const isOvernightShift =
//       isNightShift || shiftEndMinutes < shiftStartMinutes;
//     const isAfternoonShift = shift === "AFTERNOON";

//     // Fetch all relevant records
//     const [todayRecords, yesterdayRecords] = await Promise.all([
//       databases.listDocuments(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         [
//           Query.equal("EmployeeID", employeeId),
//           Query.equal("Date", today),
//           Query.orderDesc("$updatedAt"),
//         ]
//       ),
//       databases.listDocuments(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         [
//           Query.equal("EmployeeID", employeeId),
//           Query.equal("Date", yesterday),
//           Query.orderDesc("$updatedAt"),
//         ]
//       ),
//     ]);

//     // Initialize variables
//     let dateToUse = today;
//     let checkingIn = true;
//     let recordToUpdate = null;
//     let createNew = false;

//     // For night shift specifically
//     if (isNightShift) {
//       // Early morning check (likely checkout for yesterday's shift) 
//       if (scanHour < 12) {
//         // First check if today already has a complete record
//         if (todayRecords.documents.length > 0) {
//           const todayRecord = todayRecords.documents[0];

//           if (todayRecord.InTime !== "0.00" && todayRecord.OutTime !== "0.00") {
//             // Today already has a complete record, create new
//             dateToUse = today;
//             checkingIn = true;
//             createNew = true;
//           } else if (
//             todayRecord.InTime !== "0.00" &&
//             todayRecord.OutTime === "0.00"
//           ) {
//             // Today has an open check-in, this is checkout
//             dateToUse = today;
//             checkingIn = false;
//             recordToUpdate = todayRecord;
//           } else {
//             // Look for yesterday's record for potential checkout
//             if (yesterdayRecords.documents.length > 0) {
//               const yesterdayRecord = yesterdayRecords.documents[0];
//               if (
//                 yesterdayRecord.InTime !== "0.00" &&
//                 yesterdayRecord.OutTime === "0.00"
//               ) {
//                 // Yesterday has an open check-in, this is checkout
//                 dateToUse = yesterday;
//                 checkingIn = false;
//                 recordToUpdate = yesterdayRecord;
//               } else {
//                 // Use today's record for check-in
//                 dateToUse = today;
//                 checkingIn = true;
//                 recordToUpdate = todayRecord;
//               }
//             } else {
//               // No yesterday records, use today
//               dateToUse = today;
//               checkingIn = true;
//               recordToUpdate = todayRecord;
//             }
//           }
//         } else {
//           // No records today, check yesterday
//           if (yesterdayRecords.documents.length > 0) {
//             const yesterdayRecord = yesterdayRecords.documents[0];
//             if (
//               yesterdayRecord.InTime !== "0.00" &&
//               yesterdayRecord.OutTime === "0.00"
//             ) {
//               // Yesterday has an open check-in, this is checkout
//               dateToUse = yesterday;
//               checkingIn = false;
//               recordToUpdate = yesterdayRecord;
//             } else {
//               // Create new for today
//               dateToUse = today;
//               checkingIn = true;
//               createNew = true;
//             }
//           } else {
//             // No records yesterday or today, create new
//             dateToUse = today;
//             checkingIn = true;
//             createNew = true;
//           }
//         }
//       } else {
//         // Evening check (likely check-in for today's shift)
//         if (todayRecords.documents.length > 0) {
//           const todayRecord = todayRecords.documents[0];

//           // If there's a complete record for today already
//           if (todayRecord.OutTime !== "0.00") {
//             // Create a new check-in record
//             dateToUse = today;
//             checkingIn = true;
//             createNew = true;
//           } else if (todayRecord.InTime !== "0.00") {
//             // Already checked in, this is checkout
//             dateToUse = today;
//             checkingIn = false;
//             recordToUpdate = todayRecord;
//           } else {
//             // Update today's record with check-in
//             dateToUse = today;
//             checkingIn = true;
//             recordToUpdate = todayRecord;
//           }
//         } else {
//           // No records today, create new
//           dateToUse = today;
//           checkingIn = true;
//           createNew = true;
//         }
//       }
//     } else if (isAfternoonShift) {
//       // Afternoon shift logic (typically spans a single day)
//       if (todayRecords.documents.length > 0) {
//         const todayRecord = todayRecords.documents[0];

//         // If there's a complete record for today already
//         if (todayRecord.OutTime !== "0.00") {
//           // Create a new check-in record
//           dateToUse = today;
//           checkingIn = true;
//           createNew = true;
//         } else if (todayRecord.InTime !== "0.00") {
//           // Already checked in, this is checkout
//           dateToUse = today;
//           checkingIn = false;
//           recordToUpdate = todayRecord;
//         } else {
//           // Update today's record with check-in
//           dateToUse = today;
//           checkingIn = true;
//           recordToUpdate = todayRecord;
//         }
//       } else {
//         // No records today, create new
//         dateToUse = today;
//         checkingIn = true;
//         createNew = true;
//       }
//     } else {
//       // Regular shift logic - Remain same
//       if (todayRecords.documents.length > 0) {
//         const todayRecord = todayRecords.documents[0];

//         if (todayRecord.OutTime !== "0.00") {
//           // Already checked out, create new
//           dateToUse = today;
//           checkingIn = true;
//           createNew = true;
//         } else if (todayRecord.InTime !== "0.00") {
//           // Already checked in, not checked out
//           dateToUse = today;
//           checkingIn = false;
//           recordToUpdate = todayRecord;
//         } else {
//           // Update today's empty record
//           dateToUse = today;
//           checkingIn = true;
//           recordToUpdate = todayRecord;
//         }
//       } else {
//         // No records today, create new
//         dateToUse = today;
//         checkingIn = true;
//         createNew = true;
//       }
//     }

//     // Process the scan based on our determination
//     let result;

//     if (createNew) {
//       // Create new check-in record
//       const newLogData = {
//         EmployeeID: employee.EmployeeID,
//         FullName: employee.FullName || "",
//         Position: employee.Position || "",
//         Department: employee.Department || "",
//         Shift: employee.Shift || "MORNING",
//         Supervisor: employee.Supervisor || "",
//         Date: dateToUse,
//         InTime: timeFormatted,
//         OutTime: "0.00",
//         TotalTime: 0.0,
//         Status: determineAttendanceStatus(
//           timeFormatted,
//           null,
//           0,
//           employee.Shift,
//           dateToUse
//         ),
//       };

//       result = await databases.createDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         "unique()",
//         newLogData
//       );
//     } else if (recordToUpdate) {
//       if (checkingIn) {
//         // Update with check-in time
//         result = await databases.updateDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           recordToUpdate.$id,
//           {
//             InTime: timeFormatted,
//             Status: determineAttendanceStatus(
//               timeFormatted,
//               null,
//               0,
//               employee.Shift,
//               dateToUse
//             ),
//           }
//         );
//       } else {
//         // Calculate total time for checkout
//         const inTimeParts = recordToUpdate.InTime.split(".").map(Number);
//         const outTimeParts = timeFormatted.split(".").map(Number);

//         let totalMinutes;
//         if (isOvernightShift && outTimeParts[0] < inTimeParts[0]) {
//           totalMinutes =
//             (outTimeParts[0] + 24) * 60 +
//             outTimeParts[1] -
//             (inTimeParts[0] * 60 + inTimeParts[1]);
//         } else {
//           totalMinutes =
//             outTimeParts[0] * 60 +
//             outTimeParts[1] -
//             (inTimeParts[0] * 60 + inTimeParts[1]);
//         }

//         if (totalMinutes < 0) {
//           showError("Invalid checkout time: earlier than check-in time");
//           return null;
//         }

//         const totalTimeHours = (totalMinutes / 60).toFixed(2);

//         result = await databases.updateDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           recordToUpdate.$id,
//           {
//             OutTime: timeFormatted,
//             TotalTime: totalTimeHours,
//             Status: determineAttendanceStatus(
//               recordToUpdate.InTime,
//               timeFormatted,
//               totalTimeHours,
//               employee.Shift,
//               dateToUse
//             ),
//           }
//         );
//       }
//     } else {
//       // No valid record to update or create
//       showError("No valid attendance record found to update");
//       return null;
//     }

//     // Invalidate cache for affected dates - Remain same
//     cache.invalidateDate(today);
//     cache.invalidateDate(yesterday);
//     if (isOvernightShift) cache.invalidateDate(tomorrow);

//     return result;
//   } catch (error) {
//     console.error("Error processing attendance scan:", error);
//     showError("Failed to process attendance scan!");
//     return null;
//   }
// };
 
// // Add this utility function to AttendanceService
// const diagnoseScanIssue = (employeeId) => {
//   return new Promise(async (resolve) => {
//     try {
//       const employee = await cache.getEmployee(employeeId);
//       if (!employee) {
//         resolve({success: false, message: "Employee not found"});
//         return;
//       }
      
//       const now = new Date();
//       const today = format(now, "yyyy-MM-dd");
//       const yesterday = format(subMonths(now, 0), "yyyy-MM-dd");
      
//       const [todayRecords, yesterdayRecords] = await Promise.all([
//         databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           [
//             Query.equal("EmployeeID", employeeId),
//             Query.equal("Date", today),
//             Query.orderDesc("$updatedAt"), 
//           ]
//         ),
//         databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           [
//             Query.equal("EmployeeID", employeeId),
//             Query.equal("Date", yesterday),
//             Query.orderDesc("$updatedAt"),
//           ]
//         )
//       ]);
      
//       resolve({
//         success: true,
//         employee,
//         todayRecords: todayRecords.documents,
//         yesterdayRecords: yesterdayRecords.documents,
//         currentHour: now.getHours(),
//         currentMinute: now.getMinutes()
//       });
//     } catch (error) {
//       resolve({success: false, message: error.message});
//     }
//   });
// };

// // Optimized attendance status determination with caching
// const determineAttendanceStatus = (
//   inTime,
//   outTime,
//   totalTime,
//   employeeShift,
//   dateString
// ) => {
//   // Check cache first
//   const cachedResult = cache.getStatus(
//     inTime,
//     outTime,
//     totalTime,
//     employeeShift,
//     dateString
//   );
//   if (cachedResult) return cachedResult;

//   // Original function implementation - Remain same
//   // First check if it's a weekend
//   if (isWeekend(dateString)) {
//     const result = "WEEKEND";
//     cache.cacheStatus(
//       inTime,
//       outTime,
//       totalTime,
//       employeeShift,
//       dateString,
//       result
//     );
//     return result;
//   }

//   // If no check-in time recorded, employee is absent
//   if (!inTime || inTime === "0.00") {
//     const result = "ABSENT";
//     cache.cacheStatus(
//       inTime,
//       outTime,
//       totalTime,
//       employeeShift,
//       dateString,
//       result
//     );
//     return result;
//   }

//   // Get shift rules
//   const shift = employeeShift || "MORNING";
//   const shiftRules = ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;

//   // Check if this is an overnight shift
//   const isOvernightShift = shift === "NIGHT";

//   // Convert inTime from "HH.mm" format to "HH:mm" format
//   const [inHours, inMinutes] = inTime.split(".").map(Number);
//   const formattedInTime = `${String(inHours).padStart(2, "0")}:${String(
//     inMinutes || 0
//   ).padStart(2, "0")}`;

//   // Check if employee has checked out
//   if (outTime && outTime !== "0.00") {
//     const [outHours, outMinutes] = outTime.split(".").map(Number);
//     const formattedOutTime = `${String(outHours).padStart(2, "0")}:${String(
//       outMinutes || 0
//     ).padStart(2, "0")}`;

//     // Parse total time as a number (assumes it's in hours)
//     const hoursWorked = parseFloat(totalTime);

//     // Determine if overtime was performed
//     if (hoursWorked >= shiftRules.OVERTIME_THRESHOLD) {
//       const result = "OVERTIME";
//       cache.cacheStatus(
//         inTime,
//         outTime,
//         totalTime,
//         employeeShift,
//         dateString,
//         result
//       );
//       return result;
//     }

//     // Check for early checkout
//     if (
//       isTimeAfter(
//         shiftRules.EARLY_CHECKOUT_TIME,
//         formattedOutTime,
//         isOvernightShift
//       )
//     ) {
//       const result = "EARLY CHECKOUT";
//       cache.cacheStatus(
//         inTime,
//         outTime,
//         totalTime,
//         employeeShift,
//         dateString,
//         result
//       );
//       return result;
//     }

//     // Check for half-day
//     if (hoursWorked <= shiftRules.HALF_DAY_HOURS && hoursWorked > 0) {
//       const result = "HALF-DAY";
//       cache.cacheStatus(
//         inTime,
//         outTime,
//         totalTime,
//         employeeShift,
//         dateString,
//         result
//       );
//       return result;
//     }
//   }

//   // Basic attendance determination
//   if (
//     isTimeAfter(formattedInTime, shiftRules.LATE_THRESHOLD, isOvernightShift)
//   ) {
//     const result = "LATE";
//     cache.cacheStatus(
//       inTime,
//       outTime,
//       totalTime,
//       employeeShift,
//       dateString,
//       result
//     );
//     return result;
//   } else {
//     const result = "PRESENT";
//     cache.cacheStatus(
//       inTime,
//       outTime,
//       totalTime,
//       employeeShift,
//       dateString,
//       result
//     );
//     return result;
//   }
// };

// const updateAllStatuses = async () => {
//   try {
//     const today = format(new Date(), "yyyy-MM-dd");
//     const logs = await fetchAttendanceLogs(today);

//     // Filter logs that need processing
//     const logsToUpdate = logs.filter(
//       (log) =>
//         log.InTime &&
//         log.InTime !== "0.00" &&
//         log.OutTime &&
//         log.OutTime !== "0.00"
//     );

//     if (logsToUpdate.length === 0) return true;

//     // Prepare batch updates
//     const updates = [];
//     const CHUNK_SIZE = 10; // Process in chunks of 10

//     for (const log of logsToUpdate) {
//       const advancedStatus = determineAttendanceStatus(
//         log.InTime,
//         log.OutTime,
//         log.TotalTime,
//         log.Shift,
//         today
//       );

//       // Only update if status is different
//       if (log.Status !== advancedStatus) {
//         updates.push(
//           databases.updateDocument(
//             conf.appwriteDatabaseId,
//             conf.appwriteAttendanceLogsCollectionId,
//             log.$id,
//             { Status: advancedStatus }
//           )
//         );
//       }
//     }

//     // Process in chunks to avoid overwhelming the server
//     for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
//       const chunk = updates.slice(i, i + CHUNK_SIZE);
//       await Promise.all(chunk);
//     }

//     // Invalidate cache for today's date
//     cache.invalidateDate(today);

//     return true;
//   } catch (error) {
//     console.error("Error updating statuses:", error);
//     return false;
//   }
// };

// // Optimized markMissingEmployeesAsAbsent with batching
// // const markMissingEmployeesAsAbsent = async (currentLogs) => {
// //   const today = format(new Date(), "yyyy-MM-dd");
// //     const currentTime = format(new Date(), "HH:mm");
// //     const currentHour = new Date().getHours();
// //   const defaultStatus = isWeekend(today) ? "WEEKEND" : "ABSENT";

// //   try {
// //     // Get employees from cache
// //     const allEmployees = await cache.getEmployees(); 

// //     // Create a set of employee IDs who already have records
// //     const recordedEmployeeIds = new Set(
// //       currentLogs
// //         .filter((log) => log.Date === today)
// //         .map((log) => log.EmployeeID)
// //     );

// //     // Find employees without records
// //     const missingEmployees = allEmployees.filter(
// //       (emp) => !recordedEmployeeIds.has(emp.EmployeeID)
// //     );

// //     if (missingEmployees.length === 0) return [];

  

// //     // Create new log entries in chunks
// //     const CHUNK_SIZE = 10;
// //     const newLogs = [];

// //     // First check which employees don't have records yet
// //     const checkPromises = [];
// //     for (const emp of missingEmployees) {
// //       checkPromises.push(
// //         databases
// //           .listDocuments(
// //             conf.appwriteDatabaseId,
// //             conf.appwriteAttendanceLogsCollectionId,
// //             [
// //               Query.equal("EmployeeID", emp.EmployeeID),
// //               Query.equal("Date", today),
// //             ]
// //           )
// //           .then((response) => ({
// //             employee: emp,
// //             exists: response.documents.length > 0,
// //           }))
// //       );
// //     }

// //     // Process check results in chunks
// //     const checkResults = await Promise.all(checkPromises);
// //     const employeesToCreate = checkResults
// //       .filter((result) => !result.exists)
// //       .map((result) => result.employee);

// //     // Create logs in chunks
// //     for (let i = 0; i < employeesToCreate.length; i += CHUNK_SIZE) {
// //       const chunk = employeesToCreate.slice(i, i + CHUNK_SIZE);
// //       const createPromises = chunk.map((emp) => {
// //         const shift = emp.Shift || "MORNING";
// //         const shiftRules =
// //           ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;
// //         const isOvernightShift = shift === "NIGHT";

// //         // Determine status 
// //         let status;
// //         if (shift === "NIGHT") {
// //           // Check if it's during daytime (e.g., before the shift starts)
// //           const currentHour = new Date().getHours();
// //           // If it's before night shift start time (e.g., during daytime), keep as PENDING
// //           // Otherwise (if it's already past midnight), mark as ABSENT
// //           status =
// //             currentHour >= 6 && currentHour < 21 ? "PENDING" : defaultStatus;
// //         } else {
// //           status = isTimeAfter(
// //             currentTime,
// //             shiftRules.ABSENT_CUTOFF,
// //             isOvernightShift
// //           )
// //             ? defaultStatus
// //             : "PENDING";
// //         }

// //         const newLog = {
// //           EmployeeID: emp.EmployeeID,
// //           FullName: emp.FullName || "",
// //           Position: emp.Position || "",
// //           Department: emp.Department || "",
// //           Shift: emp.Shift || "MORNING",
// //           Supervisor: emp.Supervisor || "",
// //           Date: today,
// //           InTime: "0.00",
// //           OutTime: "0.00",
// //           TotalTime: 0.0,
// //           Status: status,
// //         };

// //         return databases.createDocument(
// //           conf.appwriteDatabaseId,
// //           conf.appwriteAttendanceLogsCollectionId,
// //           "unique()",
// //           newLog
// //         );
// //       });

// //       const results = await Promise.all(createPromises);
// //       newLogs.push(...results);
// //     }

// //     // Invalidate cache for today's date
// //     cache.invalidateDate(today);

// //     return newLogs;
// //   } catch (error) {
// //     showError("Error processing absent employees!");
// //     return [];
// //   }
// // };

// // Modify markMissingEmployeesAsAbsent to properly handle shifts
// const markMissingEmployeesAsAbsent = async (currentLogs) => {
//   const today = format(new Date(), "yyyy-MM-dd");
//   const currentTime = format(new Date(), "HH:mm");
//   const currentHour = new Date().getHours();
  
//   try {
//     const allEmployees = await cache.getEmployees();
//     const recordedEmployeeIds = new Set(
//       currentLogs
//         .filter((log) => log.Date === today)
//         .map((log) => log.EmployeeID)
//     );
    
//     const missingEmployees = allEmployees.filter(
//       (emp) => !recordedEmployeeIds.has(emp.EmployeeID)
//     );
    
//     if (missingEmployees.length === 0) return [];
    
//     // Check which employees don't have records yet
//     const checkResults = await Promise.all(
//       missingEmployees.map(emp => 
//         databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           [Query.equal("EmployeeID", emp.EmployeeID), Query.equal("Date", today)]
//         ).then(response => ({
//           employee: emp,
//           exists: response.documents.length > 0
//         }))
//       )
//     );
    
//     const employeesToCreate = checkResults
//       .filter(result => !result.exists)
//       .map(result => result.employee);
      
//     // Process in batches of 10
//     const newLogs = [];
//     for (let i = 0; i < employeesToCreate.length; i += 10) {
//       const chunk = employeesToCreate.slice(i, i + 10);
//       const createPromises = chunk.map(emp => {
//         // Get appropriate status based on shift and time
//         let status;
//         const shift = emp.Shift || "MORNING";
        
//         if (isWeekend(today)) {
//           status = "WEEKEND";
//         } else {
//           const shiftRules = ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;
          
//           // Handle specific shift logic
//           switch(shift) {
//             case "NIGHT":
//               // For night shift: If it's still daytime, set as PENDING
//               status = (currentHour >= 6 && currentHour < 21) ? "PENDING" : "ABSENT";
//               break;
//             case "AFTERNOON":
//               // For afternoon shift
//               status = isTimeAfter(currentTime, shiftRules.ABSENT_CUTOFF) ? "ABSENT" : "PENDING";
//               break;
//             default: // MORNING and other shifts
//               status = isTimeAfter(currentTime, shiftRules.ABSENT_CUTOFF) ? "ABSENT" : "PENDING";
//           }
//         }
        
//         const newLog = {
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
//           Status: status
//         };
        
//         return databases.createDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           "unique()",
//           newLog
//         );
//       });
      
//       const results = await Promise.all(createPromises);
//       newLogs.push(...results);
//     }
    
//     cache.invalidateDate(today);
//     return newLogs;
//   } catch (error) {
//     showError("Error processing absent employees!");
//     return [];
//   }
// };
// // Add this function to schedule regular attendance updates
// const scheduleAttendanceUpdates = () => {
//   // Update every 30 minutes
//   setInterval(() => {
//     const currentHour = new Date().getHours();
//     const currentMinute = new Date().getMinutes();
    
//     // Only run during work hours (6 AM to 10 PM)
//     if (currentHour >= 6 && currentHour < 22) {
//       console.log(`Scheduled attendance update running: ${new Date()}`);
      
//       // Mark absent employees
//       throttledMarkAbsent([]);
      
//       // Update statuses of existing logs
//       throttledUpdateAllStatuses();
//     }
//   }, 30 * 60 * 1000); // 30 minutes
  
//   console.log("Attendance update scheduler initialized");
// };

// // Improved throttling with debounce functionality
// const createThrottle = (fn, delay, options = {}) => {
//   let lastCall = 0;
//   let timeoutId = null;
//   const { leading = true, trailing = true } = options;

//   return function (...args) {
//     const now = Date.now();
//     const context = this;
//     const elapsed = now - lastCall;

//     const exec = () => {
//       lastCall = now;
//       fn.apply(context, args);
//     };

//     if (timeoutId) {
//       clearTimeout(timeoutId);
//       timeoutId = null;
//     }

//     if (elapsed > delay) {
//       if (leading) {
//         exec();
//       } else if (trailing) {
//         timeoutId = setTimeout(exec, delay);
//       }
//     } else if (trailing) {
//       timeoutId = setTimeout(() => {
//         lastCall = Date.now();
//         timeoutId = null;
//         fn.apply(context, args);
//       }, delay - elapsed);
//     }
//   };
// };

// // Create throttled versions with different options
// const throttledUpdateAllStatuses = createThrottle(updateAllStatuses, 10000);
// const throttledMarkAbsent = createThrottle(markMissingEmployeesAsAbsent, 15000);

// // Add utility for batch operations with debounce
// const debounce = (fn, delay) => {
//   let timeoutId;
//   let pendingArgs = [];

//   return function (...args) {
//     pendingArgs.push(...args);

//     if (timeoutId) {
//       clearTimeout(timeoutId);
//     }

//     timeoutId = setTimeout(() => {
//       const uniqueArgs = [...new Set(pendingArgs)];
//       pendingArgs = [];
//       fn.apply(this, [uniqueArgs]);
//     }, delay);
//   };
// };

// const enhancedBatchProcess = async (
//   items,
//   processFn,
//   batchSize = 10,
//   progressCallback = null
// ) => {
//   const totalBatches = Math.ceil(items.length / batchSize);
//   let completedBatches = 0;
//   const results = [];

//   const processBatch = async (batch, batchIndex) => {
//     try {
//       const batchResults = await processFn(batch);
//       results.push(...batchResults);
//     } catch (error) {
//       console.error(
//         `Error processing batch ${batchIndex + 1}/${totalBatches}:`,
//         error
//       );
//     }
//     completedBatches++;
//     if (progressCallback && typeof progressCallback === "function") {
//       progressCallback({
//         completed: completedBatches,
//         total: totalBatches,
//         progress: Math.round((completedBatches / totalBatches) * 100),
//       });
//     }
//   };

//   await Promise.all(
//     Array.from({ length: totalBatches }, (_, i) =>
//       processBatch(items.slice(i * batchSize, (i + 1) * batchSize), i)
//     )
//   );

//   return results;
// };
// // Retry function for database operations
// const withRetry = async (operation, retries = 3, delay = 1000) => {
//   let lastError;
  
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       return await operation();
//     } catch (error) {
//       console.log(`Operation failed (attempt ${attempt}/${retries}):`, error.message);
//       lastError = error;
      
//       if (attempt < retries) {
//         await new Promise(resolve => setTimeout(resolve, delay * attempt));
//       }
//     }
//   }
  
//   throw lastError;
// };



// // Update the export object with optimized functions
// const AttendanceService = {
//   fetchAttendanceLogs,
//   fetchEmployees,
//   updateEmployeeStatus,
//   batchUpdateStatuses,
//   fillMissingDates, // Original implementation
//   exportLogsToCSV, // Original implementation
//   ATTENDANCE_RULES, // Original constants
//   PAGE_SIZE,
//   determineAttendanceStatus,
//   processAttendanceScan,
//   markMissingEmployeesAsAbsent,
//   updateAllStatuses,
//   throttledUpdateAllStatuses,
//   throttledMarkAbsent,
//   isWeekend, // Original implementation
//   cache,

//   // New utility functions
//   debounce,
//   createThrottle,
//   diagnoseScanIssue,

//   // Batch processing helpers
//   // batchProcess: (items, processFn, batchSize = 10) => {
//   //   return Promise.all(
//   //     Array(Math.ceil(items.length / batchSize))
//   //       .fill()
//   //       .map((_, i) =>
//   //         processFn(items.slice(i * batchSize, (i + 1) * batchSize))
//   //       )
//   //   );
//   // },

//   // Cache utilities
//   clearCache: (type) => cache.clearCache(type),
//   invalidateDate: (date) => cache.invalidateDate(date),
// };

// export  AttendanceService;






// 17-03-2025


// import { databases } from "../../Appwrite/appwriteService";
// import conf from "../../conf/conf";
// import { Query } from "appwrite";
// import { format, subMonths } from "date-fns";
// import showError from "../Notifications/Error";

// const PAGE_SIZE = 30; // Number of logs per request

// // Universal attendance rules
// const UNIVERSAL_RULES = {
//   GRACE_PERIOD: 15, // minutes
//   MIN_HOURS: {
//     FULL_DAY: 8,
//     HALF_DAY: 4
//   },
//   OVERTIME_THRESHOLD: 9, // hours after which overtime starts
//   WEEKEND_MINIMUM: 1, // minimum hours for weekend overtime
//   CHECKOUT_BUFFER: 30, // minutes before shift end
//   MAX_HOURS_BETWEEN_SCANS: 16 // maximum hours between check-in and check-out
// };

// // Enhanced shift configurations with universal rules
// const SHIFT_CONFIGS = {
//   MORNING: {
//     name: 'Morning Shift',
//     timings: {
//       start: '09:00',
//       end: '17:00',
//       validCheckIn: { start: '08:30', end: '13:00' },
//       validCheckOut: { start: '16:30', end: '18:00' }
//     },
//     breaks: [
//       { start: '13:00', end: '14:00', type: 'lunch' },
//       { start: '11:00', end: '11:15', type: 'tea' }
//     ],
//     nextDayCheckout: false
//   },
//   DAY: {
//     name: 'Day Shift',
//     timings: {
//       start: '13:00',
//       end: '21:00',
//       validCheckIn: { start: '12:30', end: '17:00' },
//       validCheckOut: { start: '20:30', end: '22:00' }
//     },
//     breaks: [
//       { start: '16:00', end: '17:00', type: 'lunch' },
//       { start: '19:00', end: '19:15', type: 'tea' }
//     ],
//     nextDayCheckout: false
//   },
//   NIGHT: {
//     name: 'Night Shift',
//     timings: {
//       start: '21:00',
//       end: '05:00',
//       validCheckIn: { start: '20:30', end: '00:00' },
//       validCheckOut: { start: '04:30', end: '06:00' }
//     },
//     breaks: [
//       { start: '01:00', end: '02:00', type: 'dinner' },
//       { start: '23:00', end: '23:15', type: 'tea' }
//     ],
//     nextDayCheckout: true
//   }
// };

// // Enhanced time utilities
// const TimeUtils = {
//   toMinutes(timeStr) {
//     const [hours, minutes] = timeStr.split(':').map(Number);
//     return hours * 60 + minutes;
//   },

//   fromMinutes(minutes) {
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
//   },

//   isTimeBetween(time, start, end, isOvernight) {
//     const timeMin = this.toMinutes(time);
//     const startMin = this.toMinutes(start);
//     const endMin = this.toMinutes(end);

//     if (isOvernight) {
//       if (endMin < startMin) {
//         return timeMin >= startMin || timeMin <= endMin;
//       }
//     }
//     return timeMin >= startMin && timeMin <= endMin;
//   },

//   calculateDuration(startTime, endTime, isOvernight) {
//     let startMin = this.toMinutes(startTime);
//     let endMin = this.toMinutes(endTime);

//     if (isOvernight && endMin < startMin) {
//       endMin += 24 * 60; // Add 24 hours
//     }

//     return endMin - startMin;
//   }
// };

// // Enhanced attendance validation
// const validateAttendance = async (scanTime, employee, existingScans = []) => {
//   const shift = SHIFT_CONFIGS[employee.Shift || 'MORNING'];
//   const today = format(new Date(), 'yyyy-MM-dd');
  
//   // First check if it's a weekend
//   const isWeekend = isNonWorkingDay(today);

//   // Check for duplicate records and clean them up
//   if (existingScans.length > 1) {
//     // Delete duplicate records, keeping only the oldest one
//     const [oldest, ...duplicates] = existingScans.sort((a, b) => 
//       new Date(a.$createdAt) - new Date(b.$createdAt)
//     );
    
//     await Promise.all(duplicates.map(duplicate => 
//       databases.deleteDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         duplicate.$id
//       )
//     ));
    
//     existingScans = [oldest];
//   }

//   const currentRecord = existingScans[0];
  
//   // Don't allow multiple check-outs
//   if (currentRecord?.OutTime && currentRecord.OutTime !== '0.00' && currentRecord.InTime !== '0.00') {
//     throw new Error('Employee has already checked out today');
//   }

//   // Skip time validations for weekends
//   if (isWeekend) {
//     return true;
//   }

//   // Validate check-in/out times for weekdays
//   if (!currentRecord || currentRecord.InTime === '0.00') {
//     // Validate check-in time
//     const isValidCheckIn = TimeUtils.isTimeBetween(
//       scanTime,
//       shift.timings.validCheckIn.start,
//       shift.timings.validCheckIn.end,
//       shift.nextDayCheckout
//     );

//     if (!isValidCheckIn) {
//       throw new Error(`Invalid check-in time for ${shift.name}. Valid time: ${shift.timings.validCheckIn.start} - ${shift.timings.validCheckIn.end}`);
//     }
//   } else {
//     // Validate check-out time
//     const isValidCheckOut = TimeUtils.isTimeBetween(
//       scanTime,
//       shift.timings.validCheckOut.start,
//       shift.timings.validCheckOut.end,
//       shift.nextDayCheckout
//     );

//     if (!isValidCheckOut) {
//       throw new Error(`Invalid check-out time for ${shift.name}. Valid time: ${shift.timings.validCheckOut.start} - ${shift.timings.validCheckOut.end}`);
//     }
//   }

//   return true;
// };

// // Enhanced processAttendanceScan
// const processAttendanceScan = async (employeeId, scanTime) => {
//   try {
//     const employee = await cache.getEmployee(employeeId);
//     if (!employee) {
//       throw new Error('Employee not found');
//     }

//     const today = format(new Date(), 'yyyy-MM-dd');
//     const isWeekend = isNonWorkingDay(today);

//     // Get existing scans
//     const todayScans = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteAttendanceLogsCollectionId,
//       [
//         Query.equal('EmployeeID', employeeId),
//         Query.equal('Date', today)
//       ]
//     );

//     const existingScans = todayScans.documents;

//     // Validate attendance (includes duplicate cleanup)
//     await validateAttendance(scanTime, employee, existingScans);

//     if (existingScans.length > 0) {
//       const currentRecord = existingScans[0];

//       // If InTime is 0.00, this is first scan
//       if (currentRecord.InTime === '0.00') {
//         const updatedRecord = {
//           InTime: scanTime,
//           Status: isWeekend ? 'WEEKEND' : 'PRESENT'
//         };

//         const result = await databases.updateDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           currentRecord.$id,
//           updatedRecord
//         );

//         return result;
//       }

//       // Calculate total hours worked
//       const totalHours = TimeUtils.calculateDuration(
//         currentRecord.InTime, 
//         scanTime,
//         SHIFT_CONFIGS[employee.Shift]?.nextDayCheckout || false
//       ) / 60; // Convert minutes to hours

//       // Determine status based on hours worked
//       let status;

//       if (isWeekend) {
//         // Weekend status determination
//         status = totalHours >= UNIVERSAL_RULES.WEEKEND_MINIMUM ? 'WEEKEND_OT' : 'WEEKEND';
//       } else {
//         // Weekday status determination
//         if (totalHours >= UNIVERSAL_RULES.OVERTIME_THRESHOLD) {
//           status = 'OVERTIME';
//         } else if (totalHours >= UNIVERSAL_RULES.MIN_HOURS.FULL_DAY) {
//           status = 'PRESENT';
//         } else if (totalHours >= UNIVERSAL_RULES.MIN_HOURS.HALF_DAY) {
//           status = 'HALF_DAY';
//         } else {
//           status = 'ABSENT';
//         }
//       }

//       const updatedRecord = {
//         OutTime: scanTime,
//         TotalTime: parseFloat(totalHours.toFixed(2)),
//         Status: status
//       };

//       const result = await databases.updateDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         currentRecord.$id,
//         updatedRecord
//       );

//       return result;
//     } else {
//       // Create new attendance record
//       const newRecord = {
//         EmployeeID: employee.EmployeeID,
//         FullName: employee.FullName || '',
//         Position: employee.Position || '',
//         Department: employee.Department || '',
//         Supervisor: employee.Supervisor || '',
//         Shift: employee.Shift || 'MORNING',
//         Date: today,
//         Status: isWeekend ? 'WEEKEND' : 'PRESENT',
//         InTime: scanTime,
//         OutTime: '0.00',
//         TotalTime: 0
//       };

//       const result = await databases.createDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         'unique()',
//         newRecord
//       );

//       return result;
//     }
//   } catch (error) {
//     console.error('Error in processAttendanceScan:', error);
//     showError(error.message);
//     throw error;
//   }
// };

// // Enhanced cache implementation with more features
// const cache = {
//   employees: null,
//   employeesByID: new Map(),
//   logs: new Map(), // Cache for attendance logs
//   statusResults: new Map(), // Cache for status determination results
//   expiryTime: 5 * 60 * 1000, // 5 minutes
//   lastFetch: {
//     employees: 0,
//     logs: new Map(), // Track last fetch time for each date/query
//   },

//   async getEmployees() {
//     const now = Date.now();
//     if (!this.employees || now - this.lastFetch.employees > this.expiryTime) {
//       try {
//         const response = await databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteEmployeeCollectionId
//         );
        
//         if (!response || !response.documents) {
//           console.error('Invalid employee response:', response);
//           return [];
//         }

//         console.log('Fetched employees:', response.documents.length);
//         this.employees = response.documents;
        
//         // Update the employee map with all required fields
//         this.employeesByID = new Map(
//           this.employees.map(emp => {
//             // Ensure all required fields are present with proper defaults
//             const employee = {
//               ...emp,
//               EmployeeID: emp.EmployeeID || '',
//               FullName: emp.FullName || '',
//               Position: emp.Position || '',
//               Department: emp.Department || '',
//               Supervisor: emp.Supervisor || '',
//               Shift: emp.Shift || 'MORNING',
//               MobileNo: emp.MobileNo || '',
//               Email: emp.Email || '',
//               HireDate: emp.HireDate || '',
//               Image: emp.Image || '',
//               QR: emp.QR || ''
//             };
//             return [emp.$id, employee];
//           })
//         );
//         this.lastFetch.employees = now;
//       } catch (error) {
//         console.error("Error fetching employees:", error);
//         showError("Error fetching employees cache");
//         // Keep old data on error
//         if (!this.employees) this.employees = [];
//       }
//     }
//     return this.employees;
//   },

//   async getEmployee(employeeId) {
//     if (this.employeesByID.has(employeeId)) {
//       return this.employeesByID.get(employeeId);
//     }

//     // Refresh cache if employee not found
//     await this.getEmployees();
//     return this.employeesByID.get(employeeId);
//   },

//   async getLogs(date, startDate, endDate, offset = 0) {
//     const cacheKey = `${date || ""}_${startDate || ""}_${endDate || ""}_${offset}`;
//     const now = Date.now();

//     // Always invalidate today's cache to ensure fresh data
//     const today = format(new Date(), 'yyyy-MM-dd');
//     if (date === today || (!date && !startDate && !endDate)) {
//       this.invalidateDate(today);
//     }

//     if (!this.logs.has(cacheKey) || now - (this.lastFetch.logs.get(cacheKey) || 0) > this.expiryTime) {
//       const logs = await fetchAttendanceLogsRaw(date, startDate, endDate, offset);
      
//       // Ensure all logs have the required fields
//       const processedLogs = logs.map(log => ({
//         ...log,
//         EmployeeID: log.EmployeeID || '',
//         FullName: log.FullName || '',
//         Position: log.Position || '',
//         Department: log.Department || '',
//         Supervisor: log.Supervisor || '',
//         Shift: log.Shift || 'MORNING',
//         Date: log.Date || '',
//         InTime: log.InTime || '0.00',
//         OutTime: log.OutTime || '0.00',
//         TotalTime: log.TotalTime || 0,
//         Status: log.Status || 'PENDING'
//       }));

//       this.logs.set(cacheKey, processedLogs);
//       this.lastFetch.logs.set(cacheKey, now);
//     }

//     return this.logs.get(cacheKey);
//   },

//   clearCache(type = "all") {
//     if (type === "all" || type === "employees") {
//       this.employees = null;
//       this.employeesByID.clear();
//       this.lastFetch.employees = 0;
//     }
//     if (type === "all" || type === "logs") {
//       this.logs.clear();
//       this.lastFetch.logs.clear();
//     }
//     if (type === "all" || type === "status") {
//       this.statusResults.clear();
//     }
//   },

//   invalidateDate(date) {
//     // Remove cache entries for specific date
//     for (const key of this.logs.keys()) {
//       if (key.includes(date)) {
//         this.logs.delete(key);
//         this.lastFetch.logs.delete(key);
//       }
//     }
//   },
// };

// // Raw fetch function - lower level implementation
// const fetchAttendanceLogsRaw = async (
//   date = null,
//   startDate = null,
//   endDate = null,
//   offset = 0
// ) => {
//   try {
//     const queries = [
//       Query.limit(PAGE_SIZE),
//       Query.offset(offset),
//       Query.orderAsc("EmployeeID"),
//     ];

//     if (date) {
//       queries.push(Query.equal("Date", date));
//     } else if (startDate && endDate) {
//       queries.push(Query.between("Date", startDate, endDate));
//     }

//     const response = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteAttendanceLogsCollectionId,
//       queries
//     );

//     return response.documents || [];
//   } catch (error) {
//     showError("Error fetching attendance logs!");
//     return [];
//   }
// };

// // Optimized markMissingEmployeesAsAbsent with batching
// const markMissingEmployeesAsAbsent = async (currentLogs) => {
//   try {
//     const today = format(new Date(), 'yyyy-MM-dd');
//     const employees = await cache.getEmployees();
//     if (!employees || !Array.isArray(employees)) return [];

//     // Create a map of existing logs for quick lookup
//     const existingLogsMap = new Map(
//       currentLogs.map(log => [log.EmployeeID, log])
//     );

//     // Collect employees who need status updates
//     const updates = [];
//     const newAbsentLogs = [];

//     for (const employee of employees) {
//       // Skip if employee already has a log
//       if (existingLogsMap.has(employee.$id)) continue;

//       const shift = SHIFT_CONFIGS[employee.Shift || 'MORNING'];
//       const currentTime = format(new Date(), 'HH:mm');
      
//       // Only mark as absent if we're past the grace period for their shift
//       const shiftStartMinutes = TimeUtils.toMinutes(shift.timings.start);
//       const currentMinutes = TimeUtils.toMinutes(currentTime);
//       const graceEndMinutes = shiftStartMinutes + UNIVERSAL_RULES.GRACE_PERIOD;

//       if (currentMinutes > graceEndMinutes) {
//         updates.push({
//           employeeId: employee.$id,
//           date: today,
//           status: 'ABSENT'
//         });

//         newAbsentLogs.push({
//           EmployeeID: employee.$id,
//           Name: employee.Name,
//           Position: employee.Position,
//           Shift: employee.Shift || 'MORNING',
//           Date: today,
//           InTime: '0.00',
//           OutTime: '0.00',
//           TotalTime: 0,
//           Status: 'ABSENT'
//         });
//       }
//     }

//     // Batch update all statuses at once
//     if (updates.length > 0) {
//       await batchUpdateStatuses(updates);
//     }

//     return newAbsentLogs;
//   } catch (error) {
//     console.error('Error in markMissingEmployeesAsAbsent:', error);
//     throw error;
//   }
// };

// // Enhanced fetchAttendanceLogs with immediate status updates
// const fetchAttendanceLogs = async (
//   date = null,
//   startDate = null,
//   endDate = null,
//   offset = 0
// ) => {
//   try {
//     // Check cache first
//     const cachedLogs = await cache.getLogs(date, startDate, endDate, offset);
//     if (cachedLogs) return cachedLogs;

//     // If no cache, fetch raw logs
//     const logs = await fetchAttendanceLogsRaw(date, startDate, endDate, offset);
    
//     // For today's logs, immediately process absent employees
//     if (date === format(new Date(), 'yyyy-MM-dd') || (!date && !startDate && !endDate)) {
//       const absentLogs = await markMissingEmployeesAsAbsent(logs);
//       return [...logs, ...absentLogs];
//     }

//     return logs;
//   } catch (error) {
//     console.error('Error fetching attendance logs:', error);
//     throw error;
//   }
// };

// // Fetch attendance logs with caching
// // const fetchAttendanceLogs = async (
// //   date = null,
// //   startDate = null,
// //   endDate = null,
// //   offset = 0
// // ) => {
// //   return cache.getLogs(date, startDate, endDate, offset);
// // };

// // Fetch employees from cache
// const fetchEmployees = async () => {
//   return cache.getEmployees();
// };

// // Optimized update employee status with batch processing capability
// const updateEmployeeStatus = async (
//   employeeId,
//   date,
//   newStatus,
//   batchMode = false
// ) => {
//   try {
//     // Find existing log in database
//     const existingLogsResponse = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteAttendanceLogsCollectionId,
//       [Query.equal("EmployeeID", employeeId), Query.equal("Date", date)]
//     );

//     if (existingLogsResponse.documents.length > 0) {
//       // Update the existing record
//       const existingLog = existingLogsResponse.documents[0];
//       const result = await databases.updateDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         existingLog.$id,
//         { Status: newStatus }
//       );

//       // Invalidate cache for this date
//       if (!batchMode) cache.invalidateDate(date);

//       return result;
//     } else {
//       // Get employee from cache
//       const employee = await cache.getEmployee(employeeId);

//       if (!employee) {
//         showError("Employee not found!");
//         return null;
//       }

//       // Create new log
//       const newLogData = {
//         EmployeeID: employee.EmployeeID,
//         FullName: employee.FullName || "",
//         Position: employee.Position || "",
//         Department: employee.Department || "",
//         Shift: employee.Shift || "MORNING",
//         Date: date,
//         Status: newStatus,
//         InTime: "0.00",
//         OutTime: "0.00",
//         TotalTime: 0
//       };

//       const result = await databases.createDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         "unique()",
//         newLogData
//       );

//       // Invalidate cache for this date
//       if (!batchMode) cache.invalidateDate(date);

//       return result;
//     }
//   } catch (error) {
//     showError("Failed to update status!");
//     return null;
//   }
// };

// // Batch update multiple employee statuses
// const batchUpdateStatuses = async (updates) => {
//   if (!updates || updates.length === 0) return [];

//   const results = [];
//   const affectedDates = new Set();

//   for (const update of updates) {
//     const result = await updateEmployeeStatus(
//       update.employeeId,
//       update.date,
//       update.status,
//       true // batch mode = true
//     );
//     results.push(result);
//     affectedDates.add(update.date);
//   }

//   // Invalidate cache for all affected dates at once
//   affectedDates.forEach((date) => cache.invalidateDate(date));

//   return results;
// };

// // Fill missing dates for complete reporting
// const fillMissingDates = (logs, startDate, endDate) => {
//   const allDates = [];
//   let currentDate = new Date(startDate);

//   while (currentDate <= new Date(endDate)) {
//     allDates.push(format(currentDate, "yyyy-MM-dd"));
//     currentDate.setDate(currentDate.getDate() + 1);
//   }

//   // Get a unique list of employees from logs
//   const employeeIDs = [...new Set(logs.map((log) => log.EmployeeID))];

//   // Convert logs to a map for faster lookup (key = date + employee ID)
//   const logMap = new Map(
//     logs.map((log) => [`${log.Date}_${log.EmployeeID}`, log])
//   );

//   // Generate a complete log ensuring every employee has an entry for every date
//   const completeLogs = [];
//   allDates.forEach((date) => {
//     employeeIDs.forEach((empID) => {
//       completeLogs.push(
//         logMap.get(`${date}_${empID}`) || {
//           Date: date,
//           Status: "Absent",
//           EmployeeID: empID,
//         }
//       );
//     });
//   });

//   return completeLogs;
// };

// // Export logs to CSV
// const exportLogsToCSV = (logs, startDate, endDate) => {
//   if (!logs.length) {
//     return false;
//   }

//   // Define the headers in the exact order you want them to appear
//   const headerOrder = [
//     "EmployeeID",
//     "FullName",
//     "Position",
//     "Department",
//     "Date",
//     "InTime",
//     "OutTime",
//     "TotalTime",
//     "Status",
//   ];

//   // Create the CSV header row using the defined order
//   const headerRow = headerOrder.join(",");

//   // Map each log to a CSV row with values in the same order as headers
//   const csvData = logs.map((log) => {
//     return headerOrder
//       .map((header) => {
//         const value = log[header] || "";
//         // Ensure values with commas are properly quoted
//         return value.toString().includes(",") ? `"${value}"` : value;
//       })
//       .join(",");
//   });

//   // Combine header and data rows
//   const csvContent = [headerRow, ...csvData].join("\n");

//   // Create and trigger download
//   const blob = new Blob([csvContent], { type: "text/csv" });
//   const url = window.URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `attendance_logs_${startDate}_to_${endDate}.csv`;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   window.URL.revokeObjectURL(url);

//   return true;
// };

// // Helper function to check if a date is a weekend
// const isNonWorkingDay = (dateString) => {
//   // Parse date in local timezone to avoid UTC conversion issues
//   const [year, month, day] = dateString.split('-').map(Number);
//   const date = new Date(year, month - 1, day);  // month is 0-based in Date constructor
//   const dayOfWeek = date.getDay();
  
//   // Check if it's weekend (Saturday = 6, Sunday = 0)
//   const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
//   return isWeekend;
// };

// // Improved attendance status determination
// const determineAttendanceStatus = (inTime, outTime, totalTime, employeeShift, dateString) => {
//   // Check cache first
//   const cachedResult = cache.getStatus(inTime, outTime, totalTime, employeeShift, dateString);
//   if (cachedResult) return cachedResult;

//   const isWeekend = isNonWorkingDay(dateString);
//   const shift = SHIFT_CONFIGS[employeeShift];
  
//   if (!shift) {
//     return { status: 'Invalid', type: 'ERROR', remarks: 'Invalid shift configuration' };
//   }

//   // No check-in recorded
//   if (!inTime || inTime === '0.00') {
//     return { 
//       status: isWeekend ? 'Weekend' : 'Absent',
//       type: isWeekend ? 'WEEKEND' : 'ABSENT',
//       remarks: 'No check-in recorded',
//       workedHours: 0,
//       overtimeHours: 0
//     };
//   }

//   // Calculate actual worked hours considering breaks
//   const workedHours = calculateWorkedHours(inTime, outTime || format(new Date(), 'HH:mm'), shift);
//   let overtimeHours = 0;
//   let status = 'Present';
//   let type = 'PRESENT';
//   let remarks = [];

//   if (isWeekend) {
//     status = 'Weekend';
//     type = 'WEEKEND';
//     overtimeHours = workedHours; // All hours on weekend count as overtime
//     if (overtimeHours > 0) {
//       remarks.push(`Weekend hours: ${overtimeHours.toFixed(2)}`);
//     }
//   } else {
//     // Regular weekday
//     if (workedHours > UNIVERSAL_RULES.OVERTIME_THRESHOLD) {
//       overtimeHours = workedHours - UNIVERSAL_RULES.OVERTIME_THRESHOLD;
//       type = 'OVERTIME';
//       remarks.push(`Overtime: ${overtimeHours.toFixed(2)} hours`);
//     }

//     // Handle half day and absent cases
//     if (workedHours < UNIVERSAL_RULES.MIN_HOURS.HALF_DAY) {
//       status = 'Absent';
//       type = 'ABSENT';
//       remarks = ['Insufficient hours worked'];
//       overtimeHours = 0;
//     } else if (workedHours < UNIVERSAL_RULES.MIN_HOURS.FULL_DAY) {
//       status = 'Half Day';
//       type = 'HALF_DAY';
//       remarks = ['Less than full day hours'];
//       overtimeHours = 0;
//     }
//   }

//   const result = {
//     status,
//     type,
//     remarks: remarks.join(', ') || 'Regular attendance',
//     workedHours: parseFloat(workedHours.toFixed(2)),
//     overtimeHours: parseFloat(overtimeHours.toFixed(2))
//   };

//   // Cache the result
//   cache.cacheStatus(inTime, outTime, totalTime, employeeShift, dateString, result);
//   return result;
// };

// // Helper function to calculate worked hours considering breaks
// const calculateWorkedHours = (inTime, outTime, shift) => {
//   if (!outTime) return 0;

//   const inMinutes = timeToMinutes(inTime);
//   const outMinutes = timeToMinutes(outTime);
//   let totalMinutes = 0;

//   if (shift.isOvernight && outMinutes < inMinutes) {
//     totalMinutes = (24 * 60 - inMinutes) + outMinutes;
//   } else {
//     totalMinutes = outMinutes - inMinutes;
//   }

//   // Subtract break times
//   Object.values(shift.breaks).forEach(break_ => {
//     const breakStart = timeToMinutes(break_.start);
//     const breakEnd = timeToMinutes(break_.end);
    
//     if (inMinutes <= breakStart && outMinutes >= breakEnd) {
//       totalMinutes -= (breakEnd - breakStart);
//     }
//   });

//   return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
// };

// // Helper function to convert time to minutes
// const timeToMinutes = (time) => {
//   const [hours, minutes] = time.split(':').map(Number);
//   return hours * 60 + minutes;
// };

// // Helper function to check if time1 is before time2
// const isTimeBefore = (time1, time2, isOvernight = false) => {
//   const minutes1 = timeToMinutes(time1);
//   const minutes2 = timeToMinutes(time2);

//   if (isOvernight) {
//     if (minutes1 < 12 * 60) { // If time1 is in next day (AM)
//       return minutes1 < minutes2 && minutes2 > 12 * 60;
//     }
//     return minutes1 < minutes2;
//   }

//   return minutes1 < minutes2;
// };

// // Helper function to check if time1 is after time2
// const isTimeAfter = (time1, time2, isOvernight = false) => {
//   const minutes1 = timeToMinutes(time1);
//   const minutes2 = timeToMinutes(time2);

//   if (isOvernight) {
//     if (minutes1 < 12 * 60) { // If time1 is in next day (AM)
//       return minutes1 > minutes2 || minutes2 < 12 * 60;
//     }
//     return minutes1 > minutes2;
//   }

//   return minutes1 > minutes2;
// };

// // Add this utility function to AttendanceService
// const diagnoseScanIssue = (employeeId) => {
//   return new Promise(async (resolve) => {
//     try {
//       const employee = await cache.getEmployee(employeeId);
//       if (!employee) {
//         resolve({success: false, message: "Employee not found"});
//         return;
//       }
      
//       const now = new Date();
//       const today = format(now, "yyyy-MM-dd");
//       const yesterday = format(subMonths(now, 0), "yyyy-MM-dd");
      
//       const [todayRecords, yesterdayRecords] = await Promise.all([
//         databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           [
//             Query.equal("EmployeeID", employeeId),
//             Query.equal("Date", today),
//             Query.orderDesc("$updatedAt"), 
//           ]
//         ),
//         databases.listDocuments(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           [
//             Query.equal("EmployeeID", employeeId),
//             Query.equal("Date", yesterday),
//             Query.orderDesc("$updatedAt"),
//           ]
//         )
//       ]);
      
//       resolve({
//         success: true,
//         employee,
//         todayRecords: todayRecords.documents,
//         yesterdayRecords: yesterdayRecords.documents,
//         currentHour: now.getHours(),
//         currentMinute: now.getMinutes()
//       });
//     } catch (error) {
//       resolve({success: false, message: error.message});
//     }
//   });
// };

// // Optimized markMissingEmployeesAsAbsent with batching
// // const markMissingEmployeesAsAbsent = async (currentLogs) => {
// //   const today = format(new Date(), 'yyyy-MM-dd');
// //   const isWeekend = isNonWorkingDay(today);
  
// //   try {
// //     // First, clean up any duplicate records
// //     const existingLogsMap = new Map();
// //     for (const log of currentLogs) {
// //       const key = log.EmployeeID;
// //       if (!existingLogsMap.has(key) || 
// //           new Date(log.$createdAt) < new Date(existingLogsMap.get(key).$createdAt)) {
// //         existingLogsMap.set(key, log);
// //       }
// //     }

// //     // Delete duplicate records
// //     const duplicates = currentLogs.filter(log => {
// //       const storedLog = existingLogsMap.get(log.EmployeeID);
// //       return storedLog.$id !== log.$id;
// //     });

// //     await Promise.all(duplicates.map(duplicate => 
// //       databases.deleteDocument(
// //         conf.appwriteDatabaseId,
// //         conf.appwriteAttendanceLogsCollectionId,
// //         duplicate.$id
// //       )
// //     ));

// //     // Get all employees
// //     const employees = await cache.getEmployees();
// //     const updates = [];

// //     // Update status for all employees
// //     for (const employee of employees) {
// //       const existingLog = existingLogsMap.get(employee.EmployeeID);
      
// //       if (existingLog) {
// //         // Update existing record with weekend status if needed
// //         if (isWeekend && existingLog.Status !== 'WEEKEND') {
// //           await databases.updateDocument(
// //             conf.appwriteDatabaseId,
// //             conf.appwriteAttendanceLogsCollectionId,
// //             existingLog.$id,
// //             { Status: 'WEEKEND' }
// //           );
// //         }
// //       } else {
// //         // Create new record for missing employee
// //         updates.push({
// //           EmployeeID: employee.EmployeeID,
// //           FullName: employee.FullName || '',
// //           Position: employee.Position || '',
// //           Department: employee.Department || '',
// //           Shift: employee.Shift || 'MORNING',
// //           Date: today,
// //           Status: isWeekend ? 'WEEKEND' : 'PENDING',
// //           InTime: '0.00',
// //           OutTime: '0.00',
// //           TotalTime: 0
// //         });
// //       }
// //     }

// //     // Create records for missing employees
// //     if (updates.length > 0) {
// //       const results = await Promise.all(updates.map(update => 
// //         databases.createDocument(
// //           conf.appwriteDatabaseId,
// //           conf.appwriteAttendanceLogsCollectionId,
// //           'unique()',
// //           update
// //         )
// //       ));

// //       return results;
// //     }

// //     return [];
// //   } catch (error) {
// //     console.error('Error in markMissingEmployeesAsAbsent:', error);
// //     showError('Failed to process absent employees');
// //     return [];
// //   }
// // };

// // Update all statuses
// const updateAllStatuses = async () => {
//   const today = format(new Date(), 'yyyy-MM-dd');
//   const isWeekend = isNonWorkingDay(today);

//   try {
//     const logs = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteAttendanceLogsCollectionId,
//       [Query.equal('Date', today)]
//     );

//     if (isWeekend) {
//       // Update all records to WEEKEND status
//       await Promise.all(logs.documents.map(log =>
//         databases.updateDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           log.$id,
//           { Status: 'WEEKEND' }
//         )
//       ));
//     }

//     return { success: true };
//   } catch (error) {
//     console.error('Error updating statuses:', error);
//     return { success: false, error: error.message };
//   }
// };

// // Improved throttling with debounce functionality
// const createThrottle = (fn, delay, options = {}) => {
//   let lastCall = 0;
//   let timeoutId = null;
//   const { leading = true, trailing = true } = options;

//   return function (...args) {
//     const now = Date.now();
//     const context = this;
//     const elapsed = now - lastCall;

//     const exec = () => {
//       lastCall = now;
//       fn.apply(context, args);
//     };

//     if (timeoutId) {
//       clearTimeout(timeoutId);
//       timeoutId = null;
//     }

//     if (elapsed > delay) {
//       if (leading) {
//         exec();
//       } else if (trailing) {
//         timeoutId = setTimeout(exec, delay);
//       }
//     } else if (trailing) {
//       timeoutId = setTimeout(() => {
//         lastCall = Date.now();
//         timeoutId = null;
//         fn.apply(context, args);
//       }, delay - elapsed);
//     }
//   };
// };

// // Create throttled versions with different options
// const throttledUpdateAllStatuses = createThrottle(updateAllStatuses, 10000);

// // Add utility for batch operations with debounce
// const debounce = (fn, delay) => {
//   let timeoutId;
//   let pendingArgs = [];

//   return function (...args) {
//     pendingArgs.push(...args);

//     if (timeoutId) {
//       clearTimeout(timeoutId);
//     }

//     timeoutId = setTimeout(() => {
//       const uniqueArgs = [...new Set(pendingArgs)];
//       pendingArgs = [];
//       fn.apply(this, [uniqueArgs]);
//     }, delay);
//   };
// };

// // const enhancedBatchProcess = async (
// //   items,
// //   processFn,
// //   batchSize = 10,
// //   progressCallback = null
// // ) => {
// //   const totalBatches = Math.ceil(items.length / batchSize);
// //   let completedBatches = 0;
// //   const results = [];

// //   const processBatch = async (batch, batchIndex) => {
// //     try {
// //       const batchResults = await processFn(batch);
// //       results.push(...batchResults);
// //     } catch (error) {
// //       console.error(
// //         `Error processing batch ${batchIndex + 1}/${totalBatches}:`,
// //         error
// //       );
// //     }
// //     completedBatches++;
// //     if (progressCallback && typeof progressCallback === "function") {
// //       progressCallback({
// //         completed: completedBatches,
// //         total: totalBatches,
// //         progress: Math.round((completedBatches / totalBatches) * 100),
// //       });
// //     }
// //   };

// //   await Promise.all(
// //     Array.from({ length: totalBatches }, (_, i) =>
// //       processBatch(items.slice(i * batchSize, (i + 1) * batchSize), i)
// //     )
// //   );

// //   return results;
// // };

// // // Retry function for database operations
// // const withRetry = async (operation, retries = 3, delay = 1000) => {
// //   let lastError;
  
// //   for (let attempt = 1; attempt <= retries; attempt++) {
// //     try {
// //       return await operation();
// //     } catch (error) {
// //       console.log(`Operation failed (attempt ${attempt}/${retries}):`, error.message);
// //       lastError = error;

// //       if (attempt < retries) {
// //         await new Promise(resolve => setTimeout(resolve, delay * attempt));
// //       }
// //     }
// //   }
  
// //   throw lastError;
// // };

// // // Add utility for scheduling regular attendance updates
// // const scheduleAttendanceUpdates = () => {
// //   // Update every 30 minutes
// //   setInterval(() => {
// //     const currentHour = new Date().getHours();
// //     const currentMinute = new Date().getMinutes();
    
// //     // Only run during work hours (6 AM to 10 PM)
// //     if (currentHour >= 6 && currentHour < 22) {
// //       console.log(`Scheduled attendance update running: ${new Date()}`);
      
// //       // Mark absent employees
// //       throttledMarkAbsent([]);
      
// //       // Update statuses of existing logs
// //       throttledUpdateAllStatuses();
// //     }
// //   }, 30 * 60 * 1000); // 30 minutes
  
// //   console.log("Attendance update scheduler initialized");
// // };

// // Update the export object with optimized functions
// const AttendanceService = {
//   fetchAttendanceLogs,
//   fetchEmployees,
//   updateEmployeeStatus,
//   batchUpdateStatuses,
//   fillMissingDates, // Original implementation
//   exportLogsToCSV, // Original implementation
//   SHIFT_CONFIGS, // New constants
//   PAGE_SIZE,
//   determineAttendanceStatus,
//   processAttendanceScan,
//   markMissingEmployeesAsAbsent,
//   updateAllStatuses,
//   throttledUpdateAllStatuses,
//   isNonWorkingDay, // New implementation
//   cache,

//   // New utility functions
//   debounce,
//   createThrottle,
//   diagnoseScanIssue,

 
//   clearCache: (type) => cache.clearCache(type),
//   invalidateDate: (date) => cache.invalidateDate(date),
// };

// export default AttendanceService;

// 17-03-2025