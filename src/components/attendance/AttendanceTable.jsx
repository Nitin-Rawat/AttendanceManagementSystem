// components/AttendanceTable.js
import React from "react";

const AttendanceTable = ({
  logs,
  selectedStatus,
  setSelectedStatus,
  handleStatusUpdate,
  loadMoreLogs,
  hasLogs,
  isLoading,
  statuses,
}) => {
  // Format time display in a simple, user-friendly format
  const formatTimeDisplay = (decimalHours) => {
    if (!decimalHours && decimalHours !== 0) return "-";
    if (decimalHours === 0) return "0 min";

    // Convert decimal hours to total minutes
    const totalMinutes = Math.round(decimalHours * 60);
    
    // Format as hours and minutes in a user-friendly way
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (minutes === 0) {
        return `${hours} hr`;
      } else {
        return `${hours} hr ${minutes} min`;
      }
    }
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Employee Name
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Employee ID
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Position
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Department
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Supervisor
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Shift
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Date
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              In Time
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Out Time
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              Total Time
            </th>
            <th className="py-2 px-3 text-center text-sm font-medium text-black uppercase tracking-wider">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border p-2 rounded-md"
              >
                <option value="">All Status</option>
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
                <option value="ON LEAVE">ON LEAVE</option>
              </select>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
            <tr
              key={`${log.EmployeeID}_${log.Date}`}
              className="hover:bg-gray-50"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                {log.FullName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {log.EmployeeID}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {log.Position}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {log.Department}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {log.Supervisor}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {log.Shift}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {new Date(log.Date).toLocaleDateString("en-GB")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {log.InTime || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {log.OutTime || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                {formatTimeDisplay(log.TotalTime)}
                {/* {log.TotalTime * 60} hr */} 
              </td>
              <td className="px-2 py-2 my-2 whitespace-nowrap">
                <StatusDropdown
                  status={log.Status}
                  employeeId={log.EmployeeID}
                  date={log.Date}
                  onStatusChange={handleStatusUpdate}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && !isLoading && (
        <div className="flex justify-center items-center p-8">
          <div className="bg-gray-100 rounded-lg p-4 text-gray-700">
            No attendance data found for the selected date.
          </div>
        </div>
      )}
      {hasLogs && (
        <button
          onClick={loadMoreLogs}
          className="mt-4 bg-[#25549a] text-white px-4 py-2 rounded-lg hover:bg-[#1e4785] transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
};

// Separate component for the status dropdown to further modularize
const StatusDropdown = ({
  status,
  employeeId,
  date,
  onStatusChange,
  statuses,
}) => {
  const getStatusColor = (status) => {
    const normalizedStatus = status?.toUpperCase()?.trim() || "";

    switch (normalizedStatus) {
      case "PRESENT":
        return "bg-green-500";
      case "ABSENT":
        return "bg-red-500 text-white";
      case "ON LEAVE":
        return "bg-blue-500";
      case "PAID LEAVE":
        return "bg-sky-400";
      case "HOLIDAY":
        return "bg-[#1e4785]";
      case "OTHER LEAVE":
        return "bg-yellow-500";
      case "LATE":
        return "bg-black";
      case "WEEKEND":
        return "bg-gray-500";
      case "WEEKEND_OT":
        return "bg-emerald-500 text-white";
      case "EARLY CHECKOUT":
        return "bg-emerald-400";
      case "OVERTIME":
        return "bg-green-950";
      case "HALF_DAY":
        return "bg-amber-300";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };
  return (
    <select
      value={status}
      onChange={(e) => onStatusChange(employeeId, date, e.target.value)}
      className={`text-sm font-semibold rounded-full text-center text-white py-1 ${getStatusColor(
        status
      )}`}
    >
      <option value="PRESENT">PRESENT</option>
      <option value="ABSENT">ABSENT</option>
      <option value="PENDING">PENDING</option>
      <option value="ON LEAVE">ON LEAVE</option>
      <option value="PAID LEAVE">PAID LEAVE</option>
      <option value="HOLIDAY">HOLIDAY</option>
      <option value="OTHER LEAVE">OTHER LEAVE</option>
      <option value="LATE">LATE</option>
      <option value="WEEKEND">WEEKEND</option>
      <option value="WEEKEND_OT">WEEKEND OT</option>
      <option value="EARLY CHECKOUT">EARLY CHECKOUT</option>
      <option value="OVERTIME">OVERTIME</option>
      <option value="HALF_DAY">HALF DAY</option>
    </select>
  );
};

export default AttendanceTable;
