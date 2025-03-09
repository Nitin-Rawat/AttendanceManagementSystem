// // utils/attendanceUtils.js
// import { format, subMonths } from "date-fns";
// import { databases } from "../../Appwrite/appwriteService";
// import conf from "../../conf/conf";
// import { Query } from "appwrite";
// import showError from "../Notifications/Error";
 

// export const isTimeAfter = (time1, time2) => {
//   const [hours1, minutes1] = time1.split(":").map(Number);
//   const [hours2, minutes2] = time2.split(":").map(Number);

//   return hours1 > hours2 || (hours1 === hours2 && minutes1 > minutes2);
// };

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

// export  const determineAttendanceStatus = (inTime, employeeShift) => {
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

// export  const fillMissingDates = (logs, startDate, endDate) => {
//      const allDates = [];
//      let currentDate = new Date(startDate);

//      while (currentDate <= new Date(endDate)) {
//        allDates.push(format(currentDate, "yyyy-MM-dd"));
//        currentDate.setDate(currentDate.getDate() + 1);
//      }

//      // Get a unique list of employees from logs
//      const employeeIDs = [...new Set(logs.map((log) => log.EmployeeID))];

//      // Convert logs to a map for faster lookup (key = date + employee ID)
//      const logMap = new Map(
//        logs.map((log) => [`${log.Date}_${log.EmployeeID}`, log])
//      );

//      // Generate a complete log ensuring every employee has an entry for every date
//      const completeLogs = [];
//      allDates.forEach((date) => {
//        employeeIDs.forEach((empID) => {
//          completeLogs.push(
//            logMap.get(`${date}_${empID}`) || {
//              Date: date,
//              Status: "Absent",
//              EmployeeID: empID,
//            }
//          );
//        });
//      });

//      return completeLogs;
//    };

// export   const exportLogsToCSV = (logs, startDate, endDate) => {
//   if (!logs.length) {
//     alert("No records found for the selected date range.");
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



// export const handleExport = async () => {

//   // Parse the number of months from the selected range
//   const months = parseInt(selectedRange.split(" ")[0]);

//   // Calculate date range based on selected months
//   const endDate = format(new Date(), "yyyy-MM-dd");
//   const startDate = format(subMonths(new Date(), months), "yyyy-MM-dd");

//   try {
//     // Explicitly fetch the logs only when the export button is clicked
//     const fetchedLogs = await fetchAttendanceLogs(null, startDate, endDate);

//     if (!fetchedLogs.length) {
//       alert(`No records found for the last ${months} month(s).`);
//       return;
//     }

//     // Deduplicate logs before filling missing dates
//     const uniqueLogsMap = new Map();
//     fetchedLogs.forEach((log) => {
//       const key = `${log.EmployeeID}_${log.Date}`;
//       uniqueLogsMap.set(key, log);
//     });

//     const uniqueLogs = Array.from(uniqueLogsMap.values());

//     // Fill in any missing dates to ensure complete data
//     const completeLogs = fillMissingDates(uniqueLogs, startDate, endDate);

//     // Export the data to CSV with preserved header order
//     exportLogsToCSV(completeLogs, startDate, endDate);
//   } catch (error) {
//     showError("Failed to export logs. Please try again.");
//   } finally {
//     setIsLoading(false);
//   }
// };

// // ...other utility functions

