
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { QRCodeCanvas } from "qrcode.react";
import JSZip from "jszip";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import conf from "../conf/conf";
import { databases, storage } from "../Appwrite/appwriteService";
import { Delete, DeleteIcon, Download, Edit2Icon, Edit3 } from "lucide-react";

// Update Employee Modal Component
 
 const UpdateEmployeeModal = ({ employee, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({ ...employee });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);

    try {
      // Update document in Appwrite
      const updatedEmployee = await databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwriteEmployeeCollectionId,
        employee.$id, // Use the unique document ID from Appwrite
        {
          FullName: formData.FullName,
          Email: formData.Email,
          MobileNo: formData.MobileNo,
          Position: formData.Position,
          Department: formData.Department,
          Shift: formData.Shift
        }
      );

      // Call the parent component's update method
      onUpdate(updatedEmployee);
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error updating employee:', error);
      setError('Failed to update employee. Please try again.');
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Update Employee</h2>
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Full Name</label>
              <input
                type="text"
                name="FullName"
                value={formData.FullName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Email</label>
              <input
                type="email"
                name="Email"
                value={formData.Email}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Mobile No</label>
              <input
                type="tel"
                name="MobileNo"
                value={formData.MobileNo}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Position</label> 
              <select
                value={formData.Position}
                onChange={handleChange}
                name="Position" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select Position</option>
                <option value="Manager">Manager</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Operator">Operator</option>
                <option value="Worker">Worker</option>
              </select>
            </div>
            <div>
              <label className="block mb-2">Department</label>
              <select
                value={formData.Department}
                onChange={handleChange}
                name="Department"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select Department</option>
                <option value="computer-science">Computer Science</option>
                <option value="electrical">Electrical Engineering</option>
                <option value="mechanical">Mechanical Engineering</option>
                <option value="civil">Civil Engineering</option>
              </select>
            </div>

            <div>
              <select
                value={formData.Shift}
                onChange={handleChange}
                name="Shift"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select Shift</option>
                <option value="MORNING">MORNING</option>
                <option value="DAY">DAY</option>
                <option value="NIGHT">NIGHT</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded-lg"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg ${
                  isUpdating ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Hidden ID Card Component for Downloading
const DownloadableEmployeeCard = React.forwardRef(({ employee }, ref) => (
  <div
    ref={ref}
    className="flex flex-col  items-center bg-white rounded-lg shadow-md p-4 border border-gray-200 w-80 h-[30rem] mx-auto"
  >
   
      {/* Employee Avatar */}
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 bg-[#1e4785] rounded-full flex items-center justify-center text-white font-bold text-xl">
          <img
            src={employee.Image ? encodeURI(employee.Image) : ""}
            alt="Avatar"
            className="object-cover w-full h-full rounded-full"
          />
        </div>
        <h3 className="text-lg font-semibold mt-2">{employee.FullName}</h3>
        <p className="text-sm text-gray-500">{employee.EmployeeID}</p>
      </div>

      {/* Employee Info */}
      <div className="text-left mt-4 text-sm w-full">
        <p className="mb-2">
          <span className="font-semibold">Position:</span> {employee.Position}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Department:</span>{" "}
          {employee.Department}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Shift:</span> {employee.Shift}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Join Date:</span> {employee.HireDate}
        </p>
      </div>

      {/* QR Code */}
      <div className="w-32 h-32 md:w-36 md:h-36 mt-4">
        <QRCodeCanvas
          value={JSON.stringify({
            FullName: employee.FullName,
            EmployeeID: employee.EmployeeID,
            Department: employee.Department,
            Position: employee.Position,
            Shift: employee.Shift,
          })}
          size={150}
        />
      </div>
    </div>
));

const EmployeeDirectory = () => {
  const [selectedPosition, setSelectedPosition] = useState("All");
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const cardRefs = useRef({});

  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoading(true);
      try {
        // Fetch employees from Appwrite Database
        const response = await databases.listDocuments(
          conf.appwriteDatabaseId,
          conf.appwriteEmployeeCollectionId
        );

        // Fetch employee images from Appwrite Storage
        const employeesWithImages = await Promise.all(
          response.documents.map(async (emp) => {
            try {
              const imageUrl = emp.Image
                ? storage.getFilePreview(conf.appwriteAvatarBucketId, emp.Image)
                : null;
              return {
                ...emp,
                Image: imageUrl,
                HireDate: emp.HireDate
                  ? new Date(emp.HireDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "N/A",
              };
            } catch {
              return { ...emp, Image: null, HireDate: "N/A" };
            }
          })
        );

        setEmployees(employeesWithImages);

        // Extract unique positions for filtering
        setPositions([
          "All",
          ...new Set(
            employeesWithImages.map((emp) => emp.Position).filter(Boolean)
          ),
        ]);
      } catch (error) {
        console.error("Error loading employees:", error);
        alert("Error loading employee directory");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, []);

  // Filtered and searched employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        (selectedPosition === "All" ||
          employee.Position === selectedPosition) &&
        (searchTerm === "" ||
          employee.FullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.EmployeeID.toLowerCase().includes(
            searchTerm.toLowerCase()
          ) ||
          employee.Department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [selectedPosition, employees, searchTerm]);

  // Download specific employee ID card
  const downloadCard = useCallback(async (employee) => {
    // Create a temporary container for the card
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";

    // Create a ref for the downloadable card
    const cardRef = React.createRef();

    // Render the card into the container
    const CardComponent = React.createElement(DownloadableEmployeeCard, {
      employee,
      ref: cardRef,
    });

    // Use ReactDOM to render (you'll need to import ReactDOM)
    import("react-dom").then(async (ReactDOM) => {
      ReactDOM.render(CardComponent, container);
      document.body.appendChild(container);

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const dataUrl = await toPng(cardRef.current, {
          quality: 1.0,
          pixelRatio: 3,
        });
        saveAs(dataUrl, `${employee.EmployeeID}_ID_Card.png`);
      } catch (error) {
        console.error("Error generating image:", error);
      } finally {
        // Clean up
        document.body.removeChild(container);
      }
    });
  }, []);

  // Download all ID cards
  const downloadAllCards = async () => {
    setIsDownloading(true);
    const zip = new JSZip();

    // Create a temporary container for rendering cards
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    try {
      // Import ReactDOM dynamically
      const ReactDOM = await import("react-dom");

      // Process images in parallel
      await Promise.all(
        filteredEmployees.map(async (employee) => {
          return new Promise(async (resolve) => {
            // Create a temporary div for each card
            const cardContainer = document.createElement("div");
            container.appendChild(cardContainer);

            // Create a ref for the card
            const cardRef = React.createRef();

            // Render the card
            const CardComponent = React.createElement(
              DownloadableEmployeeCard,
              {
                employee,
                ref: cardRef,
              }
            );
            ReactDOM.render(CardComponent, cardContainer);

            // Wait for render
            await new Promise((resolve) => setTimeout(resolve, 100));

            try {
              const dataUrl = await toPng(cardRef.current, {
                quality: 1.0,
                pixelRatio: 3,
              });

              // Convert data URL to blob
              const response = await fetch(dataUrl);
              const blob = await response.blob();
              zip.file(`${employee.EmployeeID}_ID_Card.png`, blob);
            } catch (error) {
              console.error(
                `Error generating image for ${employee.EmployeeID}:`,
                error
              );
            } finally {
              // Clean up this specific card container
              container.removeChild(cardContainer);
              resolve();
            }
          });
        })
      );

      // Generate and save ZIP
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Employee_ID_Cards.zip");
    } catch (error) {
      console.error("Error creating ZIP:", error);
    } finally {
      // Remove the main container
      document.body.removeChild(container);
      setIsDownloading(false);
    }
  };

  // Update employee handler
  const handleUpdateEmployee = async (updatedEmployee) => {
    try {
      // Here you would typically make an API call to update the employee
      // For now, we'll update the local state
      const updatedEmployees = employees.map((emp) =>
        emp.EmployeeID === updatedEmployee.EmployeeID
          ? { ...emp, ...updatedEmployee }
          : emp
      );

      setEmployees(updatedEmployees);
      setSelectedEmployee(null);
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Failed to update employee");
    }
  };

  return (
    <div className="w-full h-full p-4">
      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <h2 className="text-2xl font-bold">Employee Directory</h2>

        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search  by EID / Name !"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#1e4785]"
          />

          {/* Position Filter */}
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4785]"
          >
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Download All Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={downloadAllCards}
          className={`bg-[#1e4785] text-white px-4 py-2 rounded-lg hover:bg-green-700 transition ${
            isDownloading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isDownloading}
        >
          {isDownloading ? "Downloading..." : "Download All ID Cards"}
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center font-semibold text-black text-2xl">
          Loading employees...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 shadow-md">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-4 border w-16">Avatar</th>
                <th className="py-2 px-4 border">Employee ID</th>
                <th className="py-2 px-4 border">Name</th>
                <th className="py-2 px-4 border">Email</th>
                <th className="py-2 px-4 border">Position</th>
                <th className="py-2 px-4 border">Department</th>
                <th className="py-2 px-4 border">Supervisor</th>
                <th className="py-2 px-4 border">Shift</th>
                <th className="py-2 px-4 border">Hire Date</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.EmployeeID}
                  className="text-center hover:bg-gray-50"
                >
                  <td className="py-2 px-4 border">
                    {employee.Image ? (
                      <img
                        src={employee.Image ? encodeURI(employee.Image) : ""}
                        alt={employee.FullName}
                        className="w-12 h-12 rounded-full object-cover mx-auto"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto"></div>
                    )}
                  </td>
                  <td className="py-2 px-4 border">{employee.EmployeeID}</td>
                  <td className="py-2 px-4 border">{employee.FullName}</td>
                  <td className="py-2 px-4 border">{employee.Email}</td>
                  <td className="py-2 px-4 border">{employee.Position}</td>
                  <td className="py-2 px-4 border">{employee.Department}</td>
                  <td className="py-2 px-4 border">{employee.Supervisor}</td>
                  <td className="py-2 px-4 border">{employee.Shift}</td>
                  <td className="py-2 px-4 border">{employee.HireDate}</td>
                  <td className="py-2 px-4 border">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => downloadCard(employee)}
                        className="text-[#1e385f]  hover:text-[#1e4785]"
                      >
                        <Download />
                      </button>
                      <div className="h-5 bg-emerald-900 w-0.5 " />
                      <button
                        onClick={() => setSelectedEmployee(employee)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Edit3 />
                      </button>
                      <div className="h-5 bg-emerald-900 w-0.5 " /> 
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Update Employee Modal */}
      {selectedEmployee && (
        <UpdateEmployeeModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onUpdate={handleUpdateEmployee}
        />
      )}
    </div>
  );
};

export default EmployeeDirectory;