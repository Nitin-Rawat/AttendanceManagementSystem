import React, { useEffect, useState } from "react";
import { Users, GraduationCapIcon } from "lucide-react";
import {  Query } from "appwrite";
import conf from "../conf/conf";
import { databases } from "../Appwrite/appwriteService";

const fetchEmployeeStats = async () => {
  try {
    const response = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteEmployeeCollectionId,
      [Query.select(["Position"])]
    );
console.log('Response :-' ,response)
    const stats = {};
    let totalEmployees = 0;

    response.documents.forEach((doc) => {
      if (doc.Position) {
        stats[doc.Position] = (stats[doc.Position] || 0) + 1;
        totalEmployees++;
      }
    });

    return { totalEmployees, positionStats: stats };
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    return { totalEmployees: 0, positionStats: {} };
  }
};

const EmployeeStats = () => {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [positionStats, setPositionStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const { totalEmployees, positionStats } = await fetchEmployeeStats();
      setTotalEmployees(totalEmployees);
      setPositionStats(positionStats);
      setIsLoading(false);
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 flex justify-center items-center h-64">
          <div className="text-gray-500">Loading employee statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Employee Statistics
        </h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <StatCard
            icon={<Users className="h-12 w-12" />}
            label="Total Employees"
            value={totalEmployees}
            color="blue"
          />
          <StatCard
            icon={<GraduationCapIcon className="h-12 w-12" />}
            label="Number of Positions"
            value={Object.keys(positionStats).length}
            color="green"
          />
        </div>

        <PositionStats
          positionStats={positionStats}
          totalEmployees={totalEmployees}
        />
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div
    className={`bg-gradient-to-r from-[#1e4785]  to-[#1e4785] rounded-xl p-6 text-white`}
  >
    <div className="flex items-center space-x-4">
      {icon}
      <div>
        <p className="text-lg opacity-90">{label}</p>
        <h2 className="text-4xl font-bold">{value}</h2>
      </div>
    </div>
  </div>
);

const PositionStats = ({ positionStats, totalEmployees }) => (
  <div className="bg-gray-50 rounded-xl p-6">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">
      Position-wise Distribution
    </h2>
    <div className="space-y-4">
      {Object.entries(positionStats).map(([position, count]) => (
        <div key={position} className="bg-white rounded-lg p-4 shadow">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-800">{position}</h3>
              <p className="text-sm text-gray-500">Total Employees</p>
            </div>
            <div className="text-2xl font-bold text-[#1e4785]">{count}</div>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#1e4785] rounded-full h-2"
              style={{ width: `${(count / totalEmployees) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default EmployeeStats;
