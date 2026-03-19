import { Toaster } from "@/components/ui/toaster";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Editor from "./pages/Editor";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/editor" replace />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="*" element={<Navigate to="/editor" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
