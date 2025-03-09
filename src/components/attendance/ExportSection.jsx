import React from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";

const ExportSection = ({
  selectedRange,
  setSelectedRange,
  dateRanges,
  isLoading,
  startDate,
  endDate,
  logs,
}) => {
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

  // Update the export function to preserve header order
  const exportLogsToCSV = (logs, startDate, endDate) => {
    if (!logs.length) {
      alert("No records found for the selected date range.");
      return;
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
  };

  const handleExport = async () => {
    // Parse the number of months from the selected range
    const months = parseInt(selectedRange.split(" ")[0]);

    // Calculate date range based on selected months
    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(
      new Date(new Date().setMonth(new Date().getMonth() - months)),
      "yyyy-MM-dd"
    );

    if (!logs.length) {
      alert(`No records found for the last ${months} month(s).`);
      return;
    }

    // Deduplicate logs before filling missing dates
    const uniqueLogsMap = new Map();
    logs.forEach((log) => {
      const key = `${log.EmployeeID}_${log.Date}`;
      uniqueLogsMap.set(key, log);
    });

    const uniqueLogs = Array.from(uniqueLogsMap.values());

    // Fill in any missing dates to ensure complete data
    const completeLogs = fillMissingDates(uniqueLogs, startDate, endDate);

    // Export the data to CSV with preserved header order
    exportLogsToCSV(completeLogs, startDate, endDate);
  };

  return (
    <div className="bg-white border rounded-xl shadow-lg mb-5 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">Attendance Logs</h1>

        <div className="flex items-center gap-2">
          <span className="text-black font-medium">Date Range:</span>
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1e4785] focus:border-[#e2e2e2]"
          >
            {dateRanges.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          className="bg-[#2f5fa6] text-white px-4 py-2 rounded-lg hover:bg-[#1e4785] transition-colors flex items-center space-x-2"
          disabled={isLoading}
        >
          <Download className="h-5 w-5" />
          <span>Export {selectedRange} Data</span>
        </button>
      </div>
    </div>
  );
};

export default ExportSection;
