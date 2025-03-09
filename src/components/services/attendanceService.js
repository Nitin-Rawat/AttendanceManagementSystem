
// import { Query } from "appwrite";
// import { format } from "date-fns"; 
// import showError from './../Notifications/Error';
// import conf from './../../conf/conf';
// import { databases } from "../../Appwrite/appwriteService";  
// import { logs } from './../AttendanceLogs';

// const PAGE_SIZE = 50;

// // Attendance rules definition
// export const ATTENDANCE_RULES = {
//   MORNING_SHIFT: {
//     START_TIME: "09:00", // 9:00 AM
//     LATE_THRESHOLD: "09:15", // 15 minutes grace period
//     ABSENT_CUTOFF: "10:00", // Absent if not arrived by noon
//   },
//   AFTERNOON_SHIFT: {
//     START_TIME: "13:00", // 1:00 PM
//     LATE_THRESHOLD: "13:15", // 15 minutes grace period
//     ABSENT_CUTOFF: "14:00", // Absent if not arrived by 4 PM
//   },
//   NIGHT_SHIFT: {
//     START_TIME: "21:00", // 9:00 PM
//     LATE_THRESHOLD: "21:15", // 15 minutes grace period
//     ABSENT_CUTOFF: "22:00", // Absent if not arrived by midnight
//   },
// };

// // Helper functions
// export const isTimeAfter = (time1, time2) => {
//   const [hours1, minutes1] = time1.split(":").map(Number);
//   const [hours2, minutes2] = time2.split(":").map(Number);

//   return hours1 > hours2 || (hours1 === hours2 && minutes1 > minutes2);
// };

// export const determineAttendanceStatus = (inTime, employeeShift) => {
//   if (!inTime || inTime === "0.00") return "ABSENT";

//   // Convert inTime from "HH.mm" format to "HH:mm" format
//   const [hours, minutes] = inTime.split(".").map(Number);
//   const formattedInTime = `${String(hours).padStart(2, "0")}:${String(
//     minutes || 0
//   ).padStart(2, "0")}`;

//   const shift = employeeShift || "MORNING";
//   const shiftRules = ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;

//   if (isTimeAfter(formattedInTime, shiftRules.LATE_THRESHOLD)) {
//     return "LATE";
//   } else if (isTimeAfter(formattedInTime, shiftRules.START_TIME)) {
//     return "SLIGHTLY_LATE";
//   } else {
//     return "PRESENT";
//   }
// };

// // API functions
// export const fetchAttendanceLogs = async (
//   date = null,
//   startDate = null,
//   endDate = null,
//   offset = 0
// ) => {
//   try {
//     const queries = [
//       Query.limit(PAGE_SIZE),
//       Query.offset(offset),
//       Query.orderAsc("EmployeeID"), // Sort by Employee ID ascending
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
//     return []; // Return an empty array to prevent errors
//   }
// };

// export const fetchEmployees = async () => {
//   try {
//     const response = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteEmployeeCollectionId
//     );
//     return response.documents || [];
//   } catch (error) {
//     showError("Error fetching employees!");
//     return [];
//   }
// };

// export const updateEmployeeStatus = async (employeeId, date, newStatus) => {
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
// };

// export const processAttendanceScan = async (employeeId, scanTime) => {
//   try {
//     // Fetch employee details
//     const employeeResponse = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteEmployeeCollectionId,
//       [Query.equal("EmployeeID", employeeId)]
//     );

//     if (employeeResponse.documents.length === 0) {
//       showError("Employee not found!");
//       return null;
//     }

//     const employee = employeeResponse.documents[0];
//     const today = format(new Date(), "yyyy-MM-dd");

//     // Format scanTime as "HH.mm"
//     const timeFormatted = format(new Date(scanTime), "HH.mm");

//     // Determine status based on scan time and employee shift
//     const status = determineAttendanceStatus(timeFormatted, employee.Shift);

