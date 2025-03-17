import { databases } from "../../Appwrite/appwriteService";
import conf from "../../conf/conf";
import { Query } from "appwrite";
import { format, subMonths } from "date-fns";
import showError from "../Notifications/Error";

const PAGE_SIZE = 30; // Number of logs per request

// Universal attendance rules
const UNIVERSAL_RULES = {
  GRACE_PERIOD: 15, // minutes
  MIN_HOURS: {
    FULL_DAY: 8,
    HALF_DAY: 4
  },
  OVERTIME_THRESHOLD: 8.25, // hours (8 hours + 10:15 minutes)
  WEEKEND_MINIMUM: 1, // minimum hours for weekend overtime
  CHECKOUT_BUFFER: 30, // minutes before shift end
  MAX_HOURS_BETWEEN_SCANS: 16 // maximum hours between check-in and check-out
};

// Enhanced shift configurations with universal rules
const SHIFT_CONFIGS = {
  MORNING: {
    name: 'Morning Shift',
    timings: {
      start: '09:00',
      end: '17:00',
      validCheckIn: { start: '08:30', end: '13:00' },
      validCheckOut: { start: '16:30', end: '18:00' }
    },
    breaks: [
      { start: '13:00', end: '14:00', type: 'lunch' },
      { start: '11:00', end: '11:15', type: 'tea' }
    ],
    nextDayCheckout: false
  },
  DAY: {
    name: 'Day Shift',
    timings: {
      start: '13:00',
      end: '21:00',
      validCheckIn: { start: '12:30', end: '17:00' },
      validCheckOut: { start: '20:30', end: '22:00' }
    },
    breaks: [
      { start: '16:00', end: '17:00', type: 'lunch' },
      { start: '19:00', end: '19:15', type: 'tea' }
    ],
    nextDayCheckout: false
  },
  NIGHT: {
    name: 'Night Shift',
    timings: {
      start: '21:00',
      end: '05:00',
      validCheckIn: { start: '20:30', end: '00:00' },
      validCheckOut: { start: '04:30', end: '06:00' }
    },
    breaks: [
      { start: '01:00', end: '02:00', type: 'dinner' },
      { start: '23:00', end: '23:15', type: 'tea' }
    ],
    nextDayCheckout: true
  }
};

// Enhanced time utilities
const TimeUtils = {
  toMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },

  fromMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
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
  }
};

// Enhanced attendance validation
const validateAttendance = async (scanTime, employee, existingScans = []) => {
  const shift = SHIFT_CONFIGS[employee.Shift || 'MORNING'];
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // First check if it's a weekend
  const isWeekend = isNonWorkingDay(today);

  // Check for duplicate records and clean them up
  if (existingScans.length > 1) {
    // Delete duplicate records, keeping only the oldest one
    const [oldest, ...duplicates] = existingScans.sort((a, b) => 
      new Date(a.$createdAt) - new Date(b.$createdAt)
    );
    
    await Promise.all(duplicates.map(duplicate => 
      databases.deleteDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        duplicate.$id
      )
    ));
    
    existingScans = [oldest];
  }

  const currentRecord = existingScans[0];
  
  // Don't allow multiple check-outs
  if (currentRecord?.OutTime && currentRecord.OutTime !== '0.00' && currentRecord.InTime !== '0.00') {
    throw new Error('Employee has already checked out today');
  }

  // Skip time validations for weekends
  if (isWeekend) {
    return true;
  }

  // Validate check-in/out times for weekdays
  if (!currentRecord || currentRecord.InTime === '0.00') {
    // Validate check-in time
    const isValidCheckIn = TimeUtils.isTimeBetween(
      scanTime,
      shift.timings.validCheckIn.start,
      shift.timings.validCheckIn.end,
      shift.nextDayCheckout
    );

    if (!isValidCheckIn) {
      throw new Error(`Invalid check-in time for ${shift.name}. Valid time: ${shift.timings.validCheckIn.start} - ${shift.timings.validCheckIn.end}`);
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
      throw new Error(`Invalid check-out time for ${shift.name}. Valid time: ${shift.timings.validCheckOut.start} - ${shift.timings.validCheckOut.end}`);
    }
  }

  return true;
};

