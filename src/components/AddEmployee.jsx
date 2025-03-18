
import React, { useState, useRef, useEffect } from "react";
import { Save } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { storage, databases } from "../Appwrite/appwriteService";
import conf from "../conf/conf";
import { Query } from "appwrite";
import DOMPurify from 'dompurify';
import showError from "./Notifications/Error";

const AddEmployee = () => {
  const [existingEmployeeIds, setExistingEmployeeIds] = useState(new Set());
  const [formData, setFormData] = useState({
    Image: "",
    FullName: "",
    EmployeeID: "",
    MobileNo: "",
    Email: "",
    HireDate: "",
    Shift: "",
    Department: "",
    Supervisor: "",
    Position: "",
    QR: "",
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [showQR, setShowQR] = useState(false);
  // const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const qrRef = useRef();
  const fileInputRef = useRef(null);

  // Validation functions
  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const validateMobileNumber = (number) => {
    const re = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return re.test(String(number));
  };

  // Sanitize input
  const sanitizeInput = (input) => {
    return DOMPurify.sanitize(input?.toString() || "");
  };

  // Validate form data
  const validateForm = () => {
    const errors = {};

    // Validate full name (only letters and spaces)
    if (!/^[a-zA-Z\s]{2,50}$/.test(formData.FullName)) {
      errors.FullName = "Name must be 2-50 letters";
    }

    // Validate email
    if (!validateEmail(formData.Email)) {
      errors.Email = "Invalid email format";
    }

    // Validate mobile number
    if (!validateMobileNumber(formData.MobileNo)) {
      errors.MobileNo = "Invalid mobile number";
    }

    // Check if image is selected
    if (!selectedImage && !formData.Image) {
      errors.Image = "Profile image is required";
    }

    // Validate other required fields
    const requiredFields = ["Department", "Position", "Shift", "HireDate"];
    requiredFields.forEach((field) => {
      if (!formData[field]) {
        errors[field] = `${field} is required`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Automatically generate QR code preview (but not upload) when all details are filled
  useEffect(() => {
    const allFieldsFilled = [
      "FullName",
      "Department",
      "Position",
      "Shift",
      "Email",
      "MobileNo",
      "HireDate",
    ].every((field) => formData[field]);

    if (allFieldsFilled && !showQR) {
      setShowQR(true);
    }
  }, [formData, showQR]);

  // Prepare QR code image data for later upload
  useEffect(() => {
    const prepareQRData = async () => {
      if (showQR && qrRef.current) {
        try {
          const dataUrl = await toPng(qrRef.current, { quality: 1.0 });
          setQrDataUrl(dataUrl);
        } catch (error) {
          showError("Error preparing QR code:", error);
        }
      }
    };

    if (showQR) {
      // Small delay to ensure the QR component is rendered
      const timer = setTimeout(() => {
        prepareQRData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showQR, formData.EmployeeID]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    // Validate file type and size
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      alert("Invalid file type. Please upload a JPEG, PNG, or GIF.");
      fileInputRef.current.value = "";
      return;
    }

    if (file.size > maxSize) {
      alert("File is too large. Maximum size is 5MB.");
      fileInputRef.current.value = "";
      return;
    }

    setSelectedImage(file);
    // Clear any validation errors for image
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.Image;
      return newErrors;
    });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      alert("Please correct the errors in the form.");
      return;
    }

    setIsLoading(true);

    try {
      // Sanitize all text inputs
      const sanitizedData = Object.keys(formData).reduce((acc, key) => {
        acc[key] =
          typeof formData[key] === "string"
            ? sanitizeInput(formData[key])
            : formData[key];
        return acc;
      }, {});

      let newEmployeeID =formData.EmployeeID; // Default ID for first employee
      // Fetch the last EmployeeID and increment it
      const latestEmployees = await databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwriteEmployeeCollectionId,
        [Query.orderDesc("EmployeeID"), Query.limit(1)]
      );

      if (latestEmployees.documents.length > 0) {
        const lastEmployeeID = latestEmployees.documents[0].EmployeeID;
        const match = lastEmployeeID.match(/^EID-(\d+)$/); // Extract number safely
        const lastNumber = match ? parseInt(match[1], 10) : 0;
        newEmployeeID = `EID-${String(lastNumber + 1).padStart(2, "0")}`;
        // Update the form data to show the correct ID
        setFormData((prev) => ({ ...prev, EmployeeID: newEmployeeID }));
      }

      // Upload profile image with EmployeeID as filename
      let imageFileId = "";
      if (selectedImage) {
        const imageExtension = selectedImage.name.split(".").pop();
        const renamedFile = new File(
          [selectedImage],
          `${newEmployeeID}.${imageExtension}`,
          { type: selectedImage.type }
        );

        const imageUpload = await storage.createFile(
          conf.appwriteAvatarBucketId,
          "unique()",
          renamedFile
        );
        imageFileId = imageUpload.$id;
      } else if (formData.Image) {
        imageFileId = formData.Image;
      }

      // Upload QR code image with EmployeeID as filename
      let qrFileId = "";
      if (qrDataUrl) {
        const blob = await (await fetch(qrDataUrl)).blob();
        const qrFile = new File([blob], `${newEmployeeID}.png`, {
          type: "image/png",
        });

        const qrUpload = await storage.createFile(
          conf.appwriteQrBucketId,
          "unique()",
          qrFile
        );
        qrFileId = qrUpload.$id;
      }

      // Save employee data to database
      await databases.createDocument(
        conf.appwriteDatabaseId,
        conf.appwriteEmployeeCollectionId,
        newEmployeeID, // Using EmployeeID as document ID
        {
          ...sanitizedData,
          EmployeeID: newEmployeeID,
          Image: imageFileId,
          QR: qrFileId,
        }
      );

      alert(`Employee added successfully! Employee ID: ${newEmployeeID}`);
      resetForm();
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    // Reset form to initial state
    setFormData({
      Image: "",
      FullName: "",
      EmployeeID: "",
      MobileNo: "",
      Email: "",
      HireDate: "",
      Shift: "",
      Department: "",
      Supervisor: "",
      Position: "",
      QR: "",
    });
    setSelectedImage(null);
    setValidationErrors({});
    setShowQR(false);
    setQrDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Fetch existing Employee IDs once on mount
  useEffect(() => {
    const fetchEmployeeIds = async () => {
      try {
        const response = await databases.listDocuments(
          conf.appwriteDatabaseId,
          conf.appwriteEmployeeCollectionId,
          [Query.orderDesc("EmployeeID"), Query.limit(1)]
        );

        const ids = new Set(response.documents.map((doc) => doc.EmployeeID));
        setExistingEmployeeIds(ids);

        // Set the next EmployeeID based on the latest record
        if (response.documents.length > 0) {
          const lastEmployeeID = response.documents[0].EmployeeID;
          const lastNumber = parseInt(lastEmployeeID.split("-")[1], 10);
          const nextId = `EID-${String(lastNumber + 1).padStart(2, "0")}`;

          setFormData((prevData) => ({
            ...prevData,
            EmployeeID: nextId,
          }));
        }
      } catch (error) {
        console.error("Error fetching employee IDs:", error);
      }
    };
    fetchEmployeeIds();
  }, []);

  // Generate Employee ID based on existing IDs 
  useEffect(() => {
    if (formData.FullName && formData.Department && formData.Position) {
      // Only set EmployeeID if it hasn't been set by the database fetch
      if (!formData.EmployeeID) {
        const nextId = generateNextId(existingEmployeeIds);
        setFormData((prevData) => ({
          ...prevData,
          EmployeeID: nextId,
        }));
      }
    }
  }, [
    formData.FullName,
    formData.Department,
    formData.Position,
    existingEmployeeIds,
    formData.EmployeeID,
  ]);

  // Function to generate the next unique ID
  const generateNextId = (existingIds) => {
    let id = 1;
    while (existingIds.has(`EID-${String(id).padStart(2, "0")}`)) {
      id++;
    }
    return `EID-${String(id).padStart(2, "0")}`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white text-black rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 bg-clip-text  ">
          Add New Employee
        </h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium  mb-1">Full Name</label>
            <input
              type="text"
              value={formData.FullName}
              onChange={(e) =>
                setFormData({ ...formData, FullName: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg text-black
                ${
                  validationErrors.FullName
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-600 focus:ring-indigo-500"
                }`}
              required
            />
            {validationErrors.FullName && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.FullName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">
              Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className={`w-full px-4 py-2 border rounded-lg text-black
                ${
                  validationErrors.Image
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-600 focus:ring-indigo-500"
                }`}
              required
            />
            {validationErrors.Image && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.Image}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">
              Employee ID
            </label>
            <input
              type="text"
              readOnly
              value={formData.EmployeeID}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg text-black focus:ring-0 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">Email</label>
            <input
              type="email"
              value={formData.Email}
              onChange={(e) =>
                setFormData({ ...formData, Email: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg text-black
                ${
                  validationErrors.Email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-600 focus:ring-indigo-500"
                }`}
              required
            />
            {validationErrors.Email && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.Email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">Mobile No</label>
            <input
              type="tel"
              value={formData.MobileNo}
              onChange={(e) =>
                setFormData({ ...formData, MobileNo: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg text-black
                ${
                  validationErrors.MobileNo
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-600 focus:ring-indigo-500"
                }`}
              required
            />
            {validationErrors.MobileNo && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.MobileNo}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">Hire Date</label>
            <input
              type="date"
              value={formData.HireDate}
              onChange={(e) =>
                setFormData({ ...formData, HireDate: e.target.value })
              }
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-2 border rounded-lg text-black
                ${
                  validationErrors.HireDate
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-600 focus:ring-indigo-500"
                }`}
              required
            />
            {validationErrors.HireDate && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.HireDate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">
              Department
            </label>
            <select
              value={formData.Department}
              onChange={(e) =>
                setFormData({ ...formData, Department: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg text-black
                ${
                  validationErrors.Department
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-600 focus:ring-indigo-500"
                }`}
              required
            >
              <option value="">Select Department</option>
              <option value="computer-science">Computer Science</option>
              <option value="electrical">Electrical Engineering</option>
              <option value="mechanical">Mechanical Engineering</option>
              <option value="civil">Civil Engineering</option>
            </select>
            {validationErrors.Department && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.Department}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">Position</label>
            <select
              value={formData.Position}
              onChange={(e) =>
                setFormData({ ...formData, Position: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg text-black
                ${
                  validationErrors.Position
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-600 focus:ring-indigo-500"
                }`}
              required
            >
              <option value="">Select Position</option>
              <option value="Manager">Manager</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Operator">Operator</option>
              <option value="Worker">Worker</option>
            </select>
            {validationErrors.Position && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.Position}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">Shift</label>
            <select
              value={formData.Shift}
              onChange={(e) =>
                setFormData({ ...formData, Shift: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg text-black
                ${
                  validationErrors.Shift
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-600 focus:ring-indigo-500"
                }`}
              required
            >
              <option value="">Select Shift</option>
              <option value="MORNING">MORNING</option>
              <option value="DAY">DAY</option>
              <option value="NIGHT">NIGHT</option>
            </select>
            {validationErrors.Shift && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.Shift}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium  mb-1">
              Supervisor
            </label>
            <input
              type="text"
              value={formData.Supervisor}
              onChange={(e) =>
                setFormData({ ...formData, Supervisor: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-600 rounded-lg text-black focus:ring-indigo-500"
            />
          </div>

          {/* QR Code Section */}
          <div className="col-span-2 mt-4">
            {showQR && formData.EmployeeID && (
              <div className="flex flex-col items-center p-4 rounded-lg">
                <h3 className="text-lg font-medium  mb-2">Employee QR Code</h3>
                <div ref={qrRef} className="bg-white p-4 rounded-lg">
                  <QRCodeCanvas
                    value={JSON.stringify({
                      id: formData.EmployeeID,
                      name: formData.FullName,
                      dept: formData.Department,
                      position: formData.Position,
                    })}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  This QR code contains essential employee information for
                  scanning
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="col-span-2 mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-white from-stone-50 rounded-lg font-medium flex items-center justify-center gap-2
                ${
                  isLoading
                    ? "bg-[#2e5a9d] cursor-not-allowed"
                    : "bg-[#2e5a9d] hover:bg-[#1e4785]"
                }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Add Employee</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;