//     // Check if a record already exists
//     const existingRecords = await databases.listDocuments(
//       conf.appwriteDatabaseId,
//       conf.appwriteAttendanceLogsCollectionId,
//       [Query.equal("EmployeeID", employeeId), Query.equal("Date", today)]
//     );

//     if (existingRecords.documents.length > 0) {
//       // Update existing record
//       const existingLog = existingRecords.documents[0];

//       // If this is a check-out scan (assuming employee already checked in)
//       if (existingLog.InTime && existingLog.InTime !== "0.00") {
//         // Calculate total time (hours)
//         const inTimeParts = existingLog.InTime.split(".").map(Number);
//         const outTimeParts = timeFormatted.split(".").map(Number);

//         const inTimeHours = inTimeParts[0] + (inTimeParts[1] || 0) / 60;
//         const outTimeHours = outTimeParts[0] + (outTimeParts[1] || 0) / 60;

//         let totalTime = outTimeHours - inTimeHours;
//         if (totalTime < 0) totalTime += 24; // Handle overnight shifts

//         return await databases.updateDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           existingLog.$id,
//           {
//             OutTime: timeFormatted,
//             TotalTime: totalTime.toFixed(2),
//           }
//         );
//       } else {
//         // This is a late check-in
//         return await databases.updateDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           existingLog.$id,
//           {
//             InTime: timeFormatted,
//             Status: status,
//           }
//         );
//       }
//     } else {
//       // Create new record
//       const newLogData = {
//         EmployeeID: employee.EmployeeID,
//         FullName: employee.FullName || "",
//         Position: employee.Position || "",
//         Department: employee.Department || "",
//         Shift: employee.Shift || "MORNING",
//         Supervisor: employee.Supervisor || "",
//         Date: today,
//         InTime: timeFormatted,
//         OutTime: "0.00",
//         TotalTime: 0.0,
//         Status: status,
//       };

//       return await databases.createDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         "unique()",
//         newLogData
//       );
//     }
//   } catch (error) {
//     console.error("Error processing attendance scan:", error);
//     showError("Failed to process attendance scan!");
//     return null;
//   }
// };

// export const markMissingEmployeesAsAbsent = async (currentLogs = []) => {
//   // Only process for today's date
//   const today = format(new Date(), "yyyy-MM-dd");

//   try {
//     // Only fetch employees once
//     const allEmployees = await fetchEmployees();

//     // Create a set of employee IDs who already have records
//     const recordedEmployeeIds = new Set(
//       currentLogs
//         .filter((log) => log.Date === today)
//         .map((log) => log.EmployeeID)
//     );

//     // Find employees without records
//     const missingEmployees = allEmployees.filter(
//       (emp) => !recordedEmployeeIds.has(emp.EmployeeID)
//     );

//     if (missingEmployees.length === 0) return [];

//     // Get current time
//     const currentTime = format(new Date(), "HH:mm");

//     // Create absent logs for missing employees
//     const absentLogs = [];
//     for (const emp of missingEmployees) {
//       const shift = emp.Shift || "MORNING";
//       const shiftRules =
//         ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;

//       // Only mark as absent if past the absent cutoff time
//       const status = isTimeAfter(currentTime, shiftRules.ABSENT_CUTOFF)
//         ? "ABSENT"
//         : "PENDING";

//       const newLog = {
//         EmployeeID: emp.EmployeeID,
//         FullName: emp.FullName || "",
//         Position: emp.Position || "",
//         Department: emp.Department || "",
//         Shift: emp.Shift || "MORNING",
//         Supervisor: emp.Supervisor || "",
//         Date: today,
//         InTime: "0.00",
//         OutTime: "0.00",
//         TotalTime: 0.0,
//         Status: status,
//       };

//       // Check if this record already exists in the database
//       const existingRecords = await databases.listDocuments(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         [
//           Query.equal("EmployeeID", newLog.EmployeeID),
//           Query.equal("Date", newLog.Date),
//         ]
//       );

