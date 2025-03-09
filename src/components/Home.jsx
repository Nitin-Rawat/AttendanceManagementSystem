import React from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, UserPlus, ClipboardList, Users } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Scan QR Code",
      description: "Quickly mark attendance by scanning employee QR codes",
      icon: QrCode,
      path: "/scan-qr",
      color: "bg-blue-500",
    },
    {
      title: "Add New Employee",
      description: "Register new employees and generate their QR codes",
      icon: UserPlus,
      path: "/add-employee",
      color: "bg-green-500",
    },
    {
      title: "View Attendance Logs",
      description: "Access and manage attendance records",
      icon: ClipboardList,
      path: "/attendance-logs",
      color: "bg-purple-500",
    },
    {
      title: "Employee Statistics",
      description: "View total employees and class-wise distribution",
      icon: Users,
      path: "/employee-stats",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to AttendanceHub
        </h1>
        <p className="text-lg text-gray-600">
          Streamline your attendance management with our modern QR-based system
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-5 px-5">
        {features.map((feature) => (
          <button
            key={feature.title}
            onClick={() => navigate(feature.path)}
            className="p-6 h-72 w-72 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 bg-white border border-gray-100"
          >
            <div
              className={`${feature.color} w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto`}
            >
              <feature.icon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {feature.title}
            </h2>
            <p className="text-gray-600">{feature.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-16 mx-5 bg-[#1e4785] rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Start Managing Attendance</h2>
        <p className="mb-6">
          Choose any of the options above to begin managing your employee
          attendance
        </p>
      </div>
    </div>
  );
};

export default Home;