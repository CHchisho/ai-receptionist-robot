import { Navigate, Route, Routes } from "react-router-dom";
import { AdminPage } from "@/pages/admin/AdminPage";
import { ReceptionPage } from "@/pages/reception/ReceptionPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<ReceptionPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