//       if (existingRecords.documents.length === 0) {
//         // Only create if it doesn't exist yet
//         const createdDoc = await databases.createDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           "unique()",
//           newLog
//         );

//         absentLogs.push({ ...newLog, $id: createdDoc.$id });
//       }
//     }

//     return absentLogs;
//   } catch (error) {
//     console.error("Error marking absent employees:", error);
//     showError("Error processing absent employees!");
//     return [];
//   }
// };

// export const fillMissingDates = (logs, startDate, endDate) => {
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

// export const exportLogsToCSV = (logs, startDate, endDate) => {
//   if (!logs.length) {
//     showError("No records found for the selected date range.");
//     return;
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
// };














import { databases } from "../../Appwrite/appwriteService";
import conf from "../../conf/conf";
import { Query } from "appwrite";
import { format, subMonths } from "date-fns";
import showError from "../Notifications/Error";

// Attendance rules that determine status based on time
const ATTENDANCE_RULES = {
  MORNING_SHIFT: {
    START_TIME: "09:00", // 9:00 AM
    LATE_THRESHOLD: "09:15", // 15 minutes grace period
    ABSENT_CUTOFF: "10:00", // Absent if not arrived by this time
  },
  AFTERNOON_SHIFT: {
    START_TIME: "13:00", // 1:00 PM
    LATE_THRESHOLD: "13:15", // 15 minutes grace period
    ABSENT_CUTOFF: "14:00", // Absent if not arrived by this time
  },
  NIGHT_SHIFT: {
    START_TIME: "21:00", // 9:00 PM
    LATE_THRESHOLD: "21:15", // 15 minutes grace period
    ABSENT_CUTOFF: "22:00", // Absent if not arrived by this time
  },
};

const PAGE_SIZE = 10; // Number of logs per request

// Helper function to check if one time is after another
const isTimeAfter = (time1, time2) => {
  const [hours1, minutes1] = time1.split(":").map(Number);
  const [hours2, minutes2] = time2.split(":").map(Number);

  return hours1 > hours2 || (hours1 === hours2 && minutes1 > minutes2);
};

// Function to fetch attendance logs with optional filtering
const fetchAttendanceLogs = async (
  date = null,
  startDate = null,
  endDate = null,
  offset = 0
) => {
  try {
    const queries = [
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
      Query.orderAsc("EmployeeID"), // Sort by Employee ID ascending
    ];

    if (date) {
      queries.push(Query.equal("Date", date));
    } else if (startDate && endDate) {
      queries.push(Query.between("Date", startDate, endDate));
    }

    const response = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      queries
    );

    return response.documents || [];
  } catch (error) {
    showError("Error fetching attendance logs!");
    return []; // Return an empty array to prevent errors
  }
};

// Fetch all employees
const fetchEmployees = async () => {
  try {
    const response = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteEmployeeCollectionId
    );
    return response.documents || [];
  } catch (error) {
    showError("Error fetching employees!");
    return [];
  }
};

// Determine attendance status based on check-in time and shift
const determineAttendanceStatus = (inTime, employeeShift) => {
  if (!inTime || inTime === "0.00") return "ABSENT";

  // Convert inTime from "HH.mm" format to "HH:mm" format
  const [hours, minutes] = inTime.split(".").map(Number);
  const formattedInTime = `${String(hours).padStart(2, "0")}:${String(
    minutes || 0
  ).padStart(2, "0")}`;

  const shift = employeeShift || "MORNING";
  const shiftRules = ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;

  if (isTimeAfter(formattedInTime, shiftRules.LATE_THRESHOLD)) {
    return "LATE";
  } else if (isTimeAfter(formattedInTime, shiftRules.START_TIME)) {
    return "SLIGHTLY_LATE";
  } else {
    return "PRESENT";
  }
};

