// import React, { useState } from "react";
// import {
//   Calendar,
//   User,
//   ChevronsRight,
//   Download,
//   ArrowLeft,
// } from "lucide-react";
// import { format } from "date-fns";
// import AttendanceService from "../services/attendanceService";
//  const EmployeeDateRangeFilter = ({
//   onDataChange,
//   onModeChange,
//   isEmployeeSpecificMode = false,
//   currentEmployeeId = null,
//   employeeDataDateRange = { start: null, end: null },
// }) => {
//   const [employeeId, setEmployeeId] = useState("");
//   const [startDate, setStartDate] = useState(
//     format(new Date(new Date().setDate(1)), "yyyy-MM-dd") // First day of current month
//   );
//   const [endDate, setEndDate] = useState(
//     format(new Date(), "yyyy-MM-dd") // Today
//   );
//   const [isLoading, setIsLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState("");

//   // Handle fetching specific employee data for a date range
//   const handleFetchEmployeeData = async () => {
//     if (!employeeId || !startDate || !endDate) {
//       setErrorMessage("Please provide employee ID and date range");
//       return;
//     }

//     if (new Date(startDate) > new Date(endDate)) {
//       setErrorMessage("Start date cannot be after end date");
//       return;
//     }

//     setErrorMessage("");
//     setIsLoading(true);
//     try {
//       // Fetch all logs for the date range first
//       const allLogs = await AttendanceService.fetchAttendanceLogs(
//         null, // No specific date
//         startDate,
//         endDate
//       );

//       // Then filter for the specific employee
//       const employeeLogs = allLogs.filter(
//         (log) => log.EmployeeID === employeeId
//       );

//       // Check if there's any data before proceeding
//       if (!employeeLogs || employeeLogs.length === 0) {
//         setErrorMessage(
//           `No records found for employee ${employeeId} in the selected date range.`
//         );
//         setIsLoading(false);
//         return;
//       }

//       // Fill in any missing dates for the employee
//       const completeLogs = AttendanceService.fillMissingDates(
//         employeeLogs,
//         startDate,
//         endDate
//       );

//       // Notify parent component about the data and mode change
//       onDataChange({
//         logs: completeLogs,
//         employeeId: employeeId,
//         dateRange: { start: startDate, end: endDate },
//       });

//       onModeChange(true);
//     } catch (error) {
//       console.error("Error fetching employee data:", error);
//       setErrorMessage("Failed to fetch employee data. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Handle resetting back to normal view
//   const handleResetToAllEmployees = () => {
//     onModeChange(false);
//     onDataChange({
//       logs: [],
//       employeeId: null,
//       dateRange: { start: null, end: null },
//     });
//   };

//   // Export for employee-specific data
//   const handleExportEmployeeData = async () => {
//     if (
//       !currentEmployeeId ||
//       !employeeDataDateRange.start ||
//       !employeeDataDateRange.end
//     ) {
//       setErrorMessage("No employee data selected for export");
//       return;
//     }

//     setIsLoading(true);
//     try {
//       // Get all logs for the date range
//       const allLogs = await AttendanceService.fetchAttendanceLogs(
//         null,
//         employeeDataDateRange.start,
//         employeeDataDateRange.end
//       );

//       // Filter for the specific employee
//       const employeeLogs = allLogs.filter(
//         (log) => log.EmployeeID === currentEmployeeId
//       );

//       // Check if there's at least some data
//       if (!employeeLogs || employeeLogs.length === 0) {
//         setErrorMessage(
//           "No records found for this employee in the selected date range."
//         );
//         setIsLoading(false);
//         return;
//       }

//       // Fill in missing dates
//       const completeLogs = AttendanceService.fillMissingDates(
//         employeeLogs,
//         employeeDataDateRange.start,
//         employeeDataDateRange.end
//       );

//       // Export the data to CSV
//       const exported = AttendanceService.exportLogsToCSV(
//         completeLogs,
//         employeeDataDateRange.start,
//         employeeDataDateRange.end
//       );

//       if (!exported) {
//         setErrorMessage("No data to export");
//       }
//     } catch (error) {
//       console.error("Error exporting employee data:", error);
//       setErrorMessage("Failed to export employee logs. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="bg-white rounded-xl shadow p-4 mb-6">
//       {!isEmployeeSpecificMode ? (
//         <>
//           <h3 className="text-lg font-medium mb-4">
//             Employee Date Range Report
//           </h3>

//           {errorMessage && (
//             <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//               {errorMessage}
//             </div>
//           )}

//           <div className="grid md:grid-cols-4 gap-4">
//             <div className="relative">
//               <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
//               <input
//                 type="text"
//                 placeholder="Employee ID"
//                 value={employeeId}
//                 onChange={(e) => setEmployeeId(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//               />
//             </div>

//             <div className="relative">
//               <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
//               <input
//                 type="date"
//                 value={startDate}
//                 onChange={(e) => setStartDate(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//               />
//             </div>

//             <div className="relative">
//               <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
//               <input
//                 type="date"
//                 value={endDate}
//                 onChange={(e) => setEndDate(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//               />
//             </div>

//             <button
//               onClick={handleFetchEmployeeData}
//               disabled={isLoading}
//               className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
//             >
//               {isLoading ? (
//                 "Loading..."
//               ) : (
//                 <>
//                   <span>Fetch Data</span>
//                   <ChevronsRight className="ml-2 h-5 w-5" />
//                 </>
//               )}
//             </button>
//           </div>
//         </>
//       ) : (
//         <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex justify-between items-center">
//           <div>
//             <span className="font-medium">
//               Viewing data for Employee ID: {currentEmployeeId}
//             </span>
//             <span className="ml-4 text-gray-600">
//               Date Range: {employeeDataDateRange.start} to{" "}
//               {employeeDataDateRange.end}
//             </span>
//           </div>

