import { toast } from "react-toastify";

const showError = (message) => {
  toast.error(message, { position: "top-right", autoClose: 3000 });
};

export default showError;