// Mark missing employees as absent
const markMissingEmployeesAsAbsent = async (currentLogs) => {
  // Only process for today's date
  const today = format(new Date(), "yyyy-MM-dd");

  try {
    // Fetch all employees
    const allEmployees = await fetchEmployees();

    // Create a set of employee IDs who already have records
    const recordedEmployeeIds = new Set(
      currentLogs
        .filter((log) => log.Date === today)
        .map((log) => log.EmployeeID)
    );

    // Find employees without records
    const missingEmployees = allEmployees.filter(
      (emp) => !recordedEmployeeIds.has(emp.EmployeeID)
    );

    if (missingEmployees.length === 0) return [];

    // Get current time
    const currentTime = format(new Date(), "HH:mm");

    // Create absent logs for missing employees
    const absentLogs = [];

    for (const emp of missingEmployees) {
      const shift = emp.Shift || "MORNING";
      const shiftRules =
        ATTENDANCE_RULES[shift] || ATTENDANCE_RULES.MORNING_SHIFT;

      // Only mark as absent if past the absent cutoff time
      const status = isTimeAfter(currentTime, shiftRules.ABSENT_CUTOFF)
        ? "ABSENT"
        : "PENDING";

      // Check if this record already exists in the database
      const existingRecords = await databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        [Query.equal("EmployeeID", emp.EmployeeID), Query.equal("Date", today)]
      );

      if (existingRecords.documents.length === 0) {
        // Only create if it doesn't exist yet
        const newLog = {
          EmployeeID: emp.EmployeeID,
          FullName: emp.FullName || "",
          Position: emp.Position || "",
          Department: emp.Department || "",
          Shift: emp.Shift || "MORNING",
          Supervisor: emp.Supervisor || "",
          Date: today,
          InTime: "0.00",
          OutTime: "0.00",
          TotalTime: 0.0,
          Status: status,
        };

        const created = await databases.createDocument(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          "unique()",
          newLog
        );

        absentLogs.push(created);
      }
    }

    return absentLogs;
  } catch (error) {
    showError("Error processing absent employees!");
    return [];
  }
};

// Process new attendance scan
const processAttendanceScan = async (employeeId, scanTime) => {
  try {
    // Fetch employee details
    const employeeResponse = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteEmployeeCollectionId,
      [Query.equal("EmployeeID", employeeId)]
    );

    if (employeeResponse.documents.length === 0) {
      showError("Employee not found!");
      return null;
    }

    const employee = employeeResponse.documents[0];
    const today = format(new Date(), "yyyy-MM-dd");

    // Format scanTime as "HH.mm"
    const timeFormatted = format(new Date(scanTime), "HH.mm");

    // Determine status based on scan time and employee shift
    const status = determineAttendanceStatus(timeFormatted, employee.Shift);

    // Check if a record already exists
    const existingRecords = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      [Query.equal("EmployeeID", employeeId), Query.equal("Date", today)]
    );

    let result;

    if (existingRecords.documents.length > 0) {
      // Update existing record
      const existingLog = existingRecords.documents[0];

      // If this is a check-out scan (assuming employee already checked in)
      if (existingLog.InTime && existingLog.InTime !== "0.00") {
        // Calculate total time (hours)
        const inTimeParts = existingLog.InTime.split(".").map(Number);
        const outTimeParts = timeFormatted.split(".").map(Number);

        const inTimeHours = inTimeParts[0] + (inTimeParts[1] || 0) / 60;
        const outTimeHours = outTimeParts[0] + (outTimeParts[1] || 0) / 60;

        let totalTime = outTimeHours - inTimeHours;
        if (totalTime < 0) totalTime += 24; // Handle overnight shifts

        result = await databases.updateDocument(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          existingLog.$id,
          {
            OutTime: timeFormatted,
            TotalTime: totalTime.toFixed(2),
          }
        );
      } else {
        // This is a late check-in
        result = await databases.updateDocument(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          existingLog.$id,
          {
            InTime: timeFormatted,
            Status: status,
          }
        );
      }
    } else {
      // Create new record
      const newLogData = {
        EmployeeID: employee.EmployeeID,
        FullName: employee.FullName || "",
        Position: employee.Position || "",
        Department: employee.Department || "",
        Shift: employee.Shift || "MORNING",
        Supervisor: employee.Supervisor || "",
        Date: today,
        InTime: timeFormatted,
        OutTime: "0.00",
        TotalTime: 0.0,
        Status: status,
      };

      result = await databases.createDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        "unique()",
        newLogData
      );
    }

    return result;
  } catch (error) {
    showError("Failed to process attendance scan!");
    return null;
  }
};

