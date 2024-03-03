import { connect, createDataItemSigner } from "@permaweb/aoconnect";
import { useEffect, useState } from "react";
import TicTacToe from "./components/TicTacToe";
import { GAME_PROCESS } from "./helpers/constants";
import { useActiveAddress } from "@arweave-wallet-kit-beta/react";
import { GameState } from "./types";
import { Button, message as Message } from "antd";
import { getTagByValue } from "./helpers/getTag";

function App() {
  const address = useActiveAddress();
  const [messageApi, contextHolder] = Message.useMessage();
  const { result, message, dryrun } = connect();
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

  useEffect(() => {
    readGameState();
  }, []);

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
