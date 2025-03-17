//  import React from "react";

// const AttendanceStatusCell = ({ status, employeeID, date, onStatusChange }) => {
//  const getStatusColor = (status) => {
//    const normalizedStatus = status?.toUpperCase()?.trim() || "";

//    switch (normalizedStatus) {
//      case "PRESENT":
//        return "bg-green-500";
//      case "ABSENT":
//        return "bg-red-500 text-white";
//      case "PENDING":
//        return "bg-yellow-100 text-white";
//      case "ON LEAVE":
//        return "bg-blue-500";
//      case "PAID LEAVE":
//        return "bg-sky-400";
//      case "HOLIDAY":
//        return "bg-[#1e4785]";
//      case "OTHER LEAVE":
//        return "bg-yellow-500";
//      case "LATE":
//        return "bg-black text-white";
//      case "WEEKEND":
//        return "bg-gray-500";
//      case "EARLY CHECKOUT":
//        return "bg-emerald-400";
//      case "OVERTIME":
//        return "bg-green-950";
//      case "HALF-DAY":
//        return "bg-amber-300";
//      default:
//        return "bg-yellow-100 text-black";
//    }
//  };

//   return (
//     <select
//       value={status}
//       onChange={(e) => onStatusChange(employeeID, date, e.target.value)}
//       className={`text-sm font-semibold rounded-full text-center text-white py-1 ${getStatusColor(
//         status
//       )}`}
//     >
//       <option value="PRESENT">PRESENT</option>
//       <option value="ABSENT">ABSENT</option>
//       <option value="PENDING">PENDING</option>  
//       <option value="ON LEAVE">ON LEAVE</option>
//       <option value="PAID LEAVE">PAID LEAVE</option>
//       <option value="HOLIDAY">HOLIDAY</option>
//       <option value="OTHER LEAVE">OTHER LEAVE</option>
//       <option value="LATE">LATE</option>
//       <option value="WEEKEND">WEEKEND</option>
//       <option value="EARLY CHECKOUT">EARLY CHECKOUT</option>
//       <option value="OVERTIME">OVERTIME</option>
//       <option value="HALF-DAY">HALF-DAY</option>
//     </select>
//   );
// };

// export default AttendanceStatusCell;
