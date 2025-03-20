import { databases } from "../../Appwrite/appwriteService";
import conf from "../../conf/conf";
import { Query } from "appwrite";
import { format, subMonths } from "date-fns";
import showError from "../Notifications/Error";

const PAGE_SIZE = 50; // Number of logs per request

// Universal attendance rules Original
// const UNIVERSAL_RULES = {
//   GRACE_PERIOD: 15, // minutes
//   MIN_HOURS: {
//     FULL_DAY: 8,
//     HALF_DAY: 4
//   },
//   OVERTIME_THRESHOLD: 8.25, // hours (8 hours + 10:15 minutes)
//   WEEKEND_MINIMUM: 1, // minimum hours for weekend overtime
//   CHECKOUT_BUFFER: 30, // minutes before shift end
//   MAX_HOURS_BETWEEN_SCANS: 16 // maximum hours between check-in and check-out
// };


// TESTING PURPOSES ONLY
const UNIVERSAL_RULES = {
  GRACE_PERIOD: 0.1, // minutes
  MIN_HOURS: {
    FULL_DAY: 0.0001, // Reduced to 6 minutes for testing
    HALF_DAY: 0.00005, // Reduced to 3 minutes for testing
  },
  OVERTIME_THRESHOLD: 0.02, // hours (8 hours + 10:15 minutes)
  WEEKEND_MINIMUM: 0.0016, // 1 minute for testing
  CHECKOUT_BUFFER: 0.1, // minutes before shift end
  MAX_HOURS_BETWEEN_SCANS: 24, // Extended for testing
};

// Enhanced shift configurations with universal rules
// Original shift configurations (preserved for reference)
// const SHIFT_CONFIGS = {
//   MORNING: {
//     name: 'Morning Shift',
//     timings: {
//       start: '09:00',
//       end: '17:00',
//       validCheckIn: { start: '08:30', end: '13:00' },
//       validCheckOut: { start: '16:30', end: '18:00' }
//     },
//     breaks: [
//       { start: '13:00', end: '14:00', type: 'lunch' },
//       { start: '11:00', end: '11:15', type: 'tea' }
//     ],
//     nextDayCheckout: false
//   },
//   DAY: {
//     name: 'Day Shift',
//     timings: {
//       start: '13:00',
//       end: '21:00',
//       validCheckIn: { start: '12:30', end: '17:00' },
//       validCheckOut: { start: '20:30', end: '22:00' }
//     },
//     breaks: [
//       { start: '16:00', end: '17:00', type: 'lunch' },
//       { start: '19:00', end: '19:15', type: 'tea' }
//     ],
//     nextDayCheckout: false
//   },
//   NIGHT: {
//     name: 'Night Shift',
//     timings: {
//       start: '21:00',
//       end: '05:00',
//       validCheckIn: { start: '20:30', end: '00:00' },
//       validCheckOut: { start: '04:30', end: '06:00' }
//     },
//     breaks: [
//       { start: '01:00', end: '02:00', type: 'dinner' },
//       { start: '23:00', end: '23:15', type: 'tea' }
//     ],
//     nextDayCheckout: true
//   }
// };

// ===== TESTING CONFIGURATION (Wider time windows) =====
const SHIFT_CONFIGS = {
  MORNING: {
    name: "Morning Shift",
    timings: {
      start: "09:00",
      end: "17:00",
      validCheckIn: { start: "00:00", end: "23:59" }, // All day check-in
      validCheckOut: { start: "00:00", end: "23:59" }, // All day check-out
    },
    breaks: [
      { start: "13:00", end: "14:00", type: "lunch" },
      { start: "11:00", end: "11:15", type: "tea" },
    ],
    nextDayCheckout: false,
  },
  DAY: {
    name: "Day Shift",
    timings: {
      start: "13:00",
      end: "21:00",
      validCheckIn: { start: "00:00", end: "23:59" }, // All day check-in
      validCheckOut: { start: "00:00", end: "23:59" }, // All day check-out
    },
    breaks: [
      { start: "16:00", end: "17:00", type: "lunch" },
      { start: "19:00", end: "19:15", type: "tea" },
    ],
    nextDayCheckout: false,
  },
  NIGHT: {
    name: "Night Shift",
    timings: {
      start: "21:00",
      end: "05:00",
      validCheckIn: { start: "00:00", end: "23:59" }, // All day check-in
      validCheckOut: { start: "00:00", end: "23:59" }, // All day check-out
    },
    breaks: [
      { start: "01:00", end: "02:00", type: "dinner" },
      { start: "23:00", end: "23:15", type: "tea" },
    ],
    nextDayCheckout: true,
  },
};

