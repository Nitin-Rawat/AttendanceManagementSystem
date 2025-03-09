import React, { useState } from "react"; 


const UpdateEmployee = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [updatedData, setUpdatedData] = useState({
    FullName: "",
    Position: "",
  });
  const [message, setMessage] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUpdatedData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleUpdateEmployee = async () => {
    if (!employeeId) {
      alert("Please enter an Employee ID.");
      return;
    }

    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzzbF2zdAbpeAbWekkEJgC8JX9kcBTKeiWfWH__XK3LvBW26HxPoQJ39410VESkg1ID/exec",

        {
          method: "POST",
          body: JSON.stringify({
            action: "updateEmployee",
            employee: updatedData,
          }),
        }
      );
         

      if (!response.ok) {
        throw new Error("Failed to update employee");
      }

      const result = await response.json();
      setMessage(result.message);
    } catch (error) {
      setMessage("Error updating employee");
    }
  };

  return (
    <div className="p-4 border rounded-md shadow-md max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-4">Update Employee</h2>

      <input
        type="text"
        placeholder="Employee ID"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        className="w-full mb-2 p-2 border rounded"
      />

      <input
        type="text"
        name="FullName"
        placeholder="New Full Name"
        value={updatedData.FullName}
        onChange={handleInputChange}
        className="w-full mb-2 p-2 border rounded"
      />

      <input
        type="text"
        name="Position"
        placeholder="New Position"
        value={updatedData.Position}
        onChange={handleInputChange}
        className="w-full mb-2 p-2 border rounded"
      />

      <button
        onClick={handleUpdateEmployee}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Update Employee
      </button>

      {message && <p className="mt-2 text-green-600">{message}</p>}
    </div>
  );
};

export default UpdateEmployee;
