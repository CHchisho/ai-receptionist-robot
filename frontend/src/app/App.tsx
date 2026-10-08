import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRouter } from "@/app/router";
import { useKioskLock } from "@/app/useKioskLock";

function KioskLock() {
  const { pathname } = useLocation();
  useKioskLock(pathname === "/");
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <KioskLock />
      <AppRouter />
    </BrowserRouter>
  );
}