// Enhanced time utilities
const TimeUtils = {
  toMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  },

  fromMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  },

  isTimeBetween(time, start, end, isOvernight) {
    const timeMin = this.toMinutes(time);
    const startMin = this.toMinutes(start);
    const endMin = this.toMinutes(end);

    if (isOvernight) {
      if (endMin < startMin) {
        return timeMin >= startMin || timeMin <= endMin;
      }
    }
    return timeMin >= startMin && timeMin <= endMin;
  },

  calculateDuration(startTime, endTime, isOvernight) {
    let startMin = this.toMinutes(startTime);
    let endMin = this.toMinutes(endTime);

    if (isOvernight && endMin < startMin) {
      endMin += 24 * 60; // Add 24 hours
    }

    return endMin - startMin;
  },
};

// Enhanced attendance validation
const validateAttendance = async (scanTime, employee, existingScans = []) => {
  const shift = SHIFT_CONFIGS[employee.Shift || "MORNING"];
  const today = format(new Date(), "yyyy-MM-dd");

  // First check if it's a weekend
  const isWeekend = isNonWorkingDay(today);

  // Check for duplicate records and clean them up
  if (existingScans.length > 1) {
    // Delete duplicate records, keeping only the oldest one
    const [oldest, ...duplicates] = existingScans.sort(
      (a, b) => new Date(a.$createdAt) - new Date(b.$createdAt)
    );

    await Promise.all(
      duplicates.map((duplicate) =>
        databases.deleteDocument(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          duplicate.$id
        )
      )
    );

    existingScans = [oldest];
  }

  const currentRecord = existingScans[0];

  // Don't allow multiple check-outs
  if (
    currentRecord?.OutTime &&
    currentRecord.OutTime !== "0.00" &&
    currentRecord.InTime !== "0.00"
  ) {
    throw new Error("Employee has already checked out today");
  }

  // Skip time validations for weekends
  if (isWeekend) {
    return true;
  }

  // Validate check-in/out times for weekdays
  if (!currentRecord || currentRecord.InTime === "0.00") {
    // Validate check-in time
    const isValidCheckIn = TimeUtils.isTimeBetween(
      scanTime,
      shift.timings.validCheckIn.start,
      shift.timings.validCheckIn.end,
      shift.nextDayCheckout
    );

    if (!isValidCheckIn) {
      throw new Error(
        `Invalid check-in time for ${shift.name}. Valid time: ${shift.timings.validCheckIn.start} - ${shift.timings.validCheckIn.end}`
      );
    }
  } else {
    // Validate check-out time
    const isValidCheckOut = TimeUtils.isTimeBetween(
      scanTime,
      shift.timings.validCheckOut.start,
      shift.timings.validCheckOut.end,
      shift.nextDayCheckout
    );

    if (!isValidCheckOut) {
      throw new Error(
        `Invalid check-out time for ${shift.name}. Valid time: ${shift.timings.validCheckOut.start} - ${shift.timings.validCheckOut.end}`
      );
    }
  }

  return true;
};