//           {errorMessage && (
//             <div className="my-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//               {errorMessage}
//             </div>
//           )}

//           <div>
//             <button
//               onClick={handleExportEmployeeData}
//               disabled={isLoading}
//               className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors mr-2 flex items-center"
//             >
//               {isLoading ? (
//                 "Exporting..."
//               ) : (
//                 <>
//                   <Download className="mr-2 h-4 w-4" />
//                   <span>Export Employee Data</span>
//                 </>
//               )}
//             </button>
//             <button
//               onClick={handleResetToAllEmployees}
//               disabled={isLoading}
//               className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors flex items-center"
//             >
//               <ArrowLeft className="mr-2 h-4 w-4" />
//               <span>View All Employees</span>
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default EmployeeDateRangeFilter;






import React, { useState } from "react";
import {
  Calendar,
  User,
  ChevronsRight,
  Download,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import AttendanceService from "../services/attendanceService";
const EmployeeDateRangeFilter = ({
  onDataChange,
  onModeChange,
  isEmployeeSpecificMode = false,
  currentEmployeeId = null,
  employeeDataDateRange = { start: null, end: null },
}) => {
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd") // First day of current month
  );
  const [endDate, setEndDate] = useState(
    format(new Date(), "yyyy-MM-dd") // Today
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Handle fetching specific employee data for a date range
  const handleFetchEmployeeData = async () => {
    if (!employeeId || !startDate || !endDate) {
      setErrorMessage("Please provide employee ID and date range");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage("Start date cannot be after end date");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    try {
      // Fetch all logs for the date range first
      const allLogs = await AttendanceService.fetchAttendanceLogs(
        null, // No specific date
        startDate,
        endDate
      );

      // Modified: Use includes instead of strict equality to match the behavior in the main component
      const employeeLogs = allLogs.filter((log) =>
        log.EmployeeID?.toLowerCase().includes(employeeId.toLowerCase())
      );

      // Check if there's any data before proceeding
      if (!employeeLogs || employeeLogs.length === 0) {
        setErrorMessage(
          `No records found for employee ${employeeId} in the selected date range.`
        );
        setIsLoading(false);
        return;
      }

      // Fill in any missing dates for the employee
      const completeLogs = AttendanceService.fillMissingDates(
        employeeLogs,
        startDate,
        endDate
      );

      // Notify parent component about the data and mode change
      onDataChange({
        logs: completeLogs,
        employeeId: employeeId,
        dateRange: { start: startDate, end: endDate },
      });

      onModeChange(true);
    } catch (error) {
      console.error("Error fetching employee data:", error);
      setErrorMessage("Failed to fetch employee data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resetting back to normal view
  const handleResetToAllEmployees = () => {
    onModeChange(false);
    onDataChange({
      logs: [],
      employeeId: null,
      dateRange: { start: null, end: null },
    });
  };

  // Export for employee-specific data
  const handleExportEmployeeData = async () => {
    if (
      !currentEmployeeId ||
      !employeeDataDateRange.start ||
      !employeeDataDateRange.end
    ) {
      setErrorMessage("No employee data selected for export");
      return;
    }

    setIsLoading(true);
    try {
      // Get all logs for the date range
      const allLogs = await AttendanceService.fetchAttendanceLogs(
        null,
        employeeDataDateRange.start,
        employeeDataDateRange.end
      );

      // Modified: Use includes instead of strict equality
      const employeeLogs = allLogs.filter((log) =>
        log.EmployeeID?.toLowerCase().includes(currentEmployeeId.toLowerCase())
      );

      // Check if there's at least some data
      if (!employeeLogs || employeeLogs.length === 0) {
        setErrorMessage(
          "No records found for this employee in the selected date range."
        );
        setIsLoading(false);
        return;
      }

      // Fill in missing dates
      const completeLogs = AttendanceService.fillMissingDates(
        employeeLogs,
        employeeDataDateRange.start,
        employeeDataDateRange.end
      );

      // Export the data to CSV
      const exported = AttendanceService.exportLogsToCSV(
        completeLogs,
        employeeDataDateRange.start,
        employeeDataDateRange.end
      );

      if (!exported) {
        setErrorMessage("No data to export");
      }
    } catch (error) {
      console.error("Error exporting employee data:", error);
      setErrorMessage("Failed to export employee logs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      {!isEmployeeSpecificMode ? (
        <>
          <h3 className="text-lg font-medium mb-4">
            Employee Date Range Report
          </h3>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
              <input
                type="text"
                placeholder="Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleFetchEmployeeData}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                "Loading..."
              ) : (
                <>
                  <span>Fetch Data</span>
                  <ChevronsRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex justify-between items-center">
          <div>
            <span className="font-medium">
              Viewing data for Employee ID: {currentEmployeeId}
            </span>
            <span className="ml-4 text-gray-600">
              Date Range: {employeeDataDateRange.start} to{" "}
              {employeeDataDateRange.end}
            </span>
          </div>

          {errorMessage && (
            <div className="my-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          <div>
            <button
              onClick={handleExportEmployeeData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors mr-2 flex items-center"
            >
              {isLoading ? (
                "Exporting..."
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export Employee Data</span>
                </>
              )}
            </button>
            <button
              onClick={handleResetToAllEmployees}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>View All Employees</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDateRangeFilter;