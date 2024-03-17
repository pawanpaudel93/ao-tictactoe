import { ROUTER_PROCESS } from "@/helpers/constants";
import { dryrun } from "@permaweb/aoconnect";
import { useEffect, useState } from "react";
import { List, Skeleton } from "antd";

interface DataType {
  Owner: string;
  Name: string;
  Id: string;
}

export default function Join({ activeKey }: { activeKey: string }) {
  const [games, setGames] = useState<DataType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function getGames() {
    setIsLoading(true);
    const { Messages } = await dryrun({
      process: ROUTER_PROCESS,
      tags: [{ name: "Action", value: "Get-Games" }],
    });

    setGames(JSON.parse(Messages[0].Data));

    setIsLoading(false);
  }

  useEffect(() => {
    if (activeKey === "join-game") {
      getGames();
    }
  }, [activeKey]);

  return (
    <div className="text-center">
      <List
        loading={isLoading}
        itemLayout="horizontal"
        dataSource={games}
        locale={{ emptyText: "No games" }}
        renderItem={(item) => (
          <List.Item>
            <Skeleton avatar title={false} loading={false} active>
              <List.Item.Meta
                title={<a href={`/#/game/${item.Id}`}>{item.Name}</a>}
              />
            </Skeleton>
          </List.Item>
        )}
      />
    </div>
  );
}
