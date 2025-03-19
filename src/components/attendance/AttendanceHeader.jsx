// components/AttendanceHeader.js
import React from "react";
import { Download } from "lucide-react";

const AttendanceHeader = ({
  selectedRange,
  setSelectedRange,
  handleExport,
  isLoading,
  dateRanges,
}) => {
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
        > {isLoading ? (
                "Loading..."
              ) : (
                <> 
          <Download className="h-5 w-5" />
          <span>Export {selectedRange} Data</span>
         </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AttendanceHeader;
