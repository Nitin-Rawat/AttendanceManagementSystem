// components/ExportButton.jsx
import React from "react";
import { Download } from "lucide-react";

const ExportButton = ({ onClick, selectedRange, isLoading }) => {
  return (
    <button
      onClick={onClick}
      className="bg-[#2f5fa6] text-white px-4 py-2 rounded-lg hover:bg-[#1e4785] transition-colors flex items-center space-x-2"
      disabled={isLoading}
    >
      <Download className="h-5 w-5" />
      <span>Export {selectedRange} Data</span>
    </button>
  );
};

export default ExportButton;
