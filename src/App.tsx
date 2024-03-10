import {
  createDataItemSigner,
  result,
  message,
  dryrun,
  connect,
} from "@permaweb/aoconnect";
import { useEffect, useRef, useState } from "react";
import TicTacToe from "./components/TicTacToe";
import { GAME_PROCESS } from "./helpers/constants";
import { useActiveAddress } from "@arweave-wallet-kit-beta/react";
import { GameState } from "./types";
import { Button, message as Message } from "antd";
import { getTagByName, getTagByValue } from "./helpers/getTag";

function App() {
  const address = useActiveAddress();
  const cursor = useRef(null);
  const interval = useRef<number>();
  const [messageApi, contextHolder] = Message.useMessage();
  const [isRegistering, setIsRegistering] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    Board: Array(9).fill(null),
    CurrentPlayer: "",
    Players: {},
    State: "REGISTER",
  });

  async function register() {
    setIsRegistering(true);
    try {
      const messageId = await message({
        process: GAME_PROCESS,
        tags: [{ name: "Action", value: "Register" }],
        signer: createDataItemSigner(window.arweaveWallet),
      });

      const { Messages, Output } = await result({
        message: messageId,
        process: GAME_PROCESS,
      });

      if (Messages.length > 0) {
        const latestMessage = Messages[0];
        if (latestMessage) {
          const isRegistered = getTagByValue(latestMessage, "Registered");
          if (isRegistered) {
            const symbolTag = getTagByName(latestMessage, "Symbol")!;
            setGameState((prev) => ({
              ...prev,
              Players: {
                ...prev.Players,
                [address as string]: symbolTag.value as "X" | "O",
              },
              State: Object.keys(prev.Players).length > 0 ? "PLAY" : "REGISTER",
            }));
            messageApi.success("Registered");
          }
        }
      }

      if (Output?.data?.output) {
        messageApi.error(Output?.data?.output);
      }
    } catch (error) {
      console.log(error);
    }
    setIsRegistering(false);
  }

  async function readGameState() {
    const result = await dryrun({
      process: GAME_PROCESS,
      tags: [{ name: "Action", value: "GetGameState" }],
    });
    setGameState((prevState) => ({
      ...prevState,
      ...JSON.parse(result.Messages[0].Data),
    }));
  }

  async function checkLive() {
    const params = {
      process: GAME_PROCESS,
      cursor: cursor.current,
      limit: 10,
      sort: "DESC",
    };
    const results = await connect().results(params);

    if (results.edges.length > 0) {
      cursor.current = results.edges[results.edges.length - 1].cursor;
      const latestResult = results.edges[0];
      if (latestResult.node.Messages.length > 0) {
        const latestMessage =
          latestResult.node.Messages[latestResult.node.Messages.length - 1];
        const action = latestMessage.Tags.find(
          (tag: { name: string }) => tag.name === "Action"
        ).value;
        switch (action) {
          case "Play": {
            const currentPlayer = latestMessage.Tags.find(
              (tag: { name: string }) => tag.name === "CurrentPlayer"
            ).value;
            setGameState((prev) => ({
              ...prev,
              Board: Array(9).fill(null),
              CurrentPlayer: currentPlayer,
              State: "PLAY",
            }));
            break;
          }
          case "Winner": {
            const winner = latestMessage.Tags.find(
              (tag: { name: string }) => tag.name === "Winner"
            ).value;
            setGameState((prev) => ({
              ...prev,
              ...JSON.parse(latestMessage.Data),
              State: "REGISTER",
              Players: {},
              CurrentPlayer: "",
            }));
            messageApi.info(
              address === winner ? "Congrats, you won!" : "Sorry, you lost!"
            );
            break;
          }
          case "Draw": {
            setGameState((prev) => ({
              ...prev,
              ...JSON.parse(latestMessage.Data),
              State: "REGISTER",
              Players: {},
              CurrentPlayer: "",
            }));
            messageApi.info("The game ended in Draw!");
            break;
          }
          case "CurrentTurn": {
            const currentPlayer = latestMessage.Tags.find(
              (tag: { name: string }) => tag.name === "CurrentPlayer"
            ).value;
            setGameState((prev) => ({
              ...prev,
              CurrentPlayer: currentPlayer,
              ...JSON.parse(latestMessage.Data),
            }));
            break;
          }
        }
      }
    }
  }

  useEffect(() => {
    readGameState();
  }, []);

  useEffect(() => {
    if (gameState.Players[address as string]) {
      if (interval.current) clearInterval(interval.current);

      interval.current = setInterval(() => {
        checkLive();
      }, 2000);

      return () => {
        clearInterval(interval.current);
      };
    }
  }, [gameState.Players]);

  return (
    <div className="flex justify-center items-center flex-col">
      {contextHolder}
      <TicTacToe gameState={gameState} setGameState={setGameState} />
      {gameState.State === "REGISTER" &&
        !gameState.Players[address as string] && (
          <div className="flex justify-center mt-4">
            <Button
              // type="primary"
              onClick={register}
              loading={isRegistering}
              disabled={isRegistering}
            >
              {isRegistering ? "Registering..." : "Register"}
            </Button>
          </div>
        )}
      {gameState.State === "REGISTER" &&
        gameState.Players[address as string] && (
          <div className="flex flex-col justify-center items-center gap-1 mt-4">
            <div className="flex gap-1">
              <span>You have registered for the game. Your symbol is:</span>
              <span className="text-green-500">
                {gameState.Players[address as string]}
              </span>
            </div>

            <span>Waiting for opponent...</span>
          </div>
        )}

      {gameState.State === "PLAY" &&
        gameState.Players[address as string] &&
        gameState.CurrentPlayer === address && (
          <div className="flex flex-col justify-center items-center gap-1 mt-4">
            <div className="flex gap-1">
              <span>It's your turn. Your symbol is:</span>
              <span className="text-green-500">
                {gameState.Players[address as string]}
              </span>
            </div>
          </div>
        )}

      {gameState.State === "PLAY" &&
        gameState.Players[address as string] &&
        gameState.CurrentPlayer !== address && (
          <div className="flex flex-col justify-center items-center gap-1 mt-4">
            <div className="flex gap-1">
              <span>It's your opponent turn. Your symbol is:</span>
              <span className="text-green-500">
                {gameState.Players[address as string]}
              </span>
            </div>
          </div>
        )}
    </div>
  );
}

export default App;