// Enhanced processAttendanceScan
const processAttendanceScan = async (employeeId, scanTime) => {
  try {
    const employee = await cache.getEmployee(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const isWeekend = isNonWorkingDay(today);

    // Get existing scans
    const todayScans = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      [Query.equal("EmployeeID", employeeId), Query.equal("Date", today)]
    );

    const existingScans = todayScans.documents;

    // Validate attendance (includes duplicate cleanup)
    await validateAttendance(scanTime, employee, existingScans);

    if (existingScans.length > 0) {
      const currentRecord = existingScans[0];

      // If InTime is 0.00, this is first scan
      if (currentRecord.InTime === "0.00") {
        const updatedRecord = {
          InTime: scanTime,
          Status: isWeekend ? "WEEKEND" : "PRESENT",
        };

        const result = await databases.updateDocument(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          currentRecord.$id,
          updatedRecord
        );

        return result;
      }

      // Calculate total hours worked
      const totalHours =
        TimeUtils.calculateDuration(
          currentRecord.InTime,
          scanTime,
          SHIFT_CONFIGS[employee.Shift]?.nextDayCheckout || false
        ) / 60; // Convert minutes to hours

      // Determine status based on hours worked
      let status;

      if (isWeekend) {
        // Weekend status determination
        status =
          totalHours >= UNIVERSAL_RULES.WEEKEND_MINIMUM
            ? "WEEKEND_OT"
            : "WEEKEND";
      } else {
        // Weekday status determination
        if (totalHours >= UNIVERSAL_RULES.OVERTIME_THRESHOLD) {
          status = "OVERTIME";
        } else if (totalHours >= UNIVERSAL_RULES.MIN_HOURS.FULL_DAY) {
          status = "PRESENT";
        } else if (totalHours >= UNIVERSAL_RULES.MIN_HOURS.HALF_DAY) {
          status = "HALF_DAY";
        } else {
          status = "ABSENT";
        }
      }

      const updatedRecord = {
        OutTime: scanTime,
        TotalTime: parseFloat(totalHours.toFixed(2)),
        Status: status,
      };

      const result = await databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        currentRecord.$id,
        updatedRecord
      );

      return result;
    } else {
      // Create new attendance record
      const newRecord = {
        EmployeeID: employee.EmployeeID,
        FullName: employee.FullName || "",
        Position: employee.Position || "",
        Department: employee.Department || "",
        Supervisor: employee.Supervisor || "",
        Shift: employee.Shift || "MORNING",
        Date: today,
        Status: isWeekend ? "WEEKEND" : "PRESENT",
        InTime: scanTime,
        OutTime: "0.00",
        TotalTime: 0,
      };

      const result = await databases.createDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        "unique()",
        newRecord
      );

      return result;
    }
  } catch (error) {
    console.error("Error in processAttendanceScan:", error);
    showError(error.message);
    throw error;
  }
};

// Enhanced cache implementation with more features
const cache = {
  employees: null,
  employeesByID: new Map(),
  attendanceLogs: new Map(),
  lastFetch: null,
  CACHE_DURATION: 1 * 60 * 1000, // Reduced to 1 minute for testing

  async getLogs(date, startDate, endDate, offset = 0) {
    const cacheKey = `${date || "all"}_${startDate || "none"}_${
      endDate || "none"
    }_${offset}`;
    const now = Date.now();

    // Check cache first
    if (this.attendanceLogs.has(cacheKey)) {
      const cached = this.attendanceLogs.get(cacheKey);
      if (now - cached.timestamp < this.CACHE_DURATION) {
        console.log("🔵 Using cached data for:", cacheKey);
        return cached.data;
      }
      console.log("🔄 Cache expired for:", cacheKey);
    }

    // Fetch new data from Appwrite
    console.log("📡 Fetching fresh data from Appwrite for:", cacheKey);
    const logs = await fetchAttendanceLogsRaw(date, startDate, endDate, offset);
    console.log(`✅ Fetched ${logs.length} records from Appwrite`);

    // Cache the result
    this.attendanceLogs.set(cacheKey, {
      data: logs,
      timestamp: now,
    });

    return logs;
  },

  clearCache(type = "all") {
    console.log("🧹 Clearing cache:", type);
    if (type === "all" || type === "employees") {
      this.employees = null;
      this.employeesByID.clear();
    }
    if (type === "all" || type === "logs") {
      this.attendanceLogs.clear();
    }
  },

  invalidateDate(date) {
    console.log("🔄 Invalidating cache for date:", date);
    for (const [key] of this.attendanceLogs) {
      if (key.includes(date)) {
        this.attendanceLogs.delete(key);
      }
    }
  },

  async getEmployees() {
    const now = Date.now();
    if (!this.employees || now - this.lastFetch > this.CACHE_DURATION) {
      try {
        const response = await databases.listDocuments(
          conf.appwriteDatabaseId,
          conf.appwriteEmployeeCollectionId
        );

        if (!response || !response.documents) {
          console.error("Invalid employee response:", response);
          return [];
        }

        this.employees = response.documents;

        // Update the employee map
        this.employeesByID = new Map(
          this.employees.map((emp) => [emp.$id, emp])
        );
        this.lastFetch = now;
      } catch (error) {
        console.error("Error fetching employees:", error);
        showError("Error fetching employees cache");
        if (!this.employees) this.employees = [];
      }
    }
    return this.employees;
  },

  async getEmployee(employeeId) {
    if (this.employeesByID.has(employeeId)) {
      return this.employeesByID.get(employeeId);
    }

    // Refresh cache if employee not found
    await this.getEmployees();
    return this.employeesByID.get(employeeId);
  },
};

