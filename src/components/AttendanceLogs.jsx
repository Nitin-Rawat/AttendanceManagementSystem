// AttendanceLogs.js
import React, { useState, useEffect, useCallback } from "react";
import AttendanceHeader from "./attendance/AttendanceHeader";
import AttendanceFilters from "./attendance/AttendanceFilters";
import AttendanceTable from "./attendance/AttendanceTable";
import showError from "./Notifications/Error";
import { format, subMonths } from "date-fns";
import AttendanceService from "./services/attendanceService";

import { debounce } from "lodash";
import EmployeeDateRangeFilter from "./attendance/EmployeeDateRangeFilter";

const AttendanceLogs = () => {
  // State variables
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRange, setSelectedRange] = useState("1 Month");
  const [logs, setLogs] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const dateRanges = ["1 Month", "2 Months", "3 Months"];
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [logsProcessedForToday, setLogsProcessedForToday] = useState(false);

  // New state for employee-specific data
  const [employeeSpecificMode, setEmployeeSpecificMode] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [employeeDataDateRange, setEmployeeDataDateRange] = useState({
    start: null,
    end: null,
  });
  const [statusUpdateRun, setStatusUpdateRun] = useState(false);

  // And in the scheduler function
  const setupStatusUpdateScheduler = () => {
    // Run status updates at specific intervals
    const updateInterval = setInterval(() => {
      // Update all statuses at 6:00 PM (end of typical workday)
      const currentTime = format(new Date(), "HH:mm");
      if (currentTime === "18:00" && !statusUpdateRun) {
        setStatusUpdateRun(true);
        AttendanceService.updateAllStatuses()
          .then(() => {
            // Refresh logs to show updated statuses
            loadLogs();
          })
          .catch((error) => {
            console.error("Scheduled status update failed:", error);
          });
      } else if (currentTime !== "18:00") {
        setStatusUpdateRun(false); // Reset for the next day
      }
    }, 60 * 1000); // Check every minute

    // Clean up interval on component unmount
    return () => clearInterval(updateInterval);
  };

  // Update the useEffect for attendance checking to use the enhanced version
  useEffect(() => {
    if (
      selectedDate === format(new Date(), "yyyy-MM-dd") &&
      logs.length > 0 &&
      !logsProcessedForToday
    ) {
      setLogsProcessedForToday(true);
      AttendanceService.markMissingEmployeesAsAbsent(logs).then(
        (absentLogs) => {
          if (absentLogs.length > 0) {
            setLogs((prevLogs) => {
              const uniqueLogsMap = new Map();

              prevLogs.forEach((log) => {
                const key = `${log.EmployeeID}_${log.Date}`;
                uniqueLogsMap.set(key, log);
              });

              absentLogs.forEach((log) => {
                const key = `${log.EmployeeID}_${log.Date}`;
                if (!uniqueLogsMap.has(key)) {
                  uniqueLogsMap.set(key, log);
                }
              });

              return Array.from(uniqueLogsMap.values());
            });
          }
        }
      );
    }
  }, [selectedDate, logs.length]);

  // Add this to the main component's useEffect initialization
  useEffect(() => {
    const cleanupAttendanceCheck = scheduleAttendanceCheck();
    const cleanupStatusUpdate = setupStatusUpdateScheduler();

    return () => {
      cleanupAttendanceCheck();
      cleanupStatusUpdate();
    };
  }, []);

  // Handler for data changes from EmployeeDateRangeFilter
  const handleEmployeeDataChange = ({ logs, employeeId, dateRange }) => {
    if (logs && logs.length > 0) {
      setLogs(logs);
      setEmployeeSpecificMode(true);
      setCurrentEmployeeId(employeeId);
      setEmployeeDataDateRange(dateRange);

      // Reset filters to show only this employee's data
      setSearchTerm("");
      setSelectedDate(""); // Clear date filter to show all dates in range
      setSelectedPosition(""); // Clear position filter
      // setSelectedStatus(""); // Clear status filter
      // setCurrentEmployeeId(employeeId);
    }
  };

  // Handler for mode changes from EmployeeDateRangeFilter
  const handleEmployeeModeChange = (isEmployeeMode) => {
    setEmployeeSpecificMode(isEmployeeMode);

    if (!isEmployeeMode) {
      // Reset to default view
      setCurrentEmployeeId(null);
      setEmployeeDataDateRange({ start: null, end: null });
      setSearchTerm("");
      setSelectedDate(new Date().toISOString().split("T")[0]); // Today's date
      setOffset(0);
      loadLogs(); // Reload all logs
    }
  };

  // Update loadLogs function
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let fetchedLogs;
      
      if (employeeSpecificMode && currentEmployeeId) {
        // Use the new function for single employee data
        fetchedLogs = await AttendanceService.fetchSingleEmployeeLogs(
          currentEmployeeId,
          employeeDataDateRange.start,
          employeeDataDateRange.end
        );
      } else {
        // Use existing pagination for all employees
        fetchedLogs = await AttendanceService.fetchAttendanceLogs(
          selectedDate,
          selectedRange !== "1 Month" ? format(subMonths(new Date(), parseInt(selectedRange)), "yyyy-MM-dd") : null,
          format(new Date(), "yyyy-MM-dd"),
          offset
        );
      }

      if (fetchedLogs.length === 0 && offset === 0) {
        setLogs([]);
        setHasMore(false);
      } else if (fetchedLogs.length === 0) {
        setHasMore(false);
      } else {
        setLogs(prevLogs => offset === 0 ? fetchedLogs : [...prevLogs, ...fetchedLogs]);
        setHasMore(fetchedLogs.length === AttendanceService.PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
      showError("Failed to load attendance logs");
    }
    setIsLoading(false);
    setInitialLoadComplete(true);
  }, [selectedDate, selectedRange, offset, employeeSpecificMode, currentEmployeeId, employeeDataDateRange]);

  // Load more logs for infinite scrolling/pagination
  const loadMoreLogs = async () => {
    setIsLoading(true);

    try {
      // Calculate date range based on selected range
      const months = parseInt(selectedRange.split(" ")[0]);
      const startDate = format(subMonths(new Date(), months), "yyyy-MM-dd");
      const endDate = format(new Date(), "yyyy-MM-dd");

      // Include current filters in the fetch
      const dateFilter = selectedDate || null;

      // This is the key change - use your current filters when fetching more
      const newLogs = await AttendanceService.fetchAttendanceLogs(
        dateFilter,
        startDate,
        endDate,
        offset + AttendanceService.PAGE_SIZE
      );
      if (newLogs.length < AttendanceService.PAGE_SIZE) {
        setHasMore(false);
      }

      if (newLogs.length > 0) {
        // Use a more robust approach to deduplication
        setLogs((prevLogs) => {
          // Create a Map to track unique entries by ID+Date
          const uniqueLogsMap = new Map();

          // First add all existing logs to the map
          prevLogs.forEach((log) => {
            const key = `${log.EmployeeID}_${log.Date}`;
            uniqueLogsMap.set(key, log);
          });

          // Then add new logs, overwriting duplicates if needed
          newLogs.forEach((log) => {
            const key = `${log.EmployeeID}_${log.Date}`;
            // Only add if not already in the map
            if (!uniqueLogsMap.has(key)) {
              uniqueLogsMap.set(key, log);
            }
          });

          // Convert map values back to array
          return Array.from(uniqueLogsMap.values());
        });

        setOffset((prevOffset) => prevOffset + AttendanceService.PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading more logs:", error);
      showError("Error loading more logs!");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle exporting attendance data
  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Parse the number of months from the selected range
      const months = parseInt(selectedRange.split(" ")[0]);

      // Calculate date range based on selected months
      const endDate = format(new Date(), "yyyy-MM-dd");
      const startDate = format(subMonths(new Date(), months), "yyyy-MM-dd");

      // Explicitly fetch the logs only when the export button is clicked
      const fetchedLogs = await AttendanceService.fetchAttendanceLogs(
        null,
        startDate,
        endDate
      );

      if (!fetchedLogs.length) {
        alert(`No records found for the last ${months} month(s).`);
        return;
      }

      // Deduplicate logs before filling missing dates
      const uniqueLogsMap = new Map();
      fetchedLogs.forEach((log) => {
        const key = `${log.EmployeeID}_${log.Date}`;
        uniqueLogsMap.set(key, log);
      });

      const uniqueLogs = Array.from(uniqueLogsMap.values());

      // Fill in any missing dates to ensure complete data
      const completeLogs = AttendanceService.fillMissingDates(
        uniqueLogs,
        startDate,
        endDate
      );

      // Export the data to CSV
      const exported = AttendanceService.exportLogsToCSV(
        completeLogs,
        startDate,
        endDate
      );

      if (!exported) {
        showError("No data to export");
      }
    } catch (error) {
      showError("Failed to export logs. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (employeeId, date, newStatus) => {
    try {
      // Find existing log in state
      const existingLogIndex = logs.findIndex(
        (log) => log.EmployeeID === employeeId && log.Date === date
      );

      // Optimistic UI update
      if (existingLogIndex >= 0) {
        setLogs((prevLogs) => {
          const updatedLogs = [...prevLogs];
          updatedLogs[existingLogIndex] = {
            ...updatedLogs[existingLogIndex],
            Status: newStatus,
          };
          return updatedLogs;
        });
      }

      // Update in database
      await AttendanceService.updateEmployeeStatus(employeeId, date, newStatus);
    } catch (error) {
      showError("Failed to update status!");
      // Revert optimistic update
      loadLogs();
    }
  };

  // Initialize attendance check scheduler
  const scheduleAttendanceCheck = () => {
    // Run every hour
    const checkAbsentInterval = setInterval(() => {
      if (format(new Date(), "HH:mm") === "12:00") {
        // At noon, mark employees as absent if they haven't checked in
        AttendanceService.markMissingEmployeesAsAbsent(logs)
          .then((absentLogs) => {
            if (absentLogs.length > 0) {
              setLogs((prevLogs) => [...prevLogs, ...absentLogs]);
            }
          })
          .catch((error) => {
            console.error("Scheduled attendance check failed:", error);
          });
      }
    }, 60 * 1000); // Check every minute

    // Clean up interval on component unmount
    return () => clearInterval(checkAbsentInterval);
  };

  // Filter logs based on search/filter criteria
  // const getFilteredLogs = () => {
  //   return logs.filter((log) => {
  //     const matchesSearch =
  //       !searchTerm ||
  //       log.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       log.EmployeeID?.toLowerCase().includes(searchTerm.toLowerCase());

  //     const matchesDate = !selectedDate || log.Date === selectedDate;

  //     const matchesPosition =
  //       !selectedPosition || log.Position?.trim() === selectedPosition;

  //     const matchesStatus =
  //       !selectedStatus ||
  //       log.Status?.toUpperCase() === selectedStatus.toUpperCase();

  //     // For employee-specific mode, only filter by status and date if needed
  //     if (employeeSpecificMode && currentEmployeeId) {
  //       if (log.EmployeeID !== currentEmployeeId) return false;
  //       return (
  //         (!selectedDate || log.Date === selectedDate) &&
  //         (!selectedStatus ||
  //           log.Status?.toUpperCase() === selectedStatus.toUpperCase())
  //       );
  //     }

  //     return matchesSearch && matchesDate && matchesPosition && matchesStatus;
  //   });
  // };

  const getFilteredLogs = () => {
    return logs.filter((log) => {
      // For employee-specific mode, filter by employee ID first
      if (employeeSpecificMode && currentEmployeeId) {
        if (log.EmployeeID !== currentEmployeeId) return false;

        // Then apply any additional date/status filters
        const matchesDate = !selectedDate || log.Date === selectedDate;
        const matchesStatus =
          !selectedStatus ||
          log.Status?.toUpperCase() === selectedStatus.toUpperCase();

        return matchesDate && matchesStatus;
      }

      // Regular filtering for non-employee-specific mode
      const matchesSearch =
        !searchTerm ||
        log.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.EmployeeID?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = !selectedDate || log.Date === selectedDate;
      const matchesPosition =
        !selectedPosition || log.Position?.trim() === selectedPosition;
      const matchesStatus =
        !selectedStatus ||
        log.Status?.toUpperCase() === selectedStatus.toUpperCase();

      return matchesSearch && matchesDate && matchesPosition && matchesStatus;
    });
  };

  // Replace your existing useEffect for selectedDate with this:
  useEffect(() => {
    // Clear any previous debouncing
    if (debouncedLoadLogs.cancel) {
      debouncedLoadLogs.cancel();
    }

    // Call loadLogs directly when date changes (no debouncing)
    loadLogs();
  }, [loadLogs]); // Only selectedDate as dependency

  useEffect(() => {
    // Only run for today's date and when logs are loaded
    if (
      selectedDate === format(new Date(), "yyyy-MM-dd") &&
      logs.length > 0 &&
      // Add a flag to prevent repeated calls
      !logsProcessedForToday
    ) {
      setLogsProcessedForToday(true);
      AttendanceService.markMissingEmployeesAsAbsent(logs).then(
        (absentLogs) => {
          if (absentLogs.length > 0) {
            // Use the deduplication logic here
            setLogs((prevLogs) => {
              const uniqueLogsMap = new Map();

              prevLogs.forEach((log) => {
                const key = `${log.EmployeeID}_${log.Date}`;
                uniqueLogsMap.set(key, log);
              });

              absentLogs.forEach((log) => {
                const key = `${log.EmployeeID}_${log.Date}`;
                if (!uniqueLogsMap.has(key)) {
                  uniqueLogsMap.set(key, log);
                }
              });

              return Array.from(uniqueLogsMap.values());
            });
          }
        }
      );
    }
  }, [selectedDate, logs.length]);

  useEffect(() => {
    const cleanup = scheduleAttendanceCheck();
    return cleanup;
  }, []);

  // Get filtered logs
  const filteredLogs = getFilteredLogs();
  // Create a debounced version of loadLogs
  const debouncedLoadLogs = useCallback(
    debounce(() => {
      loadLogs();
    }, 300),
    [loadLogs]
  );
  // Loading state
  if (isLoading && logs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-black text-2xl">
              Loading attendance logs...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[85rem] mx-auto">
      {/* Employee-specific date range filter */}
      <EmployeeDateRangeFilter
        onDataChange={handleEmployeeDataChange}
        onModeChange={handleEmployeeModeChange}
        isEmployeeSpecificMode={employeeSpecificMode}
        currentEmployeeId={currentEmployeeId}
        employeeDataDateRange={employeeDataDateRange}
        logs={logs} // Pass the logs to the component
      />
      {/* Header with date range and export */}
      <AttendanceHeader
        selectedRange={selectedRange}
        setSelectedRange={setSelectedRange}
        dateRanges={dateRanges}
        handleExport={handleExport}
        isExporting={isExporting}
      />

      {/* Search and filters */}
      <AttendanceFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedPosition={selectedPosition}
        setSelectedPosition={setSelectedPosition}
        positions={positions}
      />
      {/* Table displaying attendance logs */}
      <AttendanceTable
        logs={filteredLogs}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        handleStatusUpdate={handleStatusUpdate}
        loadMoreLogs={loadMoreLogs}
        hasLogs={logs.length > 0}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AttendanceLogs;
