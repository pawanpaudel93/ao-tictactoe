import {
  createDataItemSigner,
  result,
  message,
  dryrun,
} from "@permaweb/aoconnect";
import { useEffect, useRef, useState } from "react";
import TicTacToe from "@/components/TicTacToe";
import { useActiveAddress } from "@arweave-wallet-kit-beta/react";
import { GameState } from "@/types";
import { Button, message as Message } from "antd";
import { getTagByName, getTagByValue } from "@/helpers/getTag";
import { extractMessage } from "@/helpers/extractMessage";
import { useParams } from "react-router-dom";

export default function Game() {
  const address = useActiveAddress();
  const interval = useRef<number>();
  const [messageApi, contextHolder] = Message.useMessage();
  const [isRegistering, setIsRegistering] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    Board: Array(9).fill(null),
    CurrentPlayer: "",
    Players: {},
    State: "REGISTER",
    Winner: "",
  });
  const { processId } = useParams() as { processId: string };

  async function register() {
    setIsRegistering(true);
    try {
      const messageId = await message({
        process: processId,
        tags: [{ name: "Action", value: "Register" }],
        signer: createDataItemSigner(window.arweaveWallet),
      });

      const { Messages, Output } = await result({
        message: messageId,
        process: processId,
      });

      if (Messages.length > 0) {
        const latestMessage = Messages[0];
        if (latestMessage) {
          const isRegistered = getTagByValue(latestMessage, "Registered");
          if (isRegistered) {
            const symbol = getTagByName(latestMessage, "Symbol")!.value;
            setGameState((prev) => ({
              ...prev,
              Players: {
                ...prev.Players,
                [address as string]: symbol as "X" | "O",
              },
              State: Object.keys(prev.Players).length > 0 ? "PLAY" : "REGISTER",
            }));
            messageApi.success("Registered");
          }
        }
      }

      if (Output?.data?.output) {
        messageApi.error(extractMessage(Output?.data?.output));
      }
    } catch (error) {
      console.log(error);
    }
    setIsRegistering(false);
  }

  async function registerBot() {
    setIsRegistering(true);
    try {
      const messageId = await message({
        process: processId,
        tags: [{ name: "Action", value: "Register-Bot" }],
        signer: createDataItemSigner(window.arweaveWallet),
      });

      const { Messages, Output } = await result({
        message: messageId,
        process: processId,
      });

      if (Messages.length > 0) {
        const latestMessage = Messages[0];
        if (latestMessage) {
          const isRegistered = getTagByValue(latestMessage, "Registered");
          if (isRegistered) {
            const symbol = getTagByName(latestMessage, "Symbol")!.value;
            setGameState((prev) => ({
              ...prev,
              Players: {
                ...prev.Players,
                [processId]: symbol as "X" | "O",
              },
              State: "PLAY",
            }));
            messageApi.success("Bot registered");
          }
        }
      }

      if (Output?.data?.output) {
        messageApi.error(extractMessage(Output?.data?.output));
      }
    } catch (error) {
      console.log(error);
    }
    setIsRegistering(false);
  }

  async function readGameState() {
    const result = await dryrun({
      process: processId,
      tags: [{ name: "Action", value: "Get-Game-State" }],
    });
    setGameState((prevState) => ({
      ...prevState,
      ...JSON.parse(result.Messages[0].Data),
    }));
  }

  async function checkLive() {
    readGameState();
  }

  useEffect(() => {
    readGameState();
  }, []);

  useEffect(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = setInterval(() => {
      checkLive();
    }, 2000);

    return () => {
      clearInterval(interval.current);
    };
  }, [gameState.State]);

  return (
    <div className="flex justify-center items-center flex-col mt-12">
      {contextHolder}
      <TicTacToe gameState={gameState} setGameState={setGameState} />

      {address &&
        gameState.State === "REGISTER" &&
        (!gameState.Players[address as string] ? (
          <div className="flex justify-center mt-4 gap-3">
            <Button
              // type="primary"
              onClick={register}
              loading={isRegistering}
              disabled={isRegistering}
            >
              {isRegistering ? "Registering..." : "Play"}
            </Button>
          </div>
        ) : (
          <div className="flex justify-center mt-4 gap-3">
            <Button
              onClick={registerBot}
              loading={isRegistering}
              disabled={isRegistering}
            >
              {isRegistering ? "Registering bot..." : "Play with Bot"}
            </Button>
          </div>
        ))}
      {!address && <div className="mt-4">Connect to Play the Game!</div>}

      {gameState.State === "REGISTER" &&
        gameState.Players[address as string] && (
          <div className="flex flex-col justify-center items-center gap-1 mt-4">
            <div className="flex gap-1">
              <span>You have registered for the game.</span>
            </div>

            <span>Waiting for opponent...</span>
          </div>
        )}

      {gameState.State === "PLAY" &&
        gameState.Players[address as string] &&
        gameState.CurrentPlayer === address && (
          <div className="flex flex-col justify-center items-center gap-1 mt-4">
            <div className="flex gap-1">
              <span>It's your turn.</span>
            </div>
          </div>
        )}

      {gameState.State === "PLAY" &&
        gameState.Players[address as string] &&
        gameState.CurrentPlayer !== address && (
          <div className="flex flex-col justify-center items-center gap-1 mt-4">
            <div className="flex gap-1">
              <span>It's your opponent turn. </span>
            </div>
          </div>
        )}

      {Object.keys(gameState.Players).length === 0 && (
        <div className="flex mt-8 flex-col items-center">
          <span className="font-bold mb-2">Result</span>
          {gameState.Winner &&
            (gameState.Winner === address
              ? "You won!"
              : `${gameState.Winner} won!`)}
          {gameState.Board.includes("X") && gameState.Winner === "" && "Draw"}
        </div>
      )}

      <div className="flex flex-col justify-center items-center mt-4 gap-1">
        <span className="mb-2 font-bold">Current Players</span>
        {Object.entries(gameState.Players).length > 0 ? (
          Object.entries(gameState.Players).map(([playerAddress, symbol]) => (
            <div className="flex" key={playerAddress}>
              {playerAddress === address
                ? "You"
                : playerAddress === processId
                ? "Bot"
                : playerAddress}{" "}
              (
              <span
                className={`text-${
                  playerAddress === address ? "green" : "red"
                }-500`}
              >
                {symbol}
              </span>
              )
            </div>
          ))
        ) : (
          <div>No players registered yet!</div>
        )}
      </div>
    </div>
  );
}
