import {
  createDataItemSigner,
  result,
  message,
  dryrun,
  connect,
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
        tags: [{ name: "Action", value: "RegisterBot" }],
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
            const symbolTag = getTagByName(latestMessage, "Symbol")!;
            setGameState((prev) => ({
              ...prev,
              Players: {
                ...prev.Players,
                [processId]: symbolTag.value as "X" | "O",
              },
              State: Object.keys(prev.Players).length > 0 ? "PLAY" : "REGISTER",
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
      tags: [{ name: "Action", value: "GetGameState" }],
    });
    setGameState((prevState) => ({
      ...prevState,
      ...JSON.parse(result.Messages[0].Data),
    }));
  }

  async function checkLive() {
    const params = {
      process: processId,
      cursor: cursor.current,
      limit: 10,
      sort: "DESC",
    };
    const results = await connect().results(params);

    if (results.edges.length > 0) {
      cursor.current = results.edges[results.edges.length - 1].cursor;
      const latestResult = results.edges[gameState.Players[processId] ? 1 : 0];
      if (latestResult.node.Messages.length > 0) {
        const latestMessage =
          latestResult.node.Messages[latestResult.node.Messages.length - 1];
        getTagByName(latestMessage, "Action");
        const action = getTagByName(latestMessage, "Action")!.value;
        switch (action) {
          case "Play": {
            const currentPlayer = getTagByName(
              latestMessage,
              "CurrentPlayer"
            )!.value;
            setGameState((prev) => ({
              ...prev,
              Board: Array(9).fill(null),
              CurrentPlayer: currentPlayer,
              State: "PLAY",
            }));
            break;
          }
          case "Winner": {
            const winner = getTagByName(latestMessage, "Winner")!.value;
            setGameState((prev) => ({
              ...prev,
              ...JSON.parse(latestMessage.Data),
              State: "REGISTER",
              Players: {},
              CurrentPlayer: "",
            }));
            messageApi.info(
              winner === address
                ? "Congrats, you won!"
                : gameState.Players[address as string]
                ? "Sorry, you lost!"
                : `${gameState.Players[winner]} won!`
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
            const currentPlayer = getTagByName(
              latestMessage,
              "CurrentPlayer"
            )!.value;
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
    if (gameState.State === "PLAY") {
      if (interval.current) clearInterval(interval.current);
      interval.current = setInterval(() => {
        checkLive();
      }, 2000);
      return () => {
        clearInterval(interval.current);
      };
    } else {
      if (interval.current) clearInterval(interval.current);
    }
  }, [gameState.State]);

  return (
    <div className="flex justify-center items-center flex-col">
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

      <div className="flex flex-col justify-center items-center mt-8 gap-1">
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
