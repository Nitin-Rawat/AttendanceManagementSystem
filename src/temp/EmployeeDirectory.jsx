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
import DeleteEmployee from "../components/DeleteEmployee";
import UpdateEmployee from "./UpdateEmployee";
import conf from "../conf/conf";
import { databases, storage } from "../Appwrite/appwriteService";

const EmployeeCard = React.memo(
  ({ employee, index, cardRefs, downloadCard }) => (
    <div
      key={employee.EmployeeID}
      className="flex flex-col  items-center bg-white rounded-lg shadow-md p-4 border border-gray-200 w-80 h-[30rem] mx-auto"
    >
      <div
        ref={(el) => (cardRefs.current[index] = el)}
        className="w-full h-full bg-gray-100 rounded-lg p-4 flex flex-col justify-between items-center"
      >
        {/* Employee Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
            <img
              src={employee.Image}
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
        </div>

        {/* QR Code */}
        <div className="w-32 h-32 md:w-36 md:h-36 mt-4">
          <QRCodeCanvas
            value={JSON.stringify({
              FullName: employee.FullName,
              EmployeeID: employee.EmployeeID,
              Department: employee.Department,
              Supervisor: employee.Supervisor,
              Position: employee.Position,
              Shift: employee.Shift,
            })}
            size={150}
          />
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={() => downloadCard(index, employee.EmployeeID)}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition"
      >
        Download ID Card
      </button>
    </div>
  )
);
const EmployeeDirectory = () => {
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
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
              return { ...emp, Image: imageUrl };
            } catch {
              return { ...emp, Image: null }; // Handle missing image
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

  // Optimized filtering using useMemo()
  const filteredEmployees = useMemo(() => {
    return selectedPosition === "all"
      ? employees
      : employees.filter((employee) => employee.Position === selectedPosition);
  }, [selectedPosition, employees]);

  const convertImageToBlob = useCallback(async (element) => {
    try {
      const dataUrl = await toPng(element, { quality: 1.0, pixelRatio: 3 });

      // Convert base64 to Uint8Array
      const byteString = atob(dataUrl.split(",")[1]);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      return uint8Array;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  }, []);

  const downloadCard = useCallback(async (index, EmployeeID) => {
    if (cardRefs.current[index]) {
      try {
        const dataUrl = await toPng(cardRefs.current[index], {
          quality: 1.0,
          pixelRatio: 3,
        });
        saveAs(dataUrl, `${EmployeeID}_ID_Card.png`);
      } catch (error) {
        console.error("Error generating image:", error);
      }
    }
  }, []);

  const downloadAllCards = async () => {
    setIsDownloading(true);
    const zip = new JSZip();

    // Process images in parallel with batching
    const batchSize = 5; // Reduce CPU load by batching
    for (let i = 0; i < filteredEmployees.length; i += batchSize) {
      const batch = filteredEmployees.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (employee, index) => {
          if (cardRefs.current[i + index]) {
            const imageData = await convertImageToBlob(
              cardRefs.current[i + index]
            );
            if (imageData) {
              zip.file(`${employee.EmployeeID}_ID_Card.png`, imageData);
            }
          }
        })
      );
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "ID_Cards.zip");
    } catch (error) {
      console.error("Error creating ZIP:", error);
    } finally {
      setIsDownloading(false);
    }
  };
  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-gray-500">Loading employee directory...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Employee Directory</h2>
        <select
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {positions.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
      </div>

      {/* Delete & Update Employees */}
      {/* <DeleteEmployee employees={employees} setEmployees={setEmployees} />
      <UpdateEmployee employees={employees} setEmployees={setEmployees} /> */}

      <div className="flex justify-end mb-4">
        <button
          onClick={downloadAllCards}
          className={`bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition ${
            isDownloading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isDownloading}
        >
          {isDownloading ? "Downloading..." : "Download All ID Cards"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-14">
        {filteredEmployees.map((employee, index) => (
          <EmployeeCard
            key={employee.EmployeeID}
            employee={employee}
            index={index}
            cardRefs={cardRefs}
            downloadCard={downloadCard}
          />
        ))}
      </div>
    </div>
  );
};

export default EmployeeDirectory;
