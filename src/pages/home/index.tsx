import { Tabs } from "antd";
import Create from "./components/create";
import Join from "./components/join";
import { useState } from "react";

export default function Home() {
  const [activeKey, setActiveKey] = useState("join-game");

  return (
    <div className="flex mx-auto items-center justify-around p-2 max-w-5xl w-full">
      <Tabs
        className="w-full"
        defaultActiveKey="join-game"
        onChange={(key) => setActiveKey(key)}
        centered
        items={[
          {
            label: `Join Game`,
            key: "join-game",
            children: <Join activeKey={activeKey} />,
          },
          {
            label: `Create a new Game`,
            key: "create-new-game",
            children: <Create />,
          },
        ]}
      />
    </div>
  );
}