// Enhanced processAttendanceScan
const processAttendanceScan = async (employeeId, scanTime) => {
  try {
    const employee = await cache.getEmployee(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const isWeekend = isNonWorkingDay(today);

    // Get existing scans
    const todayScans = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      [
        Query.equal('EmployeeID', employeeId),
        Query.equal('Date', today)
      ]
    );

    const existingScans = todayScans.documents;

    // Validate attendance (includes duplicate cleanup)
    await validateAttendance(scanTime, employee, existingScans);

    if (existingScans.length > 0) {
      const currentRecord = existingScans[0];

      // If InTime is 0.00, this is first scan
      if (currentRecord.InTime === '0.00') {
        const updatedRecord = {
          InTime: scanTime,
          Status: isWeekend ? 'WEEKEND' : 'PRESENT'
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
      const totalHours = TimeUtils.calculateDuration(
        currentRecord.InTime, 
        scanTime,
        SHIFT_CONFIGS[employee.Shift]?.nextDayCheckout || false
      ) / 60; // Convert minutes to hours

      // Determine status based on hours worked
      let status;

      if (isWeekend) {
        // Weekend status determination
        status = totalHours >= UNIVERSAL_RULES.WEEKEND_MINIMUM ? 'WEEKEND_OT' : 'WEEKEND';
      } else {
        // Weekday status determination
        if (totalHours >= UNIVERSAL_RULES.OVERTIME_THRESHOLD) {
          status = 'OVERTIME';
        } else if (totalHours >= UNIVERSAL_RULES.MIN_HOURS.FULL_DAY) {
          status = 'PRESENT';
        } else if (totalHours >= UNIVERSAL_RULES.MIN_HOURS.HALF_DAY) {
          status = 'HALF_DAY';
        } else {
          status = 'ABSENT';
        }
      }

      const updatedRecord = {
        OutTime: scanTime,
        TotalTime: parseFloat(totalHours.toFixed(2)),
        Status: status
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
        FullName: employee.FullName || '',
        Position: employee.Position || '',
        Department: employee.Department || '',
        Supervisor: employee.Supervisor || '',
        Shift: employee.Shift || 'MORNING',
        Date: today,
        Status: isWeekend ? 'WEEKEND' : 'PRESENT',
        InTime: scanTime,
        OutTime: '0.00',
        TotalTime: 0
      };

      const result = await databases.createDocument(
        conf.appwriteDatabaseId,
        conf.appwriteAttendanceLogsCollectionId,
        'unique()',
        newRecord
      );

      return result;
    }
  } catch (error) {
    console.error('Error in processAttendanceScan:', error);
    showError(error.message);
    throw error;
  }
};

// Enhanced cache implementation with more features
const cache = {
  employees: null,
  employeesByID: new Map(),
  logs: new Map(), // Cache for attendance logs
  statusResults: new Map(), // Cache for status determination results
  expiryTime: 5 * 60 * 1000, // 5 minutes
  lastFetch: {
    employees: 0,
    logs: new Map(), // Track last fetch time for each date/query
  },

  async getEmployees() {
    const now = Date.now();
    if (!this.employees || now - this.lastFetch.employees > this.expiryTime) {
      try {
        const response = await databases.listDocuments(
          conf.appwriteDatabaseId,
          conf.appwriteEmployeeCollectionId
        );
        
        if (!response || !response.documents) {
          console.error('Invalid employee response:', response);
          return [];
        }

        console.log('Fetched employees:', response.documents.length);
        this.employees = response.documents;
        
        // Update the employee map with all required fields
        this.employeesByID = new Map(
          this.employees.map(emp => {
            // Ensure all required fields are present with proper defaults
            const employee = {
              ...emp,
              EmployeeID: emp.EmployeeID || '',
              FullName: emp.FullName || '',
              Position: emp.Position || '',
              Department: emp.Department || '',
              Supervisor: emp.Supervisor || '',
              Shift: emp.Shift || 'MORNING',
              MobileNo: emp.MobileNo || '',
              Email: emp.Email || '',
              HireDate: emp.HireDate || '',
              Image: emp.Image || '',
              QR: emp.QR || ''
            };
            return [emp.$id, employee];
          })
        );
        this.lastFetch.employees = now;
      } catch (error) {
        console.error("Error fetching employees:", error);
        showError("Error fetching employees cache");
        // Keep old data on error
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

  async getLogs(date, startDate, endDate, offset = 0) {
    const cacheKey = `${date || ""}_${startDate || ""}_${endDate || ""}_${offset}`;
    const now = Date.now();

    // Always invalidate today's cache to ensure fresh data
    const today = format(new Date(), 'yyyy-MM-dd');
    if (date === today || (!date && !startDate && !endDate)) {
      this.invalidateDate(today);
    }

    if (!this.logs.has(cacheKey) || now - (this.lastFetch.logs.get(cacheKey) || 0) > this.expiryTime) {
      const logs = await fetchAttendanceLogsRaw(date, startDate, endDate, offset);
      
      // Ensure all logs have the required fields
      const processedLogs = logs.map(log => ({
        ...log,
        EmployeeID: log.EmployeeID || '',
        FullName: log.FullName || '',
        Position: log.Position || '',
        Department: log.Department || '',
        Shift: log.Shift || 'MORNING',
        Date: log.Date || '',
        InTime: log.InTime || '0.00',
        OutTime: log.OutTime || '0.00',
        TotalTime: log.TotalTime || 0,
        Status: log.Status || 'PENDING'
      }));

      this.logs.set(cacheKey, processedLogs);
      this.lastFetch.logs.set(cacheKey, now);
    }

    return this.logs.get(cacheKey);
  },

  clearCache(type = "all") {
    if (type === "all" || type === "employees") {
      this.employees = null;
      this.employeesByID.clear();
      this.lastFetch.employees = 0;
    }
    if (type === "all" || type === "logs") {
      this.logs.clear();
      this.lastFetch.logs.clear();
    }
    if (type === "all" || type === "status") {
      this.statusResults.clear();
    }
  },

  invalidateDate(date) {
    // Remove cache entries for specific date
    for (const key of this.logs.keys()) {
      if (key.includes(date)) {
        this.logs.delete(key);
        this.lastFetch.logs.delete(key);
      }
    }
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

    const response = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      queries
    );

    return response.documents || [];
  } catch (error) {
    showError("Error fetching attendance logs!");
    return [];
  }
};

// Optimized markMissingEmployeesAsAbsent with batching
const markMissingEmployeesAsAbsent = async (currentLogs) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const employees = await cache.getEmployees();
    if (!employees || !Array.isArray(employees)) return [];

    // Create a map of existing logs for quick lookup
    const existingLogsMap = new Map(
      currentLogs.map(log => [log.EmployeeID, log])
    );

    // Collect employees who need status updates
    const updates = [];
    const newAbsentLogs = [];

    for (const employee of employees) {
      // Skip if employee already has a log
      if (existingLogsMap.has(employee.$id)) continue;

      const shift = SHIFT_CONFIGS[employee.Shift || 'MORNING'];
      const currentTime = format(new Date(), 'HH:mm');
      
      // Only mark as absent if we're past the grace period for their shift
      const shiftStartMinutes = TimeUtils.toMinutes(shift.timings.start);
      const currentMinutes = TimeUtils.toMinutes(currentTime);
      const graceEndMinutes = shiftStartMinutes + UNIVERSAL_RULES.GRACE_PERIOD;

      if (currentMinutes > graceEndMinutes) {
        updates.push({
          employeeId: employee.$id,
          date: today,
          status: 'ABSENT'
        });

        newAbsentLogs.push({
          EmployeeID: employee.$id,
          Name: employee.Name,
          Position: employee.Position,
          Shift: employee.Shift || 'MORNING',
          Date: today,
          InTime: '0.00',
          OutTime: '0.00',
          TotalTime: 0,
          Status: 'ABSENT'
        });
      }
    }

    // Batch update all statuses at once
    if (updates.length > 0) {
      await batchUpdateStatuses(updates);
    }

    return newAbsentLogs;
  } catch (error) {
    console.error('Error in markMissingEmployeesAsAbsent:', error);
    throw error;
  }
};

// Enhanced fetchAttendanceLogs with immediate status updates
const fetchAttendanceLogs = async (
  date = null,
  startDate = null,
  endDate = null,
  offset = 0
) => {
  try {
    // Check cache first
    const cachedLogs = await cache.getLogs(date, startDate, endDate, offset);
    if (cachedLogs) return cachedLogs;

    // If no cache, fetch raw logs
    const logs = await fetchAttendanceLogsRaw(date, startDate, endDate, offset);
    
    // For today's logs, immediately process absent employees
    if (date === format(new Date(), 'yyyy-MM-dd') || (!date && !startDate && !endDate)) {
      const absentLogs = await markMissingEmployeesAsAbsent(logs);
      return [...logs, ...absentLogs];
    }

    return logs;
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    throw error;
  }
};

// Fetch attendance logs with caching
// const fetchAttendanceLogs = async (
//   date = null,
//   startDate = null,
//   endDate = null,
//   offset = 0
// ) => {
//   return cache.getLogs(date, startDate, endDate, offset);
// };

// Fetch employees from cache
const fetchEmployees = async () => {
  return cache.getEmployees();
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
        TotalTime: 0
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

// Batch update multiple employee statuses
const batchUpdateStatuses = async (updates) => {
  if (!updates || updates.length === 0) return [];

  const results = [];
  const affectedDates = new Set();

  for (const update of updates) {
    const result = await updateEmployeeStatus(
      update.employeeId,
      update.date,
      update.status,
      true // batch mode = true
    );
    results.push(result);
    affectedDates.add(update.date);
  }

  // Invalidate cache for all affected dates at once
  affectedDates.forEach((date) => cache.invalidateDate(date));

  return results;
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
const exportLogsToCSV = (logs, startDate, endDate) => {
  if (!logs.length) {
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
  const csvData = logs.map((log) => {
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
  a.download = `attendance_logs_${startDate}_to_${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return true;
};

// Helper function to check if a date is a weekend
const isNonWorkingDay = (dateString) => {
  // Parse date in local timezone to avoid UTC conversion issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);  // month is 0-based in Date constructor
  const dayOfWeek = date.getDay();
  
  // Check if it's weekend (Saturday = 6, Sunday = 0)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  return isWeekend;
};

// Improved attendance status determination
const determineAttendanceStatus = (inTime, outTime, totalTime, employeeShift, dateString) => {
  // Check cache first
  const cachedResult = cache.getStatus(inTime, outTime, totalTime, employeeShift, dateString);
  if (cachedResult) return cachedResult;

  const isWeekend = isNonWorkingDay(dateString);
  const shift = SHIFT_CONFIGS[employeeShift];
  
  if (!shift) {
    return { status: 'Invalid', type: 'ERROR', remarks: 'Invalid shift configuration' };
  }

  // No check-in recorded
  if (!inTime || inTime === '0.00') {
    return { 
      status: isWeekend ? 'Weekend' : 'Absent',
      type: isWeekend ? 'WEEKEND' : 'ABSENT',
      remarks: 'No check-in recorded',
      workedHours: 0,
      overtimeHours: 0
    };
  }

  // Calculate actual worked hours considering breaks
  const workedHours = calculateWorkedHours(inTime, outTime || format(new Date(), 'HH:mm'), shift);
  let overtimeHours = 0;
  let status = 'Present';
  let type = 'PRESENT';
  let remarks = [];

  if (isWeekend) {
    status = 'Weekend';
    type = 'WEEKEND';
    overtimeHours = workedHours; // All hours on weekend count as overtime
    if (overtimeHours > 0) {
      remarks.push(`Weekend hours: ${overtimeHours.toFixed(2)}`);
    }
  } else {
    // Regular weekday
    if (workedHours > UNIVERSAL_RULES.OVERTIME_THRESHOLD) {
      // Calculate overtime from regular hours (8 hours), not threshold
      overtimeHours = workedHours - UNIVERSAL_RULES.MIN_HOURS.FULL_DAY;
      type = 'OVERTIME';
      remarks.push(`Overtime: ${overtimeHours.toFixed(2)} hours`);
    }

    // Handle half day and absent cases
    if (workedHours < UNIVERSAL_RULES.MIN_HOURS.HALF_DAY) {
      status = 'Absent';
      type = 'ABSENT';
      remarks = ['Insufficient hours worked'];
      overtimeHours = 0;
    } else if (workedHours < UNIVERSAL_RULES.MIN_HOURS.FULL_DAY) {
      status = 'Half Day';
      type = 'HALF_DAY';
      remarks = ['Less than full day hours'];
      overtimeHours = 0;
    }
  }

  const result = {
    status,
    type,
    remarks: remarks.join(', ') || 'Regular attendance',
    workedHours: parseFloat(workedHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2))
  };

  // Cache the result
  cache.cacheStatus(inTime, outTime, totalTime, employeeShift, dateString, result);
  return result;
};

// Helper function to calculate worked hours considering breaks
const calculateWorkedHours = (inTime, outTime, shift) => {
  if (!outTime) return 0;

  const inMinutes = timeToMinutes(inTime);
  const outMinutes = timeToMinutes(outTime);
  let totalMinutes = 0;

  if (shift.nextDayCheckout && outMinutes < inMinutes) {
    totalMinutes = (24 * 60 - inMinutes) + outMinutes;
  } else {
    totalMinutes = outMinutes - inMinutes;
  }

  // No longer deducting break times as per requirement
  return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
};

// Helper function to convert time to minutes
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to check if time1 is before time2
const isTimeBefore = (time1, time2, isOvernight = false) => {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);

  if (isOvernight) {
    if (minutes1 < 12 * 60) { // If time1 is in next day (AM)
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
    if (minutes1 < 12 * 60) { // If time1 is in next day (AM)
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
        resolve({success: false, message: "Employee not found"});
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
        )
      ]);
      
      resolve({
        success: true,
        employee,
        todayRecords: todayRecords.documents,
        yesterdayRecords: yesterdayRecords.documents,
        currentHour: now.getHours(),
        currentMinute: now.getMinutes()
      });
    } catch (error) {
      resolve({success: false, message: error.message});
    }
  });
};

// Optimized markMissingEmployeesAsAbsent with batching
// const markMissingEmployeesAsAbsent = async (currentLogs) => {
//   const today = format(new Date(), 'yyyy-MM-dd');
//   const isWeekend = isNonWorkingDay(today);
  
//   try {
//     // First, clean up any duplicate records
//     const existingLogsMap = new Map();
//     for (const log of currentLogs) {
//       const key = log.EmployeeID;
//       if (!existingLogsMap.has(key) || 
//           new Date(log.$createdAt) < new Date(existingLogsMap.get(key).$createdAt)) {
//         existingLogsMap.set(key, log);
//       }
//     }

//     // Delete duplicate records
//     const duplicates = currentLogs.filter(log => {
//       const storedLog = existingLogsMap.get(log.EmployeeID);
//       return storedLog.$id !== log.$id;
//     });

//     await Promise.all(duplicates.map(duplicate => 
//       databases.deleteDocument(
//         conf.appwriteDatabaseId,
//         conf.appwriteAttendanceLogsCollectionId,
//         duplicate.$id
//       )
//     ));

//     // Get all employees
//     const employees = await cache.getEmployees();
//     const updates = [];

//     // Update status for all employees
//     for (const employee of employees) {
//       const existingLog = existingLogsMap.get(employee.EmployeeID);
      
//       if (existingLog) {
//         // Update existing record with weekend status if needed
//         if (isWeekend && existingLog.Status !== 'WEEKEND') {
//           await databases.updateDocument(
//             conf.appwriteDatabaseId,
//             conf.appwriteAttendanceLogsCollectionId,
//             existingLog.$id,
//             { Status: 'WEEKEND' }
//           );
//         }
//       } else {
//         // Create new record for missing employee
//         updates.push({
//           EmployeeID: employee.EmployeeID,
//           FullName: employee.FullName || '',
//           Position: employee.Position || '',
//           Department: employee.Department || '',
//           Shift: employee.Shift || 'MORNING',
//           Date: today,
//           Status: isWeekend ? 'WEEKEND' : 'PENDING',
//           InTime: '0.00',
//           OutTime: '0.00',
//           TotalTime: 0
//         });
//       }
//     }

//     // Create records for missing employees
//     if (updates.length > 0) {
//       const results = await Promise.all(updates.map(update => 
//         databases.createDocument(
//           conf.appwriteDatabaseId,
//           conf.appwriteAttendanceLogsCollectionId,
//           'unique()',
//           update
//         )
//       ));

//       return results;
//     }

//     return [];
//   } catch (error) {
//     console.error('Error in markMissingEmployeesAsAbsent:', error);
//     showError('Failed to process absent employees');
//     return [];
//   }
// };

// Update all statuses
const updateAllStatuses = async () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const isWeekend = isNonWorkingDay(today);

  try {
    const logs = await databases.listDocuments(
      conf.appwriteDatabaseId,
      conf.appwriteAttendanceLogsCollectionId,
      [Query.equal('Date', today)]
    );

    if (isWeekend) {
      // Update all records to WEEKEND status
      await Promise.all(logs.documents.map(log =>
        databases.updateDocument(
          conf.appwriteDatabaseId,
          conf.appwriteAttendanceLogsCollectionId,
          log.$id,
          { Status: 'WEEKEND' }
        )
      ));
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating statuses:', error);
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

// const enhancedBatchProcess = async (
//   items,
//   processFn,
//   batchSize = 10,
//   progressCallback = null
// ) => {
//   const totalBatches = Math.ceil(items.length / batchSize);
//   let completedBatches = 0;
//   const results = [];

//   const processBatch = async (batch, batchIndex) => {
//     try {
//       const batchResults = await processFn(batch);
//       results.push(...batchResults);
//     } catch (error) {
//       console.error(
//         `Error processing batch ${batchIndex + 1}/${totalBatches}:`,
//         error
//       );
//     }
//     completedBatches++;
//     if (progressCallback && typeof progressCallback === "function") {
//       progressCallback({
//         completed: completedBatches,
//         total: totalBatches,
//         progress: Math.round((completedBatches / totalBatches) * 100),
//       });
//     }
//   };

//   await Promise.all(
//     Array.from({ length: totalBatches }, (_, i) =>
//       processBatch(items.slice(i * batchSize, (i + 1) * batchSize), i)
//     )
//   );

//   return results;
// };

// // Retry function for database operations
// const withRetry = async (operation, retries = 3, delay = 1000) => {
//   let lastError;
  
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       return await operation();
//     } catch (error) {
//       console.log(`Operation failed (attempt ${attempt}/${retries}):`, error.message);
//       lastError = error;

//       if (attempt < retries) {
//         await new Promise(resolve => setTimeout(resolve, delay * attempt));
//       }
//     }
//   }
  
//   throw lastError;
// };

// // Add utility for scheduling regular attendance updates
// const scheduleAttendanceUpdates = () => {
//   // Update every 30 minutes
//   setInterval(() => {
//     const currentHour = new Date().getHours();
//     const currentMinute = new Date().getMinutes();
    
//     // Only run during work hours (6 AM to 10 PM)
//     if (currentHour >= 6 && currentHour < 22) {
//       console.log(`Scheduled attendance update running: ${new Date()}`);
      
//       // Mark absent employees
//       throttledMarkAbsent([]);
      
//       // Update statuses of existing logs
//       throttledUpdateAllStatuses();
//     }
//   }, 30 * 60 * 1000); // 30 minutes
  
//   console.log("Attendance update scheduler initialized");
// };

// Update the export object with optimized functions
const AttendanceService = {
  fetchAttendanceLogs,
  fetchEmployees,
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

 
  clearCache: (type) => cache.clearCache(type),
  invalidateDate: (date) => cache.invalidateDate(date),
};

export default AttendanceService; 