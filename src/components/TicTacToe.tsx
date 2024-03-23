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
  isWinningSquare: boolean;
}

const Square = ({ value, onClick, isWinningSquare }: SquareProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const squareClass = `w-24 h-24 bg-gray-200 flex items-center justify-center text-4xl font-bold rounded-sm border border-gray-700 ${
    isWinningSquare ? "bg-green-500" : "hover:bg-gray-300"
  }`;

  return (
    <button
      className={squareClass}
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

const calculateWinner = (squares: Array<"X" | "O" | null>) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return lines[i];
    }
  }
  return null;
};

export default function TicTacToe({ gameState, setGameState }: TicTacToeProps) {
  const address = useActiveAddress();
  const [messageApi, contextHolder] = Message.useMessage();
  const initialSquares: Array<"X" | "O" | null> = Array(9).fill(null);
  const [squares, setSquares] =
    useState<Array<"X" | "O" | null>>(initialSquares);
  const [winningSquares, setWinningSquares] = useState(new Set<number>());
  const { result, message } = connect();
  const { processId } = useParams() as { processId: string };

  const checkWin = () => {
    const winnerLine = calculateWinner(gameState.Board);
    if (winnerLine) {
      setWinningSquares(new Set(winnerLine));
    } else {
      setWinningSquares(new Set());
    }
  };

  const handleClick = async (index: number) => {
    const newSquares = [...squares];
    if (newSquares[index] === "O" || newSquares[index] === "X" || !address) {
      return;
    }

    const messageId = await message({
      process: processId,
      tags: [
        { name: "Action", value: "Make-Move" },
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
          const winner = getTagByName(latestMessage, "Winner")?.value as string;
          messageApi.info(
            winner === address
              ? "Congrats, you won!"
              : gameState.Players[address]
              ? "Sorry, you lost!"
              : `${gameState.Players[winner]} won!`
          );
        } else if (getTagByNameValue(latestMessage, "Action", "Draw")) {
          messageApi.info("The game ended in a Draw!");
        } else if (getTagByNameValue(latestMessage, "Action", "Current-Turn")) {
          const currentPlayer = getTagByName(latestMessage, "Current-Player")
            ?.value as string;

          setGameState((prev) => ({
            ...prev,
            CurrentPlayer: currentPlayer,
            ...JSON.parse(latestMessage.Data),
            State: "PLAY",
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
    checkWin();
  }, [gameState.Board]);

  return (
    <div className="flex flex-wrap w-[296px] h-[296px] m-auto mt-10 border-4 border-gray-700">
      {contextHolder}
      {squares.map((value, index) => (
        <Square
          key={index}
          value={value}
          onClick={async () => handleClick(index)}
          isWinningSquare={winningSquares.has(index)}
        />
      ))}
    </div>
  );
}
