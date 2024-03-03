import { ConnectButton } from "@arweave-wallet-kit-beta/react";

export default function NavBar() {
  return (
    <>
      <div className="flex mx-auto items-center justify-between p-2 max-w-5xl">
        <span className="font-bold text-lg">AO TicTacToe</span>
        <ConnectButton profileModal={true} showBalance={true} />
      </div>
    </>
  );
}
