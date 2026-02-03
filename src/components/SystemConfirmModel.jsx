import React from 'react';

// Assuming you have your global settings context or you can pass the appName as a prop
// For this example, I'll show how to accept the appName directly or default to 'System'

const SystemConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in-down">
        
        {/* HEADER: This uses your Custom App Name */}
        <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            ✕
          </button>
        </div>

        {/* BODY: The specific message */}
        <div className="p-6">
          <p className="text-gray-700 text-lg">{message}</p>
        </div>

        {/* FOOTER: Custom Buttons */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition shadow-md"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemConfirmModal;