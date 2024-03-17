import { ConnectButton } from "@arweave-wallet-kit-beta/react";
import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <>
      <div className="flex mx-auto items-center justify-between p-2 max-w-5xl">
        <Link to="/" className="font-bold text-lg text-blue-500">
          AO TicTacToe
        </Link>
        <ConnectButton profileModal={true} showBalance={true} />
      </div>
    </>
  );
}
