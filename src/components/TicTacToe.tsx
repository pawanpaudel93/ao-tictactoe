import { useEffect, useState } from "react";
import { GameState } from "../types";
import { connect, createDataItemSigner } from "@permaweb/aoconnect";
import { useActiveAddress } from "@arweave-wallet-kit-beta/react";
import { message as Message, Spin } from "antd";
import { getTagByName, getTagByNameValue } from "@/helpers/getTag";
import { extractMessage } from "@/helpers/extractMessage";
import { useParams } from "react-router-dom";

interface SquareProps {
  value: "X" | "O" | null;
  onClick: () => Promise<void>;
}

const Square = ({ value, onClick }: SquareProps) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      className="w-24 h-24 bg-gray-200 flex items-center justify-center text-4xl font-bold rounded-sm hover:bg-gray-300 border border-gray-700"
      onClick={async () => {
        if (isLoading) return;
        setIsLoading(true);
        await onClick();
        setIsLoading(false);
      }}
    >
      {isLoading && (
        <Spin size="small">
          <div className="content" />
        </Spin>
      )}
      {value}
    </button>
  );
};

interface TicTacToeProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export default function TicTacToe({ gameState, setGameState }: TicTacToeProps) {
  const address = useActiveAddress();
  const [messageApi, contextHolder] = Message.useMessage();
  const initialSquares: Array<"X" | "O" | null> = Array(9).fill(null);
  const [squares, setSquares] =
    useState<Array<"X" | "O" | null>>(initialSquares);
  const { result, message } = connect();
  const { processId } = useParams() as { processId: string };

  const handleClick = async (index: number) => {
    const newSquares = [...squares];
    if (newSquares[index] === "O" || newSquares[index] === "X" || !address) {
      return;
    }

    const messageId = await message({
      process: processId,
      tags: [
        { name: "Action", value: "MakeMove" },
        { name: "Position", value: (index + 1).toString() },
      ],
      signer: createDataItemSigner(window.arweaveWallet),
    });

    const { Messages, Output } = await result({
      message: messageId,
      process: processId,
    });

    if (Messages.length > 0) {
      const latestMessage = Messages[0];
      if (latestMessage) {
        if (getTagByNameValue(latestMessage, "Action", "Winner")) {
          const isWinner = getTagByNameValue(latestMessage, "Winner", address);
          messageApi.info(isWinner ? "Congrats, you won!" : "Sorry, you lost!");
        } else if (getTagByNameValue(latestMessage, "Action", "Draw")) {
          messageApi.info("The game ended in a draw!");
        } else if (getTagByNameValue(latestMessage, "Action", "CurrentTurn")) {
          const currentPlayerTag = getTagByName(latestMessage, "CurrentPlayer");
          setGameState((prev) => ({
            ...prev,
            CurrentPlayer: currentPlayerTag?.value as string,
          }));
        }
      }
      newSquares[index] = gameState.Players[address as string];
      setSquares(newSquares);
    }

    if (Output?.data?.output) {
      messageApi.error(extractMessage(Output?.data?.output));
    }
  };

  useEffect(() => {
    setSquares(
      gameState.Board.map((square) =>
        square === "X" || square === "O" ? square : null
      )
    );
  }, [gameState.Board]);

  return (
    <div className="flex flex-wrap w-[296px] h-[296px] m-auto mt-10 border-4 border-gray-700">
      {contextHolder}
      {squares.map((value, index) => (
        <Square
          key={index}
          value={value}
          onClick={async () => handleClick(index)}
        />
      ))}
    </div>
  );
}
