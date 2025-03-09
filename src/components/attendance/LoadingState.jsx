import React from "react";

const LoadingState = () => {
  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-black text-2xl">Loading attendance logs...</div>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