// Update employee's attendance status
const updateEmployeeStatus = async (employeeId, date, newStatus) => {
  try {
    // Find existing log in database
    const existingLogsResponse = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      [Query.equal("EmployeeID", employeeId), Query.equal("Date", date)]
    );

    if (existingLogsResponse.documents.length > 0) {
      // Update the existing record
      const existingLog = existingLogsResponse.documents[0];
      return await databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        existingLog.$id,
        { Status: newStatus }
      );
    } else {
      // Fetch employee info to create a new log
      const employeeResponse = await databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwriteEmployeeCollectionId,
        [Query.equal("EmployeeID", employeeId)]
      );

      if (employeeResponse.documents.length === 0) {
        showError("Employee not found!");
        return null;
      }

      const employee = employeeResponse.documents[0];

      // Create new log
      const newLogData = {
        EmployeeID: employee.EmployeeID,
        FullName: employee.FullName || "",
        Position: employee.Position || "",
        Department: employee.Department || "",
        Shift: employee.Shift || "MORNING",
        Supervisor: employee.Supervisor || "",
        Date: date,
        InTime: "0.00",
        OutTime: "0.00",
        TotalTime: 0.0,
        Status: newStatus,
      };

      return await databases.createDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        "unique()",
        newLogData
      );
    }
  } catch (error) {
    showError("Failed to update status!");
    return null;
  }
};

// Fill missing dates for complete reporting
const fillMissingDates = (logs, startDate, endDate) => {
  const allDates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    allDates.push(format(currentDate, "yyyy-MM-dd"));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Get a unique list of employees from logs
  const employeeIDs = [...new Set(logs.map((log) => log.EmployeeID))];

  // Convert logs to a map for faster lookup (key = date + employee ID)
  const logMap = new Map(
    logs.map((log) => [`${log.Date}_${log.EmployeeID}`, log])
  );

  // Generate a complete log ensuring every employee has an entry for every date
  const completeLogs = [];
  allDates.forEach((date) => {
    employeeIDs.forEach((empID) => {
      completeLogs.push(
        logMap.get(`${date}_${empID}`) || {
          Date: date,
          Status: "Absent",
          EmployeeID: empID,
        }
      );
    });
  });

  return completeLogs;
};

// Export logs to CSV
const exportLogsToCSV = (logs, startDate, endDate) => {
  if (!logs.length) {
    return false;
  }

  // Define the headers in the exact order you want them to appear
  const headerOrder = [
    "EmployeeID",
    "FullName",
    "Position",
    "Department",
    "Date",
    "InTime",
    "OutTime",
    "TotalTime",
    "Status",
  ];

  // Create the CSV header row using the defined order
  const headerRow = headerOrder.join(",");

  // Map each log to a CSV row with values in the same order as headers
  const csvData = logs.map((log) => {
    return headerOrder
      .map((header) => {
        const value = log[header] || "";
        // Ensure values with commas are properly quoted
        return value.toString().includes(",") ? `"${value}"` : value;
      })
      .join(",");
  });

  // Combine header and data rows
  const csvContent = [headerRow, ...csvData].join("\n");

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_logs_${startDate}_to_${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return true;
};

// Export an object with all service functions
const AttendanceService = {
  fetchAttendanceLogs,
  fetchEmployees,
  determineAttendanceStatus,
  markMissingEmployeesAsAbsent,
  processAttendanceScan,
  updateEmployeeStatus,
  fillMissingDates,
  exportLogsToCSV,
  ATTENDANCE_RULES,
  PAGE_SIZE,
};

export default AttendanceService;