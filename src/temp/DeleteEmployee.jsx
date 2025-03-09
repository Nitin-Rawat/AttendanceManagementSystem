import React, { useState } from "react";
// import { deleteEmployee } from "../Google_Sheet/googleSheets";

const DeleteEmployee = ({ selectedPosition, employees, setEmployees }) => {
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Filter employees based on selectedPosition
  const filteredEmployees =
    selectedPosition === "all"
      ? employees
      : employees.filter((employee) => employee.position === selectedPosition);

  const handleCheckboxChange = (employeeId) => {
    setSelectedEmployees((prevSelected) =>
      prevSelected.includes(employeeId)
        ? prevSelected.filter((id) => id !== employeeId)
        : [...prevSelected, employeeId]
    );
  };

  // const handleDelete = () => {
  //   if (selectedEmployees.length === 0) {
  //     alert("Please select employees to delete.");
  //     return;
  //   }

  //   const updatedEmployees = employees.filter(
  //     (employee) => !selectedEmployees.includes(employee.employeeId)
  //   );
  //   localStorage.setItem("employees", JSON.stringify(updatedEmployees));
  //   setEmployees(updatedEmployees);

  //   alert("Selected employees have been deleted.");
  // };

const handleDelete = async (employeeId) => {
  if (!window.confirm("Are you sure you want to delete this employee?")) return;

  try {
    const result = await deleteEmployee(employeeId);
    alert(result.message);
  } catch (error) {
    alert("Error deleting employee");
  }
};


  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Delete employees</h2>
      <div className="grid grid-cols-5 gap-5">
        {filteredEmployees.map((employee) => (
          <div key={employee.employeeId} className="flex-auto">
            <input
              type="checkbox"
              checked={selectedEmployees.includes(employee.employeeId)}
              onChange={() => handleCheckboxChange(employee.employeeId)}
              className="mr-2"
            />
            <span>
              {employee.name} {employee.employeeId}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          // onClick={handleDelete}
          onClick={() => handleDelete(employees.employeeId)}
        
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700
          transition-colors" > Delete Selected employees
        </button>
      </div>
    </div>
  );
};

export default DeleteEmployee;
