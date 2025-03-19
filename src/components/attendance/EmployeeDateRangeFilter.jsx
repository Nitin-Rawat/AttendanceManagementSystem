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
  logs = [], // Add logs as a prop
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
      const searchEmployeeId = employeeId.trim().toUpperCase();
      console.log("🔍 Searching for employee:", searchEmployeeId);

      // Clear cache first to ensure fresh data
      AttendanceService.clearCache("logs");

      // Fetch all logs for the date range
      const allLogs = await AttendanceService.fetchAttendanceLogs(
        null, // No specific date
        startDate,
        endDate
      );

      console.log(`📊 Found ${allLogs.length} total logs`);

      // Log unique employee IDs found
      const uniqueIds = [
        ...new Set(allLogs.map((log) => log.EmployeeID)),
      ].sort();
      console.log("📋 Available employee IDs:", uniqueIds);

      // Use exact match for employee ID with proper validation
      const employeeLogs = allLogs.filter((log) => {
        if (!log.EmployeeID) {
          console.log("⚠️ Log missing EmployeeID:", log);
          return false;
        }

        const logEmployeeId = log.EmployeeID.trim().toUpperCase();
        const matches = logEmployeeId === searchEmployeeId;

        if (matches) {
          console.log("✅ Found matching log:", {
            EmployeeID: log.EmployeeID,
            Date: log.Date,
            InTime: log.InTime,
            OutTime: log.OutTime,
          });
        }
        return matches;
      });

      console.log(
        `🎯 Found ${employeeLogs.length} logs for employee ${searchEmployeeId}`
      );

      // Check if there's any data before proceeding
      if (!employeeLogs || employeeLogs.length === 0) {
        const error = `No records found for employee ${searchEmployeeId} in the selected date range.`;
        console.log("❌", error);
        console.log("💡 Try one of these employee IDs:", uniqueIds.join(", "));
        setErrorMessage(error);
        setIsLoading(false);
        return;
      }

      // Sort logs by date
      employeeLogs.sort((a, b) => new Date(a.Date) - new Date(b.Date));

      // Fill in any missing dates for the employee
      const completeLogs = AttendanceService.fillMissingDates(
        employeeLogs,
        startDate,
        endDate
      );

      console.log(`✨ Processed ${completeLogs.length} complete logs`);

      // Notify parent component about the data and mode change
      onDataChange({
        logs: completeLogs,
        employeeId: searchEmployeeId,
        dateRange: { start: startDate, end: endDate },
      });

      onModeChange(true);
    } catch (error) {
      console.error("❌ Error fetching employee data:", error);
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
      // Pass the currentEmployeeId as the fourth parameter
      const completeLogs = await AttendanceService.exportLogsToCSV(
        logs,
        employeeDataDateRange.start,
        employeeDataDateRange.end,
        currentEmployeeId // Add this parameter
      );

      if (!completeLogs) {
        setErrorMessage("No data to export");
      } else {
        console.log(
          "✅ Data exported successfully for employee:",
          currentEmployeeId
        );
      }
    } catch (error) {
      console.error("❌ Error exporting employee data:", error);
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
                placeholder="Full Employee ID"
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
