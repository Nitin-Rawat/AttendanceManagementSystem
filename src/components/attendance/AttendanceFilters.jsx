// components/AttendanceFilters.js
import React from "react";
import { Search, Calendar, Filter } from "lucide-react";

const AttendanceFilters = ({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  selectedPosition,
  setSelectedPosition,
  positions,
}) => {
  return (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="relative">
        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
        <select
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All positions</option>
          {positions.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AttendanceFilters;