// Raw fetch function - lower level implementation
const fetchAttendanceLogsRaw = async (
  date = null,
  startDate = null,
  endDate = null,
  offset = 0
) => {
  try {
    console.log("📝 Fetching logs with params:", {
      date,
      startDate,
      endDate,
      offset,
    });

    const queries = [
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
      Query.orderAsc("EmployeeID"),
    ];

    if (date) {
      queries.push(Query.equal("Date", date));
    } else if (startDate && endDate) {
      queries.push(Query.between("Date", startDate, endDate));
    }

    let allDocuments = [];
    let currentOffset = offset;
    let hasMore = true;

    while (hasMore) {
      console.log(`📥 Fetching batch at offset ${currentOffset}...`);

      // Update offset in queries
      queries[1] = Query.offset(currentOffset);

      const response = await databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        queries
      );

      if (!response.documents || response.documents.length === 0) {
        console.log("📭 No more documents found");
        hasMore = false;
        break;
      }

      allDocuments = [...allDocuments, ...response.documents];
      console.log(
        `📦 Batch received: ${response.documents.length} documents (Total: ${allDocuments.length})`
      );

      // Check if we received less than PAGE_SIZE documents
      if (response.documents.length < PAGE_SIZE) {
        console.log("📬 Last batch received (less than PAGE_SIZE)");
        hasMore = false;
      } else {
        currentOffset += PAGE_SIZE;
        console.log(`⏭️ Moving to next batch at offset ${currentOffset}`);
      }
    }

    if (allDocuments.length === 0) {
      console.log("❌ No documents found in any batch");
      return [];
    }

    // Log the actual employee IDs we got
    const employeeIds = [
      ...new Set(allDocuments.map((doc) => doc.EmployeeID)),
    ].sort();
    console.log("📋 Found records for employees:", employeeIds);

    console.log(`✅ Found total ${allDocuments.length} documents`);
    return allDocuments;
  } catch (error) {
    console.error("❌ Error in fetchAttendanceLogsRaw:", error);
    showError("Error fetching attendance logs!");
    return [];
  }
};

// Enhanced fetchAttendanceLogs with caching and status updates
const fetchAttendanceLogs = async (
  date = format(new Date(), "yyyy-MM-dd"), // Default to today's date if none provided
  startDate = null,
  endDate = null,
  offset = 0
) => {
  try {
    console.log("🔍 Fetching attendance logs:", { date, startDate, endDate });

    // Clear cache before fetching to ensure fresh data
    cache.clearCache("logs");

    // Get logs from Appwrite
    const logs = await cache.getLogs(date, startDate, endDate, offset);

    // Only process today's logs for real-time updates
    const today = format(new Date(), "yyyy-MM-dd");
    if (
      date === today ||
      (!date &&
        (!startDate || startDate <= today) &&
        (!endDate || endDate >= today))
    ) {
      const todayLogs = logs.filter((log) => log.Date === today);
      if (todayLogs.length > 0) {
        throttledUpdateAllStatuses();
      }
    }

    // Ensure all required fields are present
    const processedLogs = logs.map((log) => ({
      ...log,
      EmployeeID: log.EmployeeID || "",
      Date: log.Date || "",
      InTime: log.InTime || "0.00",
      OutTime: log.OutTime || "0.00",
      TotalTime: log.TotalTime || 0,
      Status: log.Status || "ABSENT",
    }));

    console.log(`✨ Returning ${processedLogs.length} processed logs`);
    return processedLogs;
  } catch (error) {
    console.error("❌ Error in fetchAttendanceLogs:", error);
    return [];
  }
};

