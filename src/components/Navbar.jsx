// import React from "react";
// import { Link } from "react-router-dom";
// import { ClipboardCheck } from "lucide-react";

// const Navbar = () => {
//   return (
//     <nav className="bg-[#1e4785] text-white shadow-lg">
//       <div className="container mx-auto px-4">
//         <div className="flex items-center justify-between h-16">
//           <Link to="/" className="flex items-center space-x-2">
//             <ClipboardCheck className="h-8 w-8" />
//             <span className="text-2xl font-bold">AttendanceHub</span>
//           </Link>
//           <div className="hidden md:flex space-x-4">
//             <Link
//               to="/"
//               className="hover:underline border-r-2 pr-2  font-bold transition-colors"
//             >
//               Home
//             </Link>
//             <Link
//               to="/add-employee"
//               className="hover:underline border-r-2 pr-2   font-bold transition-colors"
//             >
//               Add Employee
//             </Link>
//             <Link
//               to="/scan-qr"
//               className="hover:underline border-r-2 pr-2   font-bold transition-colors"
//             >
//               Scan QR
//             </Link>
//             <Link
//               to="/attendance-logs"
//               className="hover:underline border-r-2 pr-2   font-bold transition-colors"
//             >
//               Logs
//             </Link>
//             <Link
//               to="/employee-stats"
//               className="hover:underline  border-r-2 pr-2  font-bold transition-colors"
//             >
//               Total Employees
//             </Link>
//             {/* <Link
//               to="/employeeData"
//               className="hover:underline   font-bold transition-colors"
//             >
//               Employees Data
//             </Link> */}
//             <Link
//               to="/employeeDetail"
//               className="hover:underline   font-bold transition-colors"
//             >
//               Employees Detail
//             </Link>
//           </div>
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;






import React from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, LogOut } from "lucide-react";

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="bg-[#1e4785] text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <ClipboardCheck className="h-8 w-8" />
            <span className="text-2xl font-bold">AttendanceHub</span>
          </Link>
          <div className="hidden md:flex space-x-4 items-center">
            <Link
              to="/"
              className="hover:underline border-r-2 pr-2 font-bold transition-colors"
            >
              Home
            </Link>
            <Link
              to="/add-employee"
              className="hover:underline border-r-2 pr-2 font-bold transition-colors"
            >
              Add Employee
            </Link>
            <Link
              to="/scan-qr"
              className="hover:underline border-r-2 pr-2 font-bold transition-colors"
            >
              Scan QR
            </Link>
            <Link
              to="/attendance-logs"
              className="hover:underline border-r-2 pr-2 font-bold transition-colors"
            >
              Logs
            </Link>
            <Link
              to="/employee-stats"
              className="hover:underline border-r-2 pr-2 font-bold transition-colors"
            >
              Total Employees
            </Link>
            <Link
              to="/employeeDetail"
              className="hover:underline border-r-2 pr-2 font-bold transition-colors"
            >
              Employees Detail
            </Link>

            {/* User info and logout button */}
            <div className="flex items-center ml-4">
              <span className="mr-2">{user?.email || "User"}</span>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md flex items-center"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;