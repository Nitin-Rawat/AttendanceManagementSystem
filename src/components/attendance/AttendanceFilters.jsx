// components/AttendanceFilters.js
import React, { useCallback } from "react";
import { Search, Calendar, Filter } from "lucide-react";
import { debounce } from "lodash";

const AttendanceFilters = ({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  selectedPosition,
  setSelectedPosition,
  positions,
}) => {
  // Debounce the search input to prevent lag
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    [setSearchTerm]
  );

  // Debounce the date selection to prevent lag
  const debouncedDateChange = useCallback(
    debounce((value) => {
      setSelectedDate(value);
    }, 300),
    [setSelectedDate]
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    // Update the input field immediately for user feedback
    e.persist();
    // Debounce the actual search operation
    debouncedSearch(e.target.value);
  };

  // Handle date change
  const handleDateChange = (e) => {
    e.persist();
    // Show immediate visual feedback
    e.target.classList.add("bg-gray-100");
    // Debounce the actual date change
    debouncedDateChange(e.target.value);
    // Remove visual feedback after a short delay
    setTimeout(() => {
      e.target.classList.remove("bg-gray-100");
    }, 300);
  };

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
        <input
          type="text"
          placeholder="Search by name or ID..."
          defaultValue={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
        <input
          type="date"
          defaultValue={selectedDate}
          onChange={handleDateChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300"
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