// Optimized markMissingEmployeesAsAbsent with batching
const markMissingEmployeesAsAbsent = async (currentLogs, date = format(new Date(), "yyyy-MM-dd")) => {
  try {
    console.log(`🔍 Marking missing employees as absent for ${date}`);
    
    // Get all employees
    const employees = await cache.getEmployees();
    if (!employees || !Array.isArray(employees)) {
      console.log("❌ No employees found to mark as absent");
      return [];
    }

    // Create a map of current logs by employee ID
    const currentLogsMap = new Map();
    if (currentLogs && currentLogs.length > 0) {
      currentLogs.forEach((log) => {
        if (log.Date === date) {
          currentLogsMap.set(log.EmployeeID, log);
        }
      });
    }

    // Get the current time
    const currentTime = format(new Date(), "HH:mm");
    console.log(`⏱️ Current time: ${currentTime}`);
    
    // Collect employees who need status updates
    const updates = [];
    const newAbsentLogs = [];

    for (const employee of employees) {
      const employeeLog = currentLogsMap.get(employee.EmployeeID);
      
      // Skip employees who already have a non-PENDING status
      if (employeeLog && employeeLog.Status !== "PENDING") {
        continue;
      }
      
      const shift = SHIFT_CONFIGS[employee.Shift || "MORNING"];
      
      // Only mark as absent if we're past the grace period for their shift
      const shiftStartMinutes = TimeUtils.toMinutes(shift.timings.start);
      const currentMinutes = TimeUtils.toMinutes(currentTime);
      const graceEndMinutes = shiftStartMinutes + UNIVERSAL_RULES.GRACE_PERIOD;
      
      console.log(`👤 Employee ${employee.FullName}: shift start=${shift.timings.start}, grace end=${TimeUtils.fromMinutes(graceEndMinutes)}`);
      
      if (currentMinutes > graceEndMinutes) {
        console.log(`⏰ Past grace period for ${employee.FullName}, marking as ABSENT`);
        
        updates.push({
          employeeId: employee.EmployeeID,
          date: date,
          newStatus: "ABSENT",
        });
        
        // If employee doesn't have a log yet, create one
        if (!employeeLog) {
          newAbsentLogs.push({
            EmployeeID: employee.EmployeeID,
            FullName: employee.FullName || "",
            Position: employee.Position || "",
            Department: employee.Department || "",
            Supervisor: employee.Supervisor || "",
            Shift: employee.Shift || "MORNING",
            Date: date,
            InTime: "0.00",
            OutTime: "0.00",
            TotalTime: 0,
            Status: "ABSENT",
          });
        }
      } else {
        console.log(`⏰ Still within grace period for ${employee.FullName}, keeping as PENDING`);
      }
    }

    // Apply batch updates if there are any
    if (updates.length > 0) {
      console.log(`🔄 Marking ${updates.length} employees as absent`);
      await batchUpdateStatuses(updates);
    } else {
      console.log("✅ No employees to mark as absent");
    }

    return newAbsentLogs;
  } catch (error) {
    console.error("❌ Error marking missing employees as absent:", error);
    showError("Failed to mark missing employees as absent");
    return [];
  }
};

// Batch update multiple employee statuses
const batchUpdateStatuses = async (updates) => {
  if (!updates || updates.length === 0) return [];

  const results = [];
  const affectedDates = new Set();

  for (const update of updates) {
    const result = await updateEmployeeStatus(
      update.employeeId,
      update.date,
      update.newStatus,
      true // batch mode = true
    );
    results.push(result);
    affectedDates.add(update.date);
  }

  // Invalidate cache for all affected dates at once
  affectedDates.forEach((date) => cache.invalidateDate(date));

  return results;
};

// Optimized update employee status with batch processing capability
const updateEmployeeStatus = async (
  employeeId,
  date,
  newStatus,
  batchMode = false
) => {
  try {
    // Find existing log in database
    const existingLogsResponse = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      [Query.equal("EmployeeID", employeeId), Query.equal("Date", date)]
    );

    if (existingLogsResponse.documents.length > 0) {
      // Update the existing record
      const existingLog = existingLogsResponse.documents[0];
      const result = await databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        existingLog.$id,
        { Status: newStatus }
      );

      // Invalidate cache for this date
      if (!batchMode) cache.invalidateDate(date);

      return result;
    } else {
      // Get employee from cache
      const employee = await cache.getEmployee(employeeId);

      if (!employee) {
        showError("Employee not found!");
        return null;
      }

      // Create new log
      const newLogData = {
        EmployeeID: employee.EmployeeID,
        FullName: employee.FullName || "",
        Position: employee.Position || "",
        Department: employee.Department || "",
        Shift: employee.Shift || "MORNING",
        Date: date,
        Status: newStatus,
        InTime: "0.00",
        OutTime: "0.00",
        TotalTime: 0,
      };

      const result = await databases.createDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        "unique()",
        newLogData
      );

      // Invalidate cache for this date
      if (!batchMode) cache.invalidateDate(date);

      return result;
    }
  } catch (error) {
    showError("Failed to update status!");
    return null;
  }
};

