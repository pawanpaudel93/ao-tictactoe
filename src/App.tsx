import { Route, Routes } from "react-router-dom";
import Home from "@/pages/home";
import Game from "@/pages/game";

function App() {
  return (
    <div className="w-full">
      <Routes>
        <Route index path="/" Component={Home} />
        <Route path="/game/:processId" Component={Game} />
      </Routes>
    </div>
  );
}

export default App;
