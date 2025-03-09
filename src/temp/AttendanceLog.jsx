import React, { useEffect, useState } from "react";

const AttendanceLog = ({ date }) => {
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    // Get all employees and scanned attendance
    const employees = JSON.parse(localStorage.getItem("employees") || "[]");
    const scannedAttendance = JSON.parse(
      localStorage.getItem("scannedAttendance") || "[]"
    );

    // Mark attendance for all employees
    const fullAttendance = employees.map((employee) => {
      const isPresent = scannedAttendance.some(
        (record) => record.employeeId === employee.id && record.date === date
      );

      return {
        ...employee,
        status: isPresent ? "Present" : "Absent",
        time: isPresent
          ? scannedAttendance.find(
              (record) =>
                record.employeeId === employee.id && record.date === date
            )?.time
          : "-",
      };
    });

    setAttendance(fullAttendance);
  }, [date]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Attendance Log - {date}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">employee ID</th>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Class</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {attendance.map((record) => (
              <tr
                key={record.id}
                className={record.status === "Absent" ? "bg-red-50" : ""}
              >
                <td className="px-6 py-4">{record.id}</td>
                <td className="px-6 py-4">{record.name}</td>
                <td className="px-6 py-4">{record.classId}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      record.status === "Present"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {record.status}
                  </span>
                </td>
                <td className="px-6 py-4">{record.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceLog;