// Fill missing dates for complete reporting
const fillMissingDates = (logs, startDate, endDate) => {
  const allDates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    allDates.push(format(currentDate, "yyyy-MM-dd"));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Get a unique list of employees from logs
  const employeeIDs = [...new Set(logs.map((log) => log.EmployeeID))];

  // Convert logs to a map for faster lookup (key = date + employee ID)
  const logMap = new Map(
    logs.map((log) => [`${log.Date}_${log.EmployeeID}`, log])
  );

  // Generate a complete log ensuring every employee has an entry for every date
  const completeLogs = [];
  allDates.forEach((date) => {
    employeeIDs.forEach((empID) => {
      completeLogs.push(
        logMap.get(`${date}_${empID}`) || {
          Date: date,
          Status: "Absent",
          EmployeeID: empID,
        }
      );
    });
  });

  return completeLogs;
};

// Export logs to CSV
const exportLogsToCSV = (logs, startDate, endDate, employeeId = null) => {
  if (!logs.length) {
    return false;
  }

  // Filter logs by employee ID if provided
  const logsToExport = employeeId
    ? logs.filter((log) => log.EmployeeID === employeeId)
    : logs;

  if (logsToExport.length === 0) {
    return false;
  }

  // Define the headers in the exact order you want them to appear
  const headerOrder = [
    "EmployeeID",
    "FullName",
    "Position",
    "Department",
    "Date",
    "InTime",
    "OutTime",
    "TotalTime",
    "Status",
  ];

  // Create the CSV header row using the defined order
  const headerRow = headerOrder.join(",");

  // Map each log to a CSV row with values in the same order as headers
  const csvData = logsToExport.map((log) => {
    return headerOrder
      .map((header) => {
        const value = log[header] || "";
        // Ensure values with commas are properly quoted
        return value.toString().includes(",") ? `"${value}"` : value;
      })
      .join(",");
  });

  // Combine header and data rows
  const csvContent = [headerRow, ...csvData].join("\n");

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  // Create custom filename based on whether it's for a specific employee
  const filename = employeeId
    ? `employee_${employeeId}_${startDate}_to_${endDate}.csv`
    : `attendance_logs_${startDate}_to_${endDate}.csv`;

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return true;
};

// Helper function to check if a date is a weekend
const isNonWorkingDay = (dateString) => {
  // Parse date in local timezone to avoid UTC conversion issues
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-based in Date constructor
  const dayOfWeek = date.getDay();

  // Check if it's weekend (Saturday = 6, Sunday = 0)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return isWeekend;
};

