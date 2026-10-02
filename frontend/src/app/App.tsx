import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/app/router";
import { useKioskLock } from "@/app/useKioskLock";

export function App() {
  useKioskLock();

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