// Improved attendance status determination
const determineAttendanceStatus = (
  inTime,
  outTime,
  totalTime,
  employeeShift,
  dateString
) => {
  // Check cache first
  const cachedResult = cache.getStatus(
    inTime,
    outTime,
    totalTime,
    employeeShift,
    dateString
  );
  if (cachedResult) return cachedResult;

  const isWeekend = isNonWorkingDay(dateString);
  const shift = SHIFT_CONFIGS[employeeShift];

  if (!shift) {
    return {
      status: "Invalid",
      type: "ERROR",
      remarks: "Invalid shift configuration",
    };
  }

  // No check-in recorded
  if (!inTime || inTime === "0.00") {
    return {
      status: isWeekend ? "Weekend" : "Absent",
      type: isWeekend ? "WEEKEND" : "ABSENT",
      remarks: "No check-in recorded",
      workedHours: 0,
      overtimeHours: 0,
    };
  }

  // Calculate actual worked hours considering breaks
  const workedHours = calculateWorkedHours(
    inTime,
    outTime || format(new Date(), "HH:mm"),
    shift
  );
  let overtimeHours = 0;
  let status = "Present";
  let type = "PRESENT";
  let remarks = [];

  if (isWeekend) {
    status = "Weekend";
    type = "WEEKEND";
    overtimeHours = workedHours; // All hours on weekend count as overtime
    if (overtimeHours > 0) {
      remarks.push(`Weekend hours: ${overtimeHours.toFixed(2)}`);
    }
  } else {
    // Regular weekday
    if (workedHours > UNIVERSAL_RULES.OVERTIME_THRESHOLD) {
      // Calculate overtime from regular hours (8 hours), not threshold
      overtimeHours = workedHours - UNIVERSAL_RULES.MIN_HOURS.FULL_DAY;
      type = "OVERTIME";
      remarks.push(`Overtime: ${overtimeHours.toFixed(2)} hours`);
    }

    // Handle half day and absent cases
    if (workedHours < UNIVERSAL_RULES.MIN_HOURS.HALF_DAY) {
      status = "Absent";
      type = "ABSENT";
      remarks = ["Insufficient hours worked"];
      overtimeHours = 0;
    } else if (workedHours < UNIVERSAL_RULES.MIN_HOURS.FULL_DAY) {
      status = "Half Day";
      type = "HALF_DAY";
      remarks = ["Less than full day hours"];
      overtimeHours = 0;
    }
  }

  const result = {
    status,
    type,
    remarks: remarks.join(", ") || "Regular attendance",
    workedHours: parseFloat(workedHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
  };

  // Cache the result
  cache.cacheStatus(
    inTime,
    outTime,
    totalTime,
    employeeShift,
    dateString,
    result
  );
  return result;
};

// Helper function to calculate worked hours considering breaks
const calculateWorkedHours = (inTime, outTime, shift) => {
  if (!outTime) return 0;

  const inMinutes = timeToMinutes(inTime);
  const outMinutes = timeToMinutes(outTime);
  let totalMinutes = 0;

  if (shift.nextDayCheckout && outMinutes < inMinutes) {
    totalMinutes = 24 * 60 - inMinutes + outMinutes;
  } else {
    totalMinutes = outMinutes - inMinutes;
  }

  // No longer deducting break times as per requirement
  return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
};

// Helper function to convert time to minutes
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper function to check if time1 is before time2
const isTimeBefore = (time1, time2, isOvernight = false) => {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);

  if (isOvernight) {
    if (minutes1 < 12 * 60) {
      // If time1 is in next day (AM)
      return minutes1 < minutes2 && minutes2 > 12 * 60;
    }
    return minutes1 < minutes2;
  }

  return minutes1 < minutes2;
};

// Helper function to check if time1 is after time2
const isTimeAfter = (time1, time2, isOvernight = false) => {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);

  if (isOvernight) {
    if (minutes1 < 12 * 60) {
      // If time1 is in next day (AM)
      return minutes1 > minutes2 || minutes2 < 12 * 60;
    }
    return minutes1 > minutes2;
  }

  return minutes1 > minutes2;
};

// Add this utility function to AttendanceService
const diagnoseScanIssue = (employeeId) => {
  return new Promise(async (resolve) => {
    try {
      const employee = await cache.getEmployee(employeeId);
      if (!employee) {
        resolve({ success: false, message: "Employee not found" });
        return;
      }

      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const yesterday = format(subMonths(now, 0), "yyyy-MM-dd");

      const [todayRecords, yesterdayRecords] = await Promise.all([
        databases.listDocuments(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          [
            Query.equal("EmployeeID", employeeId),
            Query.equal("Date", today),
            Query.orderDesc("$updatedAt"),
          ]
        ),
        databases.listDocuments(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          [
            Query.equal("EmployeeID", employeeId),
            Query.equal("Date", yesterday),
            Query.orderDesc("$updatedAt"),
          ]
        ),
      ]);

      resolve({
        success: true,
        employee,
        todayRecords: todayRecords.documents,
        yesterdayRecords: yesterdayRecords.documents,
        currentHour: now.getHours(),
        currentMinute: now.getMinutes(),
      });
    } catch (error) {
      resolve({ success: false, message: error.message });
    }
  });
};

// Update all statuses
const updateAllStatuses = async () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const isWeekend = isNonWorkingDay(today);

  try {
    const logs = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      [Query.equal("Date", today)]
    );

    if (isWeekend) {
      // Update all records to WEEKEND status
      await Promise.all(
        logs.documents.map((log) =>
          databases.updateDocument(
            conf.appwriteDatabaseId,
            conf.appwriteAttendanceLogsCollectionId,
            log.$id,
            { Status: "WEEKEND" }
          )
        )
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating statuses:", error);
    return { success: false, error: error.message };
  }
};

// Improved throttling with debounce functionality
const createThrottle = (fn, delay, options = {}) => {
  let lastCall = 0;
  let timeoutId = null;
  const { leading = true, trailing = true } = options;

  return function (...args) {
    const now = Date.now();
    const context = this;
    const elapsed = now - lastCall;

    const exec = () => {
      lastCall = now;
      fn.apply(context, args);
    };

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (elapsed > delay) {
      if (leading) {
        exec();
      } else if (trailing) {
        timeoutId = setTimeout(exec, delay);
      }
    } else if (trailing) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(context, args);
      }, delay - elapsed);
    }
  };
};

// Create throttled versions with different options
const throttledUpdateAllStatuses = createThrottle(updateAllStatuses, 10000);

// Add utility for batch operations with debounce
const debounce = (fn, delay) => {
  let timeoutId;
  let pendingArgs = [];

  return function (...args) {
    pendingArgs.push(...args);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      const uniqueArgs = [...new Set(pendingArgs)];
      pendingArgs = [];
      fn.apply(this, [uniqueArgs]);
    }, delay);
  };
};

// Add at the top with other constants
const isDevelopment = process.env.NODE_ENV === "development";
let isTestMode = isDevelopment;

// Add these functions before the AttendanceService export
const enableTestMode = () => {
  isTestMode = true;
  console.log("⚠️ Attendance Test Mode Enabled - Time restrictions bypassed");
};

const disableTestMode = () => {
  isTestMode = false;
  console.log(
    "✅ Attendance Test Mode Disabled - Normal time restrictions active"
  );
};

// Add this function to create default attendance records for all employees
const createDefaultAttendanceRecords = async (date = format(new Date(), "yyyy-MM-dd")) => {
  try {
    console.log(`🔄 Creating default attendance records for ${date}`);
    
    // Get all employees
    const employees = await cache.getEmployees();
    if (!employees || employees.length === 0) {
      console.log("❌ No employees found to create default records");
      return [];
    }
    
    // Check for existing records for today
    const existingRecords = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      [Query.equal("Date", date)]
    );
    
    // Create a map of existing records by employee ID
    const existingRecordsMap = new Map();
    existingRecords.documents.forEach(record => {
      existingRecordsMap.set(record.EmployeeID, record);
    });
    
    // Create default records for employees who don't have one yet
    const newRecords = [];
    const createPromises = [];
    
    for (const employee of employees) {
      if (!existingRecordsMap.has(employee.EmployeeID)) {
        const newRecord = {
          EmployeeID: employee.EmployeeID,
          FullName: employee.FullName || "",
          Position: employee.Position || "",
          Department: employee.Department || "",
          Supervisor: employee.Supervisor || "",
          Shift: employee.Shift || "MORNING",
          Date: date,
          Status: "PENDING",
          InTime: "0.00",
          OutTime: "0.00",
          TotalTime: 0,
        };
        
        newRecords.push(newRecord);
        
        // Create the record in the database
        createPromises.push(
          databases.createDocument(
            conf.appwriteDatabaseId,
            conf.appwriteAttendanceLogsCollectionId,
            "unique()",
            newRecord
          )
        );
      }
    }
    
    // Wait for all records to be created
    if (createPromises.length > 0) {
      await Promise.allSettled(createPromises);
      console.log(`✅ Created ${createPromises.length} default attendance records`);
    } else {
      console.log("ℹ️ All employees already have attendance records for today");
    }
    
    return newRecords;
  } catch (error) {
    console.error("❌ Error creating default attendance records:", error);
    showError("Failed to create default attendance records");
    return [];
  }
};

// Export object with optimized functions
const AttendanceService = {
  fetchAttendanceLogs,

  fetchEmployees: cache.getEmployees,
  updateEmployeeStatus,
  batchUpdateStatuses,
  fillMissingDates, // Original implementation
  exportLogsToCSV, // Original implementation
  SHIFT_CONFIGS, // New constants
  PAGE_SIZE,
  determineAttendanceStatus,
  processAttendanceScan,
  markMissingEmployeesAsAbsent,
  updateAllStatuses,
  throttledUpdateAllStatuses,
  isNonWorkingDay, // New implementation
  cache,

  // New utility functions
  debounce,
  createThrottle,
  diagnoseScanIssue,
  createDefaultAttendanceRecords, // Add the new function to the exported object
  enableTestMode,
  disableTestMode,

  // Clear cache and invalidate dates
  clearCache: (type) => cache.clearCache(type),
  invalidateDate: (date) => cache.invalidateDate(date),
};

export default AttendanceService;
